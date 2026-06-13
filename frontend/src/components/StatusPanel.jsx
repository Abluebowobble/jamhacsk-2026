import { cx } from '../lib/cx'

// The dashboard's anchor: a bold, solid, half-second-legible panel. The device
// hero is a row of three (Stove / Presence / Camera). The panel FILLS with its
// state color — flat, no glow, no rings, no nested cards. Every panel is color
// + icon + text, never color alone (a11y).
//
// When `onClick` is given the panel becomes a real button — the stove tile IS
// the on/off control, the camera tile opens the stream. size="lg" is the hero
// (kept short and space-efficient); size="sm" is the compact overview tile.

const TONE = {
  primary: { fill: 'bg-primary text-primary-fg', sub: 'text-primary-fg/75', label: 'text-primary-fg/70' },
  // deepened one step from --color-success so white text clears contrast
  success: { fill: 'bg-success-fg text-primary-fg', sub: 'text-primary-fg/80', label: 'text-primary-fg/70' },
  // amber is light → dark ink at full strength. Dimmed ink on amber fails AA,
  // and a warning state must stay maximally legible under stress; size + weight
  // carry the hierarchy instead of opacity.
  warn: { fill: 'bg-warn text-ink', sub: 'text-ink/90', label: 'text-ink' },
  danger: { fill: 'bg-danger text-primary-fg', sub: 'text-primary-fg/80', label: 'text-primary-fg/70' },
  // calm/off: light hairline panel, dark ink — quiet by design
  neutral: { fill: 'bg-surface-sunken text-ink ring-1 ring-inset ring-border', sub: 'text-ink-muted', label: 'text-ink-muted' },
  // camera "screen": reads as a video surface, distinct from the status tiles
  dark: { fill: 'bg-ink text-primary-fg', sub: 'text-primary-fg/60', label: 'text-primary-fg/55' },
}

const SIZE = {
  lg: {
    box: 'min-h-[116px] rounded-xl p-4 sm:min-h-[132px] sm:p-5',
    label: 'text-[0.625rem] tracking-[0.12em] sm:text-xs sm:tracking-[0.14em]',
    icon: 'size-5 sm:size-6',
    value: 'text-[1.75rem] leading-none sm:text-3xl',
    hint: 'text-[0.6875rem]',
    foot: 'gap-1',
  },
  sm: {
    box: 'min-h-[88px] rounded-lg p-3',
    label: 'text-[0.625rem] tracking-[0.12em]',
    icon: 'size-5',
    value: 'text-xl leading-none',
    hint: 'text-[0.625rem]',
    foot: 'gap-0.5',
  },
}

export function StatusPanel({
  label,
  tone = 'neutral',
  icon: Icon,
  value,
  hint,
  pulse = false,
  size = 'lg',
  onClick,
  disabled = false,
  ariaLabel,
}) {
  const t = TONE[tone]
  const s = SIZE[size]
  const interactive = Boolean(onClick) && !disabled
  const Tag = interactive ? 'button' : 'div'

  return (
    <Tag
      type={interactive ? 'button' : undefined}
      onClick={interactive ? onClick : undefined}
      aria-label={interactive ? ariaLabel : undefined}
      className={cx(
        'relative flex flex-col overflow-hidden text-left transition duration-[150ms]',
        s.box,
        t.fill,
        interactive &&
          'cursor-pointer hover:brightness-[0.97] active:brightness-95 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
        pulse && 'hestia-pulse-warn',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cx('font-semibold uppercase', s.label, t.label)}>{label}</span>
        <Icon className={cx('shrink-0', s.icon)} strokeWidth={1.75} aria-hidden="true" />
      </div>

      <div className={cx('mt-auto flex min-w-0 flex-col', s.foot)}>
        <span className={cx('font-bold tracking-[-0.02em]', s.value)}>{value}</span>
        {hint && size === 'lg' && (
          <span className={cx('truncate font-medium', s.hint, t.sub)}>{hint}</span>
        )}
      </div>
    </Tag>
  )
}
