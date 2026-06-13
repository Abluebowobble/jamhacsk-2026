import { createContext, useContext } from 'react'

// Real account state from the backend: the households the signed-in user
// belongs to, the currently-active one, and that household's devices. Drives
// the onboarding gate (no household → create/join; no device → pair).
export const SessionContext = createContext(null)

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within <SessionProvider>')
  return ctx
}

const KEY = 'hestia.activeHouseholdId'
export const readActiveId = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}
export const writeActiveId = (id) => {
  try {
    if (id) localStorage.setItem(KEY, id)
    else localStorage.removeItem(KEY)
  } catch {
    /* private mode / disabled storage — fall back to in-memory only */
  }
}
