import { useId } from 'react'
import { AlertCircle } from 'lucide-react'
import { cx } from '../../lib/cx'

// Labeled input with validation. Error = icon + text + color (never color alone).
export function Field({ label, hint, error, suffix, className, ...inputProps }) {
  const id = useId()
  const errId = `${id}-err`
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errId : undefined}
          className={cx(
            'h-11 w-full rounded-md border bg-surface px-3 text-sm text-ink',
            'placeholder:text-ink-muted',
            'transition-colors duration-[120ms] ease-out',
            suffix && 'pr-12',
            error
              ? 'border-danger focus-visible:outline-danger'
              : 'border-border-strong hover:border-ink-faint',
          )}
          {...inputProps}
        />
        {suffix && (
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-muted">
            {suffix}
          </span>
        )}
      </div>
      {error ? (
        <p id={errId} className="inline-flex items-center gap-1.5 text-xs text-danger-fg">
          <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : (
        hint && <p className="text-xs text-ink-muted">{hint}</p>
      )}
    </div>
  )
}
