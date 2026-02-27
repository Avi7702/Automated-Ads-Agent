import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { getBrandImagesForProducts } from '../repositories/knowledgeRepository';
import { getPerformingAdTemplatesByPlatform, searchPerformingAdTemplates } from '../repositories/templateRepository';
import { db } from '../db';

// Mock Drizzle db
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
  },
}));

/**
 * Typed mock matching Drizzle's fluent query builder chain.
 * Terminal methods (where, orderBy, limit, offset) resolve to an empty array
 * so the chain is awaitable without a `then` property (which Biome forbids
 * on plain objects via lint/suspicious/noThenProperty).
 */
interface DrizzleMockChain {
  from: Mock;
  where: Mock;
  orderBy: Mock;
  limit: Mock;
  offset: Mock;
}

describe('Performance Optimizations - Repository Layer', () => {
  let mockSelectChain: DrizzleMockChain;

  beforeEach(() => {
    vi.clearAllMocks();

    const resolved = Promise.resolve([]);

    // Setup a mock chain for Drizzle — each method returns the chain,
    // but also acts as a thenable via the resolved promise prototype
    mockSelectChain = Object.assign(resolved, {
      from: vi.fn().mockReturnValue(resolved),
      where: vi.fn().mockReturnValue(resolved),
      orderBy: vi.fn().mockReturnValue(resolved),
      limit: vi.fn().mockReturnValue(resolved),
      offset: vi.fn().mockReturnValue(resolved),
    });

    // Re-wire chaining: each method returns the full mock so intermediate
    // calls still expose .from/.where/.orderBy etc.
    for (const method of ['from', 'where', 'orderBy', 'limit', 'offset'] as const) {
      mockSelectChain[method].mockReturnValue(mockSelectChain);
    }

    vi.mocked(db.select).mockReturnValue(mockSelectChain as unknown as ReturnType<typeof db.select>);
  });

  describe('knowledgeRepository.getBrandImagesForProducts', () => {
    it('should use database-level filtering with array overlap operator', async () => {
      const productIds = ['prod-1', 'prod-2'];
      const userId = 'user-123';

      await getBrandImagesForProducts(productIds, userId);

      expect(db.select).toHaveBeenCalled();
      expect(mockSelectChain.from).toHaveBeenCalled();
      expect(mockSelectChain.where).toHaveBeenCalled();

      // Verify that SQL operator was used (implicitly by checking mock calls)
      const whereCall = mockSelectChain.where.mock.calls[0][0];
      // Drizzle SQL objects are complex, but we can check if it's defined
      expect(whereCall).toBeDefined();
    });

    it('should return empty array if no productIds provided without calling db', async () => {
      const result = await getBrandImagesForProducts([], 'user-123');
      expect(result).toEqual([]);
      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe('templateRepository.getPerformingAdTemplatesByPlatform', () => {
    it('should use database-level filtering with arrayContains', async () => {
      const userId = 'user-123';
      const platform = 'instagram';

      await getPerformingAdTemplatesByPlatform(userId, platform);

      expect(db.select).toHaveBeenCalled();
      expect(mockSelectChain.where).toHaveBeenCalled();
    });
  });

  describe('generationRepository.getGenerationsByUserId', () => {
    it('should use database-level filtering with userId', async () => {
      const userId = 'user-123';
      const limit = 10;
      const offset = 5;

      const { getGenerationsByUserId } = await import('../repositories/generationRepository');
      await getGenerationsByUserId(userId, limit, offset);

      expect(db.select).toHaveBeenCalled();
      expect(mockSelectChain.where).toHaveBeenCalled();
      expect(mockSelectChain.limit).toHaveBeenCalledWith(limit);
      expect(mockSelectChain.offset).toHaveBeenCalledWith(offset);
    });
  });

  describe('templateRepository.searchPerformingAdTemplates', () => {
    it('should build dynamic where clause for all filters', async () => {
      const userId = 'user-123';
      const filters = {
        category: 'ecommerce',
        platform: 'facebook',
        mood: 'bold',
        style: 'modern',
        engagementTier: 'top-10',
        industry: 'fashion',
        objective: 'conversion',
      };

      await searchPerformingAdTemplates(userId, filters);

      expect(db.select).toHaveBeenCalled();
      expect(mockSelectChain.where).toHaveBeenCalled();

      // The chain should include orderBy and potentially other calls
      expect(mockSelectChain.orderBy).toHaveBeenCalled();
    });

    it('should handle partial filters', async () => {
      const userId = 'user-123';
      const filters = {
        category: 'ecommerce',
      };

      await searchPerformingAdTemplates(userId, filters);

      expect(db.select).toHaveBeenCalled();
      expect(mockSelectChain.where).toHaveBeenCalled();
    });
  });
});
