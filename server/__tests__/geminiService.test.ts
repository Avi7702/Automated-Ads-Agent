import { describe, it, expect, beforeAll, beforeEach, vi, afterEach } from 'vitest';

// Use vi.hoisted to define mocks that will be available to vi.mock factories
const { mockGenerateContent } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn();
  return { mockGenerateContent };
});

vi.mock('../lib/gemini', () => ({
  genAI: {
    models: {
      generateContent: mockGenerateContent
    }
  }
}));

// Mock telemetry
vi.mock('../instrumentation', () => ({
  telemetry: {
    trackGeminiUsage: vi.fn(),
  }
}));

// Import the service after mocks are set up
import { GeminiService } from '../services/geminiService';

describe('GeminiService', () => {
  let geminiService: GeminiService;

  const successResponse = {
    candidates: [{
      content: {
        parts: [{
          inlineData: {
            mimeType: 'image/png',
            data: 'base64encodedimage'
          }
        }]
      }
    }],
    usageMetadata: {
      promptTokenCount: 10,
      candidatesTokenCount: 20,
      totalTokenCount: 30
    }
  };

  beforeAll(() => {
    // process.env.GEMINI_API_KEY no longer needed here as it's handled in the lib import which we mock
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mocks to default success response
    mockGenerateContent.mockResolvedValue(successResponse);
    geminiService = new GeminiService();
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe('generateImage', () => {
    it('calls Gemini API with prompt', async () => {
      const prompt = 'A beautiful sunset over mountains';

      const result = await geminiService.generateImage(prompt);

      expect(result).toHaveProperty('imageBase64');
      expect(result).toHaveProperty('conversationHistory');
      expect(result).toHaveProperty('model');
    });

    it('returns base64 image data', async () => {
      const prompt = 'A beautiful sunset over mountains';

      const result = await geminiService.generateImage(prompt);

      expect(result).toHaveProperty('imageBase64');
      expect(result.imageBase64).toBe('base64encodedimage');
    });

    it('stores conversation history', async () => {
      const prompt = 'A beautiful sunset over mountains';

      const result = await geminiService.generateImage(prompt);

      expect(result).toHaveProperty('conversationHistory');
      expect(Array.isArray(result.conversationHistory)).toBe(true);
      expect(result.conversationHistory.length).toBeGreaterThan(0);
    });

    it('handles API errors gracefully', async () => {
      const mockError = new Error('API rate limit exceeded');
      mockGenerateContent.mockRejectedValue(mockError);

      const prompt = 'A beautiful sunset over mountains';

      await expect(geminiService.generateImage(prompt)).rejects.toThrow('API rate limit exceeded');
    });

    it('includes reference images when provided', async () => {
      const prompt = 'Generate similar image';
      // Reference images should be valid base64
      const validBase64 = 'a'.repeat(150);
      const options = {
        referenceImages: [validBase64, validBase64]
      };

      const result = await geminiService.generateImage(prompt, options);

      expect(result).toHaveProperty('imageBase64');
      expect(result.conversationHistory.length).toBeGreaterThan(0);

      // Verify that generateContent was called with contents including inlineData
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3-pro-preview',
          contents: expect.arrayContaining([
            expect.objectContaining({ inlineData: expect.any(Object) })
          ])
        })
      );
    });

    it('respects aspect ratio parameter', async () => {
      const prompt = 'A landscape photo';
      const options = {
        aspectRatio: '16:9' as const
      };

      const result = await geminiService.generateImage(prompt, options);

      expect(result).toHaveProperty('imageBase64');
      expect(result.imageBase64).toBe('base64encodedimage');

      // Verify aspect ratio was included in the prompt
      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({ text: expect.stringContaining('[Aspect ratio: 16:9]') })
          ])
        })
      );
    });
  });

  describe('continueConversation', () => {
    it('appends to existing history', async () => {
      const existingHistory = [
        {
          role: 'user' as const,
          parts: [{ text: 'Create a sunset image' }]
        },
        {
          role: 'model' as const,
          parts: [{
            inlineData: {
              mimeType: 'image/png',
              data: 'previousimage'
            }
          }]
        }
      ];
      const editPrompt = 'Make it more colorful';

      const result = await geminiService.continueConversation(existingHistory, editPrompt);

      expect(result).toHaveProperty('conversationHistory');
      expect(result.conversationHistory.length).toBeGreaterThan(existingHistory.length);
    });

    it('maintains conversation roles', async () => {
      const existingHistory = [
        {
          role: 'user' as const,
          parts: [{ text: 'Create a sunset image' }]
        },
        {
          role: 'model' as const,
          parts: [{
            inlineData: {
              mimeType: 'image/png',
              data: 'previousimage'
            }
          }]
        }
      ];
      const editPrompt = 'Make it more colorful';

      const result = await geminiService.continueConversation(existingHistory, editPrompt);

      expect(result).toHaveProperty('imageBase64');
      expect(result.conversationHistory).toBeDefined();
      expect(result.conversationHistory[0].role).toBe('user');
      expect(result.conversationHistory[1].role).toBe('model');
    });
  });

  describe('config', () => {
    it('uses correct model version', async () => {
      const prompt = 'Test prompt';

      const result = await geminiService.generateImage(prompt);

      expect(result).toHaveProperty('model');
      expect(result.model).toBe('gemini-3-pro-preview');
    });
  });

  describe('Production Hardening - Bug Fixes', () => {
    it('sends reference images in contents array', async () => {
      const validBase64 = 'a'.repeat(150);
      const options = { referenceImages: [validBase64, validBase64] };

      await geminiService.generateImage('test prompt', options);

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({ text: 'test prompt' }),
            expect.objectContaining({ inlineData: { mimeType: 'image/png', data: validBase64 } })
          ])
        })
      );
    });

    it('uses models.generateContent for continueConversation', async () => {
      const history = [
        { role: 'user' as const, parts: [{ text: 'Create image' }] },
        { role: 'model' as const, parts: [{ inlineData: { mimeType: 'image/png', data: 'img' } }] }
      ];

      await geminiService.continueConversation(history, 'Edit it');

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-3-pro-preview',
          contents: expect.arrayContaining([
            expect.objectContaining({ role: 'user' }),
            expect.objectContaining({ role: 'model' }),
            expect.objectContaining({ role: 'user', parts: [{ text: 'Edit it' }] })
          ])
        })
      );
    });
  });

  describe('Production Hardening - Error Types', () => {
    it('throws error when no candidates in response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        candidates: []
      });

      await expect(geminiService.generateImage('test'))
        .rejects.toThrow('No content in response');
    });

    it('throws error when no content parts', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [{ content: { parts: null } }]
      });

      await expect(geminiService.generateImage('test'))
        .rejects.toThrow('No content in response');
    });

    it('throws error when no image data in parts', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [{
          content: { parts: [{ text: 'just text, no image' }] }
        }]
      });

      await expect(geminiService.generateImage('test'))
        .rejects.toThrow('No image data in response');
    });
  });

  describe('Production Hardening - Response Handling', () => {
    it('extracts image data from response parts', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [
              { text: 'some text' },
              { inlineData: { mimeType: 'image/jpeg', data: 'jpegdata' } }
            ]
          }
        }]
      });

      const result = await geminiService.generateImage('test');

      expect(result.imageBase64).toBe('jpegdata');
    });

    it('uses first image found in parts', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        candidates: [{
          content: {
            parts: [
              { inlineData: { mimeType: 'image/png', data: 'firstimage' } },
              { inlineData: { mimeType: 'image/png', data: 'secondimage' } }
            ]
          }
        }]
      });

      const result = await geminiService.generateImage('test');

      expect(result.imageBase64).toBe('firstimage');
    });

    it('includes usage metadata in response', async () => {
      const result = await geminiService.generateImage('test');

      expect(result.usageMetadata).toEqual({
        promptTokenCount: 10,
        candidatesTokenCount: 20,
        totalTokenCount: 30
      });
    });
  });
});
