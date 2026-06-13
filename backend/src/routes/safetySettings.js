import supabaseAdmin from '../lib/supabase.js'
import { logEvent } from '../lib/events.js'
import { requireDeviceAccess } from '../lib/deviceAccess.js'
import { publishToDevice } from '../services/mqtt.js'

export default async function safetySettingsRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  // PATCH /api/devices/:deviceId/safety-settings — members and admins (per PRD table)
  app.patch('/:deviceId/safety-settings', {
    preHandler: [requireDeviceAccess('admin', 'member')],
    schema: {
      body: {
        type: 'object',
        properties: {
          absence_timeout_seconds: { type: 'integer', minimum: 1 },
          warning_delay_seconds: { type: 'integer', minimum: 1 },
        },
        anyOf: [
          { required: ['absence_timeout_seconds'] },
          { required: ['warning_delay_seconds'] },
        ],
      },
    },
  }, async (request, reply) => {
    const current = request.device
    const absence = request.body.absence_timeout_seconds ?? current.absence_timeout_seconds
    const warning = request.body.warning_delay_seconds ?? current.warning_delay_seconds

    if (warning >= absence) {
      return reply.code(400).send({ error: 'warning_delay_seconds must be shorter than absence_timeout_seconds' })
    }

    const { data, error } = await supabaseAdmin
      .from('devices')
      .update({
        absence_timeout_seconds: absence,
        warning_delay_seconds: warning,
        updated_at: new Date().toISOString(),
      })
      .eq('id', request.params.deviceId)
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })

    publishToDevice(request.params.deviceId, {
      absenceTimeoutSeconds: absence,
      warningDelaySeconds: warning,
    }, 'settings')

    await logEvent({
      householdId: current.household_id,
      deviceId: request.params.deviceId,
      userId: request.user.id,
      eventType: 'SAFETY_SETTINGS_UPDATED',
      metadata: { absence_timeout_seconds: absence, warning_delay_seconds: warning },
    }, request.log)

    return { device: data }
  })
}
