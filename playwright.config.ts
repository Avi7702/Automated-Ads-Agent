import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Automated-Ads-Agent
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // Test directory
  testDir: './e2e',

  // Run tests in files in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only
  retries: process.env.CI ? 2 : 0,

  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,

  // Reporter configuration - HTML reporter with list for console output
  reporter: [['html', { open: 'never' }], ['list']],

  // Shared settings for all projects
  use: {
    // Base URL - defaults to production, override with BASE_URL env var for local dev
    baseURL: process.env.BASE_URL || 'https://automated-ads-agent-production.up.railway.app',

    // Bypass rate limiting for E2E tests
    extraHTTPHeaders: {
      'x-e2e-test': 'true',
    },

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Take screenshot on failure
    screenshot: 'only-on-failure',

    // Action timeout (clicking, filling, etc.)
    actionTimeout: 30000,

    // Navigation timeout
    navigationTimeout: 30000,
  },

  // Global test timeout
  timeout: 60000,

  // Configure projects - Chromium only for speed
  projects: [
    // Setup project for authentication
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    // Main test project with auth state reuse
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Reuse authenticated state from setup
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
    },

    // Mobile viewport project for responsive tests
    {
      name: 'mobile',
      use: {
        ...devices['iPhone 13'],
        storageState: 'e2e/.auth/user.json',
      },
      dependencies: ['setup'],
      testMatch: /34-mobile-responsive\.spec\.ts/,
    },
  ],

  // Web server configuration - only start local dev server when BASE_URL is localhost
  ...(process.env.BASE_URL?.includes('localhost')
    ? {
        webServer: {
          command: 'npm run dev',
          url: process.env.BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120000,
        },
      }
    : {}),

  // Output directory for test artifacts
  outputDir: 'e2e/test-results',

  // Expect configuration
  expect: {
    // Default timeout for expect assertions
    timeout: 10000,
  },
});
