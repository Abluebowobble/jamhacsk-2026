import { useNavigate } from 'react-router-dom'
import { Plus, Nfc } from 'lucide-react'
import { DeviceCard } from '../components/DeviceCard'
import { EmptyState } from '../components/EmptyState'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { useDevices, useDevicesLoading, useHouseholds } from '../lib/store'
import { useHousehold } from '../lib/householdContext'

export function OverviewPage() {
  const { householdId } = useHousehold()
  const households = useHouseholds()
  const devices = useDevices(householdId)
  const loading = useDevicesLoading(householdId)
  const household = households.find((h) => h.id === householdId)
  const navigate = useNavigate()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink sm:text-3xl">Devices</h1>
          <p className="mt-1 text-sm text-ink-body">
            {household?.name} ·{' '}
            {loading ? 'Loading…' : `${devices.length} ${devices.length === 1 ? 'device' : 'devices'}`}
          </p>
        </div>
        <Button onClick={() => navigate('/pair')}>
          <Plus className="size-4" aria-hidden="true" />
          Pair device
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              <Skeleton className="h-9 w-24" />
              <Skeleton className="mt-2 h-4 w-full" />
            </Card>
          ))}
        </div>
      ) : devices.length === 0 ? (
        <EmptyState
          icon={Nfc}
          title="No devices in this household"
          description="Pair a Hestia by tapping its NFC tag, or enter its pairing ID to add it here."
          action={
            <Button onClick={() => navigate('/pair')}>
              <Plus className="size-4" aria-hidden="true" />
              Pair device
            </Button>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {devices.map((d) => (
            <DeviceCard key={d.id} device={d} />
          ))}
        </div>
      )}
    </div>
  )
}
