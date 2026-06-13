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
        <House className="size-4 text-ink-muted" aria-hidden="true" />
        <span className="max-w-[10rem] truncate">{current.name}</span>
        <span className="hidden rounded-full bg-surface-sunken px-1.5 py-0.5 text-xs font-normal text-ink-muted sm:inline">
          {current.role}
        </span>
        <ChevronDown
          className={cx('size-4 text-ink-muted transition-transform', open && 'rotate-180')}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 top-full z-[var(--z-dropdown)] mt-1.5 w-64 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-pop"
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
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm text-ink transition-colors hover:bg-surface-sunken"
                >
                  <span className="flex flex-col">
                    <span className="font-medium">{h.name}</span>
                    <span className="text-xs text-ink-muted">{h.role}</span>
                  </span>
                  {selected && <Check className="size-4 text-primary" aria-hidden="true" />}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
