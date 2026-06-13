import { useEffect, useState } from 'react'
import { Plus, Nfc, RadioTower, Cpu } from 'lucide-react'
import { DeviceCard } from '../components/DeviceCard'
import { EmptyState } from '../components/EmptyState'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Skeleton } from '../components/ui/Skeleton'
import { Modal } from '../components/ui/Modal'
import { useDevices, useHouseholds } from '../lib/store'
import { useHousehold } from '../lib/householdContext'

export function OverviewPage() {
  const { householdId } = useHousehold()
  const households = useHouseholds()
  const devices = useDevices(householdId)
  const household = households.find((h) => h.id === householdId)

  const [loading, setLoading] = useState(true)
  const [pairing, setPairing] = useState(false)

  // Brief initial fetch — shows skeletons rather than a content flash.
  useEffect(() => {
    setLoading(true)
    const t = setTimeout(() => setLoading(false), 550)
    return () => clearTimeout(t)
  }, [householdId])

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
        <Button onClick={() => setPairing(true)}>
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
          description="Pair a Hestia by tapping its NFC tag, or add it from another household you manage."
          action={
            <Button onClick={() => setPairing(true)}>
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

      <PairModal open={pairing} onClose={() => setPairing(false)} />
    </div>
  )
}

function PairModal({ open, onClose }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Pair a device"
      description="Tap your phone to the NFC tag on the Hestia unit to begin."
    >
      <div className="flex flex-col items-center gap-4 py-2">
        <span className="relative grid size-20 place-items-center rounded-full bg-primary-subtle text-primary">
          <span className="hestia-pulse-warn absolute inset-0 rounded-full" aria-hidden="true" />
          <Nfc className="size-9" aria-hidden="true" />
        </span>
        <p className="text-center text-sm text-ink-body">
          Waiting for an NFC tag… Hold your phone near the sticker on the device.
        </p>
        <ul className="mt-1 w-full space-y-2 text-sm text-ink-muted">
          <li className="flex items-center gap-2">
            <RadioTower className="size-4" aria-hidden="true" />
            New devices can start a fresh household or join an existing one.
          </li>
          <li className="flex items-center gap-2">
            <Cpu className="size-4" aria-hidden="true" />
            Already-paired devices send a join request to the admin.
          </li>
        </ul>
      </div>
    </Modal>
  )
}
