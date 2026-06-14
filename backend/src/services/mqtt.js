import mqtt from 'mqtt'
import supabaseAdmin from '../lib/supabase.js'
import { logEvent } from '../lib/events.js'
import { sendToHouseholdMembers } from './push.js'

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
    .select('id, household_id, device_name')
    .eq('id', deviceId)
    .maybeSingle()
  return data
}

async function handleStatus(deviceId, payload) {
  // Load current state first so we can detect an online <-> offline transition.
  const { data: device } = await supabaseAdmin
    .from('devices')
    .select('id, household_id, device_name, online_status')
    .eq('id', deviceId)
    .maybeSingle()
  if (!device) return // unknown device — ignore

  const update = { updated_at: new Date().toISOString() }
  if (typeof payload.online === 'boolean') update.online_status = payload.online
  if (payload.stoveStatus) update.stove_status = payload.stoveStatus
  if (payload.presence) update.presence_status = payload.presence
  await supabaseAdmin.from('devices').update(update).eq('id', deviceId)

  // Notify + log ONLY on an online <-> offline transition (PRD §16) — never on
  // every heartbeat. The offline edge arrives via the Pi's MQTT Last Will.
  const wentOffline = payload.online === false && device.online_status === true
  const cameOnline = payload.online === true && device.online_status === false
  if ((wentOffline || cameOnline) && device.household_id) {
    const name = device.device_name || 'A Hestia device'
    await logEvent({
      householdId: device.household_id,
      deviceId,
      eventType: wentOffline ? 'DEVICE_OFFLINE' : 'DEVICE_ONLINE',
      actorType: 'device',
      actorLabel: device.device_name ?? null,
      source: 'mqtt',
      resourceType: 'device',
      resourceId: deviceId,
    }, logger)
    await sendToHouseholdMembers(device.household_id, {
      title: 'Hestia',
      body: wentOffline
        ? `${name} went offline — it can no longer protect that stove.`
        : `${name} is back online.`,
      tag: `device-online-${deviceId}`, // coalesce repeated online/offline alerts
    }, logger)
  }
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
    actorType: 'device',
    actorLabel: device.device_name ?? null,
    source: 'mqtt',
    resourceType: 'device',
    resourceId: deviceId,
    metadata: payload,
  }, logger)
}

// Safety events the device reports that warrant a plain-text push (PRD §16).
const NOTIFY_EVENTS = {
  AUTO_SHUTOFF_TRIGGERED: 'Hestia Alert: stove was turned off automatically because no one was detected nearby.',
  WARNING_CANCELLED: 'Hestia: someone returned to the stove — the warning was cancelled.',
}

// The unattended-warning moment gets an actionable push (PRD §12): two buttons
// that deep-link into the app — "Add time" (snooze) or "Turn off" — plus the
// device URL so a tap lands on its detail page. The service worker reads
// `actions`/`data`/`url` from this payload (frontend/public/push-sw.js).
function warningPush(deviceId, name) {
  return {
    title: `Hestia — ${name} unattended`,
    body: 'No one detected near the stove. Add time or turn it off.',
    tag: `warn-${deviceId}`, // coalesce repeated warning/snooze alerts
    requireInteraction: true,
    url: `/devices/${deviceId}?alert=warning`,
    data: { deviceId },
    actions: [
      { action: 'add-time', title: 'Add time' },
      { action: 'turn-off', title: 'Turn off' },
    ],
  }
}

async function handleDeviceEvent(deviceId, payload) {
  // Load the name too so the actionable warning push can title the device.
  const { data: device } = await supabaseAdmin
    .from('devices')
    .select('id, household_id, device_name')
    .eq('id', deviceId)
    .maybeSingle()
  // Only act on devices that belong to a household, so events + notifications
  // go to the correct household and unknown devices are ignored.
  if (!device?.household_id) return

  const eventType = payload.eventType || payload.type
  if (!eventType) return

  await logEvent({
    householdId: device.household_id,
    deviceId,
    eventType,
    actorType: 'device',
    actorLabel: device.device_name ?? null,
    source: 'mqtt',
    resourceType: 'device',
    resourceId: deviceId,
    metadata: payload,
  }, logger)

  if (eventType === 'WARNING_BUZZER_STARTED') {
    await sendToHouseholdMembers(
      device.household_id,
      warningPush(deviceId, device.device_name || 'the stove'),
      logger,
    )
    return
  }

  const body = NOTIFY_EVENTS[eventType]
  if (body) {
    await sendToHouseholdMembers(device.household_id, { title: 'Hestia', body }, logger)
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
