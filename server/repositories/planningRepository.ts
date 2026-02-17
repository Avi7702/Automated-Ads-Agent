import { type ContentPlannerPost, type InsertContentPlannerPost, contentPlannerPosts } from '@shared/schema';
import { db } from '../db';
import { and, eq, desc, gte, lte } from 'drizzle-orm';

export async function createContentPlannerPost(post: InsertContentPlannerPost): Promise<ContentPlannerPost> {
  const [result] = await db.insert(contentPlannerPosts).values(post).returning();
  return result!;
}

export async function getContentPlannerPostsByUser(
  userId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<ContentPlannerPost[]> {
  const conditions = [eq(contentPlannerPosts.userId, userId)];

  const effectiveStartDate = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const effectiveEndDate = endDate || new Date();

  conditions.push(gte(contentPlannerPosts.postedAt, effectiveStartDate));
  conditions.push(lte(contentPlannerPosts.postedAt, effectiveEndDate));

  return await db
    .select()
    .from(contentPlannerPosts)
    .where(and(...conditions))
    .orderBy(desc(contentPlannerPosts.postedAt));
}

export async function getWeeklyBalance(userId: string): Promise<{ category: string; count: number }[]> {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);

  const posts = await db
    .select({
      category: contentPlannerPosts.category,
    })
    .from(contentPlannerPosts)
    .where(and(eq(contentPlannerPosts.userId, userId), gte(contentPlannerPosts.postedAt, weekStart)));

  const countMap: Record<string, number> = {};
  for (const post of posts) {
    countMap[post.category] = (countMap[post.category] || 0) + 1;
  }

  return Object.entries(countMap).map(([category, count]) => ({
    category,
    count,
  }));
}

export async function getContentPlannerPostById(id: string): Promise<ContentPlannerPost | null> {
  const rows = await db.select().from(contentPlannerPosts).where(eq(contentPlannerPosts.id, id)).limit(1);
  return rows[0] ?? null;
}

export async function deleteContentPlannerPost(id: string): Promise<void> {
  await db.delete(contentPlannerPosts).where(eq(contentPlannerPosts.id, id));
}
