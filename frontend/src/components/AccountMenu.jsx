import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings } from 'lucide-react'
import { useAuth } from '../lib/authContext'
import { cx } from '../lib/cx'

// Real signed-in account: avatar initial, email, and sign out. Mirrors the
// HouseholdSwitcher's dropdown pattern (click-away + Escape, shadow-pop panel).
export function AccountMenu() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const email = user?.email ?? ''
  const initial = email.charAt(0).toUpperCase() || '?'

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cx(
          'grid size-9 place-items-center rounded-full bg-surface-sunken text-sm font-semibold text-ink-body',
          'transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
        )}
        aria-label="Account menu"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="hestia-menu-in absolute right-0 top-full z-[var(--z-dropdown)] mt-1.5 w-60 origin-top-right overflow-hidden rounded-md border border-border bg-surface py-1 shadow-pop"
        >
          <div className="border-b border-border px-3 py-2.5">
            <p className="text-xs text-ink-muted">Signed in as</p>
            <p className="truncate text-sm font-medium text-ink" title={email}>
              {email}
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              navigate('/settings')
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface-sunken"
          >
            <Settings className="size-4 text-ink-muted" aria-hidden="true" />
            Settings
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              signOut()
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface-sunken"
          >
            <LogOut className="size-4 text-ink-muted" aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}
    </div>
  )
}
