import {
  type PromptTemplate,
  type InsertPromptTemplate,
  type AdSceneTemplate,
  type InsertAdSceneTemplate,
  type PerformingAdTemplate,
  type InsertPerformingAdTemplate,
  promptTemplates,
  adSceneTemplates,
  performingAdTemplates,
} from '@shared/schema';
import { db } from '../db';
import { and, eq, desc, ilike } from 'drizzle-orm';

// ============================================
// PROMPT TEMPLATE OPERATIONS
// ============================================

export async function savePromptTemplate(insertTemplate: InsertPromptTemplate): Promise<PromptTemplate> {
  const [template] = await db.insert(promptTemplates).values(insertTemplate).returning();
  return template;
}

export async function getPromptTemplates(category?: string): Promise<PromptTemplate[]> {
  if (category) {
    return await db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.category, category))
      .orderBy(desc(promptTemplates.createdAt));
  }
  return await db.select().from(promptTemplates).orderBy(desc(promptTemplates.createdAt));
}

export async function getPromptTemplateById(id: string): Promise<PromptTemplate | undefined> {
  const [template] = await db.select().from(promptTemplates).where(eq(promptTemplates.id, id));
  return template;
}

export async function deletePromptTemplate(id: string): Promise<void> {
  await db.delete(promptTemplates).where(eq(promptTemplates.id, id));
}

// ============================================
// AD SCENE TEMPLATE OPERATIONS
// ============================================

export async function saveAdSceneTemplate(insertTemplate: InsertAdSceneTemplate): Promise<AdSceneTemplate> {
  const [template] = await db.insert(adSceneTemplates).values(insertTemplate).returning();
  return template;
}

export async function getAdSceneTemplates(filters?: {
  category?: string;
  isGlobal?: boolean;
  createdBy?: string;
  limit?: number;
  offset?: number;
}): Promise<AdSceneTemplate[]> {
  const conditions = [];
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  if (filters?.category) {
    conditions.push(eq(adSceneTemplates.category, filters.category));
  }
  if (filters?.isGlobal !== undefined) {
    conditions.push(eq(adSceneTemplates.isGlobal, filters.isGlobal));
  }
  if (filters?.createdBy) {
    conditions.push(eq(adSceneTemplates.createdBy, filters.createdBy));
  }

  if (conditions.length > 0) {
    return await db
      .select()
      .from(adSceneTemplates)
      .where(and(...conditions))
      .orderBy(desc(adSceneTemplates.createdAt))
      .limit(limit)
      .offset(offset);
  }

  return await db.select().from(adSceneTemplates).orderBy(desc(adSceneTemplates.createdAt)).limit(limit).offset(offset);
}

export async function getAdSceneTemplateById(id: string): Promise<AdSceneTemplate | undefined> {
  const [template] = await db.select().from(adSceneTemplates).where(eq(adSceneTemplates.id, id));
  return template;
}

export async function updateAdSceneTemplate(
  id: string,
  updates: Partial<InsertAdSceneTemplate>,
): Promise<AdSceneTemplate> {
  const [template] = await db.update(adSceneTemplates).set(updates).where(eq(adSceneTemplates.id, id)).returning();
  return template;
}

export async function deleteAdSceneTemplate(id: string): Promise<void> {
  await db.delete(adSceneTemplates).where(eq(adSceneTemplates.id, id));
}

export async function searchAdSceneTemplates(query: string): Promise<AdSceneTemplate[]> {
  // Search in title, description, and tags
  const searchTerm = `%${query.toLowerCase()}%`;
  return await db
    .select()
    .from(adSceneTemplates)
    .where(ilike(adSceneTemplates.title, searchTerm))
    .orderBy(desc(adSceneTemplates.createdAt));
}

// ============================================
// PERFORMING AD TEMPLATE OPERATIONS
// ============================================

export async function createPerformingAdTemplate(template: InsertPerformingAdTemplate): Promise<PerformingAdTemplate> {
  const [result] = await db.insert(performingAdTemplates).values(template).returning();
  return result;
}

export async function getPerformingAdTemplates(userId: string): Promise<PerformingAdTemplate[]> {
  return await db
    .select()
    .from(performingAdTemplates)
    .where(eq(performingAdTemplates.userId, userId))
    .orderBy(desc(performingAdTemplates.createdAt));
}

export async function getPerformingAdTemplate(id: string): Promise<PerformingAdTemplate | undefined> {
  const [template] = await db.select().from(performingAdTemplates).where(eq(performingAdTemplates.id, id)).limit(1);
  return template;
}

export async function getPerformingAdTemplatesByCategory(
  userId: string,
  category: string,
): Promise<PerformingAdTemplate[]> {
  return await db
    .select()
    .from(performingAdTemplates)
    .where(and(eq(performingAdTemplates.userId, userId), eq(performingAdTemplates.category, category)))
    .orderBy(desc(performingAdTemplates.createdAt));
}

export async function getPerformingAdTemplatesByPlatform(
  userId: string,
  platform: string,
): Promise<PerformingAdTemplate[]> {
  const allTemplates = await db
    .select()
    .from(performingAdTemplates)
    .where(eq(performingAdTemplates.userId, userId))
    .orderBy(desc(performingAdTemplates.createdAt));

  return allTemplates.filter((t) => t.targetPlatforms?.includes(platform));
}

export async function getFeaturedPerformingAdTemplates(userId: string): Promise<PerformingAdTemplate[]> {
  return await db
    .select()
    .from(performingAdTemplates)
    .where(
      and(
        eq(performingAdTemplates.userId, userId),
        eq(performingAdTemplates.isFeatured, true),
        eq(performingAdTemplates.isActive, true),
      ),
    )
    .orderBy(desc(performingAdTemplates.createdAt));
}

export async function getTopPerformingAdTemplates(userId: string, limit: number = 10): Promise<PerformingAdTemplate[]> {
  return await db
    .select()
    .from(performingAdTemplates)
    .where(and(eq(performingAdTemplates.userId, userId), eq(performingAdTemplates.isActive, true)))
    .orderBy(desc(performingAdTemplates.estimatedEngagementRate))
    .limit(limit);
}

export async function updatePerformingAdTemplate(
  id: string,
  updates: Partial<InsertPerformingAdTemplate>,
): Promise<PerformingAdTemplate> {
  const [template] = await db
    .update(performingAdTemplates)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(performingAdTemplates.id, id))
    .returning();
  return template;
}

export async function deletePerformingAdTemplate(id: string): Promise<void> {
  await db.delete(performingAdTemplates).where(eq(performingAdTemplates.id, id));
}

export async function searchPerformingAdTemplates(
  userId: string,
  filters: {
    category?: string;
    platform?: string;
    mood?: string;
    style?: string;
    engagementTier?: string;
    industry?: string;
    objective?: string;
  },
): Promise<PerformingAdTemplate[]> {
  let templates = await db
    .select()
    .from(performingAdTemplates)
    .where(and(eq(performingAdTemplates.userId, userId), eq(performingAdTemplates.isActive, true)))
    .orderBy(desc(performingAdTemplates.estimatedEngagementRate));

  if (filters.category) {
    templates = templates.filter((t) => t.category === filters.category);
  }
  if (filters.platform) {
    templates = templates.filter((t) => t.targetPlatforms?.includes(filters.platform!));
  }
  if (filters.mood) {
    templates = templates.filter((t) => t.mood === filters.mood);
  }
  if (filters.style) {
    templates = templates.filter((t) => t.style === filters.style);
  }
  if (filters.engagementTier) {
    templates = templates.filter((t) => t.engagementTier === filters.engagementTier);
  }
  if (filters.industry) {
    templates = templates.filter((t) => t.bestForIndustries?.includes(filters.industry!));
  }
  if (filters.objective) {
    templates = templates.filter((t) => t.bestForObjectives?.includes(filters.objective!));
  }

  return templates;
}
