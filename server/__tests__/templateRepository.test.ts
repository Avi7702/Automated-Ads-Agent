import { vi, describe, it, expect, beforeEach } from 'vitest';

const { mockSelect, mockFrom, mockWhere, mockOrderBy } = vi.hoisted(() => ({
  mockSelect: vi.fn(),
  mockFrom: vi.fn(),
  mockWhere: vi.fn(),
  mockOrderBy: vi.fn(),
}));

vi.mock('../db', () => ({
  db: {
    select: mockSelect,
  },
}));

// Mock drizzle-orm operators
vi.mock('drizzle-orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('drizzle-orm')>();
  return {
    ...actual,
    eq: vi.fn((col, val) => ({ operator: 'eq', col, val })),
    and: vi.fn((...args) => ({ operator: 'and', args })),
    desc: vi.fn((col) => ({ operator: 'desc', col })),
    arrayContains: vi.fn((col, val) => ({ operator: 'arrayContains', col, val })),
  };
});

import { searchPerformingAdTemplates, getPerformingAdTemplatesByPlatform } from '../repositories/templateRepository';
import { performingAdTemplates } from '@shared/schema';

describe('templateRepository optimized', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Setup the chain
    mockSelect.mockReturnValue({ from: mockFrom });
    mockFrom.mockReturnValue({ where: mockWhere });
    mockWhere.mockReturnValue({ orderBy: mockOrderBy });
    mockOrderBy.mockResolvedValue([]);
  });

  describe('getPerformingAdTemplatesByPlatform', () => {
    it('NOW filters by platform on the database side', async () => {
      await getPerformingAdTemplatesByPlatform('user-1', 'instagram');

      // Verify it filters by userId AND platform in the query
      expect(mockWhere).toHaveBeenCalledWith({
        operator: 'and',
        args: [
          expect.objectContaining({ col: performingAdTemplates.userId, val: 'user-1' }),
          expect.objectContaining({ operator: 'arrayContains', col: performingAdTemplates.targetPlatforms, val: ['instagram'] })
        ]
      });
    });
  });

  describe('searchPerformingAdTemplates', () => {
    it('NOW filters by all criteria on the database side', async () => {
      const filters = {
        category: 'ecommerce',
        platform: 'instagram',
        mood: 'bold',
        industry: 'retail'
      };

      await searchPerformingAdTemplates('user-1', filters);

      // Verify the where clause includes all filters
      expect(mockWhere).toHaveBeenCalledWith(expect.objectContaining({
        operator: 'and',
        args: expect.arrayContaining([
          expect.objectContaining({ col: performingAdTemplates.userId, val: 'user-1' }),
          expect.objectContaining({ col: performingAdTemplates.isActive, val: true }),
          expect.objectContaining({ col: performingAdTemplates.category, val: 'ecommerce' }),
          expect.objectContaining({ operator: 'arrayContains', col: performingAdTemplates.targetPlatforms, val: ['instagram'] }),
          expect.objectContaining({ col: performingAdTemplates.mood, val: 'bold' }),
          expect.objectContaining({ operator: 'arrayContains', col: performingAdTemplates.bestForIndustries, val: ['retail'] })
        ])
      }));

      const whereCall = mockWhere.mock.calls[0][0];
      expect(whereCall.args).toHaveLength(6); // userId, isActive, category, platform, mood, industry
    });
  });
});
