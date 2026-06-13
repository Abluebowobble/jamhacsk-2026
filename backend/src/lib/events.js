import supabaseAdmin from './supabase.js'

/**
 * Insert a row into the events table. Fire-and-forget friendly: errors are
 * logged but never thrown, so event logging can't break a request path.
 *
 * @param {object} e
 * @param {string} e.householdId
 * @param {string} [e.deviceId]
 * @param {string} [e.userId]
 * @param {string} e.eventType   one of the PRD event type strings
 * @param {object} [e.metadata]
 * @param {import('fastify').FastifyBaseLogger} [logger]
 */
export async function logEvent({ householdId, deviceId, userId, eventType, metadata }, logger = console) {
  const { error } = await supabaseAdmin.from('events').insert({
    household_id: householdId,
    device_id: deviceId ?? null,
    user_id: userId ?? null,
    event_type: eventType,
    metadata: metadata ?? null,
  })
  if (error) logger.error?.({ err: error, eventType }, 'logEvent failed')
}
