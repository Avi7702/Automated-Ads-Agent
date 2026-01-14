import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const isCI = process.env.CI === 'true';
const hasDatabase = process.env.DATABASE_URL !== undefined;

// Tests that require database or full app context
const integrationTests = [
  '**/*.integration.test.ts',
  '**/copywriting.test.ts', // Requires database
  '**/auth.test.ts', // Requires database
  '**/edit.test.ts', // Requires database
  '**/history.test.ts', // Requires database
  '**/transform.test.ts', // Requires database
  '**/imageStorage.test.ts', // Mock issues with drizzle-orm
  '**/productKnowledge.test.ts', // Requires database
  '**/ragEndpoints.test.ts', // Requires database
  '**/patternExtraction.test.ts', // Requires database (via patternExtractionService)
];

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'node',
    // Use jsdom for client tests via @vitest-environment jsdom directive in test files
    environmentMatchGlobs: [
      ['client/**/*.test.tsx', 'jsdom'],
      ['client/**/*.test.ts', 'jsdom'],
    ],
    setupFiles: ['./vitest.setup.ts'],
    // Exclude database-dependent tests in CI or when no DATABASE_URL is set
    // Also exclude e2e tests - those should be run with Playwright, not vitest
    exclude: (isCI || !hasDatabase)
      ? [
          'node_modules/**',
          '**/node_modules/**',
          'e2e/**', // Playwright e2e tests
          ...integrationTests,
        ]
      : [
          'node_modules/**',
          '**/node_modules/**',
          'e2e/**', // Playwright e2e tests
        ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        'e2e/**',
        'scripts/**',
      ],
      // Coverage thresholds - fail if below these
      thresholds: {
        // Global thresholds
        statements: 50,
        branches: 40,
        functions: 50,
        lines: 50,
        // Per-file thresholds (more lenient for now)
        perFile: false,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server'),
      '@': path.resolve(__dirname, './client/src'),
    },
    dedupe: ['react', 'react-dom'],
  },
});
