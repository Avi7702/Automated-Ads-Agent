import { describe, it, expect, beforeEach, vi } from "vitest";
import { getWeeklyBalance } from "../repositories/planningRepository";
import { db } from "../db";

vi.mock("../db", () => ({
  db: {
    select: vi.fn(),
  },
}));

describe("planningRepository", () => {
  describe("getWeeklyBalance", () => {
    it("should use SQL aggregation to count posts by category", async () => {
      const mockAggregatedData = [
        { category: "product_showcase", count: 2 },
        { category: "educational", count: 3 },
        { category: "industry_insights", count: 1 },
      ];

      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue(mockAggregatedData),
      };

      (db.select as any).mockReturnValue(mockSelect);

      const result = await getWeeklyBalance("user-1");

      expect(db.select).toHaveBeenCalledWith(expect.objectContaining({
        category: expect.anything(),
        count: expect.anything(),
      }));
      expect(mockSelect.from).toHaveBeenCalled();
      expect(mockSelect.where).toHaveBeenCalled();
      expect(mockSelect.groupBy).toHaveBeenCalled();

      expect(result).toHaveLength(3);
      expect(result).toContainEqual({ category: "product_showcase", count: 2 });
      expect(result).toContainEqual({ category: "educational", count: 3 });
      expect(result).toContainEqual({ category: "industry_insights", count: 1 });
    });

    it("should return an empty array if no posts are found", async () => {
      const mockSelect = {
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        groupBy: vi.fn().mockResolvedValue([]),
      };

      (db.select as any).mockReturnValue(mockSelect);

      const result = await getWeeklyBalance("user-1");

      expect(result).toEqual([]);
    });
  });
});
