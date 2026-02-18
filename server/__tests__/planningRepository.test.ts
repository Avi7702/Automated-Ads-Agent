import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getWeeklyBalance } from '../repositories/planningRepository';
import { contentPlannerPosts } from '@shared/schema';

// Mock the db module
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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getWeeklyBalance', () => {
    it('should return aggregated counts by category using database-side aggregation', async () => {
      // The new implementation returns aggregated data directly from the DB
      const mockAggregatedData = [
        { category: 'educational', count: 1 },
        { category: 'product_showcase', count: 2 },
      ];

      mockDb.groupBy.mockResolvedValue(mockAggregatedData);

      const result = await getWeeklyBalance('user-1');

      expect(result).toEqual(mockAggregatedData);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(contentPlannerPosts);
      expect(mockDb.groupBy).toHaveBeenCalledWith(contentPlannerPosts.category);
    });
  });
});
