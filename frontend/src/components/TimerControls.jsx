import { useState } from 'react'
import { Timer, X, Plus } from 'lucide-react'
import { Button } from './ui/Button'
import { CountdownReadout } from './CountdownReadout'
import { actions } from '../lib/store'
import { useCan } from '../lib/roles'
import { formatDuration } from '../lib/format'

const PRESETS = [5, 10, 20, 45]

export function TimerControls({ device }) {
  const canSet = useCan('setTimer')
  const canCancel = useCan('cancelTimer')
  const [custom, setCustom] = useState('')

  if (device.timer) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Timer className="size-5 text-primary" aria-hidden="true" />
          <CountdownReadout
            secs={device.timer.remainingSecs}
            label={`of ${formatDuration(device.timer.durationSecs)}`}
            tone="neutral"
            size="md"
          />
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canCancel}
          onClick={() => actions.cancelTimer(device.id)}
        >
          <X className="size-4" aria-hidden="true" />
          Cancel
        </Button>
      </div>
    )
  }

  const customMins = Number(custom)
  const customValid = Number.isFinite(customMins) && customMins > 0 && customMins <= 600

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ink-body">No timer running. Start one:</p>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((m) => (
          <Button
            key={m}
            variant="secondary"
            size="sm"
            disabled={!canSet}
            onClick={() => actions.createTimer(device.id, m * 60)}
          >
            {m} min
          </Button>
        ))}
        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (customValid) {
              actions.createTimer(device.id, Math.round(customMins * 60))
              setCustom('')
            }
          }}
        >
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={600}
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            disabled={!canSet}
            placeholder="Custom"
            aria-label="Custom timer minutes"
            className="h-9 w-24 rounded-md border border-border-strong bg-surface px-3 text-sm text-ink placeholder:text-ink-muted disabled:opacity-50"
          />
          <Button type="submit" size="sm" disabled={!canSet || !customValid}>
            <Plus className="size-4" aria-hidden="true" />
            Set
          </Button>
        </form>
      </div>
    </div>
  )
}
