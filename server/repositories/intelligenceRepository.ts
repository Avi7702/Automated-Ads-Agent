import {
  type ProductPriority,
  type InsertProductPriority,
  type BusinessIntelligence,
  type InsertBusinessIntelligence,
  productPriorities,
  businessIntelligence,
} from '@shared/schema';
import { db } from '../db';
import { and, eq, sql } from 'drizzle-orm';

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
    .values(data)
    .onConflictDoUpdate({
      target: [productPriorities.userId, productPriorities.productId],
      set: {
        revenueTier: data.revenueTier,
        revenueWeight: data.revenueWeight,
        competitiveAngle: data.competitiveAngle,
        keySellingPoints: data.keySellingPoints,
        monthlyTarget: data.monthlyTarget,
        seasonalRelevance: data.seasonalRelevance,
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
    .values({ ...data, userId })
    .onConflictDoUpdate({
      target: [businessIntelligence.userId],
      set: {
        ...data,
        updatedAt: new Date(),
      },
    })
    .returning();
  const result = rows[0];
  if (!result) throw new Error('Failed to upsert business intelligence');
  return result;
}

export async function deleteBusinessIntelligence(userId: string): Promise<void> {
  await db.delete(businessIntelligence).where(eq(businessIntelligence.userId, userId));
}
