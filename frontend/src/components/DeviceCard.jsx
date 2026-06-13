import { Link } from 'react-router-dom'
import { Flame, Power, Wifi, WifiOff, Timer, ChevronRight, UserCheck, UserX } from 'lucide-react'
import { Card } from './ui/Card'
import { StatusBadge } from './StatusBadge'
import { CountdownReadout } from './CountdownReadout'
import { computePhase, activeCountdown, PHASE } from '../lib/deviceState'
import { formatCountdown } from '../lib/format'
import { cx } from '../lib/cx'

// Overview grid primitive. The whole card is the link to the device page.
export function DeviceCard({ device }) {
  const phase = computePhase(device)
  const countdown = activeCountdown(device, phase)
  const isAlarm = phase === PHASE.WARNING || phase === PHASE.SHUTOFF

  return (
    <Card
      as={Link}
      to={`/devices/${device.id}`}
      interactive
      className={cx(
        'group flex flex-col gap-4 p-5 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2',
        phase === PHASE.WARNING && 'hestia-pulse-warn border-warn/50',
        phase === PHASE.SHUTOFF && 'border-danger/40',
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

      {/* The half-second answer: countdown when it matters, facts otherwise. */}
      {countdown ? (
        <CountdownReadout
          secs={countdown.secs}
          label={countdown.label}
          tone={isAlarm ? 'warn' : 'warn'}
          size="md"
        />
      ) : (
        <dl className="flex items-center gap-5">
          <Fact
            icon={device.stoveOn ? Flame : Power}
            tone={device.stoveOn ? 'primary' : 'muted'}
            label="Stove"
            value={device.stoveOn ? 'On' : 'Off'}
          />
          {device.stoveOn && (
            <Fact
              icon={device.presence ? UserCheck : UserX}
              tone={device.presence ? 'success' : 'warn'}
              label="Presence"
              value={device.presence ? 'Detected' : 'Absent'}
            />
          )}
        </dl>
      )}

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
          <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </span>
      </div>
    </Card>
  )
}

const TONE = {
  primary: 'text-primary',
  success: 'text-success',
  warn: 'text-warn-fg',
  muted: 'text-ink-faint',
}

function Fact({ icon: Icon, tone, label, value }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-ink-muted">{label}</dt>
      <dd className={cx('inline-flex items-center gap-1.5 text-sm font-medium text-ink')}>
        <Icon className={cx('size-4', TONE[tone])} aria-hidden="true" />
        {value}
      </dd>
    </div>
  )
}
