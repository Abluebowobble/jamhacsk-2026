import supabaseAdmin from './supabase.js'

/**
 * Builds a Fastify preHandler for /api/devices/:deviceId routes. Loads the
 * device, confirms request.user belongs to its household with an allowed role,
 * and attaches request.device + request.membership.
 *
 * Must run after `authenticate`.
 *
 * Usage: preHandler: [app.authenticate, requireDeviceAccess('admin')]
 */
export function requireDeviceAccess(...allowedRoles) {
  return async function deviceAccess(request, reply) {
    const { deviceId } = request.params

    const { data: device, error: deviceError } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('id', deviceId)
      .maybeSingle()

    if (deviceError) {
      request.log.error(deviceError)
      return reply.code(500).send({ error: 'Failed to load device' })
    }
    if (!device) {
      return reply.code(404).send({ error: 'Device not found' })
    }
    if (!device.household_id) {
      return reply.code(409).send({ error: 'Device is not paired to a household' })
    }

    const { data: membership, error: memberError } = await supabaseAdmin
      .from('household_members')
      .select('household_id, user_id, role')
      .eq('household_id', device.household_id)
      .eq('user_id', request.user.id)
      .maybeSingle()

    if (memberError) {
      request.log.error(memberError)
      return reply.code(500).send({ error: 'Failed to check membership' })
    }
    if (!membership) {
      return reply.code(403).send({ error: 'You are not a member of this device\'s household' })
    }
    if (allowedRoles.length && !allowedRoles.includes(membership.role)) {
      return reply.code(403).send({ error: `Requires role: ${allowedRoles.join(' or ')}` })
    }

    request.device = device
    request.membership = membership
  }
}
