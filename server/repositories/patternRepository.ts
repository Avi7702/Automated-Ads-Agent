import {
  type LearnedAdPattern,
  type InsertLearnedAdPattern,
  type AdAnalysisUpload,
  type InsertAdAnalysisUpload,
  type PatternApplicationHistory,
  type InsertPatternApplicationHistory,
  learnedAdPatterns,
  adAnalysisUploads,
  patternApplicationHistory,
} from '@shared/schema';
import { db } from '../db';
import { and, eq, desc, lte, sql } from 'drizzle-orm';

// ============================================
// LEARNED AD PATTERN OPERATIONS
// ============================================

export async function createLearnedPattern(pattern: InsertLearnedAdPattern): Promise<LearnedAdPattern> {
  const [result] = await db.insert(learnedAdPatterns).values(pattern).returning();
  return result!;
}

export async function getLearnedPatterns(
  userId: string,
  filters?: {
    category?: string;
    platform?: string;
    industry?: string;
    isActive?: boolean;
  },
): Promise<LearnedAdPattern[]> {
  const conditions = [eq(learnedAdPatterns.userId, userId)];

  if (filters?.category) {
    conditions.push(eq(learnedAdPatterns.category, filters.category));
  }
  if (filters?.platform) {
    conditions.push(eq(learnedAdPatterns.platform, filters.platform));
  }
  if (filters?.industry) {
    conditions.push(eq(learnedAdPatterns.industry, filters.industry));
  }
  if (filters?.isActive !== undefined) {
    conditions.push(eq(learnedAdPatterns.isActive, filters.isActive));
  }

  return await db
    .select()
    .from(learnedAdPatterns)
    .where(and(...conditions))
    .orderBy(desc(learnedAdPatterns.createdAt));
}

export async function getLearnedPatternById(id: string): Promise<LearnedAdPattern | undefined> {
  const [pattern] = await db.select().from(learnedAdPatterns).where(eq(learnedAdPatterns.id, id));
  return pattern;
}

export async function getLearnedPatternByHash(
  userId: string,
  sourceHash: string,
): Promise<LearnedAdPattern | undefined> {
  const [pattern] = await db
    .select()
    .from(learnedAdPatterns)
    .where(and(eq(learnedAdPatterns.userId, userId), eq(learnedAdPatterns.sourceHash, sourceHash)));
  return pattern;
}

export async function updateLearnedPattern(
  id: string,
  updates: Partial<InsertLearnedAdPattern>,
): Promise<LearnedAdPattern> {
  const [result] = await db
    .update(learnedAdPatterns)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(learnedAdPatterns.id, id))
    .returning();
  return result!;
}

export async function deleteLearnedPattern(id: string): Promise<void> {
  await db.delete(learnedAdPatterns).where(eq(learnedAdPatterns.id, id));
}

export async function incrementPatternUsage(id: string): Promise<void> {
  await db
    .update(learnedAdPatterns)
    .set({
      usageCount: sql`${learnedAdPatterns.usageCount} + 1`,
      lastUsedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(learnedAdPatterns.id, id));
}

// ============================================
// AD ANALYSIS UPLOAD OPERATIONS
// ============================================

export async function createUploadRecord(upload: InsertAdAnalysisUpload): Promise<AdAnalysisUpload> {
  const [result] = await db.insert(adAnalysisUploads).values(upload).returning();
  return result!;
}

export async function getUploadById(id: string): Promise<AdAnalysisUpload | undefined> {
  const [upload] = await db.select().from(adAnalysisUploads).where(eq(adAnalysisUploads.id, id));
  return upload;
}

export async function updateUploadStatus(id: string, status: string, errorMessage?: string): Promise<AdAnalysisUpload> {
  const updateData: Partial<AdAnalysisUpload> = { status };
  if (errorMessage) {
    updateData.errorMessage = errorMessage;
  }
  if (status === 'scanning' || status === 'extracting') {
    updateData.processingStartedAt = new Date();
  }

  const [result] = await db.update(adAnalysisUploads).set(updateData).where(eq(adAnalysisUploads.id, id)).returning();
  return result!;
}

export async function updateUploadWithPattern(
  id: string,
  patternId: string,
  processingDurationMs: number,
): Promise<AdAnalysisUpload> {
  const [result] = await db
    .update(adAnalysisUploads)
    .set({
      status: 'completed',
      extractedPatternId: patternId,
      processingCompletedAt: new Date(),
      processingDurationMs,
    })
    .where(eq(adAnalysisUploads.id, id))
    .returning();
  return result!;
}

export async function getExpiredUploads(): Promise<AdAnalysisUpload[]> {
  return await db
    .select()
    .from(adAnalysisUploads)
    .where(and(lte(adAnalysisUploads.expiresAt, new Date()), sql`${adAnalysisUploads.status} != 'expired'`));
}

export async function deleteUpload(id: string): Promise<void> {
  await db.delete(adAnalysisUploads).where(eq(adAnalysisUploads.id, id));
}

// ============================================
// PATTERN APPLICATION HISTORY OPERATIONS
// ============================================

export async function createApplicationHistory(
  history: InsertPatternApplicationHistory,
): Promise<PatternApplicationHistory> {
  const [result] = await db.insert(patternApplicationHistory).values(history).returning();
  return result!;
}

export async function getPatternApplicationHistory(patternId: string): Promise<PatternApplicationHistory[]> {
  return await db
    .select()
    .from(patternApplicationHistory)
    .where(eq(patternApplicationHistory.patternId, patternId))
    .orderBy(desc(patternApplicationHistory.createdAt));
}

export async function updateApplicationFeedback(
  id: string,
  rating: number,
  wasUsed: boolean,
  feedback?: string,
): Promise<PatternApplicationHistory> {
  const [result] = await db
    .update(patternApplicationHistory)
    .set({
      userRating: rating,
      wasUsed,
      feedback,
    })
    .where(eq(patternApplicationHistory.id, id))
    .returning();
  return result!;
}
