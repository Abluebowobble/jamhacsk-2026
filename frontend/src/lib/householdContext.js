import { createContext, useContext } from 'react'

// Currently-selected household, shared between the shell switcher and pages.
export const HouseholdContext = createContext(null)
export const useHousehold = () => useContext(HouseholdContext)
