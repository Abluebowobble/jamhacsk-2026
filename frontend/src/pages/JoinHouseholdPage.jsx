import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, ArrowRight, KeyRound, ShieldCheck } from 'lucide-react'
import { api, ApiError } from '../lib/api'
import { useSession } from '../lib/sessionContext'
import { CenteredScreen } from '../app/CenteredScreen'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Button } from '../components/ui/Button'

// The member path of the create / join fork: redeem an invite code an admin
// shared to join their household directly — no device pairing. On success the
// new household becomes active and the dashboard takes over.
export function JoinHouseholdPage() {
  const { setActiveHousehold, refetchHouseholds } = useSession()
  const navigate = useNavigate()

  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [joined, setJoined] = useState(null) // the household, once redeemed

  const trimmed = code.trim()

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    if (!trimmed) {
      setError('Enter the invite code an admin shared with you.')
      return
    }
    setSubmitting(true)
    try {
      const { household } = await api.redeemJoinCode(trimmed)
      setActiveHousehold(household.id)
      await refetchHouseholds()
      setJoined(household)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Couldn’t join with that code. Try again.')
      setSubmitting(false)
    }
  }

  if (joined) {
    return (
      <CenteredScreen>
        <Card className="flex flex-col items-center gap-4 p-7 text-center">
          <span className="grid size-14 place-items-center rounded-full bg-success-subtle text-success-fg">
            <ShieldCheck className="size-7" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-ink">You’re in</h1>
            <p className="mt-1.5 text-sm text-ink-body text-balance">
              You joined <span className="font-medium text-ink">{joined.name}</span> as a member. You
              can now watch over its devices.
            </p>
          </div>
          <Button className="w-full" onClick={() => navigate('/', { replace: true })}>
            Go to dashboard
            <ArrowRight className="size-4" aria-hidden="true" />
          </Button>
        </Card>
      </CenteredScreen>
    )
  }

  return (
    <CenteredScreen>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-ink">Join a household</h1>
        <p className="mt-1.5 text-sm text-ink-body text-balance">
          Enter the invite code an admin shared with you. It joins you to their household as a
          member.
        </p>
      </div>

      <Card as="form" onSubmit={onSubmit} className="flex flex-col gap-4 p-6" noValidate>
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md bg-danger-subtle px-3 py-2.5 text-sm text-danger-fg"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <Field
          label="Invite code"
          name="code"
          placeholder="ABCD2345"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          autoFocus
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={12}
          hint="8 characters — not case-sensitive."
          style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.18em' }}
        />
        <Button type="submit" loading={submitting} className="w-full">
          <KeyRound className="size-4" aria-hidden="true" />
          Join household
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
    </CenteredScreen>
  )
}
