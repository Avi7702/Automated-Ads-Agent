import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { socialRouter } from '../../routes/social.router';

// Mock external service imports used by the router
vi.mock('../../services/oauthService', () => ({
  getAuthorizationUrl: vi.fn().mockResolvedValue('https://linkedin.com/oauth?state=xyz'),
  handleOAuthCallback: vi.fn().mockResolvedValue({ connectionId: 'conn-1' }),
}));

vi.mock('../../services/tokenService', () => ({
  refreshToken: vi.fn().mockResolvedValue(undefined),
}));

describe('Social Router — /api/social', () => {
  let app: Express;
  let cookie: string;
  let overrides: ContextOverrides;

  const mockConnection = {
    id: 'conn-1',
    userId: 'test-user-1',
    platform: 'linkedin',
    platformUserId: 'li-user-1',
    platformUsername: 'testuser',
    profilePictureUrl: null,
    accountType: 'personal',
    scopes: ['w_member_social'],
    isActive: true,
    tokenExpiresAt: new Date(Date.now() + 86400000),
    lastUsedAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    connectedAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    overrides = {
      storage: {
        getSocialConnections: vi.fn().mockResolvedValue([mockConnection]),
        getSocialConnectionById: vi.fn().mockResolvedValue(mockConnection),
        getSocialConnectionByPlatform: vi.fn().mockResolvedValue(null),
        deleteSocialConnection: vi.fn().mockResolvedValue(undefined),
        createSocialConnection: vi.fn().mockResolvedValue(mockConnection),
        updateSocialConnection: vi.fn().mockResolvedValue(mockConnection),
      },
    };

    const result = createTestAppForRouter(socialRouter, '/api/social', overrides);
    app = result.app;
  });

  // ---------- GET /accounts ----------
  describe('GET /api/social/accounts', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/social/accounts');
      expect(res.status).toBe(401);
    });

    it('returns 200 with sanitized accounts', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/social/accounts').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.accounts).toHaveLength(1);
      expect(res.body.accounts[0].platform).toBe('linkedin');
      // Ensure sensitive fields are not leaked
      expect(res.body.accounts[0].accessToken).toBeUndefined();
      expect(res.body.accounts[0].refreshToken).toBeUndefined();
    });
  });

  // ---------- DELETE /accounts/:id ----------
  describe('DELETE /api/social/accounts/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/social/accounts/conn-1');
      expect(res.status).toBe(401);
    });

    it('returns 404 when connection not found', async () => {
      (overrides.storage!.getSocialConnectionById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(socialRouter, '/api/social', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app)
        .delete('/api/social/accounts/missing')
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });

    it('returns 403 when user does not own the connection', async () => {
      (overrides.storage!.getSocialConnectionById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockConnection,
        userId: 'other-user',
      });
      const rebuilt = createTestAppForRouter(socialRouter, '/api/social', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app)
        .delete('/api/social/accounts/conn-1')
        .set('Cookie', cookie);
      expect(res.status).toBe(403);
    });

    it('deletes account owned by user', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .delete('/api/social/accounts/conn-1')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ---------- GET /oauth/:platform/authorize ----------
  describe('GET /api/social/oauth/:platform/authorize', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/social/oauth/linkedin/authorize');
      expect(res.status).toBe(401);
    });

    it('returns 400 for unsupported platform', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .get('/api/social/oauth/facebook/authorize')
        .set('Cookie', cookie);
      expect(res.status).toBe(400);
    });

    it('returns authUrl for supported platform', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .get('/api/social/oauth/linkedin/authorize')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.authUrl).toContain('linkedin.com');
    });
  });

  // ---------- GET /oauth/:platform/callback ----------
  describe('GET /api/social/oauth/:platform/callback', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/social/oauth/linkedin/callback?code=abc&state=xyz');
      expect(res.status).toBe(401);
    });

    it('redirects for unsupported platform', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .get('/api/social/oauth/facebook/callback?code=abc&state=xyz')
        .set('Cookie', cookie);
      expect(res.status).toBe(302);
      expect(res.headers['location']).toContain('error=unsupported_platform');
    });

    it('redirects on missing params', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .get('/api/social/oauth/linkedin/callback')
        .set('Cookie', cookie);
      expect(res.status).toBe(302);
      expect(res.headers['location']).toContain('error=missing_params');
    });

    it('redirects with error when provider returns error', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .get('/api/social/oauth/linkedin/callback?error=access_denied')
        .set('Cookie', cookie);
      expect(res.status).toBe(302);
      expect(res.headers['location']).toContain('error=access_denied');
    });

    it('redirects to success on valid callback', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .get('/api/social/oauth/linkedin/callback?code=abc123&state=xyz456')
        .set('Cookie', cookie);
      expect(res.status).toBe(302);
      expect(res.headers['location']).toContain('connected=linkedin');
    });
  });

  // ---------- POST /accounts/:id/refresh ----------
  describe('POST /api/social/accounts/:id/refresh', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/social/accounts/conn-1/refresh');
      expect(res.status).toBe(401);
    });

    it('returns 404 when connection not found', async () => {
      (overrides.storage!.getSocialConnectionById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(socialRouter, '/api/social', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app)
        .post('/api/social/accounts/missing/refresh')
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });

    it('returns 403 when user does not own the connection', async () => {
      (overrides.storage!.getSocialConnectionById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockConnection,
        userId: 'other-user',
      });
      const rebuilt = createTestAppForRouter(socialRouter, '/api/social', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app)
        .post('/api/social/accounts/conn-1/refresh')
        .set('Cookie', cookie);
      expect(res.status).toBe(403);
    });

    it('refreshes token for owned connection', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/social/accounts/conn-1/refresh')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
