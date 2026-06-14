import { useEffect } from 'react'
import { useAuth } from '../lib/authContext'
import { useSession } from '../lib/sessionContext'
import { subscribeRealtime } from '../lib/realtime'
import { sync } from '../lib/store'

// Bridges Supabase Realtime to the app's data layer: when another user changes
// shared state, route the change to the matching refetch so this client updates
// live instead of waiting for the next manual refresh. Renders nothing.
//
// Mounted inside SessionProvider so it can reach both the auth session (user +
// token) and the session refetchers (households, devices) it needs to drive.
export function RealtimeBridge() {
  const { user, session } = useAuth()
  const { activeId, refetchHouseholds, refetchDevices } = useSession()

  const userId = user?.id ?? null
  const accessToken = session?.access_token ?? null

  useEffect(() => {
    if (!userId || !accessToken) return undefined

    return subscribeRealtime({
      userId,
      householdId: activeId,
      accessToken,
      handlers: {
        // Added to / removed from / re-roled in a household: the membership list
        // drives the onboarding gate, the household switcher, and the role badge.
        onMyMembership: () => {
          refetchHouseholds()
        },
        // Roster of the household in view changed (someone joined / left / re-roled).
        onRoster: () => {
          if (activeId) sync.reloadMembers(activeId)
          refetchHouseholds()
        },
        // Household renamed or deleted.
        onHousehold: () => {
          refetchHouseholds()
        },
        // A device's snapshot changed (paired / renamed / removed / stove /
        // presence / settings). Refresh both device caches the UI reads from.
        onDevices: () => {
          if (!activeId) return
          sync.reloadHouseholdDevices(activeId)
          refetchDevices(activeId)
        },
        // A timer was created or cancelled — re-anchor just that device.
        onTimer: (deviceId) => {
          if (deviceId) sync.refreshDevice(deviceId)
        },
        // A pending access request was raised or reviewed.
        onJoinRequests: () => {
          if (activeId) sync.reloadJoinRequests(activeId)
          sync.reloadNotifications()
        },
      },
    })
  }, [userId, accessToken, activeId, refetchHouseholds, refetchDevices])

  return null
}
