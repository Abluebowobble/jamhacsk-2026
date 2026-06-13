import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AlertTriangle, MailCheck } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/authContext'
import { CenteredScreen } from '../app/CenteredScreen'
import { Card } from '../components/ui/Card'
import { Field } from '../components/ui/Field'
import { Button } from '../components/ui/Button'

const MODES = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to check on your stove.',
    submit: 'Log in',
  },
  signup: {
    title: 'Create your account',
    subtitle: 'Set up Hestia to keep your stove safe.',
    submit: 'Create account',
  },
}

export function AuthPage() {
  const { status } = useAuth()
  const location = useLocation()
  // Preserve the full target (path + query) so an NFC deep-link like
  // /pair?device_id=… survives the bounce through login.
  const fromLocation = location.state?.from
  const from = fromLocation ? `${fromLocation.pathname}${fromLocation.search ?? ''}` : '/'

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkEmail, setCheckEmail] = useState(false)

  // Already signed in (e.g. opened /login directly) — send them onward.
  if (status === 'authed') return <Navigate to={from} replace />

  const copy = MODES[mode]

  function switchMode(next) {
    if (next === mode) return
    setMode(next)
    setFieldErrors({})
    setFormError(null)
  }

  function validate() {
    const errs = {}
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) errs.email = 'Enter a valid email address.'
    if (password.length < 6) errs.password = 'Use at least 6 characters.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function onSubmit(e) {
    e.preventDefault()
    setFormError(null)
    if (!validate()) return

    setSubmitting(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        // AuthProvider picks up the session; the <Navigate> above fires on re-render.
      } else {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) throw error
        // If the project requires email confirmation there's no session yet.
        if (!data.session) {
          setCheckEmail(true)
          return
        }
      }
    } catch (err) {
      setFormError(friendlyAuthError(err, mode))
    } finally {
      setSubmitting(false)
    }
  }

  if (checkEmail) {
    return (
      <CenteredScreen>
        <Card className="flex flex-col items-center gap-4 p-7 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-primary-subtle text-primary">
            <MailCheck className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-ink">Confirm your email</h1>
            <p className="mt-1.5 text-sm text-ink-body">
              We sent a confirmation link to <span className="font-medium text-ink">{email}</span>.
              Open it to finish setting up your account, then come back to log in.
            </p>
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              setCheckEmail(false)
              switchMode('login')
            }}
          >
            Back to log in
          </Button>
        </Card>
      </CenteredScreen>
    )
  }

  return (
    <CenteredScreen>
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-semibold text-ink">{copy.title}</h1>
        <p className="mt-1.5 text-sm text-ink-body">{copy.subtitle}</p>
      </div>

      <Card as="form" onSubmit={onSubmit} className="flex flex-col gap-4 p-6" noValidate>
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-md bg-danger-subtle px-3 py-2.5 text-sm text-danger-fg"
          >
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{formError}</span>
          </div>
        )}

        <Field
          label="Email"
          type="email"
          name="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          required
        />

        <Field
          label="Password"
          type="password"
          name="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          placeholder={mode === 'login' ? 'Your password' : 'At least 6 characters'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldErrors.password}
          required
        />

        <Button type="submit" loading={submitting} className="mt-1 w-full">
          {copy.submit}
        </Button>
      </Card>

      <p className="mt-5 text-center text-sm text-ink-muted">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <button
          type="button"
          onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          className="font-medium text-primary hover:text-primary-hover"
        >
          {mode === 'login' ? 'Create one' : 'Log in'}
        </button>
      </p>
    </CenteredScreen>
  )
}

// Map Supabase auth errors to the brand's plain, non-alarmist voice.
function friendlyAuthError(err, mode) {
  const msg = (err?.message || '').toLowerCase()
  if (msg.includes('invalid login')) return 'That email and password don’t match.'
  if (msg.includes('already registered') || msg.includes('already been registered')) {
    return 'An account with this email already exists. Try logging in instead.'
  }
  if (msg.includes('email not confirmed')) {
    return 'Confirm your email first — check your inbox for the link we sent.'
  }
  if (msg.includes('rate limit') || msg.includes('too many')) {
    return 'Too many attempts. Wait a moment and try again.'
  }
  return err?.message || `Couldn’t ${mode === 'login' ? 'log in' : 'create your account'}. Try again.`
}
