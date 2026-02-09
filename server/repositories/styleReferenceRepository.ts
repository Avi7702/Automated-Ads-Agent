/**
 * Style Reference Repository
 * CRUD operations for character/style reference images
 */

import { db } from '../db';
import { styleReferences, type StyleReference, type InsertStyleReference } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export async function createStyleReference(data: InsertStyleReference): Promise<StyleReference> {
  const [ref] = await db.insert(styleReferences).values(data).returning();
  if (!ref) throw new Error('Failed to create style reference');
  return ref;
}

export async function getStyleReferencesByUser(userId: string, limit = 50, offset = 0): Promise<StyleReference[]> {
  return db
    .select()
    .from(styleReferences)
    .where(and(eq(styleReferences.userId, userId), eq(styleReferences.isActive, true)))
    .orderBy(desc(styleReferences.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getStyleReferenceById(id: string): Promise<StyleReference | undefined> {
  const [ref] = await db.select().from(styleReferences).where(eq(styleReferences.id, id));
  return ref;
}

export async function getStyleReferencesByCategory(userId: string, category: string): Promise<StyleReference[]> {
  return db
    .select()
    .from(styleReferences)
    .where(
      and(
        eq(styleReferences.userId, userId),
        eq(styleReferences.category, category),
        eq(styleReferences.isActive, true),
      ),
    )
    .orderBy(desc(styleReferences.createdAt));
}

export async function updateStyleReference(
  id: string,
  updates: Partial<InsertStyleReference>,
): Promise<StyleReference> {
  const [ref] = await db.update(styleReferences).set(updates).where(eq(styleReferences.id, id)).returning();
  if (!ref) throw new Error('Style reference not found');
  return ref;
}

export async function deleteStyleReference(id: string): Promise<void> {
  await db.update(styleReferences).set({ isActive: false }).where(eq(styleReferences.id, id));
}

export async function hardDeleteStyleReference(id: string): Promise<void> {
  await db.delete(styleReferences).where(eq(styleReferences.id, id));
}

export async function incrementUsageCount(id: string): Promise<void> {
  await db
    .update(styleReferences)
    .set({
      usageCount: sql`${styleReferences.usageCount} + 1`,
      lastUsedAt: new Date(),
    })
    .where(eq(styleReferences.id, id));
}

export async function getStyleReferencesByIds(ids: string[]): Promise<StyleReference[]> {
  if (ids.length === 0) return [];
  const results: StyleReference[] = [];
  for (const id of ids) {
    const ref = await getStyleReferenceById(id);
    if (ref && ref.isActive) results.push(ref);
  }
  return results;
}
