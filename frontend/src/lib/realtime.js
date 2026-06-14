// Live updates via Supabase Realtime.
//
// One channel per (user, active household) carries every change another user can
// make that affects this client: being added/removed/re-roled in a household,
// the household being renamed/deleted, and device / timer / access-request
// changes within the household they're viewing. RLS scopes delivery, so a client
// only ever receives rows it may already read (see 005_realtime.sql).
//
// The matching reactions live in the RealtimeBridge — this module only knows how
// to open the socket and route raw changes to named callbacks.
import { supabase } from './supabase'

/**
 * Subscribe to the changes that affect `userId` while they view `householdId`.
 *
 * @param {object}   p
 * @param {string}   p.userId        the signed-in user
 * @param {?string}  p.householdId   the household currently in view (may be null)
 * @param {?string}  p.accessToken   the Supabase JWT; absent in DEMO → no-op
 * @param {object}   p.handlers      onMyMembership / onRoster / onHousehold /
 *                                   onDevices / onTimer(deviceId) / onJoinRequests
 * @returns {() => void} unsubscribe
 */
export function subscribeRealtime({ userId, householdId, accessToken, handlers }) {
  // No real session (e.g. DEMO mode) → nothing to authenticate, so skip quietly.
  if (!userId || !accessToken) return () => {}

  // Authenticate the realtime socket as this user so RLS-scoped postgres_changes
  // are delivered. Refreshed automatically: a new token re-runs this whole setup.
  supabase.realtime.setAuth(accessToken)

  const channel = supabase.channel(`hestia:${userId}:${householdId ?? 'none'}`)

  // Being added to / removed from / re-roled in ANY household changes the
  // membership list itself. This is the path that fires for the *removed* user.
  channel.on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'household_members', filter: `user_id=eq.${userId}` },
    () => handlers.onMyMembership?.(),
  )

  if (householdId) {
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'household_members', filter: `household_id=eq.${householdId}` },
      () => handlers.onRoster?.(),
    )
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'households', filter: `id=eq.${householdId}` },
      () => handlers.onHousehold?.(),
    )
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'devices', filter: `household_id=eq.${householdId}` },
      () => handlers.onDevices?.(),
    )
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'timers', filter: `household_id=eq.${householdId}` },
      // INSERT/UPDATE expose `new`; DELETE exposes `old` (REPLICA IDENTITY FULL).
      (payload) => handlers.onTimer?.((payload.new ?? payload.old)?.device_id),
    )
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'join_requests', filter: `household_id=eq.${householdId}` },
      () => handlers.onJoinRequests?.(),
    )
  }

  channel.subscribe((status, err) => {
    // Surface a misconfigured subscription instead of failing silently — a
    // CHANNEL_ERROR here almost always means the table isn't in the
    // supabase_realtime publication or RLS is rejecting the join.
    if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
      console.warn(`[realtime] channel ${status}`, err ?? '')
    }
  })

  return () => {
    supabase.removeChannel(channel)
  }
}
