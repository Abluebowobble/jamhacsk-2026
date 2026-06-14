// Shared device safety actions, so the authenticated route (in-app button) and
// the token route (notification button, no session) perform IDENTICAL work —
// one source of truth for "turn off" and "snooze". Each relays the command to
// the Pi over MQTT, reflects it in the snapshot, and logs an event.
import supabaseAdmin from './supabase.js'
import { logEvent } from './events.js'
import { publishToDevice } from '../services/mqtt.js'

// How long a snooze pushes the shut-off back. The button says "2 min" and the
// Pi re-warns after exactly this window.
export const SNOOZE_SECONDS = 120

/**
 * Cut stove power now (the fail-safe action).
 * @param {string} deviceId
 * @param {string} householdId
 * @param {object} [opts]
 * @param {string|null} [opts.userId] acting user, or null for a notification action
 * @param {string} [opts.source] provenance for the event metadata
 * @param {import('fastify').FastifyBaseLogger} [logger]
 */
export async function turnOffDevice(deviceId, householdId, { userId = null, source = 'backend' } = {}, logger = console) {
  await publishToDevice(deviceId, { command: 'TURN_OFF', source })
  await supabaseAdmin
    .from('devices')
    .update({ stove_status: 'off', updated_at: new Date().toISOString() })
    .eq('id', deviceId)
  await logEvent({ householdId, deviceId, userId, eventType: 'STOVE_TURNED_OFF', metadata: { source } }, logger)
}

/**
 * Snooze an imminent auto shut-off: tell the Pi to hold off and re-warn after
 * SNOOZE_SECONDS. Does not change stove state — the burner stays on.
 */
export async function snoozeDevice(deviceId, householdId, { userId = null, source = 'backend', seconds = SNOOZE_SECONDS } = {}, logger = console) {
  await publishToDevice(deviceId, { command: 'SNOOZE', seconds, source })
  await logEvent({ householdId, deviceId, userId, eventType: 'SHUTOFF_SNOOZED', metadata: { source, seconds } }, logger)
}
