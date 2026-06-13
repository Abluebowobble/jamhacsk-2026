// TEMPORARY preview harness — public route, no auth. Lets you see the device
// hero + overview cards without the login/backend gate. Delete this file and
// its route in router.jsx when done.
import { DeviceSummaryCard } from '../components/DeviceSummaryCard'
import { DeviceCard } from '../components/DeviceCard'

const base = {
  id: 'p',
  name: 'Kitchen Stove',
  householdId: 'h',
  online: true,
  stoveOn: true,
  presence: true,
  absenceTimeout: 300,
  warningDelay: 30,
  absenceElapsed: null,
  warningElapsed: null,
  justShutoffAt: null,
  timer: null,
}

const variants = [
  { title: 'Attended', d: base },
  { title: 'Stove off', d: { ...base, stoveOn: false, presence: false } },
  { title: 'Unattended (counting down)', d: { ...base, presence: false, absenceElapsed: 120 } },
  { title: 'Warning', d: { ...base, presence: false, warningElapsed: 8 } },
  { title: 'Auto shut-off', d: { ...base, stoveOn: false, presence: false, justShutoffAt: 1 } },
  { title: 'Offline', d: { ...base, online: false } },
]

const grid = [
  { ...base, id: '1', name: 'Kitchen Stove' },
  { ...base, id: '2', name: 'Basement Hot Plate', presence: false, absenceElapsed: 120 },
  { ...base, id: '3', name: 'Studio Range', stoveOn: false, presence: false },
  { ...base, id: '4', name: 'Garage Burner', online: false },
  {
    ...base,
    id: '5',
    name: 'Cabin Stove',
    timer: { id: 't', durationSecs: 900, endsAt: 0, remainingSecs: 724 },
  },
  { ...base, id: '6', name: 'Loft Cooktop', presence: false, warningElapsed: 8 },
]

export function SummaryPreview() {
  return (
    <div className="min-h-svh bg-bg p-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-ink-muted">Overview grid — DeviceCard</p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {grid.map((d) => (
              <DeviceCard key={d.id} device={d} />
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-ink-muted">Device hero — DeviceSummaryCard</p>
          <div className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {variants.map((v) => (
              <div key={v.title} className="flex flex-col gap-3">
                <p className="text-xs font-medium text-ink-faint">{v.title}</p>
                <DeviceSummaryCard device={v.d} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
