import { cx } from '../../lib/cx'

// Label + value row. `mono` for machine readouts (thresholds, codes, times).
export function Stat({ label, icon: Icon, children, mono = false, className }) {
  return (
    <div className={cx('flex items-center justify-between gap-3 py-2.5', className)}>
      <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
        {Icon && <Icon className="size-4 text-ink-faint" aria-hidden="true" />}
        {label}
      </span>
      <span className={cx('text-sm font-medium text-ink', mono && 'font-mono tabular-nums')}>
        {children}
      </span>
    </div>
  )
}
