import supabaseAdmin from '../lib/supabase.js'
import { logEvent, auditContext } from '../lib/events.js'
import { requireDeviceAccess } from '../lib/deviceAccess.js'
import { publishToDevice } from '../services/mqtt.js'
import { sendToHouseholdMembers } from '../services/push.js'

export default async function stoveControlRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  // POST /api/devices/:deviceId/turn-on
  app.post('/:deviceId/turn-on', {
    preHandler: [requireDeviceAccess('admin', 'member')],
  }, async (request) => {
    publishToDevice(request.params.deviceId, { command: 'TURN_ON', source: 'backend' })
    await supabaseAdmin
      .from('devices')
      .update({ stove_status: 'on', updated_at: new Date().toISOString() })
      .eq('id', request.params.deviceId)
    await logEvent({
      ...auditContext(request),
      householdId: request.device.household_id,
      deviceId: request.params.deviceId,
      eventType: 'STOVE_TURNED_ON',
      resourceType: 'device',
      resourceId: request.params.deviceId,
    }, request.log)
    return { status: 'command_sent', command: 'TURN_ON' }
  })

  // POST /api/devices/:deviceId/turn-off
  app.post('/:deviceId/turn-off', {
    preHandler: [requireDeviceAccess('admin', 'member')],
  }, async (request) => {
    publishToDevice(request.params.deviceId, { command: 'TURN_OFF', source: 'backend' })
    await supabaseAdmin
      .from('devices')
      .update({ stove_status: 'off', updated_at: new Date().toISOString() })
      .eq('id', request.params.deviceId)
    await logEvent({
      ...auditContext(request),
      householdId: request.device.household_id,
      deviceId: request.params.deviceId,
      eventType: 'STOVE_TURNED_OFF',
      resourceType: 'device',
      resourceId: request.params.deviceId,
    }, request.log)
    return { status: 'command_sent', command: 'TURN_OFF' }
  })

  // POST /api/devices/:deviceId/extend-warning — "add time": postpone the
  // unattended auto-shutoff by `seconds` (snooze). The Pi holds the authoritative
  // timer, so we relay a SNOOZE command; the snooze is logged + coalesced-notified.
  app.post('/:deviceId/extend-warning', {
    preHandler: [requireDeviceAccess('admin', 'member')],
    schema: {
      body: {
        type: 'object',
        required: ['seconds'],
        properties: {
          seconds: { type: 'integer', minimum: 30, maximum: 1800, multipleOf: 30 },
        },
      },
    },
  }, async (request) => {
    const { seconds } = request.body
    const { deviceId } = request.params

    await publishToDevice(deviceId, { command: 'SNOOZE', seconds, source: 'user' })
    await logEvent({
      householdId: request.device.household_id,
      deviceId,
      userId: request.user.id,
      eventType: 'WARNING_SNOOZED',
      metadata: { seconds },
    }, request.log)
    await sendToHouseholdMembers(request.device.household_id, {
      title: 'Hestia',
      body: `Time added — the stove stays on for now.`,
      tag: `warn-${deviceId}`, // coalesce with the warning alert
    }, request.log)

    return { status: 'command_sent', command: 'SNOOZE', seconds }
  })

  // GET /api/devices/:deviceId/status
  app.get('/:deviceId/status', {
    preHandler: [requireDeviceAccess('admin', 'member')],
  }, async (request) => {
    const d = request.device
    return {
      deviceId: d.id,
      online_status: d.online_status,
      stove_status: d.stove_status,
      presence_status: d.presence_status,
      absence_timeout_seconds: d.absence_timeout_seconds,
      warning_delay_seconds: d.warning_delay_seconds,
    }
  })
}
