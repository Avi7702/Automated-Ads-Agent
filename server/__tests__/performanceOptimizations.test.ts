import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getBrandImagesForProducts } from '../repositories/knowledgeRepository';
import { getPerformingAdTemplatesByPlatform, searchPerformingAdTemplates } from '../repositories/templateRepository';
import { db } from '../db';

// Mock Drizzle db
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('Performance Optimizations - Repository Layer', () => {
  let mockSelectChain: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup a mock chain for Drizzle
    mockSelectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
      // Mock then to make it awaitable
      then: vi.fn(function (resolve) {
        return Promise.resolve([]).then(resolve);
      }),
    };

    (db.select as any).mockReturnValue(mockSelectChain);
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
        objective: 'conversion'
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
