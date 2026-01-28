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
  // Performing Ad Templates types
  type PerformingAdTemplate,
  type InsertPerformingAdTemplate,
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
  // API Key Management types (Phase 7)
  type UserApiKey,
  type ApiKeyAuditLog,
  // Learn from Winners types
  type LearnedAdPattern,
  type InsertLearnedAdPattern,
  type AdAnalysisUpload,
  type InsertAdAnalysisUpload,
  type PatternApplicationHistory,
  type InsertPatternApplicationHistory,
  // Content Planner types
  type ContentPlannerPost,
  type InsertContentPlannerPost,
  // Social Connections types (Phase 8.1)
  type SocialConnection,
  type InsertSocialConnection,
  // Approval Queue types (Phase 8)
  type ApprovalQueue,
  type InsertApprovalQueue,
  type ApprovalAuditLog,
  type InsertApprovalAuditLog,
  type ApprovalSettings,
  type InsertApprovalSettings,
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
  // Performing Ad Templates table
  performingAdTemplates,
  // Quota monitoring tables
  geminiQuotaMetrics,
  geminiRateLimitEvents,
  geminiQuotaAlerts,
  // Google Cloud Monitoring sync tables
  googleQuotaSnapshots,
  googleQuotaSyncHistory,
  // API Key Management tables (Phase 7)
  userApiKeys,
  apiKeyAuditLog,
  // Learn from Winners tables
  learnedAdPatterns,
  adAnalysisUploads,
  patternApplicationHistory,
  // Content Planner tables
  contentPlannerPosts,
  // Social Media tables (Phase 8.1)
  socialConnections,
  // Approval Queue tables (Phase 8)
  approvalQueue,
  approvalAuditLog,
  approvalSettings,
} from "@shared/schema";
import { decryptApiKey } from "./services/encryptionService";
import { db } from "./db";
import { and, eq, desc, ilike, inArray, or, arrayContains, gte, lte, sql } from "drizzle-orm";
import { logger } from "./lib/logger";

export interface IStorage {
  // Generation CRUD operations
  saveGeneration(generation: InsertGeneration): Promise<Generation>;
  getGenerations(limit?: number): Promise<Generation[]>;
  getGenerationById(id: string): Promise<Generation | undefined>;
  updateGeneration(id: number | string, updates: Partial<InsertGeneration>): Promise<Generation>;
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

  // ============================================
  // API KEY MANAGEMENT OPERATIONS (Phase 7)
  // ============================================

  // API Key CRUD operations
  getUserApiKey(userId: string, service: string): Promise<UserApiKey | null>;
  getAllUserApiKeys(userId: string): Promise<UserApiKey[]>;
  saveUserApiKey(data: {
    userId: string;
    service: string;
    encryptedKey: string;
    iv: string;
    authTag: string;
    keyPreview: string;
    isValid?: boolean;
  }): Promise<UserApiKey>;
  updateUserApiKeyValidity(userId: string, service: string, isValid: boolean): Promise<void>;
  deleteUserApiKey(userId: string, service: string): Promise<void>;

  // Audit logging
  logApiKeyAction(entry: {
    userId: string;
    service: string;
    action: 'create' | 'update' | 'delete' | 'validate' | 'use';
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<void>;
  getApiKeyAuditLog(userId: string, service?: string, limit?: number): Promise<ApiKeyAuditLog[]>;

  // Key resolution with fallback
  resolveApiKey(userId: string, service: string): Promise<{ key: string | null; source: 'user' | 'environment' | 'none' }>;

  // ============================================
  // N8N CONFIGURATION VAULT (Phase 8.1)
  // ============================================

  // n8n Configuration Vault
  saveN8nConfig(userId: string, baseUrl: string, apiKey?: string): Promise<void>;
  getN8nConfig(userId: string): Promise<{ baseUrl: string; apiKey?: string } | null>;
  deleteN8nConfig(userId: string): Promise<void>;

  // ============================================
  // SOCIAL CONNECTION MANAGEMENT (Phase 8.1)
  // ============================================

  // Social Connection CRUD operations
  getSocialConnections(userId: string): Promise<SocialConnection[]>;
  getSocialConnectionById(id: string): Promise<SocialConnection | null>;
  getSocialConnectionByPlatform(userId: string, platform: string): Promise<SocialConnection | null>;
  createSocialConnection(data: InsertSocialConnection): Promise<SocialConnection>;
  updateSocialConnection(id: string, updates: Partial<SocialConnection>): Promise<SocialConnection>;
  deleteSocialConnection(id: string): Promise<void>;

  // ============================================
  // LEARN FROM WINNERS - PATTERN OPERATIONS
  // ============================================

  // Learned Ad Pattern CRUD operations
  createLearnedPattern(pattern: InsertLearnedAdPattern): Promise<LearnedAdPattern>;
  getLearnedPatterns(userId: string, filters?: {
    category?: string;
    platform?: string;
    industry?: string;
    isActive?: boolean;
  }): Promise<LearnedAdPattern[]>;
  getLearnedPatternById(id: string): Promise<LearnedAdPattern | undefined>;
  getLearnedPatternByHash(userId: string, sourceHash: string): Promise<LearnedAdPattern | undefined>;
  updateLearnedPattern(id: string, updates: Partial<InsertLearnedAdPattern>): Promise<LearnedAdPattern>;
  deleteLearnedPattern(id: string): Promise<void>;
  incrementPatternUsage(id: string): Promise<void>;

  // Ad Analysis Upload CRUD operations
  createUploadRecord(upload: InsertAdAnalysisUpload): Promise<AdAnalysisUpload>;
  getUploadById(id: string): Promise<AdAnalysisUpload | undefined>;
  updateUploadStatus(id: string, status: string, errorMessage?: string): Promise<AdAnalysisUpload>;
  updateUploadWithPattern(id: string, patternId: string, processingDurationMs: number): Promise<AdAnalysisUpload>;
  getExpiredUploads(): Promise<AdAnalysisUpload[]>;
  deleteUpload(id: string): Promise<void>;

  // Pattern Application History operations
  createApplicationHistory(history: InsertPatternApplicationHistory): Promise<PatternApplicationHistory>;
  getPatternApplicationHistory(patternId: string): Promise<PatternApplicationHistory[]>;
  updateApplicationFeedback(id: string, rating: number, wasUsed: boolean, feedback?: string): Promise<PatternApplicationHistory>;

  // ============================================
  // CONTENT PLANNER OPERATIONS
  // ============================================

  // Content Planner Post CRUD operations
  createContentPlannerPost(post: InsertContentPlannerPost): Promise<ContentPlannerPost>;
  getContentPlannerPostsByUser(userId: string, startDate?: Date, endDate?: Date): Promise<ContentPlannerPost[]>;
  getWeeklyBalance(userId: string): Promise<{ category: string; count: number }[]>;
  deleteContentPlannerPost(id: string): Promise<void>;

  // ============================================
  // APPROVAL QUEUE OPERATIONS (Phase 8)
  // ============================================

  // Approval Queue CRUD operations
  createApprovalQueue(data: InsertApprovalQueue): Promise<ApprovalQueue>;
  getApprovalQueue(id: string): Promise<ApprovalQueue | null>;
  getApprovalQueueForUser(userId: string, filters?: {
    status?: string;
    priority?: string;
    platform?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<ApprovalQueue[]>;
  updateApprovalQueue(id: string, updates: Partial<ApprovalQueue>): Promise<ApprovalQueue>;
  deleteApprovalQueue(id: string): Promise<void>;

  // Approval Audit Log operations
  createApprovalAuditLog(data: InsertApprovalAuditLog): Promise<ApprovalAuditLog>;
  getApprovalAuditLog(approvalQueueId: string): Promise<ApprovalAuditLog[]>;

  // Approval Settings operations
  getApprovalSettings(userId: string): Promise<ApprovalSettings | null>;
  updateApprovalSettings(userId: string, settings: Partial<ApprovalSettings>): Promise<ApprovalSettings>;
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

  async updateGeneration(id: number | string, updates: Partial<InsertGeneration>): Promise<Generation> {
    const stringId = String(id);
    const [generation] = await db
      .update(generations)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(generations.id, stringId))
      .returning();
    return generation;
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

  async getInstallationScenariosByUser(userId: string): Promise<InstallationScenario[]> {
    return await db
      .select()
      .from(installationScenarios)
      .where(eq(installationScenarios.userId, userId))
      .orderBy(desc(installationScenarios.createdAt));
  }

  async getInstallationScenariosForProducts(productIds: string[]): Promise<InstallationScenario[]> {
    if (productIds.length === 0) return [];

    // Get scenarios where any of the productIds is the primary product
    // OR appears in the secondaryProductIds array (using PostgreSQL && overlap operator)
    return await db
      .select()
      .from(installationScenarios)
      .where(
        and(
          eq(installationScenarios.isActive, true),
          or(
            inArray(installationScenarios.primaryProductId, productIds),
            // Check if secondaryProductIds array overlaps with input productIds
            sql`${installationScenarios.secondaryProductIds} && ARRAY[${sql.join(productIds.map(id => sql`${id}`), sql`, `)}]::text[]`
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

  async getBrandImagesByUser(userId: string): Promise<BrandImage[]> {
    return await db
      .select()
      .from(brandImages)
      .where(eq(brandImages.userId, userId))
      .orderBy(desc(brandImages.createdAt));
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
  // PERFORMING AD TEMPLATES IMPLEMENTATIONS
  // ============================================

  async createPerformingAdTemplate(template: InsertPerformingAdTemplate): Promise<PerformingAdTemplate> {
    const [result] = await db
      .insert(performingAdTemplates)
      .values(template)
      .returning();
    return result;
  }

  async getPerformingAdTemplates(userId: string): Promise<PerformingAdTemplate[]> {
    return await db
      .select()
      .from(performingAdTemplates)
      .where(eq(performingAdTemplates.userId, userId))
      .orderBy(desc(performingAdTemplates.createdAt));
  }

  async getPerformingAdTemplate(id: string): Promise<PerformingAdTemplate | undefined> {
    const [template] = await db
      .select()
      .from(performingAdTemplates)
      .where(eq(performingAdTemplates.id, id))
      .limit(1);
    return template;
  }

  async getPerformingAdTemplatesByCategory(userId: string, category: string): Promise<PerformingAdTemplate[]> {
    return await db
      .select()
      .from(performingAdTemplates)
      .where(
        and(
          eq(performingAdTemplates.userId, userId),
          eq(performingAdTemplates.category, category)
        )
      )
      .orderBy(desc(performingAdTemplates.createdAt));
  }

  async getPerformingAdTemplatesByPlatform(userId: string, platform: string): Promise<PerformingAdTemplate[]> {
    // Get all templates for user and filter by target platform
    const allTemplates = await db
      .select()
      .from(performingAdTemplates)
      .where(eq(performingAdTemplates.userId, userId))
      .orderBy(desc(performingAdTemplates.createdAt));

    return allTemplates.filter(t =>
      t.targetPlatforms?.includes(platform)
    );
  }

  async getFeaturedPerformingAdTemplates(userId: string): Promise<PerformingAdTemplate[]> {
    return await db
      .select()
      .from(performingAdTemplates)
      .where(
        and(
          eq(performingAdTemplates.userId, userId),
          eq(performingAdTemplates.isFeatured, true),
          eq(performingAdTemplates.isActive, true)
        )
      )
      .orderBy(desc(performingAdTemplates.createdAt));
  }

  async getTopPerformingAdTemplates(userId: string, limit: number = 10): Promise<PerformingAdTemplate[]> {
    // Get templates sorted by engagement tier and rate
    return await db
      .select()
      .from(performingAdTemplates)
      .where(
        and(
          eq(performingAdTemplates.userId, userId),
          eq(performingAdTemplates.isActive, true)
        )
      )
      .orderBy(desc(performingAdTemplates.estimatedEngagementRate))
      .limit(limit);
  }

  async updatePerformingAdTemplate(id: string, updates: Partial<InsertPerformingAdTemplate>): Promise<PerformingAdTemplate> {
    const [template] = await db
      .update(performingAdTemplates)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(performingAdTemplates.id, id))
      .returning();
    return template;
  }

  async deletePerformingAdTemplate(id: string): Promise<void> {
    await db.delete(performingAdTemplates).where(eq(performingAdTemplates.id, id));
  }

  async searchPerformingAdTemplates(
    userId: string,
    filters: {
      category?: string;
      platform?: string;
      mood?: string;
      style?: string;
      engagementTier?: string;
      industry?: string;
      objective?: string;
    }
  ): Promise<PerformingAdTemplate[]> {
    // Start with base query
    let templates = await db
      .select()
      .from(performingAdTemplates)
      .where(
        and(
          eq(performingAdTemplates.userId, userId),
          eq(performingAdTemplates.isActive, true)
        )
      )
      .orderBy(desc(performingAdTemplates.estimatedEngagementRate));

    // Apply filters
    if (filters.category) {
      templates = templates.filter(t => t.category === filters.category);
    }
    if (filters.platform) {
      templates = templates.filter(t => t.targetPlatforms?.includes(filters.platform!));
    }
    if (filters.mood) {
      templates = templates.filter(t => t.mood === filters.mood);
    }
    if (filters.style) {
      templates = templates.filter(t => t.style === filters.style);
    }
    if (filters.engagementTier) {
      templates = templates.filter(t => t.engagementTier === filters.engagementTier);
    }
    if (filters.industry) {
      templates = templates.filter(t => t.bestForIndustries?.includes(filters.industry!));
    }
    if (filters.objective) {
      templates = templates.filter(t => t.bestForObjectives?.includes(filters.objective!));
    }

    return templates;
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

  // ============================================
  // API KEY MANAGEMENT OPERATIONS (Phase 7)
  // ============================================

  /**
   * Get a user's API key for a specific service
   */
  async getUserApiKey(userId: string, service: string): Promise<UserApiKey | null> {
    const [key] = await db
      .select()
      .from(userApiKeys)
      .where(
        and(
          eq(userApiKeys.userId, userId),
          eq(userApiKeys.service, service)
        )
      )
      .limit(1);
    return key || null;
  }

  /**
   * Get all API keys for a user
   */
  async getAllUserApiKeys(userId: string): Promise<UserApiKey[]> {
    return await db
      .select()
      .from(userApiKeys)
      .where(eq(userApiKeys.userId, userId))
      .orderBy(userApiKeys.service);
  }

  /**
   * Save or update a user's API key (upsert)
   * Uses the unique constraint on (userId, service) for conflict detection
   */
  async saveUserApiKey(data: {
    userId: string;
    service: string;
    encryptedKey: string;
    iv: string;
    authTag: string;
    keyPreview: string;
    isValid?: boolean;
  }): Promise<UserApiKey> {
    const now = new Date();
    const insertData = {
      userId: data.userId,
      service: data.service,
      encryptedKey: data.encryptedKey,
      iv: data.iv,
      authTag: data.authTag,
      keyPreview: data.keyPreview,
      isValid: data.isValid ?? true,
      lastValidatedAt: now,
    };

    // Try upsert using onConflictDoUpdate
    const [result] = await db
      .insert(userApiKeys)
      .values(insertData)
      .onConflictDoUpdate({
        target: [userApiKeys.userId, userApiKeys.service],
        set: {
          encryptedKey: data.encryptedKey,
          iv: data.iv,
          authTag: data.authTag,
          keyPreview: data.keyPreview,
          isValid: data.isValid ?? true,
          lastValidatedAt: now,
          updatedAt: now,
        },
      })
      .returning();

    return result;
  }

  /**
   * Update the validity status of a user's API key
   */
  async updateUserApiKeyValidity(userId: string, service: string, isValid: boolean): Promise<void> {
    await db
      .update(userApiKeys)
      .set({
        isValid,
        lastValidatedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(userApiKeys.userId, userId),
          eq(userApiKeys.service, service)
        )
      );
  }

  /**
   * Delete a user's API key for a specific service
   */
  async deleteUserApiKey(userId: string, service: string): Promise<void> {
    await db
      .delete(userApiKeys)
      .where(
        and(
          eq(userApiKeys.userId, userId),
          eq(userApiKeys.service, service)
        )
      );
  }

  /**
   * Log an API key action for audit purposes
   */
  async logApiKeyAction(entry: {
    userId: string;
    service: string;
    action: 'create' | 'update' | 'delete' | 'validate' | 'use';
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    await db
      .insert(apiKeyAuditLog)
      .values({
        userId: entry.userId,
        service: entry.service,
        action: entry.action,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        success: entry.success,
        errorMessage: entry.errorMessage,
      });
  }

  /**
   * Get audit log entries for a user's API keys
   */
  async getApiKeyAuditLog(userId: string, service?: string, limit: number = 100): Promise<ApiKeyAuditLog[]> {
    const conditions = [eq(apiKeyAuditLog.userId, userId)];

    if (service) {
      conditions.push(eq(apiKeyAuditLog.service, service));
    }

    return await db
      .select()
      .from(apiKeyAuditLog)
      .where(and(...conditions))
      .orderBy(desc(apiKeyAuditLog.createdAt))
      .limit(limit);
  }

  /**
   * Resolve API key with fallback to environment variable
   *
   * Resolution order:
   * 1. User's custom key (if exists and valid) -> decrypt and return
   * 2. Environment variable fallback
   * 3. None (key not available)
   *
   * Environment variable mapping:
   * - gemini -> GEMINI_API_KEY
   * - cloudinary -> CLOUDINARY_API_KEY (also uses CLOUDINARY_API_SECRET)
   * - firecrawl -> FIRECRAWL_API_KEY
   * - redis -> REDIS_URL
   */
  async resolveApiKey(userId: string, service: string): Promise<{ key: string | null; source: 'user' | 'environment' | 'none' }> {
    // Try to get user's custom key first
    const userKey = await this.getUserApiKey(userId, service);

    if (userKey && userKey.isValid) {
      try {
        // Decrypt the user's key
        const decryptedKey = decryptApiKey({
          ciphertext: userKey.encryptedKey,
          iv: userKey.iv,
          authTag: userKey.authTag,
        });
        return { key: decryptedKey, source: 'user' };
      } catch {
        // Decryption failed - key is corrupted or encryption key changed
        // Fall through to environment variable
      }
    }

    // Fall back to environment variable
    const envVarMap: Record<string, string | undefined> = {
      gemini: process.env.GEMINI_API_KEY,
      cloudinary: process.env.CLOUDINARY_API_KEY,
      firecrawl: process.env.FIRECRAWL_API_KEY,
      redis: process.env.REDIS_URL,
    };

    const envKey = envVarMap[service];

    if (envKey) {
      return { key: envKey, source: 'environment' };
    }

    return { key: null, source: 'none' };
  }

  // ============================================
  // LEARN FROM WINNERS - PATTERN OPERATIONS
  // ============================================

  /**
   * Create a new learned ad pattern
   */
  async createLearnedPattern(pattern: InsertLearnedAdPattern): Promise<LearnedAdPattern> {
    const [result] = await db
      .insert(learnedAdPatterns)
      .values(pattern)
      .returning();
    return result;
  }

  /**
   * Get learned patterns for a user with optional filters
   */
  async getLearnedPatterns(userId: string, filters?: {
    category?: string;
    platform?: string;
    industry?: string;
    isActive?: boolean;
  }): Promise<LearnedAdPattern[]> {
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

  /**
   * Get a learned pattern by ID
   */
  async getLearnedPatternById(id: string): Promise<LearnedAdPattern | undefined> {
    const [pattern] = await db
      .select()
      .from(learnedAdPatterns)
      .where(eq(learnedAdPatterns.id, id));
    return pattern;
  }

  /**
   * Get a learned pattern by source hash (for deduplication)
   */
  async getLearnedPatternByHash(userId: string, sourceHash: string): Promise<LearnedAdPattern | undefined> {
    const [pattern] = await db
      .select()
      .from(learnedAdPatterns)
      .where(
        and(
          eq(learnedAdPatterns.userId, userId),
          eq(learnedAdPatterns.sourceHash, sourceHash)
        )
      );
    return pattern;
  }

  /**
   * Update a learned pattern
   */
  async updateLearnedPattern(id: string, updates: Partial<InsertLearnedAdPattern>): Promise<LearnedAdPattern> {
    const [result] = await db
      .update(learnedAdPatterns)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(learnedAdPatterns.id, id))
      .returning();
    return result;
  }

  /**
   * Delete a learned pattern
   */
  async deleteLearnedPattern(id: string): Promise<void> {
    await db.delete(learnedAdPatterns).where(eq(learnedAdPatterns.id, id));
  }

  /**
   * Increment pattern usage count and update lastUsedAt
   */
  async incrementPatternUsage(id: string): Promise<void> {
    await db
      .update(learnedAdPatterns)
      .set({
        usageCount: sql`${learnedAdPatterns.usageCount} + 1`,
        lastUsedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(learnedAdPatterns.id, id));
  }

  /**
   * Create an upload record for tracking pattern extraction progress
   */
  async createUploadRecord(upload: InsertAdAnalysisUpload): Promise<AdAnalysisUpload> {
    const [result] = await db
      .insert(adAnalysisUploads)
      .values(upload)
      .returning();
    return result;
  }

  /**
   * Get an upload record by ID
   */
  async getUploadById(id: string): Promise<AdAnalysisUpload | undefined> {
    const [upload] = await db
      .select()
      .from(adAnalysisUploads)
      .where(eq(adAnalysisUploads.id, id));
    return upload;
  }

  /**
   * Update upload status
   */
  async updateUploadStatus(id: string, status: string, errorMessage?: string): Promise<AdAnalysisUpload> {
    const updateData: Partial<AdAnalysisUpload> = { status };
    if (errorMessage) {
      updateData.errorMessage = errorMessage;
    }
    if (status === 'scanning' || status === 'extracting') {
      updateData.processingStartedAt = new Date();
    }

    const [result] = await db
      .update(adAnalysisUploads)
      .set(updateData)
      .where(eq(adAnalysisUploads.id, id))
      .returning();
    return result;
  }

  /**
   * Update upload with extracted pattern ID and processing duration
   */
  async updateUploadWithPattern(id: string, patternId: string, processingDurationMs: number): Promise<AdAnalysisUpload> {
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
    return result;
  }

  /**
   * Get expired uploads for cleanup
   */
  async getExpiredUploads(): Promise<AdAnalysisUpload[]> {
    return await db
      .select()
      .from(adAnalysisUploads)
      .where(
        and(
          lte(adAnalysisUploads.expiresAt, new Date()),
          sql`${adAnalysisUploads.status} != 'expired'`
        )
      );
  }

  /**
   * Delete an upload record
   */
  async deleteUpload(id: string): Promise<void> {
    await db.delete(adAnalysisUploads).where(eq(adAnalysisUploads.id, id));
  }

  /**
   * Create pattern application history record
   */
  async createApplicationHistory(history: InsertPatternApplicationHistory): Promise<PatternApplicationHistory> {
    const [result] = await db
      .insert(patternApplicationHistory)
      .values(history)
      .returning();
    return result;
  }

  /**
   * Get application history for a pattern
   */
  async getPatternApplicationHistory(patternId: string): Promise<PatternApplicationHistory[]> {
    return await db
      .select()
      .from(patternApplicationHistory)
      .where(eq(patternApplicationHistory.patternId, patternId))
      .orderBy(desc(patternApplicationHistory.createdAt));
  }

  /**
   * Update application history with user feedback
   */
  async updateApplicationFeedback(
    id: string,
    rating: number,
    wasUsed: boolean,
    feedback?: string
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
    return result;
  }

  // ============================================
  // CONTENT PLANNER IMPLEMENTATIONS
  // ============================================

  /**
   * Create a new content planner post (marks a post as completed)
   */
  async createContentPlannerPost(post: InsertContentPlannerPost): Promise<ContentPlannerPost> {
    const [result] = await db
      .insert(contentPlannerPosts)
      .values(post)
      .returning();
    return result;
  }

  /**
   * Get content planner posts for a user within a date range
   * Defaults to last 7 days if no dates provided
   */
  async getContentPlannerPostsByUser(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ContentPlannerPost[]> {
    const conditions = [eq(contentPlannerPosts.userId, userId)];

    // Default to last 7 days
    const effectiveStartDate = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const effectiveEndDate = endDate || new Date();

    conditions.push(gte(contentPlannerPosts.postedAt, effectiveStartDate));
    conditions.push(lte(contentPlannerPosts.postedAt, effectiveEndDate));

    return await db
      .select()
      .from(contentPlannerPosts)
      .where(and(...conditions))
      .orderBy(desc(contentPlannerPosts.postedAt));
  }

  /**
   * Get weekly balance - count of posts per category for the current week
   * Week starts on Monday
   */
  async getWeeklyBalance(userId: string): Promise<{ category: string; count: number }[]> {
    // Calculate the start of the current week (Monday)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - daysSinceMonday);
    weekStart.setHours(0, 0, 0, 0);

    // Get all posts from this week
    const posts = await db
      .select({
        category: contentPlannerPosts.category,
      })
      .from(contentPlannerPosts)
      .where(
        and(
          eq(contentPlannerPosts.userId, userId),
          gte(contentPlannerPosts.postedAt, weekStart)
        )
      );

    // Count by category
    const countMap: Record<string, number> = {};
    for (const post of posts) {
      countMap[post.category] = (countMap[post.category] || 0) + 1;
    }

    // Return as array
    return Object.entries(countMap).map(([category, count]) => ({
      category,
      count,
    }));
  }

  /**
   * Delete a content planner post
   */
  async deleteContentPlannerPost(id: string): Promise<void> {
    await db.delete(contentPlannerPosts).where(eq(contentPlannerPosts.id, id));
  }

  // ========================================
  // N8N CONFIGURATION VAULT (AES-256-GCM ENCRYPTED)
  // ========================================

  async saveN8nConfig(userId: string, baseUrl: string, apiKey?: string): Promise<void> {
    const { encryptApiKey } = await import('./services/encryptionService');

    // Encrypt API key using existing encryption service
    const encryptedData = apiKey
      ? await encryptApiKey(apiKey)
      : null;

    await db
      .insert(userApiKeys)
      .values({
        userId,
        service: 'n8n',
        encryptedKey: encryptedData?.ciphertext || null,
        keyIv: encryptedData?.iv || null,
        keyAuthTag: encryptedData?.authTag || null,
        keyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'Not configured',
        metadata: { baseUrl },
        isValid: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [userApiKeys.userId, userApiKeys.service],
        set: {
          encryptedKey: encryptedData?.ciphertext || null,
          keyIv: encryptedData?.iv || null,
          keyAuthTag: encryptedData?.authTag || null,
          keyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'Not configured',
          metadata: { baseUrl },
          updatedAt: new Date(),
        },
      });

    logger.info({ userId, service: 'n8n' }, 'n8n configuration saved to encrypted vault');
  }

  async getN8nConfig(userId: string): Promise<{ baseUrl: string; apiKey?: string } | null> {
    const [row] = await db
      .select()
      .from(userApiKeys)
      .where(and(
        eq(userApiKeys.userId, userId),
        eq(userApiKeys.service, 'n8n')
      ))
      .limit(1);

    if (!row || !row.metadata?.baseUrl) return null;

    // Decrypt API key if present
    const apiKey = row.encryptedKey && row.keyIv && row.keyAuthTag
      ? await decryptApiKey({
          ciphertext: row.encryptedKey,
          iv: row.keyIv,
          authTag: row.keyAuthTag,
        })
      : undefined;

    return {
      baseUrl: row.metadata.baseUrl as string,
      apiKey,
    };
  }

  async deleteN8nConfig(userId: string): Promise<void> {
    await db
      .delete(userApiKeys)
      .where(and(
        eq(userApiKeys.userId, userId),
        eq(userApiKeys.service, 'n8n')
      ));

    logger.info({ userId }, 'n8n configuration deleted from vault');
  }

  // ========================================
  // SOCIAL CONNECTION MANAGEMENT
  // ========================================

  async getSocialConnections(userId: string): Promise<SocialConnection[]> {
    return db
      .select()
      .from(socialConnections)
      .where(eq(socialConnections.userId, userId))
      .orderBy(desc(socialConnections.connectedAt));
  }

  async getSocialConnectionById(id: string): Promise<SocialConnection | null> {
    const [connection] = await db
      .select()
      .from(socialConnections)
      .where(eq(socialConnections.id, id))
      .limit(1);

    return connection || null;
  }

  async getSocialConnectionByPlatform(
    userId: string,
    platform: string
  ): Promise<SocialConnection | null> {
    const [connection] = await db
      .select()
      .from(socialConnections)
      .where(and(
        eq(socialConnections.userId, userId),
        eq(socialConnections.platform, platform)
      ))
      .limit(1);

    return connection || null;
  }

  async createSocialConnection(data: InsertSocialConnection): Promise<SocialConnection> {
    const [connection] = await db
      .insert(socialConnections)
      .values({
        ...data,
        connectedAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info({ userId: data.userId, platform: data.platform }, 'Social connection created');
    return connection;
  }

  async updateSocialConnection(
    id: string,
    updates: Partial<SocialConnection>
  ): Promise<SocialConnection> {
    const [connection] = await db
      .update(socialConnections)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(socialConnections.id, id))
      .returning();

    if (!connection) {
      throw new Error(`Social connection not found: ${id}`);
    }

    logger.info({ connectionId: id }, 'Social connection updated');
    return connection;
  }

  async deleteSocialConnection(id: string): Promise<void> {
    await db
      .delete(socialConnections)
      .where(eq(socialConnections.id, id));

    logger.info({ connectionId: id }, 'Social connection deleted');
  }

  // ========================================
  // APPROVAL QUEUE MANAGEMENT (Phase 8)
  // ========================================

  async createApprovalQueue(data: InsertApprovalQueue): Promise<ApprovalQueue> {
    const [item] = await db
      .insert(approvalQueue)
      .values({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    logger.info({ userId: data.userId, queueItemId: item.id }, 'Approval queue item created');
    return item;
  }

  async getApprovalQueue(id: string): Promise<ApprovalQueue | null> {
    const [item] = await db
      .select()
      .from(approvalQueue)
      .where(eq(approvalQueue.id, id))
      .limit(1);

    return item || null;
  }

  async getApprovalQueueForUser(
    userId: string,
    filters?: {
      status?: string;
      priority?: string;
      platform?: string;
      dateFrom?: Date;
      dateTo?: Date;
    }
  ): Promise<ApprovalQueue[]> {
    try {
      const conditions = [eq(approvalQueue.userId, userId)];

      if (filters?.status) {
        conditions.push(eq(approvalQueue.status, filters.status));
      }
      if (filters?.priority) {
        conditions.push(eq(approvalQueue.priority, filters.priority));
      }
      if (filters?.dateFrom) {
        conditions.push(gte(approvalQueue.createdAt, filters.dateFrom));
      }
      if (filters?.dateTo) {
        conditions.push(lte(approvalQueue.createdAt, filters.dateTo));
      }

      return await db
        .select()
        .from(approvalQueue)
        .where(and(...conditions))
        .orderBy(desc(approvalQueue.createdAt));
    } catch (error: unknown) {
      // Log detailed error info to diagnose the issue
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      logger.error({ module: 'Storage', errorMessage, errorCode, error }, 'approval_queue query failed');
      throw error;  // Re-throw to see in API response
    }
  }

  async updateApprovalQueue(
    id: string,
    updates: Partial<ApprovalQueue>
  ): Promise<ApprovalQueue> {
    const [item] = await db
      .update(approvalQueue)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(approvalQueue.id, id))
      .returning();

    if (!item) {
      throw new Error(`Approval queue item not found: ${id}`);
    }

    logger.info({ queueItemId: id, status: item.status }, 'Approval queue item updated');
    return item;
  }

  async deleteApprovalQueue(id: string): Promise<void> {
    await db
      .delete(approvalQueue)
      .where(eq(approvalQueue.id, id));

    logger.info({ queueItemId: id }, 'Approval queue item deleted');
  }

  async createApprovalAuditLog(data: InsertApprovalAuditLog): Promise<ApprovalAuditLog> {
    const [log] = await db
      .insert(approvalAuditLog)
      .values({
        ...data,
        createdAt: new Date(),
      })
      .returning();

    logger.info({ approvalQueueId: data.approvalQueueId, eventType: data.eventType }, 'Audit log created');
    return log;
  }

  async getApprovalAuditLog(approvalQueueId: string): Promise<ApprovalAuditLog[]> {
    return db
      .select()
      .from(approvalAuditLog)
      .where(eq(approvalAuditLog.approvalQueueId, approvalQueueId))
      .orderBy(desc(approvalAuditLog.createdAt));
  }

  async getApprovalSettings(userId: string): Promise<ApprovalSettings | null> {
    const [settings] = await db
      .select()
      .from(approvalSettings)
      .where(eq(approvalSettings.userId, userId))
      .limit(1);

    return settings || null;
  }

  async updateApprovalSettings(
    userId: string,
    settingsUpdates: Partial<ApprovalSettings>
  ): Promise<ApprovalSettings> {
    // Try to update existing settings
    const existing = await this.getApprovalSettings(userId);

    if (existing) {
      const [updated] = await db
        .update(approvalSettings)
        .set({
          ...settingsUpdates,
          updatedAt: new Date(),
        })
        .where(eq(approvalSettings.userId, userId))
        .returning();

      return updated;
    }

    // Create new settings if none exist
    const [created] = await db
      .insert(approvalSettings)
      .values({
        userId,
        ...settingsUpdates,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as InsertApprovalSettings)
      .returning();

    logger.info({ userId }, 'Approval settings created');
    return created;
  }
}

export const storage = new DbStorage();
