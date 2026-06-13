import { Loader2 } from 'lucide-react'
import { cx } from '../../lib/cx'

const VARIANTS = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-hover active:bg-primary-active',
  secondary:
    'bg-surface text-ink border border-border-strong hover:bg-surface-sunken active:bg-surface-sunken',
  ghost: 'text-ink-body hover:bg-surface-sunken hover:text-ink',
  danger: 'bg-danger text-primary-fg hover:bg-danger-hover active:bg-danger-hover',
}

const SIZES = {
  md: 'h-11 px-4 text-sm gap-2',
  sm: 'h-9 px-3 text-sm gap-1.5',
  icon: 'h-11 w-11',
}

export function Button({
  as: Tag = 'button',
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  className,
  children,
  ...props
}) {
  const isButton = Tag === 'button'
  return (
    <Tag
      {...(isButton ? { disabled: disabled || loading, type: props.type ?? 'button' } : {})}
      aria-busy={loading || undefined}
      className={cx(
        'inline-flex items-center justify-center rounded-md font-medium whitespace-nowrap select-none',
        'transition-colors duration-[120ms] ease-out',
        'disabled:opacity-50 disabled:pointer-events-none',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
      {children}
    </Tag>
  )
}
