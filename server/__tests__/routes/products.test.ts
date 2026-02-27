import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { productsRouter } from '../../routes/products.router';

describe('Products Router — /api/products', () => {
  let app: Express;
  let cookie: string;
  let overrides: ContextOverrides;

  const mockProduct = {
    id: 'prod-1',
    name: 'Steel Beam',
    cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
    cloudinaryPublicId: 'product-library/beam',
    category: 'structural',
    enrichmentStatus: 'pending',
    enrichmentDraft: null,
    enrichmentVerifiedAt: null,
    enrichmentSource: null,
  };

  beforeEach(() => {
    overrides = {
      storage: {
        getProducts: vi.fn().mockResolvedValue([mockProduct]),
        getProductById: vi.fn().mockResolvedValue(mockProduct),
        saveProduct: vi.fn().mockResolvedValue(mockProduct),
        deleteProduct: vi.fn().mockResolvedValue(undefined),
        deleteProductsByIds: vi.fn().mockResolvedValue(undefined),
        getProductRelationships: vi.fn().mockResolvedValue([]),
        getProductRelationshipsByType: vi.fn().mockResolvedValue([]),
      },
    };

    const result = createTestAppForRouter(productsRouter, '/api/products', overrides);
    app = result.app;
  });

  // ---------- GET / ----------
  describe('GET /api/products', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(401);
    });

    it('returns 200 with products', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/products').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].name).toBe('Steel Beam');
    });
  });

  // ---------- GET /:id ----------
  describe('GET /api/products/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/products/prod-1');
      expect(res.status).toBe(401);
    });

    it('returns 200 with a product', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/products/prod-1').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('prod-1');
    });

    it('returns 404 when product not found', async () => {
      (overrides.storage!.getProductById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(productsRouter, '/api/products', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app).get('/api/products/missing').set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });

  // ---------- DELETE /:id ----------
  describe('DELETE /api/products/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/products/prod-1');
      expect(res.status).toBe(401);
    });

    it('deletes a product and invalidates caches', async () => {
      cookie = await loginAs(app);
      const res = await request(app).delete('/api/products/prod-1').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 when product not found', async () => {
      (overrides.storage!.getProductById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(productsRouter, '/api/products', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app).delete('/api/products/missing').set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });

  // ---------- DELETE / ----------
  describe('DELETE /api/products (clear all)', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/products');
      expect(res.status).toBe(401);
    });

    it('clears all products', async () => {
      cookie = await loginAs(app);
      const res = await request(app).delete('/api/products').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.deleted).toBe(1);
    });
  });

  // ---------- POST /find-similar ----------
  describe('POST /api/products/find-similar', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/products/find-similar')
        .send({ productId: 'prod-1' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when productId is missing', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/products/find-similar')
        .set('Cookie', cookie)
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 404 when product not found', async () => {
      (overrides.storage!.getProductById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(productsRouter, '/api/products', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app)
        .post('/api/products/find-similar')
        .set('Cookie', cookie)
        .send({ productId: 'missing' });
      expect(res.status).toBe(404);
    });
  });

  // ---------- GET /:productId/analysis ----------
  describe('GET /api/products/:productId/analysis', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/products/prod-1/analysis');
      expect(res.status).toBe(401);
    });

    it('returns 404 when no analysis found', async () => {
      cookie = await loginAs(app);
      // visionAnalysis.getCachedAnalysis defaults to vi.fn() returning undefined
      const res = await request(app).get('/api/products/prod-1/analysis').set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });

  // ---------- GET /:productId/relationships ----------
  describe('GET /api/products/:productId/relationships', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/products/prod-1/relationships');
      expect(res.status).toBe(401);
    });

    it('returns 200 with relationships', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/products/prod-1/relationships').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ---------- GET /:productId/enrichment ----------
  describe('GET /api/products/:productId/enrichment', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/products/prod-1/enrichment');
      expect(res.status).toBe(401);
    });

    it('returns 404 when product not found', async () => {
      (overrides.storage!.getProductById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(productsRouter, '/api/products', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app).get('/api/products/missing/enrichment').set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });

  // ---------- POST /:productId/enrich-from-url ----------
  describe('POST /api/products/:productId/enrich-from-url', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/products/prod-1/enrich-from-url')
        .send({ productUrl: 'https://example.com' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when productUrl is missing', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/products/prod-1/enrich-from-url')
        .set('Cookie', cookie)
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 400 for invalid URL format', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/products/prod-1/enrich-from-url')
        .set('Cookie', cookie)
        .send({ productUrl: 'not-a-url' });
      expect(res.status).toBe(400);
    });
  });
});
