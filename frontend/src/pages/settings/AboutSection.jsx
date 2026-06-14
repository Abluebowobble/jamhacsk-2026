import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Sun, SlidersHorizontal, ChevronRight, BellRing, Check, AlertCircle } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { Logo } from '../../components/Logo'
import { SettingsGroup } from '../SettingsPage'
import { api } from '../../lib/api'

export function AboutSection() {
  return (
    <div className="flex flex-col gap-8">
      <SettingsGroup title="About Hestia">
        <Card className="flex flex-col gap-4 p-5">
          <div className="flex items-center gap-3">
            <Logo />
          </div>
          <p className="max-w-prose text-sm text-ink-body">
            A smart stove-safety system. A Raspberry Pi watches the stove and runs the safety loop
            locally; this app is the trustworthy window onto it — live status, control, and alerts.
          </p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
            <dt className="text-ink-muted">Safety loop</dt>
            <dd className="inline-flex items-center gap-1.5 text-ink-body">
              <ShieldCheck className="size-4 text-success" aria-hidden="true" />
              Runs on the device, not the cloud
            </dd>
            <dt className="text-ink-muted">Appearance</dt>
            <dd className="inline-flex items-center gap-1.5 text-ink-body">
              <Sun className="size-4 text-ink-muted" aria-hidden="true" />
              Light theme — tuned for half-second legibility
            </dd>
          </dl>
        </Card>
      </SettingsGroup>

      <SettingsGroup
        title="Test notifications"
        description="Send a notification to this device to confirm alerts are getting through."
      >
        <Card className="p-5">
          <TestNotificationButton />
        </Card>
      </SettingsGroup>

      <SettingsGroup
        title="Safety thresholds"
        description="Absence timeout and warning delay are set per device, on each device’s page."
      >
        <Card>
          <Link
            to="/"
            className="flex items-center gap-3 p-4 transition-colors hover:bg-surface-sunken"
          >
            <SlidersHorizontal className="size-5 shrink-0 text-ink-muted" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-ink">Open a device to adjust thresholds</span>
              <span className="block text-sm text-ink-body">Go to Devices, then choose the stove you want to tune.</span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-ink-faint" aria-hidden="true" />
          </Link>
        </Card>
      </SettingsGroup>
    </div>
  )
}

// Fires a test push to the signed-in user's subscribed devices. Surfaces the
// outcome inline — including the common "you haven't enabled notifications yet"
// case the backend returns — so it doubles as a delivery check.
function TestNotificationButton() {
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [errorMsg, setErrorMsg] = useState(null)

  const send = async () => {
    setStatus('sending')
    setErrorMsg(null)
    try {
      await api.pushTest()
      setStatus('sent')
    } catch (err) {
      setErrorMsg(err?.message || 'Could not send the test notification.')
      setStatus('error')
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-body">
          You should see a “Hestia test” notification within a few seconds.
        </p>
        <Button size="sm" onClick={send} loading={status === 'sending'} disabled={status === 'sending'}>
          <BellRing className="size-4" aria-hidden="true" />
          Send test
        </Button>
      </div>
      {status === 'sent' && (
        <p className="inline-flex items-start gap-1.5 text-sm text-success-fg">
          <Check className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Sent — check this device’s notifications.
        </p>
      )}
      {status === 'error' && (
        <p className="inline-flex items-start gap-1.5 text-sm text-danger-fg" role="alert">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          {errorMsg}
        </p>
      )}
    </div>
  )
}
