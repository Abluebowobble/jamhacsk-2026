import supabaseAdmin from '../lib/supabase.js'
import { logEvent, auditContext } from '../lib/events.js'
import { makeRoleCheck } from '../plugins/requireRole.js'
import { requireDeviceAccess } from '../lib/deviceAccess.js'
import { sendToHouseholdMembers } from '../services/push.js'
import { publishAssignment } from '../services/mqtt.js'

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

    // Tell the device (over MQTT) which household it now belongs to so its
    // firmware can subscribe to the right topics and arm itself.
    await publishAssignment(deviceId, householdId)

    await logEvent({
      ...auditContext(request),
      householdId,
      deviceId,
      eventType: 'DEVICE_PAIRED',
      resourceType: 'device',
      resourceId: deviceId,
      after: { household_id: householdId, is_paired: true },
    }, request.log)

    // PRD §16: notify the household that a device was paired.
    await sendToHouseholdMembers(householdId, {
      title: 'Hestia',
      body: `${updated.device_name || 'A device'} was paired to your household.`,
      tag: `device-paired-${deviceId}`,
    }, request.log)

    return reply.code(201).send({ device: updated })
  })

  // GET /api/devices/:deviceId — single device (any member)
  app.get('/devices/:deviceId', {
    preHandler: [requireDeviceAccess('admin', 'member')],
  }, async (request) => {
    return { device: request.device }
  })

  // PATCH /api/devices/:deviceId — rename and/or set the camera stream URL (admin only)
  app.patch('/devices/:deviceId', {
    preHandler: [requireDeviceAccess('admin')],
    schema: {
      body: {
        type: 'object',
        minProperties: 1,
        additionalProperties: false,
        properties: {
          device_name: { type: 'string', minLength: 1, maxLength: 100 },
          // Public MJPEG base URL (e.g. a Cloudflare Tunnel address). Empty string clears it.
          camera_stream_url: { type: 'string', format: 'uri', maxLength: 500 },
        },
      },
    },
  }, async (request, reply) => {
    const patch = { updated_at: new Date().toISOString() }
    if (request.body.device_name !== undefined) patch.device_name = request.body.device_name
    if (request.body.camera_stream_url !== undefined) {
      patch.camera_stream_url = request.body.camera_stream_url || null
    }

    const { data, error } = await supabaseAdmin
      .from('devices')
      .update(patch)
      .eq('id', request.params.deviceId)
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })

    if (patch.device_name !== undefined) {
      await logEvent({
        ...auditContext(request),
        householdId: request.device.household_id,
        deviceId: request.params.deviceId,
        eventType: 'DEVICE_RENAMED',
        resourceType: 'device',
        resourceId: request.params.deviceId,
        before: { device_name: request.device.device_name },
        after: { device_name: patch.device_name },
      }, request.log)
    }

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

    // Tell the device it was unpaired so its firmware stops reporting to (and
    // acting for) this household and goes idle.
    await publishAssignment(request.params.deviceId, null)

    await logEvent({
      ...auditContext(request),
      householdId,
      deviceId: request.params.deviceId,
      eventType: 'DEVICE_REMOVED',
      resourceType: 'device',
      resourceId: request.params.deviceId,
      before: { household_id: householdId, is_paired: true },
    }, request.log)

    return reply.code(204).send()
  })
}
