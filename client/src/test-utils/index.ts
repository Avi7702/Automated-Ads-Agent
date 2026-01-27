/**
 * Test Utilities - Central export file
 *
 * This module provides reusable test utilities for React component testing.
 *
 * Usage:
 * ```tsx
 * import {
 *   render,
 *   screen,
 *   fireEvent,
 *   waitFor,
 *   createMockProduct,
 *   createMockUser,
 * } from '@/test-utils';
 *
 * describe('MyComponent', () => {
 *   it('renders correctly', () => {
 *     const product = createMockProduct({ name: 'Test' });
 *     render(<MyComponent product={product} />);
 *     expect(screen.getByText('Test')).toBeInTheDocument();
 *   });
 * });
 * ```
 */

// Re-export everything from render utilities
export {
  render,
  renderWithProviders,
  createTestQueryClient,
  // Re-exports from @testing-library/react
  screen,
  fireEvent,
  waitFor,
  within,
  act,
  cleanup,
} from './render';

// Export render options type
export type { CustomRenderOptions } from './render';

// Re-export factory functions
export {
  createMockProduct,
  createMockGeneration,
  createMockTemplate,
  createMockUser,
  createMockAdCopy,
  createMockSocialConnection,
  createMockScheduledPost,
  resetIdCounter,
} from './factories';
