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
  summary: string; // Plain language description (10-20 words)
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
// IDEA BANK MODE TYPES (World-Class Orchestration)
// ============================================

/**
 * IdeaBankMode - Determines how Idea Bank generates suggestions
 * - 'freestyle': AI suggests complete prompts (scene + product details)
 * - 'template': AI suggests content to fill template slots
 */
export type IdeaBankMode = 'freestyle' | 'template';

/**
 * TemplateContext - Template data passed to Idea Bank in template mode
 * Extracted from AdSceneTemplate for LLM context
 */
export interface TemplateContext {
  id: string;
  title: string;
  promptBlueprint: string;
  placementHints?: PlacementHints;
  lightingStyle?: string;
  mood?: string;
  environment?: string;
  category: string;
  aspectRatioHints?: string[];
  platformHints?: string[];
  bestForProductTypes?: string[];
}

/**
 * TemplateSlotSuggestion - AI suggestions for filling template slots
 * Returned when mode = 'template'
 */
export interface TemplateSlotSuggestion {
  // Product-specific content to fill template slots
  productHighlights: string[];      // Key features to show (3-5)
  productPlacement: string;         // How to position product in scene
  detailsToEmphasize: string[];     // Visual details to highlight
  scaleReference?: string;          // Optional scale indicator (e.g., "worker hands")

  // Copy suggestions for template text slots
  headerText?: string;              // Headline (max 60 chars)
  bodyText?: string;                // Supporting copy (max 150 chars)
  ctaSuggestion?: string;           // Call to action (max 30 chars)

  // Technical guidance for generation
  colorHarmony: string[];           // Colors that complement the product
  lightingNotes: string;            // How to light this specific product

  // Meta
  confidence: number;               // 0-100 confidence score
  reasoning: string;                // Why these suggestions work
}

/**
 * IdeaBankTemplateResponse - Response when mode = 'template'
 * Different from freestyle response which returns complete prompts
 */
export interface IdeaBankTemplateResponse {
  slotSuggestions: TemplateSlotSuggestion[];
  template: TemplateContext;
  mergedPrompt: string;             // Template blueprint + product insights merged
  analysisStatus: AnalysisStatus;
  recipe?: GenerationRecipe;
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

  // Mode awareness (World-Class Orchestration)
  mode?: IdeaBankMode;    // 'freestyle' (default) or 'template'
  templateId?: string;    // Required when mode = 'template'
}

export interface AnalysisStatus {
  visionComplete: boolean;
  kbQueried: boolean;
  templatesMatched: number;
  webSearchUsed: boolean;
  productKnowledgeUsed?: boolean; // Phase 0.5
  uploadDescriptionsUsed?: number; // Phase 9 - count of upload descriptions used
  learnedPatternsUsed?: number; // Learn from Winners - count of patterns applied
}

export interface IdeaBankSuggestResponse {
  suggestions: IdeaBankSuggestion[];
  analysisStatus: AnalysisStatus;
  // GenerationRecipe for passing context to /api/transform
  // Includes relationships, scenarios, brand context
  recipe?: GenerationRecipe;
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
  | 'product_showcase'
  | 'installation'
  | 'worksite'
  | 'professional'
  | 'educational';

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
  | 'industrial'
  | 'professional'
  | 'bold'
  | 'minimal'
  | 'urgent';

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
// GENERATION RECIPE TYPES
// ============================================

/**
 * GenerationRecipe - Encapsulates all context for image generation
 * Built by IdeaBankService and optionally passed to /api/transform
 */
export interface GenerationRecipeProduct {
  id: string;
  name: string;
  category?: string;
  description?: string;
  imageUrls: string[];
}

export interface GenerationRecipeRelationship {
  sourceProductId: string;
  sourceProductName: string;
  targetProductId: string;
  targetProductName: string;
  relationshipType: string;
  description?: string;
}

export interface GenerationRecipeScenario {
  id: string;
  title: string;
  description: string;
  steps?: string[];
  isActive: boolean;
  scenarioType?: string;
}

export interface GenerationRecipeDebugContext {
  relationshipsFound: number;
  scenariosFound: number;
  scenariosActive: number;
  scenariosInactive: number;
  templatesMatched: number;
  brandImagesFound: number;
  buildTimeMs: number;
}

export interface GenerationRecipe {
  version: "1.0";
  products: GenerationRecipeProduct[];
  relationships: GenerationRecipeRelationship[];
  scenarios: GenerationRecipeScenario[];
  template?: {
    id: string;
    title: string;
    category: string;
    aspectRatio?: string;
  };
  brandImages?: Array<{
    id: string;
    imageUrl: string;
    category: string;
  }>;
  brandVoice?: {
    brandName?: string;
    industry?: string;
    values?: string[];
  };
  // Debug context - only included when ENABLE_DEBUG_CONTEXT=true
  debugContext?: GenerationRecipeDebugContext;
}

// ============================================
// BACKWARD COMPATIBILITY
// ============================================

/**
 * Legacy prompt suggestions response (plain array)
 * @deprecated Use IdeaBankSuggestResponse instead
 */
export type LegacyPromptSuggestionsResponse = string[];
