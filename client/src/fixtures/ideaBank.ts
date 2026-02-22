/**
 * Idea Bank Test Fixtures
 *
 * Mock data for testing the Intelligent Idea Bank features.
 * Covers suggestions, analyses, and recipe generation.
 *
 * @file client/src/fixtures/ideaBank.ts
 */

import type {
  IdeaBankSuggestion,
  IdeaBankSuggestResponse,
  IdeaBankSuggestRequest,
  AnalysisStatus,
  SourcesUsed,
  ProductAnalysisResult,
  GenerationRecipe,
  GenerationRecipeProduct,
  TemplateSlotSuggestion,
  IdeaBankTemplateResponse,
  TemplateContext,
} from '../../../shared/types/ideaBank';

// === MOCK ANALYSIS STATUS ===

/**
 * Analysis status indicating all sources were used
 */
export const fullAnalysisStatus: AnalysisStatus = {
  visionComplete: true,
  kbQueried: true,
  templatesMatched: 5,
  webSearchUsed: true,
  productKnowledgeUsed: true,
  uploadDescriptionsUsed: 0,
  learnedPatternsUsed: 2,
};

/**
 * Analysis status with only vision
 */
export const visionOnlyAnalysisStatus: AnalysisStatus = {
  visionComplete: true,
  kbQueried: false,
  templatesMatched: 0,
  webSearchUsed: false,
  productKnowledgeUsed: false,
  uploadDescriptionsUsed: 0,
  learnedPatternsUsed: 0,
};

/**
 * Analysis status with KB but no web search
 */
export const kbOnlyAnalysisStatus: AnalysisStatus = {
  visionComplete: true,
  kbQueried: true,
  templatesMatched: 3,
  webSearchUsed: false,
  productKnowledgeUsed: true,
  uploadDescriptionsUsed: 0,
  learnedPatternsUsed: 1,
};

// === MOCK SOURCES USED ===

export const allSourcesUsed: SourcesUsed = {
  visionAnalysis: true,
  kbRetrieval: true,
  webSearch: true,
  templateMatching: true,
};

export const visionOnlySourcesUsed: SourcesUsed = {
  visionAnalysis: true,
  kbRetrieval: false,
  webSearch: false,
  templateMatching: false,
};

export const noSourcesUsed: SourcesUsed = {
  visionAnalysis: false,
  kbRetrieval: false,
  webSearch: false,
  templateMatching: false,
};

// === MOCK IDEA BANK SUGGESTIONS ===

/**
 * Full mock suggestions array with various modes and confidence levels
 */
export const mockSuggestions: IdeaBankSuggestion[] = [
  {
    id: 'sug-001',
    summary: 'Professional studio showcase on white background with soft lighting',
    prompt:
      'Create a professional product photograph of the NDS EZ-Drain French drain system centered on an infinite white cyclorama background. Use soft diffused lighting from above and sides, no harsh shadows. The product should fill approximately 60% of the frame with ultra-sharp focus on product details.',
    mode: 'exact_insert',
    templateIds: ['ast-001'],
    reasoning:
      'Studio showcase is ideal for e-commerce and product pages. The clean background ensures the product is the focus.',
    confidence: 95,
    sourcesUsed: allSourcesUsed,
    recommendedPlatform: 'instagram',
    recommendedAspectRatio: '1:1',
  },
  {
    id: 'sug-002',
    summary: 'Active construction site installation with workers',
    prompt:
      'Show the NDS EZ-Drain being installed in an active construction trench by workers wearing safety vests and hard hats. Morning sunlight creating warm golden hour glow. Dust particles in the air. Realistic construction environment with equipment visible in background.',
    mode: 'inspiration',
    templateIds: ['ast-002'],
    reasoning:
      'Installation shots demonstrate product in real-world use, building credibility with professional contractors.',
    confidence: 88,
    sourcesUsed: {
      visionAnalysis: true,
      kbRetrieval: true,
      webSearch: false,
      templateMatching: true,
    },
    recommendedPlatform: 'linkedin',
    recommendedAspectRatio: '16:9',
  },
  {
    id: 'sug-003',
    summary: 'Before/after split showing drainage problem solved',
    prompt:
      'Create a split-screen before/after image. LEFT: Flooded yard with standing water, muddy grass, and drainage problems. RIGHT: Same yard with NDS EZ-Drain installed showing perfect drainage, green healthy grass, no standing water. Consistent lighting on both sides with clear dividing line.',
    mode: 'exact_insert',
    templateIds: ['ast-003'],
    reasoning:
      'Before/after comparisons are highly effective for showing product value and solving customer pain points.',
    confidence: 92,
    sourcesUsed: allSourcesUsed,
    recommendedPlatform: 'facebook',
    recommendedAspectRatio: '1:1',
  },
  {
    id: 'sug-004',
    summary: 'Scale demonstration with worker hands for size reference',
    prompt:
      'Close-up of the NDS EZ-Drain section being held by professional worker hands wearing work gloves. Product is the hero element, hands provide scale reference. Shallow depth of field blurs the worksite background. Natural daylight illumination.',
    mode: 'inspiration',
    templateIds: ['ast-004'],
    reasoning: 'Scale reference helps customers understand product dimensions, important for purchase decisions.',
    confidence: 78,
    sourcesUsed: visionOnlySourcesUsed,
    recommendedPlatform: 'instagram',
    recommendedAspectRatio: '4:5',
  },
  {
    id: 'sug-005',
    summary: 'Underground cross-section showing proper installation',
    prompt:
      'Educational cross-section illustration showing NDS EZ-Drain installed underground. Clear soil layers visible including topsoil, gravel bed, and native soil. Proper grading and drainage direction indicated with arrows. Technical but accessible visual style.',
    mode: 'standard',
    templateIds: ['ast-007'],
    reasoning: 'Educational content builds authority and helps DIYers understand proper installation techniques.',
    confidence: 85,
    sourcesUsed: {
      visionAnalysis: true,
      kbRetrieval: true,
      webSearch: true,
      templateMatching: true,
    },
    recommendedPlatform: 'youtube',
    recommendedAspectRatio: '16:9',
  },
  {
    id: 'sug-006',
    summary: 'Urgency promotional banner with bold colors',
    prompt:
      'Dynamic product shot of NDS EZ-Drain at dramatic 45-degree angle. Bold red and yellow accent colors creating energy. High contrast dramatic lighting. Space reserved in upper right corner for promotional text overlay like "LIMITED TIME" or "SAVE 20%".',
    mode: 'exact_insert',
    templateIds: ['ast-006'],
    reasoning: 'Urgency-focused creative drives immediate action for promotional campaigns and sales events.',
    confidence: 70,
    sourcesUsed: visionOnlySourcesUsed,
    recommendedPlatform: 'facebook',
    recommendedAspectRatio: '16:9',
  },
];

// === MOCK SUGGESTION REQUESTS ===

export const singleProductRequest: IdeaBankSuggestRequest = {
  productId: 'prod-drain-001',
  platform: 'instagram',
  maxSuggestions: 5,
};

export const multiProductRequest: IdeaBankSuggestRequest = {
  productIds: ['prod-drain-001', 'prod-drain-002', 'prod-wp-001'],
  platform: 'linkedin',
  userGoal: 'Showcase our drainage and waterproofing solutions together',
  maxSuggestions: 6,
};

export const templateModeRequest: IdeaBankSuggestRequest = {
  productId: 'prod-floor-001',
  mode: 'template',
  templateId: 'ast-005',
  platform: 'instagram',
};

export const webSearchEnabledRequest: IdeaBankSuggestRequest = {
  productId: 'prod-conc-001',
  enableWebSearch: true,
  userGoal: 'Find trending content ideas for concrete products',
};

// === MOCK SUGGESTION RESPONSES ===

export const fullSuggestionResponse: IdeaBankSuggestResponse = {
  suggestions: mockSuggestions,
  analysisStatus: fullAnalysisStatus,
  recipe: {
    version: '1.0',
    products: [
      {
        id: 'prod-drain-001',
        name: 'NDS EZ-Drain',
        category: 'drainage',
        description: 'Pre-constructed French drain system',
        imageUrls: ['https://res.cloudinary.com/demo/image/upload/v1/products/nds-ez-drain.jpg'],
      },
    ],
    relationships: [],
    scenarios: [],
    brandVoice: {
      brandName: 'Pro Building Supplies',
      industry: 'Construction Materials',
      values: ['Quality', 'Reliability'],
    },
  },
};

export const minimalSuggestionResponse: IdeaBankSuggestResponse = {
  suggestions: [mockSuggestions[0]!],
  analysisStatus: visionOnlyAnalysisStatus,
};

// === MOCK PRODUCT ANALYSES ===

export const mockProductAnalyses: ProductAnalysisResult[] = [
  {
    id: 'pa-001',
    productId: 'prod-drain-001',
    imageFingerprint: 'abc123def456',
    category: 'drainage',
    subcategory: 'french-drain',
    materials: ['HDPE', 'fabric'],
    colors: ['black', 'gray'],
    style: 'industrial',
    usageContext: 'Residential and commercial drainage systems',
    targetDemographic: 'Contractors, landscapers, DIY homeowners',
    detectedText: 'NDS EZ-Drain',
    confidence: 92,
    modelVersion: 'gemini-3-pro-preview',
    analyzedAt: '2026-01-10T12:00:00Z',
  },
  {
    id: 'pa-002',
    productId: 'prod-floor-001',
    imageFingerprint: 'xyz789abc012',
    category: 'flooring',
    subcategory: 'engineered-hardwood',
    materials: ['oak', 'plywood', 'polyurethane'],
    colors: ['natural', 'tan', 'brown'],
    style: 'modern',
    usageContext: 'Residential living spaces, bedrooms, offices',
    targetDemographic: 'Homeowners, interior designers',
    detectedText: null,
    confidence: 88,
    modelVersion: 'gemini-3-pro-preview',
    analyzedAt: '2026-01-08T10:30:00Z',
  },
  {
    id: 'pa-003',
    productId: 'prod-wp-001',
    imageFingerprint: 'mem456brane',
    category: 'waterproofing',
    subcategory: 'membrane',
    materials: ['SBS bitumen', 'polyethylene'],
    colors: ['blue', 'black'],
    style: 'professional',
    usageContext: 'Foundation waterproofing, air barriers',
    targetDemographic: 'Commercial contractors, builders',
    detectedText: 'BlueSkin VP160',
    confidence: 95,
    modelVersion: 'gemini-3-pro-preview',
    analyzedAt: '2026-01-12T14:45:00Z',
  },
];

// === MOCK GENERATION RECIPES ===

export const simpleRecipe: GenerationRecipe = {
  version: '1.0',
  products: [
    {
      id: 'prod-drain-001',
      name: 'NDS EZ-Drain',
      category: 'drainage',
      imageUrls: ['https://example.com/drain.jpg'],
    },
  ],
  relationships: [],
  scenarios: [],
};

export const complexRecipe: GenerationRecipe = {
  version: '1.0',
  products: [
    {
      id: 'prod-drain-001',
      name: 'NDS EZ-Drain',
      category: 'drainage',
      description: 'Pre-constructed French drain system',
      imageUrls: ['https://example.com/drain.jpg'],
    },
    {
      id: 'prod-wp-001',
      name: 'BlueSkin VP160',
      category: 'waterproofing',
      description: 'Self-adhered membrane',
      imageUrls: ['https://example.com/membrane.jpg'],
    },
  ],
  relationships: [
    {
      sourceProductId: 'prod-drain-001',
      sourceProductName: 'NDS EZ-Drain',
      targetProductId: 'prod-wp-001',
      targetProductName: 'BlueSkin VP160',
      relationshipType: 'pairs_with',
      description: 'Drainage and waterproofing work together for complete water management',
    },
  ],
  scenarios: [
    {
      id: 'scenario-001',
      title: 'Foundation Water Management',
      description: 'Complete foundation protection using drainage and waterproofing',
      steps: ['Install membrane on foundation wall', 'Connect drainage at footing'],
      isActive: true,
      scenarioType: 'application',
    },
  ],
  template: {
    id: 'ast-002',
    title: 'Active Construction Site',
    category: 'worksite',
    aspectRatio: '16:9',
  },
  brandImages: [
    {
      id: 'bi-001',
      imageUrl: 'https://example.com/brand-image.jpg',
      category: 'installation',
    },
  ],
  brandVoice: {
    brandName: 'Pro Building Supplies',
    industry: 'Construction Materials',
    values: ['Quality', 'Reliability', 'Professional Service'],
  },
  debugContext: {
    relationshipsFound: 1,
    scenariosFound: 1,
    scenariosActive: 1,
    scenariosInactive: 0,
    templatesMatched: 3,
    brandImagesFound: 1,
    buildTimeMs: 245,
  },
};

// === MOCK TEMPLATE SLOT SUGGESTIONS ===

export const mockSlotSuggestions: TemplateSlotSuggestion[] = [
  {
    productHighlights: ['Gravel-free technology', 'Quick installation', 'UV stabilized'],
    productPlacement: 'Center the drain pipe diagonally across the frame',
    detailsToEmphasize: ['Fabric wrap texture', 'Connection points', 'Flexibility'],
    scaleReference: 'Include worker hands for size context',
    headerText: 'Install in Minutes',
    bodyText: 'No gravel needed. Just unroll and connect for professional drainage.',
    ctaSuggestion: 'Shop Now',
    colorHarmony: ['earth tones', 'green grass', 'blue sky'],
    lightingNotes: 'Natural daylight, golden hour preferred for warm feel',
    confidence: 91,
    reasoning: 'Highlighting speed and simplicity addresses main customer pain points',
  },
  {
    productHighlights: ['Real oak beauty', 'Radiant heat compatible', 'Wide planks'],
    productPlacement: 'Fill bottom 60% of frame as flooring',
    detailsToEmphasize: ['Wood grain patterns', 'Plank width', 'Natural color variation'],
    scaleReference: 'Modern furniture for lifestyle context',
    headerText: 'Real Wood. Real Beautiful.',
    bodyText: 'Engineered for performance, designed for style.',
    ctaSuggestion: 'Get Free Samples',
    colorHarmony: ['warm neutrals', 'white walls', 'green plants'],
    lightingNotes: 'Soft natural light from large windows, avoid harsh shadows',
    confidence: 88,
    reasoning: 'Lifestyle imagery emphasizes beauty while technical details build confidence',
  },
];

// === MOCK TEMPLATE CONTEXT ===

export const mockTemplateContext: TemplateContext = {
  id: 'ast-005',
  title: 'Luxury Interior Lifestyle',
  promptBlueprint: 'Beautiful modern interior featuring {{product}} as the flooring/wall treatment.',
  placementHints: { position: 'bottom', scale: 'fill' },
  lightingStyle: 'natural',
  mood: 'minimal',
  environment: 'indoor',
  category: 'product_showcase',
  aspectRatioHints: ['4:5', '9:16'],
  platformHints: ['instagram', 'pinterest'],
  bestForProductTypes: ['flooring', 'tile', 'wall-panels'],
};

// === MOCK TEMPLATE RESPONSE ===

export const mockTemplateResponse: IdeaBankTemplateResponse = {
  slotSuggestions: mockSlotSuggestions,
  template: mockTemplateContext,
  mergedPrompt:
    'Beautiful modern interior featuring Premium Engineered Oak as the flooring. Real oak beauty with wide planks showing natural color variation. Soft natural light from large windows highlighting the wood grain patterns. Modern furniture provides lifestyle context. Space for text overlay in upper portion.',
  analysisStatus: fullAnalysisStatus,
  recipe: complexRecipe,
};

// === FILTERED SUBSETS ===

/** High confidence suggestions (>= 85) */
export const highConfidenceSuggestions = mockSuggestions.filter((s) => s.confidence >= 85);

/** Low confidence suggestions (< 80) */
export const lowConfidenceSuggestions = mockSuggestions.filter((s) => s.confidence < 80);

/** Exact insert mode suggestions */
export const exactInsertSuggestions = mockSuggestions.filter((s) => s.mode === 'exact_insert');

/** Inspiration mode suggestions */
export const inspirationSuggestions = mockSuggestions.filter((s) => s.mode === 'inspiration');

/** Standard mode suggestions */
export const standardSuggestions = mockSuggestions.filter((s) => s.mode === 'standard');

/** Instagram-targeted suggestions */
export const instagramSuggestions = mockSuggestions.filter((s) => s.recommendedPlatform === 'instagram');

// === FACTORY FUNCTIONS ===

/**
 * Creates a mock suggestion with custom overrides
 */
export function createMockSuggestion(overrides: Partial<IdeaBankSuggestion> = {}): IdeaBankSuggestion {
  const id = overrides.id || `sug-test-${Date.now()}`;
  return {
    id,
    summary: 'Test suggestion summary',
    prompt: 'Test prompt for product photography',
    mode: 'standard',
    templateIds: [],
    reasoning: 'Test reasoning for this suggestion',
    confidence: 80,
    sourcesUsed: visionOnlySourcesUsed,
    recommendedPlatform: 'instagram',
    recommendedAspectRatio: '1:1',
    ...overrides,
  };
}

/**
 * Creates a mock suggestion response
 */
export function createMockSuggestResponse(
  suggestions: IdeaBankSuggestion[] = [createMockSuggestion()],
  overrides: Partial<IdeaBankSuggestResponse> = {},
): IdeaBankSuggestResponse {
  return {
    suggestions,
    analysisStatus: visionOnlyAnalysisStatus,
    ...overrides,
  };
}

/**
 * Creates a mock product analysis
 */
export function createMockAnalysis(
  productId: string,
  overrides: Partial<ProductAnalysisResult> = {},
): ProductAnalysisResult {
  const id = overrides.id || `pa-test-${Date.now()}`;
  return {
    id,
    productId,
    imageFingerprint: `fingerprint-${productId}`,
    category: 'test',
    subcategory: 'test-sub',
    materials: ['material-1'],
    colors: ['gray'],
    style: 'professional',
    usageContext: 'Test usage context',
    targetDemographic: 'Test demographic',
    detectedText: null,
    confidence: 85,
    modelVersion: 'gemini-3-pro-preview',
    analyzedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Creates a mock generation recipe
 */
export function createMockRecipe(
  products: GenerationRecipeProduct[],
  overrides: Partial<GenerationRecipe> = {},
): GenerationRecipe {
  return {
    version: '1.0',
    products,
    relationships: [],
    scenarios: [],
    ...overrides,
  };
}

// === SINGLE ITEM EXPORTS ===

/** A high-confidence suggestion */
export const singleHighConfidenceSuggestion = mockSuggestions[0];

/** A low-confidence suggestion */
export const singleLowConfidenceSuggestion = mockSuggestions[5];

/** An exact insert suggestion */
export const singleExactInsertSuggestion = mockSuggestions[0];

/** An inspiration suggestion */
export const singleInspirationSuggestion = mockSuggestions[1];

/** A standard mode suggestion */
export const singleStandardSuggestion = mockSuggestions[4];

/** A complete product analysis */
export const singleProductAnalysis = mockProductAnalyses[0];
