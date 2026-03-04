/**
 * Endpoint Authentication Tests
 *
 * Verifies that protected endpoints return 401 without authentication
 * and function correctly with valid auth sessions.
 *
 * Covers:
 * - S1-2: copy.router.ts — all endpoints require auth
 * - S1-3: generations.router.ts — GET /api/jobs/:jobId requires auth + ownership
 * - S1-6: quota.router.ts — all endpoints require auth
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { copyRouter } from '../../routes/copy.router';
import { jobsRouter } from '../../routes/generations.router';
import { quotaRouter } from '../../routes/quota.router';

// ----------------------------------------------------------------
//  S1-2: Copy Router — all endpoints require auth
// ----------------------------------------------------------------

describe('S1-2: Copy Router auth enforcement', () => {
  let app: Express;

  beforeEach(() => {
    const overrides: ContextOverrides = {
      storage: {
        getGenerationById: vi.fn().mockResolvedValue({ id: 'gen-1', prompt: 'test' }),
        getUserById: vi.fn().mockResolvedValue(null),
        saveAdCopy: vi.fn().mockImplementation(async (payload) => ({ id: 'copy-1', ...payload })),
        getAdCopyByGenerationId: vi.fn().mockResolvedValue([]),
        getAdCopyById: vi.fn().mockResolvedValue({ id: 'copy-1', headline: 'Test' }),
        deleteAdCopy: vi.fn().mockResolvedValue(undefined),
      },
    };
    const result = createTestAppForRouter(copyRouter, '/api/copy', overrides);
    app = result.app;
  });

  it('POST /api/copy/generate returns 401 without auth', async () => {
    const res = await request(app).post('/api/copy/generate').send({
      generationId: '11111111-1111-4111-8111-111111111111',
      platform: 'linkedin',
      tone: 'professional',
      productName: 'Test Product',
      productDescription: 'A test product.',
      industry: 'tech',
    });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/copy/generation/:generationId returns 401 without auth', async () => {
    const res = await request(app).get('/api/copy/generation/gen-1');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/copy/:id returns 401 without auth', async () => {
    const res = await request(app).get('/api/copy/copy-1');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('DELETE /api/copy/:id returns 401 without auth', async () => {
    const res = await request(app).delete('/api/copy/copy-1');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/copy/:id succeeds with valid auth', async () => {
    const cookie = await loginAs(app);
    const res = await request(app).get('/api/copy/copy-1').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.copy).toBeDefined();
  });
});

// ----------------------------------------------------------------
//  S1-3: Jobs Router — GET /:jobId requires auth + ownership
// ----------------------------------------------------------------

describe('S1-3: Jobs Router auth enforcement', () => {
  let app: Express;

  const mockJob = {
    id: 'job-123',
    data: {
      jobType: 'generate',
      userId: 'test-user-1',
      generationId: 'gen-1',
      createdAt: new Date().toISOString(),
    },
    progress: { stage: 'completed', percentage: 100, message: 'Done' },
    returnvalue: null,
    failedReason: null,
    getState: vi.fn().mockResolvedValue('completed'),
  };

  beforeEach(() => {
    const overrides: ContextOverrides = {
      storage: {
        getGenerationById: vi.fn().mockResolvedValue(null),
      },
    };
    const result = createTestAppForRouter(jobsRouter, '/api/jobs', overrides);
    app = result.app;

    // Wire up the mock queue
    const ctx = result.ctx;
    (ctx.services.generationQueue.getJob as ReturnType<typeof vi.fn>).mockResolvedValue(mockJob);
  });

  it('GET /api/jobs/:jobId returns 401 without auth', async () => {
    const res = await request(app).get('/api/jobs/job-123');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/jobs/:jobId returns 200 for the owning user', async () => {
    const cookie = await loginAs(app, 'test-user-1');
    const res = await request(app).get('/api/jobs/job-123').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.jobId).toBe('job-123');
  });

  it('GET /api/jobs/:jobId returns 403 for a different user', async () => {
    const cookie = await loginAs(app, 'other-user');
    const res = await request(app).get('/api/jobs/job-123').set('Cookie', cookie);
    expect(res.status).toBe(403);
    expect(res.body.error).toContain('Access denied');
  });

  it('GET /api/jobs/:jobId allows access when job has no userId (backwards compat)', async () => {
    const legacyJob = {
      ...mockJob,
      data: {
        jobType: 'generate',
        userId: '', // empty string — treated as falsy
        generationId: 'gen-1',
        createdAt: new Date().toISOString(),
      },
    };
    const result = createTestAppForRouter(jobsRouter, '/api/jobs', {
      storage: { getGenerationById: vi.fn().mockResolvedValue(null) },
    });
    app = result.app;
    (result.ctx.services.generationQueue.getJob as ReturnType<typeof vi.fn>).mockResolvedValue(legacyJob);

    const cookie = await loginAs(app, 'any-user');
    const res = await request(app).get('/api/jobs/job-123').set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ----------------------------------------------------------------
//  S1-6: Quota Router — all endpoints require auth
// ----------------------------------------------------------------

describe('S1-6: Quota Router auth enforcement', () => {
  let app: Express;

  beforeEach(() => {
    const overrides: ContextOverrides = {
      domainServices: {
        quotaMonitoring: {
          getQuotaStatus: vi.fn().mockResolvedValue({ used: 0, limit: 100 }),
          getUsageHistory: vi.fn().mockResolvedValue([]),
          getUsageBreakdown: vi.fn().mockResolvedValue({ categories: [] }),
          getRateLimitStatus: vi.fn().mockResolvedValue({ isLimited: false }),
          getAlerts: vi.fn().mockResolvedValue([]),
          setAlert: vi.fn().mockResolvedValue({ id: 'alert-1' }),
          checkAlerts: vi.fn().mockResolvedValue([]),
        } as unknown as ContextOverrides['domainServices'] extends Partial<infer T> ? T[keyof T] : never,
        getGoogleCloudService: vi.fn().mockResolvedValue(null),
      } as ContextOverrides['domainServices'],
    };
    const result = createTestAppForRouter(quotaRouter, '/api/quota', overrides);
    app = result.app;
  });

  it('GET /api/quota/status returns 401 without auth', async () => {
    const res = await request(app).get('/api/quota/status');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/quota/history returns 401 without auth', async () => {
    const res = await request(app).get('/api/quota/history');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/quota/breakdown returns 401 without auth', async () => {
    const res = await request(app).get('/api/quota/breakdown');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/quota/rate-limit-status returns 401 without auth', async () => {
    const res = await request(app).get('/api/quota/rate-limit-status');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/quota/alerts returns 401 without auth', async () => {
    const res = await request(app).get('/api/quota/alerts');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('PUT /api/quota/alerts returns 401 without auth', async () => {
    const res = await request(app)
      .put('/api/quota/alerts')
      .send({ alertType: 'usage', thresholdValue: 80 });
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/quota/check-alerts returns 401 without auth', async () => {
    const res = await request(app).get('/api/quota/check-alerts');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/quota/google/status returns 401 without auth', async () => {
    const res = await request(app).get('/api/quota/google/status');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/quota/google/snapshot returns 401 without auth', async () => {
    const res = await request(app).get('/api/quota/google/snapshot');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('POST /api/quota/google/sync returns 401 without auth', async () => {
    const res = await request(app).post('/api/quota/google/sync');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/quota/google/history returns 401 without auth', async () => {
    const res = await request(app).get('/api/quota/google/history');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/quota/google/snapshots returns 401 without auth', async () => {
    const res = await request(app).get('/api/quota/google/snapshots');
    expect(res.status).toBe(401);
    expect(res.body.error).toContain('Authentication required');
  });

  it('GET /api/quota/status succeeds with valid auth', async () => {
    const cookie = await loginAs(app);
    const res = await request(app).get('/api/quota/status').set('Cookie', cookie);
    expect(res.status).toBe(200);
  });
});
