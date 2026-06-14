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

let households = [
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

const DEMO_USER_ID = 'usr_demo'
let profile = { id: DEMO_USER_ID, email: 'demo@hestia.app', full_name: 'Demo User' }

// Backend-shaped member rows (user_id, role, profiles.full_name) per household.
let members = {
  hh_home: [
    { user_id: DEMO_USER_ID, role: 'admin', created_at: iso(-90 * 86_400_000), profiles: { full_name: 'Demo User' } },
    { user_id: 'usr_sam', role: 'member', created_at: iso(-40 * 86_400_000), profiles: { full_name: 'Sam Rivera' } },
    { user_id: 'usr_jo', role: 'member', created_at: iso(-12 * 86_400_000), profiles: { full_name: 'Jo Park' } },
  ],
  hh_cabin: [
    { user_id: 'usr_mom', role: 'admin', created_at: iso(-200 * 86_400_000), profiles: { full_name: 'Mom' } },
    { user_id: DEMO_USER_ID, role: 'member', created_at: iso(-30 * 86_400_000), profiles: { full_name: 'Demo User' } },
  ],
}

// Pending access requests awaiting an admin's review (settings + bell).
let joinRequests = [
  { id: 'jr_alex', household_id: 'hh_home', user_id: 'usr_alex', status: 'pending', created_at: iso(-22 * 60_000), profiles: { full_name: 'Alex Kim' } },
  { id: 'jr_riley', household_id: 'hh_home', user_id: 'usr_riley', status: 'pending', created_at: iso(-3 * 3_600_000), profiles: { full_name: 'Riley Chen' } },
]

// The DEMO_USER is an admin of "Home", so they receive a join-request
// notification per pending request, plus one resolved example.
let notifications = [
  { id: 'ntf_alex', user_id: 'usr_demo', type: 'join_request', title: 'New access request', body: 'Alex Kim asked to join Home.', data: { joinRequestId: 'jr_alex', householdId: 'hh_home', householdName: 'Home', requesterId: 'usr_alex', requesterName: 'Alex Kim' }, read_at: null, created_at: iso(-22 * 60_000) },
  { id: 'ntf_riley', user_id: 'usr_demo', type: 'join_request', title: 'New access request', body: 'Riley Chen asked to join Home.', data: { joinRequestId: 'jr_riley', householdId: 'hh_home', householdName: 'Home', requesterId: 'usr_riley', requesterName: 'Riley Chen' }, read_at: null, created_at: iso(-3 * 3_600_000) },
  { id: 'ntf_old', user_id: 'usr_demo', type: 'join_approved', title: 'Request approved', body: 'You can now access Mom’s Cabin.', data: { householdId: 'hh_cabin', householdName: "Mom's Cabin" }, read_at: iso(-2 * 86_400_000), created_at: iso(-2 * 86_400_000) },
]

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
  me: () => wait({ ...profile }),

  getProfile: () => wait({ ...profile }),
  updateProfile: (fullName) => {
    profile = { ...profile, full_name: fullName }
    return wait({ ...profile })
  },

  listHouseholds: () => wait(households),
  createHousehold: (name) => {
    const h = { id: `hh_${Math.random().toString(36).slice(2, 8)}`, name, role: 'admin' }
    households.push(h)
    return wait(h)
  },
  renameHousehold: (householdId, name) => {
    const h = households.find((x) => x.id === householdId)
    if (h) h.name = name
    return wait(h)
  },
  deleteHousehold: (householdId) => {
    households = households.filter((h) => h.id !== householdId)
    delete members[householdId]
    return wait(null)
  },
  leaveHousehold: (householdId) => {
    households = households.filter((h) => h.id !== householdId)
    if (members[householdId]) members[householdId] = members[householdId].filter((m) => m.user_id !== DEMO_USER_ID)
    return wait(null)
  },

  listMembers: (householdId) => wait((members[householdId] ?? []).map((m) => ({ ...m }))),
  updateMemberRole: (householdId, userId, role) => {
    const m = (members[householdId] ?? []).find((x) => x.user_id === userId)
    if (m) m.role = role
    return wait(m ? { user_id: m.user_id, role: m.role } : null)
  },
  removeMember: (householdId, userId) => {
    if (members[householdId]) members[householdId] = members[householdId].filter((m) => m.user_id !== userId)
    return wait(null)
  },

  pushSubscribe: () => wait({ subscription: { id: 'sub_demo' } }),
  pushUnsubscribe: () => wait(null),

  listDevices: (householdId) => wait(devices.filter((d) => d.household_id === householdId)),
  getDevice: (deviceId) => wait(find(deviceId)),
  listTimers: (deviceId) => wait((timers[deviceId] ?? []).filter((t) => t.status === 'active')),
  deviceEvents: (deviceId, limit = 8) => wait((events[deviceId] ?? []).slice(0, limit)),

  pairingStatus: () => wait({ status: 'unpaired' }),
  pairDevice: (deviceId) => wait(find(deviceId)),
  requestJoin: () => wait({ id: 'jr_1', status: 'pending' }),

  listJoinRequests: (householdId) =>
    wait(joinRequests.filter((j) => j.household_id === householdId && j.status === 'pending').map((j) => ({ ...j }))),
  approveJoinRequest: (requestId) => {
    const j = joinRequests.find((x) => x.id === requestId)
    if (j && j.status === 'pending') {
      j.status = 'approved'
      const list = members[j.household_id] ?? (members[j.household_id] = [])
      if (!list.some((m) => m.user_id === j.user_id)) {
        list.push({ user_id: j.user_id, role: 'member', created_at: iso(0), profiles: { full_name: j.profiles?.full_name } })
      }
    }
    notifications = notifications.filter((n) => n.data?.joinRequestId !== requestId)
    return wait({ status: 'approved' })
  },
  denyJoinRequest: (requestId) => {
    const j = joinRequests.find((x) => x.id === requestId)
    if (j && j.status === 'pending') j.status = 'denied'
    notifications = notifications.filter((n) => n.data?.joinRequestId !== requestId)
    return wait({ status: 'denied' })
  },

  listNotifications: () => {
    const mine = notifications
      .filter((n) => n.user_id === DEMO_USER_ID)
      .slice()
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    const unread = mine.filter((n) => !n.read_at).length
    return wait({ notifications: mine.map((n) => ({ ...n })), unread })
  },
  markNotificationRead: (id) => {
    const n = notifications.find((x) => x.id === id)
    if (n && !n.read_at) n.read_at = iso(0)
    return wait({ ok: true })
  },
  markAllNotificationsRead: () => {
    notifications.forEach((n) => {
      if (n.user_id === DEMO_USER_ID && !n.read_at) n.read_at = iso(0)
    })
    return wait({ ok: true })
  },

  turnOn: (deviceId) => {
    const d = find(deviceId)
    if (d) d.stove_status = 'on'
    return wait(null)
  },
  // Models the hardware round-trip: the command is *accepted* immediately, but
  // the stove only *reports* OFF once the Pi actuates the relay (~700ms) and
  // pushes its new state back. Callers re-fetch until they observe it, so the
  // UI never shows OFF on the strength of the command alone.
  turnOff: (deviceId) => {
    const d = find(deviceId)
    if (d) setTimeout(() => { d.stove_status = 'off' }, 700)
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

  // No real Pi in demo mode — surface a graceful message (status 409 mirrors the
  // backend's "not configured" response) instead of a fake video.
  cameraToken: () =>
    Promise.reject(
      Object.assign(new Error('Live camera preview is unavailable in demo mode.'), {
        name: 'ApiError',
        status: 409,
      }),
    ),
}
