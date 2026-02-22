/**
 * Tests for Twitter/X Publisher
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

vi.stubGlobal('fetch', mockFetch);

import { publishToTwitter } from '../services/platforms/twitterPublisher';
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
    arrayBuffer: async () => (body instanceof ArrayBuffer ? body : Buffer.from(JSON.stringify(body)).buffer),
  } as unknown as Response;
}

function makeImageResponse(bytes: Uint8Array): Response {
  const buf = bytes.buffer;
  return {
    ok: true,
    status: 200,
    statusText: '200',
    text: async () => '',
    json: async () => ({}),
    headers: { get: () => null },
    arrayBuffer: async () => buf,
  } as unknown as Response;
}

const BASE_PARAMS: PublishParams = {
  accessToken: 'test-twitter-token',
  platformUserId: 'user123',
  accountType: 'personal',
  caption: 'Hello Twitter!',
};

describe('twitterPublisher', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  afterEach(() => {
    mockFetch.mockReset();
  });

  describe('publishToTwitter — text-only tweet', () => {
    it('creates a text-only tweet successfully', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(201, { data: { id: 'tweet_abc123', text: 'Hello Twitter!' } }));

      const result = await publishToTwitter(BASE_PARAMS);

      expect(result.success).toBe(true);
      expect(result.isRetryable).toBe(false);
      expect(result.platformPostId).toBe('tweet_abc123');
      expect(result.platformPostUrl).toBe('https://x.com/i/status/tweet_abc123');

      // Verify the POST to /2/tweets
      expect(mockFetch).toHaveBeenCalledOnce();
      const [url, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('/2/tweets');
      expect(options.method).toBe('POST');

      const body = JSON.parse(options.body as string) as Record<string, unknown>;
      expect(body['text']).toBe('Hello Twitter!');
      expect(body['media']).toBeUndefined();
    });

    it('includes Authorization header with Bearer token', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(201, { data: { id: 'tweet_xyz' } }));

      await publishToTwitter(BASE_PARAMS);

      const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
      const headers = options.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer test-twitter-token');
    });
  });

  describe('publishToTwitter — tweet with media', () => {
    it('uploads image (simple) then creates tweet with media', async () => {
      const smallImage = new Uint8Array(100).fill(0xff); // < 5MB

      // 1st fetch: fetch image from Cloudinary
      mockFetch.mockResolvedValueOnce(makeImageResponse(smallImage));

      // 2nd fetch: POST to /2/media/upload (simple upload)
      mockFetch.mockResolvedValueOnce(makeResponse(200, { data: { id: 'media_456' } }));

      // 3rd fetch: POST to /2/tweets
      mockFetch.mockResolvedValueOnce(makeResponse(201, { data: { id: 'tweet_with_media' } }));

      const result = await publishToTwitter({
        ...BASE_PARAMS,
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/ad.jpg',
      });

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('tweet_with_media');
      expect(result.platformPostUrl).toBe('https://x.com/i/status/tweet_with_media');
      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify the tweet body includes media_ids
      const tweetCall = mockFetch.mock.calls[2] as [string, RequestInit];
      const tweetBody = JSON.parse(tweetCall[1].body as string) as Record<string, unknown>;
      expect(tweetBody['media']).toEqual({ media_ids: ['media_456'] });
    });

    it('returns media_upload_failed if image fetch fails', async () => {
      // Fetching image from Cloudinary fails
      mockFetch.mockResolvedValueOnce(makeResponse(404, 'Not Found'));

      const result = await publishToTwitter({
        ...BASE_PARAMS,
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/missing.jpg',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('media_upload_failed');
      expect(result.isRetryable).toBe(true);
    });

    it('returns media_upload_failed if Twitter upload API fails', async () => {
      const smallImage = new Uint8Array(100).fill(0xab);

      // Fetch image succeeds
      mockFetch.mockResolvedValueOnce(makeImageResponse(smallImage));

      // Twitter upload fails
      mockFetch.mockResolvedValueOnce(makeResponse(500, 'Upload error'));

      const result = await publishToTwitter({
        ...BASE_PARAMS,
        imageUrl: 'https://res.cloudinary.com/test/image/upload/v1/ad.jpg',
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('media_upload_failed');
      expect(result.isRetryable).toBe(true);
    });
  });

  describe('publishToTwitter — error mapping', () => {
    it('maps HTTP 401 to token_expired (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(401, 'Unauthorized'));

      const result = await publishToTwitter(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('token_expired');
      expect(result.isRetryable).toBe(false);
    });

    it('maps HTTP 429 to rate_limited (retryable)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(429, 'Too Many Requests'));

      const result = await publishToTwitter(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('rate_limited');
      expect(result.isRetryable).toBe(true);
    });

    it('maps HTTP 403 to insufficient_permissions (non-retryable)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(403, 'Forbidden'));

      const result = await publishToTwitter(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('insufficient_permissions');
      expect(result.isRetryable).toBe(false);
    });

    it('maps HTTP 500 to platform_error (retryable)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(500, 'Internal Server Error'));

      const result = await publishToTwitter(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('platform_error');
      expect(result.isRetryable).toBe(true);
    });

    it('maps HTTP 503 to platform_error (retryable)', async () => {
      mockFetch.mockResolvedValueOnce(makeResponse(503, 'Service Unavailable'));

      const result = await publishToTwitter(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('platform_error');
      expect(result.isRetryable).toBe(true);
    });

    it('handles network error gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const result = await publishToTwitter(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('unknown');
      expect(result.isRetryable).toBe(true);
    });

    it('handles AbortError (timeout) as platform_error', async () => {
      const abortError = new Error('Request aborted');
      abortError.name = 'AbortError';
      mockFetch.mockRejectedValueOnce(abortError);

      const result = await publishToTwitter(BASE_PARAMS);

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('platform_error');
      expect(result.isRetryable).toBe(true);
    });
  });
});
