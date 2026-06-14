import supabaseAdmin from './supabase.js'

/**
 * Insert a row into the events table (Hestia's audit log). Fire-and-forget
 * friendly: errors are logged but never thrown, so logging can't break a
 * request path.
 *
 * The events table doubles as the audit log (see migration 003), so beyond the
 * product fields (householdId/deviceId/eventType/metadata) it also records WHO
 * acted, from WHERE, the OUTCOME, and what CHANGED. When actor_type / source are
 * omitted they're inferred: a call with userId is a 'user' acting via 'rest_api';
 * otherwise it's the 'system'. Device (MQTT) callers should pass actorType:'device'.
 *
 * @param {object} e
 * @param {string} e.householdId
 * @param {string} [e.deviceId]
 * @param {string} [e.userId]
 * @param {string} e.eventType            one of the PRD event type strings
 * @param {object} [e.metadata]
 * @param {'user'|'device'|'system'} [e.actorType]
 * @param {string} [e.actorLabel]         frozen email / device name
 * @param {'rest_api'|'mqtt'|'system'} [e.source]
 * @param {string} [e.ipAddress]
 * @param {string} [e.userAgent]
 * @param {'success'|'failure'|'denied'} [e.outcome]
 * @param {string} [e.errorMessage]
 * @param {string} [e.resourceType]       'device' | 'household' | 'member' | ...
 * @param {string} [e.resourceId]
 * @param {object} [e.before]             prior state for mutations
 * @param {object} [e.after]              new state for mutations
 * @param {import('fastify').FastifyBaseLogger} [logger]
 */
export async function logEvent(e, logger = console) {
  const {
    householdId, deviceId, userId, eventType, metadata,
    actorType, actorLabel, source, ipAddress, userAgent,
    outcome, errorMessage, resourceType, resourceId, before, after,
  } = e

  const { error } = await supabaseAdmin.from('events').insert({
    household_id: householdId ?? null,
    device_id: deviceId ?? null,
    user_id: userId ?? null,
    event_type: eventType,
    metadata: metadata ?? null,
    actor_type: actorType ?? (userId ? 'user' : 'system'),
    actor_label: actorLabel ?? null,
    source: source ?? (userId ? 'rest_api' : 'system'),
    ip_address: ipAddress ?? null,
    user_agent: userAgent ?? null,
    outcome: outcome ?? 'success',
    error_message: errorMessage ?? null,
    resource_type: resourceType ?? null,
    resource_id: resourceId ?? null,
    before: before ?? null,
    after: after ?? null,
  })
  if (error) logger.error?.({ err: error, eventType }, 'logEvent failed')
}

/**
 * Audit context for a user acting through the REST API. Spread into a logEvent
 * call so every route records the actor, origin IP, and user agent consistently:
 *
 *   await logEvent({ ...auditContext(request), householdId, eventType: '...' }, request.log)
 *
 * @param {import('fastify').FastifyRequest} request
 */
export function auditContext(request) {
  return {
    actorType: 'user',
    source: 'rest_api',
    userId: request.user?.id,
    actorLabel: request.user?.email ?? null,
    ipAddress: request.ip,
    userAgent: request.headers?.['user-agent'] ?? null,
  }
}
