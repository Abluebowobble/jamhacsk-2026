import supabaseAdmin from '../lib/supabase.js'
import { logEvent } from '../lib/events.js'
import { makeRoleCheck } from '../plugins/requireRole.js'
import { requireDeviceAccess } from '../lib/deviceAccess.js'

export default async function devicesRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/households/:householdId/devices — list devices in a household
  app.get('/households/:householdId/devices', {
    preHandler: [makeRoleCheck('admin', 'member')],
    schema: {
      params: { type: 'object', properties: { householdId: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('household_id', request.params.householdId)
    if (error) return reply.code(500).send({ error: error.message })
    return { devices: data }
  })

  // GET /api/devices/:deviceId/pairing-status — any authenticated user (drives NFC flow)
  app.get('/devices/:deviceId/pairing-status', async (request, reply) => {
    const { data: device, error } = await supabaseAdmin
      .from('devices')
      .select('id, household_id, is_paired, households(name)')
      .eq('id', request.params.deviceId)
      .maybeSingle()
    if (error) return reply.code(500).send({ error: error.message })
    if (!device) return reply.code(404).send({ error: 'Device not found' })

    return {
      deviceId: device.id,
      paired: Boolean(device.household_id),
      householdId: device.household_id,
      householdName: device.households?.name ?? null,
    }
  })

  // POST /api/devices/:deviceId/pair — assign an unpaired device to a household
  app.post('/devices/:deviceId/pair', {
    schema: {
      params: { type: 'object', properties: { deviceId: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object',
        required: ['householdId'],
        properties: { householdId: { type: 'string', format: 'uuid' } },
      },
    },
  }, async (request, reply) => {
    const { deviceId } = request.params
    const { householdId } = request.body

    // Requester must belong to the target household.
    const { data: membership } = await supabaseAdmin
      .from('household_members')
      .select('role')
      .eq('household_id', householdId)
      .eq('user_id', request.user.id)
      .maybeSingle()
    if (!membership) return reply.code(403).send({ error: 'You are not a member of this household' })

    const { data: device } = await supabaseAdmin
      .from('devices')
      .select('id, household_id')
      .eq('id', deviceId)
      .maybeSingle()
    if (!device) return reply.code(404).send({ error: 'Device not found' })
    if (device.household_id) {
      return reply.code(409).send({ error: 'Device is already paired to a household' })
    }

    const { data: updated, error } = await supabaseAdmin
      .from('devices')
      .update({ household_id: householdId, is_paired: true, updated_at: new Date().toISOString() })
      .eq('id', deviceId)
      .is('household_id', null) // guard against race
      .select()
      .maybeSingle()
    if (error) return reply.code(500).send({ error: error.message })
    if (!updated) return reply.code(409).send({ error: 'Device was just paired by someone else' })

    await logEvent({
      householdId,
      deviceId,
      userId: request.user.id,
      eventType: 'DEVICE_PAIRED',
      metadata: {},
    }, request.log)

    return reply.code(201).send({ device: updated })
  })

  // GET /api/devices/:deviceId — single device (any member)
  app.get('/devices/:deviceId', {
    preHandler: [requireDeviceAccess('admin', 'member')],
  }, async (request) => {
    return { device: request.device }
  })

  // PATCH /api/devices/:deviceId — rename (admin only)
  app.patch('/devices/:deviceId', {
    preHandler: [requireDeviceAccess('admin')],
    schema: {
      body: {
        type: 'object',
        required: ['device_name'],
        properties: { device_name: { type: 'string', minLength: 1, maxLength: 100 } },
      },
    },
  }, async (request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('devices')
      .update({ device_name: request.body.device_name, updated_at: new Date().toISOString() })
      .eq('id', request.params.deviceId)
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })

    await logEvent({
      householdId: request.device.household_id,
      deviceId: request.params.deviceId,
      userId: request.user.id,
      eventType: 'DEVICE_RENAMED',
      metadata: { device_name: request.body.device_name },
    }, request.log)

    return { device: data }
  })

  // DELETE /api/devices/:deviceId — unpair/remove (admin only)
  app.delete('/devices/:deviceId', {
    preHandler: [requireDeviceAccess('admin')],
  }, async (request, reply) => {
    const householdId = request.device.household_id
    // Unpair rather than destroy the device record so the hardware can be re-paired.
    const { error } = await supabaseAdmin
      .from('devices')
      .update({ household_id: null, is_paired: false, updated_at: new Date().toISOString() })
      .eq('id', request.params.deviceId)
    if (error) return reply.code(500).send({ error: error.message })

    await logEvent({
      householdId,
      deviceId: request.params.deviceId,
      userId: request.user.id,
      eventType: 'DEVICE_REMOVED',
      metadata: {},
    }, request.log)

    return reply.code(204).send()
  })
}
