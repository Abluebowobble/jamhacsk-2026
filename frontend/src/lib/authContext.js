import { createContext, useContext } from 'react'

// Supabase auth session, shared app-wide.
// { session, user, status: 'loading' | 'authed' | 'anon', signOut }
export const AuthContext = createContext(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
