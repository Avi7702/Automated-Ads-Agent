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

const sharedExclude =
  isCI || !hasDatabase
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
      ];

const sharedResolve = {
  alias: {
    '@shared': path.resolve(__dirname, './shared'),
    '@server': path.resolve(__dirname, './server'),
    '@': path.resolve(__dirname, './client/src'),
  },
  dedupe: ['react', 'react-dom'],
};

export default defineConfig({
  plugins: [react()],
  test: {
    // Vitest 4 removed environmentMatchGlobs — use projects instead
    projects: [
      {
        // Client tests run in jsdom environment
        plugins: [react()],
        test: {
          name: 'client',
          globals: true,
          environment: 'jsdom',
          include: ['client/**/*.test.tsx', 'client/**/*.test.ts'],
          exclude: sharedExclude,
          setupFiles: ['./vitest.setup.ts'],
        },
        resolve: sharedResolve,
      },
      {
        // Server tests run in node environment
        test: {
          name: 'server',
          globals: true,
          environment: 'node',
          include: ['server/**/*.test.ts'],
          exclude: sharedExclude,
          setupFiles: ['./vitest.setup.ts'],
        },
        resolve: sharedResolve,
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.*', '**/mockData', 'e2e/**', 'scripts/**'],
      // Coverage thresholds - fail if below these (80%+ requirement)
      thresholds: {
        // Global thresholds (everything-claude-code standard)
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
        // Per-file thresholds enforced
        perFile: true,
      },
    },
  },
  resolve: sharedResolve,
});
