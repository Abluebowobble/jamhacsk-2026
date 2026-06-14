// Dashboard data layer, backed by the Hestia backend (PRD §19).
//
// Keeps the same public surface the UI was built against — useHouseholds,
// useDevices, useDevice, useDeviceEvents, and an `actions` object — but every
// read hits the REST API and every action is a real, awaited mutation followed
// by a targeted refetch. A tiny reactive cache (useSyncExternalStore) lets any
// component re-render when devices/events change.
//
// Shape note: the backend stores a *snapshot* (online / stove on-off / presence
// + thresholds), not the live absence→warning→shutoff progress that runs on the
// Pi. So adapted devices carry absenceElapsed/warningElapsed/justShutoffAt as
// null; deviceState.activeCountdown suppresses the ticking readout when that
// live data is absent rather than showing a frozen timer.
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { api } from './api'
import { useSession } from './sessionContext'

// ---- reactive cache -------------------------------------------------------

let state = {
  devices: [], // adapted devices across loaded households
  events: {}, // deviceId -> adapted events
  members: {}, // householdId -> adapted members
  joinRequests: {}, // householdId -> adapted pending access requests
  notifications: [], // signed-in user's notification feed (newest first)
  notificationsUnread: 0, // unread count for the bell badge
  loadingHouseholds: {}, // householdId -> bool
  loadingMembers: {}, // householdId -> bool
  loadingJoinRequests: {}, // householdId -> bool
  attempted: {}, // deviceId -> bool (a single-device fetch has settled at least once)
}
const listeners = new Set()
const emit = (next) => {
  state = next
  listeners.forEach((l) => l())
}
const subscribe = (cb) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
const getSnapshot = () => state
const useStore = () => useSyncExternalStore(subscribe, getSnapshot, getSnapshot)

// ---- adapters (backend snake_case → the UI's camelCase shape) -------------

function adaptDevice(d, timers = []) {
  const active = timers.find((t) => t.status === 'active') ?? timers[0] ?? null
  return {
    id: d.id,
    name: d.device_name,
    householdId: d.household_id,
    online: Boolean(d.online_status),
    stoveOn: d.stove_status === 'on',
    presence: d.presence_status === 'detected',
    absenceTimeout: d.absence_timeout_seconds,
    warningDelay: d.warning_delay_seconds,
    // Live escalation isn't exposed by the snapshot API (it lives on the Pi).
    absenceElapsed: null,
    warningElapsed: null,
    justShutoffAt: null,
    timer: active
      ? { id: active.id, durationSecs: active.duration_seconds, endsAt: new Date(active.ends_at).getTime() }
      : null,
  }
}

function adaptEvent(e) {
  return { id: e.id, deviceId: e.device_id, type: e.event_type, meta: e.metadata ?? {}, at: e.created_at }
}

function adaptMember(m) {
  return { userId: m.user_id, role: m.role, name: m.profiles?.full_name ?? null, joinedAt: m.created_at }
}

function adaptJoinRequest(r) {
  return {
    id: r.id,
    householdId: r.household_id,
    userId: r.user_id,
    name: r.profiles?.full_name ?? null,
    status: r.status,
    at: r.created_at,
  }
}

function adaptNotification(n) {
  return {
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    data: n.data ?? {},
    read: Boolean(n.read_at),
    at: n.created_at,
  }
}

/** Recompute the live `remainingSecs` of a timer from its end time. */
function withLiveTimer(d, now) {
  if (!d.timer) return d
  const remainingSecs = Math.max(0, Math.round((d.timer.endsAt - now) / 1000))
  return { ...d, timer: { ...d.timer, remainingSecs } }
}

// ---- fetching -------------------------------------------------------------

function upsertDevices(next) {
  const ids = new Set(next.map((d) => d.id))
  const kept = state.devices.filter((d) => !ids.has(d.id))
  emit({ ...state, devices: [...kept, ...next] })
}

async function fetchDeviceWithTimers(deviceRow) {
  try {
    const timers = await api.listTimers(deviceRow.id)
    return adaptDevice(deviceRow, timers)
  } catch {
    // The timers fetch failed (a transient network/realtime blip). Do NOT drop a
    // timer we're already showing — wiping it to null on every failed refresh is
    // what made an active countdown "randomly disappear" mid-run. Carry the
    // existing timer over; only a *successful* fetch returning no active timer is
    // allowed to clear it.
    const adapted = adaptDevice(deviceRow, [])
    const prev = state.devices.find((d) => d.id === deviceRow.id)
    if (prev?.timer) adapted.timer = prev.timer
    return adapted
  }
}

async function loadHouseholdDevices(householdId) {
  if (!householdId) return
  emit({ ...state, loadingHouseholds: { ...state.loadingHouseholds, [householdId]: true } })
  try {
    const rows = await api.listDevices(householdId)
    const adapted = await Promise.all(rows.map(fetchDeviceWithTimers))
    // Replace this household's devices wholesale (drops any removed remotely).
    const others = state.devices.filter((d) => d.householdId !== householdId)
    emit({
      ...state,
      devices: [...others, ...adapted],
      loadingHouseholds: { ...state.loadingHouseholds, [householdId]: false },
    })
  } catch {
    emit({ ...state, loadingHouseholds: { ...state.loadingHouseholds, [householdId]: false } })
  }
}

async function refreshDevice(id) {
  try {
    const row = await api.getDevice(id)
    const adapted = await fetchDeviceWithTimers(row)
    upsertDevices([adapted])
  } catch {
    /* leave stale copy on transient failure */
  } finally {
    // Mark that we've at least tried — lets useDeviceLoading distinguish
    // "still loading" from "genuinely not found / no access".
    if (!state.attempted[id]) emit({ ...state, attempted: { ...state.attempted, [id]: true } })
  }
}

/**
 * Re-fetch a device's reported state until the hardware confirms `predicate`
 * (or we run out of tries). Stove control is fire-the-signal / wait-for-report:
 * the backend relays the command to the Pi, the Pi actuates and pushes its new
 * state back, and only that *reported* state is allowed to move the UI — never
 * an optimistic guess. If it never confirms (relay stuck, device offline), the
 * poll simply times out and the device keeps showing its last real state, which
 * for a safety instrument is the correct, honest outcome.
 */
async function awaitDeviceState(id, predicate, { tries = 24, intervalMs = 250 } = {}) {
  for (let i = 0; i < tries; i++) {
    await refreshDevice(id)
    const d = state.devices.find((x) => x.id === id)
    if (d && predicate(d)) return d
    await new Promise((r) => setTimeout(r, intervalMs))
  }
  return state.devices.find((x) => x.id === id)
}

async function loadMembers(householdId) {
  if (!householdId) return
  emit({ ...state, loadingMembers: { ...state.loadingMembers, [householdId]: true } })
  try {
    const rows = await api.listMembers(householdId)
    emit({
      ...state,
      members: { ...state.members, [householdId]: rows.map(adaptMember) },
      loadingMembers: { ...state.loadingMembers, [householdId]: false },
    })
  } catch {
    emit({ ...state, loadingMembers: { ...state.loadingMembers, [householdId]: false } })
  }
}

async function loadJoinRequests(householdId) {
  if (!householdId) return
  emit({ ...state, loadingJoinRequests: { ...state.loadingJoinRequests, [householdId]: true } })
  try {
    const rows = await api.listJoinRequests(householdId)
    emit({
      ...state,
      joinRequests: { ...state.joinRequests, [householdId]: rows.map(adaptJoinRequest) },
      loadingJoinRequests: { ...state.loadingJoinRequests, [householdId]: false },
    })
  } catch {
    // Non-admins get 403 — treat as "nothing to review" rather than an error.
    emit({
      ...state,
      joinRequests: { ...state.joinRequests, [householdId]: state.joinRequests[householdId] ?? [] },
      loadingJoinRequests: { ...state.loadingJoinRequests, [householdId]: false },
    })
  }
}

async function loadNotifications(limit = 30) {
  try {
    const res = await api.listNotifications(limit)
    emit({
      ...state,
      notifications: (res?.notifications ?? []).map(adaptNotification),
      notificationsUnread: res?.unread ?? 0,
    })
  } catch {
    /* keep any prior feed on transient failure */
  }
}

async function loadDeviceEvents(id, limit = 8) {
  try {
    const rows = await api.deviceEvents(id, limit)
    emit({ ...state, events: { ...state.events, [id]: rows.map(adaptEvent) } })
  } catch {
    /* keep any prior events */
  }
}

// How often to re-poll live device state as a realtime fallback. Realtime
// pushes changes instantly when healthy, but it can silently stop delivering
// (dropped socket, channel error, StrictMode double-subscribe in dev, or an
// unapplied realtime publication) — and presence not reflecting is exactly the
// failure that strands a safety dashboard. Polling guarantees freshness within
// a few seconds regardless. Kept modest and paused while the tab is hidden.
const DEVICE_POLL_MS = 5000

// ---- a shared 1s clock (only ticks while something needs it) --------------

function useNow(active) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return undefined
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [active])
  return now
}

// ---- hooks (stable public API) --------------------------------------------

/** Households the signed-in user belongs to (from the account session). */
export function useHouseholds() {
  return useSession().households
}

export function useDevices(householdId) {
  const s = useStore()

  useEffect(() => {
    loadHouseholdDevices(householdId)
  }, [householdId])

  // Realtime fallback: re-poll the household's devices so live state (presence
  // above all) still surfaces if realtime isn't delivering. See DEVICE_POLL_MS.
  useEffect(() => {
    if (!householdId) return undefined
    const t = setInterval(() => {
      if (!document.hidden) loadHouseholdDevices(householdId)
    }, DEVICE_POLL_MS)
    return () => clearInterval(t)
  }, [householdId])

  const devices = useMemo(
    () => s.devices.filter((d) => d.householdId === householdId),
    [s.devices, householdId],
  )
  const hasTimer = devices.some((d) => d.timer)
  const now = useNow(hasTimer)

  return useMemo(() => devices.map((d) => withLiveTimer(d, now)), [devices, now])
}

export function useDevicesLoading(householdId) {
  const s = useStore()
  // Undefined (never fetched) reads as loading so the first paint shows skeletons.
  return s.loadingHouseholds[householdId] !== false
}

export function useDevice(id) {
  const s = useStore()
  const cached = s.devices.find((d) => d.id === id)

  useEffect(() => {
    if (id) refreshDevice(id)
  }, [id])

  // Realtime fallback for the detail page: poll this one device so its presence
  // (and stove/online) reflect promptly even when realtime is silent. See
  // DEVICE_POLL_MS.
  useEffect(() => {
    if (!id) return undefined
    const t = setInterval(() => {
      if (!document.hidden) refreshDevice(id)
    }, DEVICE_POLL_MS)
    return () => clearInterval(t)
  }, [id])

  const now = useNow(Boolean(cached?.timer))
  return useMemo(() => (cached ? withLiveTimer(cached, now) : undefined), [cached, now])
}

/**
 * Whether a single device is still being resolved (for the detail page).
 * Derived from the cache + whether a fetch has settled, so there's no effect:
 * useDevice() (called alongside this) triggers the actual refresh.
 */
export function useDeviceLoading(id) {
  const s = useStore()
  const inCache = s.devices.some((d) => d.id === id)
  return !inCache && !s.attempted[id]
}

export function useDeviceEvents(id, limit = 8) {
  const s = useStore()
  useEffect(() => {
    if (id) loadDeviceEvents(id, limit)
  }, [id, limit])
  return useMemo(() => (s.events[id] ?? []).slice(0, limit), [s.events, id, limit])
}

/** Members of a household (settings → household). Loads on first use. */
export function useMembers(householdId) {
  const s = useStore()
  useEffect(() => {
    if (householdId) loadMembers(householdId)
  }, [householdId])
  const members = useMemo(() => s.members[householdId] ?? [], [s.members, householdId])
  // Undefined (never fetched) reads as loading so the first paint shows skeletons.
  const loading = s.loadingMembers[householdId] !== false
  return { members, loading }
}

/** Pending access requests for one household (admin review). Loads on first use. */
export function useJoinRequests(householdId) {
  const s = useStore()
  useEffect(() => {
    if (householdId) loadJoinRequests(householdId)
  }, [householdId])
  const requests = useMemo(() => s.joinRequests[householdId] ?? [], [s.joinRequests, householdId])
  const loading = s.loadingJoinRequests[householdId] !== false
  return { requests, loading }
}

/**
 * The signed-in user's notification feed for the bell. Loads on mount and polls
 * so new notifications (e.g. someone requesting access) surface without a manual
 * refresh. Returns the feed, the unread count, and a manual `reload`.
 */
export function useNotifications() {
  const s = useStore()
  useEffect(() => {
    loadNotifications()
    const t = setInterval(loadNotifications, 45_000)
    return () => clearInterval(t)
  }, [])
  return { notifications: s.notifications, unread: s.notificationsUnread, reload: loadNotifications }
}

// ---- realtime sync (called by RealtimeBridge on remote changes) ------------
//
// Thin re-exports of the internal loaders so the realtime layer can refresh
// exactly the slice a remote change touched, without routing through a React
// hook. These update the same reactive cache the hooks read, so any mounted
// view re-renders automatically.
export const sync = {
  reloadMembers: loadMembers,
  reloadHouseholdDevices: loadHouseholdDevices,
  refreshDevice,
  reloadJoinRequests: loadJoinRequests,
  reloadNotifications: loadNotifications,
}

// ---- actions (real, awaited mutations + targeted refetch) -----------------

export const actions = {
  async toggleStove(id) {
    const d = state.devices.find((x) => x.id === id)
    if (!d) return
    const target = !d.stoveOn // desired stove state after the command
    if (target) await api.turnOn(id)
    else await api.turnOff(id)
    // Reflect the hardware's *reported* state, not the command we sent.
    await awaitDeviceState(id, (x) => x.stoveOn === target)
    await loadDeviceEvents(id)
  },
  // Auto shut-off when an unattended countdown expires. Idempotent: only a lit
  // stove is acted on, so a double-fire or a stale call is a no-op. NOTE: the
  // authoritative safety shutoff runs locally on the Pi (PRD); this app-side
  // signal is a secondary actuation, not the guarantee.
  async autoShutoff(id) {
    const d = state.devices.find((x) => x.id === id)
    if (!d || !d.stoveOn) return
    await api.turnOff(id) // signal the hardware to shut off
    await awaitDeviceState(id, (x) => !x.stoveOn) // show OFF only once it reports back
    await loadDeviceEvents(id)
  },
  // "Add time" at the warning moment: relay a snooze to the device, then refresh
  // so the new WARNING_SNOOZED event re-anchors the countdown ring.
  async extendWarning(id, seconds) {
    await api.extendWarning(id, seconds)
    await Promise.all([refreshDevice(id), loadDeviceEvents(id)])
  },
  async createTimer(id, durationSecs) {
    await api.createTimer(id, durationSecs)
    await Promise.all([refreshDevice(id), loadDeviceEvents(id)])
  },
  async cancelTimer(id) {
    const d = state.devices.find((x) => x.id === id)
    if (d?.timer?.id) await api.cancelTimer(d.timer.id)
    await Promise.all([refreshDevice(id), loadDeviceEvents(id)])
  },
  async updateSettings(id, { absenceTimeout, warningDelay }) {
    await api.updateSafety(id, { absenceTimeout, warningDelay })
    await Promise.all([refreshDevice(id), loadDeviceEvents(id)])
  },
  async renameDevice(id, name) {
    await api.renameDevice(id, name)
    await refreshDevice(id)
  },
  async removeDevice(id) {
    await api.removeDevice(id)
    emit({ ...state, devices: state.devices.filter((d) => d.id !== id) })
  },
  async updateMemberRole(householdId, userId, role) {
    await api.updateMemberRole(householdId, userId, role)
    await loadMembers(householdId)
  },
  async removeMember(householdId, userId) {
    await api.removeMember(householdId, userId)
    await loadMembers(householdId)
  },
  // Approve or deny a pending access request. On approval the requester becomes
  // a member; the reviewed request drops off the settings list and the bell
  // (its notification is cleared server-side), so refresh both.
  async reviewJoinRequest(householdId, requestId, decision) {
    if (decision === 'approved') await api.approveJoinRequest(requestId)
    else await api.denyJoinRequest(requestId)
    await Promise.all([loadJoinRequests(householdId), loadNotifications()])
    if (decision === 'approved') await loadMembers(householdId)
  },
  // Clear the unread badge when the user opens the bell. Optimistic: flip the
  // local feed to read immediately, then persist.
  async markNotificationsRead() {
    if (state.notificationsUnread === 0) return
    emit({
      ...state,
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      notificationsUnread: 0,
    })
    try {
      await api.markAllNotificationsRead()
    } catch {
      await loadNotifications() // re-sync if the write failed
    }
  },
}
