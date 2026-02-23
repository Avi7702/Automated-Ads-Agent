// @ts-nocheck
/**
 * Tests for useAgentPlan hook
 * - State transitions through the agent plan flow
 * - API calls and data handling
 * - localStorage persistence (draft save/load)
 * - Error handling
 * - Reset behavior
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

// Mock queryClient before imports — use vi.hoisted to avoid TDZ errors
const { mockApiRequest } = vi.hoisted(() => {
  return { mockApiRequest: vi.fn() };
});
vi.mock('@/lib/queryClient', () => ({
  apiRequest: mockApiRequest,
  getCsrfToken: vi.fn().mockResolvedValue('test-csrf-token'),
}));

import { useAgentPlan } from '@/hooks/useAgentPlan';

// Helper to create a mock fetch response
function mockResponse(data: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 400,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  };
}

// Mock localStorage
const localStorageMock = (() => {
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
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

const mockSuggestions = [
  { id: 'sug1', title: 'Suggestion 1', description: 'First suggestion', type: 'social_post' },
  { id: 'sug2', title: 'Suggestion 2', description: 'Second suggestion', type: 'product_launch' },
];

const mockQuestions = [
  { id: 'q1', question: 'What is your target audience?', type: 'text' },
  { id: 'q2', question: 'What tone should we use?', type: 'choice', options: ['formal', 'casual'] },
];

const mockPlanBrief = {
  id: 'plan1',
  title: 'Q4 Campaign',
  steps: ['Step 1', 'Step 2'],
  estimatedTime: '30 min',
};

describe('useAgentPlan — Initial State', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts in idle state', () => {
    const { result } = renderHook(() => useAgentPlan());

    expect(result.current.stage).toBe('idle');
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.selectedSuggestion).toBeNull();
    expect(result.current.questions).toEqual([]);
    expect(result.current.answers).toEqual({});
    expect(result.current.planBrief).toBeNull();
    expect(result.current.executionSteps).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('exposes required action functions', () => {
    const { result } = renderHook(() => useAgentPlan());

    expect(typeof result.current.fetchSuggestions).toBe('function');
    expect(typeof result.current.selectSuggestion).toBe('function');
    expect(typeof result.current.answerQuestion).toBe('function');
    expect(typeof result.current.submitAnswers).toBe('function');
    expect(typeof result.current.approvePlan).toBe('function');
    expect(typeof result.current.revisePlan).toBe('function');
    expect(typeof result.current.reset).toBe('function');
  });
});

describe('useAgentPlan — fetchSuggestions()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetches suggestions and transitions to suggestions stage', async () => {
    mockApiRequest.mockResolvedValue(mockResponse({ suggestions: mockSuggestions }));

    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    expect(result.current.stage).toBe('suggestions');
    expect(result.current.suggestions).toEqual(mockSuggestions);
    expect(result.current.isLoading).toBe(false);
  });

  it('passes product IDs as query params', async () => {
    mockApiRequest.mockResolvedValue(mockResponse({ suggestions: mockSuggestions }));

    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.fetchSuggestions([1, 2, 3]);
    });

    const callUrl = mockApiRequest.mock.calls[0][1];
    expect(callUrl).toContain('products=1%2C2%2C3');
    expect(callUrl).toContain('limit=6');
  });

  it('handles API response without suggestions wrapper', async () => {
    mockApiRequest.mockResolvedValue(mockResponse(mockSuggestions));

    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    expect(result.current.suggestions).toEqual(mockSuggestions);
  });

  it('sets error on API failure', async () => {
    mockApiRequest.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    expect(result.current.error).toBe('Network error');
    expect(result.current.stage).toBe('idle');
    expect(result.current.isLoading).toBe(false);
  });

  it('sets isLoading to true during fetch', async () => {
    let resolveApi: (value: unknown) => void;
    mockApiRequest.mockReturnValue(
      new Promise((resolve) => {
        resolveApi = resolve;
      }),
    );

    const { result } = renderHook(() => useAgentPlan());

    act(() => {
      result.current.fetchSuggestions();
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveApi!(mockResponse({ suggestions: mockSuggestions }));
    });

    expect(result.current.isLoading).toBe(false);
  });
});

describe('useAgentPlan — selectSuggestion()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sets selected suggestion and transitions to questions stage', async () => {
    mockApiRequest.mockResolvedValue(mockResponse({ suggestions: mockSuggestions }));

    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    act(() => {
      result.current.selectSuggestion(mockSuggestions[0]);
    });

    expect(result.current.selectedSuggestion).toEqual(mockSuggestions[0]);
    expect(result.current.stage).toBe('questions');
  });

  it('resets answers when selecting a suggestion', async () => {
    mockApiRequest.mockResolvedValue(mockResponse({ suggestions: mockSuggestions }));

    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    // Answer a question first
    act(() => {
      result.current.answerQuestion('q1', 'some answer');
    });

    // Now select a suggestion — answers should reset
    act(() => {
      result.current.selectSuggestion(mockSuggestions[0]);
    });

    expect(result.current.answers).toEqual({});
  });
});

describe('useAgentPlan — answerQuestion()', () => {
  it('stores answers by question ID', () => {
    const { result } = renderHook(() => useAgentPlan());

    act(() => {
      result.current.answerQuestion('q1', 'Everyone');
      result.current.answerQuestion('q2', 'casual');
    });

    expect(result.current.answers).toEqual({ q1: 'Everyone', q2: 'casual' });
  });

  it('updates existing answer', () => {
    const { result } = renderHook(() => useAgentPlan());

    act(() => {
      result.current.answerQuestion('q1', 'First answer');
      result.current.answerQuestion('q1', 'Updated answer');
    });

    expect(result.current.answers.q1).toBe('Updated answer');
  });
});

describe('useAgentPlan — submitAnswers()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does nothing if no suggestion selected', async () => {
    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.submitAnswers();
    });

    expect(mockApiRequest).not.toHaveBeenCalled();
  });

  it('transitions to preview when plan is returned', async () => {
    mockApiRequest
      .mockResolvedValueOnce(mockResponse({ suggestions: mockSuggestions }))
      .mockResolvedValueOnce(mockResponse({ plan: mockPlanBrief, questions: [] }));

    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    act(() => {
      result.current.selectSuggestion(mockSuggestions[0]);
      result.current.answerQuestion('q1', 'Answer 1');
    });

    await act(async () => {
      await result.current.submitAnswers();
    });

    expect(result.current.stage).toBe('preview');
    expect(result.current.planBrief).toEqual(mockPlanBrief);
  });

  it('stays in questions stage when more questions returned', async () => {
    mockApiRequest
      .mockResolvedValueOnce(mockResponse({ suggestions: mockSuggestions }))
      .mockResolvedValueOnce(mockResponse({ questions: mockQuestions })); // no plan

    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    act(() => {
      result.current.selectSuggestion(mockSuggestions[0]);
    });

    await act(async () => {
      await result.current.submitAnswers();
    });

    expect(result.current.stage).toBe('questions');
    expect(result.current.questions).toEqual(mockQuestions);
  });
});

describe('useAgentPlan — reset()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('resets all state to initial values', async () => {
    mockApiRequest.mockResolvedValue(mockResponse({ suggestions: mockSuggestions }));

    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    act(() => {
      result.current.selectSuggestion(mockSuggestions[0]);
      result.current.answerQuestion('q1', 'answer');
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.stage).toBe('idle');
    expect(result.current.suggestions).toEqual([]);
    expect(result.current.selectedSuggestion).toBeNull();
    expect(result.current.answers).toEqual({});
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('clears localStorage draft on reset', async () => {
    const { result } = renderHook(() => useAgentPlan());

    act(() => {
      result.current.reset();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('agent-plan-draft');
  });
});

describe('useAgentPlan — localStorage draft persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  it('saves draft to localStorage when stage changes', async () => {
    mockApiRequest.mockResolvedValue(mockResponse({ suggestions: mockSuggestions }));

    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    // localStorageMock.setItem should have been called with the draft
    expect(localStorageMock.setItem).toHaveBeenCalledWith('agent-plan-draft', expect.any(String));

    // Find the call with the draft data
    const draftCall = localStorageMock.setItem.mock.calls.find((call) => call[0] === 'agent-plan-draft');
    const savedDraft = JSON.parse(draftCall[1]);
    expect(savedDraft.stage).toBe('suggestions');
    expect(savedDraft.suggestions).toEqual(mockSuggestions);
  });

  it('loads draft from localStorage on mount', () => {
    const existingDraft = {
      stage: 'suggestions',
      suggestions: mockSuggestions,
      selectedSuggestion: null,
      questions: [],
      answers: {},
      planBrief: null,
      executionSteps: [],
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(existingDraft));

    const { result } = renderHook(() => useAgentPlan());

    expect(result.current.stage).toBe('suggestions');
    expect(result.current.suggestions).toEqual(mockSuggestions);
  });

  it('converts executing draft stage to preview on load', () => {
    const executingDraft = {
      stage: 'executing',
      suggestions: [],
      selectedSuggestion: null,
      questions: [],
      answers: {},
      planBrief: mockPlanBrief,
      executionSteps: [],
    };
    localStorageMock.getItem.mockReturnValue(JSON.stringify(executingDraft));

    const { result } = renderHook(() => useAgentPlan());

    // 'executing' is not resumable — should be converted to 'preview'
    expect(result.current.stage).toBe('preview');
  });

  it('clears draft when stage becomes idle', async () => {
    const { result } = renderHook(() => useAgentPlan());

    act(() => {
      result.current.reset();
    });

    expect(localStorageMock.removeItem).toHaveBeenCalledWith('agent-plan-draft');
  });
});

describe('useAgentPlan — error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('handles non-Error thrown values', async () => {
    mockApiRequest.mockRejectedValue('string error');

    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    expect(result.current.error).toBe('Failed to fetch suggestions');
  });

  it('clears previous error when starting a new fetch', async () => {
    mockApiRequest
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce(mockResponse({ suggestions: mockSuggestions }));

    const { result } = renderHook(() => useAgentPlan());

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    expect(result.current.error).toBe('First error');

    await act(async () => {
      await result.current.fetchSuggestions();
    });

    expect(result.current.error).toBeNull();
  });
});
