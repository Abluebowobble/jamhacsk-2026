// Web Push glue for the settings → notifications toggle.
//
// The PWA service worker (vite-plugin-pwa, autoUpdate) owns the actual push +
// notificationclick handling (see public/push-sw.js, imported into the generated
// SW). Here we only manage the *subscription*: ask permission, subscribe via the
// browser PushManager with our VAPID key, and mirror that to the backend so it
// can target this device. Every function is defensive — push is unsupported on
// some browsers and blockable by the user, and the UI must reflect that plainly.
import { api } from './api'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

/** True when this browser can do Web Push at all. */
export function pushSupported() {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** Whether a VAPID key was provided at build time (push can't work without it). */
export function pushConfigured() {
  return Boolean(VAPID_PUBLIC_KEY)
}

// VAPID keys are base64url; PushManager wants a Uint8Array.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

async function getRegistration() {
  // vite-plugin-pwa registers the SW; `ready` resolves once it's active.
  return navigator.serviceWorker.ready
}

/**
 * Current push state for the UI, without side effects.
 * @returns {Promise<{supported:boolean, configured:boolean, permission:NotificationPermission, subscribed:boolean}>}
 */
export async function getPushState() {
  const supported = pushSupported()
  const configured = pushConfigured()
  const permission = supported ? Notification.permission : 'denied'
  let subscribed = false
  if (supported) {
    try {
      // getRegistration() resolves immediately (undefined when none), unlike
      // `ready` which blocks until a SW is active — so reading state never hangs.
      const reg = await navigator.serviceWorker.getRegistration()
      subscribed = reg ? Boolean(await reg.pushManager.getSubscription()) : false
    } catch {
      /* not registered yet — treat as not subscribed */
    }
  }
  return { supported, configured, permission, subscribed }
}

/** Subscribe this device and register it with the backend. Throws on failure. */
export async function enablePush() {
  if (!pushSupported()) throw new Error('Notifications aren’t supported on this device.')
  if (!pushConfigured()) throw new Error('Notifications aren’t configured for this build.')

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') {
    throw new Error(
      permission === 'denied'
        ? 'Notifications are blocked. Enable them in your browser settings, then try again.'
        : 'Notification permission wasn’t granted.',
    )
  }

  const reg = await getRegistration()
  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = sub.toJSON()
  await api.pushSubscribe({
    endpoint: sub.endpoint,
    p256dh: json.keys?.p256dh,
    auth: json.keys?.auth,
  })
}

/** Unsubscribe this device and remove it from the backend. */
export async function disablePush() {
  if (!pushSupported()) return
  const reg = await getRegistration()
  const sub = await reg.pushManager.getSubscription()
  if (!sub) return
  const { endpoint } = sub
  try {
    await sub.unsubscribe()
  } finally {
    // Always tell the backend to drop it, even if the browser unsubscribe failed.
    await api.pushUnsubscribe(endpoint)
  }
}
