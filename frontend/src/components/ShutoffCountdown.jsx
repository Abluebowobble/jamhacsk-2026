import { useEffect, useRef, useState } from 'react'
import { Flame, AlertTriangle, ShieldAlert, Clock, Power } from 'lucide-react'
import { formatCountdown } from '../lib/format'
import { Button } from './ui/Button'
import { cx } from '../lib/cx'

// Live "time until auto-shut-off" for a lit, unattended stove. The depleting
// ring IS the progress bar: its arc length is the fraction of the absence +
// warning budget that's left. Amber while the absence window runs, red once the
// buzzer window opens or the stove is shutting off. Color is always paired with
// an icon and words — never color alone. The per-second number lives in a
// role="timer" (not a live region, so screen readers don't re-read it every
// tick); only the phase heading is a polite live region, so each escalation is
// announced exactly once.
//
// Time source: the backend snapshot doesn't expose live elapsed escalation
// (it runs on the Pi), so `since` anchors the count to when presence was lost
// (deviceState.unattendedAnchor). If real server elapsed ever lands, feed it in
// here and nothing else changes. Falls back to first-observed time so the ring
// still ticks when no anchor is known.

const SIZE = 112
const STROKE = 9
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

export function ShutoffCountdown({ device, since = null, onExpire, onSnooze, onTurnOff }) {
  const total = Math.max(1, (device.absenceTimeout ?? 0) + (device.warningDelay ?? 0))
  const firstSeen = useRef(Date.now())
  const anchor = since ?? firstSeen.current

  // A 1s clock, alive only while this is mounted (i.e. only for an unattended
  // device on screen). prefers-reduced-motion is handled globally in index.css,
  // which neutralizes the ring's sweep transition into a stepped update.
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [])

  const elapsed = Math.max(0, (now - anchor) / 1000)
  const remaining = Math.max(0, total - elapsed)
  const inBuzzer = elapsed >= (device.absenceTimeout ?? 0) // warning window opened
  const terminal = remaining <= 0

  // Fire the shut-off signal once, the instant the countdown hits zero. Guarded
  // by a ref so the per-second ticks (and any re-render) can't re-fire it.
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire
  const firedRef = useRef(false)
  useEffect(() => {
    if (terminal && !firedRef.current) {
      firedRef.current = true
      onExpireRef.current?.()
    }
  }, [terminal])
  const danger = terminal || inBuzzer
  const progress = terminal ? 1 : remaining / total

  const stroke = danger ? 'var(--color-danger)' : 'var(--color-warn)'
  const Icon = terminal ? ShieldAlert : danger ? AlertTriangle : Flame

  // Snooze / Turn off now — the in-app mirror of the notification buttons.
  // Disabled briefly while the command is in flight so a double-tap can't
  // fire twice.
  const [busy, setBusy] = useState(null) // 'snooze' | 'turnoff' | null
  const run = (kind, fn) => async () => {
    if (busy || !fn) return
    setBusy(kind)
    try {
      await fn()
    } finally {
      setBusy(null)
    }
  }
  const showActions = !terminal && (onSnooze || onTurnOff)

  const heading = terminal ? 'Shutting off now' : inBuzzer ? 'Buzzer sounding' : 'No one’s returned'
  const sub = terminal
    ? 'Shut-off signal sent — waiting for the stove to confirm.'
    : inBuzzer
      ? 'The stove shuts off the moment this reaches zero.'
      : 'The stove shuts off on its own when this runs out.'

  return (
    <div
      className={cx(
        'flex flex-col gap-3 rounded-xl border p-3.5 sm:p-4',
        danger ? 'border-danger/40 bg-danger-subtle' : 'border-warn/40 bg-warn-subtle',
      )}
    >
      <div className="flex items-center gap-4 sm:gap-5">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90" aria-hidden="true">
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            style={{ stroke }}
            className="opacity-15"
          />
          <circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            fill="none"
            strokeWidth={STROKE}
            strokeLinecap="round"
            style={{ stroke, strokeDasharray: C, strokeDashoffset: C * (1 - progress) }}
            className="transition-[stroke-dashoffset] duration-1000 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span
            className="font-mono text-2xl font-semibold tabular-nums text-ink"
            role="timer"
            aria-label={`${formatCountdown(remaining)} until automatic shut-off`}
          >
            {formatCountdown(remaining)}
          </span>
          <span className="mt-1 text-[0.625rem] font-medium text-ink-muted">until shut‑off</span>
        </div>
      </div>

      <div className="min-w-0">
        <p
          className={cx('flex items-center gap-1.5 text-sm font-semibold', danger ? 'text-danger-fg' : 'text-warn-fg')}
          aria-live="polite"
        >
          <Icon className={cx('size-4 shrink-0', danger && 'motion-safe:animate-pulse')} aria-hidden="true" />
          {heading}
        </p>
        <p className="mt-1 text-sm text-ink-body">{sub}</p>
      </div>
      </div>

      {showActions && (
        <div className="flex gap-2">
          {onSnooze && (
            <Button
              variant="secondary"
              className="flex-1"
              onClick={run('snooze', onSnooze)}
              disabled={Boolean(busy)}
            >
              <Clock className="size-4" aria-hidden="true" />
              {busy === 'snooze' ? 'Snoozing…' : 'Snooze 2 min'}
            </Button>
          )}
          {onTurnOff && (
            <Button
              variant="danger"
              className="flex-1"
              onClick={run('turnoff', onTurnOff)}
              disabled={Boolean(busy)}
            >
              <Power className="size-4" aria-hidden="true" />
              {busy === 'turnoff' ? 'Turning off…' : 'Turn off now'}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
