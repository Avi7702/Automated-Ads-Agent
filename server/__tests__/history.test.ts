import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { imageStorageService } from '../services/imageStorage';

function getCookies(res: request.Response): string[] {
  const setCookie = res.headers['set-cookie'];
  if (Array.isArray(setCookie)) return setCookie;
  if (typeof setCookie === 'string') return [setCookie];
  return [];
}

function getSessionCookie(res: request.Response): string | undefined {
  const cookies = getCookies(res);
  return cookies.find(c => c.startsWith('sessionId='));
}

function extractSessionId(cookie: string): string | undefined {
  return cookie.match(/sessionId=([^;]+)/)?.[1];
}

describe('GET /api/generations/:id/history', () => {
  let sessionId: string;
  let userId: string;

  const mockGeneration = {
    id: 'gen-123',
    userId: '',
    prompt: 'Test prompt',
    imagePath: 'test.png',
    imageUrl: '/uploads/test.png',
    conversationHistory: [],
    model: 'gemini-2.0-flash-exp',
    aspectRatio: '1:1',
    createdAt: new Date('2024-01-01'),
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
  };

  beforeEach(async () => {
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'history-test@example.com', password: 'TestPass123!' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'history-test@example.com', password: 'TestPass123!' });

    const sessionCookie = getSessionCookie(loginRes)!;
    sessionId = extractSessionId(sessionCookie)!;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [sessionCookie]);
    userId = meRes.body.user.id;

    mockGeneration.userId = userId;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .get('/api/generations/some-id/history');

      expect(res.status).toBe(401);
    });
  });

  describe('Authorization', () => {
    it('returns 404 for non-existent generation', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(null);

      const res = await request(app)
        .get('/api/generations/nonexistent/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Generation not found');
    });

    it('returns 403 for other user\'s generation', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue({
        ...mockGeneration,
        userId: 'different-user',
      });

      const res = await request(app)
        .get('/api/generations/other-user-gen/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });

  describe('Response Format', () => {
    it('returns array of edit chain', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      vi.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/original.png', createdAt: new Date('2024-01-01') },
        { id: 'edit-1', editPrompt: 'First edit', imageUrl: '/uploads/edit1.png', createdAt: new Date('2024-01-02') },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.history)).toBe(true);
      expect(res.body.history).toHaveLength(2);
    });

    it('includes original generation', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      vi.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/original.png', createdAt: new Date('2024-01-01') },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.body.history[0].editPrompt).toBeNull();
    });

    it('orders by creation date ascending', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      vi.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/1.png', createdAt: new Date('2024-01-01') },
        { id: 'edit-1', editPrompt: 'Edit 1', imageUrl: '/uploads/2.png', createdAt: new Date('2024-01-02') },
        { id: 'edit-2', editPrompt: 'Edit 2', imageUrl: '/uploads/3.png', createdAt: new Date('2024-01-03') },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      const dates = res.body.history.map((h: { createdAt: string }) => new Date(h.createdAt).getTime());
      expect(dates[0]).toBeLessThan(dates[1]);
      expect(dates[1]).toBeLessThan(dates[2]);
    });

    it('includes editPrompt for each item', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      vi.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/1.png', createdAt: new Date() },
        { id: 'edit-1', editPrompt: 'Make it warmer', imageUrl: '/uploads/2.png', createdAt: new Date() },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.body.history[0]).toHaveProperty('editPrompt');
      expect(res.body.history[1].editPrompt).toBe('Make it warmer');
    });

    it('includes imageUrl for each item', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      vi.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/original.png', createdAt: new Date() },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.body.history[0].imageUrl).toBe('/uploads/original.png');
    });

    it('returns single item for unedited generation', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      vi.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/original.png', createdAt: new Date() },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.body.history).toHaveLength(1);
      expect(res.body.totalEdits).toBe(0);
    });

    it('returns totalEdits count', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      vi.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/1.png', createdAt: new Date() },
        { id: 'edit-1', editPrompt: 'Edit 1', imageUrl: '/uploads/2.png', createdAt: new Date() },
        { id: 'edit-2', editPrompt: 'Edit 2', imageUrl: '/uploads/3.png', createdAt: new Date() },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.body.totalEdits).toBe(2);  // 3 items - 1 original = 2 edits
    });

    it('includes generationId in response', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockGeneration);
      vi.spyOn(imageStorageService, 'getEditChain').mockResolvedValue([
        { id: 'original', editPrompt: null, imageUrl: '/uploads/original.png', createdAt: new Date() },
      ]);

      const res = await request(app)
        .get('/api/generations/gen-123/history')
        .set('Cookie', [`sessionId=${sessionId}`]);

      expect(res.body.generationId).toBe('gen-123');
    });
  });
});
