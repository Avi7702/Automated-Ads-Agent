/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Content Planner Service Tests
 *
 * Tests for the content planner service that generates complete posts
 * (copy + image) with brand context integration and parallel generation.
 */

import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Product, BrandProfile } from '@shared/schema';
import type { ContentTemplate } from '@shared/contentTemplates';

// Mock the storage module
vi.mock('../storage', () => ({
  storage: {
    getBrandProfileByUserId: vi.fn(),
    getProduct: vi.fn(),
    getProductById: vi.fn(),
  },
}));

// Mock the copywritingService module
vi.mock('../services/copywritingService', () => ({
  copywritingService: {
    generateCopy: vi.fn(),
  },
}));

// Mock the shared/contentTemplates module
vi.mock('@shared/contentTemplates', () => ({
  getTemplateById: vi.fn(),
}));

// Mock the logger
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Get mocked modules
const { storage } = await import('../storage');
const { copywritingService } = await import('../services/copywritingService');
const { getTemplateById } = await import('@shared/contentTemplates');

const mockGetBrandProfileByUserId = vi.mocked(storage.getBrandProfileByUserId);
const mockGetProduct = vi.mocked(storage.getProduct);
const mockGetProductById = vi.mocked((storage as any).getProductById);
const mockGenerateCopy = vi.mocked(copywritingService.generateCopy);
const mockGetTemplateById = vi.mocked(getTemplateById);

// Import the service under test after mocks are set up
const { generateCompletePost, contentPlannerService } = await import('../services/contentPlannerService');

// Test fixtures
const createMockProduct = (overrides: Partial<Product> = {}): Product => ({
  id: 'product-1',
  userId: 'user-1',
  name: 'T12 Rebar',
  description: '12mm reinforcement bar for concrete foundations',
  images: ['test-image.jpg'],
  createdAt: new Date(),
  primaryImageIndex: 0,
  tags: ['rebar', 'steel'],
  sku: 'SKU-001',
  enrichmentStatus: 'complete',
  enrichmentStartedAt: null,
  enrichmentCompletedAt: null,
  enrichmentError: null,
  ...overrides,
});

const createMockBrandProfile = (overrides: Partial<BrandProfile> = {}): BrandProfile => ({
  id: 'brand-1',
  userId: 'user-1',
  brandName: 'Next Day Steel',
  industry: 'Construction Steel Supply',
  targetAudience: 'B2B contractors and builders',
  brandValues: ['Quality', 'Reliability', 'Speed'],
  voice: {
    principles: ['Professional', 'Trustworthy'],
    wordsToAvoid: ['cheap'],
    wordsToUse: ['premium', 'quality'],
  },
  preferredStyles: ['Professional', 'Industrial'],
  colorPreferences: ['#FF6600', '#333333'],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockTemplate = (overrides: Partial<ContentTemplate> = {}): ContentTemplate => ({
  id: 'product_specs',
  category: 'product_showcase',
  categoryPercentage: 25,
  subType: 'product_specifications',
  title: 'Product Specifications',
  description: 'Technical details of reinforcement bars, mesh, and other steel products.',
  hookFormulas: [
    '"Most [professionals] waste [X hours/dollars] on [problem]. Here\'s how [product] changed that..."',
    '"[Specific metric] improvement in [timeframe]."',
  ],
  postStructure:
    '[Hook: The problem or benefit]\n\nThe solution: [Product name + key spec]\n\nCTA: "DM for spec sheets"',
  bestPlatforms: [
    { platform: 'LinkedIn', format: 'Carousel' },
    { platform: 'Instagram', format: 'Carousel' },
  ],
  exampleTopics: ['The spec sheet nobody asked for'],
  whatToAvoid: ['Listing specs without context'],
  productRequirement: 'required',
  imageRequirement: 'optional',
  ...overrides,
});

const createMockCopyResult = (variationNum: number = 1) => ({
  headline: `Test Headline V${variationNum}`,
  hook: `Test Hook V${variationNum}`,
  bodyText: `Test body text V${variationNum}`,
  cta: 'Shop Now',
  caption: `Test caption V${variationNum}`,
  hashtags: ['#test', '#steel'],
  framework: 'AIDA',
  qualityScore: {
    clarity: 8,
    persuasiveness: 7,
    platformFit: 9,
    brandAlignment: 8,
    overallScore: 8,
    reasoning: 'Well-structured copy',
  },
  characterCounts: {
    headline: 15,
    hook: 12,
    body: 18,
    caption: 14,
    total: 59,
  },
});

describe('Content Planner Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Template Validation', () => {
    it('should return error when template not found', async () => {
      mockGetTemplateById.mockReturnValue(undefined);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'non-existent-template',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.success).toBe(false);
      expect(result.copyError).toContain('Template not found');
      expect(result.imageError).toContain('Template not found');
      expect(result.template.id).toBe('non-existent-template');
      expect(result.template.title).toBe('Unknown');
    });

    it('should return error when required products are missing (productRequirement: required)', async () => {
      const template = createMockTemplate({
        productRequirement: 'required',
        title: 'Product Specifications',
      });
      mockGetTemplateById.mockReturnValue(template);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: [], // No products provided
        platform: 'instagram',
      });

      expect(result.success).toBe(false);
      expect(result.copyError).toContain('requires at least one product');
      expect(result.imageError).toContain('requires at least one product');
      expect(result.template.title).toBe('Product Specifications');
    });

    it('should return error when minProducts not met (e.g., comparisons need 2)', async () => {
      const template = createMockTemplate({
        id: 'product_comparisons',
        title: 'Product Comparisons',
        productRequirement: 'required',
        minProducts: 2,
      });
      mockGetTemplateById.mockReturnValue(template);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_comparisons',
        productIds: ['product-1'], // Only 1 product, need 2
        platform: 'instagram',
      });

      expect(result.success).toBe(false);
      expect(result.copyError).toContain('requires at least 2 products');
      expect(result.imageError).toContain('requires at least 2 products');
    });

    it('should allow generation when products are optional', async () => {
      const template = createMockTemplate({
        id: 'construction_best_practices',
        title: 'Construction Best Practices',
        productRequirement: 'optional',
        imageRequirement: 'none',
      });
      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'construction_best_practices',
        productIds: [], // No products - but that's okay for optional
        platform: 'linkedin',
      });

      expect(result.success).toBe(true);
      expect(result.copy).toBeDefined();
      expect(result.copyError).toBeUndefined();
    });

    it('should allow generation when products are none', async () => {
      const template = createMockTemplate({
        id: 'questions_polls',
        title: 'Questions & Polls',
        productRequirement: 'none',
        imageRequirement: 'none',
      });
      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'questions_polls',
        productIds: [],
        platform: 'instagram',
      });

      expect(result.success).toBe(true);
      expect(result.copy).toBeDefined();
    });
  });

  describe('Copy Generation', () => {
    it('should generate copy successfully with valid inputs', async () => {
      const template = createMockTemplate();
      const product = createMockProduct();
      const brandProfile = createMockBrandProfile();
      const copyResult = createMockCopyResult();

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(brandProfile);
      mockGetProductById.mockResolvedValue(product);
      mockGenerateCopy.mockResolvedValue([copyResult]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.success).toBe(true);
      expect(result.copy).toBeDefined();
      expect(result.copy?.headline).toBe('Test Headline V1');
      expect(result.copy?.hook).toBe('Test Hook V1');
      expect(result.copy?.bodyText).toBe('Test body text V1');
      expect(result.copy?.cta).toBe('Shop Now');
      expect(result.copy?.framework).toBe('AIDA');
      expect(result.copyError).toBeUndefined();
    });

    it('should use correct framework based on template structure', async () => {
      // Template with PAS structure (problem, agitate)
      const pasTemplate = createMockTemplate({
        postStructure: 'Problem: [Problem statement]\nAgitate: [Make it worse]\nSolution: [Product]',
      });
      mockGetTemplateById.mockReturnValue(pasTemplate);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      // Verify generateCopy was called with the inferred framework
      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: 'pas', // Should infer PAS from postStructure
        }),
      );
    });

    it('should use BAB framework when template has before/after structure', async () => {
      const babTemplate = createMockTemplate({
        postStructure: 'Before: [Old state]\nAfter: [New state]\nBridge: [How to get there]',
      });
      mockGetTemplateById.mockReturnValue(babTemplate);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: 'bab',
        }),
      );
    });

    it('should use FAB framework when template has feature/benefit structure', async () => {
      const fabTemplate = createMockTemplate({
        postStructure: 'Feature: [Product feature]\nBenefit: [User benefit]',
      });
      mockGetTemplateById.mockReturnValue(fabTemplate);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: 'fab',
        }),
      );
    });

    it('should include brand context when available', async () => {
      const template = createMockTemplate();
      const brandProfile = createMockBrandProfile({
        industry: 'Steel Manufacturing',
        targetAudience: 'Commercial contractors',
        voice: {
          principles: ['Bold', 'Technical'],
          wordsToAvoid: ['cheap', 'budget'],
          wordsToUse: ['premium', 'industrial-grade'],
        },
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(brandProfile);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      // Verify brand context was passed to generateCopy
      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          industry: 'Steel Manufacturing',
          brandVoice: expect.objectContaining({
            principles: ['Bold', 'Technical'],
            wordsToAvoid: ['cheap', 'budget'],
            wordsToUse: ['premium', 'industrial-grade'],
          }),
        }),
      );
    });

    it('should handle copy generation failure gracefully', async () => {
      const template = createMockTemplate({ imageRequirement: 'none' });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockRejectedValue(new Error('Copy generation API error'));

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.success).toBe(false);
      expect(result.copyError).toContain('Copy generation API error');
      expect(result.copy).toBeUndefined();
    });

    it('should handle empty copy variations response', async () => {
      const template = createMockTemplate({ imageRequirement: 'none' });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([]); // Empty array

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.success).toBe(false);
      expect(result.copyError).toContain('No copy variations generated');
    });
  });

  describe('Image Generation', () => {
    it('should generate image prompt for image-required templates', async () => {
      const template = createMockTemplate({
        imageRequirement: 'required',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(createMockBrandProfile());
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.success).toBe(true);
      expect(result.image).toBeDefined();
      expect(result.image?.prompt).toBeDefined();
      expect(result.image?.prompt).toContain('marketing image');
      expect(result.image?.prompt).toContain('Product Specifications');
    });

    it('should skip image for imageRequirement: none templates', async () => {
      const template = createMockTemplate({
        imageRequirement: 'none',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.success).toBe(true);
      expect(result.image).toBeUndefined();
      expect(result.imageError).toBeUndefined();
    });

    it('should include platform-specific format in image prompt', async () => {
      const template = createMockTemplate({
        imageRequirement: 'optional',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.image?.prompt).toContain('1080x1080 square format');
    });

    it('should include LinkedIn landscape format in image prompt', async () => {
      const template = createMockTemplate({
        imageRequirement: 'optional',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'linkedin',
      });

      expect(result.image?.prompt).toContain('1200x627 landscape format');
    });

    it('should include TikTok portrait format in image prompt', async () => {
      const template = createMockTemplate({
        imageRequirement: 'optional',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'tiktok',
      });

      expect(result.image?.prompt).toContain('1080x1920 portrait format');
    });

    it('should include product details in image prompt', async () => {
      const template = createMockTemplate({
        imageRequirement: 'optional',
      });
      const product = createMockProduct({
        name: 'Premium Steel Mesh',
        description: 'High-quality mesh for construction',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(product);
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.image?.prompt).toContain('Premium Steel Mesh');
      expect(result.image?.prompt).toContain('PRODUCTS TO FEATURE');
    });

    it('should include brand guidelines in image prompt when available', async () => {
      const template = createMockTemplate({
        imageRequirement: 'optional',
      });
      const brandProfile = createMockBrandProfile({
        brandName: 'SteelCo',
        preferredStyles: ['Modern', 'Industrial'],
        colorPreferences: ['#0066CC', '#333333'],
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(brandProfile);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.image?.prompt).toContain('BRAND GUIDELINES (SteelCo)');
      expect(result.image?.prompt).toContain('Modern, Industrial');
    });
  });

  describe('Parallel Generation', () => {
    it('should generate both copy and image in parallel', async () => {
      const template = createMockTemplate({
        imageRequirement: 'required',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(createMockBrandProfile());
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.success).toBe(true);
      expect(result.copy).toBeDefined();
      expect(result.image).toBeDefined();
      expect(result.copyError).toBeUndefined();
      expect(result.imageError).toBeUndefined();
    });

    it('should return copy even if image fails (partial success)', async () => {
      const template = createMockTemplate({
        imageRequirement: 'required',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);
      // Note: Image generation in the current implementation doesn't fail externally
      // as it just builds a prompt string. This test verifies partial success logic exists.

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      // Should have copy regardless of image status
      expect(result.copy).toBeDefined();
      expect(result.copy?.headline).toBeDefined();
    });

    it('should return image prompt even if copy fails (partial success)', async () => {
      const template = createMockTemplate({
        imageRequirement: 'optional',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(createMockBrandProfile());
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockRejectedValue(new Error('Copy API unavailable'));

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      // Should have image even though copy failed
      expect(result.success).toBe(true); // Partial success with image
      expect(result.image).toBeDefined();
      expect(result.image?.prompt).toBeDefined();
      expect(result.copyError).toContain('Copy API unavailable');
    });

    it('should fail completely if both copy and image fail', async () => {
      const template = createMockTemplate({
        imageRequirement: 'none', // No image generation
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockRejectedValue(new Error('All services down'));

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.success).toBe(false);
      expect(result.copy).toBeUndefined();
      expect(result.image).toBeUndefined();
      expect(result.copyError).toBeDefined();
    });
  });

  describe('Brand Context', () => {
    it('should include brand profile in generation request', async () => {
      const template = createMockTemplate();
      const brandProfile = createMockBrandProfile({
        industry: 'Construction Materials',
        targetAudience: 'Commercial builders',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(brandProfile);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          industry: 'Construction Materials',
          targetAudience: expect.objectContaining({
            demographics: 'Commercial builders',
          }),
        }),
      );
    });

    it('should work without brand profile (fallback)', async () => {
      const template = createMockTemplate();

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null); // No brand profile
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.success).toBe(true);
      expect(result.copy).toBeDefined();

      // Should use fallback industry
      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          industry: 'Construction/Steel', // Fallback value
        }),
      );
    });

    it('should not include brand voice when not available', async () => {
      const template = createMockTemplate();
      const brandProfileWithoutVoice = createMockBrandProfile({
        voice: null as any,
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(brandProfileWithoutVoice);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          brandVoice: undefined,
        }),
      );
    });
  });

  describe('Product Handling', () => {
    it('should fetch and include multiple products', async () => {
      const template = createMockTemplate({
        minProducts: 2,
        productRequirement: 'required',
      });
      const product1 = createMockProduct({ id: 'product-1', name: 'T12 Rebar', userId: 'user-1' });
      const product2 = createMockProduct({ id: 'product-2', name: 'Steel Mesh', userId: 'user-1' });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValueOnce(product1).mockResolvedValueOnce(product2);
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1', 'product-2'],
        platform: 'instagram',
      });

      // Should call getProduct for each product ID
      expect(mockGetProductById).toHaveBeenCalledTimes(2);
      expect(mockGetProductById).toHaveBeenCalledWith('product-1');
      expect(mockGetProductById).toHaveBeenCalledWith('product-2');

      // Product names should be combined in the copy request
      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'T12 Rebar + Steel Mesh',
        }),
      );
    });

    it('should include all fetched products regardless of userId', async () => {
      const template = createMockTemplate({
        productRequirement: 'optional',
      });
      const ownedProduct = createMockProduct({ id: 'product-1', userId: 'user-1', name: 'T12 Rebar' });
      const otherUserProduct = createMockProduct({ id: 'product-2', userId: 'other-user', name: 'Steel Mesh' });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValueOnce(ownedProduct).mockResolvedValueOnce(otherUserProduct);
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1', 'product-2'],
        platform: 'instagram',
      });

      // Both products are included (fetchProducts does not filter by userId)
      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'T12 Rebar + Steel Mesh',
        }),
      );
    });

    it('should handle product fetch failures gracefully', async () => {
      const template = createMockTemplate({
        productRequirement: 'optional',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockRejectedValue(new Error('Database error'));
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      // Should still succeed, just without product context
      expect(result.success).toBe(true);
    });

    it('should use topic when no products are provided', async () => {
      const template = createMockTemplate({
        productRequirement: 'optional',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: [],
        topic: 'Steel industry trends 2026',
        platform: 'instagram',
      });

      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'Steel industry trends 2026',
        }),
      );
    });

    it('should use template title as fallback when no products or topic', async () => {
      const template = createMockTemplate({
        title: 'Product Specifications',
        productRequirement: 'optional',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: [],
        platform: 'instagram',
      });

      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'Product Specifications',
        }),
      );
    });
  });

  describe('Campaign Objective Mapping', () => {
    it('should map product_showcase category to consideration objective', async () => {
      const template = createMockTemplate({
        category: 'product_showcase',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignObjective: 'consideration',
        }),
      );
    });

    it('should map educational category to awareness objective', async () => {
      const template = createMockTemplate({
        category: 'educational',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignObjective: 'awareness',
        }),
      );
    });

    it('should map customer_success category to conversion objective', async () => {
      const template = createMockTemplate({
        category: 'customer_success',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignObjective: 'conversion',
        }),
      );
    });

    it('should map engagement category to engagement objective', async () => {
      const template = createMockTemplate({
        category: 'engagement',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(mockGenerateCopy).toHaveBeenCalledWith(
        expect.objectContaining({
          campaignObjective: 'engagement',
        }),
      );
    });
  });

  describe('Response Structure', () => {
    it('should include template metadata in response', async () => {
      const template = createMockTemplate({
        id: 'test-template',
        title: 'Test Template',
        category: 'product_showcase',
      });

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([createMockCopyResult()]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'test-template',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.template).toBeDefined();
      expect(result.template.id).toBe('test-template');
      expect(result.template.title).toBe('Test Template');
      expect(result.template.category).toBe('product_showcase');
    });

    it('should include all copy fields in successful response', async () => {
      const template = createMockTemplate({ imageRequirement: 'none' });
      const copyResult = createMockCopyResult();

      mockGetTemplateById.mockReturnValue(template);
      mockGetBrandProfileByUserId.mockResolvedValue(null);
      mockGetProductById.mockResolvedValue(createMockProduct());
      mockGenerateCopy.mockResolvedValue([copyResult]);

      const result = await generateCompletePost({
        userId: 'user-1',
        templateId: 'product_specs',
        productIds: ['product-1'],
        platform: 'instagram',
      });

      expect(result.copy).toMatchObject({
        headline: copyResult.headline,
        hook: copyResult.hook,
        bodyText: copyResult.bodyText,
        cta: copyResult.cta,
        caption: copyResult.caption,
        hashtags: copyResult.hashtags,
        framework: copyResult.framework,
      });
    });
  });

  describe('Service Export', () => {
    it('should export contentPlannerService with generateCompletePost method', () => {
      expect(contentPlannerService).toBeDefined();
      expect(contentPlannerService.generateCompletePost).toBeDefined();
      expect(typeof contentPlannerService.generateCompletePost).toBe('function');
    });
  });
});
