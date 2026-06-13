import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'

import authPlugin from './plugins/auth.js'
import householdsRoutes from './routes/households.js'
import membersRoutes from './routes/members.js'
import joinRequestsRoutes from './routes/joinRequests.js'
import devicesRoutes from './routes/devices.js'
import stoveControlRoutes from './routes/stoveControl.js'
import safetySettingsRoutes from './routes/safetySettings.js'
import timersRoutes from './routes/timers.js'
import eventsRoutes from './routes/events.js'
import pushRoutes from './routes/push.js'

import { initMqtt } from './services/mqtt.js'
import { initPush } from './services/push.js'
import { startTimerPoller } from './services/timerPoller.js'

const app = Fastify({ logger: true })
const PORT = Number(process.env.PORT) || 3001
 
await app.register(cors, { origin: process.env.FRONTEND_URL || true })
await app.register(authPlugin)

// Health check (public)
app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

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

// Background services. These degrade gracefully if MQTT/VAPID aren't configured.
initPush(app.log)
initMqtt(app.log)
startTimerPoller(app.log)

try {
  await app.listen({ port: PORT, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
