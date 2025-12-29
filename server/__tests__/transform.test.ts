import { describe, it, expect, beforeEach, afterEach, vi, MockedClass } from 'vitest';
import request from 'supertest';
import { app } from '../app';
import { GeminiService } from '../services/geminiService';
import { imageStorageService } from '../services/imageStorage';

// Create mock error classes that preserve properties across Vitest boundaries
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

// Mock GeminiService
vi.mock('../services/geminiService');

// Helper to get session cookie
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

describe('POST /api/transform', () => {
  let sessionId: string;
  let userId: string;

  beforeEach(async () => {
    // Database cleared by setup.ts

    // Create a user and login
    await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'TestPass123!' });

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'TestPass123!' });

    const sessionCookie = getSessionCookie(loginRes)!;
    sessionId = extractSessionId(sessionCookie)!;

    // Get userId from session
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [sessionCookie]);
    userId = meRes.body.user.id;
  });

  afterEach(() => {
    // Restore all spies
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should return 401 without session cookie', async () => {
      const res = await request(app)
        .post('/api/transform')
        .send({ prompt: 'A beautiful landscape' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });

    it('should return 401 with invalid session cookie', async () => {
      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', ['sessionId=invalid-session-id'])
        .send({ prompt: 'A beautiful landscape' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Validation', () => {
    it('should return 400 for missing prompt', async () => {
      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for empty prompt', async () => {
      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for prompt over 2000 chars', async () => {
      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'A'.repeat(2001) });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it('should return 400 for invalid aspect ratio', async () => {
      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'A beautiful landscape', aspectRatio: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Successful Generation', () => {
    it('should generate image and return saved generation', async () => {
      // Mock GeminiService - prevent constructor from running
      const mockGenerateImage = vi.fn().mockResolvedValue({
        imageBase64: 'base64ImageData123',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'A beautiful landscape' }] },
          { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'base64ImageData123' } }] }
        ],
        model: 'gemini-3-pro-preview'
      });
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => {
        return {
          generateImage: mockGenerateImage,
        } as any;
      });

      // Mock imageStorageService
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      const mockSaveGeneration = vi.spyOn(imageStorageService, 'saveGeneration').mockResolvedValue({
        id: 'test-generation-id',
        userId,
        prompt: 'A beautiful landscape',
        imagePath: 'generation_123.png',
        imageUrl: '/uploads/generation_123.png',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'A beautiful landscape' }] },
          { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'base64ImageData123' } }] }
        ],
        model: 'gemini-3-pro-preview',
        aspectRatio: '1:1',
        createdAt: new Date()
      });

      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'A beautiful landscape' });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        success: true,
        generationId: 'test-generation-id',
        imageUrl: '/uploads/generation_123.png',
        canEdit: true
      });

      // Verify GeminiService was called correctly
      expect(mockGenerateImage).toHaveBeenCalledWith('A beautiful landscape', {
        aspectRatio: '1:1'
      });

      // Verify imageStorageService was called correctly
      expect(mockSaveGeneration).toHaveBeenCalledWith({
        userId,
        prompt: 'A beautiful landscape',
        imageBase64: 'base64ImageData123',
        conversationHistory: expect.any(Array),
        model: 'gemini-3-pro-preview',
        aspectRatio: '1:1'
      });
    });

    it('should pass referenceImages to GeminiService', async () => {
      const mockGenerateImage = vi.fn().mockResolvedValue({
        imageBase64: 'base64ImageData123',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'A beautiful landscape' }] },
          { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'base64ImageData123' } }] }
        ],
        model: 'gemini-3-pro-preview'
      });
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        generateImage: mockGenerateImage,
      } as any));

      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'saveGeneration').mockResolvedValue({
        id: 'test-generation-id',
        userId,
        prompt: 'A beautiful landscape',
        imagePath: 'generation_123.png',
        imageUrl: '/uploads/generation_123.png',
        conversationHistory: [],
        model: 'gemini-3-pro-preview',
        aspectRatio: '16:9',
        createdAt: new Date()
      });

      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({
          prompt: 'A beautiful landscape',
          referenceImages: ['refImage1', 'refImage2'],
          aspectRatio: '16:9'
        });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        success: true,
        generationId: 'test-generation-id',
        imageUrl: '/uploads/generation_123.png',
        canEdit: true
      });

      expect(mockGenerateImage).toHaveBeenCalledWith('A beautiful landscape', {
        referenceImages: ['refImage1', 'refImage2'],
        aspectRatio: '16:9'
      });
    });

    it('should use default aspect ratio 1:1 if not provided', async () => {
      const mockGenerateImage = vi.fn().mockResolvedValue({
        imageBase64: 'base64ImageData123',
        conversationHistory: [],
        model: 'gemini-3-pro-preview'
      });
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        generateImage: mockGenerateImage,
      } as any));

      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      const mockSaveGeneration = vi.spyOn(imageStorageService, 'saveGeneration').mockResolvedValue({
        id: 'test-generation-id',
        userId,
        prompt: 'A beautiful landscape',
        imagePath: 'generation_123.png',
        imageUrl: '/uploads/generation_123.png',
        conversationHistory: [],
        model: 'gemini-3-pro-preview',
        aspectRatio: '1:1',
        createdAt: new Date()
      });

      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'A beautiful landscape' });

      expect(res.status).toBe(201);

      expect(mockGenerateImage).toHaveBeenCalledWith('A beautiful landscape', {
        aspectRatio: '1:1'
      });

      expect(mockSaveGeneration).toHaveBeenCalledWith(
        expect.objectContaining({ aspectRatio: '1:1' })
      );
    });
  });

  describe('Gemini Error Handling', () => {
    it('should return 500 for GeminiAuthError', async () => {
      // Mock storage initialize (required before Gemini call)
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();

      // Use mockRejectedValue with error that has preserved properties
      const authError = new MockGeminiAuthError();
      const mockGenerateImage = vi.fn().mockRejectedValue(authError);
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        generateImage: mockGenerateImage,
      } as any));

      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'A beautiful landscape' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Image generation service unavailable');
    });

    it('should return 429 for GeminiRateLimitError', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();

      const rateLimitError = new MockGeminiRateLimitError();
      const mockGenerateImage = vi.fn().mockRejectedValue(rateLimitError);
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        generateImage: mockGenerateImage,
      } as any));

      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'A beautiful landscape' });

      expect(res.status).toBe(429);
      expect(res.body.error).toBe('Too many requests');
    });

    it('should return 400 for GeminiContentError', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();

      const contentError = new MockGeminiContentError();
      const mockGenerateImage = vi.fn().mockRejectedValue(contentError);
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        generateImage: mockGenerateImage,
      } as any));

      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'A beautiful landscape' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Could not generate image');
    });

    it('should return 504 for GeminiTimeoutError', async () => {
      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();

      const timeoutError = new MockGeminiTimeoutError();
      const mockGenerateImage = vi.fn().mockRejectedValue(timeoutError);
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        generateImage: mockGenerateImage,
      } as any));

      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'A beautiful landscape' });

      expect(res.status).toBe(504);
      expect(res.body.error).toBe('Request timeout');
    });
  });

  describe('Storage Error Handling', () => {
    it('should return 500 when storage fails', async () => {
      const mockGenerateImage = vi.fn().mockResolvedValue({
        imageBase64: 'base64ImageData123',
        conversationHistory: [],
        model: 'gemini-3-pro-preview'
      });
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        generateImage: mockGenerateImage,
      } as any));

      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'saveGeneration').mockRejectedValue(new Error('Database connection failed'));

      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'A beautiful landscape' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to save image');
    });

    it('should not expose internal error details to client', async () => {
      const mockGenerateImage = vi.fn().mockRejectedValue(new Error('Internal database connection string: postgres://user:password@host'));
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        generateImage: mockGenerateImage,
      } as any));

      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();

      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'A beautiful landscape' });

      expect(res.status).toBe(500);
      // Should NOT expose the actual error message with credentials
      expect(res.body.error).not.toContain('postgres://');
      expect(res.body.error).not.toContain('password');
      // Should return generic error
      expect(res.body.error).toBe('Failed to save image');
    });
  });

  describe('Response Format', () => {
    it('should return canEdit: true in response', async () => {
      const mockGenerateImage = vi.fn().mockResolvedValue({
        imageBase64: 'base64ImageData123',
        conversationHistory: [],
        model: 'gemini-3-pro-preview'
      });
      (GeminiService as MockedClass<typeof GeminiService>).mockImplementation(() => ({
        generateImage: mockGenerateImage,
      } as any));

      vi.spyOn(imageStorageService, 'initialize').mockResolvedValue();
      vi.spyOn(imageStorageService, 'saveGeneration').mockResolvedValue({
        id: 'test-generation-id',
        userId,
        prompt: 'A beautiful landscape',
        imagePath: 'generation_123.png',
        imageUrl: '/uploads/generation_123.png',
        conversationHistory: [],
        model: 'gemini-3-pro-preview',
        aspectRatio: '1:1',
        createdAt: new Date()
      });

      const res = await request(app)
        .post('/api/transform')
        .set('Cookie', [`sessionId=${sessionId}`])
        .send({ prompt: 'A beautiful landscape' });

      expect(res.status).toBe(201);
      expect(res.body.canEdit).toBe(true);
      expect(res.body.success).toBe(true);
      expect(res.body.generationId).toBeDefined();
    });
  });
});
