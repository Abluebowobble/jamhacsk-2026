// Health API (public — no auth).
//   GET /health        liveness: is the process up? fast, no external calls.
//   GET /health/ready  readiness: are dependencies usable? checks Supabase,
//                      reports MQTT + push state. 200 when ready, 503 when not.
import supabaseAdmin from '../lib/supabase.js'
import { getMqttStatus } from '../services/mqtt.js'
import { isPushConfigured } from '../services/push.js'

// Race a promise against a timeout so a hung dependency never hangs the check.
function withTimeout(promise, ms, onTimeout) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(onTimeout), ms)),
  ])
}

// Lightweight Supabase ping: smallest possible read on a known table. Never
// throws. A plain select surfaces a real error message (HEAD+count does not).
async function checkSupabase() {
  try {
    const { error } = await withTimeout(
      supabaseAdmin.from('households').select('id').limit(1),
      2000,
      { error: { message: 'timeout' } },
    )
    return error
      ? { status: 'error', error: error.message || 'unknown error' }
      : { status: 'ok' }
  } catch (err) {
    return { status: 'error', error: err.message }
  }
}

export default async function healthRoutes(app) {
  // Liveness — cheap, dependency-free. Use this for container/orchestrator probes.
  app.get('/health', async () => ({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  }))

  // Readiness — reports each subsystem. Supabase being down makes it 503;
  // MQTT/push are optional, so their being off/disabled does NOT fail readiness.
  app.get('/health/ready', async (request, reply) => {
    const db = await checkSupabase()
    const services = {
      supabase: db,
      mqtt: { status: getMqttStatus() },
      push: { status: isPushConfigured() ? 'enabled' : 'disabled' },
    }
    const ready = db.status === 'ok'
    reply.code(ready ? 200 : 503)
    return {
      status: ready ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      services,
    }
  })
}
