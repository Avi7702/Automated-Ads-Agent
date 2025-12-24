import {
  type Generation,
  type InsertGeneration,
  type Product,
  type InsertProduct,
  type PromptTemplate,
  type InsertPromptTemplate,
  type User,
  type InsertUser,
  type AdCopy,
  type InsertAdCopy,
  type GenerationUsage,
  type InsertGenerationUsage,
  type AdSceneTemplate,
  type InsertAdSceneTemplate,
  type BrandProfile,
  type InsertBrandProfile,
  type ProductAnalysis,
  type InsertProductAnalysis,
  generations,
  generationUsage,
  products,
  promptTemplates,
  users,
  adCopy,
  adSceneTemplates,
  brandProfiles,
  productAnalyses,
} from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { and, eq, desc, ilike } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const sql = neon(process.env.DATABASE_URL);
const db = drizzle(sql);

export interface IStorage {
  // Generation CRUD operations
  saveGeneration(generation: InsertGeneration): Promise<Generation>;
  getGenerations(limit?: number): Promise<Generation[]>;
  getGenerationById(id: string): Promise<Generation | undefined>;
  deleteGeneration(id: string): Promise<void>;
  getEditHistory(generationId: string): Promise<Generation[]>;
  
  // Product CRUD operations
  saveProduct(product: InsertProduct): Promise<Product>;
  getProducts(): Promise<Product[]>;
  getProductById(id: string): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
  
  // Prompt Template CRUD operations
  savePromptTemplate(template: InsertPromptTemplate): Promise<PromptTemplate>;
  getPromptTemplates(category?: string): Promise<PromptTemplate[]>;
  getPromptTemplateById(id: string): Promise<PromptTemplate | undefined>;
  deletePromptTemplate(id: string): Promise<void>;
  
  // User CRUD operations
  createUser(user: InsertUser): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUserBrandVoice(userId: string, brandVoice: any): Promise<User>;

  // AdCopy CRUD operations
  saveAdCopy(copy: InsertAdCopy): Promise<AdCopy>;
  getAdCopyByGenerationId(generationId: string): Promise<AdCopy[]>;
  getAdCopyById(id: string): Promise<AdCopy | undefined>;
  deleteAdCopy(id: string): Promise<void>;
  getCopyVariations(parentCopyId: string): Promise<AdCopy[]>;

  // Generation usage/cost tracking
  saveGenerationUsage(usage: InsertGenerationUsage): Promise<GenerationUsage>;
  getGenerationUsageRows(params: {
    brandId: string;
    operation: string;
    resolution: string;
    inputImagesCount: number;
    limit?: number;
  }): Promise<{ estimatedCostMicros: number; createdAt: Date }[]>;

  // ============================================
  // INTELLIGENT IDEA BANK OPERATIONS
  // ============================================

  // Ad Scene Template CRUD operations
  saveAdSceneTemplate(template: InsertAdSceneTemplate): Promise<AdSceneTemplate>;
  getAdSceneTemplates(filters?: {
    category?: string;
    isGlobal?: boolean;
    createdBy?: string;
  }): Promise<AdSceneTemplate[]>;
  getAdSceneTemplateById(id: string): Promise<AdSceneTemplate | undefined>;
  updateAdSceneTemplate(id: string, updates: Partial<InsertAdSceneTemplate>): Promise<AdSceneTemplate>;
  deleteAdSceneTemplate(id: string): Promise<void>;
  searchAdSceneTemplates(query: string): Promise<AdSceneTemplate[]>;

  // Brand Profile CRUD operations
  saveBrandProfile(profile: InsertBrandProfile): Promise<BrandProfile>;
  getBrandProfileByUserId(userId: string): Promise<BrandProfile | undefined>;
  updateBrandProfile(userId: string, updates: Partial<InsertBrandProfile>): Promise<BrandProfile>;
  deleteBrandProfile(userId: string): Promise<void>;

  // Product Analysis CRUD operations
  saveProductAnalysis(analysis: InsertProductAnalysis): Promise<ProductAnalysis>;
  getProductAnalysisByProductId(productId: string): Promise<ProductAnalysis | undefined>;
  getProductAnalysisByFingerprint(fingerprint: string): Promise<ProductAnalysis | undefined>;
  updateProductAnalysis(productId: string, updates: Partial<InsertProductAnalysis>): Promise<ProductAnalysis>;
  deleteProductAnalysis(productId: string): Promise<void>;
}

export class DbStorage implements IStorage {
  async saveGeneration(insertGeneration: InsertGeneration): Promise<Generation> {
    const [generation] = await db
      .insert(generations)
      .values(insertGeneration)
      .returning();
    return generation;
  }

  async getGenerations(limit: number = 50): Promise<Generation[]> {
    // Exclude conversationHistory to avoid exceeding Neon's 64MB response limit
    const results = await db
      .select({
        id: generations.id,
        prompt: generations.prompt,
        originalImagePaths: generations.originalImagePaths,
        generatedImagePath: generations.generatedImagePath,
        resolution: generations.resolution,
        parentGenerationId: generations.parentGenerationId,
        editPrompt: generations.editPrompt,
        createdAt: generations.createdAt,
      })
      .from(generations)
      .orderBy(desc(generations.createdAt))
      .limit(limit);
    
    // Return with null conversationHistory (not needed for gallery view)
    return results.map(r => ({ ...r, conversationHistory: null })) as Generation[];
  }

  async getGenerationById(id: string): Promise<Generation | undefined> {
    const [generation] = await db
      .select()
      .from(generations)
      .where(eq(generations.id, id));
    return generation;
  }

  async deleteGeneration(id: string): Promise<void> {
    await db.delete(generations).where(eq(generations.id, id));
  }

  async saveProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async getProducts(): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .orderBy(desc(products.createdAt));
  }

  async getProductById(id: string): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async savePromptTemplate(insertTemplate: InsertPromptTemplate): Promise<PromptTemplate> {
    const [template] = await db
      .insert(promptTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async getPromptTemplates(category?: string): Promise<PromptTemplate[]> {
    if (category) {
      return await db
        .select()
        .from(promptTemplates)
        .where(eq(promptTemplates.category, category))
        .orderBy(desc(promptTemplates.createdAt));
    }
    return await db
      .select()
      .from(promptTemplates)
      .orderBy(desc(promptTemplates.createdAt));
  }

  async getPromptTemplateById(id: string): Promise<PromptTemplate | undefined> {
    const [template] = await db
      .select()
      .from(promptTemplates)
      .where(eq(promptTemplates.id, id));
    return template;
  }

  async deletePromptTemplate(id: string): Promise<void> {
    await db.delete(promptTemplates).where(eq(promptTemplates.id, id));
  }

  async getEditHistory(generationId: string): Promise<Generation[]> {
    const history: Generation[] = [];
    let currentId: string | null = generationId;

    while (currentId) {
      const generation = await this.getGenerationById(currentId);
      if (!generation) break;

      history.push(generation);
      currentId = generation.parentGenerationId;
    }

    return history.reverse(); // Oldest first
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id));
    return user;
  }

  async updateUserBrandVoice(userId: string, brandVoice: any): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ brandVoice })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async saveAdCopy(insertCopy: InsertAdCopy): Promise<AdCopy> {
    const [copy] = await db
      .insert(adCopy)
      .values(insertCopy)
      .returning();
    return copy;
  }

  async getAdCopyByGenerationId(generationId: string): Promise<AdCopy[]> {
    return await db
      .select()
      .from(adCopy)
      .where(eq(adCopy.generationId, generationId))
      .orderBy(desc(adCopy.createdAt));
  }

  async getAdCopyById(id: string): Promise<AdCopy | undefined> {
    const [copy] = await db
      .select()
      .from(adCopy)
      .where(eq(adCopy.id, id));
    return copy;
  }

  async deleteAdCopy(id: string): Promise<void> {
    await db.delete(adCopy).where(eq(adCopy.id, id));
  }

  async getCopyVariations(parentCopyId: string): Promise<AdCopy[]> {
    return await db
      .select()
      .from(adCopy)
      .where(eq(adCopy.parentCopyId, parentCopyId))
      .orderBy(adCopy.variationNumber);
  }

  async saveGenerationUsage(insertUsage: InsertGenerationUsage): Promise<GenerationUsage> {
    const [usage] = await db
      .insert(generationUsage)
      .values(insertUsage)
      .returning();
    return usage;
  }

  async getGenerationUsageRows(params: {
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

  // ============================================
  // AD SCENE TEMPLATE OPERATIONS
  // ============================================

  async saveAdSceneTemplate(insertTemplate: InsertAdSceneTemplate): Promise<AdSceneTemplate> {
    const [template] = await db
      .insert(adSceneTemplates)
      .values(insertTemplate)
      .returning();
    return template;
  }

  async getAdSceneTemplates(filters?: {
    category?: string;
    isGlobal?: boolean;
    createdBy?: string;
  }): Promise<AdSceneTemplate[]> {
    const conditions = [];

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
        .orderBy(desc(adSceneTemplates.createdAt));
    }

    return await db
      .select()
      .from(adSceneTemplates)
      .orderBy(desc(adSceneTemplates.createdAt));
  }

  async getAdSceneTemplateById(id: string): Promise<AdSceneTemplate | undefined> {
    const [template] = await db
      .select()
      .from(adSceneTemplates)
      .where(eq(adSceneTemplates.id, id));
    return template;
  }

  async updateAdSceneTemplate(id: string, updates: Partial<InsertAdSceneTemplate>): Promise<AdSceneTemplate> {
    const [template] = await db
      .update(adSceneTemplates)
      .set(updates)
      .where(eq(adSceneTemplates.id, id))
      .returning();
    return template;
  }

  async deleteAdSceneTemplate(id: string): Promise<void> {
    await db.delete(adSceneTemplates).where(eq(adSceneTemplates.id, id));
  }

  async searchAdSceneTemplates(query: string): Promise<AdSceneTemplate[]> {
    // Search in title, description, and tags
    const searchTerm = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(adSceneTemplates)
      .where(
        ilike(adSceneTemplates.title, searchTerm)
      )
      .orderBy(desc(adSceneTemplates.createdAt));
  }

  // ============================================
  // BRAND PROFILE OPERATIONS
  // ============================================

  async saveBrandProfile(insertProfile: InsertBrandProfile): Promise<BrandProfile> {
    const [profile] = await db
      .insert(brandProfiles)
      .values(insertProfile)
      .returning();
    return profile;
  }

  async getBrandProfileByUserId(userId: string): Promise<BrandProfile | undefined> {
    const [profile] = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.userId, userId));
    return profile;
  }

  async updateBrandProfile(userId: string, updates: Partial<InsertBrandProfile>): Promise<BrandProfile> {
    const [profile] = await db
      .update(brandProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(brandProfiles.userId, userId))
      .returning();
    return profile;
  }

  async deleteBrandProfile(userId: string): Promise<void> {
    await db.delete(brandProfiles).where(eq(brandProfiles.userId, userId));
  }

  // ============================================
  // PRODUCT ANALYSIS OPERATIONS
  // ============================================

  async saveProductAnalysis(insertAnalysis: InsertProductAnalysis): Promise<ProductAnalysis> {
    const [analysis] = await db
      .insert(productAnalyses)
      .values(insertAnalysis)
      .returning();
    return analysis;
  }

  async getProductAnalysisByProductId(productId: string): Promise<ProductAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(productAnalyses)
      .where(eq(productAnalyses.productId, productId));
    return analysis;
  }

  async getProductAnalysisByFingerprint(fingerprint: string): Promise<ProductAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(productAnalyses)
      .where(eq(productAnalyses.imageFingerprint, fingerprint));
    return analysis;
  }

  async updateProductAnalysis(productId: string, updates: Partial<InsertProductAnalysis>): Promise<ProductAnalysis> {
    const [analysis] = await db
      .update(productAnalyses)
      .set({ ...updates, analyzedAt: new Date() })
      .where(eq(productAnalyses.productId, productId))
      .returning();
    return analysis;
  }

  async deleteProductAnalysis(productId: string): Promise<void> {
    await db.delete(productAnalyses).where(eq(productAnalyses.productId, productId));
  }
}

export const storage = new DbStorage();





