import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, X, UserPlus, Inbox, Loader2 } from 'lucide-react'
import { useSession } from '../lib/sessionContext'
import { usePendingRequests, actions } from '../lib/store'
import { relativeTime } from '../lib/format'
import { cx } from '../lib/cx'

// In-app notifications surface, mounted in the app header. Today it carries the
// household's pending access requests — the inbound side of the pairing flow
// (PairPage → "Request access"). An admin sees who's asking to join and can
// approve or deny inline, without digging into settings. Mirrors the
// AccountMenu / HouseholdSwitcher dropdown pattern (click-away + Escape).
export function NotificationsBell() {
  const { households } = useSession()
  const requests = usePendingRequests(households)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const count = requests.length

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

  const label = count
    ? `Notifications, ${count} pending request${count === 1 ? '' : 's'}`
    : 'Notifications, none pending'

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className={cx(
          'relative grid size-9 place-items-center rounded-full bg-surface-sunken text-ink-body',
          'transition-colors hover:bg-border focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
        )}
      >
        <Bell className="size-[18px]" aria-hidden="true" />
        {count > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 grid min-w-[1.125rem] place-items-center rounded-full bg-primary px-1 text-[0.6875rem] font-semibold leading-none text-primary-fg ring-2 ring-bg"
            aria-hidden="true"
          >
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className="absolute right-0 top-full z-[var(--z-dropdown)] mt-1.5 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-md border border-border bg-surface shadow-pop"
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {count > 0 && (
              <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-medium text-primary">
                {count} pending
              </span>
            )}
          </div>

          {count === 0 ? (
            <Empty />
          ) : (
            <ul className="max-h-[min(26rem,60vh)] divide-y divide-border overflow-y-auto">
              {requests.map((req) => (
                <RequestItem key={req.id} req={req} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function Empty() {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-surface-sunken text-ink-muted">
        <Inbox className="size-5" aria-hidden="true" />
      </span>
      <p className="text-sm font-medium text-ink">You’re all caught up</p>
      <p className="max-w-[15rem] text-xs text-ink-body">
        Requests to join your households will show up here for approval.
      </p>
    </div>
  )
}

function RequestItem({ req }) {
  const navigate = useNavigate()
  const [busy, setBusy] = useState(null) // 'approved' | 'denied' | null
  const [error, setError] = useState(null)
  const initial = (req.name || '?').charAt(0).toUpperCase()

  const review = async (decision) => {
    setBusy(decision)
    setError(null)
    try {
      // On success the request leaves the pending list and this row unmounts.
      await actions.reviewJoinRequest(req.householdId, req.id, decision)
    } catch (e) {
      setError(e?.message || 'Couldn’t update that request. Try again.')
      setBusy(null)
    }
  }

  return (
    <li className="flex flex-col gap-2.5 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary-subtle text-xs font-semibold text-primary"
          aria-hidden="true"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-ink">
            <span className="font-semibold">{req.name || 'Someone'}</span>{' '}
            <span className="text-ink-body">wants to join</span>{' '}
            <button
              type="button"
              onClick={() => navigate('/settings/household')}
              className="font-medium text-ink underline-offset-2 hover:underline"
            >
              {req.householdName || 'your household'}
            </button>
          </p>
          <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-ink-muted">
            <UserPlus className="size-3" aria-hidden="true" />
            Access request · {relativeTime(req.at)}
          </p>
        </div>
      </div>

      {error && (
        <p className="text-xs text-danger-fg" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2 pl-11">
        <button
          type="button"
          onClick={() => review('approved')}
          disabled={Boolean(busy)}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none"
        >
          {busy === 'approved' ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Check className="size-3.5" aria-hidden="true" />
          )}
          Approve
        </button>
        <button
          type="button"
          onClick={() => review('denied')}
          disabled={Boolean(busy)}
          className="inline-flex h-8 flex-1 items-center justify-center gap-1.5 rounded-md border border-border-strong bg-surface px-3 text-xs font-medium text-ink-body transition-colors hover:bg-surface-sunken disabled:opacity-50 disabled:pointer-events-none"
        >
          {busy === 'denied' ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <X className="size-3.5" aria-hidden="true" />
          )}
          Deny
        </button>
      </div>
    </li>
  )
}
