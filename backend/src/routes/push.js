import supabaseAdmin from '../lib/supabase.js'

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
    const { data, error } = await supabaseAdmin
      .from('push_subscriptions')
      .upsert(
        { user_id: request.user.id, endpoint, p256dh, auth },
        { onConflict: 'endpoint' }
      )
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })
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
}
