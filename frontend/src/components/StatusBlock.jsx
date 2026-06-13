import { CountdownReadout } from './CountdownReadout'
import { computePhase, activeCountdown, PHASE_META, PHASE } from '../lib/deviceState'
import { cx } from '../lib/cx'

// The detail page's half-second answer. Big, tone-washed, with the live
// countdown when one is running. Announces phase changes to screen readers.
const SURFACE = {
  success: 'bg-success-subtle border-success/30',
  neutral: 'bg-neutral-subtle border-border',
  primary: 'bg-primary-subtle border-primary-border',
  warn: 'bg-warn-subtle border-warn/40',
  danger: 'bg-danger-subtle border-danger/30',
}
const ICON = {
  success: 'text-success',
  neutral: 'text-neutral',
  primary: 'text-primary',
  warn: 'text-warn',
  danger: 'text-danger',
}
const TITLE = {
  success: 'text-success-fg',
  neutral: 'text-ink',
  primary: 'text-primary',
  warn: 'text-warn-fg',
  danger: 'text-danger-fg',
}

export function StatusBlock({ device }) {
  const phase = computePhase(device)
  const meta = PHASE_META[phase]
  const countdown = activeCountdown(device, phase)
  const Icon = meta.Icon

  return (
    <section
      className={cx(
        'flex flex-col gap-5 rounded-lg border p-6 sm:flex-row sm:items-center sm:justify-between',
        SURFACE[meta.tone],
        phase === PHASE.WARNING && 'hestia-pulse-warn',
      )}
    >
      <div className="flex items-center gap-4">
        <span
          className={cx(
            'inline-flex size-14 shrink-0 items-center justify-center rounded-full bg-surface/70',
            ICON[meta.tone],
          )}
        >
          <Icon className="size-7" aria-hidden="true" />
        </span>
        <div>
          <h2 className={cx('text-2xl font-semibold', TITLE[meta.tone])}>{meta.label}</h2>
          <p className="mt-0.5 text-sm text-ink-body">{meta.detail}</p>
        </div>
      </div>

      {countdown && (
        <CountdownReadout
          secs={countdown.secs}
          label={countdown.label}
          tone={meta.tone === 'danger' ? 'danger' : 'warn'}
          size="lg"
          className="sm:items-end sm:text-right"
        />
      )}

      {/* Screen-reader announcement of the current safety state. */}
      <p className="sr-only" role="status" aria-live={meta.tone === 'danger' || phase === PHASE.WARNING ? 'assertive' : 'polite'}>
        {device.name}: {meta.label}. {meta.detail}.
      </p>
    </section>
  )
}
