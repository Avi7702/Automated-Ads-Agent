import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { adminRouter } from '../../routes/admin.router';

describe('Admin Router — /api/admin', () => {
  let app: Express;
  let cookie: string;
  let overrides: ContextOverrides;

  beforeEach(() => {
    overrides = {};
    const result = createTestAppForRouter(adminRouter, '/api/admin', overrides);
    app = result.app;
  });

  // ---------- Auth + Role guard ----------
  describe('Auth & role guard', () => {
    it('returns 401 without auth on any admin route', async () => {
      const res = await request(app).post('/api/admin/seed-brand');
      expect(res.status).toBe(401);
    });

    it('returns 403 when user is not admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).post('/api/admin/seed-brand').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });

    it('allows admin role through', async () => {
      cookie = await loginAs(app, 'admin-1', 'admin');
      // seed-brand will fail because seed import is dynamic, but it should get past auth
      const res = await request(app).post('/api/admin/seed-brand').set('Cookie', cookie);
      // Will be 500 because dynamic import of seed fails in test env, but NOT 401/403
      expect([200, 500]).toContain(res.status);
      expect(res.status).not.toBe(401);
      expect(res.status).not.toBe(403);
    });
  });

  // ---------- POST /seed-brand ----------
  describe('POST /api/admin/seed-brand', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/admin/seed-brand');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).post('/api/admin/seed-brand').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });
  });

  // ---------- POST /seed-products ----------
  describe('POST /api/admin/seed-products', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/admin/seed-products');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).post('/api/admin/seed-products').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });
  });

  // ---------- POST /seed-all ----------
  describe('POST /api/admin/seed-all', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/admin/seed-all');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).post('/api/admin/seed-all').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });
  });

  // ---------- POST /seed-installation-scenarios ----------
  describe('POST /api/admin/seed-installation-scenarios', () => {
    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).post('/api/admin/seed-installation-scenarios').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });
  });

  // ---------- POST /seed-relationships ----------
  describe('POST /api/admin/seed-relationships', () => {
    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).post('/api/admin/seed-relationships').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });
  });

  // ---------- POST /seed-brand-images ----------
  describe('POST /api/admin/seed-brand-images', () => {
    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).post('/api/admin/seed-brand-images').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });
  });

  // ---------- POST /seed-templates ----------
  describe('POST /api/admin/seed-templates', () => {
    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).post('/api/admin/seed-templates').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });
  });

  // ---------- GET /dead-letter-queue ----------
  describe('GET /api/admin/dead-letter-queue', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/admin/dead-letter-queue');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).get('/api/admin/dead-letter-queue').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });
  });

  // ---------- POST /dead-letter-queue/:jobId/retry ----------
  describe('POST /api/admin/dead-letter-queue/:jobId/retry', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/admin/dead-letter-queue/job-1/retry');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).post('/api/admin/dead-letter-queue/job-1/retry').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });
  });

  // ---------- GET /scraper/categories ----------
  describe('GET /api/admin/scraper/categories', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/admin/scraper/categories');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).get('/api/admin/scraper/categories').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });
  });

  // ---------- GET /experiments ----------
  describe('GET /api/admin/experiments', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/admin/experiments');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).get('/api/admin/experiments').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });
  });

  // ---------- POST /experiments/:id/status ----------
  describe('POST /api/admin/experiments/:id/status', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/admin/experiments/exp-1/status')
        .send({ status: 'running' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app)
        .post('/api/admin/experiments/exp-1/status')
        .set('Cookie', cookie)
        .send({ status: 'running' });
      expect(res.status).toBe(403);
    });
  });

  // ---------- GET /prompts ----------
  describe('GET /api/admin/prompts', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/admin/prompts');
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app).get('/api/admin/prompts').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });
  });
});
