// @ts-nocheck
/**
 * Tests for lib/typedFetch.ts
 * - typedGet
 * - typedPost
 * - typedPostFormData
 * - validateWithFallback (via public API)
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { z } from 'zod';

// Mock the queryClient module before importing typedFetch
vi.mock('@/lib/queryClient', () => ({
  getCsrfToken: vi.fn().mockResolvedValue('test-csrf-token'),
}));

// Import after mock is set up
import { typedGet, typedPost, typedPostFormData } from '@/lib/typedFetch';
import { getCsrfToken } from '@/lib/queryClient';

const ProductSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const ProductListSchema = z.array(ProductSchema);

describe('typedGet()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-setup default mock after resetAllMocks
    (getCsrfToken as ReturnType<typeof vi.fn>).mockResolvedValue('test-csrf-token');
  });

  it('fetches and validates data against schema', async () => {
    const mockData = { id: '1', name: 'Test Product' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const result = await typedGet('/api/products/1', ProductSchema);

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith('/api/products/1', { credentials: 'include' });
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      text: () => Promise.resolve('Product not found'),
    });

    await expect(typedGet('/api/products/999', ProductSchema)).rejects.toThrow(
      'GET /api/products/999 failed: 404: Product not found',
    );
  });

  it('uses statusText when response text is empty', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      text: () => Promise.resolve(''),
    });

    await expect(typedGet('/api/products', ProductListSchema)).rejects.toThrow('Internal Server Error');
  });

  it('returns data even when schema validation fails (graceful fallback)', async () => {
    const invalidData = { id: 123, name: 'Test' }; // id should be string
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(invalidData),
    });

    // Should not throw, returns raw data
    const result = await typedGet('/api/products/1', ProductSchema);
    expect(result).toEqual(invalidData);
  });

  it('passes credentials in request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', name: 'Test' }),
    });

    await typedGet('/api/test', ProductSchema);

    expect(fetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({ credentials: 'include' }));
  });
});

describe('typedPost()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (getCsrfToken as ReturnType<typeof vi.fn>).mockResolvedValue('test-csrf-token');
  });

  it('sends POST with JSON body and CSRF token', async () => {
    const mockData = { id: '1', name: 'Created' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const body = { name: 'New Product' };
    const result = await typedPost('/api/products', body, ProductSchema);

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith('/api/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-csrf-token': 'test-csrf-token',
      },
      credentials: 'include',
      body: JSON.stringify(body),
    });
  });

  it('throws on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: () => Promise.resolve('Validation failed'),
    });

    await expect(typedPost('/api/products', {}, ProductSchema)).rejects.toThrow(
      'POST /api/products failed: 400: Validation failed',
    );
  });

  it('fetches CSRF token before posting', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', name: 'Test' }),
    });

    await typedPost('/api/products', {}, ProductSchema);

    expect(getCsrfToken).toHaveBeenCalled();
  });

  it('handles CSRF token fetch failure gracefully', async () => {
    (getCsrfToken as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('CSRF fetch failed'));
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', name: 'Test' }),
    });

    // Should still complete (with empty CSRF token)
    const result = await typedPost('/api/products', {}, ProductSchema);
    expect(result).toEqual({ id: '1', name: 'Test' });
  });
});

describe('typedPostFormData()', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (getCsrfToken as ReturnType<typeof vi.fn>).mockResolvedValue('test-csrf-token');
  });

  it('sends POST with FormData and CSRF token', async () => {
    const mockData = { id: '1', name: 'Uploaded' };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    const formData = new FormData();
    formData.append('name', 'Test');
    const result = await typedPostFormData('/api/upload', formData, ProductSchema);

    expect(result).toEqual(mockData);
    expect(fetch).toHaveBeenCalledWith(
      '/api/upload',
      expect.objectContaining({
        method: 'POST',
        headers: { 'x-csrf-token': 'test-csrf-token' },
        body: formData,
        credentials: 'include',
      }),
    );
  });

  it('throws on non-ok response with JSON error body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: () => Promise.resolve({ error: 'File too large' }),
    });

    await expect(typedPostFormData('/api/upload', new FormData(), ProductSchema)).rejects.toThrow(
      'POST /api/upload failed: 422: File too large',
    );
  });

  it('falls back to text when JSON error parse fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      statusText: 'Server Error',
      json: () => Promise.reject(new Error('not json')),
      text: () => Promise.resolve('Internal error occurred'),
    });

    await expect(typedPostFormData('/api/upload', new FormData(), ProductSchema)).rejects.toThrow(
      'Internal error occurred',
    );
  });

  it('passes AbortSignal when provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', name: 'Test' }),
    });

    const controller = new AbortController();
    await typedPostFormData('/api/upload', new FormData(), ProductSchema, { signal: controller.signal });

    expect(fetch).toHaveBeenCalledWith('/api/upload', expect.objectContaining({ signal: controller.signal }));
  });

  it('does not include signal when not provided', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', name: 'Test' }),
    });

    await typedPostFormData('/api/upload', new FormData(), ProductSchema);

    const callArgs = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(callArgs.signal).toBeUndefined();
  });
});
