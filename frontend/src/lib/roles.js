// Role-based permissions (PRD §9). Enforced on the backend in production;
// here it gates UI affordances so members don't see admin-only actions.
import { createContext, useContext } from 'react'

// Permission → roles allowed. Mirrors the PRD permission table.
const MATRIX = {
  addStove: ['admin', 'member'],
  setTimer: ['admin', 'member'],
  cancelTimer: ['admin', 'member'],
  toggleStove: ['admin', 'member'],
  viewStatus: ['admin', 'member'],
  viewEvents: ['admin', 'member'],
  viewCamera: ['admin', 'member'],
  editSafety: ['admin', 'member'],
  removeStove: ['admin'],
  removeMember: ['admin'],
  changeRole: ['admin'],
  manageInvites: ['admin'],
  renameHousehold: ['admin'],
  deleteHousehold: ['admin'],
  renameDevice: ['admin'],
}

export function can(permission, role) {
  return MATRIX[permission]?.includes(role) ?? false
}

export const RoleContext = createContext('admin')
export const useRole = () => useContext(RoleContext)

/** Hook: useCan('removeStove') → boolean for the current role. */
export function useCan(permission) {
  return can(permission, useRole())
}
