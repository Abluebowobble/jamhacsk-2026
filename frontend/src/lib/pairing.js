// NFC pairing deep-link (PRD §6.2). Each Hestia unit's NFC sticker is programmed
// with this URL; tapping it opens PairPage, which resolves the device's status
// and routes to Case A (unpaired → pair) or Case B (paired → request access).
//
//   <app origin>/pair?device_id=<device uuid>
//
// The host defaults to the running app's origin, so a link copied from the
// production web app points at production. VITE_APP_URL overrides it when you
// need to mint links from a preview/local build that still target production.
const APP_BASE = import.meta.env.VITE_APP_URL || window.location.origin

/** Build the NFC pairing URL for a device id. */
export function pairUrl(deviceId, base = APP_BASE) {
  return `${base.replace(/\/$/, '')}/pair?device_id=${encodeURIComponent(deviceId)}`
}
