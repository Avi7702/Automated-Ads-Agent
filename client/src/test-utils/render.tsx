/**
 * Custom render function for testing React components
 *
 * Wraps components with all necessary providers:
 * - QueryClientProvider (TanStack Query)
 * - ThemeProvider (next-themes)
 * - TooltipProvider (Radix UI)
 *
 * Usage:
 * ```tsx
 * import { render, screen } from '@/test-utils';
 *
 * it('renders correctly', () => {
 *   render(<MyComponent />);
 *   expect(screen.getByText('Hello')).toBeInTheDocument();
 * });
 * ```
 */
import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';

/**
 * Creates a fresh QueryClient configured for testing
 * - retry: false - Don't retry failed queries (faster tests)
 * - gcTime: 0 - Garbage collect immediately (isolated tests)
 */
function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Options for custom render function
 */
export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  /**
   * Optional pre-configured QueryClient
   * If not provided, a fresh one is created for each test
   */
  queryClient?: QueryClient;

  /**
   * Initial route for router testing
   * @default '/'
   */
  route?: string;
}

/**
 * All-in-one wrapper component with all providers
 */
function AllTheProviders({
  children,
  queryClient,
}: {
  children: ReactNode;
  queryClient: QueryClient;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider delayDuration={0}>{children}</TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

/**
 * Custom render function that wraps components with all necessary providers
 *
 * @param ui - React element to render
 * @param options - Render options including custom QueryClient
 * @returns Standard testing-library render result
 *
 * @example
 * ```tsx
 * // Basic usage
 * render(<MyComponent />);
 *
 * // With custom options
 * render(<MyComponent />, { container: myContainer });
 *
 * // With pre-configured QueryClient
 * const queryClient = new QueryClient();
 * queryClient.setQueryData(['key'], mockData);
 * render(<MyComponent />, { queryClient });
 * ```
 */
export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  function Wrapper({ children }: { children: ReactNode }) {
    return <AllTheProviders queryClient={queryClient}>{children}</AllTheProviders>;
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Re-export everything from @testing-library/react
 * This allows importing everything from one place:
 *
 * ```tsx
 * import { render, screen, fireEvent, waitFor } from '@/test-utils';
 * ```
 */
export * from '@testing-library/react';

/**
 * Export custom render as default 'render' for convenience
 * This allows drop-in replacement:
 *
 * ```tsx
 * // Instead of:
 * // import { render } from '@testing-library/react';
 *
 * // Use:
 * import { render } from '@/test-utils';
 * ```
 */
export { renderWithProviders as render };

/**
 * Export for explicit usage when needed
 */
export { createTestQueryClient };
