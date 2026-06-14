import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Check, X, UserPlus, CheckCircle2, XCircle, Inbox, Loader2 } from 'lucide-react'
import { useNotifications, actions } from '../lib/store'
import { relativeTime } from '../lib/format'
import { cx } from '../lib/cx'

// In-app notifications surface, mounted in the app header. Reads the signed-in
// user's DB-backed feed (the `notifications` table): access requests for admins,
// approval/decline outcomes for requesters, etc. Join-request notifications can
// be approved or denied inline. Opening the panel clears the unread badge.
// Mirrors the AccountMenu / HouseholdSwitcher dropdown pattern (click-away + Esc).
export function NotificationsBell() {
  const { notifications, unread } = useNotifications()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

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

  // Opening the panel means the user has seen them — clear the unread badge.
  useEffect(() => {
    if (open) actions.markNotificationsRead()
  }, [open])

  const label = unread
    ? `Notifications, ${unread} unread`
    : 'Notifications, none unread'

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
        {unread > 0 && (
          <span
            className="absolute -right-0.5 -top-0.5 grid min-w-[1.125rem] place-items-center rounded-full bg-primary px-1 text-[0.6875rem] font-semibold leading-none text-primary-fg ring-2 ring-bg"
            aria-hidden="true"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Notifications"
          className={cx(
            'z-[var(--z-dropdown)] overflow-hidden rounded-md border border-border bg-surface shadow-pop',
            // Phone: a viewport-anchored sheet under the header — the bell sits
            // left of the account avatar, so anchoring a wide panel to the bell
            // would push it off the left edge. Insets keep it fully on screen.
            'fixed inset-x-3 top-[4.25rem]',
            // ≥sm: a popover anchored directly under the bell.
            'sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-1.5 sm:w-[22rem]',
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <p className="text-sm font-semibold text-ink">Notifications</p>
            {unread > 0 && (
              <span className="rounded-full bg-primary-subtle px-2 py-0.5 text-xs font-medium text-primary">
                {unread} new
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <Empty />
          ) : (
            <ul className="max-h-[min(26rem,60vh)] divide-y divide-border overflow-y-auto">
              {notifications.map((n) => (
                <NotificationItem key={n.id} n={n} />
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
        Access requests and updates about your households will show up here.
      </p>
    </div>
  )
}

// Visual treatment per notification type. Anything unmapped falls back to a
// neutral bell so a new server-side type still renders sensibly.
const ICONS = {
  join_request: { Icon: UserPlus, cls: 'bg-primary-subtle text-primary' },
  join_approved: { Icon: CheckCircle2, cls: 'bg-success-subtle text-success-fg' },
  join_denied: { Icon: XCircle, cls: 'bg-danger-subtle text-danger-fg' },
}

function NotificationItem({ n }) {
  const navigate = useNavigate()
  const { Icon, cls } = ICONS[n.type] ?? { Icon: Bell, cls: 'bg-surface-sunken text-ink-muted' }
  const [busy, setBusy] = useState(null) // 'approved' | 'denied' | null
  const [error, setError] = useState(null)

  const isActionable = n.type === 'join_request' && n.data?.joinRequestId && n.data?.householdId

  const review = async (decision) => {
    setBusy(decision)
    setError(null)
    try {
      // On success the resolved notification is cleared and this row unmounts.
      await actions.reviewJoinRequest(n.data.householdId, n.data.joinRequestId, decision)
    } catch (e) {
      setError(e?.message || 'Couldn’t update that request. Try again.')
      setBusy(null)
    }
  }

  return (
    <li className="flex flex-col gap-2.5 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <span className={cx('mt-0.5 grid size-8 shrink-0 place-items-center rounded-full', cls)} aria-hidden="true">
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug text-ink">{n.title}</p>
          {n.body && <p className="mt-0.5 text-sm leading-snug text-ink-body">{n.body}</p>}
          <p className="mt-1 text-xs text-ink-muted">{relativeTime(n.at)}</p>
        </div>
        {!n.read && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
      </div>

      {error && (
        <p className="pl-11 text-xs text-danger-fg" role="alert">
          {error}
        </p>
      )}

      {isActionable && (
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
      )}

      {n.type === 'join_request' && !isActionable && (
        <button
          type="button"
          onClick={() => navigate('/settings/household')}
          className="self-start pl-11 text-xs font-medium text-primary hover:underline"
        >
          Review in settings
        </button>
      )}
    </li>
  )
}
