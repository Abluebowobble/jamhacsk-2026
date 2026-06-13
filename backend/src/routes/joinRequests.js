import supabaseAdmin from '../lib/supabase.js'
import { logEvent } from '../lib/events.js'
import { makeRoleCheck } from '../plugins/requireRole.js'
import { sendToHouseholdAdmins, sendToUser } from '../services/push.js'

export default async function joinRequestsRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  // POST /api/households/:householdId/join-requests — request to join
  app.post('/households/:householdId/join-requests', {
    schema: {
      params: { type: 'object', properties: { householdId: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const { householdId } = request.params

    // Already a member?
    const { data: existing } = await supabaseAdmin
      .from('household_members')
      .select('user_id')
      .eq('household_id', householdId)
      .eq('user_id', request.user.id)
      .maybeSingle()
    if (existing) return reply.code(409).send({ error: 'You are already a member of this household' })

    const { data: joinRequest, error } = await supabaseAdmin
      .from('join_requests')
      .upsert(
        { household_id: householdId, user_id: request.user.id, status: 'pending' },
        { onConflict: 'household_id,user_id' }
      )
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })

    await logEvent({
      householdId,
      userId: request.user.id,
      eventType: 'JOIN_REQUEST_CREATED',
      metadata: { requestId: joinRequest.id },
    }, request.log)

    await sendToHouseholdAdmins(householdId, {
      title: 'Hestia',
      body: 'A new request to join your household is awaiting approval.',
    }, request.log)

    return reply.code(201).send({ joinRequest })
  })

  // GET /api/households/:householdId/join-requests — list pending (admin only)
  app.get('/households/:householdId/join-requests', {
    preHandler: [makeRoleCheck('admin')],
    schema: {
      params: { type: 'object', properties: { householdId: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('join_requests')
      .select('*, profiles(full_name)')
      .eq('household_id', request.params.householdId)
      .eq('status', 'pending')
    if (error) return reply.code(500).send({ error: error.message })
    return { joinRequests: data }
  })

  // POST /api/join-requests/:requestId/approve
  app.post('/join-requests/:requestId/approve', {
    schema: {
      params: { type: 'object', properties: { requestId: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    return reviewRequest(request, reply, 'approved')
  })

  // POST /api/join-requests/:requestId/deny
  app.post('/join-requests/:requestId/deny', {
    schema: {
      params: { type: 'object', properties: { requestId: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    return reviewRequest(request, reply, 'denied')
  })
}

async function reviewRequest(request, reply, decision) {
  const { requestId } = request.params

  const { data: joinRequest, error: loadError } = await supabaseAdmin
    .from('join_requests')
    .select('*')
    .eq('id', requestId)
    .maybeSingle()
  if (loadError) return reply.code(500).send({ error: loadError.message })
  if (!joinRequest) return reply.code(404).send({ error: 'Join request not found' })
  if (joinRequest.status !== 'pending') {
    return reply.code(409).send({ error: `Request already ${joinRequest.status}` })
  }

  // Reviewer must be an admin of the target household.
  const { data: membership } = await supabaseAdmin
    .from('household_members')
    .select('role')
    .eq('household_id', joinRequest.household_id)
    .eq('user_id', request.user.id)
    .maybeSingle()
  if (membership?.role !== 'admin') {
    return reply.code(403).send({ error: 'Only household admins can review join requests' })
  }

  const { error: updateError } = await supabaseAdmin
    .from('join_requests')
    .update({ status: decision, reviewed_by: request.user.id, reviewed_at: new Date().toISOString() })
    .eq('id', requestId)
  if (updateError) return reply.code(500).send({ error: updateError.message })

  if (decision === 'approved') {
    const { error: memberError } = await supabaseAdmin
      .from('household_members')
      .upsert(
        { household_id: joinRequest.household_id, user_id: joinRequest.user_id, role: 'member' },
        { onConflict: 'household_id,user_id' }
      )
    if (memberError) return reply.code(500).send({ error: memberError.message })

    await logEvent({
      householdId: joinRequest.household_id,
      userId: request.user.id,
      eventType: 'JOIN_REQUEST_APPROVED',
      metadata: { requestId, approvedUserId: joinRequest.user_id },
    }, request.log)
    await logEvent({
      householdId: joinRequest.household_id,
      userId: joinRequest.user_id,
      eventType: 'MEMBER_ADDED',
      metadata: { requestId },
    }, request.log)

    await sendToUser(joinRequest.user_id, {
      title: 'Hestia',
      body: 'Your request to join the household was approved.',
    }, request.log)
  } else {
    await logEvent({
      householdId: joinRequest.household_id,
      userId: request.user.id,
      eventType: 'JOIN_REQUEST_DENIED',
      metadata: { requestId, deniedUserId: joinRequest.user_id },
    }, request.log)

    await sendToUser(joinRequest.user_id, {
      title: 'Hestia',
      body: 'Your request to join the household was denied.',
    }, request.log)
  }

  return { status: decision }
}
