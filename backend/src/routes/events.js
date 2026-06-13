import supabaseAdmin from '../lib/supabase.js'
import { makeRoleCheck } from '../plugins/requireRole.js'
import { requireDeviceAccess } from '../lib/deviceAccess.js'

const paginationQuery = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
    offset: { type: 'integer', minimum: 0, default: 0 },
  },
}

export default async function eventsRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/households/:householdId/events
  app.get('/households/:householdId/events', {
    preHandler: [makeRoleCheck('admin', 'member')],
    schema: {
      params: { type: 'object', properties: { householdId: { type: 'string', format: 'uuid' } } },
      querystring: paginationQuery,
    },
  }, async (request, reply) => {
    const { limit, offset } = request.query
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('household_id', request.params.householdId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) return reply.code(500).send({ error: error.message })
    return { events: data }
  })

  // GET /api/devices/:deviceId/events
  app.get('/devices/:deviceId/events', {
    preHandler: [requireDeviceAccess('admin', 'member')],
    schema: { querystring: paginationQuery },
  }, async (request, reply) => {
    const { limit, offset } = request.query
    const { data, error } = await supabaseAdmin
      .from('events')
      .select('*')
      .eq('device_id', request.params.deviceId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) return reply.code(500).send({ error: error.message })
    return { events: data }
  })
}
