import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'

/** The Hestia logo — concentric rings around the flame glyph. */
export function BrandMark({ withName = true, to = '/', className, markClassName }) {
  return (
    <Link to={to} aria-label="Hestia — home" className={cx('inline-flex items-center gap-[10px] text-ink', className)}>
      <svg viewBox="0 0 32 32" fill="none" aria-hidden className={cx('w-8 h-8 text-primary', markClassName)}>
        <circle cx="16" cy="16" r="13" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="16" cy="16" r="9.4" stroke="currentColor" strokeWidth="1" opacity="0.28" />
        <g transform="translate(8.08 8.1) scale(0.66)">
          <path
            d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"
            fill="currentColor"
          />
        </g>
      </svg>
      {withName && <span className="text-[1.0625rem] font-bold tracking-[-0.01em]">Hestia</span>}
    </Link>
  )
}
