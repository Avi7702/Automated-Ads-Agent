/**
 * Regression test for Bug 3:
 * GET /api/social/accounts returns { accounts: [...] } but the hook
 * was using res.json() directly (returning the wrapper object instead
 * of the unwrapped array), causing .filter() to fail.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Mock use-toast before importing the hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Mock date-fns to avoid import issues
vi.mock('date-fns', () => ({
  format: vi.fn().mockReturnValue('2026-03-04'),
}));

import { useApprovalQueue } from '@/hooks/useApprovalQueue';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useApprovalQueue — social accounts fetch (Bug 3 regression)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('unwraps { accounts: [...] } response and filters active accounts', async () => {
    // Mock fetch to simulate both endpoints
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/social/accounts') {
        // Real server returns { accounts: [...] }, NOT a plain array
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              accounts: [
                { id: 'sa-1', platform: 'linkedin', accountName: 'NDS', isActive: true },
                { id: 'sa-2', platform: 'instagram', accountName: 'NDS IG', isActive: false },
              ],
            }),
        };
      }
      // approval-queue endpoint
      return {
        ok: true,
        json: () => Promise.resolve({ data: { items: [] } }),
      };
    });

    const { result } = renderHook(() => useApprovalQueue(), { wrapper: createWrapper() });

    await waitFor(() => {
      // activeAccounts should only contain the active account
      expect(result.current.activeAccounts).toHaveLength(1);
      expect(result.current.activeAccounts[0]?.id).toBe('sa-1');
    });
  });

  it('returns empty array when response is not ok', async () => {
    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === '/api/social/accounts') {
        return { ok: false, status: 500, json: () => Promise.resolve({}) };
      }
      return {
        ok: true,
        json: () => Promise.resolve({ data: { items: [] } }),
      };
    });

    const { result } = renderHook(() => useApprovalQueue(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.activeAccounts).toHaveLength(0);
    });
  });
});
