import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { metaImagesPlugin } from './vite-plugin-meta-images';
import { VitePWA } from 'vite-plugin-pwa';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'favicon.png'],
      manifest: {
        name: 'Product Content Studio',
        short_name: 'Studio',
        description: 'AI-powered product content generation for Next Day Steel',
        theme_color: '#6366f1',
        background_color: '#0a0a0a',
        display: 'standalone',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
          },
          {
            src: '/icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/res\.cloudinary\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cloudinary-images-cache',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\//i,
            handler: 'NetworkOnly',
            method: 'GET',
          },
          {
            // Background sync for failed POST requests to API
            urlPattern: /\/api\//i,
            handler: 'NetworkOnly',
            method: 'POST',
            options: {
              backgroundSync: {
                name: 'api-post-queue',
                options: {
                  maxRetentionTime: 24 * 60, // Retry for up to 24 hours (in minutes)
                },
              },
            },
          },
          {
            // Background sync for failed PUT requests to API
            urlPattern: /\/api\//i,
            handler: 'NetworkOnly',
            method: 'PUT',
            options: {
              backgroundSync: {
                name: 'api-put-queue',
                options: {
                  maxRetentionTime: 24 * 60,
                },
              },
            },
          },
        ],
      },
    }),
    ...(process.env['NODE_ENV'] !== 'production' && process.env['REPL_ID'] !== undefined
      ? ([
          await import('@replit/vite-plugin-cartographer').then((m) => m.cartographer()),
          await import('@replit/vite-plugin-dev-banner').then((m) => m.devBanner()),
        ] as PluginOption[])
      : []),
    ...(process.env['ANALYZE']
      ? ([
          visualizer({
            filename: 'dist/bundle-analysis.html',
            open: false,
            gzipSize: true,
            brotliSize: true,
            template: 'treemap',
          }),
        ] as PluginOption[])
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'client', 'src'),
      '@shared': path.resolve(import.meta.dirname, 'shared'),
      '@assets': path.resolve(import.meta.dirname, 'attached_assets'),
    },
    dedupe: ['react', 'react-dom'],
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, 'client'),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate React and core libraries
          'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],
          // Separate React Query
          'vendor-query': ['@tanstack/react-query'],
          // Separate UI components library
          'vendor-ui': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toast',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-popover',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-switch',
            '@radix-ui/react-slider',
            '@radix-ui/react-progress',
          ],
          // Separate heavy charting library (used only in QuotaDashboard)
          'vendor-charts': ['recharts'],
          // Separate flow diagram library (used only in SystemMap)
          'vendor-flow': ['@xyflow/react'],
          // Separate date/form utilities
          'vendor-utils': ['date-fns', 'react-hook-form', 'zod'],
          // Separate icons
          'vendor-icons': ['lucide-react'],
        },
      },
    },
    // Increase chunk size warning limit (we're splitting intentionally)
    chunkSizeWarningLimit: 1000,
  },
  server: {
    host: '127.0.0.1',
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ['**/.*'],
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
});
