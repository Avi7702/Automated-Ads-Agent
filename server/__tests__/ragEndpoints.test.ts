/**
 * RAG API Endpoints Tests
 *
 * Tests for all 15 RAG API endpoints:
 * - Installation Scenario RAG (4 endpoints)
 * - Relationship Discovery RAG (5 endpoints)
 * - Brand Image Recommendation RAG (3 endpoints)
 * - Template Pattern RAG (3 endpoints)
 *
 * Tests cover:
 * - Authentication (401 without session)
 * - Input validation (400 for missing required fields)
 * - Success cases (200/201)
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestApp } from './helpers/testApp';

let app: Express;

// Helper to get session cookie from response
// Note: express-session uses 'connect.sid' as default cookie name
function getSessionCookie(res: request.Response): string | undefined {
  const setCookie = res.headers['set-cookie'];
  const cookies = Array.isArray(setCookie) ? setCookie : (typeof setCookie === 'string' ? [setCookie] : []);
  // Check for both connect.sid (express-session default) and sessionId (legacy)
  return cookies.find(c => c.startsWith('connect.sid=')) || cookies.find(c => c.startsWith('sessionId='));
}

// Test user credentials
const testPassword = 'TestPassword123!';
let testCounter = 0;

// Helper to create authenticated session
async function createAuthSession(): Promise<string> {
  testCounter++;
  const email = `rag-test-${Date.now()}-${testCounter}@test.com`;

  await request(app)
    .post('/api/auth/register')
    .send({ email, password: testPassword });

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password: testPassword });

  return getSessionCookie(loginRes) || '';
}

// Initialize app before all tests
beforeAll(async () => {
  app = await createTestApp();
});

// ============================================================================
// INSTALLATION SCENARIO RAG ENDPOINTS
// ============================================================================

describe('Installation Scenario RAG Endpoints', () => {
  describe('POST /api/installation/suggest-steps', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/installation/suggest-steps')
        .send({ productId: 'test-product' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when productId is missing', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .post('/api/installation/suggest-steps')
        .set('Cookie', cookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('productId');
    });
  });

  describe('GET /api/installation/room-context/:roomType', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/installation/room-context/living_room');

      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid roomType', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .get('/api/installation/room-context/invalid_room')
        .set('Cookie', cookie);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('roomType');
    });

    it('returns 200 for valid roomType', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .get('/api/installation/room-context/living_room')
        .set('Cookie', cookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('roomType');
      expect(res.body).toHaveProperty('considerations');
      expect(res.body).toHaveProperty('bestPractices');
    });
  });

  describe('POST /api/installation/suggest-accessories', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/installation/suggest-accessories')
        .send({ productId: 'test-product' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when productId is missing', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .post('/api/installation/suggest-accessories')
        .set('Cookie', cookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('productId');
    });
  });

  describe('POST /api/installation/tips', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/installation/tips')
        .send({ productId: 'test-product' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when productId is missing', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .post('/api/installation/tips')
        .set('Cookie', cookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('productId');
    });
  });
});

// ============================================================================
// RELATIONSHIP DISCOVERY RAG ENDPOINTS
// ============================================================================

describe('Relationship Discovery RAG Endpoints', () => {
  describe('POST /api/products/:productId/suggest-relationships', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/products/test-id/suggest-relationships')
        .send({});

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/products/find-similar', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/products/find-similar')
        .send({ productId: 'test-id' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when productId is missing', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .post('/api/products/find-similar')
        .set('Cookie', cookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('productId');
    });
  });

  describe('POST /api/relationships/analyze', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/relationships/analyze')
        .send({ sourceProductId: 'prod1', targetProductId: 'prod2' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when sourceProductId or targetProductId is missing', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .post('/api/relationships/analyze')
        .set('Cookie', cookie)
        .send({ sourceProductId: 'prod1' }); // missing targetProductId

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });
  });

  describe('POST /api/relationships/batch-suggest', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/relationships/batch-suggest')
        .send({ productIds: ['prod1', 'prod2'] });

      expect(res.status).toBe(401);
    });

    it('returns 400 when productIds is missing or empty', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .post('/api/relationships/batch-suggest')
        .set('Cookie', cookie)
        .send({ productIds: [] });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('productIds');
    });
  });

  describe('POST /api/relationships/auto-create', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/relationships/auto-create')
        .send({ productId: 'prod1' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when productId is missing', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .post('/api/relationships/auto-create')
        .set('Cookie', cookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('productId');
    });
  });
});

// ============================================================================
// BRAND IMAGE RECOMMENDATION RAG ENDPOINTS
// ============================================================================

describe('Brand Image Recommendation RAG Endpoints', () => {
  describe('POST /api/brand-images/recommend', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/brand-images/recommend')
        .send({ useCase: 'ad creation' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when useCase is missing', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .post('/api/brand-images/recommend')
        .set('Cookie', cookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('useCase');
    });
  });

  describe('POST /api/brand-images/match-product/:productId', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/brand-images/match-product/test-id')
        .send({});

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/brand-images/suggest-category', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/brand-images/suggest-category')
        .send({ useCase: 'ad creation' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when useCase is missing', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .post('/api/brand-images/suggest-category')
        .set('Cookie', cookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('useCase');
    });

    it('returns 200 with valid useCase', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .post('/api/brand-images/suggest-category')
        .set('Cookie', cookie)
        .send({ useCase: 'ad creation' });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});

// ============================================================================
// TEMPLATE PATTERN RAG ENDPOINTS
// ============================================================================

describe('Template Pattern RAG Endpoints', () => {
  describe('POST /api/templates/match-context', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/templates/match-context')
        .send({
          industry: 'flooring',
          objective: 'awareness',
          platform: 'instagram',
          aspectRatio: '1:1',
        });

      expect(res.status).toBe(401);
    });

    it('returns 400 when required fields are missing', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .post('/api/templates/match-context')
        .set('Cookie', cookie)
        .send({ industry: 'flooring' }); // missing objective, platform, aspectRatio

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('required');
    });
  });

  describe('GET /api/templates/analyze-patterns/:templateId', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/templates/analyze-patterns/test-id');

      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/templates/suggest-customizations', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/templates/suggest-customizations')
        .send({ templateId: 'test-id' });

      expect(res.status).toBe(401);
    });

    it('returns 400 when templateId is missing', async () => {
      const cookie = await createAuthSession();

      const res = await request(app)
        .post('/api/templates/suggest-customizations')
        .set('Cookie', cookie)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('templateId');
    });
  });
});
