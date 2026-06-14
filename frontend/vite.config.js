import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // Bind to all interfaces so a phone on the same Wi-Fi can reach the dev server
  // at http://<LAN_IP>:5173 (e.g. for the NFC pairing flow).
  server: { host: true, port: 5173 },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'mask-icon.svg'],
      // Fold Hestia's push + notificationclick handlers into the generated SW.
      workbox: { importScripts: ['push-sw.js'] },
      // Generate + register the SW in `npm run dev` too. Without this,
      // vite-plugin-pwa serves no SW in dev, so `serviceWorker.ready` never
      // resolves — the notifications toggle can't subscribe and the About
      // page's "Send test" then 409s with "No subscribed device". 'classic'
      // type is required for the importScripts('push-sw.js') above to load.
      devOptions: { enabled: true, type: 'classic' },
      manifest: {
        name: 'Hestia',
        short_name: 'Hestia',
        description: 'Smart stove safety system',
        display: 'standalone',
        theme_color: '#fefbf9',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
