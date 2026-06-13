import { StatusPanel } from './StatusPanel'
import { CountdownReadout } from './CountdownReadout'
import {
  computePhase,
  activeCountdown,
  stovePanel,
  presencePanel,
  PHASE_META,
} from '../lib/deviceState'
import { cx } from '../lib/cx'

// The device hero. Two big solid panels answer the half-second question —
// "is the stove on?" and "is anyone there?" — and a phase line above them
// states the synthesized consequence (Attended / counting down / auto
// shut-off) with the live countdown when one is running. Calm phases keep
// that line quiet; warn/danger escalate it into a tinted alert strip.

const HEAD = {
  success: 'text-success-fg',
  primary: 'text-primary',
  warn: 'text-warn-fg',
  danger: 'text-danger-fg',
  neutral: 'text-ink',
}

const ALERT_STRIP = {
  warn: 'rounded-lg border border-warn/40 bg-warn-subtle px-4 py-3',
  danger: 'rounded-lg border border-danger/30 bg-danger-subtle px-4 py-3',
}

export function DeviceSummaryCard({ device }) {
  const phase = computePhase(device)
  const meta = PHASE_META[phase]
  const countdown = activeCountdown(device, phase)
  const PhaseIcon = meta.Icon
  const isAlert = meta.tone === 'warn' || meta.tone === 'danger'

  const stove = stovePanel(device)
  const presence = presencePanel(device, phase)

  return (
    <section className="flex flex-col gap-4">
      <div className={cx('flex items-center gap-3', isAlert && ALERT_STRIP[meta.tone])}>
        <PhaseIcon className={cx('size-5 shrink-0', HEAD[meta.tone])} aria-hidden="true" />
        <div className="min-w-0">
          <p
            className={cx(
              'font-semibold leading-tight',
              isAlert ? 'text-lg' : 'text-base',
              HEAD[meta.tone],
            )}
          >
            {meta.label}
          </p>
          <p className={cx('text-sm', isAlert ? 'text-ink-body' : 'text-ink-muted')}>
            {meta.detail}
          </p>
        </div>
        {countdown && (
          <CountdownReadout
            secs={countdown.secs}
            label={countdown.label}
            tone={meta.tone === 'danger' ? 'danger' : 'warn'}
            size="md"
            className="ml-auto items-end text-right"
          />
        )}
      </div>

      {/* The two anchors. Always side by side — both matter at a glance. */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <StatusPanel label="Stove" {...stove} />
        <StatusPanel label="Presence" {...presence} />
      </div>
    </section>
  )
}
