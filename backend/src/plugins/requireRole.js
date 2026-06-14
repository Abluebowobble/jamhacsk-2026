import supabaseAdmin from '../lib/supabase.js'
import { logEvent, auditContext } from '../lib/events.js'

/**
 * Builds a Fastify preHandler that ensures request.user is a member of the
 * target household with one of `allowedRoles`. The household id is taken from
 * request.params.householdId or request.body.householdId.
 *
 * On success it attaches request.membership = { household_id, user_id, role }.
 * Must run after `authenticate` (relies on request.user).
 *
 * Usage: preHandler: [app.authenticate, makeRoleCheck('admin')]
 */
export function makeRoleCheck(...allowedRoles) {
  return async function roleCheck(request, reply) {
    const householdId = request.params?.householdId ?? request.body?.householdId
    if (!householdId) {
      return reply.code(400).send({ error: 'householdId is required' })
    }

    const { data: membership, error } = await supabaseAdmin
      .from('household_members')
      .select('household_id, user_id, role')
      .eq('household_id', householdId)
      .eq('user_id', request.user.id)
      .maybeSingle()

    if (error) {
      request.log.error(error)
      return reply.code(500).send({ error: 'Failed to check membership' })
    }
    if (!membership) {
      await logDenied(request, householdId, { required: allowedRoles, reason: 'not_a_member' })
      return reply.code(403).send({ error: 'You are not a member of this household' })
    }
    if (allowedRoles.length && !allowedRoles.includes(membership.role)) {
      await logDenied(request, householdId, { required: allowedRoles, actual: membership.role, reason: 'wrong_role' })
      return reply.code(403).send({ error: `Requires role: ${allowedRoles.join(' or ')}` })
    }

    request.membership = membership
  }
}

// Audit a blocked authorization attempt. The route handler never runs, so this
// is the only place the denial gets recorded.
async function logDenied(request, householdId, metadata) {
  await logEvent({
    ...auditContext(request),
    householdId,
    eventType: 'PERMISSION_DENIED',
    outcome: 'denied',
    resourceType: 'household',
    resourceId: householdId,
    metadata: { route: request.routeOptions?.url ?? request.url, method: request.method, ...metadata },
  }, request.log)
}
