import { verifyActionToken } from '../lib/actionToken.js'
import { turnOffDevice, snoozeDevice } from '../lib/safetyActions.js'
import supabaseAdmin from '../lib/supabase.js'

// Notification-button actions from the service worker. UNAUTHENTICATED by
// design: these fire from a locked phone with the app closed, where no Supabase
// session exists. Authorization is the signed action token in the body, which
// is only ever minted INTO the warning push and therefore only reaches the
// household's already-authorized push subscriptions. The token is device- and
// action-scoped and short-lived; turn-off is fail-safe and snooze is low-risk.
export default async function notificationActionRoutes(app) {
  app.post('/:deviceId/notification-action', {
    schema: {
      body: {
        type: 'object',
        required: ['token', 'action'],
        properties: {
          token: { type: 'string', minLength: 1 },
          action: { type: 'string', enum: ['snooze', 'turnoff'] },
        },
      },
    },
  }, async (request, reply) => {
    const { deviceId } = request.params
    const { token, action } = request.body

    const claims = verifyActionToken(token)
    if (!claims || claims.deviceId !== deviceId || !claims.actions.includes(action)) {
      return reply.code(401).send({ error: 'Invalid or expired action token' })
    }

    // The token already authorizes the device; look up the household only so the
    // logged event is attributed correctly.
    const { data: device } = await supabaseAdmin
      .from('devices')
      .select('id, household_id')
      .eq('id', deviceId)
      .maybeSingle()
    if (!device?.household_id) return reply.code(404).send({ error: 'Device not found' })

    if (action === 'turnoff') {
      await turnOffDevice(deviceId, device.household_id, { source: 'notification' }, request.log)
    } else {
      await snoozeDevice(deviceId, device.household_id, { source: 'notification' }, request.log)
    }
    return { status: 'ok', action }
  })
}
