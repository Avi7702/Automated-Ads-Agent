/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/server'],
  testMatch: ['**/__tests__/**/*.test.ts', '!**/*.integration.test.ts'],
  testPathIgnorePatterns: ['/node_modules/', '\\.integration\\.test\\.ts$'],
  moduleNameMapper: {
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@server/(.*)$': '<rootDir>/server/$1'
  },
  collectCoverageFrom: [
    'server/**/*.ts',
    '!server/**/*.test.ts',
    '!server/index.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 55,
      functions: 65,
      lines: 65,
      statements: 65
    },
    // Auth service should have high coverage
    './server/services/authService.ts': {
      branches: 80,
      functions: 100,
      lines: 90,
      statements: 90
    }
  },
  setupFilesAfterEnv: ['<rootDir>/server/__tests__/setup.ts'],
  clearMocks: true,
  verbose: true
};
