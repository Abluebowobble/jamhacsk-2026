import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContext } from '../lib/authContext'
import { DEMO } from '../lib/demo'

// DEMO: skip Supabase entirely and report a signed-in user so the app shell
// renders. Flip DEMO in ../lib/demo.js to restore the real auth path.
const DEMO_VALUE = {
  session: { user: { id: 'usr_demo', email: 'demo@hestia.app' } },
  user: { id: 'usr_demo', email: 'demo@hestia.app' },
  status: 'authed',
  signOut: () => {},
}

// Owns the Supabase session. Resolves the initial session once, then keeps it
// in sync via onAuthStateChange (login, logout, token refresh). `status` lets
// guards show a splash instead of flashing the login screen for an authed user.
export function AuthProvider({ children }) {
  if (DEMO) {
    return <AuthContext.Provider value={DEMO_VALUE}>{children}</AuthContext.Provider>
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState('loading') // 'loading' | 'authed' | 'anon'

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setStatus(data.session ? 'authed' : 'anon')
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
      setStatus(next ? 'authed' : 'anon')
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      status,
      signOut: () => supabase.auth.signOut(),
    }),
    [session, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
