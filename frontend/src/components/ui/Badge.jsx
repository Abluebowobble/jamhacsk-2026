import { cx } from '../../lib/cx'

// Status pill — always dot/icon + label + tone. Never color alone (a11y).
const TONES = {
  neutral: 'bg-neutral-subtle text-ink-body border-border',
  primary: 'bg-primary-subtle text-primary border-primary-border',
  success: 'bg-success-subtle text-success-fg border-success/30',
  warn: 'bg-warn-subtle text-warn-fg border-warn/40',
  danger: 'bg-danger-subtle text-danger-fg border-danger/30',
}

const DOTS = {
  neutral: 'bg-neutral',
  primary: 'bg-primary',
  success: 'bg-success',
  warn: 'bg-warn',
  danger: 'bg-danger',
}

export function Badge({ tone = 'neutral', icon: Icon, dot = false, children, className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {dot && <span className={cx('size-1.5 rounded-full', DOTS[tone])} aria-hidden="true" />}
      {Icon && <Icon className="size-3.5" aria-hidden="true" />}
      {children}
    </span>
  )
}
