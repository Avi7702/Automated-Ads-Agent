/**
 * Shared types for Intelligent Idea Bank API
 * Used by both server and client to ensure contract consistency
 */

// ============================================
// SUGGESTION TYPES
// ============================================

export type GenerationMode = 'exact_insert' | 'inspiration' | 'standard';

export interface SourcesUsed {
  visionAnalysis: boolean;
  kbRetrieval: boolean;
  webSearch: boolean;
  templateMatching: boolean;
}

export interface IdeaBankSuggestion {
  id: string;
  prompt: string;
  mode: GenerationMode;
  templateIds?: string[];
  reasoning: string;
  confidence: number;
  sourcesUsed: SourcesUsed;
  recommendedPlatform?: string;
  recommendedAspectRatio?: string;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface IdeaBankSuggestRequest {
  productId?: string; // Single product (backward compatibility)
  productIds?: string[]; // Multiple products (preferred)
  uploadDescriptions?: string[]; // Descriptions of temporary uploads (Phase 9)
  platform?: string;
  templateCategory?: string;
  userGoal?: string; // User-provided context/goal
  enableWebSearch?: boolean; // KB-first policy, default false
  maxSuggestions?: number;
}

export interface AnalysisStatus {
  visionComplete: boolean;
  kbQueried: boolean;
  templatesMatched: number;
  webSearchUsed: boolean;
  productKnowledgeUsed?: boolean; // Phase 0.5
  uploadDescriptionsUsed?: number; // Phase 9 - count of upload descriptions used
}

export interface IdeaBankSuggestResponse {
  suggestions: IdeaBankSuggestion[];
  analysisStatus: AnalysisStatus;
}

// Legacy format for batch analysis
export interface BatchAnalysisStatus {
  productsAnalyzed: number;
  fromCache: number;
  newlyAnalyzed: number;
}

// ============================================
// PRODUCT ANALYSIS TYPES
// ============================================

export interface ProductAnalysisResult {
  id: string;
  productId: string;
  imageFingerprint: string;
  category: string | null;
  subcategory: string | null;
  materials: string[];
  colors: string[];
  style: string | null;
  usageContext: string | null;
  targetDemographic: string | null;
  detectedText: string | null;
  confidence: number;
  modelVersion: string | null;
  analyzedAt: string;
}

export interface ProductAnalyzeRequest {
  productId: string;
}

export interface ProductAnalyzeResponse {
  analysis: ProductAnalysisResult;
  fromCache: boolean;
}

export interface ProductAnalyzeBatchRequest {
  productIds: string[];
}

export interface ProductAnalyzeBatchResponse {
  analyses: ProductAnalysisResult[];
  status: BatchAnalysisStatus;
}

// ============================================
// TEMPLATE TYPES
// ============================================

export type TemplateCategory =
  | 'lifestyle'
  | 'professional'
  | 'outdoor'
  | 'luxury'
  | 'seasonal';

export type TemplateIntent =
  | 'showcase'
  | 'installation'
  | 'before-after'
  | 'scale-demo';

export type TemplateEnvironment =
  | 'indoor'
  | 'outdoor'
  | 'studio'
  | 'worksite';

export type TemplateMood =
  | 'luxury'
  | 'cozy'
  | 'industrial'
  | 'minimal'
  | 'vibrant';

export interface PlacementHints {
  position?: 'center' | 'left' | 'right' | 'top' | 'bottom';
  scale?: 'small' | 'medium' | 'large' | 'fill';
}

export interface ReferenceImage {
  url: string;
  publicId: string;
}

export interface AdSceneTemplate {
  id: string;
  title: string;
  description: string | null;
  previewImageUrl: string;
  previewPublicId: string;
  referenceImages: ReferenceImage[] | null;
  category: TemplateCategory;
  tags: string[];
  platformHints: string[] | null;
  aspectRatioHints: string[] | null;
  promptBlueprint: string;
  placementHints: PlacementHints | null;
  lightingStyle: string | null;
  intent?: TemplateIntent;
  environment?: TemplateEnvironment;
  mood?: TemplateMood;
  bestForProductTypes?: string[];
  isGlobal: boolean;
  createdBy: string | null;
  createdAt: string;
}

export interface TemplateFilters {
  category?: TemplateCategory;
  platform?: string;
  tags?: string[];
  intent?: TemplateIntent;
  environment?: TemplateEnvironment;
  mood?: TemplateMood;
}

export interface TemplateListResponse {
  templates: AdSceneTemplate[];
  total: number;
}

export interface TemplateCreateRequest {
  title: string;
  description?: string;
  previewImageUrl: string;
  previewPublicId: string;
  referenceImages?: ReferenceImage[];
  category: TemplateCategory;
  tags?: string[];
  platformHints?: string[];
  aspectRatioHints?: string[];
  promptBlueprint: string;
  placementHints?: PlacementHints;
  lightingStyle?: string;
  intent?: TemplateIntent;
  environment?: TemplateEnvironment;
  mood?: TemplateMood;
  bestForProductTypes?: string[];
}

// ============================================
// BRAND PROFILE TYPES
// ============================================

export interface BrandVoice {
  principles: string[];
  wordsToUse?: string[];
  wordsToAvoid?: string[];
}

export interface TargetAudience {
  demographics?: string;
  psychographics?: string;
  painPoints?: string[];
}

export interface BrandProfile {
  id: string;
  userId: string;
  brandName: string | null;
  industry: string | null;
  brandValues: string[] | null;
  targetAudience: TargetAudience | null;
  preferredStyles: string[] | null;
  colorPreferences: string[] | null;
  voice: BrandVoice | null;
  kbTags: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface BrandProfileUpdateRequest {
  brandName?: string;
  industry?: string;
  brandValues?: string[];
  targetAudience?: TargetAudience;
  preferredStyles?: string[];
  colorPreferences?: string[];
  voice?: BrandVoice;
  kbTags?: string[];
}

// ============================================
// GENERATION TYPES (Extended)
// ============================================

export interface GenerationModeParams {
  mode: GenerationMode;
  templateId?: string;
  templateReferenceUrls?: string[];
}

// ============================================
// BACKWARD COMPATIBILITY
// ============================================

/**
 * Legacy prompt suggestions response (plain array)
 * @deprecated Use IdeaBankSuggestResponse instead
 */
export type LegacyPromptSuggestionsResponse = string[];
