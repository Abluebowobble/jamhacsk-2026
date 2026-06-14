import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Home, Nfc, ArrowRight, LogOut, Clock } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { useSession } from '../lib/sessionContext'
import {
  DEFAULT_ABSENCE_TIMEOUT,
  DEFAULT_WARNING_DELAY,
  hasSafetyDefaults,
  writeSafetyDefaults,
} from '../lib/preferences'
import { CenteredScreen } from '../app/CenteredScreen'
import { Splash } from '../app/Splash'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Button } from '../components/ui/Button'

// Three-step gate after sign-in:
//   1. No household        → create one (joining happens by pairing a device).
//   2. Defaults not set    → pick the safety timings new devices start with.
//   3. Household, no device → prompt to pair (deferrable for the session).
// Each step is derived from session/account state, so completing one advances here.
export function OnboardingPage() {
  const { households, householdsLoading, devices, devicesLoading, deferPairing, refetchHouseholds, setActiveHousehold } =
    useSession()
  const { user, signOut } = useAuth()
  const navigate = useNavigate()

  // Local mirror so saving the defaults advances the gate without a refetch.
  const [defaultsSet, setDefaultsSet] = useState(() => hasSafetyDefaults(user?.id))

  if (householdsLoading) return <Splash label="Loading your account…" />

  // Step 1 — no household yet.
  if (households.length === 0) {
    return (
      <CreateHouseholdStep
        onCreated={async (household) => {
          setActiveHousehold(household.id)
          await refetchHouseholds()
          // Stays on /onboarding; re-renders into the next step.
        }}
        onSignOut={signOut}
      />
    )
  }

  // Step 2 — choose the safety defaults applied to each device on pairing.
  if (!defaultsSet) {
    return <SafetyDefaultsStep userId={user?.id} onSaved={() => setDefaultsSet(true)} />
  }

  if (devicesLoading) return <Splash label="Checking your devices…" />

  // Step 3 — household exists but no device paired.
  if (devices.length === 0) {
    return (
      <PairPromptStep
        onSkip={() => {
          deferPairing()
          navigate('/', { replace: true })
        }}
        onPair={() => navigate('/pair')}
      />
    )
  }

  // Already set up — hand back to the dashboard gate.
  return <Navigate to="/" replace />
}

function CreateHouseholdStep({ onCreated, onSignOut }) {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Give your household a name.')
      return
    }
    setSubmitting(true)
    try {
      const household = await api.createHousehold(name.trim())
      await onCreated(household)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t create your household. Try again.')
      setSubmitting(false)
    }
  }

  return (
    <CenteredScreen>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-ink">Set up your household</h1>
        <p className="mt-1.5 text-sm text-ink-body">
          A household groups your Hestia devices and the people who watch over them. You’ll be its
          admin.
        </p>
      </div>

      <Card as="form" onSubmit={onSubmit} className="flex flex-col gap-4 p-6" noValidate>
        <Field
          label="Household name"
          name="household"
          placeholder="Home"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
          autoFocus
          maxLength={100}
        />
        <Button type="submit" loading={submitting} className="w-full">
          <Home className="size-4" aria-hidden="true" />
          Create household
        </Button>
      </Card>

      <Card className="mt-4 flex items-start gap-3 p-4">
        <Nfc className="mt-0.5 size-5 shrink-0 text-ink-muted" aria-hidden="true" />
        <div className="text-sm">
          <p className="font-medium text-ink">Joining someone’s household?</p>
          <p className="mt-0.5 text-ink-body">
            Tap your Hestia’s NFC tag, or{' '}
            <button
              type="button"
              onClick={() => navigate('/pair')}
              className="font-medium text-primary hover:text-primary-hover"
            >
              enter its pairing ID
            </button>{' '}
            to request access.
          </p>
        </div>
      </Card>

      <SignOutLink onSignOut={onSignOut} />
    </CenteredScreen>
  )
}

// Default absence timeout + warning delay, in seconds. Same validation as the
// per-device SafetySettings form (PRD §15): both > 0, warning shorter than the
// absence timeout. Saved per-account and applied to each device when it pairs.
function SafetyDefaultsStep({ userId, onSaved }) {
  const [absence, setAbsence] = useState(String(DEFAULT_ABSENCE_TIMEOUT))
  const [warning, setWarning] = useState(String(DEFAULT_WARNING_DELAY))

  const a = Number(absence)
  const w = Number(warning)
  const absenceErr =
    absence === '' || !Number.isFinite(a) || a <= 0 ? 'Must be greater than 0.' : null
  const warningErr =
    warning === '' || !Number.isFinite(w) || w <= 0
      ? 'Must be greater than 0.'
      : !absenceErr && w >= a
        ? 'Must be shorter than the absence timeout.'
        : null
  const valid = !absenceErr && !warningErr

  function save(defaults) {
    writeSafetyDefaults(userId, defaults)
    onSaved()
  }

  function onSubmit(e) {
    e.preventDefault()
    if (!valid) return
    save({ absenceTimeout: Math.round(a), warningDelay: Math.round(w) })
  }

  return (
    <CenteredScreen>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-ink">Set your safety defaults</h1>
        <p className="mt-1.5 text-sm text-ink-body">
          Choose how long Hestia waits before it steps in. Every device you pair starts with
          these — you can fine-tune any device later.
        </p>
      </div>

      <Card as="form" onSubmit={onSubmit} className="flex flex-col gap-4 p-6" noValidate>
        <Field
          label="Absence timeout"
          type="number"
          inputMode="numeric"
          min={1}
          suffix="sec"
          value={absence}
          onChange={(e) => setAbsence(e.target.value)}
          error={absenceErr}
          hint="Time with no one detected before the buzzer."
          autoFocus
        />
        <Field
          label="Warning delay"
          type="number"
          inputMode="numeric"
          min={1}
          suffix="sec"
          value={warning}
          onChange={(e) => setWarning(e.target.value)}
          error={warningErr}
          hint="Buzzer time before the stove shuts off."
        />
        <Button type="submit" disabled={!valid} className="w-full">
          <Clock className="size-4" aria-hidden="true" />
          Save defaults
        </Button>
        <button
          type="button"
          onClick={() =>
            save({ absenceTimeout: DEFAULT_ABSENCE_TIMEOUT, warningDelay: DEFAULT_WARNING_DELAY })
          }
          className="text-sm font-medium text-ink-muted hover:text-ink-body"
        >
          Use recommended ({DEFAULT_ABSENCE_TIMEOUT}s / {DEFAULT_WARNING_DELAY}s)
        </button>
      </Card>
    </CenteredScreen>
  )
}

function PairPromptStep({ onPair, onSkip }) {
  return (
    <CenteredScreen>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-ink">Pair your Hestia</h1>
        <p className="mt-1.5 text-sm text-ink-body">
          Connect a device to start watching your stove. Tap the NFC tag on the unit, or enter its
          pairing ID.
        </p>
      </div>

      <Card className="flex flex-col items-center gap-5 p-7">
        <span className="relative grid size-20 place-items-center rounded-full bg-primary-subtle text-primary">
          <span className="hestia-pulse-warn absolute inset-0 rounded-full" aria-hidden="true" />
          <Nfc className="size-9" aria-hidden="true" />
        </span>
        <Button onClick={onPair} className="w-full">
          Pair a device
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm font-medium text-ink-muted hover:text-ink-body"
        >
          I’ll do this later
        </button>
      </Card>
    </CenteredScreen>
  )
}

function SignOutLink({ onSignOut }) {
  return (
    <button
      type="button"
      onClick={onSignOut}
      className="mx-auto mt-6 flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink-body"
    >
      <LogOut className="size-4" aria-hidden="true" />
      Sign out
    </button>
  )
}
