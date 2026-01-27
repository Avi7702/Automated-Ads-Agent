/**
 * MSW Browser Worker Setup
 *
 * This file sets up the MSW service worker for browser environments.
 * Used during development to mock API calls in the browser.
 *
 * Usage:
 * In your main entry file (main.tsx), conditionally start the worker:
 *
 * if (import.meta.env.DEV && import.meta.env.VITE_ENABLE_MSW === 'true') {
 *   const { worker } = await import('./mocks/browser');
 *   await worker.start({ onUnhandledRequest: 'bypass' });
 * }
 */
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Create the browser worker with all handlers
export const worker = setupWorker(...handlers);

// Export handlers for potential runtime modifications
export { handlers };
