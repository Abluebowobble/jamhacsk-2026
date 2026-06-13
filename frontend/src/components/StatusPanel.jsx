import { cx } from '../lib/cx'

// The dashboard's anchor: a big, solid, half-second-legible panel. Two of
// these (Stove / Presence) carry the device view. The panel FILLS with its
// state color — bold, flat, no glow, no concentric rings, no nested cards.
//
// Active states get a saturated fill with high-contrast text. The calm/off
// state stays a light hairline panel: "nothing happening" must not shout.
// Every panel is color + icon + text, never color alone (a11y).
//
// size="lg" is the hero (device detail). size="sm" is the compact tile the
// overview grid uses, so a glance reads the same visual language at any scale.

const TONE = {
  primary: {
    fill: 'bg-primary text-primary-fg',
    sub: 'text-primary-fg/75',
    label: 'text-primary-fg/70',
  },
  success: {
    // deepened one step from --color-success so white text clears contrast
    fill: 'bg-success-fg text-primary-fg',
    sub: 'text-primary-fg/80',
    label: 'text-primary-fg/70',
  },
  warn: {
    // amber is light → dark ink, not white
    fill: 'bg-warn text-ink',
    sub: 'text-ink/65',
    label: 'text-ink/60',
  },
  danger: {
    fill: 'bg-danger text-primary-fg',
    sub: 'text-primary-fg/80',
    label: 'text-primary-fg/70',
  },
  neutral: {
    // calm/off: light hairline panel, dark ink — quiet by design
    fill: 'bg-surface-sunken text-ink ring-1 ring-inset ring-border',
    sub: 'text-ink-muted',
    label: 'text-ink-muted',
  },
}

const SIZE = {
  lg: {
    box: 'min-h-[208px] rounded-xl p-5 sm:min-h-[248px] sm:p-6',
    label: 'text-xs tracking-[0.14em]',
    icon: 'size-7 sm:size-9',
    value: 'text-[2rem] sm:text-[2.75rem]',
    foot: 'gap-1.5',
  },
  sm: {
    box: 'min-h-[92px] rounded-lg p-3',
    label: 'text-[0.625rem] tracking-[0.12em]',
    icon: 'size-5',
    value: 'text-xl',
    foot: 'gap-0.5',
  },
}

export function StatusPanel({
  label,
  tone = 'neutral',
  icon: Icon,
  value,
  detail,
  pulse = false,
  size = 'lg',
}) {
  const t = TONE[tone]
  const s = SIZE[size]
  return (
    <div
      className={cx(
        'relative flex flex-col overflow-hidden transition-colors duration-[180ms]',
        s.box,
        t.fill,
        pulse && 'hestia-pulse-warn',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cx('font-semibold uppercase', s.label, t.label)}>{label}</span>
        <Icon className={cx('shrink-0', s.icon)} strokeWidth={1.75} aria-hidden="true" />
      </div>

      <div className={cx('mt-auto flex min-w-0 flex-col', s.foot)}>
        <span className={cx('font-bold leading-none tracking-[-0.02em]', s.value)}>{value}</span>
        {detail && (
          <span className={cx('line-clamp-2 text-sm font-medium leading-snug', t.sub)}>
            {detail}
          </span>
        )}
      </div>
    </div>
  )
}
