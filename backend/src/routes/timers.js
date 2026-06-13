import supabaseAdmin from '../lib/supabase.js'
import { logEvent } from '../lib/events.js'
import { requireDeviceAccess } from '../lib/deviceAccess.js'
import { publishToDevice } from '../services/mqtt.js'
import { sendToUser } from '../services/push.js'

export default async function timersRoutes(app) {
  app.addHook('preHandler', app.authenticate)

  // GET /api/devices/:deviceId/timers — active timers for a device
  app.get('/devices/:deviceId/timers', {
    preHandler: [requireDeviceAccess('admin', 'member')],
  }, async (request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('timers')
      .select('*')
      .eq('device_id', request.params.deviceId)
      .eq('status', 'active')
      .order('ends_at', { ascending: true })
    if (error) return reply.code(500).send({ error: error.message })
    return { timers: data }
  })

  // POST /api/devices/:deviceId/timers — create a timer
  app.post('/devices/:deviceId/timers', {
    preHandler: [requireDeviceAccess('admin', 'member')],
    schema: {
      body: {
        type: 'object',
        required: ['duration_seconds'],
        properties: { duration_seconds: { type: 'integer', minimum: 1 } },
      },
    },
  }, async (request, reply) => {
    const { duration_seconds } = request.body
    const endsAt = new Date(Date.now() + duration_seconds * 1000).toISOString()

    const { data: timer, error } = await supabaseAdmin
      .from('timers')
      .insert({
        household_id: request.device.household_id,
        device_id: request.params.deviceId,
        created_by: request.user.id,
        duration_seconds,
        ends_at: endsAt,
        status: 'active',
      })
      .select()
      .single()
    if (error) return reply.code(500).send({ error: error.message })

    publishToDevice(request.params.deviceId, {
      action: 'TIMER_STARTED',
      timerId: timer.id,
      durationSeconds: duration_seconds,
      endsAt,
    }, 'timers')

    await logEvent({
      householdId: request.device.household_id,
      deviceId: request.params.deviceId,
      userId: request.user.id,
      eventType: 'TIMER_CREATED',
      metadata: { timerId: timer.id, duration_seconds },
    }, request.log)

    return reply.code(201).send({ timer })
  })

  // DELETE /api/timers/:timerId — cancel an active timer
  app.delete('/timers/:timerId', {
    schema: {
      params: { type: 'object', properties: { timerId: { type: 'string', format: 'uuid' } } },
    },
  }, async (request, reply) => {
    const { timerId } = request.params

    const { data: timer } = await supabaseAdmin
      .from('timers')
      .select('*')
      .eq('id', timerId)
      .maybeSingle()
    if (!timer) return reply.code(404).send({ error: 'Timer not found' })

    // Caller must be a member of the timer's household.
    const { data: membership } = await supabaseAdmin
      .from('household_members')
      .select('role')
      .eq('household_id', timer.household_id)
      .eq('user_id', request.user.id)
      .maybeSingle()
    if (!membership) return reply.code(403).send({ error: 'You are not a member of this household' })

    if (timer.status !== 'active') {
      return reply.code(409).send({ error: `Timer is already ${timer.status}` })
    }

    const { data: cancelled } = await supabaseAdmin
      .from('timers')
      .update({ status: 'cancelled' })
      .eq('id', timerId)
      .eq('status', 'active')
      .select('id')
      .maybeSingle()
    if (!cancelled) return reply.code(409).send({ error: 'Timer is no longer active' })

    publishToDevice(timer.device_id, { action: 'TIMER_CANCELLED', timerId }, 'timers')

    await logEvent({
      householdId: timer.household_id,
      deviceId: timer.device_id,
      userId: request.user.id,
      eventType: 'TIMER_CANCELLED',
      metadata: { timerId },
    }, request.log)

    if (timer.created_by) {
      await sendToUser(timer.created_by, { title: 'Hestia', body: 'Your stove timer was cancelled.' }, request.log)
    }

    return reply.code(204).send()
  })
}
