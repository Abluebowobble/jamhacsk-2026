import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AlertTriangle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../lib/authContext'
import { useSession } from '../lib/sessionContext'
import { Splash } from './Splash'
import { Button } from '../components/ui/Button'

// Gate 1 — authentication. No session → /login, preserving where they were
// headed so we can return them there after they sign in.
export function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') return <Splash label="Checking your session…" />
  if (status === 'anon') {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}

// Gate 2 — onboarding. The user is signed in; make sure they're set up before
// the control panel loads:
//   • no household           → /onboarding (create or join)
//   • household but no device → /onboarding (pair) unless deferred this session
export function RequireOnboarded() {
  const { households, householdsLoading, error, refetchHouseholds, devices, devicesLoading, pairingDeferred } =
    useSession()
  const navigate = useNavigate()

  if (householdsLoading) return <Splash label="Loading your households…" />

  if (error) {
    return (
      <div className="grid min-h-svh place-items-center bg-bg px-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-danger-subtle text-danger-fg">
            <AlertTriangle className="size-6" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-ink">Couldn’t load your account</h1>
            <p className="mt-1.5 text-sm text-ink-body">{error.message}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate(-1)}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Go back
            </Button>
            <Button onClick={refetchHouseholds}>Try again</Button>
          </div>
        </div>
      </div>
    )
  }

  if (households.length === 0) return <Navigate to="/onboarding" replace />

  // Wait until we know whether the active household has a device before deciding.
  if (devicesLoading) return <Splash label="Checking your devices…" />

  if (devices.length === 0 && !pairingDeferred) {
    return <Navigate to="/onboarding" replace />
  }

  return <Outlet />
}
