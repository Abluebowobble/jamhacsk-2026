import { cx } from '../lib/cx'

// Teaches the next action — never "nothing here".
export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cx(
        'flex flex-col items-center justify-center rounded-md border border-dashed border-border-strong',
        'bg-surface px-6 py-14 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
          <Icon className="size-6" aria-hidden="true" />
        </span>
      )}
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-sm text-ink-body">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
