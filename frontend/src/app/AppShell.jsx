import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Logo } from '../components/Logo'
import { HouseholdSwitcher } from '../components/HouseholdSwitcher'
import { useHouseholds } from '../lib/store'
import { HouseholdContext } from '../lib/householdContext'
import { RoleContext } from '../lib/roles'

export function AppShell() {
  const households = useHouseholds()
  const [householdId, setHouseholdId] = useState(households[0].id)
  const role = households.find((h) => h.id === householdId)?.role ?? 'member'

  return (
    <HouseholdContext.Provider value={{ householdId, setHouseholdId }}>
      <RoleContext.Provider value={role}>
        <div className="flex min-h-svh flex-col bg-bg">
          <header className="sticky top-0 z-[var(--z-sticky)] border-b border-border bg-bg/85 backdrop-blur-md">
            <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:px-6">
              <Logo />
              <div className="ml-auto flex items-center gap-2 sm:gap-3">
                <HouseholdSwitcher />
                <span
                  className="grid size-9 place-items-center rounded-full bg-surface-sunken text-sm font-semibold text-ink-body"
                  title={`Signed in (${role})`}
                  aria-label={`Account, role ${role}`}
                >
                  Y
                </span>
              </div>
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
            <Outlet />
          </main>
        </div>
      </RoleContext.Provider>
    </HouseholdContext.Provider>
  )
}
