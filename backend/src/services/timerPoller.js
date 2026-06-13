import supabaseAdmin from '../lib/supabase.js'
import { logEvent } from '../lib/events.js'
import { publishToDevice } from './mqtt.js'
import { sendToUser } from './push.js'

const POLL_INTERVAL_MS = 10_000

let handle = null

/**
 * Start the in-process timer poller. Every 10s it finds active timers whose
 * ends_at has passed, marks them completed, turns the stove off via MQTT,
 * notifies the creator, and logs TIMER_COMPLETED.
 */
export function startTimerPoller(logger = console) {
  if (handle) return
  handle = setInterval(() => tick(logger).catch((err) => logger.error?.({ err }, 'timer tick failed')), POLL_INTERVAL_MS)
  logger.info?.('Timer poller started')
}

export function stopTimerPoller() {
  if (handle) clearInterval(handle)
  handle = null
}

async function tick(logger) {
  const nowIso = new Date().toISOString()

  const { data: expired, error } = await supabaseAdmin
    .from('timers')
    .select('*')
    .eq('status', 'active')
    .lte('ends_at', nowIso)

  if (error) {
    logger.error?.({ err: error }, 'timer poll query failed')
    return
  }
  if (!expired?.length) return

  for (const timer of expired) {
    // Guard against double-processing: only act if our update wins the race.
    const { data: updated } = await supabaseAdmin
      .from('timers')
      .update({ status: 'completed' })
      .eq('id', timer.id)
      .eq('status', 'active')
      .select('id')
      .maybeSingle()

    if (!updated) continue

    publishToDevice(timer.device_id, { command: 'TURN_OFF', source: 'timer' })

    await logEvent({
      householdId: timer.household_id,
      deviceId: timer.device_id,
      userId: timer.created_by,
      eventType: 'TIMER_COMPLETED',
      metadata: { timerId: timer.id },
    }, logger)

    if (timer.created_by) {
      await sendToUser(timer.created_by, {
        title: 'Hestia',
        body: 'Timer finished — stove turned off.',
      }, logger)
    }
  }
}
