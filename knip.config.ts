import type { KnipConfig } from 'knip';

const config: KnipConfig = {
  entry: ['server/index-prod.ts', 'server/index-dev.ts', 'client/src/main.tsx'],
  project: ['server/**/*.ts', 'client/src/**/*.{ts,tsx}', 'shared/**/*.ts'],
  ignore: [
    // Backup / legacy files
    'client/src/pages/StudioLegacy.tsx',
    // Vite plugins
    'vite-plugin-meta-images.ts',
    // Config files
    'drizzle.config.ts',
    'eslint.config.js',
    'vitest.config.ts',
    'vitest.client.config.ts',
    'vitest.server.config.ts',
    'playwright.config.ts',
    // Test files
    'server/__tests__/**',
    'client/src/**/__tests__/**',
    'e2e/**',
    // Seed scripts (run manually)
    'server/seeds/**',
    // Migration files
    'migrations/**',
  ],
  ignoreDependencies: [
    // Vite plugins loaded dynamically
    '@replit/vite-plugin-cartographer',
    '@replit/vite-plugin-dev-banner',
    '@replit/vite-plugin-runtime-error-modal',
    // Tailwind v4 plugin
    '@tailwindcss/vite',
    // Build tools
    'esbuild',
    'autoprefixer',
    'postcss',
    // Testing
    '@testing-library/jest-dom',
    '@testing-library/react',
    '@vitest/coverage-v8',
    'jsdom',
    'msw',
    'supertest',
    // Type packages used implicitly
    '@types/*',
    // Husky runs via prepare script
    'husky',
    'lint-staged',
    'cross-env',
    // PWA plugin
    'vite-plugin-pwa',
    // CSS animation utilities (used in Tailwind config)
    'tailwindcss-animate',
    'tw-animate-css',
  ],
};

export default config;
