import {
  type ProductPriority,
  type InsertProductPriority,
  type BusinessIntelligence,
  type InsertBusinessIntelligence,
  type BrandDNA,
  type InsertBrandDNA,
  type GenerationPerformance,
  type InsertGenerationPerformance,
  productPriorities,
  businessIntelligence,
  brandDNA,
  generationPerformance,
} from '@shared/schema';
import { db } from '../db';
import { and, eq, sql, desc } from 'drizzle-orm';

// ============================================
// PRODUCT PRIORITY OPERATIONS
// ============================================

export async function getProductPriorities(userId: string): Promise<ProductPriority[]> {
  return db.select().from(productPriorities).where(eq(productPriorities.userId, userId));
}

export async function getProductPriority(userId: string, productId: string): Promise<ProductPriority | undefined> {
  const [result] = await db
    .select()
    .from(productPriorities)
    .where(and(eq(productPriorities.userId, userId), eq(productPriorities.productId, productId)));
  return result;
}

export async function upsertProductPriority(data: InsertProductPriority): Promise<ProductPriority> {
  const rows = await db
    .insert(productPriorities)
    .values(data as typeof productPriorities.$inferInsert)
    .onConflictDoUpdate({
      target: [productPriorities.userId, productPriorities.productId],
      set: {
        revenueTier: data.revenueTier,
        revenueWeight: data.revenueWeight,
        competitiveAngle: data.competitiveAngle,
        keySellingPoints: data.keySellingPoints as typeof productPriorities.$inferInsert.keySellingPoints,
        monthlyTarget: data.monthlyTarget,
        seasonalRelevance: data.seasonalRelevance as typeof productPriorities.$inferInsert.seasonalRelevance,
        updatedAt: new Date(),
      },
    })
    .returning();
  const result = rows[0];
  if (!result) throw new Error('Failed to upsert product priority');
  return result;
}

export async function bulkUpsertPriorities(
  userId: string,
  priorities: Array<{
    productId: string;
    revenueTier: string;
    revenueWeight: number;
  }>,
): Promise<void> {
  for (const p of priorities) {
    await db
      .insert(productPriorities)
      .values({
        userId,
        productId: p.productId,
        revenueTier: p.revenueTier,
        revenueWeight: p.revenueWeight,
      })
      .onConflictDoUpdate({
        target: [productPriorities.userId, productPriorities.productId],
        set: {
          revenueTier: p.revenueTier,
          revenueWeight: p.revenueWeight,
          updatedAt: new Date(),
        },
      });
  }
}

export async function deleteProductPriority(userId: string, productId: string): Promise<void> {
  await db
    .delete(productPriorities)
    .where(and(eq(productPriorities.userId, userId), eq(productPriorities.productId, productId)));
}

export async function trackPostCreated(userId: string, productId: string): Promise<void> {
  await db
    .update(productPriorities)
    .set({
      totalPosts: sql`${productPriorities.totalPosts} + 1`,
      lastPostedDate: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(productPriorities.userId, userId), eq(productPriorities.productId, productId)));
}

// ============================================
// BUSINESS INTELLIGENCE OPERATIONS
// ============================================

export async function getBusinessIntelligence(userId: string): Promise<BusinessIntelligence | undefined> {
  const [result] = await db.select().from(businessIntelligence).where(eq(businessIntelligence.userId, userId));
  return result;
}

export async function upsertBusinessIntelligence(
  userId: string,
  data: Partial<InsertBusinessIntelligence>,
): Promise<BusinessIntelligence> {
  const rows = await db
    .insert(businessIntelligence)
    .values({ ...data, userId } as typeof businessIntelligence.$inferInsert)
    .onConflictDoUpdate({
      target: [businessIntelligence.userId],
      set: {
        ...data,
        updatedAt: new Date(),
      } as Partial<typeof businessIntelligence.$inferInsert>,
    })
    .returning();
  const result = rows[0];
  if (!result) throw new Error('Failed to upsert business intelligence');
  return result;
}

export async function deleteBusinessIntelligence(userId: string): Promise<void> {
  await db.delete(businessIntelligence).where(eq(businessIntelligence.userId, userId));
}

// ============================================
// BRAND DNA OPERATIONS (Phase 5)
// ============================================

export async function getBrandDNA(userId: string): Promise<BrandDNA | null> {
  const [result] = await db.select().from(brandDNA).where(eq(brandDNA.userId, userId));
  return result ?? null;
}

export async function upsertBrandDNA(userId: string, data: Partial<InsertBrandDNA>): Promise<BrandDNA> {
  const rows = await db
    .insert(brandDNA)
    .values({
      userId,
      visualSignature: data.visualSignature ?? null,
      toneAnalysis: data.toneAnalysis ?? null,
      audienceProfile: data.audienceProfile ?? null,
      competitorDiff: data.competitorDiff ?? null,
      contentRules: data.contentRules ?? null,
      version: data.version ?? 1,
      analyzedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [brandDNA.userId],
      set: {
        visualSignature: data.visualSignature ?? sql`${brandDNA.visualSignature}`,
        toneAnalysis: data.toneAnalysis ?? sql`${brandDNA.toneAnalysis}`,
        audienceProfile: data.audienceProfile ?? sql`${brandDNA.audienceProfile}`,
        competitorDiff: data.competitorDiff ?? sql`${brandDNA.competitorDiff}`,
        contentRules: data.contentRules ?? sql`${brandDNA.contentRules}`,
        version: sql`${brandDNA.version} + 1`,
        analyzedAt: new Date(),
      },
    })
    .returning();
  const result = rows[0];
  if (!result) throw new Error('Failed to upsert brand DNA');
  return result;
}

// ============================================
// GENERATION PERFORMANCE OPERATIONS (Phase 5)
// ============================================

export async function getGenerationPerformance(generationId: string): Promise<GenerationPerformance[]> {
  return db
    .select()
    .from(generationPerformance)
    .where(eq(generationPerformance.generationId, generationId))
    .orderBy(desc(generationPerformance.fetchedAt));
}

export async function saveGenerationPerformance(data: InsertGenerationPerformance): Promise<GenerationPerformance> {
  const rows = await db.insert(generationPerformance).values(data).returning();
  const result = rows[0];
  if (!result) throw new Error('Failed to save generation performance');
  return result;
}
