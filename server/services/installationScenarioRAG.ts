/**
 * Installation Scenario RAG Service
 *
 * Uses RAG (Retrieval Augmented Generation) to suggest installation steps,
 * tips, and required accessories based on product and room type.
 *
 * This service queries the knowledge base for relevant installation guides
 * and uses AI to generate contextual recommendations.
 *
 * Key capabilities:
 * 1. Suggest installation steps based on product type and room context
 * 2. Recommend required accessories for a complete installation
 * 3. Provide room-specific installation tips
 * 4. Match products to installation scenarios from the database
 */

import { generateContentWithRetry } from '../lib/geminiClient';
import { storage } from '../storage';
import { logger } from '../lib/logger';
import { telemetry } from '../instrumentation';
import { queryFileSearchStore, FileCategory } from './fileSearchService';
import type { Product, ProductAnalysis, InstallationScenario } from '@shared/schema';

// ============================================
// TYPES
// ============================================

/**
 * Room types for installation context
 */
export const ROOM_TYPES = [
  'living_room',
  'bedroom',
  'kitchen',
  'bathroom',
  'basement',
  'commercial',
  'outdoor',
  'hallway',
  'office',
  'dining_room'
] as const;

export type RoomType = typeof ROOM_TYPES[number];

/**
 * Scenario types for installation contexts
 */
export const SCENARIO_TYPES = [
  'room_type',
  'application',
  'before_after'
] as const;

export type ScenarioType = typeof SCENARIO_TYPES[number];

/**
 * Context for installation suggestions
 */
export interface InstallationContext {
  /** Product ID to get installation steps for */
  productId: string;
  /** Room type for context-specific suggestions */
  roomType?: RoomType;
  /** User ID for accessing user-specific scenarios */
  userId: string;
  /** Include related products in suggestions */
  includeRelatedProducts?: boolean;
  /** Maximum number of steps to suggest */
  maxSteps?: number;
}

/**
 * A single installation step suggestion
 */
export interface InstallationStep {
  /** Step number (1-based) */
  stepNumber: number;
  /** Title of the step */
  title: string;
  /** Detailed description of the step */
  description: string;
  /** Estimated time for this step (e.g., "15 minutes") */
  estimatedTime?: string;
  /** Tools required for this step */
  toolsRequired?: string[];
  /** Tips specific to this step */
  tips?: string[];
  /** Warning or caution notes */
  warnings?: string[];
}

/**
 * Required accessory recommendation
 */
export interface AccessoryRecommendation {
  /** Name of the accessory */
  name: string;
  /** Category of accessory (e.g., "underlayment", "trim", "adhesive") */
  category: string;
  /** Why this accessory is needed */
  reason: string;
  /** Whether this is required or optional */
  isRequired: boolean;
  /** Quantity suggestion if applicable */
  quantitySuggestion?: string;
  /** Related product ID if we have it in the database */
  relatedProductId?: string;
}

/**
 * Installation tip specific to room type or product
 */
export interface InstallationTip {
  /** The tip content */
  tip: string;
  /** Category of tip (prep, safety, finishing, maintenance) */
  category: 'prep' | 'safety' | 'finishing' | 'maintenance';
  /** Relevance to current context (0-100) */
  relevance: number;
  /** Source of the tip (kb, ai_inference, scenario) */
  source: 'kb' | 'ai_inference' | 'scenario';
}

/**
 * Complete installation suggestion response
 */
export interface InstallationSuggestionResult {
  /** Suggested installation steps */
  steps: InstallationStep[];
  /** Required and recommended accessories */
  accessories: AccessoryRecommendation[];
  /** Room-specific and general tips */
  tips: InstallationTip[];
  /** Matching installation scenarios from database */
  matchingScenarios: InstallationScenario[];
  /** Metadata about the suggestion */
  metadata: {
    productId: string;
    productName: string;
    roomType?: RoomType;
    totalEstimatedTime?: string;
    difficultyLevel?: 'beginner' | 'intermediate' | 'advanced';
    kbContextUsed: boolean;
    generatedAt: Date;
  };
}

/**
 * Room-specific installation context
 */
export interface RoomInstallationContext {
  /** Room type */
  roomType: RoomType;
  /** Special considerations for this room */
  considerations: string[];
  /** Recommended products for this room */
  recommendedProductTypes: string[];
  /** Common challenges */
  challenges: string[];
  /** Best practices */
  bestPractices: string[];
}

// ============================================
// CONSTANTS
// ============================================

// Model for text analysis
// MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.
const TEXT_MODEL = 'gemini-2.0-flash';

/**
 * Room-specific installation considerations
 */
const ROOM_CONSIDERATIONS: Record<RoomType, string[]> = {
  living_room: [
    'High traffic area - consider durability',
    'May need furniture moving and replacement',
    'Natural lighting affects color perception',
    'Consider noise reduction for attached rooms'
  ],
  bedroom: [
    'Softer feel underfoot preferred',
    'Sound insulation important',
    'Consider allergies - hypoallergenic options',
    'Closet and doorway transitions'
  ],
  kitchen: [
    'Water and moisture resistance essential',
    'Easy to clean surface preferred',
    'Consider subfloor leveling for appliances',
    'May need to work around fixed cabinets'
  ],
  bathroom: [
    'Waterproof flooring required',
    'Non-slip surface critical for safety',
    'Proper sealing around fixtures',
    'Moisture barrier installation essential'
  ],
  basement: [
    'Moisture control is primary concern',
    'Concrete subfloor preparation needed',
    'Consider floating floor systems',
    'Temperature and humidity fluctuations'
  ],
  commercial: [
    'Heavy duty products required',
    'ADA compliance considerations',
    'Minimal downtime during installation',
    'Durability and maintenance long-term'
  ],
  outdoor: [
    'Weather resistance critical',
    'UV protection needed',
    'Drainage considerations',
    'Expansion and contraction allowance'
  ],
  hallway: [
    'High traffic durability needed',
    'Transition strips to adjacent rooms',
    'Narrow space installation challenges',
    'Consider pattern direction flow'
  ],
  office: [
    'Professional appearance important',
    'Static control may be needed',
    'Under-desk and chair durability',
    'Acoustic properties for noise'
  ],
  dining_room: [
    'Spill and stain resistance',
    'Easy to clean under furniture',
    'Chair leg protection considerations',
    'May connect to kitchen and living room'
  ]
};

/**
 * Common accessory categories
 */
const ACCESSORY_CATEGORIES = [
  'underlayment',
  'trim',
  'transition_strips',
  'adhesive',
  'moisture_barrier',
  'fasteners',
  'tools',
  'cleaning_supplies',
  'protection'
] as const;

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Suggest installation steps for a product
 *
 * Uses RAG to query knowledge base and AI to generate contextual steps
 */
export async function suggestInstallationSteps(
  context: InstallationContext
): Promise<InstallationSuggestionResult> {
  const startTime = Date.now();

  try {
    // 1. Get the product information
    const product = await storage.getProductById(context.productId);
    if (!product) {
      throw new Error(`Product not found: ${context.productId}`);
    }

    // 2. Get product analysis if available
    const productAnalysis = await storage.getProductAnalysisByProductId(context.productId);

    // 3. Get existing installation scenarios for this product
    const matchingScenarios = await storage.getInstallationScenariosForProducts([context.productId]);

    // 4. If room type specified, also get scenarios by room type
    let roomScenarios: InstallationScenario[] = [];
    if (context.roomType) {
      roomScenarios = await storage.getScenariosByRoomType(context.roomType);
    }

    // 5. Combine and deduplicate scenarios
    const allScenarios = deduplicateScenarios([...matchingScenarios, ...roomScenarios]);

    // 6. Query knowledge base for installation guides
    const kbContext = await queryInstallationKnowledgeBase(product, context.roomType);

    // 7. Build context for AI generation
    const productContext = buildProductContext(product, productAnalysis);
    const roomContext = context.roomType
      ? buildRoomContext(context.roomType)
      : null;
    const scenarioContext = buildScenarioContext(allScenarios);

    // 8. Generate installation suggestions using AI
    const prompt = buildInstallationPrompt(
      product,
      productContext,
      roomContext,
      scenarioContext,
      kbContext,
      context.maxSteps
    );

    const response = await generateContentWithRetry({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3, // Lower temperature for more consistent results
      }
    }, { operation: 'installation_scenario' });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 9. Parse the AI response
    const suggestions = parseInstallationSuggestions(responseText, product, context.roomType);

    // 10. Enrich with matching scenarios
    suggestions.matchingScenarios = allScenarios;
    suggestions.metadata.kbContextUsed = !!kbContext;

    // Track telemetry
    telemetry.trackGeminiUsage({
      model: TEXT_MODEL,
      operation: 'generate',
      inputTokens: prompt.length * 0.25,
      durationMs: Date.now() - startTime,
      userId: context.userId,
      success: true,
    });

    return suggestions;

  } catch (error) {
    telemetry.trackGeminiUsage({
      model: TEXT_MODEL,
      operation: 'generate',
      inputTokens: 0,
      durationMs: Date.now() - startTime,
      success: false,
      errorType: error instanceof Error ? error.name : 'unknown',
    });
    throw error;
  }
}

/**
 * Get room-specific installation context
 *
 * Returns considerations, challenges, and best practices for a room type
 */
export function getRoomInstallationContext(roomType: RoomType): RoomInstallationContext {
  const considerations = ROOM_CONSIDERATIONS[roomType] || [];

  // Derive recommended product types based on room
  const recommendedProductTypes = getRecommendedProductsForRoom(roomType);

  // Common challenges for the room type
  const challenges = getChallengesForRoom(roomType);

  // Best practices
  const bestPractices = getBestPracticesForRoom(roomType);

  return {
    roomType,
    considerations,
    recommendedProductTypes,
    challenges,
    bestPractices
  };
}

/**
 * Suggest accessories for a product installation
 *
 * Queries knowledge base and database for required accessories
 */
export async function suggestAccessories(
  productId: string,
  roomType?: RoomType,
  userId?: string
): Promise<AccessoryRecommendation[]> {
  const startTime = Date.now();

  try {
    // Get product information
    const product = await storage.getProductById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Get product relationships (items that pair with this product)
    const relationships = await storage.getProductRelationships([productId]);
    const requiredRelationships = relationships.filter(r => r.isRequired);
    const pairsWithRelationships = relationships.filter(r => r.relationshipType === 'pairs_with');

    // Query knowledge base for accessory recommendations
    const kbContext = await queryAccessoryKnowledgeBase(product, roomType);

    // Build accessory prompt
    const prompt = buildAccessoryPrompt(product, roomType, kbContext);

    const response = await generateContentWithRetry({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2,
      }
    }, { operation: 'installation_scenario' });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse AI recommendations
    const aiAccessories = parseAccessoryRecommendations(responseText);

    // Merge with database relationships
    const mergedAccessories = mergeWithRelationships(
      aiAccessories,
      requiredRelationships,
      pairsWithRelationships
    );

    // Track telemetry
    telemetry.trackGeminiUsage({
      model: TEXT_MODEL,
      operation: 'generate',
      inputTokens: prompt.length * 0.25,
      durationMs: Date.now() - startTime,
      userId,
      success: true,
    });

    return mergedAccessories;

  } catch (error) {
    telemetry.trackGeminiUsage({
      model: TEXT_MODEL,
      operation: 'generate',
      inputTokens: 0,
      durationMs: Date.now() - startTime,
      success: false,
      errorType: error instanceof Error ? error.name : 'unknown',
    });
    throw error;
  }
}

/**
 * Get installation tips for a product and room combination
 */
export async function getInstallationTips(
  productId: string,
  roomType?: RoomType,
  userId?: string
): Promise<InstallationTip[]> {
  const tips: InstallationTip[] = [];

  try {
    // Get product information
    const product = await storage.getProductById(productId);
    if (!product) {
      return [];
    }

    // Get matching scenarios for tips
    const scenarios = await storage.getInstallationScenariosForProducts([productId]);

    // Add tips from scenarios
    for (const scenario of scenarios) {
      if (scenario.installationSteps) {
        // Extract tips from installation steps (if they contain tip-like content)
        scenario.installationSteps.forEach((step, index) => {
          if (step.toLowerCase().includes('tip:') || step.toLowerCase().includes('note:')) {
            tips.push({
              tip: step,
              category: 'prep',
              relevance: 80,
              source: 'scenario'
            });
          }
        });
      }
    }

    // Get room-specific tips
    if (roomType) {
      const roomContext = getRoomInstallationContext(roomType);
      roomContext.bestPractices.forEach((practice, index) => {
        tips.push({
          tip: practice,
          category: 'prep',
          relevance: 70 - (index * 5),
          source: 'ai_inference'
        });
      });
    }

    // Query knowledge base for additional tips
    const kbContext = await queryTipsKnowledgeBase(product, roomType);
    if (kbContext) {
      tips.push({
        tip: kbContext,
        category: 'prep',
        relevance: 90,
        source: 'kb'
      });
    }

    // Sort by relevance
    return tips.sort((a, b) => b.relevance - a.relevance);

  } catch (error) {
    logger.error({ module: 'InstallationRAG', err: error }, 'Error getting tips');
    return tips;
  }
}

// ============================================
// KNOWLEDGE BASE QUERY FUNCTIONS
// ============================================

/**
 * Query knowledge base for installation guides
 */
async function queryInstallationKnowledgeBase(
  product: Product,
  roomType?: RoomType
): Promise<string | null> {
  try {
    let query = `Installation guide for ${product.name}`;
    if (product.category) {
      query += ` (${product.category})`;
    }
    if (roomType) {
      query += ` in ${roomType.replace('_', ' ')}`;
    }
    query += '. Include step-by-step instructions, required tools, and best practices.';

    const result = await queryFileSearchStore({
      query,
      category: FileCategory.INSTALLATION_GUIDES,
      maxResults: 5
    });

    return result?.context || null;

  } catch (error) {
    logger.warn({ module: 'InstallationRAG', err: error }, 'KB query failed');
    return null;
  }
}

/**
 * Query knowledge base for accessory recommendations
 */
async function queryAccessoryKnowledgeBase(
  product: Product,
  roomType?: RoomType
): Promise<string | null> {
  try {
    let query = `Required accessories and materials for installing ${product.name}`;
    if (product.category) {
      query += ` (${product.category})`;
    }
    if (roomType) {
      query += ` in ${roomType.replace('_', ' ')}`;
    }
    query += '. Include underlayment, trim, adhesives, and transition strips.';

    const result = await queryFileSearchStore({
      query,
      category: FileCategory.INSTALLATION_GUIDES,
      maxResults: 3
    });

    return result?.context || null;

  } catch (error) {
    logger.warn({ module: 'InstallationRAG', err: error }, 'Accessory KB query failed');
    return null;
  }
}

/**
 * Query knowledge base for installation tips
 */
async function queryTipsKnowledgeBase(
  product: Product,
  roomType?: RoomType
): Promise<string | null> {
  try {
    let query = `Installation tips and tricks for ${product.name}`;
    if (roomType) {
      query += ` in ${roomType.replace('_', ' ')}`;
    }
    query += '. Include common mistakes to avoid and professional recommendations.';

    const result = await queryFileSearchStore({
      query,
      category: FileCategory.INSTALLATION_GUIDES,
      maxResults: 3
    });

    return result?.context || null;

  } catch (error) {
    logger.warn({ module: 'InstallationRAG', err: error }, 'Tips KB query failed');
    return null;
  }
}

// ============================================
// CONTEXT BUILDING FUNCTIONS
// ============================================

/**
 * Build product context string for AI prompts
 */
function buildProductContext(product: Product, analysis?: ProductAnalysis | null): string {
  const parts: string[] = [
    `Name: ${product.name}`,
  ];

  if (product.description) {
    parts.push(`Description: ${product.description}`);
  }

  if (product.category) {
    parts.push(`Category: ${product.category}`);
  }

  if (product.tags && product.tags.length > 0) {
    parts.push(`Tags: ${product.tags.join(', ')}`);
  }

  if (product.features && typeof product.features === 'object') {
    const featureStr = Object.entries(product.features as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    parts.push(`Features: ${featureStr}`);
  }

  if (product.specifications && typeof product.specifications === 'object') {
    const specStr = Object.entries(product.specifications as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ');
    parts.push(`Specifications: ${specStr}`);
  }

  // Add vision analysis if available
  if (analysis) {
    if (analysis.category) parts.push(`Detected Category: ${analysis.category}`);
    if (analysis.subcategory) parts.push(`Subcategory: ${analysis.subcategory}`);
    if (analysis.materials && analysis.materials.length > 0) {
      parts.push(`Materials: ${analysis.materials.join(', ')}`);
    }
  }

  return parts.join('\n');
}

/**
 * Build room context for AI prompts
 */
function buildRoomContext(roomType: RoomType): string {
  const considerations = ROOM_CONSIDERATIONS[roomType] || [];
  return `Room Type: ${roomType.replace('_', ' ')}\nConsiderations:\n- ${considerations.join('\n- ')}`;
}

/**
 * Build scenario context from existing installation scenarios
 */
function buildScenarioContext(scenarios: InstallationScenario[]): string {
  if (scenarios.length === 0) {
    return '';
  }

  const scenarioSummaries = scenarios.slice(0, 3).map(s => {
    const parts = [`Title: ${s.title}`];
    if (s.description) parts.push(`Description: ${s.description}`);
    if (s.installationSteps && s.installationSteps.length > 0) {
      parts.push(`Steps: ${s.installationSteps.length} steps`);
    }
    if (s.requiredAccessories && s.requiredAccessories.length > 0) {
      parts.push(`Accessories: ${s.requiredAccessories.join(', ')}`);
    }
    return parts.join('\n');
  });

  return `Existing Installation Scenarios:\n${scenarioSummaries.join('\n---\n')}`;
}

// ============================================
// PROMPT BUILDING FUNCTIONS
// ============================================

/**
 * Build prompt for installation step generation
 */
function buildInstallationPrompt(
  product: Product,
  productContext: string,
  roomContext: string | null,
  scenarioContext: string,
  kbContext: string | null,
  maxSteps?: number
): string {
  const stepLimit = maxSteps || 10;

  const kbSection = kbContext
    ? `\nKnowledge Base Context:\n${kbContext}\n`
    : '';

  const roomSection = roomContext
    ? `\nRoom Context:\n${roomContext}\n`
    : '';

  const scenarioSection = scenarioContext
    ? `\n${scenarioContext}\n`
    : '';

  return `You are an expert flooring and home improvement installation specialist. Generate detailed installation steps for the following product.

PRODUCT INFORMATION:
${productContext}
${roomSection}
${scenarioSection}
${kbSection}

TASK: Generate up to ${stepLimit} installation steps with the following information for each:
1. Step number
2. Clear title
3. Detailed description
4. Estimated time (if applicable)
5. Tools required for this step
6. Helpful tips
7. Any warnings or cautions

Also provide:
- Required accessories (underlayment, trim, adhesive, etc.)
- General installation tips
- Total estimated time
- Difficulty level (beginner, intermediate, advanced)

Respond in this exact JSON format:
{
  "steps": [
    {
      "stepNumber": 1,
      "title": "Prepare the Subfloor",
      "description": "Clean the subfloor thoroughly...",
      "estimatedTime": "30 minutes",
      "toolsRequired": ["broom", "vacuum", "level"],
      "tips": ["Check for moisture issues first"],
      "warnings": ["Ensure subfloor is completely dry"]
    }
  ],
  "accessories": [
    {
      "name": "Underlayment",
      "category": "underlayment",
      "reason": "Provides cushioning and moisture protection",
      "isRequired": true,
      "quantitySuggestion": "Same square footage as flooring plus 10%"
    }
  ],
  "tips": [
    {
      "tip": "Acclimate flooring for 48 hours before installation",
      "category": "prep"
    }
  ],
  "metadata": {
    "totalEstimatedTime": "4-6 hours",
    "difficultyLevel": "intermediate"
  }
}`;
}

/**
 * Build prompt for accessory recommendations
 */
function buildAccessoryPrompt(
  product: Product,
  roomType: RoomType | undefined,
  kbContext: string | null
): string {
  const kbSection = kbContext
    ? `\nKnowledge Base Context:\n${kbContext}\n`
    : '';

  const roomSection = roomType
    ? `\nRoom Type: ${roomType.replace('_', ' ')}\nConsiderations: ${ROOM_CONSIDERATIONS[roomType]?.join(', ') || 'Standard installation'}\n`
    : '';

  return `You are an expert flooring and home improvement specialist. Recommend required and optional accessories for installing this product.

PRODUCT: ${product.name}
${product.category ? `Category: ${product.category}` : ''}
${product.description ? `Description: ${product.description}` : ''}
${roomSection}
${kbSection}

TASK: Recommend accessories in these categories:
- Underlayment (if needed)
- Trim and moldings
- Transition strips
- Adhesives or fasteners
- Moisture barriers
- Tools needed
- Cleaning and maintenance supplies
- Protection products

For each accessory, specify:
1. Name
2. Category
3. Why it's needed
4. Whether it's required or optional
5. Quantity suggestion if applicable

Respond in this exact JSON format:
{
  "accessories": [
    {
      "name": "Foam Underlayment",
      "category": "underlayment",
      "reason": "Provides cushioning and sound absorption",
      "isRequired": true,
      "quantitySuggestion": "Same square footage as flooring"
    }
  ]
}`;
}

// ============================================
// PARSING FUNCTIONS
// ============================================

/**
 * Parse installation suggestions from AI response
 */
function parseInstallationSuggestions(
  responseText: string,
  product: Product,
  roomType?: RoomType
): InstallationSuggestionResult {
  const defaultResult: InstallationSuggestionResult = {
    steps: [],
    accessories: [],
    tips: [],
    matchingScenarios: [],
    metadata: {
      productId: product.id,
      productName: product.name,
      roomType,
      kbContextUsed: false,
      generatedAt: new Date()
    }
  };

  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return defaultResult;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Parse steps
    const steps: InstallationStep[] = (parsed.steps || []).map((step: any) => ({
      stepNumber: step.stepNumber || 1,
      title: step.title || 'Installation Step',
      description: step.description || '',
      estimatedTime: step.estimatedTime,
      toolsRequired: step.toolsRequired || [],
      tips: step.tips || [],
      warnings: step.warnings || []
    }));

    // Parse accessories
    const accessories: AccessoryRecommendation[] = (parsed.accessories || []).map((acc: any) => ({
      name: acc.name || 'Accessory',
      category: acc.category || 'general',
      reason: acc.reason || '',
      isRequired: acc.isRequired ?? false,
      quantitySuggestion: acc.quantitySuggestion
    }));

    // Parse tips
    const tips: InstallationTip[] = (parsed.tips || []).map((tip: any) => ({
      tip: typeof tip === 'string' ? tip : tip.tip || '',
      category: tip.category || 'prep',
      relevance: 75,
      source: 'ai_inference' as const
    }));

    // Parse metadata
    const metadata = {
      productId: product.id,
      productName: product.name,
      roomType,
      totalEstimatedTime: parsed.metadata?.totalEstimatedTime,
      difficultyLevel: parsed.metadata?.difficultyLevel,
      kbContextUsed: false,
      generatedAt: new Date()
    };

    return {
      steps,
      accessories,
      tips,
      matchingScenarios: [],
      metadata
    };

  } catch (error) {
    logger.error({ module: 'InstallationRAG', err: error }, 'Failed to parse suggestions');
    return defaultResult;
  }
}

/**
 * Parse accessory recommendations from AI response
 */
function parseAccessoryRecommendations(responseText: string): AccessoryRecommendation[] {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return (parsed.accessories || []).map((acc: any) => ({
      name: acc.name || 'Accessory',
      category: acc.category || 'general',
      reason: acc.reason || '',
      isRequired: acc.isRequired ?? false,
      quantitySuggestion: acc.quantitySuggestion
    }));

  } catch (error) {
    logger.error({ module: 'InstallationRAG', err: error }, 'Failed to parse accessory recommendations');
    return [];
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Deduplicate installation scenarios by ID
 */
function deduplicateScenarios(scenarios: InstallationScenario[]): InstallationScenario[] {
  const seen = new Set<string>();
  return scenarios.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  });
}

/**
 * Merge AI accessories with database relationships
 */
function mergeWithRelationships(
  aiAccessories: AccessoryRecommendation[],
  requiredRelationships: any[],
  pairsWithRelationships: any[]
): AccessoryRecommendation[] {
  const merged = [...aiAccessories];
  const existingNames = new Set(aiAccessories.map(a => a.name.toLowerCase()));

  // Add required relationships
  for (const rel of requiredRelationships) {
    if (!existingNames.has(rel.description?.toLowerCase() || '')) {
      merged.push({
        name: rel.description || 'Required Component',
        category: 'required',
        reason: 'Required for proper installation',
        isRequired: true,
        relatedProductId: rel.targetProductId
      });
    }
  }

  // Add pairs_with relationships
  for (const rel of pairsWithRelationships) {
    if (!existingNames.has(rel.description?.toLowerCase() || '')) {
      merged.push({
        name: rel.description || 'Recommended Accessory',
        category: 'recommended',
        reason: rel.description || 'Works well with this product',
        isRequired: false,
        relatedProductId: rel.targetProductId
      });
    }
  }

  return merged;
}

/**
 * Get recommended product types for a room
 */
function getRecommendedProductsForRoom(roomType: RoomType): string[] {
  const recommendations: Record<RoomType, string[]> = {
    living_room: ['hardwood', 'laminate', 'luxury_vinyl', 'carpet'],
    bedroom: ['carpet', 'hardwood', 'laminate', 'cork'],
    kitchen: ['tile', 'luxury_vinyl', 'laminate', 'linoleum'],
    bathroom: ['tile', 'luxury_vinyl', 'waterproof_laminate'],
    basement: ['luxury_vinyl', 'tile', 'epoxy', 'rubber'],
    commercial: ['commercial_tile', 'commercial_vinyl', 'polished_concrete'],
    outdoor: ['tile', 'composite_decking', 'natural_stone', 'rubber'],
    hallway: ['laminate', 'luxury_vinyl', 'tile', 'hardwood'],
    office: ['carpet_tile', 'laminate', 'luxury_vinyl'],
    dining_room: ['hardwood', 'laminate', 'tile', 'luxury_vinyl']
  };

  return recommendations[roomType] || ['laminate', 'luxury_vinyl'];
}

/**
 * Get common challenges for a room type
 */
function getChallengesForRoom(roomType: RoomType): string[] {
  const challenges: Record<RoomType, string[]> = {
    living_room: ['Furniture weight distribution', 'Color matching with existing decor', 'High traffic wear patterns'],
    bedroom: ['Sound transmission to lower floors', 'Closet doorway transitions', 'Under-bed dust accumulation'],
    kitchen: ['Water damage around sink and dishwasher', 'Subfloor leveling for appliances', 'Heat from cooking'],
    bathroom: ['Constant moisture exposure', 'Sealing around toilet and tub', 'Non-slip requirements'],
    basement: ['Concrete moisture issues', 'Temperature fluctuations', 'Potential flooding'],
    commercial: ['Heavy foot traffic', 'Meeting ADA requirements', 'Maintenance scheduling'],
    outdoor: ['Weather exposure', 'UV damage', 'Proper drainage'],
    hallway: ['Narrow working space', 'Multiple room transitions', 'Heavy traffic wear'],
    office: ['Static electricity', 'Cable management under flooring', 'Chair caster damage'],
    dining_room: ['Chair movement wear', 'Spill cleanup', 'Table leg pressure points']
  };

  return challenges[roomType] || ['Standard installation challenges'];
}

/**
 * Get best practices for a room type
 */
function getBestPracticesForRoom(roomType: RoomType): string[] {
  const practices: Record<RoomType, string[]> = {
    living_room: ['Acclimate flooring for 48-72 hours', 'Use furniture pads', 'Leave expansion gaps at walls'],
    bedroom: ['Install underlayment for sound reduction', 'Consider radiant heating compatibility', 'Plan closet transitions'],
    kitchen: ['Use waterproof flooring options', 'Install moisture barrier', 'Seal edges around appliances'],
    bathroom: ['Always use waterproof products', 'Apply silicone sealant at edges', 'Ensure proper ventilation'],
    basement: ['Test for moisture before installation', 'Use vapor barrier', 'Consider floating floor systems'],
    commercial: ['Schedule installation during off-hours', 'Use commercial-grade adhesives', 'Plan for heavy equipment'],
    outdoor: ['Ensure proper drainage slope', 'Use weather-resistant fasteners', 'Allow for expansion'],
    hallway: ['Plan layout to minimize waste', 'Install transition strips properly', 'Consider pattern direction'],
    office: ['Use anti-static underlayment', 'Plan for cable access', 'Choose durable commercial products'],
    dining_room: ['Use protective mats under chairs', 'Choose stain-resistant finishes', 'Plan for easy cleaning']
  };

  return practices[roomType] || ['Follow manufacturer instructions', 'Acclimate flooring before installation'];
}

// ============================================
// EXPORTS
// ============================================

export const installationScenarioRAG = {
  suggestInstallationSteps,
  getRoomInstallationContext,
  suggestAccessories,
  getInstallationTips,
};

export default installationScenarioRAG;
