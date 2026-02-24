import { QueryClient, QueryFunction } from '@tanstack/react-query';

// CSRF token management - stored in memory for security (not localStorage)
let csrfToken: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

// Fetch CSRF token from server
async function fetchCsrfToken(): Promise<string> {
  const res = await fetch('/api/csrf-token', {
    method: 'GET',
    credentials: 'include',
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch CSRF token: ${res.status}`);
  }

  const data = await res.json();
  csrfToken = data.csrfToken;
  return csrfToken ?? '';
}

// Get CSRF token, fetching if necessary (singleton pattern to avoid race conditions)
export async function getCsrfToken(): Promise<string> {
  if (csrfToken) {
    return csrfToken;
  }

  // If already fetching, wait for that promise
  if (csrfTokenPromise) {
    return csrfTokenPromise;
  }

  // Start fetching and store the promise
  csrfTokenPromise = fetchCsrfToken().finally(() => {
    csrfTokenPromise = null;
  });

  return csrfTokenPromise;
}

// Refresh CSRF token (called on 403 errors or when token expires)
async function refreshCsrfToken(): Promise<string> {
  csrfToken = null;
  return fetchCsrfToken();
}

// Reset CSRF token state (for testing only)
export function _resetCsrfToken(): void {
  csrfToken = null;
  csrfTokenPromise = null;
}

// Initialize CSRF token on app load
export async function initializeCsrf(): Promise<void> {
  try {
    await getCsrfToken();
  } catch (error) {
    console.warn('Failed to initialize CSRF token:', error);
    // Non-fatal - token will be fetched on first state-changing request
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(method: string, url: string, data?: unknown | undefined): Promise<Response> {
  const isStateChanging = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method.toUpperCase());

  // Build headers
  const headers: Record<string, string> = {};
  if (data) {
    headers['Content-Type'] = 'application/json';
  }

  // Add CSRF token for state-changing requests
  if (isStateChanging) {
    try {
      const token = await getCsrfToken();
      headers['x-csrf-token'] = token;
    } catch (error) {
      console.warn('Failed to get CSRF token for request:', error);
    }
  }

  let res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : null,
    credentials: 'include',
  });

  // Handle CSRF token expiration/mismatch - retry once with fresh token
  if (res.status === 403 && isStateChanging) {
    try {
      const newToken = await refreshCsrfToken();
      headers['x-csrf-token'] = newToken;

      res = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : null,
        credentials: 'include',
      });
    } catch (refreshError) {
      console.error('Failed to refresh CSRF token:', refreshError);
      // Continue with original 403 response
    }
  }

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = 'returnNull' | 'throw';
export const getQueryFn: <T>(options: { on401: UnauthorizedBehavior }) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join('/') as string, {
      credentials: 'include',
    });

    if (unauthorizedBehavior === 'returnNull' && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: 'throw' }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      // Default: data considered fresh for 60s. Override per-query for different needs:
      // - Real-time data (gallery feed): staleTime: 0
      // - Semi-static data (products, templates): staleTime: 5 * 60 * 1000
      // - Static config (user profile, brand): staleTime: Infinity
      staleTime: 60_000,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
