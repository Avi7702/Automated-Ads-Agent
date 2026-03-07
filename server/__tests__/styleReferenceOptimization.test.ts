import { vi, describe, it, expect, beforeEach, type Mock } from 'vitest';
import { getStyleReferencesByIds } from '../repositories/styleReferenceRepository';
import { db } from '../db';

// Mock Drizzle db
vi.mock('../db', () => ({
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

describe('Style Reference Optimization', () => {
  let mockSelectChain: DrizzleMockChain;

  beforeEach(() => {
    vi.clearAllMocks();

    const resolved = Promise.resolve([]);

    // Setup a mock chain for Drizzle
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

  it('should use a single database query with inArray for multiple IDs', async () => {
    const ids = ['id-1', 'id-2', 'id-3'];
    await getStyleReferencesByIds(ids);

    expect(db.select).toHaveBeenCalledTimes(1);
    expect(mockSelectChain.from).toHaveBeenCalledTimes(1);
    expect(mockSelectChain.where).toHaveBeenCalledTimes(1);
  });

  it('should return empty array and not call db if no IDs are provided', async () => {
    const result = await getStyleReferencesByIds([]);
    expect(result).toEqual([]);
    expect(db.select).not.toHaveBeenCalled();
  });
});
