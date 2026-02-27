import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { planningRouter } from '../../routes/planning.router';

describe('Planning Router — /api/content-planner', () => {
  let app: Express;
  let cookie: string;
  let overrides: ContextOverrides;

  const mockPost = {
    id: 'post-1',
    userId: 'test-user-1',
    category: 'showcase',
    subType: 'general',
    platform: 'linkedin',
    notes: null,
    postedAt: new Date(),
  };

  beforeEach(() => {
    overrides = {
      storage: {
        getWeeklyBalance: vi.fn().mockResolvedValue([
          { category: 'showcase', count: 2 },
          { category: 'educational', count: 1 },
        ]),
        createContentPlannerPost: vi.fn().mockResolvedValue(mockPost),
        getContentPlannerPostsByUser: vi.fn().mockResolvedValue([mockPost]),
        getContentPlannerPostById: vi.fn().mockResolvedValue(mockPost),
        deleteContentPlannerPost: vi.fn().mockResolvedValue(undefined),
      },
    };

    const result = createTestAppForRouter(planningRouter, '/api/content-planner', overrides);
    app = result.app;
  });

  // ---------- GET /templates (public) ----------
  describe('GET /api/content-planner/templates', () => {
    it('returns 200 with templates (public)', async () => {
      const res = await request(app).get('/api/content-planner/templates');
      expect(res.status).toBe(200);
      expect(res.body.categories).toBeDefined();
      expect(res.body.templates).toBeDefined();
    });
  });

  // ---------- GET /balance ----------
  describe('GET /api/content-planner/balance', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/content-planner/balance');
      expect(res.status).toBe(401);
    });

    it('returns 200 with balance data', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .get('/api/content-planner/balance')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.balance).toBeDefined();
      expect(res.body.suggested).toBeDefined();
      expect(typeof res.body.totalPosts).toBe('number');
    });
  });

  // ---------- GET /suggestion ----------
  describe('GET /api/content-planner/suggestion', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/content-planner/suggestion');
      expect(res.status).toBe(401);
    });

    it('returns 200 with suggestion', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .get('/api/content-planner/suggestion')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.category).toBeDefined();
      expect(res.body.reason).toBeDefined();
    });
  });

  // ---------- POST /posts ----------
  describe('POST /api/content-planner/posts', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/content-planner/posts')
        .send({ category: 'showcase' });
      expect(res.status).toBe(401);
    });

    it('returns 400 for invalid category', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/content-planner/posts')
        .set('Cookie', cookie)
        .send({ category: 'not-a-valid-category-xyz' });
      expect(res.status).toBe(400);
    });

    it('creates a post with valid category', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/content-planner/posts')
        .set('Cookie', cookie)
        .send({ category: 'product_showcase' });
      expect(res.status).toBe(201);
      expect(res.body.post).toBeDefined();
    });
  });

  // ---------- GET /posts ----------
  describe('GET /api/content-planner/posts', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/content-planner/posts');
      expect(res.status).toBe(401);
    });

    it('returns 200 with posts', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .get('/api/content-planner/posts')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.posts).toBeDefined();
    });
  });

  // ---------- DELETE /posts/:id ----------
  describe('DELETE /api/content-planner/posts/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/content-planner/posts/post-1');
      expect(res.status).toBe(401);
    });

    it('returns 404 when post not found', async () => {
      (overrides.storage!.getContentPlannerPostById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(planningRouter, '/api/content-planner', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app)
        .delete('/api/content-planner/posts/missing')
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });

    it('returns 403 when user does not own the post', async () => {
      (overrides.storage!.getContentPlannerPostById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockPost,
        userId: 'other-user',
      });
      const rebuilt = createTestAppForRouter(planningRouter, '/api/content-planner', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app)
        .delete('/api/content-planner/posts/post-1')
        .set('Cookie', cookie);
      expect(res.status).toBe(403);
    });

    it('deletes a post owned by the user', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .delete('/api/content-planner/posts/post-1')
        .set('Cookie', cookie);
      expect(res.status).toBe(200);
    });
  });

  // ---------- POST /carousel-outline ----------
  describe('POST /api/content-planner/carousel-outline', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/content-planner/carousel-outline')
        .send({ templateId: 'tmpl-1', topic: 'steel benefits' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when templateId is missing', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/content-planner/carousel-outline')
        .set('Cookie', cookie)
        .send({ topic: 'steel benefits' });
      expect(res.status).toBe(400);
    });

    it('returns 400 when topic is missing', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/content-planner/carousel-outline')
        .set('Cookie', cookie)
        .send({ templateId: 'tmpl-1' });
      expect(res.status).toBe(400);
    });
  });
});
