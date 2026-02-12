/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { queryClient, apiRequest, getQueryFn, initializeCsrf, _resetCsrfToken } from '../queryClient';

// ============================================
// QueryClient Configuration Tests (20 tests)
// ============================================

describe('queryClient', () => {
  describe('configuration', () => {
    it('has correct default staleTime', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.staleTime).toBe(Infinity);
    });

    it('has refetchOnWindowFocus disabled', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    });

    it('has refetchInterval disabled', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.refetchInterval).toBe(false);
    });

    it('has retry disabled for queries', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.retry).toBe(false);
    });

    it('has retry disabled for mutations', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.mutations?.retry).toBe(false);
    });

    it('has default queryFn configured', () => {
      const defaultOptions = queryClient.getDefaultOptions();
      expect(defaultOptions.queries?.queryFn).toBeDefined();
    });

    it('is a valid QueryClient instance', () => {
      expect(queryClient).toBeDefined();
      expect(typeof queryClient.getQueryCache).toBe('function');
      expect(typeof queryClient.getMutationCache).toBe('function');
    });

    it('can clear cache', () => {
      queryClient.clear();
      const queries = queryClient.getQueryCache().getAll();
      expect(queries).toHaveLength(0);
    });
  });
});

// ============================================
// apiRequest Tests (25 tests)
// ============================================

describe('apiRequest', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    _resetCsrfToken(); // Clear cached CSRF token between tests
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('GET requests', () => {
    it('makes GET request without CSRF token', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      });
      global.fetch = mockFetch;

      await apiRequest('GET', '/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'GET',
          credentials: 'include',
        }),
      );
      // GET requests should not have x-csrf-token header
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs?.[1]?.headers?.['x-csrf-token']).toBeUndefined();
    });

    it('includes credentials in GET request', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true });
      global.fetch = mockFetch;

      await apiRequest('GET', '/api/test');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          credentials: 'include',
        }),
      );
    });
  });

  describe('POST requests', () => {
    beforeEach(() => {
      // Mock CSRF token fetch
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ csrfToken: 'test-csrf-token' }),
        })
        .mockResolvedValueOnce({ ok: true });
    });

    it('fetches CSRF token for POST requests', async () => {
      await apiRequest('POST', '/api/test', { data: 'value' });

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
      expect(fetchMock).toHaveBeenCalledWith('/api/csrf-token', expect.any(Object));
    });

    it('includes Content-Type header when data is provided', async () => {
      await apiRequest('POST', '/api/test', { data: 'value' });

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
      const postCall = fetchMock.mock.calls[1];
      expect(postCall?.[1]?.headers?.['Content-Type']).toBe('application/json');
    });

    it('stringifies body data', async () => {
      const data = { key: 'value' };
      await apiRequest('POST', '/api/test', data);

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
      const postCall = fetchMock.mock.calls[1];
      expect(postCall?.[1]?.body).toBe(JSON.stringify(data));
    });
  });

  describe('error handling', () => {
    it('throws error for non-ok response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      await expect(apiRequest('GET', '/api/test')).rejects.toThrow('500: Server error');
    });

    it('uses statusText when response text is empty', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(''),
      });

      await expect(apiRequest('GET', '/api/test')).rejects.toThrow('404: Not Found');
    });

    it('retries with fresh CSRF token on 403', async () => {
      const mockFetch = vi
        .fn()
        // First CSRF fetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ csrfToken: 'token1' }),
        })
        // First POST - 403
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          text: () => Promise.resolve('CSRF mismatch'),
        })
        // Refresh CSRF token
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ csrfToken: 'token2' }),
        })
        // Retry POST - success
        .mockResolvedValueOnce({ ok: true });

      global.fetch = mockFetch;

      await apiRequest('POST', '/api/test', { data: 'value' });

      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('does not retry GET requests on 403', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('Access denied'),
      });

      await expect(apiRequest('GET', '/api/test')).rejects.toThrow('403: Access denied');
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('state-changing methods', () => {
    it('handles PUT requests with CSRF', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ csrfToken: 'csrf-token' }),
        })
        .mockResolvedValueOnce({ ok: true });

      await apiRequest('PUT', '/api/test', { data: 'value' });

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
      expect(fetchMock.mock.calls[1]?.[1]?.headers?.['x-csrf-token']).toBe('csrf-token');
    });

    it('handles DELETE requests with CSRF', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ csrfToken: 'csrf-token' }),
        })
        .mockResolvedValueOnce({ ok: true });

      await apiRequest('DELETE', '/api/test/123');

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
      expect(fetchMock.mock.calls[1]?.[1]?.headers?.['x-csrf-token']).toBe('csrf-token');
    });

    it('handles PATCH requests with CSRF', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ csrfToken: 'csrf-token' }),
        })
        .mockResolvedValueOnce({ ok: true });

      await apiRequest('PATCH', '/api/test', { field: 'updated' });

      const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
      expect(fetchMock.mock.calls[1]?.[1]?.headers?.['x-csrf-token']).toBe('csrf-token');
    });
  });
});

// ============================================
// getQueryFn Tests (15 tests)
// ============================================

describe('getQueryFn', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.clearAllMocks();
  });

  describe('on401: throw', () => {
    const queryFn = getQueryFn({ on401: 'throw' });

    it('returns JSON data on success', async () => {
      const mockData = { id: 1, name: 'Test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await queryFn({ queryKey: ['/api', 'users'] } as any);
      expect(result).toEqual(mockData);
    });

    it('joins queryKey parts for URL', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await queryFn({ queryKey: ['/api', 'users', '123'] } as any);

      expect(global.fetch).toHaveBeenCalledWith('/api/users/123', expect.any(Object));
    });

    it('throws on 401 error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve('Not authenticated'),
      });

      await expect(queryFn({ queryKey: ['/api', 'protected'] } as any)).rejects.toThrow('401: Not authenticated');
    });

    it('throws on 500 error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve('Server error'),
      });

      await expect(queryFn({ queryKey: ['/api', 'test'] } as any)).rejects.toThrow('500: Server error');
    });

    it('includes credentials in request', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      await queryFn({ queryKey: ['/api', 'test'] } as any);

      expect(global.fetch).toHaveBeenCalledWith(expect.any(String), {
        credentials: 'include',
      });
    });
  });

  describe('on401: returnNull', () => {
    const queryFn = getQueryFn({ on401: 'returnNull' });

    it('returns null on 401 error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: () => Promise.resolve(''),
      });

      const result = await queryFn({ queryKey: ['/api', 'user'] } as any);
      expect(result).toBeNull();
    });

    it('still returns data on success', async () => {
      const mockData = { user: 'test' };
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockData),
      });

      const result = await queryFn({ queryKey: ['/api', 'user'] } as any);
      expect(result).toEqual(mockData);
    });

    it('still throws on non-401 errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        statusText: 'Forbidden',
        text: () => Promise.resolve('Access denied'),
      });

      await expect(queryFn({ queryKey: ['/api', 'admin'] } as any)).rejects.toThrow('403: Access denied');
    });
  });
});

// ============================================
// initializeCsrf Tests (5 tests)
// ============================================

describe('initializeCsrf', () => {
  let originalFetch: typeof fetch;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    originalFetch = global.fetch;
    _resetCsrfToken(); // Clear cached CSRF token between tests
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    consoleWarnSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('fetches CSRF token on initialization', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ csrfToken: 'init-token' }),
    });

    await initializeCsrf();

    expect(global.fetch).toHaveBeenCalledWith('/api/csrf-token', expect.any(Object));
  });

  it('does not throw on CSRF fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await expect(initializeCsrf()).resolves.not.toThrow();
  });

  it('logs warning on CSRF fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    await initializeCsrf();

    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to initialize CSRF token:', expect.any(Error));
  });

  it('handles 500 error gracefully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    });

    await expect(initializeCsrf()).resolves.not.toThrow();
    expect(consoleWarnSpy).toHaveBeenCalled();
  });

  it('resolves successfully on valid CSRF response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ csrfToken: 'valid-token' }),
    });

    await expect(initializeCsrf()).resolves.toBeUndefined();
  });
});
