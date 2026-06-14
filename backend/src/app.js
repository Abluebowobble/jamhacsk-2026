// Builds the Fastify app: plugins + routes. No listening and no background
// services here (see server.js) so the app can be imported by tests without
// opening a port or connecting to MQTT.
import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'

import supabaseAdmin from './lib/supabase.js'
import authPlugin from './plugins/auth.js'
import healthRoutes from './routes/health.js'
import householdsRoutes from './routes/households.js'
import membersRoutes from './routes/members.js'
import joinRequestsRoutes from './routes/joinRequests.js'
import devicesRoutes from './routes/devices.js'
import stoveControlRoutes from './routes/stoveControl.js'
import cameraRoutes from './routes/camera.js'
import notificationActionRoutes from './routes/notificationActions.js'
import safetySettingsRoutes from './routes/safetySettings.js'
import timersRoutes from './routes/timers.js'
import eventsRoutes from './routes/events.js'
import pushRoutes from './routes/push.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  // Allowed browser origins for CORS. FRONTEND_ORIGIN is a comma-separated
  // allowlist (e.g. "https://app.example.com,http://localhost:5173"). If unset,
  // we reflect any origin — convenient in dev, but set it in production so only
  // your frontend domain can call the API.
  const allowedOrigins = (process.env.FRONTEND_ORIGIN || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
  await app.register(cors, {
    origin: allowedOrigins.length ? allowedOrigins : true,
    credentials: true,
  })
  await app.register(authPlugin)

  // Health API (public): /health (liveness) + /health/ready (readiness)
  await app.register(healthRoutes)

  // Current user (authenticated) — auth identity joined with the editable profile.
  app.get('/api/me', { preHandler: [app.authenticate] }, async (request, reply) => {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('id', request.user.id)
      .maybeSingle()
    if (error) return reply.code(500).send({ error: error.message })
    return { user: { ...request.user, full_name: data?.full_name ?? null } }
  })

  // Update the signed-in user's profile (display name). Upsert so a first-time
  // edit creates the row if onboarding never did.
  app.patch('/api/me', {
    preHandler: [app.authenticate],
    schema: {
      body: {
        type: 'object',
        required: ['full_name'],
        properties: { full_name: { type: 'string', minLength: 1, maxLength: 100 } },
      },
    },
  }, async (request, reply) => {
    const full_name = request.body.full_name.trim()
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .upsert({ id: request.user.id, full_name }, { onConflict: 'id' })
      .select('full_name')
      .single()
    if (error) return reply.code(500).send({ error: error.message })
    return { user: { ...request.user, full_name: data.full_name } }
  })

  // Feature routes. Prefixes chosen so each file's paths resolve to the PRD's URLs.
  await app.register(householdsRoutes, { prefix: '/api/households' })
  await app.register(membersRoutes, { prefix: '/api/households' })
  await app.register(joinRequestsRoutes, { prefix: '/api' })
  await app.register(devicesRoutes, { prefix: '/api' })
  await app.register(stoveControlRoutes, { prefix: '/api/devices' })
  await app.register(cameraRoutes, { prefix: '/api/devices' })
  // Unauthenticated: authorized by a signed action token in the body (see the
  // route). Registered as its own plugin so it does NOT inherit stove control's
  // authenticate hook.
  await app.register(notificationActionRoutes, { prefix: '/api/devices' })
  await app.register(safetySettingsRoutes, { prefix: '/api/devices' })
  await app.register(timersRoutes, { prefix: '/api' })
  await app.register(eventsRoutes, { prefix: '/api' })
  await app.register(pushRoutes, { prefix: '/api/push' })

  return app
}
