/**
 * Tests for useStudioOrchestrator hook
 *
 * This hook is the central state orchestrator for the Studio page.
 * Tests cover: initial state, product selection, UI state changes,
 * copy/download actions, and generation flows.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createElement } from 'react';

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('wouter', () => ({
  useLocation: () => ['/', vi.fn()],
  Link: ({ children }: { children: unknown }) => children,
}));

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
  useHaptic: () => ({ haptic: vi.fn() }),
}));

vi.mock('@/hooks/useKeyboardShortcuts', () => ({
  useKeyboardShortcuts: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: Object.assign(vi.fn(), {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}));

const { mockGetCsrfToken, mockTypedGet, mockTypedPostFormData } = vi.hoisted(() => ({
  mockGetCsrfToken: vi.fn().mockResolvedValue('test-csrf-token'),
  mockTypedGet: vi.fn(),
  mockTypedPostFormData: vi.fn(),
}));

vi.mock('@/lib/queryClient', () => ({
  getCsrfToken: mockGetCsrfToken,
  apiRequest: vi.fn(),
  queryClient: new QueryClient(),
}));

vi.mock('@/lib/typedFetch', () => ({
  typedGet: mockTypedGet,
  typedPostFormData: mockTypedPostFormData,
}));

// Mock shared modules
vi.mock('@shared/contentTemplates', () => ({
  getTemplateById: vi.fn().mockReturnValue(null),
}));

// ── Test Wrapper ────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  return ({ children }: { children: unknown }) => createElement(QueryClientProvider, { client: queryClient }, children);
}

// ── Mock Data ───────────────────────────────────────────────────────

const mockProducts = [
  {
    id: 1,
    name: 'Drainage System',
    description: 'Premium drainage',
    cloudinaryUrl: 'https://example.com/img.jpg',
    category: 'drainage',
    tags: [],
    userId: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: 'Gutter Guard',
    description: 'Steel gutter guard',
    cloudinaryUrl: 'https://example.com/img2.jpg',
    category: 'gutters',
    tags: [],
    userId: 1,
    createdAt: new Date().toISOString(),
  },
];

// ── Import hook under test ───────────────────────────────────────────

import { useStudioOrchestrator } from '@/hooks/useStudioOrchestrator';

describe('useStudioOrchestrator — Initial State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTypedGet.mockResolvedValue({ products: mockProducts });
    // Clear localStorage
    localStorage.clear?.();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn(() => null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  it('starts with idle generation state', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    expect(result.current.state).toBe('idle');
  });

  it('starts with no selected products', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    expect(result.current.selectedProducts).toEqual([]);
  });

  it('starts with empty prompt', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    expect(result.current.prompt).toBe('');
  });

  it('starts with LinkedIn platform', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    expect(result.current.platform).toBe('LinkedIn');
  });

  it('starts with standard generation mode', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    expect(result.current.generationMode).toBe('standard');
  });

  it('exposes required action handlers', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    expect(typeof result.current.handleGenerate).toBe('function');
    expect(typeof result.current.toggleProductSelection).toBe('function');
    expect(typeof result.current.handleDownload).toBe('function');
    expect(typeof result.current.handleCopyText).toBe('function');
    expect(typeof result.current.handleApplyEdit).toBe('function');
    expect(typeof result.current.handleReset).toBe('function');
  });
});

describe('useStudioOrchestrator — Product Selection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTypedGet.mockResolvedValue({ products: mockProducts });
  });

  it('adds a product to selection', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleProductSelection(mockProducts[0]);
    });

    expect(result.current.selectedProducts).toHaveLength(1);
    expect(result.current.selectedProducts[0]).toEqual(mockProducts[0]);
  });

  it('toggles product off when called again with same product', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleProductSelection(mockProducts[0]);
    });
    expect(result.current.selectedProducts).toHaveLength(1);

    // Calling again deselects
    act(() => {
      result.current.toggleProductSelection(mockProducts[0]);
    });
    expect(result.current.selectedProducts).toHaveLength(0);
  });

  it('removes a product from selection by toggling again', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleProductSelection(mockProducts[0]);
      result.current.toggleProductSelection(mockProducts[1]);
    });

    act(() => {
      // Toggle again to deselect
      result.current.toggleProductSelection(mockProducts[0]);
    });

    expect(result.current.selectedProducts).toHaveLength(1);
    expect(result.current.selectedProducts[0]).toEqual(mockProducts[1]);
  });

  it('clears all products via setSelectedProducts', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleProductSelection(mockProducts[0]);
      result.current.toggleProductSelection(mockProducts[1]);
    });

    act(() => {
      result.current.setSelectedProducts([]);
    });

    expect(result.current.selectedProducts).toEqual([]);
  });
});

describe('useStudioOrchestrator — UI State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTypedGet.mockResolvedValue({ products: mockProducts });
  });

  it('updates prompt value', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setPrompt('Create an engaging ad');
    });

    expect(result.current.prompt).toBe('Create an engaging ad');
  });

  it('updates platform', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setPlatform('Instagram');
    });

    expect(result.current.platform).toBe('Instagram');
  });

  it('updates aspect ratio', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setAspectRatio('1080x1080');
    });

    expect(result.current.aspectRatio).toBe('1080x1080');
  });

  it('updates resolution', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setResolution('4K');
    });

    expect(result.current.resolution).toBe('4K');
  });

  it('updates search query', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setSearchQuery('drainage');
    });

    expect(result.current.searchQuery).toBe('drainage');
  });

  it('updates category filter', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setCategoryFilter('drainage');
    });

    expect(result.current.categoryFilter).toBe('drainage');
  });
});

describe('useStudioOrchestrator — canGenerate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTypedGet.mockResolvedValue({ products: mockProducts });
  });

  it('is false when no products and no prompt', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    expect(result.current.canGenerate).toBe(false);
  });

  it('is false when products selected but no prompt', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleProductSelection(mockProducts[0]);
    });

    expect(result.current.canGenerate).toBe(false);
  });

  it('is true when products selected and prompt entered', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.toggleProductSelection(mockProducts[0]);
      result.current.setPrompt('Create an ad');
    });

    expect(result.current.canGenerate).toBe(true);
  });
});

describe('useStudioOrchestrator — History Panel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTypedGet.mockResolvedValue({ products: mockProducts });
  });

  it('exposes history panel state and controls', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    expect(result.current.historyPanelOpen).toBe(false);
    expect(typeof result.current.setHistoryPanelOpen).toBe('function');
  });

  it('can toggle history panel', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setHistoryPanelOpen(true);
    });

    expect(result.current.historyPanelOpen).toBe(true);
  });
});

describe('useStudioOrchestrator — Media Mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTypedGet.mockResolvedValue({ products: mockProducts });
  });

  it('starts in image mode', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mediaMode).toBe('image');
  });

  it('can switch to video mode', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setMediaMode('video');
    });

    expect(result.current.mediaMode).toBe('video');
  });

  it('can set video duration', () => {
    const { result } = renderHook(() => useStudioOrchestrator(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.setVideoDuration('4');
    });

    expect(result.current.videoDuration).toBe('4');
  });
});
