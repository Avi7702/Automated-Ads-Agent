import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { templatesRouter } from '../../routes/templates.router';

describe('Templates Router — /api/templates', () => {
  let app: Express;
  let cookie: string;
  let overrides: ContextOverrides;

  const mockTemplate = {
    id: 'tmpl-1',
    name: 'Product Showcase',
    category: 'showcase',
    isGlobal: true,
    createdBy: 'test-user-1',
    referenceImageUrls: [],
  };

  beforeEach(() => {
    overrides = {
      storage: {
        getAdSceneTemplates: vi.fn().mockResolvedValue([mockTemplate]),
        getAdSceneTemplateById: vi.fn().mockResolvedValue(mockTemplate),
        searchAdSceneTemplates: vi.fn().mockResolvedValue([mockTemplate]),
        saveAdSceneTemplate: vi.fn().mockResolvedValue({ ...mockTemplate, id: 'tmpl-new' }),
        updateAdSceneTemplate: vi.fn().mockResolvedValue({ ...mockTemplate, name: 'Updated' }),
        deleteAdSceneTemplate: vi.fn().mockResolvedValue(undefined),
        getPerformingAdTemplate: vi.fn().mockResolvedValue(mockTemplate),
      },
    };

    const result = createTestAppForRouter(templatesRouter, '/api/templates', overrides);
    app = result.app;
  });

  // ---------- GET / (public) ----------
  describe('GET /api/templates', () => {
    it('returns 200 without auth (public endpoint)', async () => {
      const res = await request(app).get('/api/templates');
      expect(res.status).toBe(200);
      expect(res.body.templates).toHaveLength(1);
      expect(res.body.total).toBe(1);
    });

    it('supports category filter', async () => {
      await request(app).get('/api/templates?category=showcase');
      expect(overrides.storage!.getAdSceneTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ category: 'showcase' }),
      );
    });
  });

  // ---------- GET /search (public) ----------
  describe('GET /api/templates/search', () => {
    it('returns 200 with search results', async () => {
      const res = await request(app).get('/api/templates/search?q=product');
      expect(res.status).toBe(200);
      expect(res.body.templates).toHaveLength(1);
    });
  });

  // ---------- GET /:id (public) ----------
  describe('GET /api/templates/:id', () => {
    it('returns 200 with template', async () => {
      const res = await request(app).get('/api/templates/tmpl-1');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('tmpl-1');
    });

    it('returns 404 when template not found', async () => {
      (overrides.storage!.getAdSceneTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(templatesRouter, '/api/templates', overrides);
      const res = await request(rebuilt.app).get('/api/templates/missing');
      expect(res.status).toBe(404);
    });
  });

  // ---------- POST /match-context ----------
  describe('POST /api/templates/match-context', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/templates/match-context')
        .send({ industry: 'steel', objective: 'awareness', platform: 'linkedin', aspectRatio: '16:9' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when required fields missing', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/templates/match-context')
        .set('Cookie', cookie)
        .send({ industry: 'steel' });
      expect(res.status).toBe(400);
    });
  });

  // ---------- GET /analyze-patterns/:templateId ----------
  describe('GET /api/templates/analyze-patterns/:templateId', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/templates/analyze-patterns/tmpl-1');
      expect(res.status).toBe(401);
    });

    it('returns 404 when template not found', async () => {
      (overrides.storage!.getPerformingAdTemplate as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(templatesRouter, '/api/templates', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app)
        .get('/api/templates/analyze-patterns/missing')
        .set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });

  // ---------- POST /suggest-customizations ----------
  describe('POST /api/templates/suggest-customizations', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/templates/suggest-customizations')
        .send({ templateId: 'tmpl-1' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when templateId missing', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/templates/suggest-customizations')
        .set('Cookie', cookie)
        .send({});
      expect(res.status).toBe(400);
    });
  });

  // ---------- POST / (create, admin only) ----------
  describe('POST /api/templates', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/templates')
        .send({ name: 'New Template', category: 'test' });
      expect(res.status).toBe(401);
    });

    it('returns 403 for non-admin', async () => {
      cookie = await loginAs(app, 'user-1', 'user');
      const res = await request(app)
        .post('/api/templates')
        .set('Cookie', cookie)
        .send({ name: 'New Template' });
      expect(res.status).toBe(403);
    });

    it('creates template for admin', async () => {
      cookie = await loginAs(app, 'admin-1', 'admin');
      const res = await request(app)
        .post('/api/templates')
        .set('Cookie', cookie)
        .send({ name: 'New Template', category: 'test' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBe('tmpl-new');
    });
  });

  // ---------- PATCH /:id ----------
  describe('PATCH /api/templates/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .patch('/api/templates/tmpl-1')
        .send({ name: 'Updated' });
      expect(res.status).toBe(401);
    });

    it('returns 404 when template not found', async () => {
      (overrides.storage!.getAdSceneTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(templatesRouter, '/api/templates', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app)
        .patch('/api/templates/missing')
        .set('Cookie', cookie)
        .send({ name: 'Updated' });
      expect(res.status).toBe(404);
    });

    it('returns 403 when user is not creator or admin', async () => {
      (overrides.storage!.getAdSceneTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTemplate,
        createdBy: 'other-user',
      });
      const rebuilt = createTestAppForRouter(templatesRouter, '/api/templates', overrides);
      cookie = await loginAs(rebuilt.app, 'user-1', 'user');
      const res = await request(rebuilt.app)
        .patch('/api/templates/tmpl-1')
        .set('Cookie', cookie)
        .send({ name: 'Updated' });
      expect(res.status).toBe(403);
    });

    it('allows creator to update', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .patch('/api/templates/tmpl-1')
        .set('Cookie', cookie)
        .send({ name: 'Updated' });
      expect(res.status).toBe(200);
    });
  });

  // ---------- DELETE /:id ----------
  describe('DELETE /api/templates/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/templates/tmpl-1');
      expect(res.status).toBe(401);
    });

    it('returns 404 when template not found', async () => {
      (overrides.storage!.getAdSceneTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(templatesRouter, '/api/templates', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app).delete('/api/templates/missing').set('Cookie', cookie);
      expect(res.status).toBe(404);
    });

    it('returns 403 when user is not creator or admin', async () => {
      (overrides.storage!.getAdSceneTemplateById as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockTemplate,
        createdBy: 'other-user',
      });
      const rebuilt = createTestAppForRouter(templatesRouter, '/api/templates', overrides);
      cookie = await loginAs(rebuilt.app, 'user-1', 'user');
      const res = await request(rebuilt.app).delete('/api/templates/tmpl-1').set('Cookie', cookie);
      expect(res.status).toBe(403);
    });

    it('deletes template for creator', async () => {
      cookie = await loginAs(app);
      const res = await request(app).delete('/api/templates/tmpl-1').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
