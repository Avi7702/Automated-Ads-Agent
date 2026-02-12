/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */

// Use vi.hoisted to define mocks that will be available to vi.mock factories
const { mockGenerateContent, mockStorage, mockFetch } = vi.hoisted(() => {
  const mockGenerateContent = vi.fn();
  const mockStorage = {
    getProductAnalysisByProductId: vi.fn(),
    saveProductAnalysis: vi.fn(),
    updateProductAnalysis: vi.fn(),
    deleteProductAnalysis: vi.fn(),
  };
  const mockFetch = vi.fn();
  return { mockGenerateContent, mockStorage, mockFetch };
});

// Mock the Gemini client
vi.mock('../lib/gemini', () => ({
  genAI: {
    models: {
      generateContent: mockGenerateContent,
    },
  },
}));

// Mock storage
vi.mock('../storage', () => ({
  storage: mockStorage,
}));

// Mock global fetch
vi.stubGlobal('fetch', mockFetch);

// Import the service after mocks are set up
import {
  analyzeProductImage,
  analyzeArbitraryImage,
  getCachedAnalysis,
  invalidateAnalysisCache,
  generateImageFingerprint,
  type VisionAnalysisResult,
} from '../services/visionAnalysisService';
import type { Product, ProductAnalysis } from '@shared/schema';

describe('VisionAnalysisService', () => {
  // Test fixtures
  const mockProduct: Product = {
    id: 'product-123',
    name: 'Oak Hardwood Flooring',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/v1234/flooring.jpg',
    cloudinaryPublicId: 'demo/flooring',
    category: 'flooring',
    description: null,
    features: null,
    benefits: null,
    specifications: null,
    tags: [],
    sku: null,
    enrichmentStatus: 'pending',
    enrichmentDraft: null,
    enrichmentVerifiedAt: null,
    enrichmentSource: null,
    createdAt: new Date(),
  };

  const mockCachedAnalysis: ProductAnalysis = {
    id: 'analysis-123',
    productId: 'product-123',
    imageFingerprint: 'demo/flooring',
    category: 'flooring',
    subcategory: 'hardwood',
    materials: ['oak', 'wood'],
    colors: ['natural oak', 'golden'],
    style: 'traditional',
    usageContext: 'residential living room',
    targetDemographic: 'homeowners',
    detectedText: null,
    confidence: 92,
    modelVersion: 'gemini-3-pro-preview',
    analyzedAt: new Date(),
    createdAt: new Date(),
  };

  const mockVisionResponse = {
    text: JSON.stringify({
      category: 'flooring',
      subcategory: 'hardwood',
      materials: ['oak', 'wood'],
      colors: ['natural oak', 'golden brown'],
      style: 'traditional',
      usageContext: 'residential living room',
      targetDemographic: 'homeowners',
      detectedText: null,
      confidence: 88,
    }),
  };

  const mockImageBuffer = Buffer.from('fake-image-data');

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset default mock implementations
    mockFetch.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(mockImageBuffer),
    });

    mockGenerateContent.mockResolvedValue(mockVisionResponse);
    mockStorage.getProductAnalysisByProductId.mockResolvedValue(null);
    mockStorage.saveProductAnalysis.mockResolvedValue(mockCachedAnalysis);
    mockStorage.updateProductAnalysis.mockResolvedValue(mockCachedAnalysis);
  });

  afterEach(() => {
    vi.resetModules();
  });

  // ============================================
  // generateImageFingerprint Tests
  // ============================================
  describe('generateImageFingerprint', () => {
    it('generates fingerprint from cloudinaryPublicId', () => {
      const fingerprint = generateImageFingerprint(mockProduct);
      expect(fingerprint).toBe('demo/flooring');
    });

    it('handles different cloudinaryPublicIds', () => {
      const product = {
        ...mockProduct,
        cloudinaryPublicId: 'folder/subfolder/image_v2',
      };
      const fingerprint = generateImageFingerprint(product);
      expect(fingerprint).toBe('folder/subfolder/image_v2');
    });

    it('handles empty cloudinaryPublicId', () => {
      const product = {
        ...mockProduct,
        cloudinaryPublicId: '',
      };
      const fingerprint = generateImageFingerprint(product);
      expect(fingerprint).toBe('');
    });
  });

  // ============================================
  // analyzeProductImage Tests
  // ============================================
  describe('analyzeProductImage', () => {
    describe('Rate Limiting', () => {
      it('allows requests under the rate limit', async () => {
        const userId = 'user-rate-test-1';
        const result = await analyzeProductImage(mockProduct, userId);
        expect(result.success).toBe(true);
      });

      it('blocks requests exceeding rate limit (10 per minute)', async () => {
        const userId = 'user-rate-limit-exceeded';

        // Make 10 successful requests
        for (let i = 0; i < 10; i++) {
          await analyzeProductImage(mockProduct, userId);
        }

        // 11th request should be rate limited
        const result = await analyzeProductImage(mockProduct, userId);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('RATE_LIMITED');
          expect(result.error.message).toContain('Too many analysis requests');
        }
      });

      it('allows requests from different users independently', async () => {
        const userId1 = 'user-independent-1';
        const userId2 = 'user-independent-2';

        // Make 10 requests for user 1
        for (let i = 0; i < 10; i++) {
          await analyzeProductImage(mockProduct, userId1);
        }

        // User 2 should still be able to make requests
        const result = await analyzeProductImage(mockProduct, userId2);
        expect(result.success).toBe(true);
      });
    });

    describe('Cache Hit Path', () => {
      it('returns cached analysis when fingerprint matches', async () => {
        mockStorage.getProductAnalysisByProductId.mockResolvedValue(mockCachedAnalysis);

        const result = await analyzeProductImage(mockProduct, 'user-cache-hit');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.analysis.category).toBe('flooring');
          expect(result.analysis.subcategory).toBe('hardwood');
          expect(result.analysis.confidence).toBe(92);
        }

        // Should not call Gemini API
        expect(mockGenerateContent).not.toHaveBeenCalled();
      });

      it('skips cache and calls API when forceRefresh is true', async () => {
        mockStorage.getProductAnalysisByProductId.mockResolvedValue(mockCachedAnalysis);

        const result = await analyzeProductImage(mockProduct, 'user-force-refresh', true);

        expect(result.success).toBe(true);
        expect(mockGenerateContent).toHaveBeenCalled();
      });

      it('calls API when cache fingerprint does not match', async () => {
        const outdatedCache = {
          ...mockCachedAnalysis,
          imageFingerprint: 'old/fingerprint',
        };
        mockStorage.getProductAnalysisByProductId.mockResolvedValue(outdatedCache);

        const result = await analyzeProductImage(mockProduct, 'user-fingerprint-mismatch');

        expect(result.success).toBe(true);
        expect(mockGenerateContent).toHaveBeenCalled();
      });
    });

    describe('Cache Miss Path', () => {
      it('calls Gemini API on cache miss', async () => {
        // Both calls return null - initial cache check and upsert check
        mockStorage.getProductAnalysisByProductId
          .mockResolvedValueOnce(null) // Initial cache check
          .mockResolvedValueOnce(null); // Upsert check

        const result = await analyzeProductImage(mockProduct, 'user-cache-miss');

        expect(result.success).toBe(true);
        expect(mockGenerateContent).toHaveBeenCalled();
        expect(mockFetch).toHaveBeenCalled();
      });

      it('saves analysis to cache after API call', async () => {
        // Both calls return null - initial cache check and upsert check
        mockStorage.getProductAnalysisByProductId
          .mockResolvedValueOnce(null) // Initial cache check
          .mockResolvedValueOnce(null); // Upsert check - no existing, so save

        await analyzeProductImage(mockProduct, 'user-save-cache');

        expect(mockStorage.saveProductAnalysis).toHaveBeenCalledWith(
          expect.objectContaining({
            productId: 'product-123',
            imageFingerprint: 'demo/flooring',
            category: 'flooring',
          }),
        );
      });

      it('updates existing cache entry on refresh', async () => {
        // With forceRefresh=true, it skips the initial cache check
        // After API call, it checks for existing entry (line 145) and finds one
        mockStorage.getProductAnalysisByProductId.mockResolvedValue(mockCachedAnalysis);

        await analyzeProductImage(mockProduct, 'user-update-cache', true);

        // Should update, not create (because existing entry was found)
        expect(mockStorage.updateProductAnalysis).toHaveBeenCalled();
      });
    });

    describe('API Response Handling', () => {
      it('parses JSON response from Gemini', async () => {
        // Both cache checks return null to ensure API is called
        mockStorage.getProductAnalysisByProductId.mockResolvedValue(null);

        const result = await analyzeProductImage(mockProduct, 'user-json-parse');

        expect(result.success).toBe(true);
        if (result.success) {
          // These should match the mockVisionResponse values
          expect(result.analysis.category).toBe('flooring');
          expect(result.analysis.materials).toEqual(['oak', 'wood']);
          expect(result.analysis.colors).toEqual(['natural oak', 'golden brown']);
        }
      });

      it('handles JSON embedded in text response', async () => {
        mockGenerateContent.mockResolvedValue({
          text:
            'Here is the analysis:\n' +
            JSON.stringify({
              category: 'furniture',
              subcategory: 'chair',
              materials: ['metal'],
              colors: ['black'],
              style: 'modern',
              usageContext: 'office',
              targetDemographic: 'professionals',
              detectedText: null,
              confidence: 75,
            }) +
            '\nThank you!',
        });

        const result = await analyzeProductImage(mockProduct, 'user-embedded-json');

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.analysis.category).toBe('furniture');
        }
      });

      it('returns API_ERROR when response has no JSON', async () => {
        mockGenerateContent.mockResolvedValue({
          text: 'I cannot analyze this image.',
        });

        const result = await analyzeProductImage(mockProduct, 'user-no-json');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('API_ERROR');
          expect(result.error.message).toContain('parse');
        }
      });

      it('sanitizes string fields from response', async () => {
        mockGenerateContent.mockResolvedValue({
          text: JSON.stringify({
            category: '<script>alert("xss")</script>flooring',
            subcategory: 'hardwood\nwith\nnewlines',
            materials: ['oak', '<b>metal</b>'],
            colors: ['red'],
            style: 'modern',
            usageContext: 'home',
            targetDemographic: 'homeowners',
            detectedText: null,
            confidence: 80,
          }),
        });

        const result = await analyzeProductImage(mockProduct, 'user-sanitize');

        expect(result.success).toBe(true);
        if (result.success) {
          // sanitizeOutputString strips <> characters but does NOT strip newlines
          expect(result.analysis.category).not.toContain('<script>');
          expect(result.analysis.category).not.toContain('<');
          expect(result.analysis.category).not.toContain('>');
          // Materials should also have angle brackets stripped
          expect(result.analysis.materials).not.toContain('<b>metal</b>');
        }
      });

      it('returns error when confidence exceeds valid range 0-100', async () => {
        mockGenerateContent.mockResolvedValue({
          text: JSON.stringify({
            category: 'flooring',
            subcategory: 'tile',
            materials: [],
            colors: [],
            style: 'modern',
            usageContext: '',
            targetDemographic: '',
            detectedText: null,
            confidence: 150,
          }),
        });

        const result = await analyzeProductImage(mockProduct, 'user-confidence-clamp');

        // Zod schema rejects confidence > 100 (z.number().min(0).max(100)),
        // causing safeParseLLMResponse to throw, which returns API_ERROR
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('API_ERROR');
        }
      });

      it('returns error when confidence is not a number', async () => {
        mockGenerateContent.mockResolvedValue({
          text: JSON.stringify({
            category: 'flooring',
            subcategory: 'tile',
            materials: [],
            colors: [],
            style: 'modern',
            usageContext: '',
            targetDemographic: '',
            detectedText: null,
            confidence: 'high',
          }),
        });

        const result = await analyzeProductImage(mockProduct, 'user-confidence-default');

        // Zod schema expects z.number() for confidence, 'high' (string) fails validation
        // safeParseLLMResponse throws, which returns API_ERROR
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('API_ERROR');
        }
      });
    });

    describe('URL Normalization (Shopify {width} placeholder)', () => {
      it('normalizes Shopify URLs with {width} placeholder', async () => {
        const shopifyProduct = {
          ...mockProduct,
          cloudinaryUrl: 'https://cdn.shopify.com/image_{width}x.jpg',
        };
        mockStorage.getProductAnalysisByProductId.mockResolvedValue(null);

        await analyzeProductImage(shopifyProduct, 'user-shopify');

        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('image_800x.jpg'));
        expect(mockFetch).not.toHaveBeenCalledWith(expect.stringContaining('{width}'));
      });

      it('leaves non-Shopify URLs unchanged', async () => {
        mockStorage.getProductAnalysisByProductId.mockResolvedValue(null);

        await analyzeProductImage(mockProduct, 'user-cloudinary');

        expect(mockFetch).toHaveBeenCalledWith(mockProduct.cloudinaryUrl);
      });
    });

    describe('Error Handling', () => {
      it('returns API_ERROR when fetch fails', async () => {
        mockFetch.mockResolvedValue({
          ok: false,
          status: 404,
        });

        const result = await analyzeProductImage(mockProduct, 'user-fetch-fail');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('API_ERROR');
          expect(result.error.message).toContain('Failed to fetch image');
        }
      });

      it('returns API_ERROR when Gemini API throws', async () => {
        mockGenerateContent.mockRejectedValue(new Error('Gemini quota exceeded'));

        const result = await analyzeProductImage(mockProduct, 'user-gemini-error');

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error.code).toBe('API_ERROR');
          expect(result.error.message).toContain('Gemini quota exceeded');
        }
      });

      it('continues to API call when cache lookup fails', async () => {
        // First cache lookup fails (line 101), but code continues
        // Second cache lookup (line 145) should succeed to save the analysis
        mockStorage.getProductAnalysisByProductId
          .mockRejectedValueOnce(new Error('Database connection failed')) // Initial cache check fails
          .mockResolvedValueOnce(null); // Upsert check succeeds - no existing entry

        const result = await analyzeProductImage(mockProduct, 'user-cache-error');

        expect(result.success).toBe(true);
        expect(mockGenerateContent).toHaveBeenCalled();
      });
    });
  });

  // ============================================
  // analyzeArbitraryImage Tests
  // ============================================
  describe('analyzeArbitraryImage', () => {
    const testBuffer = Buffer.from('test-image-data');
    const testMimeType = 'image/jpeg';

    it('analyzes arbitrary image buffer', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          description: 'A modern kitchen with white marble countertops',
          confidence: 85,
        }),
      });

      const result = await analyzeArbitraryImage(testBuffer, testMimeType, 'user-arbitrary-1');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.description).toContain('kitchen');
        expect(result.analysis.confidence).toBe(85);
      }
    });

    it('rate limits arbitrary image analysis', async () => {
      const userId = 'user-arbitrary-rate-limit';

      // Use up rate limit with product analysis
      for (let i = 0; i < 10; i++) {
        await analyzeProductImage(mockProduct, userId);
      }

      // Arbitrary image should also be rate limited
      const result = await analyzeArbitraryImage(testBuffer, testMimeType, userId);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('RATE_LIMITED');
      }
    });

    it('does NOT cache arbitrary image results', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          description: 'A test image',
          confidence: 70,
        }),
      });

      await analyzeArbitraryImage(testBuffer, testMimeType, 'user-no-cache');

      // Should not call storage methods
      expect(mockStorage.saveProductAnalysis).not.toHaveBeenCalled();
      expect(mockStorage.updateProductAnalysis).not.toHaveBeenCalled();
    });

    it('handles missing mime type', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          description: 'Test image',
          confidence: 70,
        }),
      });

      const result = await analyzeArbitraryImage(testBuffer, '', 'user-no-mime');

      expect(result.success).toBe(true);
    });

    it('returns API_ERROR when analysis fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Analysis failed'));

      const result = await analyzeArbitraryImage(testBuffer, testMimeType, 'user-arbitrary-error');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('API_ERROR');
        expect(result.error.message).toContain('Analysis failed');
      }
    });

    it('sanitizes description from response', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          description: '<script>malicious</script>A clean description\nwith newlines',
          confidence: 80,
        }),
      });

      const result = await analyzeArbitraryImage(testBuffer, testMimeType, 'user-sanitize-arbitrary');

      expect(result.success).toBe(true);
      if (result.success) {
        // sanitizeOutputString strips <> characters but does NOT strip newlines
        expect(result.analysis.description).not.toContain('<script>');
        expect(result.analysis.description).not.toContain('<');
        expect(result.analysis.description).not.toContain('>');
      }
    });
  });

  // ============================================
  // getCachedAnalysis Tests
  // ============================================
  describe('getCachedAnalysis', () => {
    it('returns cached analysis when available', async () => {
      mockStorage.getProductAnalysisByProductId.mockResolvedValue(mockCachedAnalysis);

      const result = await getCachedAnalysis('product-123');

      expect(result).not.toBeNull();
      expect(result?.category).toBe('flooring');
      expect(result?.confidence).toBe(92);
    });

    it('returns null when no cached analysis exists', async () => {
      mockStorage.getProductAnalysisByProductId.mockResolvedValue(null);

      const result = await getCachedAnalysis('product-not-found');

      expect(result).toBeNull();
    });

    it('returns null when storage lookup fails', async () => {
      mockStorage.getProductAnalysisByProductId.mockRejectedValue(new Error('DB error'));

      const result = await getCachedAnalysis('product-error');

      expect(result).toBeNull();
    });
  });

  // ============================================
  // invalidateAnalysisCache Tests
  // ============================================
  describe('invalidateAnalysisCache', () => {
    it('deletes cached analysis for product', async () => {
      mockStorage.deleteProductAnalysis.mockResolvedValue(undefined);

      await invalidateAnalysisCache('product-123');

      expect(mockStorage.deleteProductAnalysis).toHaveBeenCalledWith('product-123');
    });

    it('does not throw when delete fails', async () => {
      mockStorage.deleteProductAnalysis.mockRejectedValue(new Error('Delete failed'));

      // Should not throw
      await expect(invalidateAnalysisCache('product-error')).resolves.toBeUndefined();
    });

    it('handles non-existent product gracefully', async () => {
      mockStorage.deleteProductAnalysis.mockResolvedValue(undefined);

      await expect(invalidateAnalysisCache('non-existent')).resolves.toBeUndefined();
    });
  });

  // ============================================
  // Edge Cases and Integration Scenarios
  // ============================================
  describe('Edge Cases', () => {
    it('handles product with special characters in name', async () => {
      const specialProduct = {
        ...mockProduct,
        name: 'Oak & Pine "Premium" Flooring <Special>',
      };
      mockStorage.getProductAnalysisByProductId.mockResolvedValue(null);

      const result = await analyzeProductImage(specialProduct, 'user-special-chars');

      expect(result.success).toBe(true);
    });

    it('handles empty materials and colors arrays', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          category: 'unknown',
          subcategory: 'unknown',
          materials: [],
          colors: [],
          style: 'unknown',
          usageContext: '',
          targetDemographic: '',
          detectedText: null,
          confidence: 30,
        }),
      });

      const result = await analyzeProductImage(mockProduct, 'user-empty-arrays');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.materials).toEqual([]);
        expect(result.analysis.colors).toEqual([]);
      }
    });

    it('handles non-array materials in response', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          category: 'flooring',
          subcategory: 'tile',
          materials: 'ceramic', // Should be array — Zod rejects this
          colors: null, // Should be array — Zod rejects this
          style: 'modern',
          usageContext: '',
          targetDemographic: '',
          detectedText: null,
          confidence: 50,
        }),
      });

      const result = await analyzeProductImage(mockProduct, 'user-non-array');

      // Zod schema expects z.array(z.string()) for materials/colors.
      // A string ('ceramic') and null both fail validation, causing API_ERROR.
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('API_ERROR');
      }
    });

    it('preserves detectedText when present', async () => {
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          category: 'product',
          subcategory: 'box',
          materials: ['cardboard'],
          colors: ['brown'],
          style: 'industrial',
          usageContext: 'shipping',
          targetDemographic: 'businesses',
          detectedText: 'FRAGILE - Handle With Care',
          confidence: 95,
        }),
      });

      const result = await analyzeProductImage(mockProduct, 'user-detected-text');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.detectedText).toBe('FRAGILE - Handle With Care');
      }
    });

    it('handles very long response strings by truncating', async () => {
      const longString = 'A'.repeat(1000);
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          category: longString,
          subcategory: 'test',
          materials: [],
          colors: [],
          style: 'test',
          usageContext: '',
          targetDemographic: '',
          detectedText: null,
          confidence: 50,
        }),
      });

      const result = await analyzeProductImage(mockProduct, 'user-long-string');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.analysis.category.length).toBeLessThanOrEqual(500);
      }
    });
  });
});
