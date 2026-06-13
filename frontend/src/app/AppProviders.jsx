import { Outlet } from 'react-router-dom'
import { AuthProvider } from './AuthProvider'
import { SessionProvider } from './SessionProvider'

// Root layout route: auth + account session wrap the whole tree so every route
// (login, onboarding, dashboard) shares one session. Rendered inside the
// router, so descendants can use router hooks.
export function AppProviders() {
  return (
    <AuthProvider>
      <SessionProvider>
        <Outlet />
      </SessionProvider>
    </AuthProvider>
  )
}
