import mqtt from 'mqtt'
import supabaseAdmin from '../lib/supabase.js'
import { logEvent } from '../lib/events.js'
import { sendToHouseholdMembers } from './push.js'
import { mintActionToken } from '../lib/actionToken.js'
import { SNOOZE_SECONDS } from '../lib/safetyActions.js'

// Backend's own public URL, baked into warning pushes so the service worker can
// POST the snooze/turn-off action straight here from a locked phone. If unset,
// the SW falls back to opening the app to perform the action.
const PUBLIC_API_URL = (process.env.PUBLIC_API_URL || '').replace(/\/+$/, '')

let client = null
let logger = console

// Topics are keyed by household: hestia/households/{householdId}/devices/{deviceId}/{kind}
const TOPIC_BASE = 'hestia/households'

/**
 * Connect to the MQTT broker and subscribe to device topics. Safe to call when
 * no broker is reachable — mqtt.js auto-reconnects and we only log errors, so
 * the API stays up regardless.
 */

// Values that explicitly turn the MQTT bridge off (besides empty/unset).
const DISABLED_VALUES = new Set(['off', 'disabled', 'none', 'false', '0'])

export function initMqtt(log = console) {
  logger = log
  const url = process.env.MQTT_BROKER_URL?.trim()
  if (!url || DISABLED_VALUES.has(url.toLowerCase())) {
    logger.info?.('MQTT bridge disabled (MQTT_BROKER_URL not set)')
    return
  }

  client = mqtt.connect(url, {
    reconnectPeriod: 5000,
    // Optional broker auth — omitted (anonymous) when env vars are unset.
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
  })

  // Track offline state so a dead broker logs once, not every reconnect attempt.
  let warnedOffline = false

  client.on('connect', () => {
    if (warnedOffline) logger.info?.(`MQTT reconnected: ${url}`)
    else logger.info?.(`MQTT connected: ${url}`)
    warnedOffline = false
    client.subscribe([
      `${TOPIC_BASE}/+/devices/+/status`,
      `${TOPIC_BASE}/+/devices/+/presence`,
      `${TOPIC_BASE}/+/devices/+/events`,
    ], (err) => {
      if (err) logger.error?.({ err }, 'MQTT subscribe failed')
    })
  })

  // ECONNREFUSED / offline: warn ONCE, then stay quiet while mqtt.js keeps
  // retrying in the background. The API runs fine without the broker.
  client.on('error', (err) => {
    if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
      if (!warnedOffline) {
        warnedOffline = true
        logger.warn?.(`MQTT broker unreachable at ${url} — retrying quietly in background`)
      }
      return
    }
    logger.error?.({ err }, 'MQTT error')
  })

  client.on('message', handleMessage)
}

/**
 * Current MQTT bridge state for health checks. No I/O — reads in-memory state.
 * @returns {'disabled'|'connected'|'offline'}
 */
export function getMqttStatus() {
  if (!client) return 'disabled'
  return client.connected ? 'connected' : 'offline'
}

function parseTopic(topic) {
  // hestia/households/{householdId}/devices/{deviceId}/{kind}
  const parts = topic.split('/')
  return { householdId: parts[2], deviceId: parts[4], kind: parts[5] }
}

async function handleMessage(topic, buffer) {
  const { deviceId, kind } = parseTopic(topic)
  let payload
  try {
    payload = JSON.parse(buffer.toString())
  } catch {
    logger.warn?.(`MQTT non-JSON payload on ${topic}`)
    return
  }

  try {
    if (kind === 'status') await handleStatus(deviceId, payload)
    else if (kind === 'presence') await handlePresence(deviceId, payload)
    else if (kind === 'events') await handleDeviceEvent(deviceId, payload)
  } catch (err) {
    logger.error?.({ err, topic }, 'MQTT message handler failed')
  }
}

async function loadDeviceHousehold(deviceId) {
  const { data } = await supabaseAdmin
    .from('devices')
    .select('id, household_id, warning_delay_seconds')
    .eq('id', deviceId)
    .maybeSingle()
  return data
}

async function handleStatus(deviceId, payload) {
  const update = {}
  if (typeof payload.online === 'boolean') update.online_status = payload.online
  if (payload.stoveStatus) update.stove_status = payload.stoveStatus
  if (payload.presence) update.presence_status = payload.presence
  update.updated_at = new Date().toISOString()

  await supabaseAdmin.from('devices').update(update).eq('id', deviceId)
}

async function handlePresence(deviceId, payload) {
  const device = await loadDeviceHousehold(deviceId)
  // Only act on devices that exist and belong to a household, so presence is
  // attributed to the correct household (and unknown devices are ignored).
  if (!device?.household_id) return

  const detected = payload.presence === 'detected' || payload.detected === true
  await supabaseAdmin
    .from('devices')
    .update({ presence_status: detected ? 'detected' : 'not_detected', updated_at: new Date().toISOString() })
    .eq('id', deviceId)

  await logEvent({
    householdId: device.household_id,
    deviceId,
    eventType: detected ? 'PRESENCE_DETECTED' : 'NO_PRESENCE_DETECTED',
    metadata: payload,
  }, logger)
}

// Plain safety notifications (no action buttons). The auto-shutoff push reuses
// the warning's per-device tag so it REPLACES the now-stale "about to shut off"
// notification rather than stacking a second one.
const SIMPLE_NOTIFY = {
  AUTO_SHUTOFF_TRIGGERED: 'Stove turned off automatically — no one was detected nearby.',
}

/**
 * The "stove is about to turn off" alert: a live countdown plus Snooze / Turn
 * off now action buttons. Carries a signed action token so the service worker
 * can act from a locked phone without a session.
 */
async function sendWarningPush(device, payload) {
  const warningDelay = Number(device.warning_delay_seconds) || 30
  // Prefer the buzzer-start time the device stamped; fall back to now.
  const startedAt = Date.parse(payload?.timestamp) || Date.now()
  const shutoffAt = new Date(startedAt + warningDelay * 1000).toISOString()
  // Token outlives the warning window by a margin so a slightly late tap still
  // works (the action is safe to run even after auto-shutoff already fired).
  const actionToken = mintActionToken(device.id, { ttlSeconds: warningDelay + 600 })

  await sendToHouseholdMembers(device.household_id, {
    title: 'Hestia — stove shutting off',
    body: 'No one’s at the stove. It will shut off automatically — snooze or turn it off now.',
    tag: `hestia-shutoff-${device.id}`,
    requireInteraction: true,
    kind: 'shutoff-warning',
    deviceId: device.id,
    shutoffAt,
    snoozeSeconds: SNOOZE_SECONDS,
    actionToken,
    apiBase: PUBLIC_API_URL,
    url: `/devices/${device.id}`,
  }, logger)
}

async function handleDeviceEvent(deviceId, payload) {
  const device = await loadDeviceHousehold(deviceId)
  // Only act on devices that belong to a household, so events + notifications
  // go to the correct household and unknown devices are ignored.
  if (!device?.household_id) return

  const eventType = payload.eventType || payload.type
  if (!eventType) return

  await logEvent({
    householdId: device.household_id,
    deviceId,
    eventType,
    metadata: payload,
  }, logger)

  if (eventType === 'WARNING_BUZZER_STARTED') {
    await sendWarningPush(device, payload)
    return
  }

  const body = SIMPLE_NOTIFY[eventType]
  if (body) {
    await sendToHouseholdMembers(
      device.household_id,
      { title: 'Hestia', body, tag: `hestia-shutoff-${deviceId}`, url: `/devices/${deviceId}` },
      logger,
    )
  }
}

/**
 * Publish a command/settings/timer payload to a device's household-keyed topic.
 * Fire-and-forget: resolves immediately even if the broker is down. Looks up the
 * device's household so the topic matches what the device subscribes to.
 *
 * @param {string} deviceId
 * @param {object} payload
 * @param {string} [kind] one of 'commands' | 'settings' | 'timers' (default 'commands')
 */
export async function publishToDevice(deviceId, payload, kind = 'commands') {
  if (!client || !client.connected) {
    logger.warn?.(`MQTT not connected — dropping ${kind} for ${deviceId}`)
    return
  }
  const device = await loadDeviceHousehold(deviceId)
  if (!device?.household_id) {
    logger.warn?.(`No household for device ${deviceId} — dropping ${kind}`)
    return
  }
  client.publish(
    `${TOPIC_BASE}/${device.household_id}/devices/${deviceId}/${kind}`,
    JSON.stringify({ ...payload, timestamp: new Date().toISOString() }),
  )
}
