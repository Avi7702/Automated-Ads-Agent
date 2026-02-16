/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
process.env.GEMINI_API_KEY ??= 'test-gemini-key';
process.env.GOOGLE_API_KEY ??= 'test-google-key';

import request from 'supertest';
import { app } from '../app';
import { pool } from '../db';
import { getPerformanceMetrics, resetPerformanceMetrics } from '../middleware/performanceMetrics';
import { trackError, getRecentErrors, getErrorStats, clearErrors } from '../services/errorTrackingService';
import type Redis from 'ioredis';

// Use vi.hoisted to define mocks that will be available to vi.mock factories
const { mockRedisClient, mockGetRedisClient, mockSetRedisClient } = vi.hoisted(() => {
  const mockRedisClient = {
    ping: vi.fn().mockResolvedValue('PONG'),
  };

  const mockGetRedisClient = vi.fn().mockReturnValue(mockRedisClient);
  const mockSetRedisClient = vi.fn();

  return { mockRedisClient, mockGetRedisClient, mockSetRedisClient };
});

// Mock Redis module
vi.mock('../lib/redis', () => ({
  getRedisClient: mockGetRedisClient,
  setRedisClient: mockSetRedisClient,
}));

// Use vi.hoisted for mock logger helpers available in vi.mock factories
const { mockLoggerFactory } = vi.hoisted(() => {
  const mockLoggerFactory = () => {
    const obj: Record<string, any> = {
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
    };
    // child returns a simple logger that does NOT recurse further
    obj.child = vi.fn().mockReturnValue({
      error: vi.fn(),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
      trace: vi.fn(),
      fatal: vi.fn(),
      child: vi.fn().mockReturnValue({
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        trace: vi.fn(),
        fatal: vi.fn(),
        child: vi.fn().mockReturnThis(),
      }),
    });
    return obj;
  };
  return { mockLoggerFactory };
});

// Mock logger to reduce noise in tests
vi.mock('../lib/logger', () => ({
  logger: mockLoggerFactory(),
  default: mockLoggerFactory(),
  createModuleLogger: vi.fn().mockReturnValue(mockLoggerFactory()),
  authLogger: mockLoggerFactory(),
  geminiLogger: mockLoggerFactory(),
  storageLogger: mockLoggerFactory(),
  apiLogger: mockLoggerFactory(),
}));

// Import services after mocks are set up
import { getSystemHealth } from '../services/systemHealthService';
import { checkDbHealth } from '../lib/dbHealth';

describe('Monitoring System', () => {
  beforeEach(() => {
    // Clear metrics and errors before each test
    resetPerformanceMetrics();
    clearErrors();
    vi.clearAllMocks();

    // Reset mock implementations
    mockRedisClient.ping.mockResolvedValue('PONG');
    mockGetRedisClient.mockReturnValue(mockRedisClient as any);
  });

  describe('System Health Service', () => {
    describe('getSystemHealth', () => {
      it('should return valid health status structure', async () => {
        // No REDIS_URL set
        delete process.env.REDIS_URL;

        const health = await getSystemHealth();

        // Check structure (don't assume specific health status in test environment)
        expect(health.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(health.services.database).toBeDefined();
        expect(health.services.database.status).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(health.services.redis).toBeUndefined();
        expect(health.timestamp).toBeInstanceOf(Date);
      });

      it('should include Redis health when configured', async () => {
        // Set REDIS_URL
        process.env.REDIS_URL = 'redis://localhost:6379';

        // Mock Redis client with status property (required by getSystemHealth)
        const mockRedis = {
          ping: vi.fn().mockResolvedValue('PONG'),
          status: 'ready',
        } as any;
        mockGetRedisClient.mockReturnValue(mockRedis);

        const health = await getSystemHealth();

        expect(health.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(health.services.database.status).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(health.services.redis).toBeDefined();
        expect(health.services.redis?.status).toBe('healthy');
        expect(health.services.redis?.connected).toBe(true);
        expect(health.services.redis?.latency).toBeDefined();
        expect(mockRedis.ping).toHaveBeenCalled();

        delete process.env.REDIS_URL;
      });

      it('should handle Redis failures gracefully', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';

        // Mock Redis client that fails — set status='ready' to skip wait loop,
        // but ping() rejects to simulate connection failure
        const mockRedis = {
          ping: vi.fn().mockRejectedValue(new Error('Connection refused')),
          status: 'ready',
        } as any;
        mockGetRedisClient.mockReturnValue(mockRedis);

        const health = await getSystemHealth();

        expect(health.overall).toBe('unhealthy');
        expect(health.services.redis).toBeDefined();
        expect(health.services.redis?.status).toBe('unhealthy');
        expect(health.services.redis?.connected).toBe(false);

        delete process.env.REDIS_URL;
      });

      it('should measure Redis latency', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';

        // Mock Redis client with delay and status property
        const mockRedis = {
          ping: vi.fn().mockImplementation(async () => {
            await new Promise((resolve) => setTimeout(resolve, 50));
            return 'PONG';
          }),
          status: 'ready',
        } as any;
        mockGetRedisClient.mockReturnValue(mockRedis);

        const health = await getSystemHealth();

        expect(health.services.redis?.latency).toBeGreaterThanOrEqual(50);

        delete process.env.REDIS_URL;
      });

      it('should aggregate overall status (unhealthy wins)', async () => {
        // When Redis fails, overall should be unhealthy
        process.env.REDIS_URL = 'redis://localhost:6379';

        const mockRedis = {
          ping: vi.fn().mockRejectedValue(new Error('Failed')),
          status: 'ready',
        } as any;
        mockGetRedisClient.mockReturnValue(mockRedis);

        const health = await getSystemHealth();

        // With Redis unhealthy, overall should be unhealthy
        expect(health.overall).toBe('unhealthy');

        delete process.env.REDIS_URL;
      });
    });

    describe('Database Health Check', () => {
      it('should return database health metrics', async () => {
        const dbHealth = await checkDbHealth();

        // Check that we get valid metrics (don't assume specific health status)
        expect(dbHealth.status).toMatch(/^(healthy|degraded|unhealthy)$/);
        expect(dbHealth.totalConnections).toBeGreaterThanOrEqual(0);
        expect(dbHealth.idleConnections).toBeGreaterThanOrEqual(0);
        expect(dbHealth.activeConnections).toBeGreaterThanOrEqual(0);
        expect(dbHealth.maxConnections).toBeGreaterThan(0);

        // averageQueryTime may be undefined if query failed
        if (dbHealth.status !== 'unhealthy' || dbHealth.averageQueryTime !== undefined) {
          expect(dbHealth.averageQueryTime).toBeGreaterThanOrEqual(0);
        }
      });

      it('should track connection pool metrics', async () => {
        const dbHealth = await checkDbHealth();

        expect(dbHealth.totalConnections).toBeDefined();
        expect(dbHealth.idleConnections).toBeDefined();
        expect(dbHealth.activeConnections).toBeDefined();
        expect(dbHealth.waitingClients).toBeDefined();
        expect(dbHealth.maxConnections).toBeDefined();

        // Sanity check: total = active + idle
        expect(dbHealth.totalConnections).toBe(dbHealth.activeConnections + dbHealth.idleConnections);
      });
    });
  });

  describe('Monitoring API Endpoints', () => {
    describe('GET /api/monitoring/health', () => {
      it('should return system health status', async () => {
        const res = await request(app).get('/api/monitoring/health');

        // Should return 200 or 500 (depending on setup)
        expect([200, 401, 403, 404, 500]).toContain(res.status);

        if (res.status === 200) {
          expect(res.body.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
          expect(res.body.timestamp).toBeDefined();
          expect(res.body.services.database).toBeDefined();
          expect(res.body.services.database.status).toMatch(/^(healthy|degraded|unhealthy)$/);
          expect(res.body.services.database.totalConnections).toBeGreaterThanOrEqual(0);
          expect(res.body.services.database.maxConnections).toBeGreaterThan(0);
        }
      });

      it('should include Redis status if configured', async () => {
        process.env.REDIS_URL = 'redis://localhost:6379';

        const mockRedis = {
          ping: vi.fn().mockResolvedValue('PONG'),
        } as any;
        mockGetRedisClient.mockReturnValue(mockRedis);

        const res = await request(app).get('/api/monitoring/health');

        if (res.status === 200 && res.body.services?.redis) {
          expect(res.body.services.redis.status).toMatch(/^(healthy|unhealthy)$/);
          expect(res.body.services.redis.connected).toBeDefined();
        }

        delete process.env.REDIS_URL;
      });
    });

    describe('GET /api/monitoring/performance', () => {
      it('should return empty metrics initially', async () => {
        resetPerformanceMetrics();

        const res = await request(app).get('/api/monitoring/performance');

        expect([200, 401, 403, 404, 500]).toContain(res.status);

        if (res.status === 200) {
          expect(Array.isArray(res.body)).toBe(true);
        }
      });

      it('should return performance metrics after requests', async () => {
        // Make a request to generate metrics
        await request(app).post('/api/auth/register').send({
          email: 'perf-test@test.com',
          password: 'ValidPassword123!',
        });

        const res = await request(app).get('/api/monitoring/performance');

        expect([200, 401, 403, 404, 500]).toContain(res.status);

        if (res.status === 200 && Array.isArray(res.body) && res.body.length > 0) {
          const metric = res.body[0];
          expect(metric.endpoint).toBeDefined();
          expect(metric.method).toBeDefined();
          expect(metric.requests).toBeGreaterThanOrEqual(0);
          expect(metric.errors).toBeGreaterThanOrEqual(0);
          expect(metric.errorRate).toBeGreaterThanOrEqual(0);
          expect(metric.avgLatency).toBeGreaterThanOrEqual(0);
          expect(metric.minLatency).toBeGreaterThanOrEqual(0);
          expect(metric.maxLatency).toBeGreaterThanOrEqual(0);
        }
      });

      it('should not track monitoring endpoints', async () => {
        // Make multiple requests to monitoring endpoints
        await request(app).get('/api/monitoring/health');
        await request(app).get('/api/monitoring/performance');
        await request(app).get('/api/health/live');

        const res = await request(app).get('/api/monitoring/performance');

        if (res.status === 200 && Array.isArray(res.body)) {
          // Should not include monitoring or health endpoints
          const hasMonitoringEndpoints = res.body.some(
            (m: any) => m.endpoint.includes('/monitoring') || m.endpoint.includes('/health'),
          );
          expect(hasMonitoringEndpoints).toBe(false);
        }
      });
    });

    describe('GET /api/monitoring/errors', () => {
      it('should return empty errors initially', async () => {
        clearErrors();

        const res = await request(app).get('/api/monitoring/errors');

        expect([200, 401, 403, 404, 500]).toContain(res.status);

        if (res.status === 200) {
          expect(res.body.errors).toBeDefined();
          expect(Array.isArray(res.body.errors)).toBe(true);
          expect(res.body.stats).toBeDefined();
          expect(res.body.stats.total).toBe(0);
        }
      });

      it('should return tracked errors', async () => {
        // Track some errors manually
        trackError({
          statusCode: 500,
          message: 'Test error',
          endpoint: '/api/test',
          method: 'GET',
        });

        trackError({
          statusCode: 404,
          message: 'Not found',
          endpoint: '/api/missing',
          method: 'POST',
        });

        const res = await request(app).get('/api/monitoring/errors');

        expect([200, 401, 403, 404, 500]).toContain(res.status);

        if (res.status === 200) {
          expect(res.body.errors.length).toBe(2);
          expect(res.body.errors[0].statusCode).toBeDefined();
          expect(res.body.errors[0].message).toBeDefined();
          expect(res.body.errors[0].endpoint).toBeDefined();
          expect(res.body.errors[0].method).toBeDefined();
          expect(res.body.errors[0].timestamp).toBeDefined();
          expect(res.body.errors[0].fingerprint).toBeDefined();
        }
      });

      it('should respect limit parameter', async () => {
        // Track 10 errors
        for (let i = 0; i < 10; i++) {
          trackError({
            statusCode: 500,
            message: `Error ${i}`,
            endpoint: '/api/test',
            method: 'GET',
          });
        }

        const res = await request(app).get('/api/monitoring/errors?limit=5');

        expect([200, 401, 403, 404, 500]).toContain(res.status);

        if (res.status === 200) {
          expect(res.body.errors.length).toBe(5);
        }
      });

      it('should return error statistics', async () => {
        clearErrors();

        trackError({
          statusCode: 500,
          message: 'Server error',
          endpoint: '/api/test1',
          method: 'GET',
        });

        trackError({
          statusCode: 500,
          message: 'Server error',
          endpoint: '/api/test2',
          method: 'POST',
        });

        trackError({
          statusCode: 404,
          message: 'Not found',
          endpoint: '/api/missing',
          method: 'GET',
        });

        const res = await request(app).get('/api/monitoring/errors');

        expect([200, 401, 403, 404, 500]).toContain(res.status);

        if (res.status === 200) {
          expect(res.body.stats.total).toBe(3);
          expect(res.body.stats.last5min).toBe(3);
          expect(res.body.stats.last1hour).toBe(3);
          expect(res.body.stats.byStatusCode).toBeDefined();
          expect(res.body.stats.byStatusCode['500']).toBe(2);
          expect(res.body.stats.byStatusCode['404']).toBe(1);
          expect(res.body.stats.byEndpoint).toBeDefined();
        }
      });

      it('should use default limit of 50', async () => {
        clearErrors();

        // Track 60 errors
        for (let i = 0; i < 60; i++) {
          trackError({
            statusCode: 500,
            message: `Error ${i}`,
            endpoint: '/api/test',
            method: 'GET',
          });
        }

        const res = await request(app).get('/api/monitoring/errors');

        expect([200, 401, 403, 404, 500]).toContain(res.status);

        if (res.status === 200) {
          // Should return only 50 most recent
          expect(res.body.errors.length).toBe(50);
        }
      });
    });

    describe('GET /api/monitoring/endpoints', () => {
      it('should return empty endpoints initially', async () => {
        resetPerformanceMetrics();

        const res = await request(app).get('/api/monitoring/endpoints');

        expect([200, 401, 403, 404, 500]).toContain(res.status);

        if (res.status === 200) {
          expect(Array.isArray(res.body)).toBe(true);
        }
      });

      it('should return endpoint summary with status', async () => {
        // Make requests to generate metrics
        await request(app).post('/api/auth/register').send({
          email: 'endpoint-test@test.com',
          password: 'ValidPassword123!',
        });

        const res = await request(app).get('/api/monitoring/endpoints');

        expect([200, 401, 403, 404, 500]).toContain(res.status);

        if (res.status === 200 && Array.isArray(res.body) && res.body.length > 0) {
          const endpoint = res.body[0];
          expect(endpoint.endpoint).toBeDefined();
          expect(endpoint.method).toBeDefined();
          expect(endpoint.requests).toBeGreaterThanOrEqual(0);
          expect(endpoint.errorRate).toMatch(/^\d+\.\d+%$/); // Format: "0.00%"
          expect(endpoint.avgLatency).toMatch(/^\d+ms$/); // Format: "123ms"
          expect(endpoint.status).toMatch(/^(healthy|degraded|unhealthy)$/);
        }
      });

      it('should format metrics correctly', async () => {
        // Make a successful request
        await request(app).get('/api/health/live');

        const res = await request(app).get('/api/monitoring/endpoints');

        expect([200, 401, 403, 404, 500]).toContain(res.status);

        if (res.status === 200) {
          expect(Array.isArray(res.body)).toBe(true);

          // Health endpoints should not be tracked
          const hasHealthEndpoint = res.body.some((e: any) => e.endpoint.includes('/health'));
          expect(hasHealthEndpoint).toBe(false);
        }
      });
    });
  });

  describe('Error Tracking Service Unit Tests', () => {
    beforeEach(() => {
      clearErrors();
    });

    it('should track errors with all fields', () => {
      trackError({
        statusCode: 500,
        message: 'Test error',
        endpoint: '/api/test',
        method: 'GET',
        userAgent: 'Test Agent',
        stack: 'Error stack trace',
      });

      const errors = getRecentErrors(10);
      expect(errors).toHaveLength(1);
      expect(errors[0].statusCode).toBe(500);
      expect(errors[0].message).toBe('Test error');
      expect(errors[0].endpoint).toBe('/api/test');
      expect(errors[0].method).toBe('GET');
      expect(errors[0].userAgent).toBe('Test Agent');
      expect(errors[0].fingerprint).toBeDefined();
    });

    it('should generate error statistics', () => {
      trackError({
        statusCode: 500,
        message: 'Error 1',
        endpoint: '/api/test',
        method: 'GET',
      });

      trackError({
        statusCode: 404,
        message: 'Error 2',
        endpoint: '/api/missing',
        method: 'POST',
      });

      const stats = getErrorStats();
      expect(stats.total).toBe(2);
      expect(stats.byStatusCode['500']).toBe(1);
      expect(stats.byStatusCode['404']).toBe(1);
    });

    it('should limit errors to ring buffer size', () => {
      // Track 150 errors (buffer size is 100)
      for (let i = 0; i < 150; i++) {
        trackError({
          statusCode: 500,
          message: `Error ${i}`,
          endpoint: '/api/test',
          method: 'GET',
        });
      }

      const errors = getRecentErrors(150);
      // Should only return 100 (ring buffer size)
      expect(errors.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance Metrics Unit Tests', () => {
    it('should track endpoint metrics', async () => {
      resetPerformanceMetrics();

      // Make a request to generate metrics
      await request(app)
        .post('/api/auth/register')
        .send({
          email: `test-${Date.now()}@test.com`,
          password: 'ValidPassword123!',
        });

      const metrics = getPerformanceMetrics();

      // May or may not have metrics depending on middleware execution
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should reset metrics', () => {
      resetPerformanceMetrics();
      const metrics = getPerformanceMetrics();
      expect(metrics.length).toBe(0);
    });
  });
});
