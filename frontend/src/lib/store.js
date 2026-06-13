// In-memory reactive store + the safety simulation clock.
//
// A single 1s ticker advances any device with live dynamics (absence timer,
// warning delay, or an active cooking timer), escalating safe → unattended →
// warning → auto-shutoff and logging events as it goes. Built on
// useSyncExternalStore so any component re-renders on change. Swap the action
// bodies for REST/MQTT calls later; the component API stays identical.
import { useSyncExternalStore, useMemo } from 'react'
import { DEVICES, EVENTS, HOUSEHOLDS } from './mockData'
import { isDynamic } from './deviceState'

let state = {
  devices: DEVICES.map((d) => ({ ...d })),
  events: [...EVENTS],
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

let evSeq = 0
const mkEvent = (deviceId, type, meta = {}) => ({
  id: `ev_live_${Date.now()}_${evSeq++}`,
  deviceId,
  type,
  meta,
  at: new Date().toISOString(),
})

/** Apply a transform to one device; optionally append events; re-render. */
function update(id, fn, newEvents = []) {
  const devices = state.devices.map((d) => (d.id === id ? fn(d) : d))
  emit({ devices, events: newEvents.length ? [...newEvents, ...state.events] : state.events })
  ensureTicker()
}

// ---- the simulation clock -------------------------------------------------

let ticker = null
function ensureTicker() {
  const anyDynamic = state.devices.some(isDynamic)
  if (anyDynamic && !ticker) ticker = setInterval(tick, 1000)
  if (!anyDynamic && ticker) {
    clearInterval(ticker)
    ticker = null
  }
}

function tick() {
  const newEvents = []
  const devices = state.devices.map((d) => stepDevice(d, newEvents))
  emit({ devices, events: newEvents.length ? [...newEvents, ...state.events] : state.events })
  ensureTicker()
}

function stepDevice(d, out) {
  if (!d.online) return d
  let next = d

  // Cooking timer countdown. On completion: notify + turn the stove off
  // (PRD §14 recommended safety-first behaviour).
  if (next.timer && next.timer.remainingSecs > 0) {
    const remainingSecs = next.timer.remainingSecs - 1
    if (remainingSecs <= 0) {
      out.push(mkEvent(d.id, 'TIMER_COMPLETED'))
      out.push(mkEvent(d.id, 'STOVE_TURNED_OFF', { by: 'Timer' }))
      next = { ...next, timer: null, stoveOn: false, absenceElapsed: null, warningElapsed: null }
    } else {
      next = { ...next, timer: { ...next.timer, remainingSecs } }
    }
  }

  // Absence → warning → auto-shutoff escalation.
  if (next.stoveOn && !next.presence) {
    if (next.warningElapsed != null) {
      const we = next.warningElapsed + 1
      if (we >= next.warningDelay) {
        out.push(mkEvent(d.id, 'AUTO_SHUTOFF_TRIGGERED'))
        // Stove is off — any running cooking timer is moot, cancel it.
        next = { ...next, stoveOn: false, timer: null, warningElapsed: null, absenceElapsed: null, justShutoffAt: Date.now() }
      } else {
        next = { ...next, warningElapsed: we }
      }
    } else {
      const ae = (next.absenceElapsed ?? 0) + 1
      if (ae >= next.absenceTimeout) {
        out.push(mkEvent(d.id, 'WARNING_BUZZER_STARTED'))
        next = { ...next, absenceElapsed: next.absenceTimeout, warningElapsed: 0 }
      } else {
        next = { ...next, absenceElapsed: ae }
      }
    }
  }

  return next
}

// ---- actions (the would-be API surface) -----------------------------------

export const actions = {
  simulateLeave(id) {
    update(
      id,
      (d) => ({ ...d, presence: false, absenceElapsed: 0, warningElapsed: null, justShutoffAt: null }),
      [mkEvent(id, 'NO_PRESENCE_DETECTED')],
    )
  },
  simulateReturn(id) {
    const d = state.devices.find((x) => x.id === id)
    const evs = [mkEvent(id, 'PRESENCE_DETECTED')]
    if (d?.warningElapsed != null) evs.unshift(mkEvent(id, 'WARNING_CANCELLED'))
    update(id, (dev) => ({ ...dev, presence: true, absenceElapsed: null, warningElapsed: null }), evs)
  },
  toggleStove(id) {
    const d = state.devices.find((x) => x.id === id)
    const turningOn = !d.stoveOn
    update(
      id,
      (dev) => ({
        ...dev,
        stoveOn: turningOn,
        justShutoffAt: null,
        absenceElapsed: null,
        warningElapsed: null,
      }),
      [mkEvent(id, turningOn ? 'STOVE_TURNED_ON' : 'STOVE_TURNED_OFF', { by: 'You' })],
    )
  },
  createTimer(id, durationSecs) {
    update(
      id,
      (d) => ({ ...d, timer: { durationSecs, remainingSecs: durationSecs } }),
      [mkEvent(id, 'TIMER_CREATED', { duration: durationSecs })],
    )
  },
  cancelTimer(id) {
    update(id, (d) => ({ ...d, timer: null }), [mkEvent(id, 'TIMER_CANCELLED')])
  },
  updateSettings(id, { absenceTimeout, warningDelay }) {
    update(
      id,
      (d) => ({ ...d, absenceTimeout, warningDelay }),
      [mkEvent(id, 'SAFETY_SETTINGS_UPDATED', { absenceTimeout, warningDelay })],
    )
  },
  reset(id) {
    update(id, (d) => ({
      ...d,
      online: true,
      stoveOn: true,
      presence: true,
      absenceElapsed: null,
      warningElapsed: null,
      justShutoffAt: null,
    }))
  },
  renameDevice(id, name) {
    update(id, (d) => ({ ...d, name }), [mkEvent(id, 'DEVICE_RENAMED', { name })])
  },
  removeDevice(id) {
    emit({ devices: state.devices.filter((d) => d.id !== id), events: state.events })
    ensureTicker()
  },
}

// ---- hooks ----------------------------------------------------------------

function useStore() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
}

export function useHouseholds() {
  return HOUSEHOLDS
}

export function useDevices(householdId) {
  const s = useStore()
  return useMemo(
    () => s.devices.filter((d) => !householdId || d.householdId === householdId),
    [s.devices, householdId],
  )
}

export function useDevice(id) {
  const s = useStore()
  return useMemo(() => s.devices.find((d) => d.id === id), [s.devices, id])
}

export function useDeviceEvents(id, limit = 8) {
  const s = useStore()
  return useMemo(
    () =>
      s.events
        .filter((e) => e.deviceId === id)
        .sort((a, b) => new Date(b.at) - new Date(a.at))
        .slice(0, limit),
    [s.events, id, limit],
  )
}
