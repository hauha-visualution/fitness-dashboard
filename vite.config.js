import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // Service Worker tự update khi deploy mới
      registerType: 'autoUpdate',

      // Include custom push handler + icons
      includeAssets: ['favicon.svg', 'icons/*.png', 'sw-push.js'],

      // Workbox config
      workbox: {
        // Caching strategies
        runtimeCaching: [
          {
            // Supabase API → NetworkFirst (dữ liệu live > cache)
            urlPattern: ({ url }) => url.hostname.includes('supabase.co'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Google Fonts → StaleWhileRevalidate
            urlPattern: ({ url }) => url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
            },
          },
          {
            // Static assets → CacheFirst
            urlPattern: ({ request }) => ['style', 'script', 'worker'].includes(request.destination),
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-resources',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Images → CacheFirst
            urlPattern: ({ request }) => request.destination === 'image',
            handler: 'CacheFirst',
            options: {
              cacheName: 'image-cache',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 7 },
            },
          },
        ],
        // Import custom push handler vào SW
        importScripts: ['/sw-push.js'],
        // Tránh cache auth endpoints
        navigateFallbackDenylist: [/^\/auth/, /^\/api/],
      },

      // Web App Manifest — xuất hiện khi user Add to Home Screen
      manifest: {
        name: 'Aesthetics Hub',
        short_name: 'AHub',
        description: 'Quản lý lịch tập, dinh dưỡng và thanh toán với coach.',
        theme_color: '#0d0d0f',
        background_color: '#0d0d0f',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        id: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        screenshots: [
          {
            src: '/icons/screenshot-mobile.png',
            sizes: '390x844',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Aesthetics Hub — Trang chủ',
          },
        ],
        categories: ['health', 'fitness'],
        lang: 'vi',
      },

      devOptions: {
        enabled: false, // Tắt SW trong dev để tránh cache issues
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
  },
})