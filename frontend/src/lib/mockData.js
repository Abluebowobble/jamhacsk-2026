// Seed data for the dashboard. Shaped to mirror the PRD schema + REST API so
// swapping the store's source for real endpoints later is mechanical.

const minsAgo = (m) => new Date(Date.now() - m * 60_000).toISOString()

export const HOUSEHOLDS = [
  { id: 'hh_home', name: 'Home', role: 'admin' },
  { id: 'hh_cabin', name: "Mom's Cabin", role: 'member' },
]

// Demo timeouts are intentionally short (seconds, not the 300s default) so the
// safe → warning → shutoff sequence is watchable live. The settings panel
// edits these; production seeds 300s / 30s.
export const DEVICES = [
  {
    id: 'dev_kitchen',
    name: 'Kitchen Stove',
    householdId: 'hh_home',
    online: true,
    stoveOn: true,
    presence: true,
    absenceTimeout: 15,
    warningDelay: 8,
    absenceElapsed: null,
    warningElapsed: null,
    timer: null,
    justShutoffAt: null,
  },
  {
    id: 'dev_guest',
    name: 'Guest Range',
    householdId: 'hh_home',
    online: true,
    stoveOn: false,
    presence: false,
    absenceTimeout: 300,
    warningDelay: 30,
    absenceElapsed: null,
    warningElapsed: null,
    timer: null,
    justShutoffAt: null,
  },
  {
    id: 'dev_studio',
    name: 'Studio Cooktop',
    householdId: 'hh_home',
    online: false,
    stoveOn: false,
    presence: false,
    absenceTimeout: 300,
    warningDelay: 30,
    absenceElapsed: null,
    warningElapsed: null,
    timer: null,
    justShutoffAt: null,
  },
  {
    id: 'dev_cabin',
    name: 'Cabin Stove',
    householdId: 'hh_cabin',
    online: true,
    stoveOn: true,
    presence: true,
    absenceTimeout: 20,
    warningDelay: 10,
    absenceElapsed: null,
    warningElapsed: null,
    timer: { durationSecs: 720, remainingSecs: 642 },
    justShutoffAt: null,
  },
]

export const EVENTS = [
  { id: 'ev_1', deviceId: 'dev_kitchen', type: 'PRESENCE_DETECTED', at: minsAgo(2), meta: {} },
  { id: 'ev_2', deviceId: 'dev_kitchen', type: 'STOVE_TURNED_ON', at: minsAgo(14), meta: { by: 'You' } },
  { id: 'ev_3', deviceId: 'dev_kitchen', type: 'SAFETY_SETTINGS_UPDATED', at: minsAgo(90), meta: { absenceTimeout: 15, warningDelay: 8 } },
  { id: 'ev_4', deviceId: 'dev_cabin', type: 'TIMER_CREATED', at: minsAgo(6), meta: { duration: 720 } },
  { id: 'ev_5', deviceId: 'dev_cabin', type: 'STOVE_TURNED_ON', at: minsAgo(8), meta: { by: 'Mom' } },
  { id: 'ev_6', deviceId: 'dev_guest', type: 'AUTO_SHUTOFF_TRIGGERED', at: minsAgo(220), meta: {} },
  { id: 'ev_7', deviceId: 'dev_studio', type: 'DEVICE_OFFLINE', at: minsAgo(310), meta: {} },
]

// Human-readable labels for event types (PRD §17).
export const EVENT_LABELS = {
  USER_SIGNED_UP: 'Signed up',
  HOUSEHOLD_CREATED: 'Household created',
  MEMBER_ADDED: 'Member added',
  MEMBER_REMOVED: 'Member removed',
  JOIN_REQUEST_CREATED: 'Join request sent',
  JOIN_REQUEST_APPROVED: 'Join request approved',
  JOIN_REQUEST_DENIED: 'Join request denied',
  DEVICE_PAIRED: 'Device paired',
  DEVICE_REMOVED: 'Device removed',
  DEVICE_RENAMED: 'Device renamed',
  DEVICE_OFFLINE: 'Went offline',
  DEVICE_ONLINE: 'Came online',
  STOVE_TURNED_ON: 'Stove turned on',
  STOVE_TURNED_OFF: 'Stove turned off',
  PRESENCE_DETECTED: 'Presence detected',
  NO_PRESENCE_DETECTED: 'No presence detected',
  WARNING_BUZZER_STARTED: 'Warning buzzer started',
  WARNING_CANCELLED: 'Warning cancelled — presence returned',
  AUTO_SHUTOFF_TRIGGERED: 'Auto shut-off — no one nearby',
  TIMER_CREATED: 'Timer started',
  TIMER_CANCELLED: 'Timer cancelled',
  TIMER_COMPLETED: 'Timer finished',
  SAFETY_SETTINGS_UPDATED: 'Safety settings updated',
  CAMERA_STREAM_VIEWED: 'Camera viewed',
}
