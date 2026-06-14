import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Nfc, ShieldCheck, Users, AlertTriangle, Clock, ArrowLeft } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { useSession } from '../lib/sessionContext'
import { readSafetyDefaults } from '../lib/preferences'
import { CenteredScreen } from '../app/CenteredScreen'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Button } from '../components/ui/Button'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// NFC deep-link target: hestia.app/pair?device_id=…  (PRD §6.2). Also reachable
// from onboarding with manual ID entry. Resolves the device's pairing status,
// then routes to Case A (unpaired → pair to a household) or Case B (already
// paired → request access from that household's admin).
export function PairPage() {
  const [params] = useSearchParams()
  const deviceParam = params.get('device_id')

  const [deviceId, setDeviceId] = useState(deviceParam ?? '')
  const [status, setStatus] = useState(null) // pairing-status payload
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function checkStatus(id) {
    setLoading(true)
    setError(null)
    setStatus(null)
    try {
      const result = await api.pairingStatus(id)
      setStatus(result)
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError('We couldn’t find that device. Check the ID on the unit and try again.')
      } else {
        setError(err instanceof ApiError ? err.message : 'Couldn’t reach the device. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  // Auto-check when arriving via an NFC deep link (?device_id=…).
  useEffect(() => {
    // Deliberate fetch-on-mount; setState lives inside the async call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (deviceParam && UUID_RE.test(deviceParam)) checkStatus(deviceParam)
  }, [deviceParam])

  function reset() {
    setStatus(null)
    setError(null)
  }

  return (
    <CenteredScreen>
      {loading ? (
        <PairCard>
          <PairIcon pulse />
          <p className="text-center text-sm text-ink-body">Checking the device…</p>
        </PairCard>
      ) : status ? (
        status.paired ? (
          <CaseAlreadyPaired status={status} onBack={reset} />
        ) : (
          <CaseUnpaired deviceId={deviceId} onBack={reset} />
        )
      ) : (
        <ManualEntry
          deviceId={deviceId}
          setDeviceId={setDeviceId}
          error={error}
          onSubmit={(id) => checkStatus(id)}
        />
      )}
    </CenteredScreen>
  )
}

// ---- manual device-ID entry (non-NFC contexts) ----------------------------

function ManualEntry({ deviceId, setDeviceId, error, onSubmit }) {
  const navigate = useNavigate()
  const [localError, setLocalError] = useState(null)

  function submit(e) {
    e.preventDefault()
    const id = deviceId.trim()
    if (!UUID_RE.test(id)) {
      setLocalError('That doesn’t look like a valid device ID.')
      return
    }
    setLocalError(null)
    onSubmit(id)
  }

  return (
    <>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-ink">Pair a device</h1>
        <p className="mt-1.5 text-sm text-ink-body">
          Tap the NFC tag on your Hestia unit — or enter the pairing ID printed beneath it.
        </p>
      </div>
      <Card as="form" onSubmit={submit} className="flex flex-col gap-4 p-6" noValidate>
        <Field
          label="Device pairing ID"
          name="device_id"
          placeholder="e.g. 3f0c…-…-…"
          value={deviceId}
          onChange={(e) => setDeviceId(e.target.value)}
          error={localError || error}
          autoFocus
        />
        <Button type="submit" className="w-full">
          Continue
        </Button>
      </Card>
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mx-auto mt-6 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-body"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back
      </button>
    </>
  )
}

// ---- Case A: device is unpaired → assign to a household --------------------

function CaseUnpaired({ deviceId, onBack }) {
  const { households, activeId, setActiveHousehold, refetchHouseholds, refetchDevices } = useSession()
  const { user } = useAuth()
  const navigate = useNavigate()

  const NEW = '__new__'
  const [choice, setChoice] = useState(households.length ? activeId ?? households[0].id : NEW)
  const [newName, setNewName] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const creating = choice === NEW

  async function submit(e) {
    e.preventDefault()
    setError(null)
    if (creating && !newName.trim()) {
      setError('Give your household a name.')
      return
    }
    setSubmitting(true)
    try {
      const householdId = creating
        ? (await api.createHousehold(newName.trim())).id
        : choice
      await api.pairDevice(deviceId, householdId)
      // Apply the owner's chosen safety defaults to the freshly paired device.
      // Best-effort: if it fails, the device keeps its factory timings.
      const defaults = readSafetyDefaults(user?.id)
      if (defaults) {
        try {
          await api.updateSafety(deviceId, defaults)
        } catch {
          /* non-fatal — pairing still succeeded */
        }
      }
      setActiveHousehold(householdId)
      await Promise.all([refetchHouseholds(), refetchDevices(householdId)])
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t pair the device. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <>
      <div className="mb-6 text-center">
        <PairIcon tone="success" icon={ShieldCheck} />
        <h1 className="mt-4 text-2xl font-semibold text-ink">Ready to pair</h1>
        <p className="mt-1.5 text-sm text-ink-body">
          This device isn’t connected yet. Choose the household it should belong to.
        </p>
      </div>

      <Card as="form" onSubmit={submit} className="flex flex-col gap-4 p-6" noValidate>
        {households.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="hh-select" className="text-sm font-medium text-ink">
              Household
            </label>
            <select
              id="hh-select"
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              className="h-11 w-full rounded-md border border-border-strong bg-surface px-3 text-sm text-ink hover:border-ink-faint"
            >
              {households.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
              <option value={NEW}>Create a new household…</option>
            </select>
          </div>
        )}

        {creating && (
          <Field
            label="New household name"
            name="household"
            placeholder="Home"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            error={error}
            autoFocus
            maxLength={100}
          />
        )}

        {error && !creating && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md bg-danger-subtle px-3 py-2.5 text-sm text-danger-fg"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" loading={submitting} className="w-full">
          {creating ? 'Create household & pair' : 'Pair this device'}
        </Button>
      </Card>

      <BackLink onBack={onBack} />
    </>
  )
}

// ---- Case B: device already belongs to a household → request access --------

function CaseAlreadyPaired({ status, onBack }) {
  const [submitting, setSubmitting] = useState(false)
  const [requested, setRequested] = useState(false)
  const [error, setError] = useState(null)

  async function requestAccess() {
    setSubmitting(true)
    setError(null)
    try {
      await api.requestJoin(status.householdId)
      setRequested(true)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // Already a member or request already pending — treat as success.
        setRequested(true)
      } else {
        setError(err instanceof ApiError ? err.message : 'Couldn’t send your request. Try again.')
        setSubmitting(false)
      }
    }
  }

  if (requested) {
    return (
      <>
        <PairCard>
          <PairIcon tone="warn" icon={Clock} />
          <h1 className="mt-1 text-center text-xl font-semibold text-ink">Request sent</h1>
          <p className="text-center text-sm text-ink-body">
            We’ve asked an admin of{' '}
            <span className="font-medium text-ink">{status.householdName ?? 'this household'}</span>{' '}
            to approve your access. You’ll be notified once they do.
          </p>
        </PairCard>
        <BackLink onBack={onBack} label="Pair a different device" />
      </>
    )
  }

  return (
    <>
      <div className="mb-6 text-center">
        <PairIcon tone="primary" icon={Users} />
        <h1 className="mt-4 text-2xl font-semibold text-ink">Already in use</h1>
        <p className="mt-1.5 text-sm text-ink-body">
          This device already belongs to{' '}
          <span className="font-medium text-ink">{status.householdName ?? 'another household'}</span>.
          Request access and an admin can add you as a member.
        </p>
      </div>

      <Card className="flex flex-col gap-4 p-6">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md bg-danger-subtle px-3 py-2.5 text-sm text-danger-fg"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
        <Button onClick={requestAccess} loading={submitting} className="w-full">
          Request access
        </Button>
      </Card>

      <BackLink onBack={onBack} />
    </>
  )
}

// ---- small shared bits -----------------------------------------------------

const TONES = {
  primary: 'bg-primary-subtle text-primary',
  success: 'bg-success-subtle text-success-fg',
  warn: 'bg-warn-subtle text-warn-fg',
}

function PairIcon({ tone = 'primary', icon: Icon = Nfc, pulse = false }) {
  return (
    <span className={`relative mx-auto grid size-16 place-items-center rounded-full ${TONES[tone]}`}>
      {pulse && <span className="hestia-pulse-warn absolute inset-0 rounded-full" aria-hidden="true" />}
      <Icon className="size-8" aria-hidden="true" />
    </span>
  )
}

function PairCard({ children }) {
  return <Card className="flex flex-col items-center gap-4 p-7">{children}</Card>
}

function BackLink({ onBack, label = 'Back' }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="mx-auto mt-6 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-body"
    >
      <ArrowLeft className="size-4" aria-hidden="true" />
      {label}
    </button>
  )
}
