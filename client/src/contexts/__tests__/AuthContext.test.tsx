/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { AuthProvider, useAuth } from '../AuthContext';
import { _resetCsrfToken } from '@/lib/queryClient';

// Mock wouter
vi.mock('wouter', () => ({
  useLocation: () => ['/test', vi.fn()],
}));

// ============================================
// Test Wrapper
// ============================================

const createWrapper = () => {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  };
};

// Helper: create a mock fetch that handles CSRF token requests automatically
function createSmartMockFetch(
  responses: Array<{ ok: boolean; status?: number; json?: () => Promise<unknown>; text?: () => Promise<string> }>,
) {
  const csrfResponse = {
    ok: true,
    json: () => Promise.resolve({ csrfToken: 'test-csrf-token' }),
  };

  const mockFn = vi.fn();
  let responseIndex = 0;

  mockFn.mockImplementation((url: string) => {
    if (url === '/api/csrf-token') {
      return Promise.resolve(csrfResponse);
    }
    const response = responses[responseIndex];
    responseIndex++;
    return Promise.resolve(response);
  });

  return mockFn;
}

// ============================================
// AuthProvider Tests (30 tests)
// ============================================

describe('AuthProvider', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    _resetCsrfToken(); // Clear cached CSRF token between tests
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('starts with loading true', async () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {})); // Never resolves

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isLoading).toBe(true);
    });

    it('starts with user null', async () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.user).toBeNull();
    });

    it('starts with isAuthenticated false', async () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.isAuthenticated).toBe(false);
    });

    it('starts with error null', async () => {
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      const { result } = renderHook(() => useAuth(), {
        wrapper: createWrapper(),
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('checkAuth on mount', () => {
    it('checks auth status on mount', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ authenticated: true, id: 'user-1', email: 'test@example.com' }),
      });
      global.fetch = mockFetch;

      renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/auth/me', { credentials: 'include' });
      });
    });

    it('sets user when authenticated', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ authenticated: true, id: 'user-1', email: 'test@example.com' }),
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).toEqual({ id: 'user-1', email: 'test@example.com' });
        expect(result.current.isAuthenticated).toBe(true);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('sets user to null when not authenticated', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('handles network errors gracefully', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
        expect(result.current.isAuthenticated).toBe(false);
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('login', () => {
    it('calls login endpoint with credentials', async () => {
      // checkAuth returns not authenticated, then CSRF + login
      const mockFetch = createSmartMockFetch([
        { ok: false }, // checkAuth - not logged in
        { ok: true, json: () => Promise.resolve({ id: 'user-1', email: 'test@example.com' }) }, // login
      ]);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      // apiRequest adds CSRF token and Content-Type headers
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
          body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
        }),
      );
    });

    it('sets user on successful login', async () => {
      const mockFetch = createSmartMockFetch([
        { ok: false }, // checkAuth - not logged in
        { ok: true, json: () => Promise.resolve({ id: 'user-1', email: 'test@example.com' }) }, // login
      ]);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        await result.current.login('test@example.com', 'password123');
      });

      expect(result.current.user).toEqual({ id: 'user-1', email: 'test@example.com' });
      expect(result.current.isAuthenticated).toBe(true);
    });

    it('sets error on failed login', async () => {
      const mockFetch = createSmartMockFetch([
        { ok: false }, // checkAuth
        { ok: false, status: 401, text: () => Promise.resolve('Invalid credentials') }, // login fails
      ]);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword');
        } catch {
          // Expected to throw
        }
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.user).toBeNull();
    });

    it('throws error on login failure', async () => {
      const mockFetch = createSmartMockFetch([
        { ok: false }, // checkAuth
        { ok: false, status: 401, text: () => Promise.resolve('Invalid credentials') }, // login fails
      ]);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // login() throws on failure, verify via try/catch inside act()
      let thrownError: Error | null = null;
      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrongpassword');
        } catch (err) {
          thrownError = err as Error;
        }
      });

      expect(thrownError).toBeTruthy();
      expect(thrownError!.message).toContain('401');
    });

    it('clears previous error before login attempt', async () => {
      const mockFetch = createSmartMockFetch([
        { ok: false }, // checkAuth
        { ok: false, status: 401, text: () => Promise.resolve('First error') }, // first login fails
        { ok: true, json: () => Promise.resolve({ id: 'user-1', email: 'test@example.com' }) }, // second login succeeds
      ]);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      // First failed login
      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrong');
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();

      // Second successful login - error should be cleared
      await act(async () => {
        await result.current.login('test@example.com', 'correct');
      });

      expect(result.current.error).toBeNull();
    });

    it('sets isLoading during login', async () => {
      let resolveLogin: (value: unknown) => void;
      const loginPromise = new Promise((resolve) => {
        resolveLogin = resolve;
      });

      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url === '/api/csrf-token') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ csrfToken: 'test-csrf-token' }),
          });
        }
        if (url === '/api/auth/me') {
          return Promise.resolve({ ok: false });
        }
        // login call
        return loginPromise;
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      act(() => {
        result.current.login('test@example.com', 'password').catch(() => {});
      });

      // Should be loading during login
      expect(result.current.isLoading).toBe(true);

      // Complete login
      await act(async () => {
        resolveLogin!({
          ok: true,
          json: () => Promise.resolve({ id: '1', email: 'test@example.com' }),
        });
        await new Promise((r) => setTimeout(r, 0));
      });

      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('logout', () => {
    it('calls logout endpoint', async () => {
      // checkAuth returns authenticated user, then CSRF + logout
      const mockFetch = createSmartMockFetch([
        { ok: true, json: () => Promise.resolve({ authenticated: true, id: 'user-1', email: 'test@example.com' }) }, // checkAuth
        { ok: true }, // logout
      ]);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      await act(async () => {
        await result.current.logout();
      });

      // apiRequest adds CSRF token header
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );
    });

    it('clears user on logout', async () => {
      const mockFetch = createSmartMockFetch([
        { ok: true, json: () => Promise.resolve({ authenticated: true, id: 'user-1', email: 'test@example.com' }) }, // checkAuth
        { ok: true }, // logout
      ]);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      await act(async () => {
        await result.current.logout();
      });

      expect(result.current.user).toBeNull();
      expect(result.current.isAuthenticated).toBe(false);
    });

    it('clears user even if logout request fails', async () => {
      // checkAuth succeeds with authenticated user
      const mockFetch = vi.fn().mockImplementation((url: string) => {
        if (url === '/api/csrf-token') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ csrfToken: 'test-csrf-token' }),
          });
        }
        if (url === '/api/auth/me') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ authenticated: true, id: 'user-1', email: 'test@example.com' }),
          });
        }
        // logout call fails
        return Promise.reject(new Error('Network error'));
      });
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isAuthenticated).toBe(true));

      // logout() uses try/finally (no catch), so the error propagates
      // We catch it here to verify user is still cleared via the finally block
      await act(async () => {
        try {
          await result.current.logout();
        } catch {
          // Expected - logout re-throws the error after clearing user
        }
      });

      expect(result.current.user).toBeNull();
    });
  });

  describe('clearError', () => {
    it('clears error state', async () => {
      const mockFetch = createSmartMockFetch([
        { ok: false }, // checkAuth
        { ok: false, status: 401, text: () => Promise.resolve('Test error') }, // login fails
      ]);
      global.fetch = mockFetch;

      const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      await act(async () => {
        try {
          await result.current.login('test@example.com', 'wrong');
        } catch {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();

      act(() => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });
  });
});

describe('useAuth', () => {
  it('throws when used outside provider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    consoleSpy.mockRestore();
  });

  it('provides all expected methods', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });

    const { result } = renderHook(() => useAuth(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(typeof result.current.login).toBe('function');
    expect(typeof result.current.logout).toBe('function');
    expect(typeof result.current.clearError).toBe('function');
  });
});
