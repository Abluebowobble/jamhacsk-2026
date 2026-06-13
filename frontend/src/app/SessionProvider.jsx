import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/authContext'
import { SessionContext, readActiveId, writeActiveId } from '../lib/sessionContext'

// Loads the signed-in user's households once authed, tracks the active one,
// and loads that household's devices. Re-fetches are exposed so the onboarding
// flow can advance the gate immediately after creating a household or pairing.
export function SessionProvider({ children }) {
  const { status } = useAuth()

  const [households, setHouseholds] = useState([])
  const [householdsLoading, setHouseholdsLoading] = useState(true)
  const [error, setError] = useState(null)
  // The user's last explicit pick; the *effective* active id is derived below so
  // a stale/removed selection self-heals without a correcting effect.
  const [selectedId, setSelectedId] = useState(() => readActiveId())

  const [devices, setDevices] = useState([])
  const [devicesLoading, setDevicesLoading] = useState(false)

  // The household gate is hard; the device gate is a strong prompt the user can
  // defer for this session (e.g. their physical unit isn't to hand right now).
  const [pairingDeferred, setPairingDeferred] = useState(false)
  const deferPairing = useCallback(() => setPairingDeferred(true), [])

  const refetchHouseholds = useCallback(async () => {
    setHouseholdsLoading(true)
    setError(null)
    try {
      const list = await api.listHouseholds()
      setHouseholds(list)
      return list
    } catch (err) {
      setError(err)
      return []
    } finally {
      setHouseholdsLoading(false)
    }
  }, [])

  // Load households when the user becomes authenticated; reset on sign-out.
  useEffect(() => {
    if (status === 'authed') {
      // Deliberate fetch-on-auth; setState lives inside the async call.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refetchHouseholds()
    } else if (status === 'anon') {
      setHouseholds([])
      setDevices([])
      setPairingDeferred(false)
      setHouseholdsLoading(false)
    }
  }, [status, refetchHouseholds])

  // Effective active household: honour the explicit pick when it still exists,
  // otherwise fall back to the first. Derived, not stored, so it self-corrects.
  const activeId = useMemo(() => {
    if (households.some((h) => h.id === selectedId)) return selectedId
    return households[0]?.id ?? null
  }, [households, selectedId])

  const setActiveHousehold = useCallback((id) => {
    setSelectedId(id)
    writeActiveId(id)
  }, [])

  const refetchDevices = useCallback(async (householdId) => {
    const id = householdId ?? null
    if (!id) {
      setDevices([])
      return []
    }
    setDevicesLoading(true)
    try {
      const list = await api.listDevices(id)
      setDevices(list)
      return list
    } catch {
      setDevices([])
      return []
    } finally {
      setDevicesLoading(false)
    }
  }, [])

  // Load devices for the active household whenever it changes.
  useEffect(() => {
    if (status !== 'authed' || householdsLoading) return
    // Deliberate fetch-on-change; setState lives inside the async call.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetchDevices(activeId)
  }, [status, householdsLoading, activeId, refetchDevices])

  const activeHousehold = useMemo(
    () => households.find((h) => h.id === activeId) ?? null,
    [households, activeId],
  )

  const value = useMemo(
    () => ({
      households,
      householdsLoading,
      error,
      refetchHouseholds,
      activeId,
      activeHousehold,
      setActiveHousehold,
      devices,
      devicesLoading,
      refetchDevices,
      pairingDeferred,
      deferPairing,
    }),
    [
      households,
      householdsLoading,
      error,
      refetchHouseholds,
      activeId,
      activeHousehold,
      setActiveHousehold,
      devices,
      devicesLoading,
      refetchDevices,
      pairingDeferred,
      deferPairing,
    ],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
