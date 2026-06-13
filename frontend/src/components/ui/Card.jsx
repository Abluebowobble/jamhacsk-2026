import { cx } from '../../lib/cx'

// Hairline surface — the clinical signature. Border, not shadow, at rest.
export function Card({ as: Tag = 'div', className, interactive = false, ...props }) {
  return (
    <Tag
      className={cx(
        'rounded-md border border-border bg-surface',
        interactive &&
          'transition-colors duration-[120ms] ease-out hover:border-border-strong hover:bg-surface-sunken',
        className,
      )}
      {...props}
    />
  )
}
