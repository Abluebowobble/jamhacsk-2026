// Personal safety defaults the user picks during onboarding, persisted per
// account in localStorage. They're applied to a device when it's paired, so a
// new Hestia starts with the timings the owner already chose instead of the
// generic factory values. Mirrors the device fields absence_timeout_seconds /
// warning_delay_seconds (PRD §15): both > 0, warning shorter than absence.
export const DEFAULT_ABSENCE_TIMEOUT = 300 // 5 min with no one detected → buzzer
export const DEFAULT_WARNING_DELAY = 30 // buzzer time before auto shut-off

const KEY = 'hestia.safetyDefaults'
const keyFor = (userId) => (userId ? `${KEY}.${userId}` : KEY)

/** The user's saved safety defaults, or null if they haven't set any yet. */
export function readSafetyDefaults(userId) {
  try {
    const raw = localStorage.getItem(keyFor(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const absenceTimeout = Number(parsed.absenceTimeout)
    const warningDelay = Number(parsed.warningDelay)
    if (!Number.isFinite(absenceTimeout) || !Number.isFinite(warningDelay)) return null
    return { absenceTimeout, warningDelay }
  } catch {
    return null
  }
}

export function writeSafetyDefaults(userId, { absenceTimeout, warningDelay }) {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ absenceTimeout, warningDelay }))
  } catch {
    /* private mode / disabled storage — fall back to in-memory only */
  }
}

/** Whether the user has already chosen their defaults (gates the onboarding step). */
export const hasSafetyDefaults = (userId) => readSafetyDefaults(userId) !== null
