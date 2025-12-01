// Mock the Gemini SDK
const mockSendMessage = jest.fn().mockResolvedValue({
  response: {
    candidates: [{
      content: {
        parts: [{
          inlineData: {
            mimeType: 'image/png',
            data: 'base64encodedimage'
          }
        }]
      }
    }]
  }
});

const mockStartChat = jest.fn().mockReturnValue({
  sendMessage: mockSendMessage
});

const mockGenerateContent = jest.fn().mockResolvedValue({
  response: {
    candidates: [{
      content: {
        parts: [{
          inlineData: {
            mimeType: 'image/png',
            data: 'base64encodedimage'
          }
        }]
      }
    }]
  }
});

const mockGetGenerativeModel = jest.fn().mockReturnValue({
  generateContent: mockGenerateContent,
  startChat: mockStartChat
});

const mockGoogleGenerativeAI = jest.fn().mockImplementation(() => ({
  getGenerativeModel: mockGetGenerativeModel
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: mockGoogleGenerativeAI
}));

describe('GeminiService', () => {
  let geminiService: InstanceType<typeof import('../services/geminiService').GeminiService>;

  const successResponse = {
    response: {
      candidates: [{
        content: {
          parts: [{
            inlineData: {
              mimeType: 'image/png',
              data: 'base64encodedimage'
            }
          }]
        }
      }]
    }
  };

  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset mocks to default success response
    mockGenerateContent.mockResolvedValue(successResponse);
    mockSendMessage.mockResolvedValue(successResponse);
    const { GeminiService } = require('../services/geminiService');
    geminiService = new GeminiService();
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
      // Use mockRejectedValueOnce for all 3 retry attempts
      mockGenerateContent
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError)
        .mockRejectedValueOnce(mockError);

      const prompt = 'A beautiful sunset over mountains';

      await expect(geminiService.generateImage(prompt)).rejects.toThrow();
    }, 15000);

    it('includes reference images when provided', async () => {
      const prompt = 'Generate similar image';
      // Reference images must be at least 100 chars to pass validation
      const validBase64 = 'a'.repeat(150);
      const options = {
        referenceImages: [validBase64, validBase64]
      };

      const result = await geminiService.generateImage(prompt, options);

      expect(result).toHaveProperty('imageBase64');
      expect(result.conversationHistory.length).toBeGreaterThan(0);
    });

    it('respects aspect ratio parameter', async () => {
      const prompt = 'A landscape photo';
      const options = {
        aspectRatio: '16:9' as const
      };

      const result = await geminiService.generateImage(prompt, options);

      expect(result).toHaveProperty('imageBase64');
      expect(result.imageBase64).toBe('base64encodedimage');
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

    it('maintains thought signatures', async () => {
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
    it('throws if GEMINI_API_KEY not set', () => {
      const originalKey = process.env.GEMINI_API_KEY;
      delete process.env.GEMINI_API_KEY;

      jest.resetModules();
      const { GeminiService } = require('../services/geminiService');

      expect(() => new GeminiService()).toThrow();

      process.env.GEMINI_API_KEY = originalKey;
    });

    it('uses correct model version', async () => {
      const prompt = 'Test prompt';

      const result = await geminiService.generateImage(prompt);

      expect(result).toHaveProperty('model');
      expect(result.model).toBe('gemini-2.0-flash-exp');
    });
  });

  describe('Production Hardening - Bug Fixes', () => {
    it('sends reference images in contents array, not just prompt string', async () => {
      const validBase64 = 'a'.repeat(150);
      const options = { referenceImages: [validBase64, validBase64] };

      await geminiService.generateImage('test prompt', options);

      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{
          role: 'user',
          parts: expect.arrayContaining([
            expect.objectContaining({ text: expect.any(String) }),
            expect.objectContaining({ inlineData: { mimeType: 'image/png', data: validBase64 } })
          ])
        }]
      });
    });

    it('uses startChat with history for continueConversation', async () => {
      const history = [
        { role: 'user' as const, parts: [{ text: 'Create image' }] },
        { role: 'model' as const, parts: [{ inlineData: { mimeType: 'image/png', data: 'img' } }] }
      ];

      await geminiService.continueConversation(history, 'Edit it');

      expect(mockStartChat).toHaveBeenCalledWith({
        history: expect.arrayContaining([
          expect.objectContaining({ role: 'user' }),
          expect.objectContaining({ role: 'model' })
        ])
      });
      expect(mockSendMessage).toHaveBeenCalledWith('Edit it');
    });
  });

  describe('Production Hardening - Error Types', () => {
    it('throws GeminiContentError when safety filter blocks', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          candidates: [{ finishReason: 'SAFETY', content: { parts: [] } }]
        }
      });

      await expect(geminiService.generateImage('test'))
        .rejects.toThrow('safety filter');
    });

    it('throws GeminiContentError when no candidates in response', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: { candidates: [] }
      });

      await expect(geminiService.generateImage('test'))
        .rejects.toThrow('No candidates');
    });

    it('throws GeminiContentError when no image data', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          candidates: [{
            content: { parts: [{ text: 'just text' }] }
          }]
        }
      });

      await expect(geminiService.generateImage('test'))
        .rejects.toThrow('No image data');
    });
  });

  describe('Production Hardening - Input Validation', () => {
    it('rejects invalid reference image data', async () => {
      const options = { referenceImages: ['short'] };

      await expect(geminiService.generateImage('test', options))
        .rejects.toThrow('Invalid reference image');
    });

    it('sanitizes prompt whitespace', async () => {
      await geminiService.generateImage('  test   prompt  ');

      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{
          role: 'user',
          parts: [{ text: 'test prompt' }]
        }]
      });
    });

    it('truncates prompt over 2000 chars', async () => {
      const longPrompt = 'x'.repeat(2500);

      await geminiService.generateImage(longPrompt);

      expect(mockGenerateContent).toHaveBeenCalledWith({
        contents: [{
          role: 'user',
          parts: [{ text: 'x'.repeat(2000) }]
        }]
      });
    });
  });

  describe('Production Hardening - Retry Logic', () => {
    it('retries on network errors up to 3 times', async () => {
      mockGenerateContent
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          response: {
            candidates: [{
              content: {
                parts: [{ inlineData: { mimeType: 'image/png', data: 'success' } }]
              }
            }]
          }
        });

      const result = await geminiService.generateImage('test');

      expect(result.imageBase64).toBe('success');
      expect(mockGenerateContent).toHaveBeenCalledTimes(3);
    }, 15000);

    it('does not retry on auth errors (401)', async () => {
      mockGenerateContent.mockRejectedValueOnce({ status: 401 });

      await expect(geminiService.generateImage('test'))
        .rejects.toThrow('Invalid or missing Gemini API key');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('does not retry on bad request errors (400)', async () => {
      mockGenerateContent.mockRejectedValueOnce({ status: 400, message: 'Bad request' });

      await expect(geminiService.generateImage('test'))
        .rejects.toThrow();
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });
  });
});
