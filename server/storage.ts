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
} from "@shared/schema";

// Repository imports
import {
  generationRepo,
  productRepo,
  userRepo,
  templateRepo,
  copywritingRepo,
  knowledgeRepo,
  quotaRepo,
  patternRepo,
  planningRepo,
  approvalRepo,
  apiKeyRepo,
  socialRepo,
} from "./repositories";

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
  // ============================================
  // GENERATION OPERATIONS
  // ============================================
  async saveGeneration(generation: InsertGeneration): Promise<Generation> {
    return generationRepo.saveGeneration(generation);
  }
  async getGenerations(limit?: number): Promise<Generation[]> {
    return generationRepo.getGenerations(limit);
  }
  async getGenerationById(id: string): Promise<Generation | undefined> {
    return generationRepo.getGenerationById(id);
  }
  async updateGeneration(id: number | string, updates: Partial<InsertGeneration>): Promise<Generation> {
    return generationRepo.updateGeneration(id, updates);
  }
  async deleteGeneration(id: string): Promise<void> {
    return generationRepo.deleteGeneration(id);
  }
  async getEditHistory(generationId: string): Promise<Generation[]> {
    return generationRepo.getEditHistory(generationId);
  }
  async saveGenerationUsage(usage: InsertGenerationUsage): Promise<GenerationUsage> {
    return generationRepo.saveGenerationUsage(usage);
  }
  async getGenerationUsageRows(params: {
    brandId: string;
    operation: string;
    resolution: string;
    inputImagesCount: number;
    limit?: number;
  }): Promise<{ estimatedCostMicros: number; createdAt: Date }[]> {
    return generationRepo.getGenerationUsageRows(params);
  }

  // ============================================
  // PRODUCT OPERATIONS
  // ============================================
  async saveProduct(product: InsertProduct): Promise<Product> {
    return productRepo.saveProduct(product);
  }
  async getProducts(): Promise<Product[]> {
    return productRepo.getProducts();
  }
  async getProductById(id: string): Promise<Product | undefined> {
    return productRepo.getProductById(id);
  }
  async deleteProduct(id: string): Promise<void> {
    return productRepo.deleteProduct(id);
  }
  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product> {
    return productRepo.updateProduct(id, updates);
  }
  async getProductsByIds(ids: string[]): Promise<Product[]> {
    return productRepo.getProductsByIds(ids);
  }
  async searchProductsByTag(tag: string): Promise<Product[]> {
    return productRepo.searchProductsByTag(tag);
  }

  // ============================================
  // PRODUCT ANALYSIS OPERATIONS
  // ============================================
  async saveProductAnalysis(analysis: InsertProductAnalysis): Promise<ProductAnalysis> {
    return productRepo.saveProductAnalysis(analysis);
  }
  async getProductAnalysisByProductId(productId: string): Promise<ProductAnalysis | undefined> {
    return productRepo.getProductAnalysisByProductId(productId);
  }
  async getProductAnalysisByFingerprint(fingerprint: string): Promise<ProductAnalysis | undefined> {
    return productRepo.getProductAnalysisByFingerprint(fingerprint);
  }
  async updateProductAnalysis(productId: string, updates: Partial<InsertProductAnalysis>): Promise<ProductAnalysis> {
    return productRepo.updateProductAnalysis(productId, updates);
  }
  async deleteProductAnalysis(productId: string): Promise<void> {
    return productRepo.deleteProductAnalysis(productId);
  }

  // ============================================
  // USER OPERATIONS
  // ============================================
  async createUser(email: string, passwordHash: string): Promise<User> {
    return userRepo.createUser(email, passwordHash);
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    return userRepo.getUserByEmail(email);
  }
  async getUserById(id: string): Promise<User | undefined> {
    return userRepo.getUserById(id);
  }
  async updateUserBrandVoice(userId: string, brandVoice: any): Promise<User> {
    return userRepo.updateUserBrandVoice(userId, brandVoice);
  }

  // ============================================
  // PROMPT TEMPLATE OPERATIONS
  // ============================================
  async savePromptTemplate(template: InsertPromptTemplate): Promise<PromptTemplate> {
    return templateRepo.savePromptTemplate(template);
  }
  async getPromptTemplates(category?: string): Promise<PromptTemplate[]> {
    return templateRepo.getPromptTemplates(category);
  }
  async getPromptTemplateById(id: string): Promise<PromptTemplate | undefined> {
    return templateRepo.getPromptTemplateById(id);
  }
  async deletePromptTemplate(id: string): Promise<void> {
    return templateRepo.deletePromptTemplate(id);
  }

  // ============================================
  // AD SCENE TEMPLATE OPERATIONS
  // ============================================
  async saveAdSceneTemplate(template: InsertAdSceneTemplate): Promise<AdSceneTemplate> {
    return templateRepo.saveAdSceneTemplate(template);
  }
  async getAdSceneTemplates(filters?: {
    category?: string;
    isGlobal?: boolean;
    createdBy?: string;
  }): Promise<AdSceneTemplate[]> {
    return templateRepo.getAdSceneTemplates(filters);
  }
  async getAdSceneTemplateById(id: string): Promise<AdSceneTemplate | undefined> {
    return templateRepo.getAdSceneTemplateById(id);
  }
  async updateAdSceneTemplate(id: string, updates: Partial<InsertAdSceneTemplate>): Promise<AdSceneTemplate> {
    return templateRepo.updateAdSceneTemplate(id, updates);
  }
  async deleteAdSceneTemplate(id: string): Promise<void> {
    return templateRepo.deleteAdSceneTemplate(id);
  }
  async searchAdSceneTemplates(query: string): Promise<AdSceneTemplate[]> {
    return templateRepo.searchAdSceneTemplates(query);
  }

  // ============================================
  // PERFORMING AD TEMPLATE OPERATIONS (extra methods not in IStorage)
  // ============================================
  async createPerformingAdTemplate(template: InsertPerformingAdTemplate): Promise<PerformingAdTemplate> {
    return templateRepo.createPerformingAdTemplate(template);
  }
  async getPerformingAdTemplates(userId: string): Promise<PerformingAdTemplate[]> {
    return templateRepo.getPerformingAdTemplates(userId);
  }
  async getPerformingAdTemplate(id: string): Promise<PerformingAdTemplate | undefined> {
    return templateRepo.getPerformingAdTemplate(id);
  }
  async getPerformingAdTemplatesByCategory(userId: string, category: string): Promise<PerformingAdTemplate[]> {
    return templateRepo.getPerformingAdTemplatesByCategory(userId, category);
  }
  async getPerformingAdTemplatesByPlatform(userId: string, platform: string): Promise<PerformingAdTemplate[]> {
    return templateRepo.getPerformingAdTemplatesByPlatform(userId, platform);
  }
  async getFeaturedPerformingAdTemplates(userId: string): Promise<PerformingAdTemplate[]> {
    return templateRepo.getFeaturedPerformingAdTemplates(userId);
  }
  async getTopPerformingAdTemplates(userId: string, limit: number = 10): Promise<PerformingAdTemplate[]> {
    return templateRepo.getTopPerformingAdTemplates(userId, limit);
  }
  async updatePerformingAdTemplate(id: string, updates: Partial<InsertPerformingAdTemplate>): Promise<PerformingAdTemplate> {
    return templateRepo.updatePerformingAdTemplate(id, updates);
  }
  async deletePerformingAdTemplate(id: string): Promise<void> {
    return templateRepo.deletePerformingAdTemplate(id);
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
    return templateRepo.searchPerformingAdTemplates(userId, filters);
  }

  // ============================================
  // AD COPY OPERATIONS
  // ============================================
  async saveAdCopy(copy: InsertAdCopy): Promise<AdCopy> {
    return copywritingRepo.saveAdCopy(copy);
  }
  async getAdCopyByGenerationId(generationId: string): Promise<AdCopy[]> {
    return copywritingRepo.getAdCopyByGenerationId(generationId);
  }
  async getAdCopyById(id: string): Promise<AdCopy | undefined> {
    return copywritingRepo.getAdCopyById(id);
  }
  async deleteAdCopy(id: string): Promise<void> {
    return copywritingRepo.deleteAdCopy(id);
  }
  async getCopyVariations(parentCopyId: string): Promise<AdCopy[]> {
    return copywritingRepo.getCopyVariations(parentCopyId);
  }

  // ============================================
  // BRAND PROFILE OPERATIONS
  // ============================================
  async saveBrandProfile(profile: InsertBrandProfile): Promise<BrandProfile> {
    return copywritingRepo.saveBrandProfile(profile);
  }
  async getBrandProfileByUserId(userId: string): Promise<BrandProfile | undefined> {
    return copywritingRepo.getBrandProfileByUserId(userId);
  }
  async updateBrandProfile(userId: string, updates: Partial<InsertBrandProfile>): Promise<BrandProfile> {
    return copywritingRepo.updateBrandProfile(userId, updates);
  }
  async deleteBrandProfile(userId: string): Promise<void> {
    return copywritingRepo.deleteBrandProfile(userId);
  }

  // ============================================
  // INSTALLATION SCENARIO OPERATIONS
  // ============================================
  async createInstallationScenario(scenario: InsertInstallationScenario): Promise<InstallationScenario> {
    return knowledgeRepo.createInstallationScenario(scenario);
  }
  async getInstallationScenarioById(id: string): Promise<InstallationScenario | undefined> {
    return knowledgeRepo.getInstallationScenarioById(id);
  }
  async getInstallationScenariosByUser(userId: string): Promise<InstallationScenario[]> {
    return knowledgeRepo.getInstallationScenariosByUser(userId);
  }
  async getInstallationScenariosForProducts(productIds: string[]): Promise<InstallationScenario[]> {
    return knowledgeRepo.getInstallationScenariosForProducts(productIds);
  }
  async getScenariosByRoomType(roomType: string): Promise<InstallationScenario[]> {
    return knowledgeRepo.getScenariosByRoomType(roomType);
  }
  async updateInstallationScenario(id: string, updates: Partial<InsertInstallationScenario>): Promise<InstallationScenario> {
    return knowledgeRepo.updateInstallationScenario(id, updates);
  }
  async deleteInstallationScenario(id: string): Promise<void> {
    return knowledgeRepo.deleteInstallationScenario(id);
  }

  // ============================================
  // PRODUCT RELATIONSHIP OPERATIONS
  // ============================================
  async createProductRelationship(relationship: InsertProductRelationship): Promise<ProductRelationship> {
    return knowledgeRepo.createProductRelationship(relationship);
  }
  async getProductRelationships(productIds: string[]): Promise<ProductRelationship[]> {
    return knowledgeRepo.getProductRelationships(productIds);
  }
  async getProductRelationshipsByType(productId: string, relationshipType: string): Promise<ProductRelationship[]> {
    return knowledgeRepo.getProductRelationshipsByType(productId, relationshipType);
  }
  async deleteProductRelationship(id: string): Promise<void> {
    return knowledgeRepo.deleteProductRelationship(id);
  }

  // ============================================
  // BRAND IMAGE OPERATIONS
  // ============================================
  async createBrandImage(image: InsertBrandImage): Promise<BrandImage> {
    return knowledgeRepo.createBrandImage(image);
  }
  async getBrandImagesByUser(userId: string): Promise<BrandImage[]> {
    return knowledgeRepo.getBrandImagesByUser(userId);
  }
  async getBrandImagesForProducts(productIds: string[], userId: string): Promise<BrandImage[]> {
    return knowledgeRepo.getBrandImagesForProducts(productIds, userId);
  }
  async getBrandImagesByCategory(userId: string, category: string): Promise<BrandImage[]> {
    return knowledgeRepo.getBrandImagesByCategory(userId, category);
  }
  async updateBrandImage(id: string, updates: Partial<InsertBrandImage>): Promise<BrandImage> {
    return knowledgeRepo.updateBrandImage(id, updates);
  }
  async deleteBrandImage(id: string): Promise<void> {
    return knowledgeRepo.deleteBrandImage(id);
  }

  // ============================================
  // QUOTA MONITORING OPERATIONS
  // ============================================
  async upsertQuotaMetrics(metrics: InsertGeminiQuotaMetrics): Promise<GeminiQuotaMetrics> {
    return quotaRepo.upsertQuotaMetrics(metrics);
  }
  async getQuotaMetrics(params: {
    brandId: string;
    windowType: string;
    startDate: Date;
    endDate: Date;
  }): Promise<GeminiQuotaMetrics[]> {
    return quotaRepo.getQuotaMetrics(params);
  }
  async getLatestQuotaMetric(brandId: string, windowType: string): Promise<GeminiQuotaMetrics | undefined> {
    return quotaRepo.getLatestQuotaMetric(brandId, windowType);
  }
  async createRateLimitEvent(event: InsertGeminiRateLimitEvent): Promise<GeminiRateLimitEvent> {
    return quotaRepo.createRateLimitEvent(event);
  }
  async getRecentRateLimitEvents(brandId: string, minutes: number): Promise<GeminiRateLimitEvent[]> {
    return quotaRepo.getRecentRateLimitEvents(brandId, minutes);
  }
  async getQuotaAlerts(brandId: string): Promise<GeminiQuotaAlert[]> {
    return quotaRepo.getQuotaAlerts(brandId);
  }
  async upsertQuotaAlert(alert: InsertGeminiQuotaAlert): Promise<GeminiQuotaAlert> {
    return quotaRepo.upsertQuotaAlert(alert);
  }
  async updateQuotaAlertTrigger(id: string): Promise<void> {
    return quotaRepo.updateQuotaAlertTrigger(id);
  }

  // ============================================
  // GOOGLE CLOUD MONITORING SYNC OPERATIONS
  // ============================================
  async saveGoogleQuotaSnapshot(snapshot: InsertGoogleQuotaSnapshot): Promise<GoogleQuotaSnapshot> {
    return quotaRepo.saveGoogleQuotaSnapshot(snapshot);
  }
  async getLatestGoogleQuotaSnapshot(brandId?: string): Promise<GoogleQuotaSnapshot | undefined> {
    return quotaRepo.getLatestGoogleQuotaSnapshot(brandId);
  }
  async getGoogleQuotaSnapshotHistory(params: {
    brandId?: string;
    startDate: Date;
    endDate: Date;
    limit?: number;
  }): Promise<GoogleQuotaSnapshot[]> {
    return quotaRepo.getGoogleQuotaSnapshotHistory(params);
  }
  async createSyncHistoryEntry(entry: InsertGoogleQuotaSyncHistory): Promise<GoogleQuotaSyncHistory> {
    return quotaRepo.createSyncHistoryEntry(entry);
  }
  async updateSyncHistoryEntry(id: string, updates: Partial<InsertGoogleQuotaSyncHistory>): Promise<GoogleQuotaSyncHistory> {
    return quotaRepo.updateSyncHistoryEntry(id, updates);
  }
  async getRecentSyncHistory(limit?: number): Promise<GoogleQuotaSyncHistory[]> {
    return quotaRepo.getRecentSyncHistory(limit);
  }

  // ============================================
  // API KEY MANAGEMENT OPERATIONS
  // ============================================
  async getUserApiKey(userId: string, service: string): Promise<UserApiKey | null> {
    return apiKeyRepo.getUserApiKey(userId, service);
  }
  async getAllUserApiKeys(userId: string): Promise<UserApiKey[]> {
    return apiKeyRepo.getAllUserApiKeys(userId);
  }
  async saveUserApiKey(data: {
    userId: string;
    service: string;
    encryptedKey: string;
    iv: string;
    authTag: string;
    keyPreview: string;
    isValid?: boolean;
  }): Promise<UserApiKey> {
    return apiKeyRepo.saveUserApiKey(data);
  }
  async updateUserApiKeyValidity(userId: string, service: string, isValid: boolean): Promise<void> {
    return apiKeyRepo.updateUserApiKeyValidity(userId, service, isValid);
  }
  async deleteUserApiKey(userId: string, service: string): Promise<void> {
    return apiKeyRepo.deleteUserApiKey(userId, service);
  }
  async logApiKeyAction(entry: {
    userId: string;
    service: string;
    action: 'create' | 'update' | 'delete' | 'validate' | 'use';
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    errorMessage?: string;
  }): Promise<void> {
    return apiKeyRepo.logApiKeyAction(entry);
  }
  async getApiKeyAuditLog(userId: string, service?: string, limit?: number): Promise<ApiKeyAuditLog[]> {
    return apiKeyRepo.getApiKeyAuditLog(userId, service, limit);
  }
  async resolveApiKey(userId: string, service: string): Promise<{ key: string | null; source: 'user' | 'environment' | 'none' }> {
    return apiKeyRepo.resolveApiKey(userId, service);
  }

  // ============================================
  // N8N CONFIGURATION VAULT
  // ============================================
  async saveN8nConfig(userId: string, baseUrl: string, apiKey?: string): Promise<void> {
    return apiKeyRepo.saveN8nConfig(userId, baseUrl, apiKey);
  }
  async getN8nConfig(userId: string): Promise<{ baseUrl: string; apiKey?: string } | null> {
    return apiKeyRepo.getN8nConfig(userId);
  }
  async deleteN8nConfig(userId: string): Promise<void> {
    return apiKeyRepo.deleteN8nConfig(userId);
  }

  // ============================================
  // SOCIAL CONNECTION OPERATIONS
  // ============================================
  async getSocialConnections(userId: string): Promise<SocialConnection[]> {
    return socialRepo.getSocialConnections(userId);
  }
  async getSocialConnectionById(id: string): Promise<SocialConnection | null> {
    return socialRepo.getSocialConnectionById(id);
  }
  async getSocialConnectionByPlatform(userId: string, platform: string): Promise<SocialConnection | null> {
    return socialRepo.getSocialConnectionByPlatform(userId, platform);
  }
  async createSocialConnection(data: InsertSocialConnection): Promise<SocialConnection> {
    return socialRepo.createSocialConnection(data);
  }
  async updateSocialConnection(id: string, updates: Partial<SocialConnection>): Promise<SocialConnection> {
    return socialRepo.updateSocialConnection(id, updates);
  }
  async deleteSocialConnection(id: string): Promise<void> {
    return socialRepo.deleteSocialConnection(id);
  }

  // ============================================
  // LEARN FROM WINNERS - PATTERN OPERATIONS
  // ============================================
  async createLearnedPattern(pattern: InsertLearnedAdPattern): Promise<LearnedAdPattern> {
    return patternRepo.createLearnedPattern(pattern);
  }
  async getLearnedPatterns(userId: string, filters?: {
    category?: string;
    platform?: string;
    industry?: string;
    isActive?: boolean;
  }): Promise<LearnedAdPattern[]> {
    return patternRepo.getLearnedPatterns(userId, filters);
  }
  async getLearnedPatternById(id: string): Promise<LearnedAdPattern | undefined> {
    return patternRepo.getLearnedPatternById(id);
  }
  async getLearnedPatternByHash(userId: string, sourceHash: string): Promise<LearnedAdPattern | undefined> {
    return patternRepo.getLearnedPatternByHash(userId, sourceHash);
  }
  async updateLearnedPattern(id: string, updates: Partial<InsertLearnedAdPattern>): Promise<LearnedAdPattern> {
    return patternRepo.updateLearnedPattern(id, updates);
  }
  async deleteLearnedPattern(id: string): Promise<void> {
    return patternRepo.deleteLearnedPattern(id);
  }
  async incrementPatternUsage(id: string): Promise<void> {
    return patternRepo.incrementPatternUsage(id);
  }
  async createUploadRecord(upload: InsertAdAnalysisUpload): Promise<AdAnalysisUpload> {
    return patternRepo.createUploadRecord(upload);
  }
  async getUploadById(id: string): Promise<AdAnalysisUpload | undefined> {
    return patternRepo.getUploadById(id);
  }
  async updateUploadStatus(id: string, status: string, errorMessage?: string): Promise<AdAnalysisUpload> {
    return patternRepo.updateUploadStatus(id, status, errorMessage);
  }
  async updateUploadWithPattern(id: string, patternId: string, processingDurationMs: number): Promise<AdAnalysisUpload> {
    return patternRepo.updateUploadWithPattern(id, patternId, processingDurationMs);
  }
  async getExpiredUploads(): Promise<AdAnalysisUpload[]> {
    return patternRepo.getExpiredUploads();
  }
  async deleteUpload(id: string): Promise<void> {
    return patternRepo.deleteUpload(id);
  }
  async createApplicationHistory(history: InsertPatternApplicationHistory): Promise<PatternApplicationHistory> {
    return patternRepo.createApplicationHistory(history);
  }
  async getPatternApplicationHistory(patternId: string): Promise<PatternApplicationHistory[]> {
    return patternRepo.getPatternApplicationHistory(patternId);
  }
  async updateApplicationFeedback(id: string, rating: number, wasUsed: boolean, feedback?: string): Promise<PatternApplicationHistory> {
    return patternRepo.updateApplicationFeedback(id, rating, wasUsed, feedback);
  }

  // ============================================
  // CONTENT PLANNER OPERATIONS
  // ============================================
  async createContentPlannerPost(post: InsertContentPlannerPost): Promise<ContentPlannerPost> {
    return planningRepo.createContentPlannerPost(post);
  }
  async getContentPlannerPostsByUser(userId: string, startDate?: Date, endDate?: Date): Promise<ContentPlannerPost[]> {
    return planningRepo.getContentPlannerPostsByUser(userId, startDate, endDate);
  }
  async getWeeklyBalance(userId: string): Promise<{ category: string; count: number }[]> {
    return planningRepo.getWeeklyBalance(userId);
  }
  async deleteContentPlannerPost(id: string): Promise<void> {
    return planningRepo.deleteContentPlannerPost(id);
  }

  // ============================================
  // APPROVAL QUEUE OPERATIONS
  // ============================================
  async createApprovalQueue(data: InsertApprovalQueue): Promise<ApprovalQueue> {
    return approvalRepo.createApprovalQueue(data);
  }
  async getApprovalQueue(id: string): Promise<ApprovalQueue | null> {
    return approvalRepo.getApprovalQueue(id);
  }
  async getApprovalQueueForUser(userId: string, filters?: {
    status?: string;
    priority?: string;
    platform?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<ApprovalQueue[]> {
    return approvalRepo.getApprovalQueueForUser(userId, filters);
  }
  async updateApprovalQueue(id: string, updates: Partial<ApprovalQueue>): Promise<ApprovalQueue> {
    return approvalRepo.updateApprovalQueue(id, updates);
  }
  async deleteApprovalQueue(id: string): Promise<void> {
    return approvalRepo.deleteApprovalQueue(id);
  }
  async createApprovalAuditLog(data: InsertApprovalAuditLog): Promise<ApprovalAuditLog> {
    return approvalRepo.createApprovalAuditLog(data);
  }
  async getApprovalAuditLog(approvalQueueId: string): Promise<ApprovalAuditLog[]> {
    return approvalRepo.getApprovalAuditLog(approvalQueueId);
  }
  async getApprovalSettings(userId: string): Promise<ApprovalSettings | null> {
    return approvalRepo.getApprovalSettings(userId);
  }
  async updateApprovalSettings(userId: string, settings: Partial<ApprovalSettings>): Promise<ApprovalSettings> {
    return approvalRepo.updateApprovalSettings(userId, settings);
  }
}

export const storage = new DbStorage();
