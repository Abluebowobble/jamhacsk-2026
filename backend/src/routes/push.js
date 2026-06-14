import supabaseAdmin from '../lib/supabase.js'
import { sendToSubscription, sendToUser, isPushConfigured } from '../services/push.js'

export default async function pushRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  // POST /api/push/subscribe — register a Web Push subscription
  app.post('/subscribe', {
    schema: {
      body: {
        type: 'object',
        required: ['endpoint', 'p256dh', 'auth'],
        properties: {
          endpoint: { type: 'string', minLength: 1 },
          p256dh: { type: 'string', minLength: 1 },
          auth: { type: 'string', minLength: 1 },
        },
      },
    },
  }, async (request, reply) => {
    const { endpoint, p256dh, auth } = request.body
    // Re-subscribe (and ownership change) without relying on an ON CONFLICT
    // target: drop any prior row for this endpoint, then insert a fresh one.
    // Avoids depending on a unique constraint that may not exist in every DB.
    await supabaseAdmin.from('push_subscriptions').delete().eq('endpoint', endpoint)
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .insert({ user_id: request.user.id, endpoint, p256dh, auth })
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })

    // Fire a one-off confirmation to THIS device so the user immediately sees
    // push works — the only push not gated on a safety event. Fire-and-forget:
    // a send failure must not fail the subscription that was just stored.
    sendToSubscription(
      { endpoint, p256dh, auth },
      {
        title: 'Notifications on',
        body: 'Hestia will alert you here when a stove needs attention.',
        tag: 'push-welcome',
      },
      request.log,
    ).catch(() => {})

    return reply.code(201).send({ subscription: data })
  })

  // DELETE /api/push/unsubscribe — remove a subscription by endpoint
  app.delete('/unsubscribe', {
    schema: {
      body: {
        type: 'object',
        required: ['endpoint'],
        properties: { endpoint: { type: 'string', minLength: 1 } },
      },
    },
  }, async (request, reply) => {
    const { error } = await supabaseAdmin
      .from('push_subscriptions')
      .delete()
      .eq('user_id', request.user.id)
      .eq('endpoint', request.body.endpoint)
    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(204).send()
  })

  // POST /api/push/test — send a test notification to this user's devices, so a
  // member can verify delivery on demand without waiting for a real safety event.
  app.post('/test', async (request, reply) => {
    if (!isPushConfigured()) {
      return reply.code(503).send({ error: 'Push is not configured on the server.' })
    }
    const { count } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', request.user.id)
    if (!count) {
      return reply.code(409).send({ error: 'No subscribed device. Turn on notifications first.' })
    }
    await sendToUser(
      request.user.id,
      {
        title: 'Hestia test',
        body: 'Push notifications are working on this device.',
        tag: 'push-test',
      },
      request.log,
    )
    return { sent: count }
  })
}
