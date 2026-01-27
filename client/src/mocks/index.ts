/**
 * MSW Mocks Module
 *
 * Exports handlers and utilities for API mocking in tests and development.
 */

// Export all handlers
export { handlers } from './handlers';

// Export the node server for tests
export { server } from './server';

// Re-export MSW utilities for convenience
export { http, HttpResponse } from 'msw';
