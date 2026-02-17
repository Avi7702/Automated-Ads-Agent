/**
 * Typed Fetch Utilities with Zod Runtime Validation
 *
 * Wraps native fetch with Zod schema validation. On schema mismatch,
 * logs a warning but returns the raw data (graceful degradation) so
 * the app never breaks due to a schema drift — only surfaces warnings
 * in the console for developers.
 *
 * Usage:
 *   import { typedGet, typedPost } from '@/lib/typedFetch';
 *   import { ListProductsResponse } from '@shared/contracts';
 *   const products = await typedGet('/api/products', ListProductsResponse);
 */
import { z } from 'zod';
import { getCsrfToken } from './queryClient';

/** Fetch CSRF token with dev-mode logging on failure. */
async function fetchCsrfToken(): Promise<string> {
  return getCsrfToken().catch((err: Error) => {
    if (import.meta.env.DEV) {
      console.warn('[typedFetch] CSRF token fetch failed:', err.message);
    }
    return '';
  });
}

// ─── GET ────────────────────────────────────────────────────────────

/**
 * Typed GET request with Zod schema validation.
 *
 * @param url    - API endpoint (relative, e.g. '/api/products')
 * @param schema - Zod schema to validate the response against
 * @returns Parsed & validated data (or raw data if validation fails with a warning)
 */
export async function typedGet<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const response = await fetch(url, { credentials: 'include' });

  if (!response.ok) {
    const text = (await response.text()) || response.statusText;
    throw new Error(`GET ${url} failed: ${response.status}: ${text}`);
  }

  const data: unknown = await response.json();
  return validateWithFallback(data, schema, 'GET', url);
}

// ─── POST (JSON) ────────────────────────────────────────────────────

/**
 * Typed POST request (JSON body) with Zod schema validation.
 *
 * Automatically includes the CSRF token for state-changing requests.
 *
 * @param url    - API endpoint
 * @param body   - Request body (will be JSON.stringify'd)
 * @param schema - Zod schema to validate the response against
 */
export async function typedPost<T>(url: string, body: unknown, schema: z.ZodType<T>): Promise<T> {
  const token = await fetchCsrfToken();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': token,
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = (await response.text()) || response.statusText;
    throw new Error(`POST ${url} failed: ${response.status}: ${text}`);
  }

  const data: unknown = await response.json();
  return validateWithFallback(data, schema, 'POST', url);
}

// ─── POST (FormData) ────────────────────────────────────────────────

/**
 * Typed POST request with FormData body and Zod schema validation.
 *
 * Does NOT set Content-Type — the browser sets multipart/form-data automatically.
 * Supports an AbortSignal for cancellable uploads.
 *
 * @param url      - API endpoint
 * @param formData - FormData object (images, files, etc.)
 * @param schema   - Zod schema to validate the response against
 * @param options  - Optional abort signal
 */
export async function typedPostFormData<T>(
  url: string,
  formData: FormData,
  schema: z.ZodType<T>,
  options?: { signal?: AbortSignal },
): Promise<T> {
  const token = await fetchCsrfToken();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'x-csrf-token': token,
    },
    credentials: 'include',
    body: formData,
    signal: options?.signal,
  });

  if (!response.ok) {
    // Try to parse JSON error body for richer messages
    let errorMessage: string;
    try {
      const errorJson = await response.json();
      errorMessage = (errorJson as { error?: string }).error || response.statusText;
    } catch {
      errorMessage = (await response.text()) || response.statusText;
    }
    throw new Error(`POST ${url} failed: ${response.status}: ${errorMessage}`);
  }

  const data: unknown = await response.json();
  return validateWithFallback(data, schema, 'POST', url);
}

// ─── Validation helper ──────────────────────────────────────────────

/**
 * Validates data against a Zod schema. If validation fails, logs a
 * console warning with the issues but returns the raw data cast to T.
 * This ensures the app never breaks due to schema drift in production.
 */
function validateWithFallback<T>(data: unknown, schema: z.ZodType<T>, method: string, url: string): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const isTestMode = import.meta.env.MODE === 'test';
    if (!isTestMode) {
      if (import.meta.env.DEV) {
        const previewIssues = result.error.issues.slice(0, 5);
        console.warn(
          `[typedFetch] Schema validation failed for ${method} ${url} (showing ${previewIssues.length}/${result.error.issues.length}):`,
          previewIssues,
        );
      } else {
        // In production, log a compact summary
        console.warn(`[typedFetch] Schema mismatch: ${method} ${url} (${result.error.issues.length} issue(s))`);
      }
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('typedFetch:schemaMismatch', {
          detail: { method, url, issueCount: result.error.issues.length, firstIssue: result.error.issues[0]?.message },
        }),
      );
    }
    // Graceful fallback — return raw data without breaking the app
    return data as T;
  }

  return result.data;
}
