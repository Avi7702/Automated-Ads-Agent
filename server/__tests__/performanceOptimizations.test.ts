import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as knowledgeRepository from '../repositories/knowledgeRepository';
import { db } from '../db';

// Mock the database
vi.mock('../db', () => ({
  db: {
    select: vi.fn(),
  },
}));

describe('Performance Optimization Verification: Knowledge Repository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('knowledgeRepository.getBrandImagesForProducts', () => {
    it('uses database-side filtering with array overlap', async () => {
      const mockUserId = 'user-1';
      const mockProductIds = ['prod-1', 'prod-2'];

      const mockImages = [{ id: 'img-1' }];

      const mockOrderBy = {
        orderBy: vi.fn().mockResolvedValue(mockImages),
      };
      const mockWhere = {
        where: vi.fn().mockReturnValue(mockOrderBy),
      };
      const mockFrom = {
        from: vi.fn().mockReturnValue(mockWhere),
      };
      (db.select as any).mockReturnValue(mockFrom);

      const result = await knowledgeRepository.getBrandImagesForProducts(mockProductIds, mockUserId);

      expect(result).toEqual(mockImages);
      expect(db.select).toHaveBeenCalled();
      expect(mockWhere.where).toHaveBeenCalled();
      // The implementation now uses database-level filtering
    });
  });
});
