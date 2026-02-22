/**
 * Tests for publishingService
 *
 * Verifies routing, idempotency, error classification, and DB update calls.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- hoisted mocks ----
const {
  mockGetSocialConnectionById,
  mockUpdateSocialConnection,
  mockUpdatePostAfterCallback,
  mockScheduleRetry,
  mockDecryptApiKey,
  mockPublishToLinkedIn,
  mockPublishToTwitter,
} = vi.hoisted(() => {
  return {
    mockGetSocialConnectionById: vi.fn(),
    mockUpdateSocialConnection: vi.fn(),
    mockUpdatePostAfterCallback: vi.fn(),
    mockScheduleRetry: vi.fn(),
    mockDecryptApiKey: vi.fn(),
    mockPublishToLinkedIn: vi.fn(),
    mockPublishToTwitter: vi.fn(),
  };
});

vi.mock('../repositories/socialRepository', () => ({
  getSocialConnectionById: mockGetSocialConnectionById,
  updateSocialConnection: mockUpdateSocialConnection,
}));

vi.mock('../services/schedulingRepository', () => ({
  updatePostAfterCallback: mockUpdatePostAfterCallback,
  scheduleRetry: mockScheduleRetry,
}));

vi.mock('../services/encryptionService', () => ({
  decryptApiKey: mockDecryptApiKey,
}));

vi.mock('../services/platforms/linkedinPublisher', () => ({
  publishToLinkedIn: mockPublishToLinkedIn,
}));

vi.mock('../services/platforms/twitterPublisher', () => ({
  publishToTwitter: mockPublishToTwitter,
}));

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { publishPost, isRetryableError } from '../services/publishingService';
import type { PostRecord } from '../services/publishingService';
import type { SocialConnection } from '@shared/schema';

// ---- fixtures ----

function makeConnection(overrides: Partial<SocialConnection> = {}): SocialConnection {
  return {
    id: 'conn-1',
    userId: 'user-1',
    platform: 'linkedin',
    accessToken: 'encrypted-token',
    refreshToken: null,
    tokenIv: 'base64-iv',
    tokenAuthTag: 'base64-auth-tag',
    tokenExpiresAt: new Date(Date.now() + 3600_000),
    lastRefreshedAt: null,
    platformUserId: 'li-user-123',
    platformUsername: 'Test User',
    profilePictureUrl: null,
    accountType: 'personal',
    scopes: ['w_member_social'],
    isActive: true,
    lastUsedAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    connectedAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makePost(overrides: Partial<PostRecord> = {}): PostRecord {
  return {
    id: 'post-1',
    connection_id: 'conn-1',
    caption: 'Test caption',
    hashtags: ['#test'],
    image_url: null,
    user_id: 'user-1',
    platform_post_id: null,
    ...overrides,
  };
}

describe('publishingService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDecryptApiKey.mockReturnValue('plain-access-token');
    mockUpdatePostAfterCallback.mockResolvedValue([]);
    mockUpdateSocialConnection.mockResolvedValue(makeConnection());
    mockScheduleRetry.mockResolvedValue(true);
  });

  // ---- isRetryableError ----

  describe('isRetryableError', () => {
    it('returns true for unknown (undefined) error code', () => {
      expect(isRetryableError(undefined)).toBe(true);
    });

    it('returns true for rate_limited', () => {
      expect(isRetryableError('rate_limited')).toBe(true);
    });

    it('returns true for platform_error', () => {
      expect(isRetryableError('platform_error')).toBe(true);
    });

    it('returns false for content_policy_violation', () => {
      expect(isRetryableError('content_policy_violation')).toBe(false);
    });

    it('returns false for account_disconnected', () => {
      expect(isRetryableError('account_disconnected')).toBe(false);
    });

    it('returns false for invalid_credentials', () => {
      expect(isRetryableError('invalid_credentials')).toBe(false);
    });

    it('returns false for insufficient_permissions', () => {
      expect(isRetryableError('insufficient_permissions')).toBe(false);
    });
  });

  // ---- Connection not found ----

  describe('connection not found', () => {
    it('returns account_disconnected and updates DB when connection not found', async () => {
      mockGetSocialConnectionById.mockResolvedValue(null);

      const result = await publishPost(makePost());

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('account_disconnected');
      expect(result.isRetryable).toBe(false);
      expect(mockUpdatePostAfterCallback).toHaveBeenCalledWith(
        'post-1',
        false,
        expect.objectContaining({ failureReason: 'account_disconnected' }),
      );
    });
  });

  // ---- Inactive connection ----

  describe('inactive connection', () => {
    it('returns account_disconnected and updates DB when connection is inactive', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection({ isActive: false }));

      const result = await publishPost(makePost());

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('account_disconnected');
      expect(result.isRetryable).toBe(false);
      expect(mockPublishToLinkedIn).not.toHaveBeenCalled();
    });
  });

  // ---- Idempotency ----

  describe('idempotency', () => {
    it('skips publishing if platformPostId is already set', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection());

      const result = await publishPost(makePost({ platform_post_id: 'existing-post-id' }));

      expect(result.success).toBe(true);
      expect(result.platformPostId).toBe('existing-post-id');
      expect(mockPublishToLinkedIn).not.toHaveBeenCalled();
      expect(mockPublishToTwitter).not.toHaveBeenCalled();
      // No DB update for already-published posts
      expect(mockUpdatePostAfterCallback).not.toHaveBeenCalled();
    });
  });

  // ---- Platform routing ----

  describe('platform routing', () => {
    it('routes linkedin platform to publishToLinkedIn', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection({ platform: 'linkedin' }));
      mockPublishToLinkedIn.mockResolvedValue({
        success: true,
        platformPostId: 'li-post-1',
        platformPostUrl: 'https://linkedin.com/feed/update/li-post-1',
        isRetryable: false,
      });

      const result = await publishPost(makePost());

      expect(result.success).toBe(true);
      expect(mockPublishToLinkedIn).toHaveBeenCalledOnce();
      expect(mockPublishToTwitter).not.toHaveBeenCalled();
    });

    it('routes twitter platform to publishToTwitter', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection({ platform: 'twitter' }));
      mockPublishToTwitter.mockResolvedValue({
        success: true,
        platformPostId: 'tw-post-1',
        platformPostUrl: 'https://x.com/i/status/tw-post-1',
        isRetryable: false,
      });

      const result = await publishPost(makePost());

      expect(result.success).toBe(true);
      expect(mockPublishToTwitter).toHaveBeenCalledOnce();
      expect(mockPublishToLinkedIn).not.toHaveBeenCalled();
    });

    it('returns unknown error for unsupported platform', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection({ platform: 'instagram' }));

      const result = await publishPost(makePost());

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('unknown');
      expect(result.isRetryable).toBe(false);
    });
  });

  // ---- DB updates on success ----

  describe('DB updates on success', () => {
    it('calls updatePostAfterCallback with success=true and platformPostId', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection({ platform: 'linkedin' }));
      mockPublishToLinkedIn.mockResolvedValue({
        success: true,
        platformPostId: 'li-post-123',
        platformPostUrl: 'https://linkedin.com/feed/update/li-post-123',
        isRetryable: false,
      });

      await publishPost(makePost());

      expect(mockUpdatePostAfterCallback).toHaveBeenCalledWith('post-1', true, {
        platformPostId: 'li-post-123',
        platformPostUrl: 'https://linkedin.com/feed/update/li-post-123',
      });
    });

    it('updates social connection lastUsedAt on success', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection({ platform: 'linkedin' }));
      mockPublishToLinkedIn.mockResolvedValue({
        success: true,
        platformPostId: 'li-post-123',
        isRetryable: false,
      });

      await publishPost(makePost());

      expect(mockUpdateSocialConnection).toHaveBeenCalledWith(
        'conn-1',
        expect.objectContaining({ lastUsedAt: expect.any(Date) }),
      );
    });
  });

  // ---- DB updates on failure ----

  describe('DB updates on failure', () => {
    it('calls updatePostAfterCallback with success=false on publish failure', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection({ platform: 'linkedin' }));
      mockPublishToLinkedIn.mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded',
        errorCode: 'rate_limited',
        isRetryable: true,
      });

      await publishPost(makePost());

      expect(mockUpdatePostAfterCallback).toHaveBeenCalledWith('post-1', false, {
        errorMessage: 'Rate limit exceeded',
        failureReason: 'rate_limited',
      });
    });

    it('deactivates connection on token_expired error', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection({ platform: 'linkedin' }));
      mockPublishToLinkedIn.mockResolvedValue({
        success: false,
        error: 'Token has expired',
        errorCode: 'token_expired',
        isRetryable: false,
      });

      await publishPost(makePost());

      expect(mockUpdateSocialConnection).toHaveBeenCalledWith(
        'conn-1',
        expect.objectContaining({
          isActive: false,
          lastErrorAt: expect.any(Date),
          lastErrorMessage: 'Token has expired',
        }),
      );
    });

    it('schedules retry for retryable errors', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection({ platform: 'linkedin' }));
      mockPublishToLinkedIn.mockResolvedValue({
        success: false,
        error: 'Rate limit exceeded',
        errorCode: 'rate_limited',
        isRetryable: true,
      });

      await publishPost(makePost());

      expect(mockScheduleRetry).toHaveBeenCalledWith('post-1');
    });

    it('does NOT schedule retry for non-retryable errors', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection({ platform: 'linkedin' }));
      mockPublishToLinkedIn.mockResolvedValue({
        success: false,
        error: 'Content policy violation',
        errorCode: 'content_policy_violation',
        isRetryable: false,
      });

      await publishPost(makePost());

      expect(mockScheduleRetry).not.toHaveBeenCalled();
    });

    it('updates connection lastErrorAt for non-token-expired errors', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection({ platform: 'twitter' }));
      mockPublishToTwitter.mockResolvedValue({
        success: false,
        error: 'Platform error',
        errorCode: 'platform_error',
        isRetryable: true,
      });

      await publishPost(makePost());

      expect(mockUpdateSocialConnection).toHaveBeenCalledWith(
        'conn-1',
        expect.objectContaining({
          lastErrorAt: expect.any(Date),
          lastErrorMessage: 'Platform error',
        }),
      );
      // Should NOT set isActive: false for non-token-expired errors
      const callArgs = mockUpdateSocialConnection.mock.calls[0] as [string, Record<string, unknown>];
      expect(callArgs[1]['isActive']).toBeUndefined();
    });
  });

  // ---- Token decryption failure ----

  describe('token decryption failure', () => {
    it('returns invalid_credentials if decryptApiKey throws', async () => {
      mockGetSocialConnectionById.mockResolvedValue(makeConnection({ platform: 'linkedin' }));
      mockDecryptApiKey.mockImplementation(() => {
        throw new Error('Decryption failed');
      });

      const result = await publishPost(makePost());

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('invalid_credentials');
      expect(result.isRetryable).toBe(false);
      expect(mockPublishToLinkedIn).not.toHaveBeenCalled();
    });
  });
});
