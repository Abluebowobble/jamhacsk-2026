import supabaseAdmin from '../lib/supabase.js'

// The signed-in user's in-app notification feed. Backed by the `notifications`
// table (migration 002). Reads are scoped to request.user.id; writes only ever
// touch the caller's own rows.
export default async function notificationsRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/notifications?limit= — recent notifications + unread count.
  app.get('/notifications', {
    schema: {
      querystring: {
        type: 'object',
        properties: { limit: { type: 'integer', minimum: 1, maximum: 100, default: 30 } },
      },
    },
  }, async (request) => {
    const limit = request.query.limit ?? 30

    const { data, error } = await supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('user_id', request.user.id)
      .order('created_at', { ascending: false })
      .limit(limit)
    // Resilient: if the table isn't migrated yet, behave as an empty feed rather
    // than 500-ing the header on every page.
    if (error) {
      request.log.error({ err: error }, 'list notifications failed')
      return { notifications: [], unread: 0 }
    }

    const { count, error: countError } = await supabaseAdmin
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', request.user.id)
      .is('read_at', null)
    if (countError) request.log.error({ err: countError }, 'count unread failed')

    return { notifications: data ?? [], unread: count ?? 0 }
  })

  // POST /api/notifications/:id/read — mark one read.
  app.post('/notifications/:id/read', {
    schema: { params: { type: 'object', properties: { id: { type: 'string', format: 'uuid' } } } },
  }, async (request, reply) => {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', request.params.id)
      .eq('user_id', request.user.id)
      .is('read_at', null)
    if (error) return reply.code(500).send({ error: error.message })
    return { ok: true }
  })

  // POST /api/notifications/read-all — mark every unread notification read.
  app.post('/notifications/read-all', async (request, reply) => {
    const { error } = await supabaseAdmin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', request.user.id)
      .is('read_at', null)
    if (error) return reply.code(500).send({ error: error.message })
    return { ok: true }
  })
}
