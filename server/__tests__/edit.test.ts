import { describe, it, expect, beforeEach, afterEach, vi, MockedClass } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { GeminiService } from '../services/geminiService';
import { imageStorageService } from '../services/imageStorage';

// Mock error classes (same pattern as transform.test.ts)
class MockGeminiAuthError extends Error {
  code = 'AUTH_ERROR';
  constructor() {
    super('Invalid or missing Gemini API key');
    this.name = 'GeminiAuthError';
  }
}

class MockGeminiRateLimitError extends Error {
  code = 'RATE_LIMIT';
  constructor() {
    super('Gemini API rate limit exceeded');
    this.name = 'GeminiRateLimitError';
  }
}

class MockGeminiContentError extends Error {
  code = 'NO_CONTENT';
  constructor() {
    super('No image data in response');
    this.name = 'GeminiContentError';
  }
}

class MockGeminiTimeoutError extends Error {
  code = 'TIMEOUT';
  constructor() {
    super('Gemini API request timed out');
    this.name = 'GeminiTimeoutError';
  }
}

vi.mock('../services/geminiService');

// Helper functions
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

describe('POST /api/generations/:id/edit', () => {
  let sessionId: string;
  let userId: string;
  let sessionCookie: string;

  const mockExistingGeneration = {
    id: 'existing-gen-id',
    userId: '',  // Will be set in beforeEach
    prompt: 'Original prompt',
    imagePath: 'original.png',
    imageUrl: '/uploads/original.png',
    conversationHistory: [
      { role: 'user' as const, parts: [{ text: 'Original prompt' }] }
    ],
    model: 'gemini-2.0-flash-exp',
    aspectRatio: '1:1',
    createdAt: new Date(),
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
  };

  beforeEach(async () => {
    // Create user and login
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'edit-test@example.com', password: 'TestPass123!' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'edit-test@example.com', password: 'TestPass123!' });

    sessionCookie = getSessionCookie(loginRes)!;
    sessionId = extractSessionId(sessionCookie)!;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [sessionCookie]);
    userId = meRes.body.user.id;

    // Update mock with correct userId
    mockExistingGeneration.userId = userId;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('returns 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/generations/some-id/edit')
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(401);
    });

    it('returns 401 with invalid session', async () => {
      const res = await request(app)
        .post('/api/generations/some-id/edit')
        .set('Cookie', ['sessionId=invalid'])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(401);
    });
  });

  describe('Authorization', () => {
    it('returns 404 for non-existent generation', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/generations/nonexistent-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Generation not found');
    });

    it('returns 403 for other user\'s generation', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue({
        ...mockExistingGeneration,
        userId: 'different-user-id',
      });

      const res = await request(app)
        .post('/api/generations/other-user-gen/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Forbidden');
    });
  });

  describe('Validation', () => {
    it('returns 400 for missing prompt', async () => {
      const res = await request(app)
        .post('/api/generations/some-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('returns 400 for empty prompt', async () => {
      const res = await request(app)
        .post('/api/generations/some-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Successful Edit', () => {
    beforeEach(() => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockExistingGeneration);
    });

    it('returns 201 with valid edit', async () => {
      const mockContinueConversation = vi.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [...mockExistingGeneration.conversationHistory],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      vi.spyOn(imageStorageService, 'saveEdit').mockResolvedValue({
        ...mockExistingGeneration,
        id: 'new-edited-id',
        parentGenerationId: 'existing-gen-id',
        editPrompt: 'Make it warmer',
        editCount: 1,
        imageUrl: '/uploads/edited.png',
      });

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(201);
    });

    it('returns new generationId in response', async () => {
      const mockContinueConversation = vi.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      vi.spyOn(imageStorageService, 'saveEdit').mockResolvedValue({
        ...mockExistingGeneration,
        id: 'new-edited-id',
        parentGenerationId: 'existing-gen-id',
        editPrompt: 'Make it warmer',
        editCount: 1,
      });

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.body.generationId).toBe('new-edited-id');
      expect(res.body.generationId).not.toBe('existing-gen-id');
    });

    it('returns parentId in response', async () => {
      const mockContinueConversation = vi.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      vi.spyOn(imageStorageService, 'saveEdit').mockResolvedValue({
        ...mockExistingGeneration,
        id: 'new-edited-id',
        parentGenerationId: 'existing-gen-id',
      });

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.body.parentId).toBe('existing-gen-id');
    });

    it('returns canEdit: true in response', async () => {
      const mockContinueConversation = vi.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      vi.spyOn(imageStorageService, 'saveEdit').mockResolvedValue({
        ...mockExistingGeneration,
        id: 'new-edited-id',
      });

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.body.canEdit).toBe(true);
      expect(res.body.success).toBe(true);
    });

    it('calls GeminiService.continueConversation with history and prompt', async () => {
      const mockContinueConversation = vi.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      vi.spyOn(imageStorageService, 'saveEdit').mockResolvedValue({
        ...mockExistingGeneration,
        id: 'new-edited-id',
      });

      await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(mockContinueConversation).toHaveBeenCalledWith(
        mockExistingGeneration.conversationHistory,
        'Make it warmer'
      );
    });

    it('calls saveEdit with correct parameters', async () => {
      const mockContinueConversation = vi.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [{ role: 'user', parts: [{ text: 'Make it warmer' }] }],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      const mockSaveEdit = vi.spyOn(imageStorageService, 'saveEdit').mockResolvedValue({
        ...mockExistingGeneration,
        id: 'new-edited-id',
      });

      await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(mockSaveEdit).toHaveBeenCalledWith(
        'existing-gen-id',
        'Make it warmer',
        expect.objectContaining({
          userId,
          prompt: 'Original prompt [EDIT: Make it warmer]',
          imageBase64: 'newBase64Data',
          model: 'gemini-2.0-flash-exp',
          aspectRatio: '1:1'
        })
      );
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'getGeneration').mockResolvedValue(mockExistingGeneration);
    });

    it('returns 500 for GeminiAuthError', async () => {
      const mockContinueConversation = vi.fn().mockRejectedValue(new MockGeminiAuthError());
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Image generation service unavailable');
    });

    it('returns 429 for GeminiRateLimitError', async () => {
      const mockContinueConversation = vi.fn().mockRejectedValue(new MockGeminiRateLimitError());
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(429);
      expect(res.body.error).toBe('Too many requests');
    });

    it('returns 400 for GeminiContentError', async () => {
      const mockContinueConversation = vi.fn().mockRejectedValue(new MockGeminiContentError());
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Could not generate image');
    });

    it('returns 504 for GeminiTimeoutError', async () => {
      const mockContinueConversation = vi.fn().mockRejectedValue(new MockGeminiTimeoutError());
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(504);
      expect(res.body.error).toBe('Request timeout');
    });

    it('returns 500 for storage error', async () => {
      const mockContinueConversation = vi.fn().mockResolvedValue({
        imageBase64: 'newBase64Data',
        conversationHistory: [],
        model: 'gemini-2.0-flash-exp'
      });
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        continueConversation: mockContinueConversation,
      } as any));

      vi.spyOn(imageStorageService, 'saveEdit').mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post('/api/generations/existing-gen-id/edit')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'Make it warmer' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to edit generation');
    });
  });
});
