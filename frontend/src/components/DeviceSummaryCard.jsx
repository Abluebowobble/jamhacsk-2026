import { Camera } from 'lucide-react'
import { StatusPanel } from './StatusPanel'
import { CountdownReadout } from './CountdownReadout'
import {
  computePhase,
  activeCountdown,
  stovePanel,
  presencePanel,
  PHASE_META,
} from '../lib/deviceState'
import { cx } from '../lib/cx'

// The device hero. Three big solid panels answer the glance — stove (which is
// also the on/off control), presence, and camera (opens the stream). A phase
// line states the synthesized consequence + live countdown. When the stove is
// unattended (or worse) the PHASE LINE washes a different color so it can't be
// missed: amber for warning states, red for danger. The tint stays on the
// header banner only — the panel grid keeps its full width in every state, so
// switching between calm and alerted devices never reflows the icons.

const HEAD = {
  success: 'text-success-fg',
  primary: 'text-primary',
  warn: 'text-warn-fg',
  danger: 'text-danger-fg',
  neutral: 'text-ink',
}

const TINT = {
  warn: 'rounded-xl border border-warn/40 bg-warn-subtle px-3 py-2.5',
  danger: 'rounded-xl border border-danger/30 bg-danger-subtle px-3 py-2.5',
}

export function DeviceSummaryCard({
  device,
  onToggleStove,
  onOpenCamera,
  canViewCamera = false,
}) {
  const phase = computePhase(device)
  const meta = PHASE_META[phase]
  const countdown = activeCountdown(device, phase)
  const PhaseIcon = meta.Icon
  const tinted = meta.tone === 'warn' || meta.tone === 'danger'

  const stove = stovePanel(device)
  const presence = presencePanel(device, phase)

  const canToggle = device.online && Boolean(onToggleStove)
  const canOpenCam = device.online && canViewCamera && Boolean(onOpenCamera)

  return (
    <section className="flex flex-col gap-4">
      <div className={cx('flex items-center gap-3', tinted && TINT[meta.tone])}>
        <PhaseIcon className={cx('size-5 shrink-0', HEAD[meta.tone])} aria-hidden="true" />
        <div className="min-w-0">
          <p
            className={cx(
              'font-semibold leading-tight',
              tinted ? 'text-lg' : 'text-base',
              HEAD[meta.tone],
            )}
          >
            {meta.label}
          </p>
          <p className={cx('text-sm', tinted ? 'text-ink-body' : 'text-ink-muted')}>
            {meta.detail}
          </p>
        </div>
        {countdown && (
          <CountdownReadout
            secs={countdown.secs}
            label={countdown.label}
            tone={meta.tone === 'danger' ? 'danger' : 'warn'}
            size="md"
            className="ml-auto items-end text-right"
          />
        )}
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        <StatusPanel
          label="Stove"
          tone={stove.tone}
          icon={stove.icon}
          value={stove.value}
          onClick={canToggle ? onToggleStove : undefined}
          ariaLabel={device.stoveOn ? 'Turn stove off' : 'Turn stove on'}
          hint={
            canToggle
              ? device.stoveOn
                ? 'Tap to turn off'
                : 'Tap to turn on'
              : device.stoveOn
                ? 'Burner on'
                : 'Burner off'
          }
        />
        <StatusPanel
          label="Presence"
          tone={presence.tone}
          icon={presence.icon}
          value={presence.value}
          pulse={presence.pulse}
          hint={!device.online ? 'Last known' : device.presence ? 'Nearby' : 'No one near'}
        />
        <StatusPanel
          label="Camera"
          tone={device.online ? 'dark' : 'neutral'}
          icon={Camera}
          value={device.online ? 'Live' : 'Off'}
          onClick={canOpenCam ? onOpenCamera : undefined}
          ariaLabel="View camera"
          hint={
            !device.online ? 'Offline' : canViewCamera ? 'Tap to view' : 'Restricted'
          }
        />
      </div>
    </section>
  )
}
