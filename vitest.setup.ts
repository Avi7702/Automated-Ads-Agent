// Global test setup - runs before each test file
// Set environment variables that modules need at load time
process.env.GEMINI_API_KEY = 'test-api-key';
process.env.NODE_ENV = 'test';
// Database URL for tests - uses docker-compose PostgreSQL
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/automated_ads';

// Import jest-dom matchers for DOM assertions
import '@testing-library/jest-dom';

// Only setup MSW & jsdom polyfills for client tests (jsdom environment)
const isClientTest = typeof window !== 'undefined' || process.env.VITEST_ENVIRONMENT === 'jsdom';

// Mock window.matchMedia for jsdom (not provided by jsdom)
if (isClientTest && typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// Mock IntersectionObserver for jsdom (needed by embla-carousel and other libs)
if (isClientTest && typeof window !== 'undefined' && !window.IntersectionObserver) {
  class MockIntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    constructor(_callback: IntersectionObserverCallback, _options?: IntersectionObserverInit) {}
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords(): IntersectionObserverEntry[] {
      return [];
    }
  }
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: MockIntersectionObserver,
  });
}

// Mock ResizeObserver for jsdom (needed by many UI libraries)
if (isClientTest && typeof window !== 'undefined' && !window.ResizeObserver) {
  class MockResizeObserver {
    constructor(_callback: ResizeObserverCallback) {}
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  Object.defineProperty(window, 'ResizeObserver', {
    writable: true,
    value: MockResizeObserver,
  });
}

// MSW Server Setup for client-side tests
// NOTE: We avoid importing { beforeAll, afterEach, afterAll } from 'vitest'
// at the top level because in Vitest 4 with projects configuration, the runner
// is not yet initialized when setupFiles are evaluated, causing
// "Vitest failed to find the runner" errors.
//
// Instead, individual test files that need MSW should import and configure it:
//   import { server } from '@/mocks/server';
//   beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
//   afterEach(() => server.resetHandlers());
//   afterAll(() => server.close());
//
// Most client tests that mock fetch directly don't need MSW at all.
