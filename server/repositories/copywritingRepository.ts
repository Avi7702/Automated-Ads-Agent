import {
  type AdCopy,
  type InsertAdCopy,
  type BrandProfile,
  type InsertBrandProfile,
  adCopy,
  brandProfiles,
} from "@shared/schema";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";

// ============================================
// AD COPY OPERATIONS
// ============================================

export async function saveAdCopy(insertCopy: InsertAdCopy): Promise<AdCopy> {
  const [copy] = await db
    .insert(adCopy)
    .values(insertCopy)
    .returning();
  return copy;
}

export async function getAdCopyByGenerationId(generationId: string): Promise<AdCopy[]> {
  return await db
    .select()
    .from(adCopy)
    .where(eq(adCopy.generationId, generationId))
    .orderBy(desc(adCopy.createdAt));
}

export async function getAdCopyById(id: string): Promise<AdCopy | undefined> {
  const [copy] = await db
    .select()
    .from(adCopy)
    .where(eq(adCopy.id, id));
  return copy;
}

export async function deleteAdCopy(id: string): Promise<void> {
  await db.delete(adCopy).where(eq(adCopy.id, id));
}

export async function getCopyVariations(parentCopyId: string): Promise<AdCopy[]> {
  return await db
    .select()
    .from(adCopy)
    .where(eq(adCopy.parentCopyId, parentCopyId))
    .orderBy(adCopy.variationNumber);
}

// ============================================
// BRAND PROFILE OPERATIONS
// ============================================

export async function saveBrandProfile(insertProfile: InsertBrandProfile): Promise<BrandProfile> {
  const [profile] = await db
    .insert(brandProfiles)
    .values(insertProfile)
    .returning();
  return profile;
}

export async function getBrandProfileByUserId(userId: string): Promise<BrandProfile | undefined> {
  const [profile] = await db
    .select()
    .from(brandProfiles)
    .where(eq(brandProfiles.userId, userId));
  return profile;
}

export async function updateBrandProfile(userId: string, updates: Partial<InsertBrandProfile>): Promise<BrandProfile> {
  const [profile] = await db
    .update(brandProfiles)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(brandProfiles.userId, userId))
    .returning();
  return profile;
}

export async function deleteBrandProfile(userId: string): Promise<void> {
  await db.delete(brandProfiles).where(eq(brandProfiles.userId, userId));
}
