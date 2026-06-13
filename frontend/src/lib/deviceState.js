// Device safety phase — the single source of truth for "what state is this
// stove in right now". Drives every status surface. Each phase carries a tone
// (→ DESIGN.md state map), an icon, and plain-language copy.
import {
  Flame,
  Power,
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

/** The live countdown for the active phase, or null. */
export function activeCountdown(d, phase = computePhase(d)) {
  if (phase === PHASE.UNATTENDED) {
    return { secs: Math.max(0, d.absenceTimeout - (d.absenceElapsed ?? 0)), label: 'until warning' }
  }
  if (phase === PHASE.WARNING) {
    return { secs: Math.max(0, d.warningDelay - (d.warningElapsed ?? 0)), label: 'until shut-off' }
  }
  return null
}

/** Is anything time-evolving on this device right now? */
export function isDynamic(d) {
  if (!d.online) return false
  if (d.timer && d.timer.remainingSecs > 0) return true
  return d.stoveOn && !d.presence
}
