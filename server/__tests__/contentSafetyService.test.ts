/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted to define mocks that will be available to vi.mock factories
const { mockGenerateContentWithRetry, mockStorage } = vi.hoisted(() => {
  const mockGenerateContentWithRetry = vi.fn();
  const mockStorage = {
    getBrandProfileByUserId: vi.fn(),
  };
  return { mockGenerateContentWithRetry, mockStorage };
});

// Mock the Gemini client
vi.mock('../lib/geminiClient', () => ({
  generateContentWithRetry: mockGenerateContentWithRetry,
}));

// Mock storage
vi.mock('../storage', () => ({
  storage: mockStorage,
}));

// Import the service after mocks are set up
import { checkContentSafety, type SafetyChecks, type CheckSafetyParams } from '../services/contentSafetyService';
import type { BrandProfile } from '@shared/schema';

describe('ContentSafetyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkContentSafety', () => {
    it('should pass all safety checks for clean content', async () => {
      // Mock Gemini API response (all safe)
      mockGenerateContentWithRetry.mockResolvedValue({
        candidates: [
          {
            safetyRatings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
            ],
            finishReason: 'STOP',
          },
        ],
      });

      // Mock brand profile (no prohibited words)
      mockStorage.getBrandProfileByUserId.mockResolvedValue({
        id: 'brand-123',
        userId: 'user-123',
        voice: { wordsToAvoid: [] },
      } as BrandProfile);

      const params: CheckSafetyParams = {
        caption: 'Check out our amazing new steel products!',
        userId: 'user-123',
      };

      const result = await checkContentSafety(params);

      expect(result).toEqual({
        hateSpeech: true,
        violence: true,
        sexualContent: true,
        piiDetection: true,
        prohibitedWords: [],
        competitorMentions: [],
        brandSafetyScore: 100,
      });
    });

    it('should detect PII in content', async () => {
      mockGenerateContentWithRetry.mockResolvedValue({
        candidates: [
          {
            safetyRatings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
            ],
            finishReason: 'STOP',
          },
        ],
      });

      mockStorage.getBrandProfileByUserId.mockResolvedValue({
        id: 'brand-123',
        userId: 'user-123',
        voice: { wordsToAvoid: [] },
      } as BrandProfile);

      const params: CheckSafetyParams = {
        caption: 'Contact me at john@example.com or 555-123-4567',
        userId: 'user-123',
      };

      const result = await checkContentSafety(params);

      expect(result.piiDetection).toBe(false);
      expect(result.brandSafetyScore).toBe(50); // -50 for PII
    });

    it('should detect prohibited words from brand profile', async () => {
      mockGenerateContentWithRetry.mockResolvedValue({
        candidates: [
          {
            safetyRatings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
            ],
            finishReason: 'STOP',
          },
        ],
      });

      mockStorage.getBrandProfileByUserId.mockResolvedValue({
        id: 'brand-123',
        userId: 'user-123',
        voice: { wordsToAvoid: ['cheap', 'discount'] },
      } as BrandProfile);

      const params: CheckSafetyParams = {
        caption: 'Get our cheap products at discount prices!',
        userId: 'user-123',
      };

      const result = await checkContentSafety(params);

      expect(result.prohibitedWords).toEqual(['cheap', 'discount']);
      expect(result.brandSafetyScore).toBe(80); // -10 for each prohibited word
    });

    it('should detect competitor mentions', async () => {
      mockGenerateContentWithRetry.mockResolvedValue({
        candidates: [
          {
            safetyRatings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
            ],
            finishReason: 'STOP',
          },
        ],
      });

      mockStorage.getBrandProfileByUserId.mockResolvedValue({
        id: 'brand-123',
        userId: 'user-123',
        voice: { wordsToAvoid: [] },
      } as BrandProfile);

      const params: CheckSafetyParams = {
        caption: 'We are better than Nucor and U.S. Steel!',
        userId: 'user-123',
      };

      const result = await checkContentSafety(params);

      expect(result.competitorMentions).toEqual(['Nucor', 'U.S. Steel']);
      expect(result.brandSafetyScore).toBe(60); // -20 for each competitor mention
    });

    it('should fail hate speech check from Gemini', async () => {
      mockGenerateContentWithRetry.mockResolvedValue({
        candidates: [
          {
            safetyRatings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'HIGH' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
            ],
            finishReason: 'SAFETY',
          },
        ],
      });

      mockStorage.getBrandProfileByUserId.mockResolvedValue({
        id: 'brand-123',
        userId: 'user-123',
        voice: { wordsToAvoid: [] },
      } as BrandProfile);

      const params: CheckSafetyParams = {
        caption: 'Inappropriate content with hate speech',
        userId: 'user-123',
      };

      const result = await checkContentSafety(params);

      expect(result.hateSpeech).toBe(false);
      expect(result.brandSafetyScore).toBe(0); // Critical failure
    });

    it('should handle Gemini API failure gracefully', async () => {
      // Mock Gemini API error
      mockGenerateContentWithRetry.mockRejectedValue(new Error('API rate limit'));

      mockStorage.getBrandProfileByUserId.mockResolvedValue({
        id: 'brand-123',
        userId: 'user-123',
        voice: { wordsToAvoid: [] },
      } as BrandProfile);

      const params: CheckSafetyParams = {
        caption: 'Test content',
        userId: 'user-123',
      };

      const result = await checkContentSafety(params);

      // Fail-CLOSED: On Gemini failure, defaults to BLOCK (all flags false = unsafe)
      // unless SAFETY_FAIL_OPEN=true in non-production
      expect(result.hateSpeech).toBe(false);
      expect(result.violence).toBe(false);
      expect(result.sexualContent).toBe(false);
      expect(result.brandSafetyScore).toBe(0);
    });

    it('should handle missing brand profile gracefully', async () => {
      mockGenerateContentWithRetry.mockResolvedValue({
        candidates: [
          {
            safetyRatings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
            ],
            finishReason: 'STOP',
          },
        ],
      });

      // Mock missing brand profile
      mockStorage.getBrandProfileByUserId.mockResolvedValue(undefined);

      const params: CheckSafetyParams = {
        caption: 'Test content with words that would be prohibited',
        userId: 'user-123',
      };

      const result = await checkContentSafety(params);

      // Should still work without brand profile
      expect(result.prohibitedWords).toEqual([]);
      expect(result.brandSafetyScore).toBe(100);
    });

    it('should detect multiple PII types', async () => {
      mockGenerateContentWithRetry.mockResolvedValue({
        candidates: [
          {
            safetyRatings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
            ],
            finishReason: 'STOP',
          },
        ],
      });

      mockStorage.getBrandProfileByUserId.mockResolvedValue({
        id: 'brand-123',
        userId: 'user-123',
        voice: { wordsToAvoid: [] },
      } as BrandProfile);

      const params: CheckSafetyParams = {
        caption: 'Call 555-1234 or email test@example.com, SSN: 123-45-6789',
        userId: 'user-123',
      };

      const result = await checkContentSafety(params);

      expect(result.piiDetection).toBe(false);
    });

    it('should calculate correct score for multiple issues', async () => {
      mockGenerateContentWithRetry.mockResolvedValue({
        candidates: [
          {
            safetyRatings: [
              { category: 'HARM_CATEGORY_HATE_SPEECH', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', probability: 'NEGLIGIBLE' },
              { category: 'HARM_CATEGORY_HARASSMENT', probability: 'NEGLIGIBLE' },
            ],
            finishReason: 'STOP',
          },
        ],
      });

      mockStorage.getBrandProfileByUserId.mockResolvedValue({
        id: 'brand-123',
        userId: 'user-123',
        voice: { wordsToAvoid: ['cheap', 'discount', 'sale'] },
      } as BrandProfile);

      const params: CheckSafetyParams = {
        caption: 'Cheap sale! Better than Nucor. Contact: test@example.com',
        userId: 'user-123',
      };

      const result = await checkContentSafety(params);

      // -50 for PII, -20 for competitor, -20 for prohibited words (cheap, sale)
      expect(result.brandSafetyScore).toBe(10);
      expect(result.piiDetection).toBe(false);
      expect(result.prohibitedWords.length).toBeGreaterThan(0);
      expect(result.competitorMentions).toEqual(['Nucor']);
    });
  });
});
