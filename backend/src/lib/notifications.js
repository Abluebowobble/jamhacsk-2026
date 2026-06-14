import supabaseAdmin from './supabase.js'
import { sendToUser } from '../services/push.js'

/**
 * Persist one in-app notification for a recipient, and (by default) also fire a
 * Web Push so it surfaces while the app is closed. Fire-and-forget friendly:
 * failures are logged, never thrown, so notifying can't break a request path.
 *
 * @param {object} n
 * @param {string} n.userId        recipient
 * @param {string} n.type          'join_request' | 'join_approved' | 'join_denied' | …
 * @param {string} n.title
 * @param {string} [n.body]
 * @param {object} [n.data]        payload the client needs to render/act
 * @param {boolean} [n.push=true]  also send a Web Push to this user
 * @param {import('fastify').FastifyBaseLogger} [logger]
 * @returns {Promise<object|null>} the inserted row, or null on failure
 */
export async function createNotification(
  { userId, type, title, body = null, data = {}, push = true },
  logger = console,
) {
  const { data: row, error } = await supabaseAdmin
    .from('notifications')
    .insert({ user_id: userId, type, title, body, data })
    .select()
    .single()
  if (error) {
    logger.error?.({ err: error, type }, 'createNotification failed')
    return null
  }
  if (push) await sendToUser(userId, { title, body: body ?? '' }, logger)
  return row
}

/**
 * Create the same notification for every admin of a household (optionally
 * skipping one user, e.g. the actor who triggered it).
 */
export async function notifyHouseholdAdmins(householdId, notif, logger = console, { excludeUserId } = {}) {
  const { data: admins, error } = await supabaseAdmin
    .from('household_members')
    .select('user_id')
    .eq('household_id', householdId)
    .eq('role', 'admin')
  if (error) {
    logger.error?.({ err: error }, 'notifyHouseholdAdmins: failed to load admins')
    return
  }
  await Promise.all(
    (admins ?? [])
      .filter((a) => a.user_id !== excludeUserId)
      .map((a) => createNotification({ ...notif, userId: a.user_id }, logger)),
  )
}

/** Drop notifications tied to a now-resolved join request, across all admins. */
export async function clearJoinRequestNotifications(joinRequestId, logger = console) {
  const { error } = await supabaseAdmin
    .from('notifications')
    .delete()
    .eq('type', 'join_request')
    .eq('data->>joinRequestId', joinRequestId)
  if (error) logger.error?.({ err: error }, 'clearJoinRequestNotifications failed')
}
