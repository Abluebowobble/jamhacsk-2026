import { FlaskConical, UserMinus, UserPlus, Power, RotateCcw } from 'lucide-react'
import { Button } from './ui/Button'
import { actions } from '../lib/store'
import { computePhase, PHASE } from '../lib/deviceState'

// Demo-only control to drive the safety sequence live (safe → unattended →
// warning buzzer → auto shut-off). Stands in for the Raspberry Pi's camera +
// MQTT until the device is wired up. Visually marked as a tool, not product UI.
export function StateSimulator({ device }) {
  const phase = computePhase(device)
  const running = phase === PHASE.UNATTENDED || phase === PHASE.WARNING

  return (
    <div className="rounded-md border border-dashed border-border-strong bg-surface-sunken p-4">
      <div className="mb-3">
        <p className="flex items-center gap-2 text-sm font-medium text-ink-body">
          <FlaskConical className="size-4 text-ink-muted" aria-hidden="true" />
          Demo simulator
        </p>
        <p className="mt-0.5 pl-6 text-xs text-ink-muted">Stands in for the camera + Pi</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {!device.online ? (
          <Button size="sm" onClick={() => actions.reset(device.id)}>
            Bring back online
          </Button>
        ) : !device.stoveOn ? (
          <Button size="sm" onClick={() => actions.toggleStove(device.id)}>
            <Power className="size-4" aria-hidden="true" />
            Turn stove on
          </Button>
        ) : running ? (
          <Button size="sm" variant="primary" onClick={() => actions.simulateReturn(device.id)}>
            <UserPlus className="size-4" aria-hidden="true" />
            Person returns
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={() => actions.simulateLeave(device.id)}>
            <UserMinus className="size-4" aria-hidden="true" />
            Person leaves
          </Button>
        )}

        {device.online && device.stoveOn && (
          <Button size="sm" variant="ghost" onClick={() => actions.toggleStove(device.id)}>
            <Power className="size-4" aria-hidden="true" />
            Turn off
          </Button>
        )}

        <Button size="sm" variant="ghost" onClick={() => actions.reset(device.id)}>
          <RotateCcw className="size-4" aria-hidden="true" />
          Reset
        </Button>
      </div>
    </div>
  )
}
