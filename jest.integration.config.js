/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: ['**/*.integration.test.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  setupFilesAfterEnv: [],
  testTimeout: 30000,
  // No in-memory fallbacks - real DB required
  globals: {
    'ts-jest': {
      isolatedModules: true,
    },
  },
};
