// Global test setup - runs before each test file
// Set environment variables that modules need at load time
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';
// Database URL for tests - uses docker-compose PostgreSQL
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/automated_ads';

// Import jest-dom matchers for DOM assertions
import '@testing-library/jest-dom';

// MSW Server Setup for client-side tests
// The server is started conditionally based on the test environment
import { beforeAll, afterAll, afterEach } from 'vitest';

// Only setup MSW for client tests (jsdom environment)
// Server tests don't need MSW as they test the actual API
const isClientTest = typeof window !== 'undefined' || process.env.VITEST_ENVIRONMENT === 'jsdom';

let mswServer: { listen: (opts?: object) => void; resetHandlers: () => void; close: () => void } | null = null;

beforeAll(async () => {
  if (isClientTest) {
    try {
      const { server } = await import('./client/src/mocks/server');
      mswServer = server;
      mswServer.listen({ onUnhandledRequest: 'bypass' });
    } catch {
      // MSW server not available - likely running server-side tests
    }
  }
});

afterEach(() => {
  if (mswServer) {
    mswServer.resetHandlers();
  }
});

afterAll(() => {
  if (mswServer) {
    mswServer.close();
  }
});
