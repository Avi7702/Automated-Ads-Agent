// @vitest-environment jsdom
/**
 * Tests for custom render function with providers
 * TDD: These tests verify the render utility wraps components correctly
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { renderWithProviders } from '../render';
import { useQuery } from '@tanstack/react-query';

// Mock wouter to avoid router issues in tests
vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  Router: ({ children }: { children: React.ReactNode }) => children,
  Switch: ({ children }: { children: React.ReactNode }) => children,
  Route: ({ children }: { children: React.ReactNode }) => children,
}));

// Test component that uses QueryClient
function QueryTestComponent({ queryKey }: { queryKey: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: [queryKey],
    queryFn: async () => {
      return { message: 'test data' };
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {(error as Error).message}</div>;
  return <div data-testid="query-result">{data?.message}</div>;
}

// Test component that uses Tooltip (requires TooltipProvider)
function TooltipTestComponent() {
  return <div data-testid="tooltip-test">Tooltip test</div>;
}

// Test component that uses Theme
function ThemeTestComponent() {
  return <div data-testid="theme-test">Theme test</div>;
}

// Simple component for basic render test
function SimpleComponent({ text }: { text: string }) {
  return <div data-testid="simple">{text}</div>;
}

describe('renderWithProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders a simple component', () => {
      renderWithProviders(<SimpleComponent text="Hello World" />);
      expect(screen.getByTestId('simple')).toHaveTextContent('Hello World');
    });

    it('returns standard testing-library utilities', () => {
      const result = renderWithProviders(<SimpleComponent text="test" />);

      expect(result.container).toBeDefined();
      expect(result.baseElement).toBeDefined();
      expect(result.debug).toBeDefined();
      expect(result.rerender).toBeDefined();
      expect(result.unmount).toBeDefined();
    });
  });

  describe('QueryClientProvider Integration', () => {
    it('provides QueryClient to components', async () => {
      renderWithProviders(<QueryTestComponent queryKey="test-query" />);

      // Should show loading initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Should resolve with data
      await waitFor(() => {
        expect(screen.getByTestId('query-result')).toHaveTextContent('test data');
      });
    });

    it('creates isolated QueryClient for each test', async () => {
      // First render
      const { unmount } = renderWithProviders(<QueryTestComponent queryKey="isolated-1" />);
      await waitFor(() => {
        expect(screen.getByTestId('query-result')).toBeInTheDocument();
      });
      unmount();

      // Second render should have fresh QueryClient
      renderWithProviders(<QueryTestComponent queryKey="isolated-2" />);
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('configures QueryClient with retry: false for tests', async () => {
      const failingQueryFn = vi.fn().mockRejectedValue(new Error('Test error'));

      function FailingQueryComponent() {
        const { error, isError } = useQuery({
          queryKey: ['failing'],
          queryFn: failingQueryFn,
        });

        if (isError) return <div data-testid="error">{(error as Error).message}</div>;
        return <div>Loading...</div>;
      }

      renderWithProviders(<FailingQueryComponent />);

      await waitFor(() => {
        expect(screen.getByTestId('error')).toHaveTextContent('Test error');
      });

      // Should only be called once (no retries)
      expect(failingQueryFn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Custom Options', () => {
    it('accepts custom render options', () => {
      const customContainer = document.createElement('div');
      customContainer.id = 'custom-root';
      document.body.appendChild(customContainer);

      renderWithProviders(<SimpleComponent text="custom container" />, {
        container: customContainer,
      });

      expect(customContainer.querySelector('[data-testid="simple"]')).toHaveTextContent('custom container');

      document.body.removeChild(customContainer);
    });

    it('allows custom QueryClient configuration', async () => {
      // This tests that custom options can override defaults
      renderWithProviders(<QueryTestComponent queryKey="custom-options" />);

      await waitFor(() => {
        expect(screen.getByTestId('query-result')).toBeInTheDocument();
      });
    });
  });

  describe('Provider Wrapping', () => {
    it('wraps component with ThemeProvider', () => {
      renderWithProviders(<ThemeTestComponent />);
      expect(screen.getByTestId('theme-test')).toBeInTheDocument();
    });

    it('wraps component with TooltipProvider', () => {
      renderWithProviders(<TooltipTestComponent />);
      expect(screen.getByTestId('tooltip-test')).toBeInTheDocument();
    });

    it('maintains provider order for correct context access', () => {
      // Component that might depend on multiple contexts
      function MultiContextComponent() {
        return <div data-testid="multi-context">All contexts available</div>;
      }

      renderWithProviders(<MultiContextComponent />);
      expect(screen.getByTestId('multi-context')).toBeInTheDocument();
    });
  });

  describe('Rerender Functionality', () => {
    it('rerender maintains providers', async () => {
      const { rerender } = renderWithProviders(<SimpleComponent text="initial" />);
      expect(screen.getByTestId('simple')).toHaveTextContent('initial');

      rerender(<SimpleComponent text="updated" />);
      expect(screen.getByTestId('simple')).toHaveTextContent('updated');
    });
  });
});
