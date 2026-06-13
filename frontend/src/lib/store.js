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
  loadingHouseholds: {}, // householdId -> bool
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
  let timers = []
  try {
    timers = await api.listTimers(deviceRow.id)
  } catch {
    /* timers are best-effort; a device still renders without them */
  }
  return adaptDevice(deviceRow, timers)
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

async function loadDeviceEvents(id, limit = 8) {
  try {
    const rows = await api.deviceEvents(id, limit)
    emit({ ...state, events: { ...state.events, [id]: rows.map(adaptEvent) } })
  } catch {
    /* keep any prior events */
  }
}

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

// ---- actions (real, awaited mutations + targeted refetch) -----------------

export const actions = {
  async toggleStove(id) {
    const d = state.devices.find((x) => x.id === id)
    if (!d) return
    if (d.stoveOn) await api.turnOff(id)
    else await api.turnOn(id)
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
}
