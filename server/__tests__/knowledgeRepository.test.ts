import { vi, describe, it, expect, beforeEach } from 'vitest';
import { getBrandImagesForProducts } from '../repositories/knowledgeRepository';
import { brandImages } from '@shared/schema';

// Mock the db module
const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
  },
}));

vi.mock('../db', () => ({
  db: mockDb,
}));

describe('knowledgeRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBrandImagesForProducts', () => {
    it('should return brand images using database-side array overlap', async () => {
      // The new implementation returns data directly from the DB filtering
      const mockImages = [
        { id: 'img-1', productIds: ['prod-1', 'prod-2'] },
        { id: 'img-3', productIds: ['prod-1'] },
      ];

      mockDb.orderBy.mockResolvedValue(mockImages);

      const result = await getBrandImagesForProducts(['prod-1'], 'user-1');

      expect(result).toEqual(mockImages);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.from).toHaveBeenCalledWith(brandImages);
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
    });

    it('should return empty array if no product IDs provided', async () => {
      const result = await getBrandImagesForProducts([], 'user-1');
      expect(result).toEqual([]);
      expect(mockDb.select).not.toHaveBeenCalled();
    });
  });
});
