import { NavLink } from 'react-router-dom'
import { User, Bell, Users, Info } from 'lucide-react'
import { cx } from '../lib/cx'

const TABS = [
  { to: 'account', label: 'Account', icon: User },
  { to: 'notifications', label: 'Notifications', icon: Bell },
  { to: 'household', label: 'Household', icon: Users },
  { to: 'about', label: 'About', icon: Info },
]

// Settings section switcher. Vertical rail on desktop, a horizontal scroll row
// on phone. Active state is carried by color + weight + an indicator bar, never
// color alone.
export function SettingsNav() {
  return (
    <nav
      aria-label="Settings sections"
      className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0"
    >
      {TABS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cx(
              'group relative flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-medium',
              'transition-colors duration-[120ms] ease-out',
              isActive
                ? 'bg-primary-subtle text-primary'
                : 'text-ink-body hover:bg-surface-sunken hover:text-ink',
            )
          }
        >
          {({ isActive }) => (
            <>
              {/* Indicator: bottom border on phone, left bar on desktop. */}
              <span
                aria-hidden="true"
                className={cx(
                  'absolute rounded-full bg-primary transition-opacity duration-[120ms]',
                  'inset-x-3 bottom-0 h-0.5 lg:inset-x-auto lg:bottom-auto lg:left-0 lg:top-1/2 lg:h-5 lg:w-0.5 lg:-translate-y-1/2',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
              <Icon
                className={cx('size-4 shrink-0', isActive ? 'text-primary' : 'text-ink-muted')}
                aria-hidden="true"
              />
              {label}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  )
}
