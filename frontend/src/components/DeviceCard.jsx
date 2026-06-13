import { Link } from 'react-router-dom'
import { Wifi, WifiOff, Timer, ChevronRight } from 'lucide-react'
import { StatusBadge } from './StatusBadge'
import { StatusPanel } from './StatusPanel'
import { computePhase, stovePanel, presencePanel, PHASE } from '../lib/deviceState'
import { formatCountdown } from '../lib/format'
import { cx } from '../lib/cx'

// Overview grid primitive. The two compact tiles speak the same stove/presence
// language as the detail hero, and the WHOLE card washes a color the moment a
// stove is unattended — amber while it's counting down / buzzing, red once it's
// shut off or gone offline. Scan a wall of these and trouble jumps out.
const SURFACE = {
  calm: 'border-border bg-surface hover:border-border-strong hover:bg-surface-sunken',
  warn: 'border-warn/40 bg-warn-subtle hover:border-warn/60',
  danger: 'border-danger/40 bg-danger-subtle hover:border-danger/60',
}

function surfaceFor(phase) {
  if (phase === PHASE.UNATTENDED || phase === PHASE.WARNING) return 'warn'
  if (phase === PHASE.SHUTOFF || phase === PHASE.OFFLINE) return 'danger'
  return 'calm'
}

export function DeviceCard({ device }) {
  const phase = computePhase(device)
  const stove = stovePanel(device)
  const presence = presencePanel(device, phase)

  return (
    <Link
      to={`/devices/${device.id}`}
      className={cx(
        'group flex flex-col gap-4 rounded-md border p-4 transition-colors duration-[120ms] ease-out',
        'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
        SURFACE[surfaceFor(phase)],
        phase === PHASE.WARNING && 'hestia-pulse-warn',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-ink">{device.name}</h3>
          <span className="mt-0.5 inline-flex items-center gap-1.5 text-xs text-ink-muted">
            {device.online ? (
              <>
                <Wifi className="size-3.5 text-success" aria-hidden="true" /> Online
              </>
            ) : (
              <>
                <WifiOff className="size-3.5 text-danger" aria-hidden="true" /> Offline
              </>
            )}
          </span>
        </div>
        <StatusBadge device={device} phase={phase} />
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <StatusPanel
          size="sm"
          label="Stove"
          tone={stove.tone}
          icon={stove.icon}
          value={stove.value}
        />
        <StatusPanel
          size="sm"
          label="Presence"
          tone={presence.tone}
          icon={presence.icon}
          value={presence.value}
          pulse={presence.pulse}
        />
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-ink-muted">
        {device.timer ? (
          <span className="inline-flex items-center gap-1.5">
            <Timer className="size-3.5" aria-hidden="true" />
            <span className="font-mono tabular-nums text-ink-body">
              {formatCountdown(device.timer.remainingSecs)}
            </span>
            left
          </span>
        ) : (
          <span>No active timer</span>
        )}
        <span className="inline-flex items-center gap-0.5 font-medium text-ink-body transition-colors group-hover:text-primary">
          View
          <ChevronRight
            className="size-4 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  )
}
