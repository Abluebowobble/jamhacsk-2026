import { cx } from '../../lib/cx'

// Content-shaped loading placeholder (not a center spinner).
export function Skeleton({ className }) {
  return (
    <div
      className={cx('animate-pulse rounded-md bg-surface-sunken', className)}
      aria-hidden="true"
    />
  )
}
