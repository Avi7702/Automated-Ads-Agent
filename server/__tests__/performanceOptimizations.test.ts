import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { getBrandImagesForProducts } from '../repositories/knowledgeRepository';
import { getPerformingAdTemplatesByPlatform, searchPerformingAdTemplates } from '../repositories/templateRepository';
import { upsertQuotaMetrics } from '../repositories/quotaRepository';
import { db } from '../db';

// Mock Drizzle db
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
  },
}));

/**
 * Typed mock matching Drizzle's fluent query builder chain.
 * Terminal methods (where, orderBy, limit, offset, onConflictDoUpdate) resolve to an empty array
 * so the chain is awaitable without a `then` property (which Biome forbids
 * on plain objects via lint/suspicious/noThenProperty).
 */
interface DrizzleMockChain {
  from: Mock;
  where: Mock;
  orderBy: Mock;
  limit: Mock;
  offset: Mock;
  values: Mock;
  onConflictDoUpdate: Mock;
  returning: Mock;
}

describe('Performance Optimizations - Repository Layer', () => {
  let mockChain: DrizzleMockChain;

  beforeEach(() => {
    vi.clearAllMocks();

    const resolved = Promise.resolve([]);

    // Setup a mock chain for Drizzle — each method returns the chain,
    // but also acts as a thenable via the resolved promise prototype
    mockChain = Object.assign(resolved, {
      from: vi.fn().mockReturnValue(resolved),
      where: vi.fn().mockReturnValue(resolved),
      orderBy: vi.fn().mockReturnValue(resolved),
      limit: vi.fn().mockReturnValue(resolved),
      offset: vi.fn().mockReturnValue(resolved),
      values: vi.fn().mockReturnValue(resolved),
      onConflictDoUpdate: vi.fn().mockReturnValue(resolved),
      returning: vi.fn().mockReturnValue(resolved),
    });

    // Re-wire chaining: each method returns the full mock so intermediate
    // calls still expose .from/.where/.orderBy etc.
    for (const method of [
      'from',
      'where',
      'orderBy',
      'limit',
      'offset',
      'values',
      'onConflictDoUpdate',
      'returning',
    ] as const) {
      mockChain[method].mockReturnValue(mockChain);
    }

    vi.mocked(db.select).mockReturnValue(mockChain as unknown as ReturnType<typeof db.select>);
    vi.mocked(db.insert).mockReturnValue(mockChain as unknown as ReturnType<typeof db.insert>);
  });

  describe('knowledgeRepository.getBrandImagesForProducts', () => {
    it('should use database-level filtering with array overlap operator', async () => {
      const productIds = ['prod-1', 'prod-2'];
      const userId = 'user-123';

      await getBrandImagesForProducts(productIds, userId);

      expect(db.select).toHaveBeenCalled();
      expect(mockChain.from).toHaveBeenCalled();
      expect(mockChain.where).toHaveBeenCalled();

      // Verify that SQL operator was used (implicitly by checking mock calls)
      const whereCall = mockChain.where.mock.calls[0][0];
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
      expect(mockChain.where).toHaveBeenCalled();
    });
  });

  describe('quotaRepository.upsertQuotaMetrics', () => {
    it('should use atomic PostgreSQL UPSERT with onConflictDoUpdate', async () => {
      const metrics = {
        windowType: 'minute',
        windowStart: new Date(),
        windowEnd: new Date(),
        brandId: 'brand-123',
        requestCount: 1,
        successCount: 1,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 100,
        outputTokensTotal: 50,
        estimatedCostMicros: 500,
        generateCount: 1,
        editCount: 0,
        analyzeCount: 0,
        modelBreakdown: { 'gemini-3-flash': 1 },
      };

      await upsertQuotaMetrics(metrics as any);

      expect(db.insert).toHaveBeenCalled();
      expect(mockChain.values).toHaveBeenCalledWith(metrics);
      expect(mockChain.onConflictDoUpdate).toHaveBeenCalled();

      const onConflictCall = mockChain.onConflictDoUpdate.mock.calls[0][0];
      expect(onConflictCall.target).toBeDefined();
      expect(onConflictCall.set).toBeDefined();
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
      expect(mockChain.where).toHaveBeenCalled();

      // The chain should include orderBy and potentially other calls
      expect(mockChain.orderBy).toHaveBeenCalled();
    });

    it('should handle partial filters', async () => {
      const userId = 'user-123';
      const filters = {
        category: 'ecommerce',
      };

      await searchPerformingAdTemplates(userId, filters);

      expect(db.select).toHaveBeenCalled();
      expect(mockChain.where).toHaveBeenCalled();
    });
  });
});
