/**
 * Pagination / LIMIT Tests for Repository Layer
 *
 * Verifies that repository list methods respect limit and offset parameters
 * to prevent unbounded queries (S2-1).
 */

import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { getPromptTemplates } from '../../repositories/templateRepository';
import { getLearnedPatterns } from '../../repositories/patternRepository';
import { searchProductsByTag } from '../../repositories/productRepository';
import { getInstallationScenariosByUser } from '../../repositories/knowledgeRepository';
import { db } from '../../db';

// Mock Drizzle db
vi.mock('../../db', () => ({
  db: {
    select: vi.fn(),
  },
}));

/**
 * Typed mock matching Drizzle's fluent query builder chain.
 */
interface DrizzleMockChain {
  from: Mock;
  where: Mock;
  orderBy: Mock;
  limit: Mock;
  offset: Mock;
}

describe('Repository Pagination (S2-1)', () => {
  let mockSelectChain: DrizzleMockChain;

  beforeEach(() => {
    vi.clearAllMocks();

    const resolved = Promise.resolve([]);

    mockSelectChain = Object.assign(resolved, {
      from: vi.fn().mockReturnValue(resolved),
      where: vi.fn().mockReturnValue(resolved),
      orderBy: vi.fn().mockReturnValue(resolved),
      limit: vi.fn().mockReturnValue(resolved),
      offset: vi.fn().mockReturnValue(resolved),
    });

    for (const method of ['from', 'where', 'orderBy', 'limit', 'offset'] as const) {
      mockSelectChain[method].mockReturnValue(mockSelectChain);
    }

    vi.mocked(db.select).mockReturnValue(mockSelectChain as unknown as ReturnType<typeof db.select>);
  });

  describe('templateRepository.getPromptTemplates', () => {
    it('should apply default limit of 50 when no limit specified', async () => {
      await getPromptTemplates();

      expect(db.select).toHaveBeenCalled();
      expect(mockSelectChain.limit).toHaveBeenCalledWith(50);
      expect(mockSelectChain.offset).toHaveBeenCalledWith(0);
    });

    it('should respect custom limit parameter', async () => {
      await getPromptTemplates(undefined, 10);

      expect(mockSelectChain.limit).toHaveBeenCalledWith(10);
    });

    it('should respect custom offset parameter', async () => {
      await getPromptTemplates(undefined, 50, 25);

      expect(mockSelectChain.limit).toHaveBeenCalledWith(50);
      expect(mockSelectChain.offset).toHaveBeenCalledWith(25);
    });

    it('should apply limit when filtering by category', async () => {
      await getPromptTemplates('test-category', 20, 5);

      expect(mockSelectChain.where).toHaveBeenCalled();
      expect(mockSelectChain.limit).toHaveBeenCalledWith(20);
      expect(mockSelectChain.offset).toHaveBeenCalledWith(5);
    });
  });

  describe('patternRepository.getLearnedPatterns', () => {
    it('should apply default limit of 50 when no limit specified', async () => {
      await getLearnedPatterns('user-1');

      expect(db.select).toHaveBeenCalled();
      expect(mockSelectChain.limit).toHaveBeenCalledWith(50);
      expect(mockSelectChain.offset).toHaveBeenCalledWith(0);
    });

    it('should respect custom limit and offset', async () => {
      await getLearnedPatterns('user-1', undefined, 25, 10);

      expect(mockSelectChain.limit).toHaveBeenCalledWith(25);
      expect(mockSelectChain.offset).toHaveBeenCalledWith(10);
    });
  });

  describe('productRepository.searchProductsByTag', () => {
    it('should apply default limit of 100 when no limit specified', async () => {
      await searchProductsByTag('steel');

      expect(db.select).toHaveBeenCalled();
      expect(mockSelectChain.limit).toHaveBeenCalledWith(100);
      expect(mockSelectChain.offset).toHaveBeenCalledWith(0);
    });

    it('should respect custom limit', async () => {
      await searchProductsByTag('steel', 15, 5);

      expect(mockSelectChain.limit).toHaveBeenCalledWith(15);
      expect(mockSelectChain.offset).toHaveBeenCalledWith(5);
    });
  });

  describe('knowledgeRepository.getInstallationScenariosByUser', () => {
    it('should apply default limit of 100 when no limit specified', async () => {
      await getInstallationScenariosByUser('user-1');

      expect(db.select).toHaveBeenCalled();
      expect(mockSelectChain.limit).toHaveBeenCalledWith(100);
      expect(mockSelectChain.offset).toHaveBeenCalledWith(0);
    });

    it('should respect custom limit and offset', async () => {
      await getInstallationScenariosByUser('user-1', 30, 60);

      expect(mockSelectChain.limit).toHaveBeenCalledWith(30);
      expect(mockSelectChain.offset).toHaveBeenCalledWith(60);
    });
  });
});
