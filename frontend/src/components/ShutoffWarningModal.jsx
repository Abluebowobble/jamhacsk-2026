import { useEffect, useState } from 'react'
import { Minus, Plus, Power, Clock, ShieldAlert } from 'lucide-react'
import { Modal } from './ui/Modal'
import { Button } from './ui/Button'
import { ShutoffCountdown } from './ShutoffCountdown'
import { actions } from '../lib/store'
import { useCan } from '../lib/roles'
import { snoozeDeadline, unattendedAnchor } from '../lib/deviceState'
import { formatDuration } from '../lib/format'

// The decisive in-app moment for an unattended, lit stove: the depleting ring
// plus the two actions from the warning push — "Add time" (snooze, in 30s steps)
// or "Turn stove off". Mirrors the OS notification so it reads the same whether
// the user arrived via push or already had the app open.

const STEP = 30
const MIN = 30
const MAX = 1800 // 30 min — matches the backend extend-warning ceiling
const PRESETS = [30, 60, 90, 120]

export function ShutoffWarningModal({ device, events = [], open, onClose, startInAddTime = false }) {
  const canAct = useCan('toggleStove')
  const [adding, setAdding] = useState(startInAddTime)
  const [seconds, setSeconds] = useState(60)
  const [busy, setBusy] = useState(false)

  // Reset to the requested mode each time the modal opens.
  useEffect(() => {
    if (open) {
      setAdding(startInAddTime)
      setSeconds(60)
      setBusy(false)
    }
  }, [open, startInAddTime])

  const grace = snoozeDeadline(events)

  async function turnOff() {
    setBusy(true)
    try {
      await actions.autoShutoff(device.id)
      onClose?.()
    } finally {
      setBusy(false)
    }
  }

  async function confirmAddTime() {
    setBusy(true)
    try {
      await actions.extendWarning(device.id, seconds)
      onClose?.()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${device.name} is unattended`}
      description="No one’s near the lit stove. Add time to keep cooking, or turn it off now."
    >
      <div className="flex flex-col gap-5">
        <ShutoffCountdown
          device={device}
          since={unattendedAnchor(events)}
          graceUntil={grace?.until ?? null}
          graceTotal={grace?.total ?? null}
          onExpire={() => actions.autoShutoff(device.id)}
        />

        {!canAct ? (
          <p className="flex items-center gap-2 rounded-md border border-border bg-surface-sunken px-3 py-2.5 text-sm text-ink-body">
            <ShieldAlert className="size-4 shrink-0 text-ink-muted" aria-hidden="true" />
            Your role can’t change the stove. Ask a household admin or member to act.
          </p>
        ) : adding ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium text-ink">How much time to add?</p>
            <div className="flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                size="icon"
                aria-label="Subtract 30 seconds"
                disabled={busy || seconds <= MIN}
                onClick={() => setSeconds((s) => Math.max(MIN, s - STEP))}
              >
                <Minus className="size-5" aria-hidden="true" />
              </Button>
              <span
                className="min-w-28 text-center font-mono text-3xl font-semibold tabular-nums text-ink"
                role="status"
                aria-label={`Add ${formatDuration(seconds)}`}
              >
                {formatDuration(seconds)}
              </span>
              <Button
                variant="secondary"
                size="icon"
                aria-label="Add 30 seconds"
                disabled={busy || seconds >= MAX}
                onClick={() => setSeconds((s) => Math.min(MAX, s + STEP))}
              >
                <Plus className="size-5" aria-hidden="true" />
              </Button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {PRESETS.map((p) => (
                <Button
                  key={p}
                  variant={seconds === p ? 'primary' : 'secondary'}
                  size="sm"
                  disabled={busy}
                  onClick={() => setSeconds(p)}
                >
                  {formatDuration(p)}
                </Button>
              ))}
            </div>
            <div className="mt-1 flex gap-2">
              <Button variant="ghost" className="flex-1" disabled={busy} onClick={() => setAdding(false)}>
                Back
              </Button>
              <Button className="flex-1" loading={busy} onClick={confirmAddTime}>
                <Clock className="size-4" aria-hidden="true" />
                Add {formatDuration(seconds)}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="flex-1" disabled={busy} onClick={() => setAdding(true)}>
              <Clock className="size-4" aria-hidden="true" />
              Add time
            </Button>
            <Button variant="danger" className="flex-1" loading={busy} onClick={turnOff}>
              <Power className="size-4" aria-hidden="true" />
              Turn stove off
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
