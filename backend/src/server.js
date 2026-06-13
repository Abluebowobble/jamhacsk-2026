// Entry point: builds the app, starts background services, and listens.
import { buildApp } from './app.js'
import { initMqtt } from './services/mqtt.js'
import { initPush } from './services/push.js'
import { startTimerPoller } from './services/timerPoller.js'

const PORT = Number(process.env.PORT) || 3001

const app = await buildApp()

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

// Graceful shutdown so deploys/restarts don't drop in-flight requests.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    app.log.info(`${signal} received, shutting down…`)
    await app.close()
    process.exit(0)
  })
}
