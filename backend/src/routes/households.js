import supabaseAdmin from '../lib/supabase.js'
import { logEvent, auditContext } from '../lib/events.js'
import { makeRoleCheck } from '../plugins/requireRole.js'

export default async function householdsRoutes(app) {
  // Every route here requires auth.
  app.addHook('preHandler', app.authenticate)

  // GET /api/households — households the user belongs to
  app.get('/', async (request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('household_members')
      .select('role, households(*)')
      .eq('user_id', request.user.id)

    if (error) return reply.code(500).send({ error: error.message })
    const households = (data ?? []).map((row) => ({ ...row.households, role: row.role }))
    return { households }
  })

  // POST /api/households — create a household, creator becomes admin
  app.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string', minLength: 1, maxLength: 100 } },
      },
    },
  }, async (request, reply) => {
    const { name } = request.body

    const { data: household, error } = await supabaseAdmin
      .from('households')
      .insert({ name, created_by: request.user.id })
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })

    const { error: memberError } = await supabaseAdmin
      .from('household_members')
      .insert({ household_id: household.id, user_id: request.user.id, role: 'admin' })
    if (memberError) return reply.code(500).send({ error: memberError.message })

    await logEvent({
      ...auditContext(request),
      householdId: household.id,
      eventType: 'HOUSEHOLD_CREATED',
      resourceType: 'household',
      resourceId: household.id,
      after: { name },
    }, request.log)

    return reply.code(201).send({ household: { ...household, role: 'admin' } })
  })

  // PATCH /api/households/:householdId — rename (admin only)
  app.patch('/:householdId', {
    preHandler: [makeRoleCheck('admin')],
    schema: {
      params: { type: 'object', properties: { householdId: { type: 'string', format: 'uuid' } } },
      body: {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string', minLength: 1, maxLength: 100 } },
      },
    },
  }, async (request, reply) => {
    const { householdId } = request.params
    const { data, error } = await supabaseAdmin
      .from('households')
      .update({ name: request.body.name })
      .eq('id', householdId)
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })

    await logEvent({
      ...auditContext(request),
      householdId,
      eventType: 'HOUSEHOLD_RENAMED',
      resourceType: 'household',
      resourceId: householdId,
      after: { name: request.body.name },
    }, request.log)

    return { household: data }
  })

  // POST /api/households/:householdId/leave — the signed-in user leaves the
  // household. Any member may leave; the last remaining admin may not (it would
  // orphan the household) and is told to promote someone or delete it instead.
  app.post('/:householdId/leave', {
    preHandler: [makeRoleCheck('admin', 'member')],
    schema: {
      params: { type: 'object', properties: { householdId: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const { householdId } = request.params
    const userId = request.user.id

    if (request.membership.role === 'admin') {
      const { count, error: countError } = await supabaseAdmin
        .from('household_members')
        .select('user_id', { count: 'exact', head: true })
        .eq('household_id', householdId)
        .eq('role', 'admin')
      if (countError) return reply.code(500).send({ error: countError.message })
      if ((count ?? 0) <= 1) {
        return reply.code(400).send({ error: 'You’re the only admin. Promote another member, or delete the household instead.' })
      }
    }

    const { error } = await supabaseAdmin
      .from('household_members')
      .delete()
      .eq('household_id', householdId)
      .eq('user_id', userId)
    if (error) return reply.code(500).send({ error: error.message })

    await logEvent({
      ...auditContext(request),
      householdId,
      eventType: 'MEMBER_LEFT',
      resourceType: 'member',
      resourceId: userId,
    }, request.log)

    return reply.code(204).send()
  })

  // DELETE /api/households/:householdId — delete (admin only)
  app.delete('/:householdId', {
    preHandler: [makeRoleCheck('admin')],
    schema: {
      params: { type: 'object', properties: { householdId: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const { householdId } = request.params

    // The events audit log is decoupled from households (migration 004 drops the
    // FK), so these rows survive the delete; household_id stays as the (now
    // dangling) id and resource_id keeps it for attribution.
    await logEvent({
      ...auditContext(request),
      householdId,
      eventType: 'HOUSEHOLD_DELETED',
      resourceType: 'household',
      resourceId: householdId,
    }, request.log)

    const { error } = await supabaseAdmin
      .from('households')
      .delete()
      .eq('id', householdId)
    if (error) return reply.code(500).send({ error: error.message })
    return reply.code(204).send()
  })
}
