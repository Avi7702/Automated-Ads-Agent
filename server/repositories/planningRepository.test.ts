import { vi, describe, it, expect } from 'vitest';
import * as planningRepo from './planningRepository';
import { db } from '../db';
import { contentPlannerPosts } from '@shared/schema';

// Helper to create a mock chain
const createMockChain = () => {
  const chain = {
    select: vi.fn(),
    from: vi.fn(),
    where: vi.fn(),
    groupBy: vi.fn(),
    execute: vi.fn(),
    then: vi.fn(),
    catch: vi.fn(),
  };

  chain.select.mockReturnValue(chain);
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.groupBy.mockReturnValue(chain);

  // Make it thenable (like a promise)
  chain.then.mockImplementation((onFulfilled) => {
    return Promise.resolve(chain.execute()).then(onFulfilled);
  });

  return chain;
};

const mockChain = createMockChain();

vi.mock('../db', () => ({
  db: {
    select: vi.fn(() => mockChain),
  },
}));

describe('planningRepository', () => {
  it('getWeeklyBalance should use groupBy and count in SQL', async () => {
    const mockResults = [
      { category: 'educational', count: 2 },
      { category: 'engagement', count: 1 },
    ];

    mockChain.execute.mockResolvedValue(mockResults);

    const result = await planningRepo.getWeeklyBalance('user-1');

    expect(db.select).toHaveBeenCalled();
    // In the unoptimized version, groupBy is NOT called.
    // In the optimized version, it SHOULD be called.
    expect(mockChain.groupBy).toHaveBeenCalledWith(contentPlannerPosts.category);
    expect(result).toEqual(mockResults);
  });
});
