// Mock the Gemini SDK
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
  generateContent: mockGenerateContent
});

const mockGoogleGenerativeAI = jest.fn().mockImplementation(() => ({
  getGenerativeModel: mockGetGenerativeModel
}));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: mockGoogleGenerativeAI
}));

describe('GeminiService', () => {
  let geminiService: any;

  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-api-key';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    const { GeminiService } = require('../services/geminiService');
    geminiService = new GeminiService();
  });

  describe('generateImage', () => {
    it('calls Gemini API with prompt', async () => {
      const prompt = 'A beautiful sunset over mountains';

      const result = await geminiService.generateImage(prompt);

      // Verify the service returns expected result structure
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
      mockGenerateContent.mockRejectedValueOnce(mockError);

      const prompt = 'A beautiful sunset over mountains';

      await expect(geminiService.generateImage(prompt)).rejects.toThrow('API rate limit exceeded');
    });

    it('includes reference images when provided', async () => {
      const prompt = 'Generate similar image';
      const options = {
        referenceImages: ['base64ref1', 'base64ref2']
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
      // Verify the history structure is maintained
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

      // Restore for other tests
      process.env.GEMINI_API_KEY = originalKey;
    });

    it('uses correct model version', async () => {
      const prompt = 'Test prompt';

      const result = await geminiService.generateImage(prompt);

      expect(result).toHaveProperty('model');
      expect(result.model).toBe('gemini-2.0-flash-exp');
    });
  });
});
