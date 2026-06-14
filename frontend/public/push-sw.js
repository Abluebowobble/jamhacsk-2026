/* Hestia push handlers, imported into the generated service worker via
   vite-plugin-pwa's workbox.importScripts. Keeps the safety-notification
   display logic in the SW where it belongs; subscription management lives in
   src/lib/push.js. Payload shape is set by backend/src/services/mqtt.js.

   The "stove about to turn off" alert (kind: 'shutoff-warning') is special: it
   shows a live countdown plus Snooze / Turn off now action buttons that act on
   the device DIRECTLY from the notification — even on a locked phone with the
   app closed — using a signed action token carried in the payload. */

function fmtRemaining(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`
}

function shutoffOptions(data, remainingMs) {
  return {
    body:
      remainingMs > 0
        ? `No one’s at the stove — shutting off in ${fmtRemaining(remainingMs)}. Snooze or turn it off now.`
        : 'Shutting off now — no one returned.',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag,
    requireInteraction: true,
    // Don't re-alert (sound/vibrate) on each countdown refresh.
    renotify: false,
    actions: [
      { action: 'snooze', title: 'Snooze 2 min' },
      { action: 'turnoff', title: 'Turn off now' },
    ],
    data: {
      kind: data.kind,
      url: data.url || '/',
      deviceId: data.deviceId,
      apiBase: data.apiBase || '',
      actionToken: data.actionToken || '',
      tag: data.tag,
      shutoffAt: data.shutoffAt,
    },
  }
}

// Re-issue the same-tagged notification every few seconds so the countdown
// actually ticks while the warning window is open. Bounded, and stops early if
// the user dismisses or acts on it. (Web notifications can't animate, so this
// coarse refresh is the live count; the in-app ring stays per-second.)
async function runShutoffCountdown(title, data) {
  const deadline = Date.parse(data.shutoffAt) || Date.now() + 30000
  for (let i = 0; i < 24; i++) {
    const remaining = deadline - Date.now()
    await self.registration.showNotification(title, shutoffOptions(data, remaining))
    if (remaining <= 0) break
    await new Promise((r) => setTimeout(r, 5000))
    const open = await self.registration.getNotifications({ tag: data.tag })
    if (!open.length) break // user dismissed or acted — stop refreshing
  }
}

self.addEventListener('push', (event) => {
  let data
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Hestia', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Hestia'

  if (data.kind === 'shutoff-warning') {
    event.waitUntil(runShutoffCountdown(title, data))
    return
  }

  const options = {
    body: data.body || '',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    tag: data.tag,
    data: { url: data.url || '/' },
    requireInteraction: Boolean(data.requireInteraction),
  }
  event.waitUntil(self.registration.showNotification(title, options))
})

async function openApp(url) {
  const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of clientList) {
    if ('focus' in client) {
      client.navigate(url)
      return client.focus()
    }
  }
  return self.clients.openWindow(url)
}

// Replace the warning with a short confirmation so the user gets feedback.
async function confirmAction(action, data) {
  const open = await self.registration.getNotifications({ tag: data.tag })
  open.forEach((n) => n.close())
  await self.registration.showNotification('Hestia', {
    tag: data.tag,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    requireInteraction: false,
    body: action === 'snooze' ? 'Snoozed for 2 minutes.' : 'Stove turned off.',
  })
}

async function handleAction(action, data) {
  // Direct path: signed-token POST straight to the backend. Works with the app
  // closed / phone locked, no session needed.
  if (data.apiBase && data.actionToken && data.deviceId) {
    try {
      const res = await fetch(`${data.apiBase}/api/devices/${data.deviceId}/notification-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: data.actionToken, action }),
      })
      if (res.ok) {
        await confirmAction(action, data)
        return
      }
    } catch {
      /* network/SW offline — fall through to opening the app */
    }
  }
  // Fallback: open the app at a deep link so the logged-in client performs it.
  await openApp(`${data.url || '/'}?action=${action}`)
}

self.addEventListener('notificationclick', (event) => {
  const data = event.notification.data || {}
  const action = event.action
  event.notification.close()

  if (action === 'snooze' || action === 'turnoff') {
    event.waitUntil(handleAction(action, data))
    return
  }
  event.waitUntil(openApp(data.url || '/'))
})
