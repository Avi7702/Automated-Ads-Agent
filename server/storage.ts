import { 
  type Generation, 
  type InsertGeneration, 
  type Product,
  type InsertProduct,
  type PromptTemplate,
  type InsertPromptTemplate,
  type User,
  type InsertUser,
  type Session,
  type InsertSession,
  type AdCopy,
  type InsertAdCopy,
  type BrandProfile,
  type InsertBrandProfile,
  type ProductAnalysis,
  type InsertProductAnalysis,
  generations,
  products,
  promptTemplates,
  users,
  sessions,
  adCopy,
  brandProfiles,
  productAnalysis
} from "@shared/schema";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, desc, and, gt, inArray } from "drizzle-orm";

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
  createUser(email: string, passwordHash: string): Promise<User>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserById(id: string): Promise<User | undefined>;
  updateUserBrandVoice(userId: string, brandVoice: any): Promise<User | undefined>;
  incrementFailedAttempts(userId: string): Promise<void>;
  resetFailedAttempts(userId: string): Promise<void>;
  
  // Session CRUD operations
  createSession(userId: string, sessionId: string, expiresAt: Date): Promise<Session>;
  getSession(sessionId: string): Promise<Session | undefined>;
  deleteSession(sessionId: string): Promise<void>;
  deleteAllUserSessions(userId: string): Promise<void>;
  
  // Ad Copy CRUD operations
  saveAdCopy(copy: InsertAdCopy): Promise<AdCopy>;
  getAdCopyByGenerationId(generationId: string): Promise<AdCopy[]>;
  getAdCopyById(id: string): Promise<AdCopy | undefined>;
  deleteAdCopy(id: string): Promise<void>;
  
  // Brand Profile CRUD operations
  saveBrandProfile(profile: InsertBrandProfile): Promise<BrandProfile>;
  getBrandProfiles(): Promise<BrandProfile[]>;
  getDefaultBrandProfile(): Promise<BrandProfile | undefined>;
  getBrandProfileById(id: string): Promise<BrandProfile | undefined>;
  updateBrandProfile(id: string, profile: Partial<InsertBrandProfile>): Promise<BrandProfile | undefined>;
  deleteBrandProfile(id: string): Promise<void>;
  
  // Product Analysis CRUD operations
  saveProductAnalysis(analysis: InsertProductAnalysis): Promise<ProductAnalysis>;
  getProductAnalysisByProductId(productId: string): Promise<ProductAnalysis | undefined>;
  getProductAnalysesByProductIds(productIds: string[]): Promise<ProductAnalysis[]>;
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
        cost: generations.cost,
        inputTokens: generations.inputTokens,
        outputTokens: generations.outputTokens,
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

  async createUser(email: string, passwordHash: string): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({ email, passwordHash })
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

  async updateUserBrandVoice(userId: string, brandVoice: any): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ brandVoice })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async incrementFailedAttempts(userId: string): Promise<void> {
    const user = await this.getUserById(userId);
    if (!user) return;
    
    const newAttempts = (user.failedAttempts || 0) + 1;
    const MAX_FAILED_ATTEMPTS = 5;
    const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
    
    const lockedUntil = newAttempts >= MAX_FAILED_ATTEMPTS 
      ? new Date(Date.now() + LOCKOUT_DURATION_MS) 
      : null;
    
    await db
      .update(users)
      .set({ failedAttempts: newAttempts, lockedUntil })
      .where(eq(users.id, userId));
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    await db
      .update(users)
      .set({ failedAttempts: 0, lockedUntil: null })
      .where(eq(users.id, userId));
  }

  async createSession(userId: string, sessionId: string, expiresAt: Date): Promise<Session> {
    const [session] = await db
      .insert(sessions)
      .values({ id: sessionId, userId, expiresAt })
      .returning();
    return session;
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const [session] = await db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())));
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async deleteAllUserSessions(userId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.userId, userId));
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

  // Brand Profile CRUD
  async saveBrandProfile(insertProfile: InsertBrandProfile): Promise<BrandProfile> {
    const [profile] = await db
      .insert(brandProfiles)
      .values(insertProfile)
      .returning();
    return profile;
  }

  async getBrandProfiles(): Promise<BrandProfile[]> {
    return await db
      .select()
      .from(brandProfiles)
      .orderBy(desc(brandProfiles.createdAt));
  }

  async getDefaultBrandProfile(): Promise<BrandProfile | undefined> {
    const [profile] = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.isDefault, 1));
    return profile;
  }

  async getBrandProfileById(id: string): Promise<BrandProfile | undefined> {
    const [profile] = await db
      .select()
      .from(brandProfiles)
      .where(eq(brandProfiles.id, id));
    return profile;
  }

  async updateBrandProfile(id: string, updates: Partial<InsertBrandProfile>): Promise<BrandProfile | undefined> {
    const [profile] = await db
      .update(brandProfiles)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(brandProfiles.id, id))
      .returning();
    return profile;
  }

  async deleteBrandProfile(id: string): Promise<void> {
    await db.delete(brandProfiles).where(eq(brandProfiles.id, id));
  }

  // Product Analysis CRUD
  async saveProductAnalysis(insertAnalysis: InsertProductAnalysis): Promise<ProductAnalysis> {
    // Upsert - replace existing analysis for this product
    await db.delete(productAnalysis).where(eq(productAnalysis.productId, insertAnalysis.productId));
    const [analysis] = await db
      .insert(productAnalysis)
      .values(insertAnalysis)
      .returning();
    return analysis;
  }

  async getProductAnalysisByProductId(productId: string): Promise<ProductAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(productAnalysis)
      .where(eq(productAnalysis.productId, productId));
    return analysis;
  }

  async getProductAnalysesByProductIds(productIds: string[]): Promise<ProductAnalysis[]> {
    if (productIds.length === 0) return [];
    return await db
      .select()
      .from(productAnalysis)
      .where(inArray(productAnalysis.productId, productIds));
  }

  async deleteProductAnalysis(productId: string): Promise<void> {
    await db.delete(productAnalysis).where(eq(productAnalysis.productId, productId));
  }
}

export const storage = new DbStorage();
