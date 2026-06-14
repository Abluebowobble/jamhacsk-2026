import supabaseAdmin from '../lib/supabase.js'
import { makeRoleCheck } from '../plugins/requireRole.js'
import { requireDeviceAccess } from '../lib/deviceAccess.js'

// Pagination plus optional audit-log filters. The events table doubles as the
// audit log (migration 003), so a reviewer can narrow by who acted, the outcome
// (e.g. only `denied` attempts), or a specific event type.
const paginationQuery = {
  type: 'object',
  properties: {
    limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
    offset: { type: 'integer', minimum: 0, default: 0 },
    actor_type: { type: 'string', enum: ['user', 'device', 'system'] },
    outcome: { type: 'string', enum: ['success', 'failure', 'denied'] },
    event_type: { type: 'string', maxLength: 64 },
  },
}

// Apply the optional audit filters shared by both list endpoints.
function applyAuditFilters(query, { actor_type, outcome, event_type }) {
  if (actor_type) query = query.eq('actor_type', actor_type)
  if (outcome) query = query.eq('outcome', outcome)
  if (event_type) query = query.eq('event_type', event_type)
  return query
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
    let query = supabaseAdmin
      .from('events')
      .select('*')
      .eq('household_id', request.params.householdId)
    query = applyAuditFilters(query, request.query)
    const { data, error } = await query
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
    let query = supabaseAdmin
      .from('events')
      .select('*')
      .eq('device_id', request.params.deviceId)
    query = applyAuditFilters(query, request.query)
    const { data, error } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
    if (error) return reply.code(500).send({ error: error.message })
    return { events: data }
  })
}
