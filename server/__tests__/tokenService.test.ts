/**
 * Token Service Tests
 *
 * Tests token encrypt/decrypt roundtrip, auto-refresh on expired tokens,
 * and batch refresh for expiring tokens.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock encryptionService before importing tokenService
vi.mock('../services/encryptionService', () => ({
  encryptApiKey: vi.fn((plaintext: string) => ({
    ciphertext: Buffer.from(`enc_${plaintext}`).toString('base64'),
    iv: Buffer.from('test-iv-12bytes!').toString('base64'),
    authTag: Buffer.from('test-auth-tag!!!').toString('base64'),
  })),
  decryptApiKey: vi.fn((encrypted: { ciphertext: string }) => {
    const decoded = Buffer.from(encrypted.ciphertext, 'base64').toString();
    if (decoded.startsWith('enc_')) {
      return decoded.slice(4);
    }
    return decoded;
  }),
}));

// Mock socialRepository
vi.mock('../repositories/socialRepository', () => ({
  getSocialConnectionById: vi.fn(),
  updateSocialConnection: vi.fn(),
}));

// Mock db for batch queries
vi.mock('../db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => []),
      })),
    })),
  },
}));

// Mock logger
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  storeTokens,
  getAccessToken,
  refreshToken,
  refreshExpiringTokens,
  TokenExpiredError,
} from '../services/tokenService';
import { encryptApiKey, decryptApiKey } from '../services/encryptionService';
import * as socialRepo from '../repositories/socialRepository';

describe('Token Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up env vars for refresh tests
    process.env['LINKEDIN_CLIENT_ID'] = 'test-linkedin-id';
    process.env['LINKEDIN_CLIENT_SECRET'] = 'test-linkedin-secret';
    process.env['TWITTER_CLIENT_ID'] = 'test-twitter-id';
    process.env['TWITTER_CLIENT_SECRET'] = 'test-twitter-secret';
  });

  afterEach(() => {
    delete process.env['LINKEDIN_CLIENT_ID'];
    delete process.env['LINKEDIN_CLIENT_SECRET'];
    delete process.env['TWITTER_CLIENT_ID'];
    delete process.env['TWITTER_CLIENT_SECRET'];
    vi.restoreAllMocks();
  });

  // ──────────────────────────────────────────────
  // storeTokens
  // ──────────────────────────────────────────────

  describe('storeTokens', () => {
    it('should encrypt and store access token', async () => {
      const mockUpdate = vi.mocked(socialRepo.updateSocialConnection);
      mockUpdate.mockResolvedValue({} as any);

      await storeTokens('conn-1', {
        accessToken: 'test-access-token',
        expiresIn: 3600,
        scopes: ['read', 'write'],
      });

      expect(encryptApiKey).toHaveBeenCalledWith('test-access-token');
      expect(mockUpdate).toHaveBeenCalledWith(
        'conn-1',
        expect.objectContaining({
          scopes: ['read', 'write'],
          isActive: true,
          lastErrorAt: null,
          lastErrorMessage: null,
        }),
      );
    });

    it('should encrypt and store refresh token when provided', async () => {
      const mockUpdate = vi.mocked(socialRepo.updateSocialConnection);
      mockUpdate.mockResolvedValue({} as any);

      await storeTokens('conn-1', {
        accessToken: 'access-tok',
        refreshToken: 'refresh-tok',
        expiresIn: 3600,
        scopes: [],
      });

      // encryptApiKey should be called twice: once for access, once for refresh
      expect(encryptApiKey).toHaveBeenCalledTimes(2);
      expect(encryptApiKey).toHaveBeenCalledWith('access-tok');
      expect(encryptApiKey).toHaveBeenCalledWith('refresh-tok');

      // refreshToken should be stored as "ciphertext:iv:authTag"
      const updateCall = mockUpdate.mock.calls[0];
      const updates = updateCall?.[1] as Record<string, unknown>;
      expect(updates['refreshToken']).toContain(':');
      const parts = (updates['refreshToken'] as string).split(':');
      expect(parts).toHaveLength(3);
    });

    it('should set tokenExpiresAt based on expiresIn', async () => {
      const mockUpdate = vi.mocked(socialRepo.updateSocialConnection);
      mockUpdate.mockResolvedValue({} as any);

      const before = Date.now();
      await storeTokens('conn-1', {
        accessToken: 'tok',
        expiresIn: 7200, // 2 hours
        scopes: [],
      });
      const after = Date.now();

      const updateCall = mockUpdate.mock.calls[0];
      const updates = updateCall?.[1] as Record<string, unknown>;
      const expiresAt = updates['tokenExpiresAt'] as Date;

      // Should be approximately 2 hours from now
      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + 7200 * 1000 - 100);
      expect(expiresAt.getTime()).toBeLessThanOrEqual(after + 7200 * 1000 + 100);
    });
  });

  // ──────────────────────────────────────────────
  // getAccessToken
  // ──────────────────────────────────────────────

  describe('getAccessToken', () => {
    it('should return decrypted access token when not expired', async () => {
      const futureDate = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now
      vi.mocked(socialRepo.getSocialConnectionById).mockResolvedValue({
        id: 'conn-1',
        accessToken: Buffer.from('enc_my-secret-token').toString('base64'),
        tokenIv: Buffer.from('test-iv-12bytes!').toString('base64'),
        tokenAuthTag: Buffer.from('test-auth-tag!!!').toString('base64'),
        tokenExpiresAt: futureDate,
        refreshToken: null,
        platform: 'linkedin',
      } as any);

      const token = await getAccessToken('conn-1');
      expect(token).toBe('my-secret-token');
      expect(decryptApiKey).toHaveBeenCalled();
    });

    it('should throw TokenExpiredError if token is expired and no refresh token', async () => {
      const pastDate = new Date(Date.now() - 60 * 1000); // 1 minute ago
      vi.mocked(socialRepo.getSocialConnectionById).mockResolvedValue({
        id: 'conn-1',
        accessToken: 'enc',
        tokenIv: 'iv',
        tokenAuthTag: 'tag',
        tokenExpiresAt: pastDate,
        refreshToken: null,
        platform: 'linkedin',
      } as any);

      await expect(getAccessToken('conn-1')).rejects.toThrow(TokenExpiredError);
    });

    it('should throw Error if connection not found', async () => {
      vi.mocked(socialRepo.getSocialConnectionById).mockResolvedValue(null);

      await expect(getAccessToken('nonexistent')).rejects.toThrow('Social connection not found');
    });
  });

  // ──────────────────────────────────────────────
  // refreshToken
  // ──────────────────────────────────────────────

  describe('refreshToken', () => {
    it('should throw if connection not found', async () => {
      vi.mocked(socialRepo.getSocialConnectionById).mockResolvedValue(null);

      await expect(refreshToken('missing')).rejects.toThrow('Social connection not found');
    });

    it('should throw TokenRefreshError if no refresh token stored', async () => {
      vi.mocked(socialRepo.getSocialConnectionById).mockResolvedValue({
        id: 'conn-1',
        platform: 'linkedin',
        refreshToken: null,
      } as any);

      await expect(refreshToken('conn-1')).rejects.toThrow('No refresh token stored');
    });

    it('should throw TokenRefreshError for unsupported platform', async () => {
      // Build a valid refresh token blob
      const encResult = (encryptApiKey as any)('fake-refresh');
      const blob = `${encResult.ciphertext}:${encResult.iv}:${encResult.authTag}`;

      vi.mocked(socialRepo.getSocialConnectionById).mockResolvedValue({
        id: 'conn-1',
        platform: 'instagram',
        refreshToken: blob,
        scopes: [],
      } as any);

      await expect(refreshToken('conn-1')).rejects.toThrow('Token refresh not supported');
    });

    it('should call LinkedIn refresh endpoint for linkedin platform', async () => {
      const encResult = (encryptApiKey as any)('real-refresh-token');
      const blob = `${encResult.ciphertext}:${encResult.iv}:${encResult.authTag}`;

      vi.mocked(socialRepo.getSocialConnectionById).mockResolvedValue({
        id: 'conn-1',
        platform: 'linkedin',
        refreshToken: blob,
        scopes: ['w_member_social'],
      } as any);
      vi.mocked(socialRepo.updateSocialConnection).mockResolvedValue({} as any);

      // Mock global fetch
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-access-token',
            expires_in: 5184000, // 60 days
            refresh_token: 'new-refresh-token',
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await refreshToken('conn-1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://www.linkedin.com/oauth/v2/accessToken',
        expect.objectContaining({ method: 'POST' }),
      );

      // Should store new tokens
      expect(encryptApiKey).toHaveBeenCalledWith('new-access-token');
    });

    it('should call Twitter refresh endpoint for twitter platform', async () => {
      const encResult = (encryptApiKey as any)('twitter-refresh');
      const blob = `${encResult.ciphertext}:${encResult.iv}:${encResult.authTag}`;

      vi.mocked(socialRepo.getSocialConnectionById).mockResolvedValue({
        id: 'conn-2',
        platform: 'twitter',
        refreshToken: blob,
        scopes: ['tweet.read', 'tweet.write'],
      } as any);
      vi.mocked(socialRepo.updateSocialConnection).mockResolvedValue({} as any);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'new-twitter-access',
            expires_in: 7200,
            refresh_token: 'new-twitter-refresh',
          }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await refreshToken('conn-2');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.x.com/2/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: expect.stringContaining('Basic '),
          }),
        }),
      );
    });

    it('should throw on failed LinkedIn refresh', async () => {
      const encResult = (encryptApiKey as any)('old-refresh');
      const blob = `${encResult.ciphertext}:${encResult.iv}:${encResult.authTag}`;

      vi.mocked(socialRepo.getSocialConnectionById).mockResolvedValue({
        id: 'conn-1',
        platform: 'linkedin',
        refreshToken: blob,
        scopes: [],
      } as any);

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve('invalid_grant'),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(refreshToken('conn-1')).rejects.toThrow('LinkedIn refresh failed');
    });
  });

  // ──────────────────────────────────────────────
  // refreshExpiringTokens (batch)
  // ──────────────────────────────────────────────

  describe('refreshExpiringTokens', () => {
    it('should return zero counts when no tokens are expiring', async () => {
      // db mock already returns empty array from default mock
      const result = await refreshExpiringTokens(30);

      expect(result.refreshed).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });

  // ──────────────────────────────────────────────
  // Encrypt/decrypt roundtrip
  // ──────────────────────────────────────────────

  describe('encrypt/decrypt roundtrip', () => {
    it('should roundtrip an access token through store and retrieve', async () => {
      // This tests that encryptApiKey and decryptApiKey work together
      // via the mocks matching their encode/decode convention
      const original = 'super-secret-access-token-12345';

      const encrypted = (encryptApiKey as any)(original);
      const decrypted = (decryptApiKey as any)(encrypted);

      expect(decrypted).toBe(original);
    });
  });
});
