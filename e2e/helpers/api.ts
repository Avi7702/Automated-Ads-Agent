import { APIRequestContext } from '@playwright/test';

const BASE = 'http://localhost:3000';

/**
 * Authenticated GET request wrapper for E2E tests.
 * Includes x-e2e-test header to bypass rate limiting.
 */
export async function apiGet(request: APIRequestContext, path: string) {
  return request.get(`${BASE}${path}`, {
    headers: { 'x-e2e-test': 'true' },
  });
}

/**
 * Authenticated POST request wrapper for E2E tests.
 * Sends JSON by default.
 */
export async function apiPost(request: APIRequestContext, path: string, data?: unknown) {
  return request.post(`${BASE}${path}`, {
    data,
    headers: {
      'x-e2e-test': 'true',
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Authenticated PUT request wrapper for E2E tests.
 */
export async function apiPut(request: APIRequestContext, path: string, data?: unknown) {
  return request.put(`${BASE}${path}`, {
    data,
    headers: {
      'x-e2e-test': 'true',
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Authenticated DELETE request wrapper for E2E tests.
 */
export async function apiDelete(request: APIRequestContext, path: string) {
  return request.delete(`${BASE}${path}`, {
    headers: { 'x-e2e-test': 'true' },
  });
}

/**
 * Authenticated multipart POST request for file uploads.
 */
export async function apiPostMultipart(
  request: APIRequestContext,
  path: string,
  multipart: Record<string, string | { name: string; mimeType: string; buffer: Buffer }>,
) {
  return request.post(`${BASE}${path}`, {
    multipart,
    headers: { 'x-e2e-test': 'true' },
  });
}
