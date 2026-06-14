import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Check, House } from 'lucide-react'
import { useHouseholds } from '../lib/store'
import { useHousehold } from '../lib/householdContext'
import { cx } from '../lib/cx'

export function HouseholdSwitcher() {
  const households = useHouseholds()
  const { householdId, setHouseholdId } = useHousehold()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const current = households.find((h) => h.id === householdId) ?? households[0]

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
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-sunken"
      >
        <House className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
        <span className="max-w-[8rem] truncate sm:max-w-[12rem]">{current.name}</span>
        <span className="hidden rounded-full bg-surface-sunken px-1.5 py-0.5 text-xs font-normal capitalize text-ink-muted sm:inline">
          {current.role}
        </span>
        <ChevronDown
          className={cx('size-4 shrink-0 text-ink-muted transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Switch household"
          className={cx(
            'hestia-menu-in z-[var(--z-dropdown)] origin-top-right overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-pop',
            // Mobile: pin BOTH gutters to the viewport and right-align within
            // them, so a right-side trigger's menu can never run off either edge
            // — no dependence on 100vw or the trigger's header position.
            'fixed left-3 right-3 top-[calc(4rem+0.5rem)] ml-auto max-w-[18rem]',
            // ≥sm: anchor under the trigger like the app's other header menus.
            'sm:absolute sm:left-auto sm:right-0 sm:top-full sm:ml-0 sm:mt-1.5 sm:w-72 sm:max-w-none',
          )}
        >
          {households.map((h) => {
            const selected = h.id === current.id
            return (
              <li key={h.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    setHouseholdId(h.id)
                    setOpen(false)
                  }}
                  className={cx(
                    'flex w-full items-center gap-3 px-3 py-3 text-left text-sm transition-colors',
                    selected ? 'bg-primary-subtle text-primary' : 'text-ink hover:bg-surface-sunken',
                  )}
                >
                  <House
                    className={cx('size-4 shrink-0', selected ? 'text-primary' : 'text-ink-muted')}
                    aria-hidden="true"
                  />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-medium">{h.name}</span>
                    <span className="truncate text-xs capitalize text-ink-muted">{h.role}</span>
                  </span>
                  {selected && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
