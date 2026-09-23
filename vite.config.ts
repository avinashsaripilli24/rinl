import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        name: 'RINL Plot Explorer',
        short_name: 'RINL Plots',
        description: 'Browse, compare and shortlist RINL Vizag e-auction plots',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0d9488',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,mjs}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        // PDFs are cached the first time they are opened, so they work offline afterwards
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith('.pdf'),
            handler: 'CacheFirst',
            options: { cacheName: 'pdfs', expiration: { maxEntries: 4 } },
          },
          // map tiles you have looked at stay available on site visits with a weak signal
          {
            urlPattern: ({ url }) => /tile\.openstreetmap\.org|arcgisonline\.com/.test(url.hostname),
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 600, maxAgeSeconds: 30 * 86400 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
})
