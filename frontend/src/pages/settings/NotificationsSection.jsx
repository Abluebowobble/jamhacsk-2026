import { useEffect, useState } from 'react'
import { ShieldAlert, AlertTriangle, WifiOff, AlertCircle, Info, Smartphone, Share, Plus } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Toggle } from '../../components/ui/Toggle'
import { Skeleton } from '../../components/ui/Skeleton'
import { SettingsGroup } from '../SettingsPage'
import { getPushState, enablePush, disablePush } from '../../lib/push'

// What a subscribed device is alerted about. These are safety-critical by
// design, so they're presented as always-on rather than opt-out toggles —
// muting an auto-shutoff alert is never the right default for a safety
// instrument. Granular opt-outs can land once the backend stores preferences.
const ALERTS = [
  { icon: ShieldAlert, tone: 'text-danger', title: 'Auto-shutoff fired', desc: 'The stove was turned off automatically because no one returned.' },
  { icon: AlertTriangle, tone: 'text-warn', title: 'Buzzer & absence countdown', desc: 'A lit stove was left unattended and the warning window opened.' },
  { icon: WifiOff, tone: 'text-danger', title: 'Device offline', desc: 'A Hestia stopped reporting and can no longer protect that stove.' },
]

export function NotificationsSection() {
  const [loading, setLoading] = useState(true)
  const [state, setState] = useState({ supported: false, configured: false, permission: 'default', subscribed: false, needsInstall: false })
  const [busy, setBusy] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let active = true
    getPushState()
      .then((s) => active && setState(s))
      .finally(() => active && setLoading(false))
    return () => {
      active = false
    }
  }, [])

  const blocked = state.permission === 'denied'
  const unavailable = !state.supported || !state.configured
  const disabled = busy || unavailable || blocked

  // On iOS in a browser tab, the dedicated "Add to Home Screen" block below
  // explains how to unblock push — so suppress the generic reason there.
  const reason = state.needsInstall
    ? null
    : !state.supported
      ? 'Notifications aren’t supported on this browser or device.'
      : !state.configured
        ? 'Notifications aren’t configured for this build yet.'
        : blocked
          ? 'Notifications are blocked. Enable them in your browser settings, then reload.'
          : null

  const onToggle = async (next) => {
    setBusy(true)
    setErrorMsg(null)
    try {
      if (next) await enablePush()
      else await disablePush()
      setState(await getPushState())
    } catch (err) {
      setErrorMsg(err?.message || 'Something went wrong. Try again.')
      setState(await getPushState())
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <SettingsGroup
        title="Push notifications"
        description="Get alerted on this device the moment a safety event happens — even when the app is closed."
      >
        <Card className="p-5">
          {loading ? (
            <Skeleton className="h-6 w-full max-w-md" />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-ink">Alerts on this device</p>
                  <p className="mt-0.5 text-sm text-ink-muted">
                    {state.subscribed ? 'On — this device will receive safety alerts.' : 'Off — this device won’t be alerted.'}
                  </p>
                </div>
                <Toggle
                  checked={state.subscribed}
                  onChange={onToggle}
                  disabled={disabled}
                  label="Push notifications on this device"
                />
              </div>

              {state.needsInstall && <AddToHomeScreen />}
              {reason && (
                <p className="inline-flex items-start gap-1.5 text-sm text-ink-muted">
                  <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {reason}
                </p>
              )}
              {errorMsg && (
                <p className="inline-flex items-start gap-1.5 text-sm text-danger-fg" role="alert">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {errorMsg}
                </p>
              )}
            </div>
          )}
        </Card>
      </SettingsGroup>

      <SettingsGroup
        title="What you’ll be alerted about"
        description="Safety-critical events always notify subscribed devices."
      >
        <Card className="divide-y divide-border">
          {ALERTS.map(({ icon: Icon, tone, title, desc }) => (
            <div key={title} className="flex items-start gap-3 p-4">
              <Icon className={`mt-0.5 size-5 shrink-0 ${tone}`} aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-ink">{title}</p>
                <p className="mt-0.5 text-sm text-ink-body">{desc}</p>
              </div>
            </div>
          ))}
        </Card>
      </SettingsGroup>
    </div>
  )
}

// iOS only exposes Web Push to a Home-Screen-installed PWA, never to a Safari
// tab — so on iPhone/iPad the toggle above can't work until Hestia is installed.
// Spell out the one-time Add-to-Home-Screen steps instead of a dead end.
function AddToHomeScreen() {
  const steps = [
    <>Tap the Share button <Share className="inline size-4 -translate-y-px text-primary" aria-hidden="true" /> in Safari’s toolbar.</>,
    <>Choose <span className="font-medium text-ink">“Add to Home Screen”</span> <Plus className="inline size-4 -translate-y-px text-primary" aria-hidden="true" />.</>,
    <>Open Hestia from your Home Screen, then turn alerts on here.</>,
  ]
  return (
    <div className="rounded-lg bg-surface-sunken p-4">
      <p className="flex items-start gap-1.5 text-sm font-medium text-ink">
        <Smartphone className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
        Add Hestia to your Home Screen to get alerts
      </p>
      <p className="mt-1 text-sm text-ink-muted">
        On iPhone &amp; iPad, safety alerts only work from the installed app.
      </p>
      <ol className="mt-3 flex flex-col gap-2">
        {steps.map((step, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-ink-body">
            <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-fg">
              {i + 1}
            </span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
