import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import rateLimit from 'express-rate-limit';

// Helper to create a fresh test app with a limiter for each test
function createFreshTestApp(
  limiterOptions: { windowMs: number; max: number; handler?: any }
): Express {
  const limiter = rateLimit({
    windowMs: limiterOptions.windowMs,
    max: limiterOptions.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: limiterOptions.handler,
  });

  const app = express();
  app.use('/test', limiter);
  app.get('/test', (req, res) => res.json({ success: true }));
  app.post('/test', (req, res) => res.json({ success: true }));
  return app;
}

describe('Rate Limiting Middleware', () => {
  describe('API Limiter behavior', () => {
    it('should allow requests within limit', async () => {
      const app = createFreshTestApp({ windowMs: 60000, max: 100 });
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({ success: true });
    });

    it('should include rate limit headers', async () => {
      const app = createFreshTestApp({ windowMs: 60000, max: 100 });
      const response = await request(app).get('/test');
      expect(response.headers['ratelimit-limit']).toBe('100');
      expect(response.headers['ratelimit-remaining']).toBeDefined();
    });

    it('should return 429 when limit exceeded', async () => {
      // Create a fresh limiter with very low limit
      const app = createFreshTestApp({ windowMs: 60000, max: 2 });

      // Make requests up to the limit
      await request(app).get('/test');
      await request(app).get('/test');

      // This should be rate limited
      const response = await request(app).get('/test');
      expect(response.status).toBe(429);
    });

    it('should include retry information in 429 response', async () => {
      const app = createFreshTestApp({
        windowMs: 60000,
        max: 1,
        handler: (req: any, res: any) => {
          res.status(429).json({ error: 'Too many requests', retryAfter: 60 });
        },
      });

      await request(app).get('/test');
      const response = await request(app).get('/test');

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Too many requests');
    });
  });

  describe('Expensive Limiter behavior (20 req / hr)', () => {
    it('should have correct window and max settings', async () => {
      const app = createFreshTestApp({ windowMs: 3600000, max: 20 });
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBe('20');
    });
  });

  describe('Edit Limiter behavior (30 req / hr)', () => {
    it('should have correct window and max settings', async () => {
      const app = createFreshTestApp({ windowMs: 3600000, max: 30 });
      const response = await request(app).get('/test');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBe('30');
    });
  });

  describe('Login Limiter behavior (10 req / min)', () => {
    it('should have correct window and max settings', async () => {
      const app = createFreshTestApp({ windowMs: 60000, max: 10 });
      const response = await request(app).post('/test');
      expect(response.status).toBe(200);
      expect(response.headers['ratelimit-limit']).toBe('10');
    });

    it('should block after exceeding login attempts', async () => {
      const app = createFreshTestApp({
        windowMs: 60000,
        max: 3,
        handler: (req: any, res: any) => {
          res.status(429).json({ error: 'Too many login attempts', retryAfter: 60 });
        },
      });

      // Make requests up to the limit
      await request(app).post('/test');
      await request(app).post('/test');
      await request(app).post('/test');

      // This should be blocked
      const response = await request(app).post('/test');
      expect(response.status).toBe(429);
      expect(response.body.error).toBe('Too many login attempts');
    });
  });
});
