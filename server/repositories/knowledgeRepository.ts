import {
  type InstallationScenario,
  type InsertInstallationScenario,
  type ProductRelationship,
  type InsertProductRelationship,
  type BrandImage,
  type InsertBrandImage,
  installationScenarios,
  productRelationships,
  brandImages,
} from '@shared/schema';
import { db } from '../db';
import { and, eq, desc, inArray, or, arrayContains, sql } from 'drizzle-orm';

// ============================================
// INSTALLATION SCENARIO OPERATIONS
// ============================================

export async function createInstallationScenario(
  insertScenario: InsertInstallationScenario,
): Promise<InstallationScenario> {
  const [scenario] = await db.insert(installationScenarios).values(insertScenario).returning();
  return scenario;
}

export async function getInstallationScenarioById(id: string): Promise<InstallationScenario | undefined> {
  const [scenario] = await db.select().from(installationScenarios).where(eq(installationScenarios.id, id));
  return scenario;
}

export async function getInstallationScenariosByUser(userId: string): Promise<InstallationScenario[]> {
  return await db
    .select()
    .from(installationScenarios)
    .where(eq(installationScenarios.userId, userId))
    .orderBy(desc(installationScenarios.createdAt));
}

export async function getInstallationScenariosForProducts(productIds: string[]): Promise<InstallationScenario[]> {
  if (productIds.length === 0) return [];

  return await db
    .select()
    .from(installationScenarios)
    .where(
      and(
        eq(installationScenarios.isActive, true),
        or(
          inArray(installationScenarios.primaryProductId, productIds),
          sql`${installationScenarios.secondaryProductIds} && ARRAY[${sql.join(
            productIds.map((id) => sql`${id}`),
            sql`, `,
          )}]::text[]`,
        ),
      ),
    )
    .orderBy(desc(installationScenarios.createdAt));
}

export async function getScenariosByRoomType(roomType: string): Promise<InstallationScenario[]> {
  return await db
    .select()
    .from(installationScenarios)
    .where(and(eq(installationScenarios.isActive, true), arrayContains(installationScenarios.roomTypes, [roomType])))
    .orderBy(desc(installationScenarios.createdAt));
}

export async function updateInstallationScenario(
  id: string,
  updates: Partial<InsertInstallationScenario>,
): Promise<InstallationScenario> {
  const [scenario] = await db
    .update(installationScenarios)
    .set(updates)
    .where(eq(installationScenarios.id, id))
    .returning();
  return scenario;
}

export async function deleteInstallationScenario(id: string): Promise<void> {
  await db.delete(installationScenarios).where(eq(installationScenarios.id, id));
}

// ============================================
// PRODUCT RELATIONSHIP OPERATIONS
// ============================================

export async function createProductRelationship(
  insertRelationship: InsertProductRelationship,
): Promise<ProductRelationship> {
  const [relationship] = await db.insert(productRelationships).values(insertRelationship).returning();
  return relationship;
}

export async function getProductRelationships(productIds: string[]): Promise<ProductRelationship[]> {
  if (productIds.length === 0) return [];
  return await db
    .select()
    .from(productRelationships)
    .where(
      or(
        inArray(productRelationships.sourceProductId, productIds),
        inArray(productRelationships.targetProductId, productIds),
      ),
    )
    .orderBy(productRelationships.displayOrder);
}

export async function getProductRelationshipsByType(
  productId: string,
  relationshipType: string,
): Promise<ProductRelationship[]> {
  return await db
    .select()
    .from(productRelationships)
    .where(
      and(
        eq(productRelationships.sourceProductId, productId),
        eq(productRelationships.relationshipType, relationshipType),
      ),
    )
    .orderBy(productRelationships.displayOrder);
}

export async function deleteProductRelationship(id: string): Promise<void> {
  await db.delete(productRelationships).where(eq(productRelationships.id, id));
}

// ============================================
// BRAND IMAGE OPERATIONS
// ============================================

export async function createBrandImage(insertImage: InsertBrandImage): Promise<BrandImage> {
  const [image] = await db.insert(brandImages).values(insertImage).returning();
  return image;
}

export async function getBrandImagesByUser(
  userId: string,
  limit: number = 50,
  offset: number = 0,
): Promise<BrandImage[]> {
  return await db
    .select()
    .from(brandImages)
    .where(eq(brandImages.userId, userId))
    .orderBy(desc(brandImages.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getBrandImagesForProducts(productIds: string[], userId: string): Promise<BrandImage[]> {
  if (productIds.length === 0) return [];

  return await db
    .select()
    .from(brandImages)
    .where(
      and(
        eq(brandImages.userId, userId),
        sql`${brandImages.productIds} && ARRAY[${sql.join(
          productIds.map((id) => sql`${id}`),
          sql`, `,
        )}]::text[]`,
      ),
    )
    .orderBy(desc(brandImages.createdAt));
}

export async function getBrandImagesByCategory(userId: string, category: string): Promise<BrandImage[]> {
  return await db
    .select()
    .from(brandImages)
    .where(and(eq(brandImages.userId, userId), eq(brandImages.category, category)))
    .orderBy(desc(brandImages.createdAt));
}

export async function updateBrandImage(id: string, updates: Partial<InsertBrandImage>): Promise<BrandImage> {
  const [image] = await db.update(brandImages).set(updates).where(eq(brandImages.id, id)).returning();
  return image;
}

export async function deleteBrandImage(id: string): Promise<void> {
  await db.delete(brandImages).where(eq(brandImages.id, id));
}
