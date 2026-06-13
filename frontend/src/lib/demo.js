// ⚠️ TEMPORARY DEMO MODE — lets the full app shell (header, household switcher,
// overview grid, device detail) render with no backend or login. Flip DEMO to
// false (or delete this file + the two `if (DEMO)` branches in AuthProvider.jsx
// and api.js) to return to the real Supabase/REST path.
//
// Mocks the `api` seam with backend-shaped (snake_case) data so the real store,
// adapters, hooks, and pages all run unchanged. State is mutable in memory, so
// toggling the stove / starting a timer / editing settings persists for the
// session.

export const DEMO = false

const iso = (msFromNow) => new Date(Date.now() + msFromNow).toISOString()

const households = [
  { id: 'hh_home', name: 'Home', role: 'admin' },
  { id: 'hh_cabin', name: "Mom's Cabin", role: 'member' },
]

// Backend-shaped device rows (adaptDevice maps these to the UI shape).
let devices = [
  row('dev_kitchen', 'Kitchen Stove', 'hh_home', { online: true, stove: 'on', presence: 'detected' }),
  row('dev_basement', 'Basement Hot Plate', 'hh_home', { online: true, stove: 'on', presence: 'not_detected' }),
  row('dev_studio', 'Studio Range', 'hh_home', { online: true, stove: 'off', presence: 'not_detected' }),
  row('dev_loft', 'Loft Cooktop', 'hh_home', { online: false, stove: 'on', presence: 'detected' }),
  row('dev_cabin', 'Cabin Stove', 'hh_cabin', { online: true, stove: 'on', presence: 'detected' }),
  row('dev_garage', 'Garage Burner', 'hh_cabin', { online: true, stove: 'off', presence: 'not_detected' }),
]

let timers = {
  dev_cabin: [{ id: 'tmr_1', device_id: 'dev_cabin', status: 'active', duration_seconds: 900, ends_at: iso(12 * 60_000) }],
}

let events = {
  dev_kitchen: [
    ev('ek1', 'dev_kitchen', 'PRESENCE_DETECTED', -2),
    ev('ek2', 'dev_kitchen', 'STOVE_TURNED_ON', -14),
    ev('ek3', 'dev_kitchen', 'SAFETY_SETTINGS_UPDATED', -90),
    ev('ek4', 'dev_kitchen', 'STOVE_TURNED_OFF', -180),
  ],
  dev_basement: [
    ev('eb1', 'dev_basement', 'NO_PRESENCE_DETECTED', -1),
    ev('eb2', 'dev_basement', 'STOVE_TURNED_ON', -6),
  ],
  dev_loft: [
    ev('el1', 'dev_loft', 'DEVICE_OFFLINE', -45),
    ev('el2', 'dev_loft', 'AUTO_SHUTOFF_TRIGGERED', -50),
  ],
  dev_cabin: [
    ev('ec1', 'dev_cabin', 'TIMER_CREATED', -3),
    ev('ec2', 'dev_cabin', 'STOVE_TURNED_ON', -5),
    ev('ec3', 'dev_cabin', 'PRESENCE_DETECTED', -5),
  ],
}

function row(id, name, householdId, { online, stove, presence }) {
  return {
    id,
    device_name: name,
    household_id: householdId,
    online_status: online,
    stove_status: stove,
    presence_status: presence,
    absence_timeout_seconds: 300,
    warning_delay_seconds: 30,
  }
}

function ev(id, deviceId, type, minsAgo) {
  return { id, device_id: deviceId, event_type: type, metadata: {}, created_at: iso(minsAgo * 60_000) }
}

const find = (id) => devices.find((d) => d.id === id)
const wait = (v) => new Promise((r) => setTimeout(() => r(v), 180)) // tiny latency so skeletons show

// Mirrors the *resolved* return shapes of each `api` method (already unwrapped).
export const demoApi = {
  me: () => wait({ id: 'usr_demo', email: 'demo@hestia.app' }),

  listHouseholds: () => wait(households),
  createHousehold: (name) => {
    const h = { id: `hh_${Math.random().toString(36).slice(2, 8)}`, name, role: 'admin' }
    households.push(h)
    return wait(h)
  },

  listDevices: (householdId) => wait(devices.filter((d) => d.household_id === householdId)),
  getDevice: (deviceId) => wait(find(deviceId)),
  listTimers: (deviceId) => wait((timers[deviceId] ?? []).filter((t) => t.status === 'active')),
  deviceEvents: (deviceId, limit = 8) => wait((events[deviceId] ?? []).slice(0, limit)),

  pairingStatus: () => wait({ status: 'unpaired' }),
  pairDevice: (deviceId) => wait(find(deviceId)),
  requestJoin: () => wait({ id: 'jr_1', status: 'pending' }),

  turnOn: (deviceId) => {
    const d = find(deviceId)
    if (d) d.stove_status = 'on'
    return wait(null)
  },
  turnOff: (deviceId) => {
    const d = find(deviceId)
    if (d) d.stove_status = 'off'
    return wait(null)
  },

  createTimer: (deviceId, durationSeconds) => {
    const t = { id: `tmr_${Math.random().toString(36).slice(2, 8)}`, device_id: deviceId, status: 'active', duration_seconds: durationSeconds, ends_at: iso(durationSeconds * 1000) }
    timers[deviceId] = [t]
    return wait(t)
  },
  cancelTimer: (timerId) => {
    for (const id of Object.keys(timers)) timers[id] = timers[id].filter((t) => t.id !== timerId)
    return wait(null)
  },

  updateSafety: (deviceId, { absenceTimeout, warningDelay }) => {
    const d = find(deviceId)
    if (d) {
      d.absence_timeout_seconds = absenceTimeout
      d.warning_delay_seconds = warningDelay
    }
    return wait(d)
  },
  renameDevice: (deviceId, name) => {
    const d = find(deviceId)
    if (d) d.device_name = name
    return wait(d)
  },
  removeDevice: (deviceId) => {
    devices = devices.filter((d) => d.id !== deviceId)
    return wait(null)
  },
}
