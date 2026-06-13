import { Link } from 'react-router-dom'
import { ShieldCheck, Sun, SlidersHorizontal, ChevronRight } from 'lucide-react'
import { Card } from '../../components/ui/Card'
import { Logo } from '../../components/Logo'
import { SettingsGroup } from '../SettingsPage'

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
