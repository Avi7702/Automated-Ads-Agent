import {
  type Product,
  type InsertProduct,
  type ProductAnalysis,
  type InsertProductAnalysis,
  products,
  productAnalyses,
} from '@shared/schema';
import { db } from '../db';
import { eq, desc, inArray, arrayContains } from 'drizzle-orm';

// ============================================
// PRODUCT CRUD OPERATIONS
// ============================================

export async function saveProduct(insertProduct: InsertProduct): Promise<Product> {
  const [product] = await db.insert(products).values(insertProduct).returning();
  return product;
}

export async function getProducts(limit: number = 50, offset: number = 0): Promise<Product[]> {
  return await db.select().from(products).orderBy(desc(products.createdAt)).limit(limit).offset(offset);
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const [product] = await db.select().from(products).where(eq(products.id, id));
  return product;
}

export async function deleteProduct(id: string): Promise<void> {
  await db.delete(products).where(eq(products.id, id));
}

export async function updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product> {
  const [product] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
  return product;
}

export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  return await db.select().from(products).where(inArray(products.id, ids));
}

export async function searchProductsByTag(tag: string): Promise<Product[]> {
  return await db
    .select()
    .from(products)
    .where(arrayContains(products.tags, [tag]))
    .orderBy(desc(products.createdAt));
}

// ============================================
// PRODUCT ANALYSIS OPERATIONS
// ============================================

export async function saveProductAnalysis(insertAnalysis: InsertProductAnalysis): Promise<ProductAnalysis> {
  const [analysis] = await db.insert(productAnalyses).values(insertAnalysis).returning();
  return analysis;
}

export async function getProductAnalysisByProductId(productId: string): Promise<ProductAnalysis | undefined> {
  const [analysis] = await db.select().from(productAnalyses).where(eq(productAnalyses.productId, productId));
  return analysis;
}

export async function getProductAnalysisByFingerprint(fingerprint: string): Promise<ProductAnalysis | undefined> {
  const [analysis] = await db.select().from(productAnalyses).where(eq(productAnalyses.imageFingerprint, fingerprint));
  return analysis;
}

export async function updateProductAnalysis(
  productId: string,
  updates: Partial<InsertProductAnalysis>,
): Promise<ProductAnalysis> {
  const [analysis] = await db
    .update(productAnalyses)
    .set({ ...updates, analyzedAt: new Date() })
    .where(eq(productAnalyses.productId, productId))
    .returning();
  return analysis;
}

export async function deleteProductAnalysis(productId: string): Promise<void> {
  await db.delete(productAnalyses).where(eq(productAnalyses.productId, productId));
}
