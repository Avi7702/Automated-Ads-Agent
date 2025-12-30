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
  // Phase 0.5: Product Knowledge types
  type InstallationScenario,
  type InsertInstallationScenario,
  type ProductRelationship,
  type InsertProductRelationship,
  type BrandImage,
  type InsertBrandImage,
  // Quota monitoring types
  type GeminiQuotaMetrics,
  type InsertGeminiQuotaMetrics,
  type GeminiRateLimitEvent,
  type InsertGeminiRateLimitEvent,
  type GeminiQuotaAlert,
  type InsertGeminiQuotaAlert,
  // Google Cloud Monitoring sync types
  type GoogleQuotaSnapshot,
  type InsertGoogleQuotaSnapshot,
  type GoogleQuotaSyncHistory,
  type InsertGoogleQuotaSyncHistory,
  generations,
  generationUsage,
  products,
  promptTemplates,
  users,
  adCopy,
  adSceneTemplates,
  brandProfiles,
  productAnalyses,
  // Phase 0.5: Product Knowledge tables
  installationScenarios,
  productRelationships,
  brandImages,
  // Quota monitoring tables
  geminiQuotaMetrics,
  geminiRateLimitEvents,
  geminiQuotaAlerts,
  // Google Cloud Monitoring sync tables
  googleQuotaSnapshots,
  googleQuotaSyncHistory,
} from "@shared/schema";
import { db } from "./db";
import { and, eq, desc, ilike, inArray, or, arrayContains, gte, lte, sql } from "drizzle-orm";

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

  // ============================================
  // PHASE 0.5: PRODUCT KNOWLEDGE OPERATIONS
  // ============================================

  // Enhanced Product operations
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product>;
  getProductsByIds(ids: string[]): Promise<Product[]>;
  searchProductsByTag(tag: string): Promise<Product[]>;

  // Installation Scenario CRUD operations
  createInstallationScenario(scenario: InsertInstallationScenario): Promise<InstallationScenario>;
  getInstallationScenarioById(id: string): Promise<InstallationScenario | undefined>;
  getInstallationScenariosForProducts(productIds: string[]): Promise<InstallationScenario[]>;
  getScenariosByRoomType(roomType: string): Promise<InstallationScenario[]>;
  updateInstallationScenario(id: string, updates: Partial<InsertInstallationScenario>): Promise<InstallationScenario>;
  deleteInstallationScenario(id: string): Promise<void>;

  // Product Relationship CRUD operations
  createProductRelationship(relationship: InsertProductRelationship): Promise<ProductRelationship>;
  getProductRelationships(productIds: string[]): Promise<ProductRelationship[]>;
  getProductRelationshipsByType(productId: string, relationshipType: string): Promise<ProductRelationship[]>;
  deleteProductRelationship(id: string): Promise<void>;

  // Brand Image CRUD operations
  createBrandImage(image: InsertBrandImage): Promise<BrandImage>;
  getBrandImagesForProducts(productIds: string[], userId: string): Promise<BrandImage[]>;
  getBrandImagesByCategory(userId: string, category: string): Promise<BrandImage[]>;
  updateBrandImage(id: string, updates: Partial<InsertBrandImage>): Promise<BrandImage>;
  deleteBrandImage(id: string): Promise<void>;

  // ============================================
  // GEMINI QUOTA MONITORING OPERATIONS
  // ============================================

  // Quota Metrics CRUD operations
  upsertQuotaMetrics(metrics: InsertGeminiQuotaMetrics): Promise<GeminiQuotaMetrics>;
  getQuotaMetrics(params: {
    brandId: string;
    windowType: string;
    startDate: Date;
    endDate: Date;
  }): Promise<GeminiQuotaMetrics[]>;
  getLatestQuotaMetric(brandId: string, windowType: string): Promise<GeminiQuotaMetrics | undefined>;

  // Rate Limit Event operations
  createRateLimitEvent(event: InsertGeminiRateLimitEvent): Promise<GeminiRateLimitEvent>;
  getRecentRateLimitEvents(brandId: string, minutes: number): Promise<GeminiRateLimitEvent[]>;

  // Quota Alert operations
  getQuotaAlerts(brandId: string): Promise<GeminiQuotaAlert[]>;
  upsertQuotaAlert(alert: InsertGeminiQuotaAlert): Promise<GeminiQuotaAlert>;
  updateQuotaAlertTrigger(id: string): Promise<void>;

  // ============================================
  // GOOGLE CLOUD MONITORING SYNC OPERATIONS
  // ============================================

  // Google Quota Snapshot operations
  saveGoogleQuotaSnapshot(snapshot: InsertGoogleQuotaSnapshot): Promise<GoogleQuotaSnapshot>;
  getLatestGoogleQuotaSnapshot(brandId?: string): Promise<GoogleQuotaSnapshot | undefined>;
  getGoogleQuotaSnapshotHistory(params: {
    brandId?: string;
    startDate: Date;
    endDate: Date;
    limit?: number;
  }): Promise<GoogleQuotaSnapshot[]>;

  // Sync History operations
  createSyncHistoryEntry(entry: InsertGoogleQuotaSyncHistory): Promise<GoogleQuotaSyncHistory>;
  updateSyncHistoryEntry(id: string, updates: Partial<InsertGoogleQuotaSyncHistory>): Promise<GoogleQuotaSyncHistory>;
  getRecentSyncHistory(limit?: number): Promise<GoogleQuotaSyncHistory[]>;
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
      .values({ email, password: passwordHash, passwordHash })
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

  // ============================================
  // PHASE 0.5: ENHANCED PRODUCT OPERATIONS
  // ============================================

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product> {
    const [product] = await db
      .update(products)
      .set(updates)
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async getProductsByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];
    return await db
      .select()
      .from(products)
      .where(inArray(products.id, ids));
  }

  async searchProductsByTag(tag: string): Promise<Product[]> {
    return await db
      .select()
      .from(products)
      .where(arrayContains(products.tags, [tag]))
      .orderBy(desc(products.createdAt));
  }

  // ============================================
  // INSTALLATION SCENARIO OPERATIONS
  // ============================================

  async createInstallationScenario(insertScenario: InsertInstallationScenario): Promise<InstallationScenario> {
    const [scenario] = await db
      .insert(installationScenarios)
      .values(insertScenario)
      .returning();
    return scenario;
  }

  async getInstallationScenarioById(id: string): Promise<InstallationScenario | undefined> {
    const [scenario] = await db
      .select()
      .from(installationScenarios)
      .where(eq(installationScenarios.id, id));
    return scenario;
  }

  async getInstallationScenariosForProducts(productIds: string[]): Promise<InstallationScenario[]> {
    if (productIds.length === 0) return [];

    // Get scenarios where any of the productIds is the primary product
    // or is in the secondary products array
    return await db
      .select()
      .from(installationScenarios)
      .where(
        and(
          eq(installationScenarios.isActive, true),
          or(
            inArray(installationScenarios.primaryProductId, productIds),
            // For secondary products, we need to check array overlap
            // This is a simplified version - might need SQL function for full overlap check
          )
        )
      )
      .orderBy(desc(installationScenarios.createdAt));
  }

  async getScenariosByRoomType(roomType: string): Promise<InstallationScenario[]> {
    return await db
      .select()
      .from(installationScenarios)
      .where(
        and(
          eq(installationScenarios.isActive, true),
          arrayContains(installationScenarios.roomTypes, [roomType])
        )
      )
      .orderBy(desc(installationScenarios.createdAt));
  }

  async updateInstallationScenario(id: string, updates: Partial<InsertInstallationScenario>): Promise<InstallationScenario> {
    const [scenario] = await db
      .update(installationScenarios)
      .set(updates)
      .where(eq(installationScenarios.id, id))
      .returning();
    return scenario;
  }

  async deleteInstallationScenario(id: string): Promise<void> {
    await db.delete(installationScenarios).where(eq(installationScenarios.id, id));
  }

  // ============================================
  // PRODUCT RELATIONSHIP OPERATIONS
  // ============================================

  async createProductRelationship(insertRelationship: InsertProductRelationship): Promise<ProductRelationship> {
    const [relationship] = await db
      .insert(productRelationships)
      .values(insertRelationship)
      .returning();
    return relationship;
  }

  async getProductRelationships(productIds: string[]): Promise<ProductRelationship[]> {
    if (productIds.length === 0) return [];
    return await db
      .select()
      .from(productRelationships)
      .where(
        or(
          inArray(productRelationships.sourceProductId, productIds),
          inArray(productRelationships.targetProductId, productIds)
        )
      )
      .orderBy(productRelationships.displayOrder);
  }

  async getProductRelationshipsByType(productId: string, relationshipType: string): Promise<ProductRelationship[]> {
    return await db
      .select()
      .from(productRelationships)
      .where(
        and(
          eq(productRelationships.sourceProductId, productId),
          eq(productRelationships.relationshipType, relationshipType)
        )
      )
      .orderBy(productRelationships.displayOrder);
  }

  async deleteProductRelationship(id: string): Promise<void> {
    await db.delete(productRelationships).where(eq(productRelationships.id, id));
  }

  // ============================================
  // BRAND IMAGE OPERATIONS
  // ============================================

  async createBrandImage(insertImage: InsertBrandImage): Promise<BrandImage> {
    const [image] = await db
      .insert(brandImages)
      .values(insertImage)
      .returning();
    return image;
  }

  async getBrandImagesForProducts(productIds: string[], userId: string): Promise<BrandImage[]> {
    if (productIds.length === 0) return [];

    // Get images that have any of the productIds in their productIds array
    // and belong to the specified user
    const allImages = await db
      .select()
      .from(brandImages)
      .where(eq(brandImages.userId, userId))
      .orderBy(desc(brandImages.createdAt));

    // Filter images that contain any of the requested productIds
    return allImages.filter(img =>
      img.productIds?.some(pid => productIds.includes(pid))
    );
  }

  async getBrandImagesByCategory(userId: string, category: string): Promise<BrandImage[]> {
    return await db
      .select()
      .from(brandImages)
      .where(
        and(
          eq(brandImages.userId, userId),
          eq(brandImages.category, category)
        )
      )
      .orderBy(desc(brandImages.createdAt));
  }

  async updateBrandImage(id: string, updates: Partial<InsertBrandImage>): Promise<BrandImage> {
    const [image] = await db
      .update(brandImages)
      .set(updates)
      .where(eq(brandImages.id, id))
      .returning();
    return image;
  }

  async deleteBrandImage(id: string): Promise<void> {
    await db.delete(brandImages).where(eq(brandImages.id, id));
  }

  // ============================================
  // GEMINI QUOTA MONITORING IMPLEMENTATIONS
  // ============================================

  async upsertQuotaMetrics(metrics: InsertGeminiQuotaMetrics): Promise<GeminiQuotaMetrics> {
    // Try to find existing metric for this window
    const existing = await db
      .select()
      .from(geminiQuotaMetrics)
      .where(
        and(
          eq(geminiQuotaMetrics.brandId, metrics.brandId),
          eq(geminiQuotaMetrics.windowType, metrics.windowType),
          eq(geminiQuotaMetrics.windowStart, metrics.windowStart)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update existing metric by adding to counts
      const [updated] = await db
        .update(geminiQuotaMetrics)
        .set({
          requestCount: sql`${geminiQuotaMetrics.requestCount} + ${metrics.requestCount}`,
          successCount: sql`${geminiQuotaMetrics.successCount} + ${metrics.successCount}`,
          errorCount: sql`${geminiQuotaMetrics.errorCount} + ${metrics.errorCount}`,
          rateLimitCount: sql`${geminiQuotaMetrics.rateLimitCount} + ${metrics.rateLimitCount}`,
          inputTokensTotal: sql`${geminiQuotaMetrics.inputTokensTotal} + ${metrics.inputTokensTotal}`,
          outputTokensTotal: sql`${geminiQuotaMetrics.outputTokensTotal} + ${metrics.outputTokensTotal}`,
          estimatedCostMicros: sql`${geminiQuotaMetrics.estimatedCostMicros} + ${metrics.estimatedCostMicros}`,
          generateCount: sql`${geminiQuotaMetrics.generateCount} + ${metrics.generateCount}`,
          editCount: sql`${geminiQuotaMetrics.editCount} + ${metrics.editCount}`,
          analyzeCount: sql`${geminiQuotaMetrics.analyzeCount} + ${metrics.analyzeCount}`,
        })
        .where(eq(geminiQuotaMetrics.id, existing[0].id))
        .returning();
      return updated;
    }

    // Insert new metric
    const [inserted] = await db
      .insert(geminiQuotaMetrics)
      .values(metrics)
      .returning();
    return inserted;
  }

  async getQuotaMetrics(params: {
    brandId: string;
    windowType: string;
    startDate: Date;
    endDate: Date;
  }): Promise<GeminiQuotaMetrics[]> {
    return await db
      .select()
      .from(geminiQuotaMetrics)
      .where(
        and(
          eq(geminiQuotaMetrics.brandId, params.brandId),
          eq(geminiQuotaMetrics.windowType, params.windowType),
          gte(geminiQuotaMetrics.windowStart, params.startDate),
          lte(geminiQuotaMetrics.windowStart, params.endDate)
        )
      )
      .orderBy(desc(geminiQuotaMetrics.windowStart));
  }

  async getLatestQuotaMetric(brandId: string, windowType: string): Promise<GeminiQuotaMetrics | undefined> {
    const [metric] = await db
      .select()
      .from(geminiQuotaMetrics)
      .where(
        and(
          eq(geminiQuotaMetrics.brandId, brandId),
          eq(geminiQuotaMetrics.windowType, windowType)
        )
      )
      .orderBy(desc(geminiQuotaMetrics.windowStart))
      .limit(1);
    return metric;
  }

  async createRateLimitEvent(event: InsertGeminiRateLimitEvent): Promise<GeminiRateLimitEvent> {
    const [inserted] = await db
      .insert(geminiRateLimitEvents)
      .values(event)
      .returning();
    return inserted;
  }

  async getRecentRateLimitEvents(brandId: string, minutes: number): Promise<GeminiRateLimitEvent[]> {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return await db
      .select()
      .from(geminiRateLimitEvents)
      .where(
        and(
          eq(geminiRateLimitEvents.brandId, brandId),
          gte(geminiRateLimitEvents.createdAt, cutoff)
        )
      )
      .orderBy(desc(geminiRateLimitEvents.createdAt));
  }

  async getQuotaAlerts(brandId: string): Promise<GeminiQuotaAlert[]> {
    return await db
      .select()
      .from(geminiQuotaAlerts)
      .where(eq(geminiQuotaAlerts.brandId, brandId))
      .orderBy(geminiQuotaAlerts.alertType);
  }

  async upsertQuotaAlert(alert: InsertGeminiQuotaAlert): Promise<GeminiQuotaAlert> {
    // Check if alert exists for this brand and type
    const existing = await db
      .select()
      .from(geminiQuotaAlerts)
      .where(
        and(
          eq(geminiQuotaAlerts.brandId, alert.brandId),
          eq(geminiQuotaAlerts.alertType, alert.alertType)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(geminiQuotaAlerts)
        .set({
          thresholdValue: alert.thresholdValue,
          isEnabled: alert.isEnabled,
          updatedAt: new Date(),
        })
        .where(eq(geminiQuotaAlerts.id, existing[0].id))
        .returning();
      return updated;
    }

    const [inserted] = await db
      .insert(geminiQuotaAlerts)
      .values(alert)
      .returning();
    return inserted;
  }

  async updateQuotaAlertTrigger(id: string): Promise<void> {
    await db
      .update(geminiQuotaAlerts)
      .set({
        lastTriggeredAt: new Date(),
        triggerCount: sql`${geminiQuotaAlerts.triggerCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(geminiQuotaAlerts.id, id));
  }

  // ============================================
  // GOOGLE CLOUD MONITORING SYNC OPERATIONS
  // ============================================

  async saveGoogleQuotaSnapshot(snapshot: InsertGoogleQuotaSnapshot): Promise<GoogleQuotaSnapshot> {
    const [inserted] = await db
      .insert(googleQuotaSnapshots)
      .values(snapshot)
      .returning();
    return inserted;
  }

  async getLatestGoogleQuotaSnapshot(brandId?: string): Promise<GoogleQuotaSnapshot | undefined> {
    const conditions = brandId
      ? [eq(googleQuotaSnapshots.brandId, brandId)]
      : [];

    const [latest] = await db
      .select()
      .from(googleQuotaSnapshots)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(googleQuotaSnapshots.syncedAt))
      .limit(1);

    return latest;
  }

  async getGoogleQuotaSnapshotHistory(params: {
    brandId?: string;
    startDate: Date;
    endDate: Date;
    limit?: number;
  }): Promise<GoogleQuotaSnapshot[]> {
    const conditions = [
      gte(googleQuotaSnapshots.syncedAt, params.startDate),
      lte(googleQuotaSnapshots.syncedAt, params.endDate),
    ];

    if (params.brandId) {
      conditions.push(eq(googleQuotaSnapshots.brandId, params.brandId));
    }

    return db
      .select()
      .from(googleQuotaSnapshots)
      .where(and(...conditions))
      .orderBy(desc(googleQuotaSnapshots.syncedAt))
      .limit(params.limit || 100);
  }

  async createSyncHistoryEntry(entry: InsertGoogleQuotaSyncHistory): Promise<GoogleQuotaSyncHistory> {
    const [inserted] = await db
      .insert(googleQuotaSyncHistory)
      .values(entry)
      .returning();
    return inserted;
  }

  async updateSyncHistoryEntry(id: string, updates: Partial<InsertGoogleQuotaSyncHistory>): Promise<GoogleQuotaSyncHistory> {
    const [updated] = await db
      .update(googleQuotaSyncHistory)
      .set(updates)
      .where(eq(googleQuotaSyncHistory.id, id))
      .returning();
    return updated;
  }

  async getRecentSyncHistory(limit: number = 20): Promise<GoogleQuotaSyncHistory[]> {
    return db
      .select()
      .from(googleQuotaSyncHistory)
      .orderBy(desc(googleQuotaSyncHistory.startedAt))
      .limit(limit);
  }
}

export const storage = new DbStorage();
