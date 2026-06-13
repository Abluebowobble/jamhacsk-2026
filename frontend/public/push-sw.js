/* Hestia push handlers, imported into the generated service worker via
   vite-plugin-pwa's workbox.importScripts. Keeps the safety-notification
   display logic in the SW where it belongs; subscription management lives in
   src/lib/push.js. Payload shape is set by backend/src/services/push.js. */

self.addEventListener('push', (event) => {
  let data
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { title: 'Hestia', body: event.data ? event.data.text() : '' }
  }

  const title = data.title || 'Hestia'
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

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      return self.clients.openWindow(url)
    }),
  )
})
