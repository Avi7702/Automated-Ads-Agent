import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { brandImagesRouter } from '../../routes/brandImages.router';

describe('BrandImages Router — /api/brand-images', () => {
  let app: Express;
  let cookie: string;
  let overrides: ContextOverrides;

  const mockImage = {
    id: 'img-1',
    userId: 'test-user-1',
    cloudinaryUrl: 'https://res.cloudinary.com/test/brand.jpg',
    cloudinaryPublicId: 'brand-images/img1',
    category: 'product_hero',
    tags: ['steel', 'beam'],
    description: 'A steel beam',
    productIds: ['prod-1'],
    scenarioId: null,
    suggestedUse: ['social_post'],
    aspectRatio: '16:9',
  };

  beforeEach(() => {
    overrides = {
      storage: {
        getBrandImagesByUser: vi.fn().mockResolvedValue([mockImage]),
        getBrandImagesByCategory: vi.fn().mockResolvedValue([mockImage]),
        getBrandImagesForProducts: vi.fn().mockResolvedValue([mockImage]),
        createBrandImage: vi.fn().mockResolvedValue(mockImage),
        updateBrandImage: vi.fn().mockResolvedValue({ ...mockImage, description: 'Updated' }),
        deleteBrandImage: vi.fn().mockResolvedValue(undefined),
      },
    };

    const result = createTestAppForRouter(brandImagesRouter, '/api/brand-images', overrides);
    app = result.app;
  });

  // ---------- GET / ----------
  describe('GET /api/brand-images', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/brand-images');
      expect(res.status).toBe(401);
    });

    it('returns 200 with images', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/brand-images').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ---------- GET /category/:category ----------
  describe('GET /api/brand-images/category/:category', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/brand-images/category/product_hero');
      expect(res.status).toBe(401);
    });

    it('returns 200 with images by category', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .get('/api/brand-images/category/product_hero')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ---------- POST /for-products ----------
  describe('POST /api/brand-images/for-products', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/brand-images/for-products')
        .send({ productIds: ['prod-1'] });
      expect(res.status).toBe(401);
    });

    it('returns 400 when productIds is missing', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/brand-images/for-products')
        .set('Cookie', cookie)
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 200 with matched images', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/brand-images/for-products')
        .set('Cookie', cookie)
        .send({ productIds: ['prod-1'] });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ---------- PUT /:id ----------
  describe('PUT /api/brand-images/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .put('/api/brand-images/img-1')
        .send({ description: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('updates image metadata', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .put('/api/brand-images/img-1')
        .set('Cookie', cookie)
        .send({ description: 'Updated' });
      expect(res.status).toBe(200);
    });
  });

  // ---------- DELETE /:id ----------
  describe('DELETE /api/brand-images/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/brand-images/img-1');
      expect(res.status).toBe(401);
    });

    it('deletes an image', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .delete('/api/brand-images/img-1')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ---------- POST /recommend ----------
  describe('POST /api/brand-images/recommend', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/brand-images/recommend')
        .send({ useCase: 'social_post' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when useCase missing', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/brand-images/recommend')
        .set('Cookie', cookie)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ---------- POST /match-product/:productId ----------
  describe('POST /api/brand-images/match-product/:productId', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).post('/api/brand-images/match-product/prod-1');
      expect(res.status).toBe(401);
    });
  });

  // ---------- POST /suggest-category ----------
  describe('POST /api/brand-images/suggest-category', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/brand-images/suggest-category')
        .send({ useCase: 'social' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when useCase missing', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/brand-images/suggest-category')
        .set('Cookie', cookie)
        .send({});
      expect(res.status).toBe(400);
    });
  });
});
