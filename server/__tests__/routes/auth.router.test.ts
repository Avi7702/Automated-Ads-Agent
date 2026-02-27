import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { authRouter } from '../../routes/auth.router';

describe('Auth Router — /api/auth', () => {
  let app: Express;
  let cookie: string;
  let overrides: ContextOverrides;

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    password: 'hashed-password',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
  };

  beforeEach(() => {
    overrides = {
      storage: {
        getUserByEmail: vi.fn().mockResolvedValue(null),
        createUser: vi.fn().mockResolvedValue(mockUser),
        getUserById: vi.fn().mockResolvedValue(mockUser),
        updatePasswordHash: vi.fn().mockResolvedValue(undefined),
        deleteUser: vi.fn().mockResolvedValue(undefined),
        getGenerations: vi.fn().mockResolvedValue([]),
        getProducts: vi.fn().mockResolvedValue([]),
      },
    };

    const result = createTestAppForRouter(authRouter, '/api/auth', overrides);
    app = result.app;
  });

  // ---------- POST /register ----------
  describe('POST /api/auth/register', () => {
    it('registers a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'Password123!' });
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('user-1');
      expect(res.body.email).toBe('test@example.com');
    });

    it('returns 409 when user already exists', async () => {
      (overrides.storage!.getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      const rebuilt = createTestAppForRouter(authRouter, '/api/auth', overrides);
      const res = await request(rebuilt.app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'Password123!' });
      expect(res.status).toBe(409);
    });
  });

  // ---------- POST /login ----------
  describe('POST /api/auth/login', () => {
    it('returns 401 for non-existent user', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'Password123!' });
      expect(res.status).toBe(401);
    });

    it('logs in with valid credentials', async () => {
      (overrides.storage!.getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      const rebuilt = createTestAppForRouter(authRouter, '/api/auth', overrides);
      const res = await request(rebuilt.app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('user-1');
    });

    it('returns 401 for invalid password', async () => {
      (overrides.storage!.getUserByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      const rebuilt = createTestAppForRouter(authRouter, '/api/auth', overrides);
      // Override authService to return invalid
      rebuilt.ctx.domainServices.authService.comparePasswordWithRehash = vi
        .fn()
        .mockResolvedValue({ valid: false }) as typeof rebuilt.ctx.domainServices.authService.comparePasswordWithRehash;
      const res = await request(rebuilt.app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'WrongPassword!' });
      expect(res.status).toBe(401);
    });

    it('returns 429 when locked out', async () => {
      const rebuilt = createTestAppForRouter(authRouter, '/api/auth', overrides);
      rebuilt.ctx.domainServices.authService.isLockedOut = vi
        .fn()
        .mockResolvedValue(true) as typeof rebuilt.ctx.domainServices.authService.isLockedOut;
      rebuilt.ctx.domainServices.authService.getLockoutTimeRemaining = vi
        .fn()
        .mockResolvedValue(300) as typeof rebuilt.ctx.domainServices.authService.getLockoutTimeRemaining;
      const res = await request(rebuilt.app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'Password123!' });
      expect(res.status).toBe(429);
      expect(res.body.retryAfter).toBe(300);
    });
  });

  // ---------- POST /logout ----------
  describe('POST /api/auth/logout', () => {
    it('logs out and destroys session', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ---------- GET /me ----------
  describe('GET /api/auth/me', () => {
    it('returns authenticated: false when not logged in', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(false);
    });

    it('returns user info when logged in', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/auth/me').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(true);
      expect(res.body.id).toBe('user-1');
    });

    it('returns authenticated: false when session user not found in DB', async () => {
      (overrides.storage!.getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(authRouter, '/api/auth', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app).get('/api/auth/me').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.authenticated).toBe(false);
    });
  });

  // ---------- GET /demo ----------
  describe('GET /api/auth/demo', () => {
    it('creates or returns demo user', async () => {
      const res = await request(app).get('/api/auth/demo');
      expect(res.status).toBe(200);
      expect(res.body.isDemo).toBe(true);
    });
  });

  // ---------- POST /forgot-password ----------
  describe('POST /api/auth/forgot-password', () => {
    it('always returns success (prevents email enumeration)', async () => {
      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'any@example.com' });
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('reset link');
    });
  });

  // ---------- POST /reset-password ----------
  describe('POST /api/auth/reset-password', () => {
    it('returns 501 (not implemented)', async () => {
      const res = await request(app)
        .post('/api/auth/reset-password')
        .send({ token: 'abc123', newPassword: 'NewPassword123!' });
      expect(res.status).toBe(501);
    });
  });

  // ---------- POST /verify-email ----------
  describe('POST /api/auth/verify-email', () => {
    it('returns 501 (not implemented)', async () => {
      const res = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'abc123' });
      expect(res.status).toBe(501);
    });
  });

  // ---------- DELETE /account ----------
  describe('DELETE /api/auth/account', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/auth/account');
      expect(res.status).toBe(401);
    });

    it('deletes user account', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .delete('/api/auth/account')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.message).toContain('deleted');
    });
  });

  // ---------- GET /export ----------
  describe('GET /api/auth/export', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/auth/export');
      expect(res.status).toBe(401);
    });

    it('exports user data', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/auth/export').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.exportedAt).toBeDefined();
      expect(res.body.user).toBeDefined();
      expect(res.body.generations).toBeDefined();
      expect(res.body.products).toBeDefined();
    });
  });
});
