import supabaseAdmin from '../lib/supabase.js'
import { logEvent } from '../lib/events.js'
import { makeRoleCheck } from '../plugins/requireRole.js'
import {
  createNotification,
  notifyHouseholdAdmins,
  clearJoinRequestNotifications,
} from '../lib/notifications.js'

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

    // Persist a notification for each admin so the request is visible in-app
    // (the bell) even if Web Push is unavailable, and survives until reviewed.
    const householdName = await getHouseholdName(householdId)
    const requesterName = await getProfileName(request.user.id)
    await notifyHouseholdAdmins(householdId, {
      type: 'join_request',
      title: 'New access request',
      body: `${requesterName || 'Someone'} asked to join ${householdName || 'your household'}.`,
      data: {
        joinRequestId: joinRequest.id,
        householdId,
        householdName,
        requesterId: request.user.id,
        requesterName,
      },
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
    const { data: rows, error } = await supabaseAdmin
      .from('join_requests')
      .select('id, household_id, user_id, status, created_at')
      .eq('household_id', request.params.householdId)
      .eq('status', 'pending')
    if (error) return reply.code(500).send({ error: error.message })

    // Resolve display names with a second query rather than a PostgREST embed:
    // join_requests.user_id and profiles.id both reference auth.users with no
    // direct FK between them, so an embedded `profiles(full_name)` selector
    // can't be planned (it errors). Merge names in to keep the response shape.
    const ids = rows.map((r) => r.user_id)
    let names = {}
    if (ids.length) {
      const { data: profiles, error: pErr } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', ids)
      if (pErr) return reply.code(500).send({ error: pErr.message })
      names = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.full_name]))
    }

    const joinRequests = rows.map((r) => ({ ...r, profiles: { full_name: names[r.user_id] ?? null } }))
    return { joinRequests }
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

// ---- helpers --------------------------------------------------------------

async function getHouseholdName(householdId) {
  const { data } = await supabaseAdmin
    .from('households')
    .select('name')
    .eq('id', householdId)
    .maybeSingle()
  return data?.name ?? null
}

async function getProfileName(userId) {
  const { data } = await supabaseAdmin
    .from('profiles')
    .select('full_name')
    .eq('id', userId)
    .maybeSingle()
  return data?.full_name ?? null
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

  // The request is resolved — clear the pending notification from every admin's
  // feed so a handled request doesn't linger in the bell.
  await clearJoinRequestNotifications(requestId, request.log)

  const householdName = await getHouseholdName(joinRequest.household_id)

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

    await createNotification({
      userId: joinRequest.user_id,
      type: 'join_approved',
      title: 'Request approved',
      body: `You can now access ${householdName || 'the household'}.`,
      data: { householdId: joinRequest.household_id, householdName },
    }, request.log)
  } else {
    await logEvent({
      householdId: joinRequest.household_id,
      userId: request.user.id,
      eventType: 'JOIN_REQUEST_DENIED',
      metadata: { requestId, deniedUserId: joinRequest.user_id },
    }, request.log)

    await createNotification({
      userId: joinRequest.user_id,
      type: 'join_denied',
      title: 'Request declined',
      body: `Your request to join ${householdName || 'the household'} wasn’t approved.`,
      data: { householdId: joinRequest.household_id, householdName },
    }, request.log)
  }

  return { status: decision }
}
