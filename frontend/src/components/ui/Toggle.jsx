import { cx } from '../../lib/cx'

// Accessible switch. Tone colors the "on" track (primary by default).
export function Toggle({ checked, onChange, disabled = false, label, tone = 'primary' }) {
  const onTrack = tone === 'danger' ? 'bg-danger' : 'bg-primary'
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cx(
        'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full',
        'transition-colors duration-[120ms] ease-out',
        'disabled:opacity-50 disabled:pointer-events-none',
        checked ? onTrack : 'bg-border-strong',
      )}
    >
      <span
        className={cx(
          'inline-block size-5 rounded-full bg-surface shadow-sm',
          'transition-transform duration-[120ms] ease-out',
          checked ? 'translate-x-[1.375rem]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}
