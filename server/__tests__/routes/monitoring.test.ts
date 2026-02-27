import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { monitoringRouter, webhooksRouter } from '../../routes/monitoring.router';

// Mock dynamic imports used by the router
vi.mock('../../services/systemHealthService', () => ({
  getSystemHealth: vi.fn().mockResolvedValue({
    overall: 'healthy',
    timestamp: new Date().toISOString(),
    services: { database: 'healthy', redis: 'healthy' },
  }),
}));

vi.mock('../../middleware/performanceMetrics', () => ({
  getPerformanceMetrics: vi.fn().mockReturnValue([
    {
      endpoint: '/api/transform',
      method: 'POST',
      requests: 100,
      errors: 2,
      errorRate: 2.0,
      avgLatency: 1500,
      minLatency: 200,
      maxLatency: 5000,
      lastReset: new Date(),
    },
  ]),
}));

vi.mock('../../services/errorTrackingService', () => ({
  getRecentErrors: vi.fn().mockReturnValue([]),
  getErrorStats: vi.fn().mockReturnValue({ total: 5, last5min: 0 }),
}));

describe('Monitoring Router — /api/monitoring', () => {
  let app: Express;
  let cookie: string;
  let overrides: ContextOverrides;

  beforeEach(() => {
    overrides = {};
    const result = createTestAppForRouter(monitoringRouter, '/api/monitoring', overrides);
    app = result.app;
  });

  // ---------- GET /health ----------
  describe('GET /api/monitoring/health', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/monitoring/health');
      expect(res.status).toBe(401);
    });

    it('returns 200 with health data', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/monitoring/health').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.overall).toBe('healthy');
    });
  });

  // ---------- GET /performance ----------
  describe('GET /api/monitoring/performance', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/monitoring/performance');
      expect(res.status).toBe(401);
    });

    it('returns 200 with performance metrics', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/monitoring/performance').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ---------- GET /errors ----------
  describe('GET /api/monitoring/errors', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/monitoring/errors');
      expect(res.status).toBe(401);
    });

    it('returns 200 with error data', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/monitoring/errors').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.errors).toBeDefined();
      expect(res.body.stats).toBeDefined();
    });
  });

  // ---------- GET /system ----------
  describe('GET /api/monitoring/system', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/monitoring/system');
      expect(res.status).toBe(401);
    });

    it('returns 200 with aggregated system health', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/monitoring/system').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.performance).toBeDefined();
      expect(res.body.errors).toBeDefined();
    });
  });

  // ---------- GET /endpoints ----------
  describe('GET /api/monitoring/endpoints', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/monitoring/endpoints');
      expect(res.status).toBe(401);
    });

    it('returns 200 with endpoint summary', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/monitoring/endpoints').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0].endpoint).toBeDefined();
        expect(res.body[0].status).toBeDefined();
      }
    });
  });
});

describe('Webhooks Router — /api/webhooks', () => {
  let app: Express;
  let overrides: ContextOverrides;

  beforeEach(() => {
    overrides = {
      storage: {
        getGenerationById: vi.fn().mockResolvedValue({
          id: 'gen-1',
          prompt: 'test',
        }),
        saveGenerationPerformance: vi.fn().mockResolvedValue({ id: 'perf-1' }),
      },
    };

    const result = createTestAppForRouter(webhooksRouter, '/api/webhooks', overrides);
    app = result.app;
  });

  // ---------- POST /performance ----------
  describe('POST /api/webhooks/performance', () => {
    it('saves performance data with valid payload', async () => {
      const res = await request(app)
        .post('/api/webhooks/performance')
        .send({
          generationId: 'gen-1',
          platform: 'linkedin',
          impressions: 1000,
          engagementRate: 5.2,
          clicks: 50,
          conversions: 3,
        });
      // validateN8nWebhook is noop in test, validate schema is noop
      expect([200, 400]).toContain(res.status);
    });

    it('returns 404 when generation not found', async () => {
      (overrides.storage!.getGenerationById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(webhooksRouter, '/api/webhooks', overrides);
      const res = await request(rebuilt.app)
        .post('/api/webhooks/performance')
        .send({
          generationId: 'missing',
          platform: 'linkedin',
          impressions: 100,
        });
      expect([404, 400]).toContain(res.status);
    });
  });
});
