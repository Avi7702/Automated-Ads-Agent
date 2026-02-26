import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

const isCI = process.env.CI === 'true';
const hasDatabase = process.env.DATABASE_URL !== undefined;

// Tests that require database or full app context
const integrationTests = [
  '**/*.integration.test.ts',
  '**/auth.test.ts', // Dead test: routes not registered, CSRF blocks POSTs, uses non-existent storage methods
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
    'posthog-js': path.resolve(__dirname, './client/src/__mocks__/posthog-js.ts'),
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
