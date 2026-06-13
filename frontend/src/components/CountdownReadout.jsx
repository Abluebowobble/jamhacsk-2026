import { formatCountdown } from '../lib/format'
import { cx } from '../lib/cx'

const TONE_TEXT = {
  warn: 'text-warn-fg',
  danger: 'text-danger-fg',
  neutral: 'text-ink',
}

// Machine readout for the absence / warning countdown. Mono + tabular so the
// digits don't jitter as they tick. The one element allowed to draw the eye.
export function CountdownReadout({ secs, label, tone = 'warn', size = 'md', className }) {
  const sizes = {
    sm: 'text-lg',
    md: 'text-3xl',
    lg: 'text-5xl',
  }
  return (
    <div className={cx('flex flex-col', className)}>
      <span
        className={cx('font-mono font-medium tabular-nums leading-none', sizes[size], TONE_TEXT[tone])}
        role="timer"
        aria-label={`${formatCountdown(secs)} ${label}`}
      >
        {formatCountdown(secs)}
      </span>
      {label && <span className="mt-1 text-xs text-ink-muted">{label}</span>}
    </div>
  )
}
