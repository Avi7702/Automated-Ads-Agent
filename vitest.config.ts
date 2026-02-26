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

// Use process.cwd() for git worktree compatibility (__dirname can resolve to main repo)
const root = process.cwd();

const sharedResolve = {
  alias: {
    '@shared': path.resolve(root, './shared'),
    '@server': path.resolve(root, './server'),
    '@': path.resolve(root, './client/src'),
    'posthog-js': path.resolve(root, './client/src/__mocks__/posthog-js.ts'),
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
          setupFiles: [path.resolve(root, 'vitest.setup.ts')],
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
          setupFiles: [path.resolve(root, 'vitest.setup.ts')],
        },
        resolve: sharedResolve,
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: ['node_modules/', 'dist/', '**/*.d.ts', '**/*.config.*', '**/mockData', 'e2e/**', 'scripts/**'],
      thresholds: {
        // Actual (CI 2026-02-26): stmts 38.74, branches 31.28, funcs 37.56, lines 38.91
        // Set ~5% below actual to allow normal fluctuation
        statements: 33,
        branches: 26,
        functions: 32,
        lines: 33,
      },
    },
  },
  resolve: sharedResolve,
});
