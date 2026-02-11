import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the db before importing repository
vi.mock('../../db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
  },
}));

// Mock drizzle-orm to capture and verify conditions
vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual('drizzle-orm');
  return {
    ...actual,
    and: vi.fn((...args) => ({ type: 'and', args })),
    eq: vi.fn((col, val) => ({ type: 'eq', col, val })),
    desc: vi.fn((col) => ({ type: 'desc', col })),
    sql: Object.assign(
      vi.fn((strings, ...values) => ({ type: 'sql', strings, values })),
      {
        join: vi.fn((items, separator) => ({ type: 'sql-join', items, separator })),
      }
    ),
  };
});

import { getBrandImagesForProducts } from '../../repositories/knowledgeRepository';
import { db } from '../../db';
import { brandImages } from '@shared/schema';

describe('knowledgeRepository Performance Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getBrandImagesForProducts', () => {
    it('should utilize database-level array overlap operator (&&)', async () => {
      const productIds = ['prod-1', 'prod-2'];
      const userId = 'user-123';

      await getBrandImagesForProducts(productIds, userId);

      // Verify db.select().from().where() chain
      expect(db.select).toHaveBeenCalled();
      expect(db.from).toHaveBeenCalledWith(brandImages);
      expect(db.where).toHaveBeenCalled();

      // Get the condition passed to where()
      const whereCondition = (db.where as any).mock.calls[0][0];

      // Verify it's an 'and' condition
      expect(whereCondition.type).toBe('and');

      // Verify the conditions within 'and'
      const conditions = whereCondition.args;

      // First condition: userId check
      expect(conditions[0]).toMatchObject({
        type: 'eq',
        val: userId,
      });

      // Second condition: array overlap check
      expect(conditions[1]).toMatchObject({
        type: 'sql',
      });

      // Verify the SQL fragment contains the overlap operator
      const sqlStrings = conditions[1].strings;
      expect(sqlStrings.some((s: string) => s.includes('&&'))).toBe(true);
      expect(sqlStrings.some((s: string) => s.includes('ARRAY['))).toBe(true);
      expect(sqlStrings.some((s: string) => s.includes(']::text[]'))).toBe(true);
    });

    it('should return empty array immediately if productIds is empty', async () => {
      const result = await getBrandImagesForProducts([], 'user-123');

      expect(result).toEqual([]);
      expect(db.select).not.toHaveBeenCalled();
    });
  });
});
