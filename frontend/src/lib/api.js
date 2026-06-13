// Thin REST client for the Hestia backend (Fastify + Supabase).
//
// Every protected route expects the Supabase access token as a Bearer header
// (backend/src/plugins/auth.js verifies it). We read the live token from the
// Supabase client on each call so a refreshed session is always honoured.
import { supabase } from './supabase'
import { DEMO, demoApi } from './demo'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3000'

/** Error carrying the HTTP status so callers can branch (404 vs 409 vs 401). */
export class ApiError extends Error {
  constructor(message, status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function authHeader() {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { ...(auth ? await authHeader() : {}) }
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let res
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError('Can’t reach the server. Check your connection and try again.', 0)
  }

  if (res.status === 204) return null

  let payload = null
  try {
    payload = await res.json()
  } catch {
    /* empty / non-JSON body */
  }

  if (!res.ok) {
    const message = payload?.error || `Request failed (${res.status})`
    throw new ApiError(message, res.status)
  }
  return payload
}

// ---- endpoint helpers (mirror PRD §19) ------------------------------------

const realApi = {
  me: () => request('/api/me'),

  // Profile (settings → account)
  getProfile: () => request('/api/me').then((r) => r.user),
  updateProfile: (fullName) =>
    request('/api/me', { method: 'PATCH', body: { full_name: fullName } }).then((r) => r.user),

  // Households
  listHouseholds: () => request('/api/households').then((r) => r.households ?? []),
  createHousehold: (name) =>
    request('/api/households', { method: 'POST', body: { name } }).then((r) => r.household),
  renameHousehold: (householdId, name) =>
    request(`/api/households/${householdId}`, { method: 'PATCH', body: { name } }).then(
      (r) => r.household,
    ),
  deleteHousehold: (householdId) =>
    request(`/api/households/${householdId}`, { method: 'DELETE' }),
  leaveHousehold: (householdId) =>
    request(`/api/households/${householdId}/leave`, { method: 'POST' }),

  // Members (settings → household)
  listMembers: (householdId) =>
    request(`/api/households/${householdId}/members`).then((r) => r.members ?? []),
  updateMemberRole: (householdId, userId, role) =>
    request(`/api/households/${householdId}/members/${userId}`, {
      method: 'PATCH',
      body: { role },
    }).then((r) => r.member),
  removeMember: (householdId, userId) =>
    request(`/api/households/${householdId}/members/${userId}`, { method: 'DELETE' }),

  // Web Push (settings → notifications)
  pushSubscribe: ({ endpoint, p256dh, auth }) =>
    request('/api/push/subscribe', { method: 'POST', body: { endpoint, p256dh, auth } }),
  pushUnsubscribe: (endpoint) =>
    request('/api/push/unsubscribe', { method: 'DELETE', body: { endpoint } }),

  // Devices
  listDevices: (householdId) =>
    request(`/api/households/${householdId}/devices`).then((r) => r.devices ?? []),
  pairingStatus: (deviceId) => request(`/api/devices/${deviceId}/pairing-status`),
  pairDevice: (deviceId, householdId) =>
    request(`/api/devices/${deviceId}/pair`, { method: 'POST', body: { householdId } }).then(
      (r) => r.device,
    ),

  // Join requests (Case B — request access to an already-paired device's household)
  requestJoin: (householdId) =>
    request(`/api/households/${householdId}/join-requests`, { method: 'POST' }).then(
      (r) => r.joinRequest,
    ),

  // Single device + its live data
  getDevice: (deviceId) => request(`/api/devices/${deviceId}`).then((r) => r.device),
  listTimers: (deviceId) =>
    request(`/api/devices/${deviceId}/timers`).then((r) => r.timers ?? []),
  deviceEvents: (deviceId, limit = 8) =>
    request(`/api/devices/${deviceId}/events?limit=${limit}`).then((r) => r.events ?? []),

  // Stove control
  turnOn: (deviceId) => request(`/api/devices/${deviceId}/turn-on`, { method: 'POST' }),
  turnOff: (deviceId) => request(`/api/devices/${deviceId}/turn-off`, { method: 'POST' }),

  // Timers
  createTimer: (deviceId, durationSeconds) =>
    request(`/api/devices/${deviceId}/timers`, {
      method: 'POST',
      body: { duration_seconds: durationSeconds },
    }).then((r) => r.timer),
  cancelTimer: (timerId) => request(`/api/timers/${timerId}`, { method: 'DELETE' }),

  // Safety settings
  updateSafety: (deviceId, { absenceTimeout, warningDelay }) =>
    request(`/api/devices/${deviceId}/safety-settings`, {
      method: 'PATCH',
      body: { absence_timeout_seconds: absenceTimeout, warning_delay_seconds: warningDelay },
    }).then((r) => r.device),

  // Device admin
  renameDevice: (deviceId, name) =>
    request(`/api/devices/${deviceId}`, { method: 'PATCH', body: { device_name: name } }).then(
      (r) => r.device,
    ),
  removeDevice: (deviceId) => request(`/api/devices/${deviceId}`, { method: 'DELETE' }),
}

// DEMO: serve canned data with no backend. Flip DEMO in ./demo.js to restore.
export const api = DEMO ? demoApi : realApi
