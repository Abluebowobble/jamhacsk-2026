import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  MoreVertical,
  Pencil,
  Trash2,
  Wifi,
  WifiOff,
  Flame,
  Power,
  UserCheck,
  UserX,
  Clock,
  AlertTriangle,
  Camera,
  History,
} from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Field } from '../components/ui/Field'
import { Modal } from '../components/ui/Modal'
import { Stat } from '../components/ui/Stat'
import { DeviceSummaryCard } from '../components/DeviceSummaryCard'
import { TimerControls } from '../components/TimerControls'
import { SafetySettings } from '../components/SafetySettings'
import { EventList } from '../components/EventList'
import { EmptyState } from '../components/EmptyState'
import { Skeleton } from '../components/ui/Skeleton'
import { useDevice, useDeviceLoading, useDeviceEvents, useHouseholds, actions } from '../lib/store'
import { useCan, can, RoleContext } from '../lib/roles'
import { formatDuration } from '../lib/format'

export function DeviceDetailPage() {
  const { deviceId } = useParams()
  const device = useDevice(deviceId)
  const loading = useDeviceLoading(deviceId)
  const events = useDeviceEvents(deviceId, 8)
  const households = useHouseholds()
  const [cameraOpen, setCameraOpen] = useState(false)

  if (!device) {
    if (loading) {
      return (
        <div className="flex flex-col gap-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-28 w-full rounded-lg" />
          <div className="grid gap-5 lg:grid-cols-3">
            <Skeleton className="h-64 w-full rounded-md lg:col-span-2" />
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        </div>
      )
    }
    return (
      <EmptyState
        icon={History}
        title="Device not found"
        description="It may have been removed, or you no longer have access."
        action={
          <Button as={Link} to="/">
            Back to devices
          </Button>
        }
        className="mt-10"
      />
    )
  }

  const household = households.find((h) => h.id === device.householdId)
  // Permissions follow the user's role in THIS device's household, not the
  // household currently selected in the shell switcher.
  const role = household?.role ?? 'member'

  return (
    <RoleContext.Provider value={role}>
    <div className="flex flex-col gap-6">
      <Link
        to="/"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-sm text-ink-muted transition-colors hover:text-ink"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All devices
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{device.name}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-ink-body">
            <span className="inline-flex items-center gap-1.5">
              {device.online ? (
                <Wifi className="size-3.5 text-success" aria-hidden="true" />
              ) : (
                <WifiOff className="size-3.5 text-danger" aria-hidden="true" />
              )}
              {device.online ? 'Online' : 'Offline'}
            </span>
            <span className="text-ink-faint" aria-hidden="true">·</span>
            {household?.name}
          </p>
        </div>
        <AdminMenu device={device} />
      </div>

      <DeviceSummaryCard
        device={device}
        onToggleStove={() => actions.toggleStove(device.id)}
        onOpenCamera={() => setCameraOpen(true)}
        canViewCamera={can('viewCamera', role)}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Section title="Timer">
            <TimerControls device={device} />
          </Section>

          <Section title="Safety settings">
            <SafetySettings device={device} />
          </Section>

          <Section title="Details">
            <dl className="divide-y divide-border">
              <Stat
                label="Connection"
                icon={device.online ? Wifi : WifiOff}
              >
                {device.online ? 'Online' : 'Offline'}
              </Stat>
              <Stat label="Stove" icon={device.stoveOn ? Flame : Power}>
                {device.stoveOn ? 'On' : 'Off'}
              </Stat>
              <Stat label="Presence" icon={device.presence ? UserCheck : UserX}>
                {device.presence ? 'Detected' : 'Not detected'}
              </Stat>
              <Stat label="Absence timeout" icon={Clock} mono>
                {formatDuration(device.absenceTimeout)}
              </Stat>
              <Stat label="Warning delay" icon={AlertTriangle} mono>
                {formatDuration(device.warningDelay)}
              </Stat>
            </dl>
          </Section>
        </div>

        <div className="flex flex-col gap-5">
          <Section title="Recent activity">
            <EventList events={events} />
          </Section>
        </div>
      </div>

      <Modal
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        title="Camera"
        description="Processed on the device. Visible only to authorized household members."
      >
        <CameraStream device={device} />
      </Modal>
    </div>
    </RoleContext.Provider>
  )
}

function Section({ title, action, children }) {
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </Card>
  )
}

function CameraStream({ device }) {
  const canView = useCan('viewCamera')
  return (
    <div className="overflow-hidden rounded-md border border-border bg-ink/95">
      <div className="flex aspect-video flex-col items-center justify-center gap-2 text-center">
        <Camera className="size-7 text-primary-fg/60" aria-hidden="true" />
        <p className="text-sm text-primary-fg/70">
          {!device.online
            ? 'Camera offline'
            : canView
              ? 'Tap to start the local stream'
              : 'Not permitted for your role'}
        </p>
        <p className="px-6 text-xs text-primary-fg/40">
          Processed on the device. Visible only to authorized household members.
        </p>
      </div>
    </div>
  )
}

function AdminMenu({ device }) {
  const canRename = useCan('renameDevice')
  const canRemove = useCan('removeStove')
  const [open, setOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [removing, setRemoving] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!canRename && !canRemove) return null

  return (
    <div className="relative" ref={ref}>
      <Button variant="secondary" size="icon" aria-label="Device actions" onClick={() => setOpen((o) => !o)}>
        <MoreVertical className="size-5" aria-hidden="true" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full z-[var(--z-dropdown)] mt-1.5 w-48 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-pop">
          {canRename && (
            <MenuItem
              icon={Pencil}
              onClick={() => {
                setOpen(false)
                setRenaming(true)
              }}
            >
              Rename device
            </MenuItem>
          )}
          {canRemove && (
            <MenuItem
              icon={Trash2}
              danger
              onClick={() => {
                setOpen(false)
                setRemoving(true)
              }}
            >
              Remove device
            </MenuItem>
          )}
        </div>
      )}

      <RenameModal device={device} open={renaming} onClose={() => setRenaming(false)} />
      <RemoveModal device={device} open={removing} onClose={() => setRemoving(false)} />
    </div>
  )
}

function MenuItem({ icon: Icon, danger, children, ...props }) {
  return (
    <button
      type="button"
      className={`flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm transition-colors hover:bg-surface-sunken ${
        danger ? 'text-danger-fg' : 'text-ink-body'
      }`}
      {...props}
    >
      <Icon className="size-4" aria-hidden="true" />
      {children}
    </button>
  )
}

function RenameModal({ device, open, onClose }) {
  const [name, setName] = useState(device.name)
  useEffect(() => {
    if (open) setName(device.name)
  }, [open, device.name])
  const valid = name.trim().length > 0

  return (
    <Modal open={open} onClose={onClose} title="Rename device">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid) return
          actions.renameDevice(device.id, name.trim())
          onClose()
        }}
      >
        <Field
          label="Device name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={valid ? null : 'Name cannot be empty.'}
          autoFocus
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={!valid}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function RemoveModal({ device, open, onClose }) {
  const navigate = useNavigate()
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Remove device?"
      description={`"${device.name}" will be unpaired from this household. Safety monitoring stops immediately.`}
    >
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={async () => {
            await actions.removeDevice(device.id)
            onClose()
            navigate('/')
          }}
        >
          <Trash2 className="size-4" aria-hidden="true" />
          Remove device
        </Button>
      </div>
    </Modal>
  )
}
