import request from 'supertest';
import express, { Express } from 'express';
import { apiLimiter, expensiveLimiter, editLimiter, loginLimiter } from '../middleware/rateLimit';

// Helper to create a test app with a specific limiter
function createTestApp(limiter: any, path: string = '/test'): Express {
  const app = express();
  app.use(path, limiter);
  app.get(path, (req, res) => res.json({ success: true }));
  app.post(path, (req, res) => res.json({ success: true }));
  return app;
}

describe('Rate Limiting Middleware', () => {
  describe('API Limiter (100 req / 15 min)', () => {
    let app: Express;

    beforeEach(() => {
      app = createTestApp(apiLimiter);
    });

    it('should allow requests within limit', async () => {
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should include rate limit headers', async () => {
      const response = await request(app).get('/test');
      expect(response.headers['ratelimit-limit']).toBe('100');
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    it('should return 429 when limit exceeded', async () => {
      // Create a limiter with very low limit for testing
      const testLimiter = require('express-rate-limit').default({
        windowMs: 60000,
        max: 2,
        standardHeaders: true,
        legacyHeaders: false,
      });

      const testApp = createTestApp(testLimiter);

      // Make requests up to the limit
      await request(testApp).get('/test');
      await request(testApp).get('/test');

      // This should be rate limited
      const response = await request(testApp).get('/test');
      expect(response.status).toBe(429);
    });

    it('should include retry information in 429 response', async () => {
      const testLimiter = require('express-rate-limit').default({
        windowMs: 60000,
        max: 1,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req: any, res: any) => {
          res.status(429).json({ error: 'Too many requests', retryAfter: 60 });
        },
      });

      const testApp = createTestApp(testLimiter);

      await request(testApp).get('/test');
      const response = await request(testApp).get('/test');

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Too many requests');
    });
  });

  describe('Expensive Limiter (20 req / 1 hr)', () => {
    it('should have correct window and max settings', () => {
      // The limiter is configured with 20 requests per hour
      // We verify by checking headers on first request
      const app = createTestApp(expensiveLimiter);

      return request(app)
        .get('/test')
        .expect(200)
        .expect((res) => {
          expect(res.headers['ratelimit-limit']).toBe('20');
        });
    });
  });

  describe('Edit Limiter (30 req / 1 hr)', () => {
    it('should have correct window and max settings', () => {
      const app = createTestApp(editLimiter);

      return request(app)
        .get('/test')
        .expect(200)
        .expect((res) => {
          expect(res.headers['ratelimit-limit']).toBe('30');
        });
    });
  });

  describe('Login Limiter (10 req / 1 min)', () => {
    it('should have correct window and max settings', () => {
      const app = createTestApp(loginLimiter);

      return request(app)
        .post('/test')
        .expect(200)
        .expect((res) => {
          expect(res.headers['ratelimit-limit']).toBe('10');
        });
    });

    it('should block after exceeding login attempts', async () => {
      const testLimiter = require('express-rate-limit').default({
        windowMs: 60000,
        max: 3,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req: any, res: any) => {
          res.status(429).json({ error: 'Too many login attempts', retryAfter: 60 });
        },
      });

      const testApp = createTestApp(testLimiter, '/login');

      // Make requests up to the limit
      await request(testApp).post('/login');
      await request(testApp).post('/login');
      await request(testApp).post('/login');

      // This should be blocked
      const response = await request(testApp).post('/login');
      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Too many login attempts');
    });
  });
});
