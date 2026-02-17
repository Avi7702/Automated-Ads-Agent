import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getWeeklyBalance } from '../repositories/planningRepository';
import { contentPlannerPosts } from '@shared/schema';

// Mock the database instance using vi.hoisted to ensure it's available in the hoisted vi.mock factory
const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    groupBy: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../db', () => ({
  db: mockDb,
}));

describe('planningRepository', () => {
  describe('getWeeklyBalance', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should aggregate post counts by category correctly using database aggregation', async () => {
      const userId = 'user-1';
      const mockAggregatedResults = [
        { category: 'educational', count: 2 },
        { category: 'product_showcase', count: 1 },
      ];

      // Setup mock implementation for the optimized database-level aggregation
      mockDb.groupBy.mockResolvedValue(mockAggregatedResults);

      const result = await getWeeklyBalance(userId);

      expect(result).toEqual(mockAggregatedResults);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(contentPlannerPosts);
      expect(mockDb.groupBy).toHaveBeenCalledWith(contentPlannerPosts.category);
    });
  });
});
