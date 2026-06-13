import supabaseAdmin from '../lib/supabase.js'
import { logEvent } from '../lib/events.js'
import { requireDeviceAccess } from '../lib/deviceAccess.js'
import { publishToDevice } from '../services/mqtt.js'

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
      householdId: request.device.household_id,
      deviceId: request.params.deviceId,
      userId: request.user.id,
      eventType: 'STOVE_TURNED_ON',
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
      householdId: request.device.household_id,
      deviceId: request.params.deviceId,
      userId: request.user.id,
      eventType: 'STOVE_TURNED_OFF',
    }, request.log)
    return { status: 'command_sent', command: 'TURN_OFF' }
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
