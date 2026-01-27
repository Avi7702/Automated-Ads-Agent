/**
 * MSW Node Server Setup
 *
 * This file sets up the MSW server for Node.js environments.
 * Used in Vitest tests to mock API calls.
 *
 * Usage in test files:
 *
 * import { server } from '@/mocks/server';
 *
 * beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
 * afterEach(() => server.resetHandlers());
 * afterAll(() => server.close());
 *
 * Or use the setupTests.ts file which configures this globally.
 */
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Create the node server with all handlers
export const server = setupServer(...handlers);

// Export handlers for runtime modifications in tests
export { handlers };

// Re-export http and HttpResponse for test overrides
export { http, HttpResponse } from 'msw';
