import { defineConfig } from 'vitest/config';
import path from 'node:path';

const isCI = process.env.CI === 'true';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    // In CI, exclude tests that require database or full app context
    exclude: isCI
      ? [
          'node_modules/**',
          '**/node_modules/**',
          '**/*.integration.test.ts',
          '**/copywriting.test.ts', // Requires database
          '**/auth.test.ts', // Requires database
          '**/edit.test.ts', // Requires database
          '**/history.test.ts', // Requires database
          '**/transform.test.ts', // Requires database
          '**/imageStorage.test.ts', // Mock issues with drizzle-orm
          '**/validation.test.ts', // Route tests need full app
          '**/rateLimit.test.ts', // Supertest integration tests
          '**/productKnowledge.test.ts', // Requires database
        ]
      : ['node_modules/**', '**/node_modules/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
      ],
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server'),
    },
  },
});
