import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: true // Allows PWA caching during local npm run dev
      },
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https?:\/\/(localhost:5000|.*\.onrender\.com)\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'saiswaram-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 14 // Store API responses for 14 days offline
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: 'SaiSwaram',
        short_name: 'SaiSwaram',
        description: 'Digitizing devotion one bhajan at a time',
        theme_color: '#C85131',
        background_color: '#fff7ed',
        display: 'standalone',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ]
})
