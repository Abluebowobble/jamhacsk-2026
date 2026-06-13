import mqtt from 'mqtt'
import supabaseAdmin from '../lib/supabase.js'
import { logEvent } from '../lib/events.js'
import { sendToHouseholdMembers } from './push.js'

let client = null
let logger = console

const TOPIC_BASE = 'hestia/devices'

/**
 * Connect to the MQTT broker and subscribe to device topics. Safe to call when
 * no broker is reachable — mqtt.js auto-reconnects and we only log errors, so
 * the API stays up regardless.
 */
export function initMqtt(log = console) {
  logger = log
  const url = process.env.MQTT_BROKER_URL
  if (!url) {
    logger.warn?.('MQTT_BROKER_URL not set — MQTT bridge disabled')
    return
  }

  client = mqtt.connect(url, { reconnectPeriod: 5000 })

  client.on('connect', () => {
    logger.info?.(`MQTT connected: ${url}`)
    client.subscribe([
      `${TOPIC_BASE}/+/status`,
      `${TOPIC_BASE}/+/presence`,
      `${TOPIC_BASE}/+/events`,
    ], (err) => {
      if (err) logger.error?.({ err }, 'MQTT subscribe failed')
    })
  })

  client.on('error', (err) => logger.error?.({ err }, 'MQTT error'))
  client.on('message', handleMessage)
}

function parseDeviceId(topic) {
  // hestia/devices/{deviceId}/{kind}
  const parts = topic.split('/')
  return { deviceId: parts[2], kind: parts[3] }
}

async function handleMessage(topic, buffer) {
  const { deviceId, kind } = parseDeviceId(topic)
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
    .select('id, household_id')
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

// Safety events the device reports that warrant a push notification.
const NOTIFY_EVENTS = {
  WARNING_BUZZER_STARTED: 'Hestia Alert: warning buzzer started — no one detected near the stove.',
  AUTO_SHUTOFF_TRIGGERED: 'Hestia Alert: stove was turned off automatically because no one was detected nearby.',
}

async function handleDeviceEvent(deviceId, payload) {
  const device = await loadDeviceHousehold(deviceId)
  if (!device?.household_id) return

  const eventType = payload.eventType || payload.type
  if (!eventType) return

  await logEvent({
    householdId: device.household_id,
    deviceId,
    eventType,
    metadata: payload,
  }, logger)

  const body = NOTIFY_EVENTS[eventType]
  if (body) {
    await sendToHouseholdMembers(device.household_id, { title: 'Hestia', body }, logger)
  }
}

/**
 * Publish a command/settings/timer payload to a device topic. Fire-and-forget:
 * resolves immediately even if the broker is down.
 *
 * @param {string} deviceId
 * @param {object} payload
 * @param {string} [kind] one of 'commands' | 'settings' | 'timers' (default 'commands')
 */
export function publishToDevice(deviceId, payload, kind = 'commands') {
  if (!client || !client.connected) {
    logger.warn?.(`MQTT not connected — dropping ${kind} for ${deviceId}`)
    return
  }
  client.publish(`${TOPIC_BASE}/${deviceId}/${kind}`, JSON.stringify({
    ...payload,
    timestamp: new Date().toISOString(),
  }))
}
