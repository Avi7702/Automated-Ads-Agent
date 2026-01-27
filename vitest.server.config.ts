import { defineConfig } from 'vitest/config';
import path from 'node:path';

const isCI = process.env.CI === 'true';
const hasDatabase = process.env.DATABASE_URL !== undefined;

// Tests that require database or full app context
const integrationTests = [
  '**/*.integration.test.ts',
  '**/copywriting.test.ts',
  '**/auth.test.ts',
  '**/edit.test.ts',
  '**/history.test.ts',
  '**/transform.test.ts',
  '**/imageStorage.test.ts',
  '**/productKnowledge.test.ts',
  '**/ragEndpoints.test.ts',
  '**/patternExtraction.test.ts',
];

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.setup.ts'],
    include: ['server/**/*.test.ts'],
    exclude: (isCI || !hasDatabase)
      ? [
          'node_modules/**',
          '**/node_modules/**',
          'e2e/**',
          ...integrationTests,
        ]
      : [
          'node_modules/**',
          '**/node_modules/**',
          'e2e/**',
        ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: ['server/**/*.ts'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/mockData',
        '**/__tests__/**',
        'server/index.ts',
        'server/index-dev.ts',
        'server/index-prod.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 80,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './shared'),
      '@server': path.resolve(__dirname, './server'),
    },
  },
});
