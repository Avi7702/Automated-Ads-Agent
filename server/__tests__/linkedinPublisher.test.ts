/**
 * Tests for LinkedIn Publisher
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ---- hoisted mocks ----
const { mockFetch } = vi.hoisted(() => {
  const mockFetch = vi.fn();
  return { mockFetch };
});

vi.mock('../../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Replace global fetch before importing the module
vi.stubGlobal('fetch', mockFetch);

import { publishToLinkedIn } from '../services/platforms/linkedinPublisher';
import type { PublishParams } from '../services/platforms/types';

// ---- helpers ----

function makeResponse(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  const headersMap = new Map(Object.entries(headers));
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: String(status),
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
    json: async () => (typeof body === 'string' ? JSON.parse(body) : body),
    headers: {
      get: (key: string) => headersMap.get(key.toLowerCase()) ?? null,
    },
  } as unknown as Response;
}

const BASE_PARAMS: PublishParams = {
  accessToken: 'test-linkedin-token',
  platformUserId: 'abc123',
  accountType: 'personal',
  caption: 'Hello LinkedIn!',
};

describe('linkedinPublisher', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe('publishToLinkedIn — text-only post', () => {
    it('creates a text-only post successfully', async () => {
      // Single fetch call: POST /rest/posts
      mockFetch.mockResolvedValueOnce(makeResponse(201, '', { 'x-restli-id': 'urn:li:share:9999' }));

      const result = await publishToLinkedIn(BASE_PARAMS);

      expect(result.success).toBe(true);
      expect(result.isRetryable).toBe(false);
      expect(result.platformPostId).toBe('urn:li:share:9999');
      expect(result.platformPostUrl).toContain('linkedin.com');

      // Verify the POST was made correctly
      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/rest/posts');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body as string) as Record<string, unknown>;
      expect(body['author']).toBe('urn:li:person:abc123');
      expect(body['commentary']).toBe('Hello LinkedIn!');
      expect(body['visibility']).toBe('PUBLIC');
      expect(body['content']).toBeUndefined(); // no image
    });

    it('uses urn:li:organization for business account type', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(201, '', { 'x-restli-id': 'urn:li:share:1234' }));

      await publishToLinkedIn({ ...BASE_PARAMS, accountType: 'business' });

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string) as Record<string, unknown>;
      expect(body['author']).toBe('urn:li:organization:abc123');
    });
  });

  describe('publishToLinkedIn — image post', () => {
    it('uploads image then creates post with image content', async () => {
      const imageBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]); // fake JPEG header
      const imageArrayBuffer = imageBytes.buffer;

      // 1st fetch: initializeUpload
      mockFetch.mockResolvedValueOnce(
        makeResponse(200, {
          value: {
            uploadUrl: 'https://upload.linkedin.com/put/here',
            image: 'urn:li:image:IMG123',
          },
        }),
      );

      // 2nd fetch: fetch image from Cloudinary URL — must return a Response with arrayBuffer()
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        statusText: '200',
        text: async () => '',
        json: async () => ({}),
        headers: { get: () => null },
        arrayBuffer: async () => imageArrayBuffer,
      } as unknown as Response);

      // 3rd fetch: PUT binary to uploadUrl
      mockFetch.mockResolvedValueOnce(makeResponse(201, ''));

      // 4th fetch: POST /rest/posts
      mockFetch.mockResolvedValueOnce(makeResponse(201, '', { 'x-restli-id': 'urn:li:share:5678' }));

      const result = await publishToLinkedIn({
        ...BASE_PARAMS,
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/ad.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('urn:li:share:5678');
      expect(mockFetch).toHaveBeenCalledTimes(4);

      // Verify the post body includes image content
      const postCall = mockFetch.mock.calls[3] as [string, RequestInit];
      const postBody = JSON.parse(postCall[1].body as string) as Record<string, unknown>;
      expect(postBody['content']).toEqual({
        media: {
          title: 'Image',
          id: 'urn:li:image:IMG123',
        },
      });
    });

    it('returns media_upload_failed if image fetch fails', async () => {
      // initializeUpload succeeds
      mockFetch.mockResolvedValueOnce(
        makeResponse(200, {
          value: {
            uploadUrl: 'https://upload.linkedin.com/put/here',
            image: 'urn:li:image:IMG999',
          },
        }),
      );

      // Fetching image from Cloudinary URL fails
      mockFetch.mockResolvedValueOnce(makeResponse(404, 'Not Found'));

      const result = await publishToLinkedIn({
        ...BASE_PARAMS,
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/missing.jpg',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('media_upload_failed');
      expect(result.isRetryable).toBe(true);
    });

    it('returns media_upload_failed if upload init fails', async () => {
      // initializeUpload fails
      mockFetch.mockResolvedValueOnce(makeResponse(500, 'Internal Server Error'));

      const result = await publishToLinkedIn({
        ...BASE_PARAMS,
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/ad.jpg',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('media_upload_failed');
      expect(result.isRetryable).toBe(true);
    });
  });

  describe('publishToLinkedIn — error mapping', () => {
    it('maps HTTP 401 to token_expired (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(401, 'Unauthorized'));

      const result = await publishToLinkedIn(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('token_expired');
      expect(result.isRetryable).toBe(false);
    });

    it('maps HTTP 429 to rate_limited (retryable)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(429, 'Too Many Requests'));

      const result = await publishToLinkedIn(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('rate_limited');
      expect(result.isRetryable).toBe(true);
    });

    it('maps HTTP 422 with policy keyword to content_policy_violation (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(422, '{"message":"Content violates policy"}'));

      const result = await publishToLinkedIn(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('content_policy_violation');
      expect(result.isRetryable).toBe(false);
    });

    it('maps HTTP 403 to insufficient_permissions (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(403, 'Forbidden'));

      const result = await publishToLinkedIn(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('insufficient_permissions');
      expect(result.isRetryable).toBe(false);
    });

    it('maps HTTP 500 to platform_error (retryable)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(500, 'Internal Server Error'));

      const result = await publishToLinkedIn(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('platform_error');
      expect(result.isRetryable).toBe(true);
    });

    it('maps HTTP 503 to platform_error (retryable)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(503, 'Service Unavailable'));

      const result = await publishToLinkedIn(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('platform_error');
      expect(result.isRetryable).toBe(true);
    });

    it('handles fetch network error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await publishToLinkedIn(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('unknown');
      expect(result.isRetryable).toBe(true);
    });

    it('handles AbortError (timeout) as platform_error', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await publishToLinkedIn(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('platform_error');
      expect(result.isRetryable).toBe(true);
    });
  });
});
