import webpush from 'web-push'
import supabaseAdmin from '../lib/supabase.js'

let configured = false

/** Configure VAPID details once at startup. Safe to call with missing keys. */
export function initPush(logger = console) {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_EMAIL } = process.env
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    logger.warn?.('VAPID keys not set — push notifications disabled')
    return
  }
  webpush.setVapidDetails(VAPID_EMAIL || 'mailto:admin@hestia.app', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY)
  configured = true
}

/** Whether VAPID keys were configured at startup. No I/O. */
export function isPushConfigured() {
  return configured
}

/**
 * Send a single push to one subscription. Used for the subscribe confirmation —
 * the only push not tied to a safety event — so a user can verify, on the spot,
 * that alerts actually reach this device. Returns true on success.
 */
export async function sendToSubscription({ endpoint, p256dh, auth }, payload, logger = console) {
  if (!configured) return false
  try {
    await webpush.sendNotification(
      { endpoint, keys: { p256dh, auth } },
      JSON.stringify(payload),
    )
    return true
  } catch (err) {
    logger.error?.({ err }, 'confirmation push failed')
    return false
  }
}

/**
 * Send a push notification to every subscription belonging to a user.
 * Stale (410/404) subscriptions are pruned from the DB.
 */
export async function sendToUser(userId, payload, logger = console) {
  if (!configured) return

  const { data: subs, error } = await supabaseAdmin
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    logger.error?.({ err: error }, 'sendToUser: failed to load subscriptions')
    return
  }

  const body = JSON.stringify(payload)
  await Promise.all((subs ?? []).map(async (sub) => {
    const subscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    }
    try {
      await webpush.sendNotification(subscription, body)
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await supabaseAdmin.from('push_subscriptions').delete().eq('id', sub.id)
      } else {
        logger.error?.({ err, userId }, 'push send failed')
      }
    }
  }))
}

/** Send to all members of a household with a given role filter (default: all). */
async function sendToHousehold(householdId, payload, roles, logger) {
  let query = supabaseAdmin
    .from('household_members')
    .select('user_id, role')
    .eq('household_id', householdId)
  if (roles) query = query.in('role', roles)

  const { data: members, error } = await query
  if (error) {
    logger.error?.({ err: error }, 'sendToHousehold: failed to load members')
    return
  }
  await Promise.all((members ?? []).map((m) => sendToUser(m.user_id, payload, logger)))
}

export function sendToHouseholdMembers(householdId, payload, logger = console) {
  return sendToHousehold(householdId, payload, null, logger)
}

export function sendToHouseholdAdmins(householdId, payload, logger = console) {
  return sendToHousehold(householdId, payload, ['admin'], logger)
}
