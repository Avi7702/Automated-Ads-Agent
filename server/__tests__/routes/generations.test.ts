import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createTestAppForRouter, loginAs, type ContextOverrides } from './_testHelpers';
import { generationsRouter } from '../../routes/generations.router';

describe('Generations Router — /api/generations', () => {
  let app: Express;
  let cookie: string;
  let overrides: ContextOverrides;

  beforeEach(() => {
    overrides = {
      storage: {
        getGenerations: vi.fn().mockResolvedValue([
          { id: 'gen-1', prompt: 'test', generatedImagePath: '/img.png', originalImagePaths: [] },
        ]),
        getGenerationsByUserId: vi.fn().mockResolvedValue([
          { id: 'gen-1', prompt: 'test', generatedImagePath: '/img.png', originalImagePaths: [] },
        ]),
        getGenerationById: vi.fn().mockResolvedValue({
          id: 'gen-1',
          prompt: 'test prompt',
          generatedImagePath: '/img.png',
          originalImagePaths: ['/orig.png'],
          conversationHistory: [{ role: 'user', parts: [{ text: 'hi' }] }],
          resolution: '2K',
          status: 'completed',
        }),
        getEditHistory: vi.fn().mockResolvedValue([
          { id: 'gen-1', editPrompt: null },
          { id: 'gen-2', editPrompt: 'make it blue' },
        ]),
        deleteGeneration: vi.fn().mockResolvedValue(undefined),
        saveGeneration: vi.fn().mockResolvedValue({ id: 'gen-new' }),
      },
    };

    const result = createTestAppForRouter(generationsRouter, '/api/generations', overrides);
    app = result.app;
  });

  beforeAll(async () => {
    // We re-login per test via beforeEach app rebuild, but this sets the pattern
  });

  // ---------- GET / ----------
  describe('GET /api/generations', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/generations');
      expect(res.status).toBe(401);
    });

    it('returns 200 with generations when authenticated', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/generations').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('passes limit and offset query params to storage', async () => {
      cookie = await loginAs(app);
      await request(app).get('/api/generations?limit=10&offset=20').set('Cookie', cookie);
      expect(overrides.storage!.getGenerationsByUserId).toHaveBeenCalledWith(expect.any(String), 10, 20);
    });
  });

  // ---------- GET /:id ----------
  describe('GET /api/generations/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/generations/gen-1');
      expect(res.status).toBe(401);
    });

    it('returns 200 with a generation', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/generations/gen-1').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.id).toBe('gen-1');
    });

    it('returns 404 when generation not found', async () => {
      (overrides.storage!.getGenerationById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(generationsRouter, '/api/generations', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app).get('/api/generations/missing').set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });

  // ---------- GET /:id/history ----------
  describe('GET /api/generations/:id/history', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).get('/api/generations/gen-1/history');
      expect(res.status).toBe(401);
    });

    it('returns history for a generation', async () => {
      cookie = await loginAs(app);
      const res = await request(app).get('/api/generations/gen-1/history').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.history).toHaveLength(2);
      expect(res.body.totalEdits).toBe(1);
    });

    it('returns 404 when generation not found', async () => {
      (overrides.storage!.getGenerationById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(generationsRouter, '/api/generations', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app).get('/api/generations/missing/history').set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });

  // ---------- DELETE /:id ----------
  describe('DELETE /api/generations/:id', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app).delete('/api/generations/gen-1');
      expect(res.status).toBe(401);
    });

    it('deletes a generation', async () => {
      cookie = await loginAs(app);
      const res = await request(app).delete('/api/generations/gen-1').set('Cookie', cookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('returns 404 when generation not found', async () => {
      (overrides.storage!.getGenerationById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(generationsRouter, '/api/generations', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app).delete('/api/generations/missing').set('Cookie', cookie);
      expect(res.status).toBe(404);
    });
  });

  // ---------- POST /:id/edit ----------
  describe('POST /api/generations/:id/edit', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/generations/gen-1/edit')
        .send({ editPrompt: 'make it red' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when editPrompt is missing', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/generations/gen-1/edit')
        .set('Cookie', cookie)
        .send({});
      expect(res.status).toBe(400);
    });

    it('returns 404 when generation not found', async () => {
      (overrides.storage!.getGenerationById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      const rebuilt = createTestAppForRouter(generationsRouter, '/api/generations', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app)
        .post('/api/generations/missing/edit')
        .set('Cookie', cookie)
        .send({ editPrompt: 'test' });
      expect(res.status).toBe(404);
    });

    it('returns 400 when generation lacks conversationHistory', async () => {
      (overrides.storage!.getGenerationById as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'gen-old',
        conversationHistory: null,
      });
      const rebuilt = createTestAppForRouter(generationsRouter, '/api/generations', overrides);
      cookie = await loginAs(rebuilt.app);
      const res = await request(rebuilt.app)
        .post('/api/generations/gen-old/edit')
        .set('Cookie', cookie)
        .send({ editPrompt: 'test' });
      expect(res.status).toBe(400);
    });

    it('enqueues edit job and returns jobId on valid request', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/generations/gen-1/edit')
        .set('Cookie', cookie)
        .send({ editPrompt: 'make it blue' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.jobId).toBe('job-1');
      expect(res.body.generationId).toBe('gen-new');
    });
  });

  // ---------- POST /video ----------
  describe('POST /api/generations/video', () => {
    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post('/api/generations/video')
        .send({ prompt: 'a video' });
      expect(res.status).toBe(401);
    });

    it('returns 400 when prompt is missing', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/generations/video')
        .set('Cookie', cookie)
        .send({});
      expect(res.status).toBe(400);
    });

    it('enqueues video job on valid request', async () => {
      cookie = await loginAs(app);
      const res = await request(app)
        .post('/api/generations/video')
        .set('Cookie', cookie)
        .send({ prompt: 'a cinematic video of steel beams' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.mediaType).toBe('video');
    });
  });
});
