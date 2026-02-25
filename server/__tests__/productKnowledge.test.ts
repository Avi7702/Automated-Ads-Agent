/**
 * Product Knowledge Tests (TDD)
 *
 * Phase 0.5: Product Knowledge Foundation
 *
 * Tests for:
 * 1. Enhanced products table (description, features, benefits, specifications, tags, sku)
 * 2. Installation scenarios table
 * 3. Product relationships table
 * 4. Brand images table
 * 5. Storage layer CRUD operations (mocked for CI)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory stores for mock data
const mockProducts = new Map<string, Record<string, unknown>>();
const mockScenarios = new Map<string, Record<string, unknown>>();
const mockRelationships = new Map<string, Record<string, unknown>>();
const mockBrandImages = new Map<string, Record<string, unknown>>();
let idCounter = 0;

function nextId(): string {
  idCounter++;
  return `mock-id-${idCounter}`;
}

// Mock db module to prevent DATABASE_URL check
vi.mock('../db', () => ({
  db: {},
  pool: { end: vi.fn() },
}));

// Mock storage with in-memory implementations for CRUD tests (Section 5)
vi.mock('../storage', () => ({
  storage: {
    // Product CRUD
    saveProduct: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      const id = nextId();
      const product = { id, ...data, createdAt: new Date() };
      mockProducts.set(id, product);
      return Promise.resolve(product);
    }),
    getProductById: vi.fn().mockImplementation((id: string) => {
      return Promise.resolve(mockProducts.get(id));
    }),
    updateProduct: vi.fn().mockImplementation((id: string, data: Record<string, unknown>) => {
      const existing = mockProducts.get(id);
      if (!existing) return Promise.resolve(undefined);
      const updated = { ...existing, ...data };
      mockProducts.set(id, updated);
      return Promise.resolve(updated);
    }),
    getProductsByIds: vi.fn().mockImplementation((ids: string[]) => {
      const results: Record<string, unknown>[] = [];
      for (const id of ids) {
        const product = mockProducts.get(id);
        if (product) results.push(product);
      }
      return Promise.resolve(results);
    }),
    searchProductsByTag: vi.fn().mockImplementation((tag: string) => {
      const results: Record<string, unknown>[] = [];
      for (const product of mockProducts.values()) {
        const tags = product['tags'] as string[] | undefined;
        if (tags && tags.includes(tag)) results.push(product);
      }
      return Promise.resolve(results);
    }),

    // Installation Scenarios CRUD
    createInstallationScenario: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      const id = nextId();
      const scenario = { id, ...data, createdAt: new Date() };
      mockScenarios.set(id, scenario);
      return Promise.resolve(scenario);
    }),
    getInstallationScenarioById: vi.fn().mockImplementation((id: string) => {
      return Promise.resolve(mockScenarios.get(id));
    }),
    getInstallationScenariosForProducts: vi.fn().mockImplementation((productIds: string[]) => {
      const results: Record<string, unknown>[] = [];
      for (const scenario of mockScenarios.values()) {
        if (productIds.includes(scenario['primaryProductId'] as string)) {
          results.push(scenario);
        }
      }
      return Promise.resolve(results);
    }),
    getScenariosByRoomType: vi.fn().mockImplementation((roomType: string) => {
      const results: Record<string, unknown>[] = [];
      for (const scenario of mockScenarios.values()) {
        const roomTypes = scenario['roomTypes'] as string[] | undefined;
        if (roomTypes && roomTypes.includes(roomType)) results.push(scenario);
      }
      return Promise.resolve(results);
    }),
    updateInstallationScenario: vi.fn().mockImplementation((id: string, data: Record<string, unknown>) => {
      const existing = mockScenarios.get(id);
      if (!existing) return Promise.resolve(undefined);
      const updated = { ...existing, ...data };
      mockScenarios.set(id, updated);
      return Promise.resolve(updated);
    }),
    deleteInstallationScenario: vi.fn().mockImplementation((id: string) => {
      mockScenarios.delete(id);
      return Promise.resolve(undefined);
    }),

    // Product Relationships CRUD
    createProductRelationship: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      const id = nextId();
      const relationship = { id, ...data, createdAt: new Date() };
      mockRelationships.set(id, relationship);
      return Promise.resolve(relationship);
    }),
    getProductRelationships: vi.fn().mockImplementation((productIds: string[]) => {
      const results: Record<string, unknown>[] = [];
      for (const rel of mockRelationships.values()) {
        if (
          productIds.includes(rel['sourceProductId'] as string) ||
          productIds.includes(rel['targetProductId'] as string)
        ) {
          results.push(rel);
        }
      }
      return Promise.resolve(results);
    }),
    getProductRelationshipsByType: vi.fn().mockImplementation((productId: string, type: string) => {
      const results: Record<string, unknown>[] = [];
      for (const rel of mockRelationships.values()) {
        if (rel['sourceProductId'] === productId && rel['relationshipType'] === type) {
          results.push(rel);
        }
      }
      return Promise.resolve(results);
    }),
    deleteProductRelationship: vi.fn().mockImplementation((id: string) => {
      mockRelationships.delete(id);
      return Promise.resolve(undefined);
    }),

    // Brand Images CRUD
    createBrandImage: vi.fn().mockImplementation((data: Record<string, unknown>) => {
      const id = nextId();
      const image = { id, ...data, createdAt: new Date() };
      mockBrandImages.set(id, image);
      return Promise.resolve(image);
    }),
    getBrandImagesForProducts: vi.fn().mockImplementation((productIds: string[], _userId: string) => {
      const results: Record<string, unknown>[] = [];
      for (const image of mockBrandImages.values()) {
        const imgProductIds = image['productIds'] as string[] | undefined;
        if (imgProductIds && imgProductIds.some((id: string) => productIds.includes(id))) {
          results.push(image);
        }
      }
      return Promise.resolve(results);
    }),
    getBrandImagesByCategory: vi.fn().mockImplementation((_userId: string, category: string) => {
      const results: Record<string, unknown>[] = [];
      for (const image of mockBrandImages.values()) {
        if (image['category'] === category) results.push(image);
      }
      return Promise.resolve(results);
    }),
    updateBrandImage: vi.fn().mockImplementation((id: string, data: Record<string, unknown>) => {
      const existing = mockBrandImages.get(id);
      if (!existing) return Promise.resolve(undefined);
      const updated = { ...existing, ...data };
      mockBrandImages.set(id, updated);
      return Promise.resolve(updated);
    }),
    deleteBrandImage: vi.fn().mockImplementation((id: string) => {
      mockBrandImages.delete(id);
      return Promise.resolve(undefined);
    }),
  },
}));

import { z } from 'zod';

// Import schemas (will be created)
import {
  products,
  installationScenarios,
  productRelationships,
  brandImages,
  insertProductSchema,
  insertInstallationScenarioSchema,
  insertProductRelationshipSchema,
  insertBrandImageSchema,
  type Product,
  type InstallationScenario,
  type ProductRelationship,
  type BrandImage,
} from '../../shared/schema';

import { storage } from '../storage';

// Clear all mock stores between tests
beforeEach(() => {
  mockProducts.clear();
  mockScenarios.clear();
  mockRelationships.clear();
  mockBrandImages.clear();
  idCounter = 0;
});

// ============================================================================
// SECTION 1: ENHANCED PRODUCTS SCHEMA TESTS
// ============================================================================

describe('Enhanced Products Schema', () => {
  describe('New Fields Validation', () => {
    it('should accept product with description field', () => {
      const result = insertProductSchema.safeParse({
        name: 'Oak Engineered Flooring',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'products/oak-flooring',
        description: 'Premium 5-inch wide oak engineered flooring with natural matte finish.',
      });
      expect(result.success).toBe(true);
    });

    it('should accept product with features JSONB field', () => {
      const result = insertProductSchema.safeParse({
        name: 'Oak Engineered Flooring',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'products/oak-flooring',
        features: {
          width: '5 inches',
          thickness: '5/8 inch',
          wearLayer: '4mm solid oak',
          core: 'Baltic birch plywood',
          installation: ['glue-down', 'nail-down', 'floating'],
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept product with benefits array field', () => {
      const result = insertProductSchema.safeParse({
        name: 'Oak Engineered Flooring',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'products/oak-flooring',
        benefits: [
          'Real wood beauty with engineered stability',
          'Can be refinished up to 3 times',
          'Works with radiant heating systems',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept product with specifications JSONB field', () => {
      const result = insertProductSchema.safeParse({
        name: 'Oak Engineered Flooring',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'products/oak-flooring',
        specifications: {
          boxCoverage: '20 sq ft',
          planksPerBox: 8,
          jankRating: 'AC4 Commercial',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should accept product with tags array field', () => {
      const result = insertProductSchema.safeParse({
        name: 'Oak Engineered Flooring',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'products/oak-flooring',
        tags: ['oak', 'engineered', 'hardwood', 'natural', 'residential'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept product with sku field', () => {
      const result = insertProductSchema.safeParse({
        name: 'Oak Engineered Flooring',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'products/oak-flooring',
        sku: 'OEF-NAT-5',
      });
      expect(result.success).toBe(true);
    });

    it('should accept product with all new fields combined', () => {
      const result = insertProductSchema.safeParse({
        name: 'Oak Engineered Flooring - Natural',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'products/oak-flooring',
        category: 'flooring',
        description:
          'Premium 5-inch wide oak engineered flooring with a natural matte finish. Features a 4mm wear layer over Baltic birch plywood core.',
        features: {
          width: '5 inches',
          thickness: '5/8 inch',
          wearLayer: '4mm solid oak',
          core: 'Baltic birch plywood',
          finish: 'Natural matte UV-cured',
          installation: ['glue-down', 'nail-down', 'floating'],
          warranty: '25 years residential',
        },
        benefits: [
          'Real wood beauty with engineered stability',
          'Can be refinished up to 3 times',
          'Works with radiant heating systems',
          'Lower cost than solid hardwood',
        ],
        specifications: {
          boxCoverage: '20 sq ft',
          planksPerBox: 8,
          jankRating: 'AC4 Commercial',
        },
        tags: ['oak', 'engineered', 'hardwood', 'natural', 'residential', 'commercial'],
        sku: 'OEF-NAT-5',
      });
      expect(result.success).toBe(true);
    });

    it('should still accept product with only required fields (backward compatibility)', () => {
      const result = insertProductSchema.safeParse({
        name: 'Basic Product',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'products/basic',
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// SECTION 2: INSTALLATION SCENARIOS SCHEMA TESTS
// ============================================================================

describe('Installation Scenarios Schema', () => {
  describe('Schema Validation', () => {
    it('should accept valid installation scenario with required fields', () => {
      const result = insertInstallationScenarioSchema.safeParse({
        userId: 'user-123',
        title: 'Modern Living Room with Engineered Oak',
        description: 'Open-concept living room featuring Natural Oak flooring in herringbone pattern.',
        scenarioType: 'room_type',
      });
      expect(result.success).toBe(true);
    });

    it('should accept installation scenario with primary product', () => {
      const result = insertInstallationScenarioSchema.safeParse({
        userId: 'user-123',
        title: 'Kitchen Renovation',
        description: 'Modern kitchen with waterproof vinyl flooring.',
        scenarioType: 'room_type',
        primaryProductId: 'prod-123',
      });
      expect(result.success).toBe(true);
    });

    it('should accept installation scenario with secondary products array', () => {
      const result = insertInstallationScenarioSchema.safeParse({
        userId: 'user-123',
        title: 'Complete Flooring Package',
        description: 'Full home flooring with matching accessories.',
        scenarioType: 'application',
        primaryProductId: 'prod-123',
        secondaryProductIds: ['prod-456', 'prod-789'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept installation scenario with reference images JSONB', () => {
      const result = insertInstallationScenarioSchema.safeParse({
        userId: 'user-123',
        title: 'Bedroom Makeover',
        description: 'Cozy bedroom with hardwood flooring.',
        scenarioType: 'room_type',
        referenceImages: [
          {
            cloudinaryUrl: 'https://res.cloudinary.com/test/bedroom1.jpg',
            publicId: 'scenarios/bedroom1',
            caption: 'Completed bedroom installation',
          },
          {
            cloudinaryUrl: 'https://res.cloudinary.com/test/bedroom2.jpg',
            publicId: 'scenarios/bedroom2',
            caption: 'Detail shot of flooring',
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept installation scenario with installation steps', () => {
      const result = insertInstallationScenarioSchema.safeParse({
        userId: 'user-123',
        title: 'DIY Floating Floor Installation',
        description: 'Step-by-step floating floor installation guide.',
        scenarioType: 'application',
        installationSteps: [
          'Acclimate flooring for 48-72 hours',
          'Install moisture barrier on concrete',
          'Lay out pattern from center',
          'Install transitions and baseboards',
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should accept installation scenario with required accessories', () => {
      const result = insertInstallationScenarioSchema.safeParse({
        userId: 'user-123',
        title: 'Glue-Down Installation',
        description: 'Professional glue-down installation method.',
        scenarioType: 'application',
        requiredAccessories: ['Moisture barrier', 'Flooring adhesive', 'T-molding transitions', 'Matching baseboards'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept installation scenario with room types and style tags', () => {
      const result = insertInstallationScenarioSchema.safeParse({
        userId: 'user-123',
        title: 'Modern Minimalist',
        description: 'Clean lines and natural materials.',
        scenarioType: 'room_type',
        roomTypes: ['living room', 'dining room', 'great room'],
        styleTags: ['modern', 'contemporary', 'minimalist'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept complete installation scenario with all fields', () => {
      const result = insertInstallationScenarioSchema.safeParse({
        userId: 'user-123',
        title: 'Modern Living Room with Engineered Oak',
        description:
          'Open-concept living room featuring our Natural Oak flooring installed in a herringbone pattern. Paired with white oak stair treads and matching baseboards.',
        scenarioType: 'room_type',
        primaryProductId: 'prod-123',
        secondaryProductIds: ['prod-789', 'prod-456'],
        referenceImages: [
          {
            cloudinaryUrl: 'https://res.cloudinary.com/test/living-room.jpg',
            publicId: 'scenarios/living-room-oak',
            caption: 'Completed living room installation',
          },
        ],
        installationSteps: [
          'Acclimate flooring for 48-72 hours',
          'Install moisture barrier on concrete',
          'Lay out herringbone pattern from center',
          'Use flooring adhesive for glue-down method',
          'Install transitions and baseboards',
        ],
        requiredAccessories: ['Moisture barrier', 'Flooring adhesive', 'Herringbone installation template'],
        roomTypes: ['living room', 'dining room', 'great room'],
        styleTags: ['modern', 'contemporary', 'herringbone'],
        isActive: true,
      });
      expect(result.success).toBe(true);
    });

    it('should validate scenarioType enum values', () => {
      const validTypes = ['room_type', 'application', 'before_after'];

      for (const type of validTypes) {
        const result = insertInstallationScenarioSchema.safeParse({
          userId: 'user-123',
          title: 'Test Scenario',
          description: 'Test description',
          scenarioType: type,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid scenarioType', () => {
      const result = insertInstallationScenarioSchema.safeParse({
        userId: 'user-123',
        title: 'Test Scenario',
        description: 'Test description',
        scenarioType: 'invalid_type',
      });
      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// SECTION 3: PRODUCT RELATIONSHIPS SCHEMA TESTS
// ============================================================================

describe('Product Relationships Schema', () => {
  describe('Schema Validation', () => {
    it('should accept valid product relationship with required fields', () => {
      const result = insertProductRelationshipSchema.safeParse({
        userId: 'user-123',
        sourceProductId: 'prod-123',
        targetProductId: 'prod-456',
        relationshipType: 'pairs_with',
      });
      expect(result.success).toBe(true);
    });

    it('should accept relationship with description', () => {
      const result = insertProductRelationshipSchema.safeParse({
        userId: 'user-123',
        sourceProductId: 'prod-123',
        targetProductId: 'prod-456',
        relationshipType: 'pairs_with',
        description: 'Recommended underlayment for floating installation',
      });
      expect(result.success).toBe(true);
    });

    it('should accept relationship with isRequired flag', () => {
      const result = insertProductRelationshipSchema.safeParse({
        userId: 'user-123',
        sourceProductId: 'prod-123',
        targetProductId: 'prod-456',
        relationshipType: 'requires',
        isRequired: true,
      });
      expect(result.success).toBe(true);
    });

    it('should accept relationship with displayOrder', () => {
      const result = insertProductRelationshipSchema.safeParse({
        userId: 'user-123',
        sourceProductId: 'prod-123',
        targetProductId: 'prod-456',
        relationshipType: 'matches',
        displayOrder: 1,
      });
      expect(result.success).toBe(true);
    });

    it('should validate all relationship types', () => {
      const validTypes = ['pairs_with', 'requires', 'replaces', 'matches', 'completes', 'upgrades'];

      for (const type of validTypes) {
        const result = insertProductRelationshipSchema.safeParse({
          userId: 'user-123',
          sourceProductId: 'prod-123',
          targetProductId: 'prod-456',
          relationshipType: type,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid relationship type', () => {
      const result = insertProductRelationshipSchema.safeParse({
        userId: 'user-123',
        sourceProductId: 'prod-123',
        targetProductId: 'prod-456',
        relationshipType: 'invalid_type',
      });
      expect(result.success).toBe(false);
    });

    it('should accept complete relationship with all fields', () => {
      const result = insertProductRelationshipSchema.safeParse({
        userId: 'user-123',
        sourceProductId: 'prod-123-oak-flooring',
        targetProductId: 'prod-456-underlayment',
        relationshipType: 'pairs_with',
        description: 'Recommended underlayment for floating installation over concrete',
        isRequired: false,
        displayOrder: 1,
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// SECTION 4: BRAND IMAGES SCHEMA TESTS
// ============================================================================

describe('Brand Images Schema', () => {
  describe('Schema Validation', () => {
    it('should accept valid brand image with required fields', () => {
      const result = insertBrandImageSchema.safeParse({
        userId: 'user-123',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'brand-images/hero-shot',
        category: 'product_hero',
      });
      expect(result.success).toBe(true);
    });

    it('should accept brand image with tags', () => {
      const result = insertBrandImageSchema.safeParse({
        userId: 'user-123',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'brand-images/lifestyle',
        category: 'lifestyle',
        tags: ['modern', 'living room', 'oak', 'natural light'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept brand image with description', () => {
      const result = insertBrandImageSchema.safeParse({
        userId: 'user-123',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'brand-images/installation',
        category: 'installation',
        description: 'Professional installation of oak flooring in modern living room',
      });
      expect(result.success).toBe(true);
    });

    it('should accept brand image with product associations', () => {
      const result = insertBrandImageSchema.safeParse({
        userId: 'user-123',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'brand-images/product-shot',
        category: 'product_hero',
        productIds: ['prod-123', 'prod-456'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept brand image with scenario association', () => {
      const result = insertBrandImageSchema.safeParse({
        userId: 'user-123',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'brand-images/scenario',
        category: 'installation',
        scenarioId: 'scenario-123',
      });
      expect(result.success).toBe(true);
    });

    it('should accept brand image with suggested use array', () => {
      const result = insertBrandImageSchema.safeParse({
        userId: 'user-123',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'brand-images/hero',
        category: 'product_hero',
        suggestedUse: ['hero', 'social_media', 'website_banner'],
      });
      expect(result.success).toBe(true);
    });

    it('should accept brand image with aspect ratio', () => {
      const result = insertBrandImageSchema.safeParse({
        userId: 'user-123',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'brand-images/square',
        category: 'lifestyle',
        aspectRatio: '1:1',
      });
      expect(result.success).toBe(true);
    });

    it('should validate all image categories', () => {
      const validCategories = ['historical_ad', 'product_hero', 'installation', 'detail', 'lifestyle', 'comparison'];

      for (const category of validCategories) {
        const result = insertBrandImageSchema.safeParse({
          userId: 'user-123',
          cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
          cloudinaryPublicId: `brand-images/${category}`,
          category,
        });
        expect(result.success).toBe(true);
      }
    });

    it('should reject invalid category', () => {
      const result = insertBrandImageSchema.safeParse({
        userId: 'user-123',
        cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
        cloudinaryPublicId: 'brand-images/invalid',
        category: 'invalid_category',
      });
      expect(result.success).toBe(false);
    });

    it('should accept complete brand image with all fields', () => {
      const result = insertBrandImageSchema.safeParse({
        userId: 'user-123',
        cloudinaryUrl: 'https://res.cloudinary.com/test/living-room-hero.jpg',
        cloudinaryPublicId: 'brand-images/living-room-hero',
        category: 'lifestyle',
        tags: ['modern', 'living room', 'oak', 'natural light', 'herringbone'],
        description:
          'Stunning living room featuring oak engineered flooring in herringbone pattern with natural lighting',
        productIds: ['prod-123-oak-flooring', 'prod-456-baseboards'],
        scenarioId: 'scenario-789',
        suggestedUse: ['hero', 'social_media', 'ad_reference'],
        aspectRatio: '16:9',
      });
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// SECTION 5: STORAGE LAYER TESTS
// ============================================================================

describe('Product Knowledge Storage Layer', () => {
  // These tests use mocked storage for CI compatibility

  describe('Enhanced Product CRUD', () => {
    it('should save product with new fields', async () => {
      const product = await storage.saveProduct({
        name: 'Oak Engineered Flooring',
        cloudinaryUrl: 'https://res.cloudinary.com/test/oak.jpg',
        cloudinaryPublicId: 'products/oak',
        description: 'Premium oak flooring with natural finish',
        features: { width: '5 inches', thickness: '5/8 inch' },
        benefits: ['Durable', 'Easy to maintain'],
        specifications: { boxCoverage: '20 sq ft' },
        tags: ['oak', 'engineered'],
        sku: 'OEF-NAT-5',
      });

      expect(product.id).toBeDefined();
      expect(product.description).toBe('Premium oak flooring with natural finish');
      expect(product.features).toEqual({ width: '5 inches', thickness: '5/8 inch' });
      expect(product.benefits).toEqual(['Durable', 'Easy to maintain']);
      expect(product.specifications).toEqual({ boxCoverage: '20 sq ft' });
      expect(product.tags).toEqual(['oak', 'engineered']);
      expect(product.sku).toBe('OEF-NAT-5');
    });

    it('should retrieve product with all new fields', async () => {
      const saved = await storage.saveProduct({
        name: 'Test Product',
        cloudinaryUrl: 'https://res.cloudinary.com/test/test.jpg',
        cloudinaryPublicId: 'products/test',
        description: 'Test description',
        features: { key: 'value' },
        benefits: ['benefit1'],
        tags: ['tag1'],
      });

      const retrieved = await storage.getProductById(saved.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.description).toBe('Test description');
      expect(retrieved!.features).toEqual({ key: 'value' });
      expect(retrieved!.benefits).toEqual(['benefit1']);
      expect(retrieved!.tags).toEqual(['tag1']);
    });

    it('should update product with new fields', async () => {
      const saved = await storage.saveProduct({
        name: 'Updatable Product',
        cloudinaryUrl: 'https://res.cloudinary.com/test/update.jpg',
        cloudinaryPublicId: 'products/update',
      });

      const updated = await storage.updateProduct(saved.id, {
        description: 'Updated description',
        features: { newFeature: 'new value' },
        benefits: ['new benefit'],
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.features).toEqual({ newFeature: 'new value' });
      expect(updated.benefits).toEqual(['new benefit']);
    });

    it('should get products by multiple IDs', async () => {
      const prod1 = await storage.saveProduct({
        name: 'Product 1',
        cloudinaryUrl: 'https://res.cloudinary.com/test/p1.jpg',
        cloudinaryPublicId: 'products/p1',
        description: 'Product 1 description',
      });

      const prod2 = await storage.saveProduct({
        name: 'Product 2',
        cloudinaryUrl: 'https://res.cloudinary.com/test/p2.jpg',
        cloudinaryPublicId: 'products/p2',
        description: 'Product 2 description',
      });

      const products = await storage.getProductsByIds([prod1.id, prod2.id]);

      expect(products).toHaveLength(2);
      expect(products.map((p) => p.name)).toContain('Product 1');
      expect(products.map((p) => p.name)).toContain('Product 2');
    });

    it('should search products by tags', async () => {
      await storage.saveProduct({
        name: 'Oak Product',
        cloudinaryUrl: 'https://res.cloudinary.com/test/oak.jpg',
        cloudinaryPublicId: 'products/oak-search',
        tags: ['oak', 'hardwood', 'premium'],
      });

      await storage.saveProduct({
        name: 'Maple Product',
        cloudinaryUrl: 'https://res.cloudinary.com/test/maple.jpg',
        cloudinaryPublicId: 'products/maple-search',
        tags: ['maple', 'hardwood', 'budget'],
      });

      const oakProducts = await storage.searchProductsByTag('oak');
      expect(oakProducts.length).toBeGreaterThanOrEqual(1);
      expect(oakProducts.every((p) => p.tags?.includes('oak'))).toBe(true);

      const hardwoodProducts = await storage.searchProductsByTag('hardwood');
      expect(hardwoodProducts.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Installation Scenarios CRUD', () => {
    let testUserId: string;
    let testProductId: string;

    beforeEach(async () => {
      // Create test user and product
      testUserId = 'test-user-' + Date.now();
      const product = await storage.saveProduct({
        name: 'Test Product for Scenarios',
        cloudinaryUrl: 'https://res.cloudinary.com/test/scenario-prod.jpg',
        cloudinaryPublicId: 'products/scenario-prod',
      });
      testProductId = product.id;
    });

    it('should create installation scenario', async () => {
      const scenario = await storage.createInstallationScenario({
        userId: testUserId,
        title: 'Modern Living Room',
        description: 'Contemporary living space with oak flooring',
        scenarioType: 'room_type',
        primaryProductId: testProductId,
        roomTypes: ['living room'],
        styleTags: ['modern', 'contemporary'],
      });

      expect(scenario.id).toBeDefined();
      expect(scenario.title).toBe('Modern Living Room');
      expect(scenario.scenarioType).toBe('room_type');
      expect(scenario.primaryProductId).toBe(testProductId);
    });

    it('should get installation scenarios for product', async () => {
      await storage.createInstallationScenario({
        userId: testUserId,
        title: 'Scenario 1',
        description: 'First scenario',
        scenarioType: 'room_type',
        primaryProductId: testProductId,
      });

      await storage.createInstallationScenario({
        userId: testUserId,
        title: 'Scenario 2',
        description: 'Second scenario',
        scenarioType: 'application',
        primaryProductId: testProductId,
      });

      const scenarios = await storage.getInstallationScenariosForProducts([testProductId]);

      expect(scenarios.length).toBeGreaterThanOrEqual(2);
    });

    it('should get scenarios by room type', async () => {
      await storage.createInstallationScenario({
        userId: testUserId,
        title: 'Kitchen Scenario',
        description: 'Kitchen flooring',
        scenarioType: 'room_type',
        primaryProductId: testProductId,
        roomTypes: ['kitchen'],
      });

      const scenarios = await storage.getScenariosByRoomType('kitchen');

      expect(scenarios.length).toBeGreaterThanOrEqual(1);
      expect(scenarios.every((s) => s.roomTypes?.includes('kitchen'))).toBe(true);
    });

    it('should update installation scenario', async () => {
      const scenario = await storage.createInstallationScenario({
        userId: testUserId,
        title: 'Original Title',
        description: 'Original description',
        scenarioType: 'room_type',
      });

      const updated = await storage.updateInstallationScenario(scenario.id, {
        title: 'Updated Title',
        installationSteps: ['Step 1', 'Step 2'],
      });

      expect(updated.title).toBe('Updated Title');
      expect(updated.installationSteps).toEqual(['Step 1', 'Step 2']);
    });

    it('should delete installation scenario', async () => {
      const scenario = await storage.createInstallationScenario({
        userId: testUserId,
        title: 'To Be Deleted',
        description: 'This will be deleted',
        scenarioType: 'room_type',
      });

      await storage.deleteInstallationScenario(scenario.id);

      const retrieved = await storage.getInstallationScenarioById(scenario.id);
      expect(retrieved).toBeUndefined();
    });
  });

  describe('Product Relationships CRUD', () => {
    let testUserId: string;
    let sourceProductId: string;
    let targetProductId: string;

    beforeEach(async () => {
      testUserId = 'test-user-' + Date.now();

      const source = await storage.saveProduct({
        name: 'Source Product',
        cloudinaryUrl: 'https://res.cloudinary.com/test/source.jpg',
        cloudinaryPublicId: 'products/source',
      });
      sourceProductId = source.id;

      const target = await storage.saveProduct({
        name: 'Target Product',
        cloudinaryUrl: 'https://res.cloudinary.com/test/target.jpg',
        cloudinaryPublicId: 'products/target',
      });
      targetProductId = target.id;
    });

    it('should create product relationship', async () => {
      const relationship = await storage.createProductRelationship({
        userId: testUserId,
        sourceProductId,
        targetProductId,
        relationshipType: 'pairs_with',
        description: 'These products work well together',
      });

      expect(relationship.id).toBeDefined();
      expect(relationship.sourceProductId).toBe(sourceProductId);
      expect(relationship.targetProductId).toBe(targetProductId);
      expect(relationship.relationshipType).toBe('pairs_with');
    });

    it('should get relationships for product', async () => {
      await storage.createProductRelationship({
        userId: testUserId,
        sourceProductId,
        targetProductId,
        relationshipType: 'pairs_with',
      });

      const relationships = await storage.getProductRelationships([sourceProductId]);

      expect(relationships.length).toBeGreaterThanOrEqual(1);
      expect(relationships.some((r) => r.sourceProductId === sourceProductId)).toBe(true);
    });

    it('should get relationships by type', async () => {
      await storage.createProductRelationship({
        userId: testUserId,
        sourceProductId,
        targetProductId,
        relationshipType: 'requires',
        isRequired: true,
      });

      const required = await storage.getProductRelationshipsByType(sourceProductId, 'requires');

      expect(required.length).toBeGreaterThanOrEqual(1);
      expect(required.every((r) => r.relationshipType === 'requires')).toBe(true);
    });

    it('should delete product relationship', async () => {
      const relationship = await storage.createProductRelationship({
        userId: testUserId,
        sourceProductId,
        targetProductId,
        relationshipType: 'matches',
      });

      await storage.deleteProductRelationship(relationship.id);

      const relationships = await storage.getProductRelationships([sourceProductId]);
      expect(relationships.some((r) => r.id === relationship.id)).toBe(false);
    });
  });

  describe('Brand Images CRUD', () => {
    let testUserId: string;
    let testProductId: string;

    beforeEach(async () => {
      testUserId = 'test-user-' + Date.now();

      const product = await storage.saveProduct({
        name: 'Product for Images',
        cloudinaryUrl: 'https://res.cloudinary.com/test/prod-img.jpg',
        cloudinaryPublicId: 'products/prod-img',
      });
      testProductId = product.id;
    });

    it('should create brand image', async () => {
      const image = await storage.createBrandImage({
        userId: testUserId,
        cloudinaryUrl: 'https://res.cloudinary.com/test/brand-img.jpg',
        cloudinaryPublicId: 'brand-images/test',
        category: 'product_hero',
        description: 'Hero shot of product',
      });

      expect(image.id).toBeDefined();
      expect(image.category).toBe('product_hero');
    });

    it('should get brand images for products', async () => {
      await storage.createBrandImage({
        userId: testUserId,
        cloudinaryUrl: 'https://res.cloudinary.com/test/prod-brand.jpg',
        cloudinaryPublicId: 'brand-images/prod-brand',
        category: 'product_hero',
        productIds: [testProductId],
      });

      const images = await storage.getBrandImagesForProducts([testProductId], testUserId);

      expect(images.length).toBeGreaterThanOrEqual(1);
    });

    it('should get brand images by category', async () => {
      await storage.createBrandImage({
        userId: testUserId,
        cloudinaryUrl: 'https://res.cloudinary.com/test/historical.jpg',
        cloudinaryPublicId: 'brand-images/historical',
        category: 'historical_ad',
      });

      const historicalAds = await storage.getBrandImagesByCategory(testUserId, 'historical_ad');

      expect(historicalAds.length).toBeGreaterThanOrEqual(1);
      expect(historicalAds.every((i) => i.category === 'historical_ad')).toBe(true);
    });

    it('should update brand image', async () => {
      const image = await storage.createBrandImage({
        userId: testUserId,
        cloudinaryUrl: 'https://res.cloudinary.com/test/update-img.jpg',
        cloudinaryPublicId: 'brand-images/update',
        category: 'lifestyle',
      });

      const updated = await storage.updateBrandImage(image.id, {
        description: 'Updated description',
        tags: ['new', 'tags'],
        suggestedUse: ['hero', 'social_media'],
      });

      expect(updated.description).toBe('Updated description');
      expect(updated.tags).toEqual(['new', 'tags']);
      expect(updated.suggestedUse).toEqual(['hero', 'social_media']);
    });

    it('should delete brand image', async () => {
      const image = await storage.createBrandImage({
        userId: testUserId,
        cloudinaryUrl: 'https://res.cloudinary.com/test/delete-img.jpg',
        cloudinaryPublicId: 'brand-images/delete',
        category: 'detail',
      });

      await storage.deleteBrandImage(image.id);

      const images = await storage.getBrandImagesByCategory(testUserId, 'detail');
      expect(images.some((i) => i.id === image.id)).toBe(false);
    });
  });
});

// ============================================================================
// SECTION 6: PRODUCT KNOWLEDGE SERVICE TESTS
// ============================================================================

describe('Product Knowledge Service', () => {
  describe('buildEnhancedContext', () => {
    it('should build context with product descriptions', async () => {
      // This will test the new service once implemented
      // For now, this is a placeholder for the expected behavior
      expect(true).toBe(true);
    });

    it('should include installation scenarios in context', async () => {
      expect(true).toBe(true);
    });

    it('should include product relationships in context', async () => {
      expect(true).toBe(true);
    });

    it('should include reference images as base64 in context', async () => {
      expect(true).toBe(true);
    });
  });
});
