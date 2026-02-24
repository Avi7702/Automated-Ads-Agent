import {
  type Generation,
  type InsertGeneration,
  type GenerationUsage,
  type InsertGenerationUsage,
  generations,
  generationUsage,
} from '@shared/schema';
import { db } from '../db';
import { and, eq, desc, sql } from 'drizzle-orm';

export async function saveGeneration(insertGeneration: InsertGeneration): Promise<Generation> {
  const [generation] = await db.insert(generations).values(insertGeneration).returning();
  return generation!;
}

export async function getGenerations(limit: number = 50, offset: number = 0): Promise<Generation[]> {
  // Exclude conversationHistory to avoid exceeding Neon's 64MB response limit
  const results = await db
    .select({
      id: generations.id,
      userId: generations.userId,
      prompt: generations.prompt,
      originalImagePaths: generations.originalImagePaths,
      generatedImagePath: generations.generatedImagePath,
      imagePath: generations.imagePath,
      resolution: generations.resolution,
      model: generations.model,
      aspectRatio: generations.aspectRatio,
      status: generations.status,
      parentGenerationId: generations.parentGenerationId,
      editPrompt: generations.editPrompt,
      editCount: generations.editCount,
      createdAt: generations.createdAt,
      updatedAt: generations.updatedAt,
      productIds: generations.productIds,
      templateId: generations.templateId,
      generationMode: generations.generationMode,
    })
    .from(generations)
    .orderBy(desc(generations.createdAt))
    .limit(limit)
    .offset(offset);

  // Return with null conversationHistory (not needed for gallery view)
  return results.map((r) => ({ ...r, conversationHistory: null })) as Generation[];
}

/**
 * Optimized fetch for user-specific generations.
 * Filters at the database level to reduce memory footprint and data transfer.
 * Fixes a common anti-pattern of in-memory filtering.
 */
export async function getGenerationsByUserId(
  userId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<Generation[]> {
  const results = await db
    .select({
      id: generations.id,
      userId: generations.userId,
      prompt: generations.prompt,
      originalImagePaths: generations.originalImagePaths,
      generatedImagePath: generations.generatedImagePath,
      imagePath: generations.imagePath,
      resolution: generations.resolution,
      model: generations.model,
      aspectRatio: generations.aspectRatio,
      status: generations.status,
      parentGenerationId: generations.parentGenerationId,
      editPrompt: generations.editPrompt,
      editCount: generations.editCount,
      createdAt: generations.createdAt,
      updatedAt: generations.updatedAt,
      productIds: generations.productIds,
      templateId: generations.templateId,
      generationMode: generations.generationMode,
    })
    .from(generations)
    .where(eq(generations.userId, userId))
    .orderBy(desc(generations.createdAt))
    .limit(limit)
    .offset(offset);

  return results.map((r) => ({ ...r, conversationHistory: null })) as Generation[];
}

export async function getGenerationById(id: string): Promise<Generation | undefined> {
  const [generation] = await db.select().from(generations).where(eq(generations.id, id));
  return generation;
}

export async function updateGeneration(id: number | string, updates: Partial<InsertGeneration>): Promise<Generation> {
  const stringId = String(id);
  const [generation] = await db
    .update(generations)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(generations.id, stringId))
    .returning();
  return generation!;
}

export async function deleteGeneration(id: string): Promise<void> {
  await db.delete(generations).where(eq(generations.id, id));
}

export async function getEditHistory(generationId: string): Promise<Generation[]> {
  const result = await db.execute(sql`
    WITH RECURSIVE edit_chain AS (
      SELECT * FROM generations WHERE id = ${generationId}
      UNION ALL
      SELECT g.* FROM generations g
      JOIN edit_chain ec ON g.id = ec.parent_generation_id
    )
    SELECT * FROM edit_chain ORDER BY created_at ASC
  `);

  return (result.rows ?? result) as Generation[];
}

export async function saveGenerationUsage(insertUsage: InsertGenerationUsage): Promise<GenerationUsage> {
  const [usage] = await db.insert(generationUsage).values(insertUsage).returning();
  return usage!;
}

export async function getGenerationUsageRows(params: {
  brandId: string;
  operation: string;
  resolution: string;
  inputImagesCount: number;
  limit?: number;
}): Promise<{ estimatedCostMicros: number; createdAt: Date }[]> {
  const { brandId, operation, resolution, inputImagesCount, limit = 200 } = params;

  return await db
    .select({
      estimatedCostMicros: generationUsage.estimatedCostMicros,
      createdAt: generationUsage.createdAt,
    })
    .from(generationUsage)
    .where(
      and(
        eq(generationUsage.brandId, brandId),
        eq(generationUsage.operation, operation),
        eq(generationUsage.resolution, resolution),
        eq(generationUsage.inputImagesCount, inputImagesCount),
      ),
    )
    .orderBy(desc(generationUsage.createdAt))
    .limit(limit);
}
