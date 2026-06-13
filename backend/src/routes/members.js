import supabaseAdmin from '../lib/supabase.js'
import { logEvent } from '../lib/events.js'
import { makeRoleCheck } from '../plugins/requireRole.js'

export default async function membersRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/households/:householdId/members — list members (any member)
  app.get('/:householdId/members', {
    preHandler: [makeRoleCheck('admin', 'member')],
    schema: {
      params: { type: 'object', properties: { householdId: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('household_members')
      .select('user_id, role, created_at, profiles(full_name)')
      .eq('household_id', request.params.householdId)
    if (error) return reply.code(500).send({ error: error.message })
    return { members: data }
  })

  // DELETE /api/households/:householdId/members/:userId — remove member (admin only)
  app.delete('/:householdId/members/:userId', {
    preHandler: [makeRoleCheck('admin')],
    schema: {
      params: {
        type: 'object',
        properties: {
          householdId: { type: 'string', format: 'uuid' },
          userId: { type: 'string', format: 'uuid' },
        },
      },
    },
  }, async (request, reply) => {
    const { householdId, userId } = request.params

    if (userId === request.user.id) {
      return reply.code(400).send({ error: 'Admins cannot remove themselves; transfer or delete the household instead' })
    }

    const { error } = await supabaseAdmin
      .from('household_members')
      .delete()
      .eq('household_id', householdId)
      .eq('user_id', userId)
    if (error) return reply.code(500).send({ error: error.message })

    await logEvent({
      householdId,
      userId: request.user.id,
      eventType: 'MEMBER_REMOVED',
      metadata: { removedUserId: userId },
    }, request.log)

    return reply.code(204).send()
  })
}
