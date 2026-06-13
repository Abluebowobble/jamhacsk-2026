import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, AlertCircle, Trash2, LogOut, ShieldCheck, User } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Field } from '../../components/ui/Field'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { Modal } from '../../components/ui/Modal'
import { Skeleton } from '../../components/ui/Skeleton'
import { EmptyState } from '../../components/EmptyState'
import { SettingsGroup } from '../SettingsPage'
import { api } from '../../lib/api'
import { actions, useMembers } from '../../lib/store'
import { useSession } from '../../lib/sessionContext'
import { useAuth } from '../../lib/authContext'
import { useCan } from '../../lib/roles'

export function HouseholdSection() {
  const { activeHousehold, refetchHouseholds, setActiveHousehold } = useSession()
  const householdId = activeHousehold?.id ?? null
  const canRename = useCan('renameHousehold')
  const canDelete = useCan('deleteHousehold')

  if (!householdId) {
    return (
      <EmptyState
        icon={User}
        title="No household selected"
        description="Pick a household from the switcher to manage its name and members."
      />
    )
  }

  return (
    <div className="flex flex-col gap-8">
      {/* key on householdId so switching households re-seeds the name field. */}
      <RenameGroup key={householdId} householdId={householdId} name={activeHousehold.name} canRename={canRename} refetch={refetchHouseholds} />
      <MembersGroup householdId={householdId} />
      <DangerGroup
        householdId={householdId}
        name={activeHousehold.name}
        role={activeHousehold.role}
        canDelete={canDelete}
        refetch={refetchHouseholds}
        setActiveHousehold={setActiveHousehold}
      />
    </div>
  )
}

// ---- Rename --------------------------------------------------------------

function RenameGroup({ householdId, name, canRename, refetch }) {
  const [value, setValue] = useState(name)
  const [status, setStatus] = useState('idle')
  const [errorMsg, setErrorMsg] = useState(null)

  const trimmed = value.trim()
  const err = trimmed.length === 0 ? 'Name can’t be empty.' : null
  const dirty = trimmed !== name

  const onSubmit = async (e) => {
    e.preventDefault()
    if (err || !dirty || status === 'saving' || !canRename) return
    setStatus('saving')
    setErrorMsg(null)
    try {
      await api.renameHousehold(householdId, trimmed)
      await refetch()
      setStatus('saved')
      setTimeout(() => setStatus('idle'), 2000)
    } catch (e2) {
      setStatus('error')
      setErrorMsg(e2?.message || 'Couldn’t rename the household.')
    }
  }

  return (
    <SettingsGroup title="Household name" description="Shown to everyone in the household.">
      <Card className="p-5">
        <form className="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
          <div className="max-w-sm">
            <Field
              label="Name"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              error={(status !== 'idle' || dirty) && canRename ? err : null}
              disabled={!canRename}
              maxLength={100}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" loading={status === 'saving'} disabled={!canRename || !!err || !dirty}>
              Save name
            </Button>
            {status === 'saved' && (
              <span className="inline-flex items-center gap-1.5 text-sm text-success-fg">
                <Check className="size-4" aria-hidden="true" />
                Saved
              </span>
            )}
            {status === 'error' && errorMsg && (
              <span className="inline-flex items-center gap-1.5 text-sm text-danger-fg" role="alert">
                <AlertCircle className="size-4" aria-hidden="true" />
                {errorMsg}
              </span>
            )}
            {!canRename && <span className="text-sm text-ink-muted">Only admins can rename the household.</span>}
          </div>
        </form>
      </Card>
    </SettingsGroup>
  )
}

// ---- Members -------------------------------------------------------------

function MembersGroup({ householdId }) {
  const { members, loading } = useMembers(householdId)
  const { user } = useAuth()
  const canManage = useCan('changeRole') // admin
  const [actionError, setActionError] = useState(null)
  const [removeTarget, setRemoveTarget] = useState(null)
  const [pendingId, setPendingId] = useState(null)

  const onRole = async (member, role) => {
    if (role === member.role) return
    setPendingId(member.userId)
    setActionError(null)
    try {
      await actions.updateMemberRole(householdId, member.userId, role)
    } catch (e) {
      setActionError(e?.message || 'Couldn’t change that member’s role.')
    } finally {
      setPendingId(null)
    }
  }

  const onRemove = async () => {
    if (!removeTarget) return
    setPendingId(removeTarget.userId)
    setActionError(null)
    try {
      await actions.removeMember(householdId, removeTarget.userId)
      setRemoveTarget(null)
    } catch (e) {
      setActionError(e?.message || 'Couldn’t remove that member.')
    } finally {
      setPendingId(null)
    }
  }

  return (
    <SettingsGroup
      title="Members"
      description={canManage ? 'Manage who can access this household and what they can do.' : 'People with access to this household.'}
    >
      {actionError && (
        <p className="inline-flex items-center gap-1.5 text-sm text-danger-fg" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {actionError}
        </p>
      )}

      <Card className="divide-y divide-border">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-4">
              <Skeleton className="size-9 rounded-full" />
              <div className="flex flex-1 flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))
        ) : members.length === 0 ? (
          <div className="p-6 text-center text-sm text-ink-muted">No members found.</div>
        ) : (
          members.map((m) => (
            <MemberRow
              key={m.userId}
              member={m}
              isSelf={user?.id === m.userId}
              canManage={canManage}
              busy={pendingId === m.userId}
              onRole={onRole}
              onRemove={() => setRemoveTarget(m)}
            />
          ))
        )}
      </Card>

      <Modal
        open={Boolean(removeTarget)}
        onClose={() => setRemoveTarget(null)}
        title="Remove member?"
        description={
          removeTarget
            ? `${removeTarget.name || 'This member'} will lose all access to this household. They can request to rejoin later.`
            : ''
        }
      >
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoveTarget(null)}>
            Cancel
          </Button>
          <Button variant="danger" loading={Boolean(removeTarget) && pendingId === removeTarget.userId} onClick={onRemove}>
            <Trash2 className="size-4" aria-hidden="true" />
            Remove member
          </Button>
        </div>
      </Modal>
    </SettingsGroup>
  )
}

function MemberRow({ member, isSelf, canManage, busy, onRole, onRemove }) {
  const initial = (member.name || '?').charAt(0).toUpperCase()
  const showControls = canManage && !isSelf

  return (
    <div className="flex flex-wrap items-center gap-3 p-4">
      <span
        className="grid size-9 shrink-0 place-items-center rounded-full bg-surface-sunken text-sm font-semibold text-ink-body"
        aria-hidden="true"
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-ink">
          {member.name || 'Unknown member'}
          {isSelf && <span className="ml-1.5 text-xs font-normal text-ink-muted">(You)</span>}
        </p>
      </div>

      {showControls ? (
        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor={`role-${member.userId}`}>
            Role
          </label>
          <select
            id={`role-${member.userId}`}
            value={member.role}
            disabled={busy}
            onChange={(e) => onRole(member, e.target.value)}
            className="h-9 rounded-md border border-border-strong bg-surface px-2 text-sm text-ink transition-colors hover:border-ink-faint disabled:opacity-50"
          >
            <option value="admin">Admin</option>
            <option value="member">Member</option>
          </select>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 text-danger-fg hover:bg-danger-subtle"
            aria-label={`Remove ${member.name || 'member'}`}
            disabled={busy}
            onClick={onRemove}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ) : (
        <Badge tone={member.role === 'admin' ? 'primary' : 'neutral'} icon={member.role === 'admin' ? ShieldCheck : User}>
          {member.role === 'admin' ? 'Admin' : 'Member'}
        </Badge>
      )}
    </div>
  )
}

// ---- Danger zone (leave / delete) ---------------------------------------

function DangerGroup({ householdId, name, role, canDelete, refetch, setActiveHousehold }) {
  const navigate = useNavigate()
  const [leaving, setLeaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const afterExit = async () => {
    setActiveHousehold(null) // clear stale selection; session self-heals to the first remaining
    await refetch()
    navigate('/')
  }

  return (
    <SettingsGroup title="Danger zone" description="These actions can’t be undone.">
      <Card className="flex flex-col divide-y divide-border">
        <DangerRow
          title="Leave household"
          desc="Remove yourself from this household. You’ll lose access until you’re invited back."
          button={
            <Button variant="secondary" onClick={() => setLeaving(true)}>
              <LogOut className="size-4" aria-hidden="true" />
              Leave
            </Button>
          }
        />
        {canDelete && (
          <DangerRow
            title="Delete household"
            desc="Permanently delete this household, its devices, and its history for everyone."
            button={
              <Button variant="danger" onClick={() => setDeleting(true)}>
                <Trash2 className="size-4" aria-hidden="true" />
                Delete
              </Button>
            }
          />
        )}
      </Card>

      {/* key on the open flag so each opening starts from a clean form/error. */}
      <LeaveModal
        key={leaving ? 'leave-open' : 'leave-closed'}
        open={leaving}
        name={name}
        role={role}
        onClose={() => setLeaving(false)}
        householdId={householdId}
        onDone={afterExit}
      />
      <DeleteModal
        key={deleting ? 'delete-open' : 'delete-closed'}
        open={deleting}
        name={name}
        onClose={() => setDeleting(false)}
        householdId={householdId}
        onDone={afterExit}
      />
    </SettingsGroup>
  )
}

function DangerRow({ title, desc, button }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 p-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 max-w-prose text-sm text-ink-body">{desc}</p>
      </div>
      {button}
    </div>
  )
}

function LeaveModal({ open, name, onClose, householdId, onDone }) {
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const onConfirm = async () => {
    setBusy(true)
    setErrorMsg(null)
    try {
      await api.leaveHousehold(householdId)
      await onDone()
      onClose()
    } catch (e) {
      setErrorMsg(e?.message || 'Couldn’t leave the household.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Leave household?" description={`You’ll be removed from “${name}”.`}>
      {errorMsg && (
        <p className="mb-3 inline-flex items-center gap-1.5 text-sm text-danger-fg" role="alert">
          <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
          {errorMsg}
        </p>
      )}
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="danger" loading={busy} onClick={onConfirm}>
          <LogOut className="size-4" aria-hidden="true" />
          Leave household
        </Button>
      </div>
    </Modal>
  )
}

function DeleteModal({ open, name, onClose, householdId, onDone }) {
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  const matches = confirm.trim() === name

  const onConfirm = async () => {
    if (!matches) return
    setBusy(true)
    setErrorMsg(null)
    try {
      await api.deleteHousehold(householdId)
      await onDone()
      onClose()
    } catch (e) {
      setErrorMsg(e?.message || 'Couldn’t delete the household.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Delete household?"
      description={`This permanently deletes “${name}” and everything in it for all members.`}
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          onConfirm()
        }}
      >
        <Field
          label={`Type the household name to confirm`}
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder={name}
          autoFocus
        />
        {errorMsg && (
          <p className="inline-flex items-center gap-1.5 text-sm text-danger-fg" role="alert">
            <AlertCircle className="size-4 shrink-0" aria-hidden="true" />
            {errorMsg}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="danger" loading={busy} disabled={!matches}>
            <Trash2 className="size-4" aria-hidden="true" />
            Delete household
          </Button>
        </div>
      </form>
    </Modal>
  )
}
