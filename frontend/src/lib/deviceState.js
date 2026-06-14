// Device safety phase — the single source of truth for "what state is this
// stove in right now". Drives every status surface. Each phase carries a tone
// (→ DESIGN.md state map), an icon, and plain-language copy.
import {
  Flame,
  Power,
  Users,
  UserX,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  WifiOff,
} from 'lucide-react'

export const PHASE = {
  OFFLINE: 'offline',
  OFF: 'off',
  SAFE: 'safe',
  UNATTENDED: 'unattended',
  WARNING: 'warning',
  SHUTOFF: 'shutoff',
}

/** Derive the current phase from a device's raw fields. */
export function computePhase(d) {
  if (!d.online) return PHASE.OFFLINE
  if (d.justShutoffAt) return PHASE.SHUTOFF
  if (!d.stoveOn) return PHASE.OFF
  if (d.presence) return PHASE.SAFE
  if (d.warningElapsed != null) return PHASE.WARNING
  return PHASE.UNATTENDED
}

// tone keys: success | primary | warn | danger | neutral — resolved to token
// classes by the status components. Resting world is green/neutral; amber and
// red are earned.
export const PHASE_META = {
  offline: { label: 'Offline', tone: 'danger', Icon: WifiOff, detail: 'Device is unreachable' },
  off: { label: 'Stove off', tone: 'neutral', Icon: Power, detail: 'Idle — nothing to watch' },
  safe: { label: 'Attended', tone: 'success', Icon: ShieldCheck, detail: 'Someone is nearby' },
  unattended: { label: 'Unattended', tone: 'warn', Icon: Flame, detail: 'No one detected — counting down' },
  warning: { label: 'Warning', tone: 'warn', Icon: AlertTriangle, detail: 'Buzzer on — shutting off soon' },
  shutoff: { label: 'Auto shut-off', tone: 'danger', Icon: ShieldAlert, detail: 'Turned off — no one returned' },
}

/**
 * The live countdown for the active phase, or null.
 *
 * Returns null unless we actually have live elapsed progress (absenceElapsed /
 * warningElapsed). The backend snapshot doesn't expose that — it lives on the
 * Pi — so without it we show the phase and thresholds rather than a frozen
 * fake countdown. When a realtime feed populates the elapsed fields, the
 * ticking readout lights up automatically.
 */
export function activeCountdown(d, phase = computePhase(d)) {
  if (phase === PHASE.UNATTENDED && d.absenceElapsed != null) {
    return { secs: Math.max(0, d.absenceTimeout - d.absenceElapsed), label: 'until warning' }
  }
  if (phase === PHASE.WARNING && d.warningElapsed != null) {
    return { secs: Math.max(0, d.warningDelay - d.warningElapsed), label: 'until shut-off' }
  }
  return null
}

// The two anchor visuals — stove + presence — as a single source of truth for
// tone, icon, glance-value, and supporting line. Both the device-detail hero
// and the overview tile render from these so the vocabulary never drifts.
// Tone follows the state map: stove-on = orange (status, not alarm); presence
// gone while the burner's lit = amber (the warning lives on presence).

export function stovePanel(d) {
  return {
    tone: !d.online ? 'neutral' : d.stoveOn ? 'primary' : 'neutral',
    icon: d.stoveOn ? Flame : Power,
    value: d.stoveOn ? 'On' : 'Off',
    detail: !d.online ? 'Last known' : d.stoveOn ? 'Burner is on' : 'Burner is off',
  }
}

export function presencePanel(d, phase = computePhase(d)) {
  return {
    tone: !d.online ? 'neutral' : d.presence ? 'success' : d.stoveOn ? 'warn' : 'neutral',
    icon: d.presence ? Users : UserX,
    value: d.presence ? 'Here' : 'Away',
    detail: !d.online ? 'Last known' : d.presence ? 'Someone is nearby' : 'No one detected',
    pulse: phase === PHASE.WARNING,
  }
}

/**
 * When the current unattended window began, in epoch ms — the anchor a live
 * "time until shut-off" countdown ticks from. The snapshot API doesn't expose
 * elapsed escalation, so we read it from the event log: the most recent
 * NO_PRESENCE_DETECTED (presence was lost), falling back to STOVE_TURNED_ON,
 * then null when neither is known.
 */
export function unattendedAnchor(events = []) {
  const latestOf = (type) =>
    events.reduce((acc, e) => {
      if (e.type !== type) return acc
      const t = new Date(e.at).getTime()
      return Number.isFinite(t) && t > acc ? t : acc
    }, -Infinity)

  const lost = latestOf('NO_PRESENCE_DETECTED')
  if (lost > -Infinity) return lost
  const lit = latestOf('STOVE_TURNED_ON')
  if (lit > -Infinity) return lit
  return null
}

/**
 * The active "add time" snooze, or null. When a user extends the warning the
 * device logs WARNING_SNOOZED with the granted seconds; the countdown ring then
 * counts down to that grace deadline instead of the threshold-derived one.
 *
 * Honoured only while it's the most recent safety-cycle event (a later
 * NO_PRESENCE_DETECTED / STOVE_TURNED_ON starts a fresh cycle that supersedes
 * it) and the deadline is still in the future.
 *
 * @returns {{ until: number, total: number } | null} epoch ms + grace seconds
 */
export function snoozeDeadline(events = [], now = Date.now()) {
  const at = (e) => {
    const t = new Date(e.at).getTime()
    return Number.isFinite(t) ? t : -Infinity
  }
  const snooze = events
    .filter((e) => e.type === 'WARNING_SNOOZED')
    .reduce((acc, e) => (at(e) > at(acc) ? e : acc), null)
  if (!snooze) return null

  // A newer absence/ignition event means a fresh cycle — the snooze is stale.
  const supersededBy = events.some(
    (e) =>
      (e.type === 'NO_PRESENCE_DETECTED' || e.type === 'STOVE_TURNED_ON') &&
      at(e) > at(snooze),
  )
  if (supersededBy) return null

  const total = Number(snooze.meta?.seconds)
  if (!Number.isFinite(total) || total <= 0) return null
  const until = at(snooze) + total * 1000
  return until > now ? { until, total } : null
}

/**
 * Whether the unattended warning is currently live, from the event log — the
 * snapshot API doesn't expose the buzzer/warning phase (it lives on the Pi), so
 * the most recent safety-cycle event is the signal. Drives the in-app warning
 * surface (the push fires off the same WARNING_BUZZER_STARTED event).
 *
 * @returns {'active'|'resolved'|'none'}
 *   active   — latest is the buzzer warning or a snooze (still counting down)
 *   resolved — latest is a return / shut-off / cancel (warning is over)
 *   none     — no relevant events yet (or still loading)
 */
export function warningActivity(events = []) {
  const at = (e) => {
    const t = new Date(e.at).getTime()
    return Number.isFinite(t) ? t : -Infinity
  }
  const ACTIVE = new Set(['WARNING_BUZZER_STARTED', 'WARNING_SNOOZED'])
  const RESOLVED = new Set([
    'PRESENCE_DETECTED',
    'STOVE_TURNED_OFF',
    'AUTO_SHUTOFF_TRIGGERED',
    'WARNING_CANCELLED',
  ])
  const latest = events
    .filter((e) => ACTIVE.has(e.type) || RESOLVED.has(e.type))
    .reduce((acc, e) => (at(e) > at(acc) ? e : acc), null)
  if (!latest) return 'none'
  return ACTIVE.has(latest.type) ? 'active' : 'resolved'
}

/** Is anything time-evolving on this device right now? */
export function isDynamic(d) {
  if (!d.online) return false
  if (d.timer && d.timer.remainingSecs > 0) return true
  return d.stoveOn && !d.presence
}
