// @ts-nocheck
/**
 * Tests for useIdeaBankFetch hook
 * - Initial state
 * - Fetching suggestions
 * - Session storage caching
 * - Error handling
 * - analyzingCount computed from upload status
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

// Mock getCsrfToken before imports
const { mockGetCsrfToken } = vi.hoisted(() => ({
  mockGetCsrfToken: vi.fn().mockResolvedValue('test-token'),
}));

vi.mock('@/lib/queryClient', () => ({
  getCsrfToken: mockGetCsrfToken,
}));

// Mock the contract validation — return success:false so hook logs warning but still processes
vi.mock('@shared/contracts/ideaBank.contract', () => ({
  IdeaBankSuggestResponseDTO: {
    safeParse: vi.fn().mockReturnValue({ success: false, error: { issues: [] } }),
  },
}));

import { useIdeaBankFetch } from '../useIdeaBankFetch';

// Setup sessionStorage mock
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock });

const mockProduct = {
  id: 1,
  name: 'Drainage System',
  description: 'Premium drainage',
  cloudinaryUrl: 'https://example.com/img.jpg',
  category: 'drainage',
  tags: [],
  userId: 1,
  createdAt: new Date().toISOString(),
};

type TempUploadStub = {
  id: string;
  url: string;
  status: 'analyzing' | 'confirmed';
};

// This matches the hook's processResponse path for structured response:
// needs `suggestions` array and `analysisStatus` object
const mockSuggestResponse = {
  suggestions: [
    {
      id: 'idea1',
      summary: 'LinkedIn Ad',
      prompt: 'Create a Drainage System ad for LinkedIn',
      mode: 'standard',
      reasoning: 'Tested approach',
      confidence: 0.85,
      sourcesUsed: {
        visionAnalysis: false,
        kbRetrieval: false,
        webSearch: false,
        templateMatching: true,
      },
    },
  ],
  analysisStatus: {
    visionComplete: false,
    kbQueried: false,
    templatesMatched: 1,
    webSearchUsed: false,
  },
};

describe('useIdeaBankFetch — Initial State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
  });

  it('starts with empty/null state', () => {
    const { result } = renderHook(() =>
      useIdeaBankFetch({
        selectedProducts: [],
        tempUploads: [],
        mode: 'freestyle',
      }),
    );

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.response).toBeNull();
    expect(result.current.slotSuggestions).toEqual([]);
    expect(result.current.mergedPrompt).toBe('');
  });

  it('exposes fetchSuggestions function', () => {
    const { result } = renderHook(() =>
      useIdeaBankFetch({
        selectedProducts: [],
        tempUploads: [],
        mode: 'freestyle',
      }),
    );

    expect(typeof result.current.fetchSuggestions).toBe('function');
  });
});

describe('useIdeaBankFetch — fetchSuggestions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
  });

  it('sets loading true during fetch', async () => {
    let resolveResponse: (value: unknown) => void;
    global.fetch = vi.fn().mockReturnValue(
      new Promise((resolve) => {
        resolveResponse = resolve;
      }),
    );

    const { result } = renderHook(() =>
      useIdeaBankFetch({
        selectedProducts: [mockProduct],
        tempUploads: [],
        mode: 'freestyle',
      }),
    );

    act(() => {
      result.current.fetchSuggestions();
    });

    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveResponse!({
        ok: true,
        json: () => Promise.resolve(mockSuggestResponse),
      });
    });
  });

  it('processes successful response with suggestions + analysisStatus', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuggestResponse),
    });

    const { result } = renderHook(() =>
      useIdeaBankFetch({
        selectedProducts: [mockProduct],
        tempUploads: [],
        mode: 'freestyle',
      }),
    );

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.response).not.toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('sets error on network failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() =>
      useIdeaBankFetch({
        selectedProducts: [mockProduct],
        tempUploads: [],
        mode: 'freestyle',
      }),
    );

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    expect(result.current.error).toBeTruthy();
    expect(result.current.loading).toBe(false);
  });

  it('sets error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    const { result } = renderHook(() =>
      useIdeaBankFetch({
        selectedProducts: [mockProduct],
        tempUploads: [],
        mode: 'freestyle',
      }),
    );

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    expect(result.current.error).toBeTruthy();
  });
});

describe('useIdeaBankFetch — Session Cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorageMock.clear();
  });

  it('saves response to sessionStorage after successful fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuggestResponse),
    });

    const { result } = renderHook(() =>
      useIdeaBankFetch({
        selectedProducts: [mockProduct],
        tempUploads: [],
        mode: 'freestyle',
      }),
    );

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    // The hook saves to sessionStorage after receiving a valid response
    expect(sessionStorageMock.setItem).toHaveBeenCalled();
    const key = sessionStorageMock.setItem.mock.calls[0][0];
    expect(key).toContain('idea-bank-cache');
  });

  it('completes fetch without error', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSuggestResponse),
    });

    const { result } = renderHook(() =>
      useIdeaBankFetch({
        selectedProducts: [mockProduct],
        tempUploads: [],
        mode: 'freestyle',
      }),
    );

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe('useIdeaBankFetch — analyzingCount', () => {
  it('counts uploads with status "analyzing"', () => {
    const uploadsWithAnalyzing = [
      { id: '1', url: 'test', status: 'analyzing' },
      { id: '2', url: 'test', status: 'confirmed' },
      { id: '3', url: 'test', status: 'analyzing' },
    ];

    const { result } = renderHook(() =>
      useIdeaBankFetch({
        selectedProducts: [],
        tempUploads: uploadsWithAnalyzing as TempUploadStub[],
        mode: 'freestyle',
      }),
    );

    expect(result.current.analyzingCount).toBe(2);
  });

  it('returns 0 when no uploads are analyzing', () => {
    const { result } = renderHook(() =>
      useIdeaBankFetch({
        selectedProducts: [],
        tempUploads: [],
        mode: 'freestyle',
      }),
    );

    expect(result.current.analyzingCount).toBe(0);
  });

  it('returns 0 when all uploads are confirmed', () => {
    const confirmedUploads = [
      { id: '1', url: 'test', status: 'confirmed' },
      { id: '2', url: 'test', status: 'confirmed' },
    ];

    const { result } = renderHook(() =>
      useIdeaBankFetch({
        selectedProducts: [],
        tempUploads: confirmedUploads as TempUploadStub[],
        mode: 'freestyle',
      }),
    );

    expect(result.current.analyzingCount).toBe(0);
  });
});
