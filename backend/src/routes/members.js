import supabaseAdmin from '../lib/supabase.js'
import { logEvent, auditContext } from '../lib/events.js'
import { makeRoleCheck } from '../plugins/requireRole.js'

export default async function membersRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/households/:householdId/members — list members (any member)
  app.get('/:householdId/members', {
    preHandler: [makeRoleCheck('admin', 'member')],
    schema: {
      params: { type: 'object', properties: { householdId: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const { data: rows, error } = await supabaseAdmin
      .from('household_members')
      .select('user_id, role, created_at')
      .eq('household_id', request.params.householdId)
    if (error) return reply.code(500).send({ error: error.message })

    // Resolve display names with a second query rather than a PostgREST embed:
    // household_members.user_id and profiles.id both reference auth.users, with
    // no direct FK between them, so the embedded `profiles(full_name)` selector
    // can't be planned. Merge the names in here to keep the response shape.
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

    const members = rows.map((r) => ({ ...r, profiles: { full_name: names[r.user_id] ?? null } }))
    return { members }
  })

  // PATCH /api/households/:householdId/members/:userId — change a member's role
  // (admin only). Guards against demoting the last admin, which would orphan
  // the household with no one able to manage it.
  app.patch('/:householdId/members/:userId', {
    preHandler: [makeRoleCheck('admin')],
    schema: {
      params: {
        type: 'object',
        properties: {
          householdId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
        },
      },
      body: {
        type: 'object',
        required: ['role'],
        properties: { role: { type: 'string', enum: ['admin', 'member'] } },
      },
    },
  }, async (request, reply) => {
    const { householdId, userId } = request.params
    const { role } = request.body

    // Demoting an admin: ensure at least one admin remains afterwards.
    if (role === 'member') {
      const { count, error: countError } = await supabaseAdmin
        .from('household_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('role', 'admin')
      if (countError) return reply.code(500).send({ error: countError.message })
      if ((count ?? 0) <= 1) {
        return reply.code(400).send({ error: 'This is the household’s only admin. Promote another member first.' })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('household_members')
      .update({ role })
      .eq('household_id', householdId)
      .eq('user_id', userId)
      .select('user_id, role')
      .maybeSingle()
    if (error) return reply.code(500).send({ error: error.message })
    if (!data) return reply.code(404).send({ error: 'Member not found in this household' })

    await logEvent({
      ...auditContext(request),
      householdId,
      eventType: 'MEMBER_ROLE_CHANGED',
      resourceType: 'member',
      resourceId: userId,
      after: { role },
      metadata: { targetUserId: userId, role },
    }, request.log)

    return { member: data }
  })

  // DELETE /api/households/:householdId/members/:userId — remove member (admin only)
  app.delete('/:householdId/members/:userId', {
    preHandler: [makeRoleCheck('admin')],
    schema: {
      params: {
        type: 'object',
        properties: {
          householdId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { householdId, userId } = request.params

    if (userId === request.user.id) {
      return reply.code(400).send({ error: 'Admins cannot remove themselves; transfer or delete the household instead' })
    }

    const { error } = await supabaseAdmin
      .from('household_members')
      .delete()
      .eq('household_id', householdId)
      .eq('user_id', userId)
    if (error) return reply.code(500).send({ error: error.message })

    await logEvent({
      ...auditContext(request),
      householdId,
      eventType: 'MEMBER_REMOVED',
      resourceType: 'member',
      resourceId: userId,
      metadata: { removedUserId: userId },
    }, request.log)

    return reply.code(204).send()
  })
}
