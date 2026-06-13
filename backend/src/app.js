// Builds the Fastify app: plugins + routes. No listening and no background
// services here (see server.js) so the app can be imported by tests without
// opening a port or connecting to MQTT.
import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'

import authPlugin from './plugins/auth.js'
import healthRoutes from './routes/health.js'
import householdsRoutes from './routes/households.js'
import membersRoutes from './routes/members.js'
import joinRequestsRoutes from './routes/joinRequests.js'
import devicesRoutes from './routes/devices.js'
import stoveControlRoutes from './routes/stoveControl.js'
import safetySettingsRoutes from './routes/safetySettings.js'
import timersRoutes from './routes/timers.js'
import eventsRoutes from './routes/events.js'
import pushRoutes from './routes/push.js'

export async function buildApp() {
  const app = Fastify({ logger: true })

  await app.register(cors, { origin: process.env.FRONTEND_URL || true })
  await app.register(authPlugin)

  // Health API (public): /health (liveness) + /health/ready (readiness)
  await app.register(healthRoutes)

  // Current user (authenticated)
  app.get('/api/me', { preHandler: [app.authenticate] }, async (request) => ({ user: request.user }))

  // Feature routes. Prefixes chosen so each file's paths resolve to the PRD's URLs.
  await app.register(householdsRoutes, { prefix: '/api/households' })
  await app.register(membersRoutes, { prefix: '/api/households' })
  await app.register(joinRequestsRoutes, { prefix: '/api' })
  await app.register(devicesRoutes, { prefix: '/api' })
  await app.register(stoveControlRoutes, { prefix: '/api/devices' })
  await app.register(safetySettingsRoutes, { prefix: '/api/devices' })
  await app.register(timersRoutes, { prefix: '/api' })
  await app.register(eventsRoutes, { prefix: '/api' })
  await app.register(pushRoutes, { prefix: '/api/push' })

  return app
}
