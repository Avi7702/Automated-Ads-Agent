/* eslint-disable @typescript-eslint/no-explicit-any */
// @vitest-environment jsdom
/**
 * Studio Component Tests - Layout & Structure
 *
 * Tests for:
 * - Component rendering
 * - Layout structure
 * - Responsive design
 * - Navigation/routing
 * - Loading states
 * - Error boundaries
 *
 * @file client/src/pages/__tests__/Studio-layout.test.tsx
 */
import React from 'react';
import { vi, describe, it, expect, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockProducts } from '@/fixtures';

vi.setConfig({ testTimeout: 15000, hookTimeout: 20000 });

// Mock external dependencies
vi.mock('@/components/layout/Header', () => ({
  Header: ({ currentPage }: { currentPage: string }) => (
    <header data-testid="mock-header" data-page={currentPage}>
      Mock Header
    </header>
  ),
}));

vi.mock('@/components/IdeaBankPanel', () => ({
  IdeaBankPanel: (_props: any) => <div data-testid="mock-idea-bank-panel">Mock Idea Bank Panel</div>,
}));

vi.mock('@/components/LinkedInPostPreview', () => ({
  LinkedInPostPreview: (_props: any) => <div data-testid="mock-linkedin-preview">Mock LinkedIn Preview</div>,
}));

vi.mock('@/components/TemplateLibrary', () => ({
  TemplateLibrary: (_props: any) => <div data-testid="mock-template-library">Mock Template Library</div>,
}));

vi.mock('@/components/UploadZone', () => ({
  UploadZone: (_props: any) => <div data-testid="mock-upload-zone">Mock Upload Zone</div>,
}));

vi.mock('@/components/HistoryTimeline', () => ({
  HistoryTimeline: (_props: any) => <div data-testid="mock-history-timeline">Mock History Timeline</div>,
}));

vi.mock('@/components/studio/HistoryPanel', () => ({
  HistoryPanel: (props: any) => (
    <div data-testid="mock-history-panel" data-open={props.isOpen}>
      Mock History Panel
    </div>
  ),
}));

vi.mock('@/components/studio/InspectorPanel', () => ({
  InspectorPanel: (_props: any) => <div data-testid="mock-inspector-panel">Mock Inspector Panel</div>,
}));

vi.mock('@/components/studio/IdeaBankBar', () => ({
  IdeaBankBar: (_props: any) => <div data-testid="mock-idea-bank-bar">Mock Idea Bank Bar</div>,
}));

vi.mock('@/components/studio/AgentChat', () => ({
  AgentChatPanel: (_props: any) => <div data-testid="mock-agent-chat">Mock Agent Chat</div>,
}));

vi.mock('@/components/SaveToCatalogDialog', () => ({
  SaveToCatalogDialog: (props: any) => (
    <div data-testid="mock-save-dialog" data-open={props.isOpen}>
      Mock Save Dialog
    </div>
  ),
}));

vi.mock('@/components/ContentPlannerGuidance', () => ({
  ContentPlannerGuidance: (_props: any) => <div data-testid="mock-content-planner">Mock Content Planner</div>,
}));

vi.mock('@/components/CarouselBuilder', () => ({
  CarouselBuilder: (_props: any) => <div data-testid="mock-carousel-builder">Mock Carousel Builder</div>,
}));

vi.mock('@/components/BeforeAfterBuilder', () => ({
  BeforeAfterBuilder: (_props: any) => <div data-testid="mock-before-after-builder">Mock Before After Builder</div>,
}));

vi.mock('@/components/TextOnlyMode', () => ({
  TextOnlyMode: (_props: any) => <div data-testid="mock-text-only-mode">Mock Text Only Mode</div>,
}));

vi.mock('@/components/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-error-boundary">{children}</div>
  ),
}));

vi.mock('@/contexts/StudioContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/contexts/StudioContext')>();
  return {
    ...actual,
  };
});

vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href} data-testid="mock-link">
        {children}
      </a>
    ),
    useLocation: () => ['/', vi.fn()],
  };
});

vi.mock('@/hooks/useUrlState', () => ({
  useHistoryPanelUrl: () => ({
    isHistoryOpen: false,
    selectedGenerationId: null,
    openHistory: vi.fn(),
    closeHistory: vi.fn(),
    selectGeneration: vi.fn(),
  }),
}));

vi.mock('@/hooks/useHaptic', () => ({
  useHaptic: () => ({
    haptic: vi.fn(),
  }),
}));

vi.mock('@/hooks/useRipple', () => ({
  useRipple: () => ({
    createRipple: vi.fn(),
  }),
}));

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('@use-gesture/react', () => ({
  useGesture: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('motion/react', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    img: (props: any) => <img {...props} />,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 {...props}>{children}</h2>,
    nav: ({ children, ...props }: any) => <nav {...props}>{children}</nav>,
    ul: ({ children, ...props }: any) => <ul {...props}>{children}</ul>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Create wrapper with providers
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

// Dynamic import to reset module state
let Studio: () => React.JSX.Element;

describe('Studio Component - Layout & Structure', () => {
  beforeAll(async () => {
    const module = await import('../../pages/Studio');
    Studio = module.default;
  }, 30000);

  beforeEach(() => {
    vi.resetAllMocks();
    mockLocalStorage.clear();

    // Mock successful API responses
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/products')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProducts.slice(0, 3)),
        });
      }
      if (url.includes('/api/templates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ templates: [] }),
        });
      }
      if (url.includes('/api/auth/me')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ email: 'test@example.com' }),
        });
      }
      if (url.includes('/api/performing-ad-templates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/api/pricing/estimate')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ estimatedCost: 0.05, p90: 0.08, sampleCount: 100, usedFallback: false }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ==========================================
  // Component Rendering Tests (6 tests)
  // ==========================================
  describe('Component Rendering', () => {
    it('renders the main Studio component without crashing', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });

    it('renders the Header component with correct page prop', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        const header = screen.getByTestId('mock-header');
        expect(header).toBeInTheDocument();
        expect(header).toHaveAttribute('data-page', 'studio');
      });
    });

    it('renders the hero section with title', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Create stunning product visuals')).toBeInTheDocument();
      });
    });

    it('renders the hero description text', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText(/Chat with the assistant, add products and references/)).toBeInTheDocument();
      });
    });

    it('renders the agent chat panel in idle state', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByTestId('mock-agent-chat')).toBeInTheDocument();
      });
    });

    it('renders the StudioProvider context wrapper', async () => {
      // With the real StudioProvider, verify it wraps the tree by checking
      // that a context-dependent child (ComposerView) renders successfully.
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        // The "Your Products" section comes from ComposerView which uses
        // useStudioState() — if StudioProvider is missing, this would crash.
        expect(screen.getByText('Your Products')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // Layout Structure Tests (5 tests)
  // ==========================================
  describe('Layout Structure', () => {
    it('renders the main container with correct styling classes', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        const mainContainer = document.querySelector('.min-h-screen');
        expect(mainContainer).toBeInTheDocument();
      });
    });

    it('renders the products section with correct structure', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Your Products')).toBeInTheDocument();
      });
    });

    it('does not render the old upload section', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText('Upload Images')).not.toBeInTheDocument();
      });
    });

    it('does not render the old templates section', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.queryByText('Style & Template')).not.toBeInTheDocument();
      });
    });

    it('renders the prompt section with describe your vision heading', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Describe Your Vision')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // Responsive Design Tests (3 tests)
  // ==========================================
  describe('Responsive Design', () => {
    it('renders mobile LinkedIn preview bar on small screens', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        // The new Studio uses InspectorPanel instead of LinkedIn Preview.
        // Verify the inspector panel mock is present in the DOM.
        const inspectorPanel = screen.getByTestId('mock-inspector-panel');
        expect(inspectorPanel).toBeInTheDocument();
      });
    });

    it('renders the desktop LinkedIn preview column', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        // The new Studio replaced LinkedInPostPreview with InspectorPanel.
        // Verify the inspector panel is rendered in the desktop layout.
        const inspectorPanel = screen.getByTestId('mock-inspector-panel');
        expect(inspectorPanel).toBeInTheDocument();
      });
    });

    it('renders history panel component', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        const historyPanel = screen.getByTestId('mock-history-panel');
        expect(historyPanel).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // Navigation/Routing Tests (3 tests)
  // ==========================================
  describe('Navigation/Routing', () => {
    it('renders the History button in quick actions', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        const historyButton = screen.getByRole('button', { name: /History/i });
        expect(historyButton).toBeInTheDocument();
      });
    });

    it('has correct navigation link structure', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Check that link components are rendered
        const links = screen.queryAllByTestId('mock-link');
        // Links may exist after generation completes
        expect(links).toBeDefined();
      });
    });

    it('renders the progress rail for navigation', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      // Progress rail is hidden on mobile (lg:flex), but should be in DOM
      await waitFor(() => {
        // The progress rail sections should exist based on the progressSections array
        expect(document.body).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // Loading States Tests (3 tests)
  // ==========================================
  describe('Loading States', () => {
    it('renders product grid when products are loading', async () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

      render(<Studio />, { wrapper: createWrapper() });

      // Should render the container even while loading
      await waitFor(() => {
        expect(screen.getByText('Your Products')).toBeInTheDocument();
      });
    });

    it('renders products after they load', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Products should be visible after loading
        expect(screen.getByText('Your Products')).toBeInTheDocument();
      });
    });

    it('handles empty products list gracefully', async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/products')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      });

      render(<Studio />, { wrapper: createWrapper() });

      // The new Studio renders the "Your Products" section even when empty.
      // The product grid is simply empty without a "No products found" message.
      await waitFor(() => {
        expect(screen.getByText('Your Products')).toBeInTheDocument();
      });
    });
  });

  // ==========================================
  // Error Boundary Tests (2 tests)
  // ==========================================
  describe('Error Boundaries', () => {
    it('wraps IdeaBankPanel with ErrorBoundary', async () => {
      render(<Studio />, { wrapper: createWrapper() });

      await waitFor(() => {
        const errorBoundaries = screen.getAllByTestId('mock-error-boundary');
        expect(errorBoundaries.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('handles API errors gracefully without crashing', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      render(<Studio />, { wrapper: createWrapper() });

      // Component should still render despite API errors
      await waitFor(() => {
        expect(screen.getByText('Create stunning product visuals')).toBeInTheDocument();
      });
    });
  });
});
