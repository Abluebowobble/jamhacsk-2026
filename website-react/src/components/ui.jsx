import { Link } from 'react-router-dom'
import { cx } from '../lib/cx'

/* ---------------- Layout ---------------- */

export function Container({ narrow, className, children }) {
  return (
    <div
      className={cx(
        'w-full mx-auto px-[clamp(20px,5vw,40px)]',
        narrow ? 'max-w-[760px]' : 'max-w-[1140px]',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function Section({ className, ruled, tight, children, ...rest }) {
  return (
    <section
      className={cx(
        'relative',
        tight ? 'py-[clamp(48px,6vw,80px)]' : 'py-[clamp(64px,9vw,120px)]',
        ruled && 'border-t border-border',
        className,
      )}
      {...rest}
    >
      {children}
    </section>
  )
}

/* ---------------- Buttons ---------------- */

const BTN_BASE =
  'group inline-flex items-center justify-center gap-2 font-semibold leading-none whitespace-nowrap select-none ' +
  'rounded-md border border-transparent transition-[background-color,border-color,color,box-shadow,transform] ' +
  'duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:translate-y-px ' +
  '[&_svg]:w-[18px] [&_svg]:h-[18px]'

const BTN_VARIANT = {
  primary: 'bg-primary text-primary-fg shadow-[0_1px_2px_oklch(0.45_0.1_52/0.25)] hover:bg-primary-hover hover:shadow-card-hover',
  secondary: 'bg-surface text-ink border-border-strong hover:border-ink-faint',
  ghost: 'text-ink-body hover:bg-primary-subtle hover:text-primary-hover',
}

const BTN_SIZE = {
  md: 'min-h-[46px] px-[22px] text-base',
  lg: 'min-h-[52px] px-7 text-lg',
}

export function Button({ variant = 'primary', size = 'md', className, to, href, block, children, ...rest }) {
  const cls = cx(BTN_BASE, BTN_VARIANT[variant], BTN_SIZE[size], block && 'w-full', className)
  if (to) return <Link to={to} className={cls} {...rest}>{children}</Link>
  if (href) return <a href={href} className={cls} {...rest}>{children}</a>
  return <button className={cls} {...rest}>{children}</button>
}

/* ---------------- Pills (status vocabulary) ---------------- */

const PILL_VARIANT = {
  neutral: 'bg-neutral-subtle text-ink-muted border-border',
  primary: 'bg-primary-subtle text-primary border-primary-border',
  success: 'bg-success-subtle text-success-fg border-success-border',
  warn: 'bg-warn-subtle text-warn-fg border-warn-border',
  danger: 'bg-danger-subtle text-danger-fg border-danger-border',
}

export function Pill({ variant = 'neutral', className, children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-[7px] py-[5px] pl-[9px] pr-[11px] rounded-full',
        'text-sm font-semibold leading-none border',
        '[&_svg]:w-[14px] [&_svg]:h-[14px]',
        PILL_VARIANT[variant],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ---------------- Card ---------------- */

export function Card({ interactive, className, children, ...rest }) {
  return (
    <div
      className={cx(
        'bg-surface border border-border rounded-lg p-[clamp(22px,3vw,30px)]',
        interactive &&
          'transition-[border-color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] ' +
            'hover:border-border-strong hover:-translate-y-[3px] hover:shadow-card-hover',
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  )
}

/* ---------------- Type bits ---------------- */

export function Eyebrow({ children, className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-2 text-sm font-semibold text-primary mb-[14px]',
        "before:content-[''] before:w-[7px] before:h-[7px] before:rounded-full before:bg-primary before:shrink-0",
        className,
      )}
    >
      {children}
    </span>
  )
}

export function MicroLabel({ children, className }) {
  return (
    <span className={cx('text-xs font-bold tracking-[0.04em] uppercase text-ink-muted', className)}>
      {children}
    </span>
  )
}

export function IconTile({ children, className }) {
  return (
    <span
      className={cx(
        'inline-flex items-center justify-center w-[42px] h-[42px] rounded-md',
        'bg-primary-subtle text-primary border border-primary-border',
        '[&_svg]:w-[22px] [&_svg]:h-[22px]',
        className,
      )}
    >
      {children}
    </span>
  )
}
