import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { colors } from './src/design/tokens.ts';

// Shown in Settings and sent with error reports, so a problem can be matched to the version that had it
const version = new Date().toISOString().slice(0, 16).replace('T', ' ').replace(':', '');

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'HisabView',
        short_name: 'HisabView',
        description: 'Udhaar khata for your shop',
        id: '/',
        start_url: '/',
        scope: '/',
        categories: ['finance', 'business'],
        display: 'standalone',
        orientation: 'portrait',
        theme_color: colors.primary,
        background_color: colors.page,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Press and hold the icon on the home screen: straight to a new entry
        shortcuts: [
          { name: 'Diye likhein', short_name: 'Diye', url: '/entry/diye', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
          { name: 'Mile likhein', short_name: 'Mile', url: '/entry/mile', icons: [{ src: 'icon-192.png', sizes: '192x192', type: 'image/png' }] },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // The style mockups in /design are separate pages, not part of the app shell
        navigateFallbackDenylist: [/^\/design\//],
        globIgnores: ['design/**'],
      },
    }),
  ],
});
