/**
 * Relationship Discovery RAG Service
 *
 * Uses RAG (Retrieval Augmented Generation) to discover and suggest
 * product relationships based on knowledge base content and AI analysis.
 *
 * Relationship Types (from productRelationships schema):
 * - pairs_with: Products that work well together (flooring + underlayment)
 * - requires: Products that need another to function (trim requires flooring)
 * - replaces: Products that can substitute each other
 * - matches: Products with matching aesthetics (same color family)
 * - completes: Products that complete a project (flooring + baseboards + transitions)
 * - upgrades: Products that are premium alternatives
 */

import { genAI } from '../lib/gemini';
import { storage } from '../storage';
import { telemetry } from '../instrumentation';
import { queryFileSearchStore, FileCategory } from './fileSearchService';
import type { Product, ProductAnalysis, ProductRelationship } from '@shared/schema';

// Relationship types enum (matching schema)
export const RELATIONSHIP_TYPES = [
  'pairs_with',
  'requires',
  'replaces',
  'matches',
  'completes',
  'upgrades'
] as const;

export type RelationshipType = typeof RELATIONSHIP_TYPES[number];

/**
 * Relationship suggestion returned by the discovery service
 */
export interface RelationshipSuggestion {
  /** Target product ID */
  targetProductId: string;
  /** Target product name (for display) */
  targetProductName: string;
  /** Type of relationship discovered */
  relationshipType: RelationshipType;
  /** Confidence score 0-100 */
  score: number;
  /** AI-generated reasoning for the suggestion */
  reasoning: string;
  /** Whether this relationship already exists in database */
  alreadyExists: boolean;
  /** Source of the suggestion (vision, kb, ai_inference) */
  source: 'vision' | 'kb' | 'ai_inference';
}

/**
 * Result from relationship analysis between two products
 */
export interface RelationshipAnalysisResult {
  /** Most likely relationship type */
  primaryRelationship: RelationshipType | null;
  /** Confidence score 0-100 */
  confidence: number;
  /** Detailed reasoning */
  reasoning: string;
  /** Alternative relationships that could also apply */
  alternativeRelationships: Array<{
    type: RelationshipType;
    confidence: number;
    reasoning: string;
  }>;
  /** Metadata about the analysis */
  metadata: {
    analyzedAt: Date;
    modelVersion: string;
    kbContextUsed: boolean;
  };
}

/**
 * Similar product match
 */
export interface SimilarProductMatch {
  product: Product;
  similarity: number; // 0-100
  matchReasons: string[];
}

// Model for text analysis
const TEXT_MODEL = 'gemini-2.0-flash';

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

  if (product.benefits && product.benefits.length > 0) {
    parts.push(`Benefits: ${product.benefits.join(', ')}`);
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
    if (analysis.colors && analysis.colors.length > 0) {
      parts.push(`Colors: ${analysis.colors.join(', ')}`);
    }
    if (analysis.style) parts.push(`Style: ${analysis.style}`);
    if (analysis.usageContext) parts.push(`Usage Context: ${analysis.usageContext}`);
  }

  return parts.join('\n');
}

/**
 * Suggest relationships for a product using RAG
 */
export async function suggestRelationships(
  productId: string,
  userId: string,
  options?: {
    maxSuggestions?: number;
    minScore?: number;
    includeExisting?: boolean;
  }
): Promise<RelationshipSuggestion[]> {
  const startTime = Date.now();
  const maxSuggestions = options?.maxSuggestions ?? 10;
  const minScore = options?.minScore ?? 50;
  const includeExisting = options?.includeExisting ?? false;

  try {
    // 1. Get the source product
    const sourceProduct = await storage.getProductById(productId);
    if (!sourceProduct) {
      throw new Error(`Product not found: ${productId}`);
    }

    // 2. Get product analysis (if available)
    const sourceAnalysis = await storage.getProductAnalysisByProductId(productId);

    // 3. Get existing relationships
    const existingRelationships = await storage.getProductRelationships([productId]);
    const existingTargetIds = new Set(
      existingRelationships.map(r =>
        r.sourceProductId === productId ? r.targetProductId : r.sourceProductId
      )
    );

    // 4. Find similar products
    const similarProducts = await findSimilarProducts(sourceProduct);

    // 5. Query knowledge base for relationship context
    const kbContext = await queryKnowledgeBase(sourceProduct);

    // 6. Get all candidate products (excluding source)
    const allProducts = await storage.getProducts();
    const candidateProducts = allProducts.filter(p => p.id !== productId);

    if (candidateProducts.length === 0) {
      return [];
    }

    // 7. Build product context
    const sourceContext = buildProductContext(sourceProduct, sourceAnalysis);

    // 8. Prepare candidate summaries
    const candidateSummaries = await Promise.all(
      candidateProducts.slice(0, 20).map(async (p) => { // Limit to 20 for API
        const analysis = await storage.getProductAnalysisByProductId(p.id);
        return {
          id: p.id,
          name: p.name,
          context: buildProductContext(p, analysis)
        };
      })
    );

    // 9. Build AI prompt for relationship discovery
    const prompt = buildRelationshipDiscoveryPrompt(
      sourceProduct,
      sourceContext,
      candidateSummaries,
      kbContext,
      similarProducts
    );

    // 10. Call Gemini for relationship analysis
    const response = await genAI.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.3, // Lower temperature for more consistent results
      }
    });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // 11. Parse AI response
    const suggestions = parseRelationshipSuggestions(
      responseText,
      candidateSummaries,
      existingTargetIds,
      includeExisting
    );

    // 12. Filter and sort by score
    const filteredSuggestions = suggestions
      .filter(s => s.score >= minScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, maxSuggestions);

    // Track telemetry
    telemetry.trackGeminiUsage({
      model: TEXT_MODEL,
      operation: 'generate',
      inputTokens: prompt.length * 0.25,
      durationMs: Date.now() - startTime,
      userId,
      success: true,
    });

    return filteredSuggestions;

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
 * Find similar products based on attributes
 */
export async function findSimilarProducts(
  product: Product,
  options?: {
    maxResults?: number;
    minSimilarity?: number;
  }
): Promise<SimilarProductMatch[]> {
  const maxResults = options?.maxResults ?? 10;
  const minSimilarity = options?.minSimilarity ?? 30;

  // Get product analysis for enhanced matching
  const sourceAnalysis = await storage.getProductAnalysisByProductId(product.id);

  // Get all products
  const allProducts = await storage.getProducts();
  const candidates = allProducts.filter(p => p.id !== product.id);

  // Calculate similarity scores
  const matches: SimilarProductMatch[] = [];

  for (const candidate of candidates) {
    const candidateAnalysis = await storage.getProductAnalysisByProductId(candidate.id);
    const { similarity, reasons } = calculateSimilarity(
      product, sourceAnalysis,
      candidate, candidateAnalysis
    );

    if (similarity >= minSimilarity) {
      matches.push({
        product: candidate,
        similarity,
        matchReasons: reasons
      });
    }
  }

  // Sort by similarity and return top results
  return matches
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, maxResults);
}

/**
 * Calculate similarity between two products
 */
function calculateSimilarity(
  source: Product, sourceAnalysis: ProductAnalysis | undefined,
  target: Product, targetAnalysis: ProductAnalysis | undefined
): { similarity: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Category match (20 points)
  if (source.category && target.category &&
      source.category.toLowerCase() === target.category.toLowerCase()) {
    score += 20;
    reasons.push(`Same category: ${source.category}`);
  }

  // Tag overlap (up to 25 points)
  if (source.tags && target.tags) {
    const sourceTags = new Set(source.tags.map(t => t.toLowerCase()));
    const targetTags = new Set(target.tags.map(t => t.toLowerCase()));
    const overlap = Array.from(sourceTags).filter(t => targetTags.has(t));
    const overlapScore = Math.min(overlap.length * 5, 25);
    if (overlapScore > 0) {
      score += overlapScore;
      reasons.push(`Matching tags: ${overlap.join(', ')}`);
    }
  }

  // Analysis-based matching
  if (sourceAnalysis && targetAnalysis) {
    // Subcategory match (15 points)
    if (sourceAnalysis.subcategory && targetAnalysis.subcategory &&
        sourceAnalysis.subcategory.toLowerCase() === targetAnalysis.subcategory.toLowerCase()) {
      score += 15;
      reasons.push(`Same subcategory: ${sourceAnalysis.subcategory}`);
    }

    // Material overlap (up to 15 points)
    if (sourceAnalysis.materials && targetAnalysis.materials) {
      const sourceMaterials = new Set(sourceAnalysis.materials.map(m => m.toLowerCase()));
      const targetMaterials = new Set(targetAnalysis.materials.map(m => m.toLowerCase()));
      const overlap = Array.from(sourceMaterials).filter(m => targetMaterials.has(m));
      const overlapScore = Math.min(overlap.length * 5, 15);
      if (overlapScore > 0) {
        score += overlapScore;
        reasons.push(`Matching materials: ${overlap.join(', ')}`);
      }
    }

    // Color similarity (up to 15 points)
    if (sourceAnalysis.colors && targetAnalysis.colors) {
      const sourceColors = new Set(sourceAnalysis.colors.map(c => c.toLowerCase()));
      const targetColors = new Set(targetAnalysis.colors.map(c => c.toLowerCase()));
      const overlap = Array.from(sourceColors).filter(c => targetColors.has(c));
      const overlapScore = Math.min(overlap.length * 5, 15);
      if (overlapScore > 0) {
        score += overlapScore;
        reasons.push(`Matching colors: ${overlap.join(', ')}`);
      }
    }

    // Style match (10 points)
    if (sourceAnalysis.style && targetAnalysis.style &&
        sourceAnalysis.style.toLowerCase() === targetAnalysis.style.toLowerCase()) {
      score += 10;
      reasons.push(`Same style: ${sourceAnalysis.style}`);
    }
  }

  return { similarity: Math.min(score, 100), reasons };
}

/**
 * Analyze the relationship type between two specific products
 */
export async function analyzeRelationshipType(
  sourceProduct: Product,
  targetProduct: Product,
  userId?: string
): Promise<RelationshipAnalysisResult> {
  const startTime = Date.now();

  try {
    // Get analyses for both products
    const [sourceAnalysis, targetAnalysis] = await Promise.all([
      storage.getProductAnalysisByProductId(sourceProduct.id),
      storage.getProductAnalysisByProductId(targetProduct.id)
    ]);

    // Build contexts
    const sourceContext = buildProductContext(sourceProduct, sourceAnalysis);
    const targetContext = buildProductContext(targetProduct, targetAnalysis);

    // Query knowledge base for relationship patterns
    const kbContext = await queryKnowledgeBase(sourceProduct, targetProduct);

    // Build analysis prompt
    const prompt = buildRelationshipAnalysisPrompt(
      sourceProduct.name,
      sourceContext,
      targetProduct.name,
      targetContext,
      kbContext
    );

    // Call Gemini for analysis
    const response = await genAI.models.generateContent({
      model: TEXT_MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        temperature: 0.2, // Low temperature for analytical tasks
      }
    });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse the analysis result
    const result = parseRelationshipAnalysis(responseText);

    // Track telemetry
    telemetry.trackGeminiUsage({
      model: TEXT_MODEL,
      operation: 'generate',
      inputTokens: prompt.length * 0.25,
      durationMs: Date.now() - startTime,
      userId,
      success: true,
    });

    return result;

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
 * Query knowledge base for product relationship context
 */
async function queryKnowledgeBase(
  sourceProduct: Product,
  targetProduct?: Product
): Promise<string | null> {
  try {
    // Build search query
    let query = `Product relationships for ${sourceProduct.name}`;
    if (sourceProduct.category) {
      query += ` in ${sourceProduct.category} category`;
    }
    if (targetProduct) {
      query += ` with ${targetProduct.name}`;
    }
    query += '. What products pair together, require each other, or can be substituted?';

    // Query the file search store for product relationships
    const result = await queryFileSearchStore({
      query,
      category: FileCategory.PRODUCT_RELATIONSHIPS,
      maxResults: 5
    });

    return result?.context || null;

  } catch (error) {
    // KB query failures are non-fatal - log and continue
    console.warn('[RelationshipRAG] KB query failed:', error);
    return null;
  }
}

/**
 * Build prompt for relationship discovery
 */
function buildRelationshipDiscoveryPrompt(
  sourceProduct: Product,
  sourceContext: string,
  candidates: Array<{ id: string; name: string; context: string }>,
  kbContext: string | null,
  similarProducts: SimilarProductMatch[]
): string {
  const relationshipDefinitions = `
Relationship Types:
- pairs_with: Products that work well together in the same project (e.g., flooring + underlayment)
- requires: Product A needs Product B to function properly (e.g., trim requires flooring to be installed)
- replaces: Products that can substitute each other (e.g., laminate can replace vinyl in some applications)
- matches: Products with matching aesthetics like color, style, or finish (e.g., matching baseboards and flooring)
- completes: Products that complete a full project scope (e.g., flooring + baseboards + transitions + underlayment)
- upgrades: Product A is a premium alternative to Product B (e.g., solid hardwood upgrades engineered hardwood)
`;

  const candidateList = candidates.map(c =>
    `\n[Product ID: ${c.id}]\nName: ${c.name}\n${c.context}`
  ).join('\n---\n');

  const similarList = similarProducts.length > 0
    ? `\nAlready identified as similar:\n${similarProducts.map(s =>
        `- ${s.product.name} (${s.similarity}% similar): ${s.matchReasons.join(', ')}`
      ).join('\n')}`
    : '';

  const kbSection = kbContext
    ? `\nKnowledge Base Context:\n${kbContext}\n`
    : '';

  return `You are a product relationship expert for a flooring and home improvement retailer. Analyze the source product and suggest relationships with candidate products.

${relationshipDefinitions}

SOURCE PRODUCT:
${sourceContext}
${similarList}
${kbSection}

CANDIDATE PRODUCTS:
${candidateList}

TASK: For each candidate product that has a meaningful relationship with the source product, provide:
1. The product ID
2. The relationship type (pairs_with, requires, replaces, matches, completes, upgrades)
3. A confidence score (0-100)
4. Brief reasoning (1-2 sentences)

Only suggest relationships where there's a clear, logical connection. Focus on practical relationships that would help customers.

Respond in this exact JSON format:
{
  "suggestions": [
    {
      "productId": "abc-123",
      "relationshipType": "pairs_with",
      "score": 85,
      "reasoning": "Both products are designed for the same room type and have matching color tones."
    }
  ]
}

If no meaningful relationships exist, return an empty suggestions array.`;
}

/**
 * Build prompt for analyzing relationship between two specific products
 */
function buildRelationshipAnalysisPrompt(
  sourceName: string,
  sourceContext: string,
  targetName: string,
  targetContext: string,
  kbContext: string | null
): string {
  const relationshipDefinitions = `
Relationship Types (choose the most appropriate):
- pairs_with: Products that work well together in the same project
- requires: One product needs the other to function properly
- replaces: Products that can substitute each other
- matches: Products with matching aesthetics (color, style, finish)
- completes: Products that complete a full project scope
- upgrades: One product is a premium alternative to the other
- none: No meaningful relationship exists
`;

  const kbSection = kbContext
    ? `\nKnowledge Base Context:\n${kbContext}\n`
    : '';

  return `You are a product relationship expert. Analyze the relationship between these two products.

${relationshipDefinitions}

PRODUCT A: ${sourceName}
${sourceContext}

PRODUCT B: ${targetName}
${targetContext}
${kbSection}

TASK: Determine what relationship (if any) exists between these products. Consider:
1. Functional relationships (do they work together?)
2. Aesthetic relationships (do they look good together?)
3. Substitution possibilities (can one replace the other?)
4. Project completion (do they complete each other?)
5. Quality/price tiers (is one an upgrade?)

Respond in this exact JSON format:
{
  "primaryRelationship": "pairs_with",
  "confidence": 85,
  "reasoning": "Detailed explanation of why this relationship exists...",
  "alternativeRelationships": [
    {
      "type": "matches",
      "confidence": 70,
      "reasoning": "They also share similar color tones..."
    }
  ]
}

If no meaningful relationship exists, set primaryRelationship to null and confidence to 0.`;
}

/**
 * Parse relationship suggestions from AI response
 */
function parseRelationshipSuggestions(
  responseText: string,
  candidates: Array<{ id: string; name: string; context: string }>,
  existingTargetIds: Set<string>,
  includeExisting: boolean
): RelationshipSuggestion[] {
  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn('[RelationshipRAG] No JSON found in response');
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const suggestions: RelationshipSuggestion[] = [];

    // Create lookup for candidate names
    const candidateMap = new Map(candidates.map(c => [c.id, c.name]));

    for (const suggestion of parsed.suggestions || []) {
      const targetId = suggestion.productId;
      const targetName = candidateMap.get(targetId);

      if (!targetName) continue; // Invalid product ID

      const alreadyExists = existingTargetIds.has(targetId);
      if (alreadyExists && !includeExisting) continue;

      // Validate relationship type
      const relationshipType = suggestion.relationshipType as RelationshipType;
      if (!RELATIONSHIP_TYPES.includes(relationshipType)) continue;

      suggestions.push({
        targetProductId: targetId,
        targetProductName: targetName,
        relationshipType,
        score: Math.min(100, Math.max(0, suggestion.score || 0)),
        reasoning: suggestion.reasoning || '',
        alreadyExists,
        source: 'ai_inference'
      });
    }

    return suggestions;

  } catch (error) {
    console.error('[RelationshipRAG] Failed to parse suggestions:', error);
    return [];
  }
}

/**
 * Parse relationship analysis from AI response
 */
function parseRelationshipAnalysis(responseText: string): RelationshipAnalysisResult {
  const defaultResult: RelationshipAnalysisResult = {
    primaryRelationship: null,
    confidence: 0,
    reasoning: 'Unable to determine relationship',
    alternativeRelationships: [],
    metadata: {
      analyzedAt: new Date(),
      modelVersion: TEXT_MODEL,
      kbContextUsed: false
    }
  };

  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return defaultResult;
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate primary relationship type
    let primaryRelationship: RelationshipType | null = null;
    if (parsed.primaryRelationship &&
        RELATIONSHIP_TYPES.includes(parsed.primaryRelationship)) {
      primaryRelationship = parsed.primaryRelationship;
    }

    // Parse alternative relationships
    const alternativeRelationships: RelationshipAnalysisResult['alternativeRelationships'] = [];
    for (const alt of parsed.alternativeRelationships || []) {
      if (alt.type && RELATIONSHIP_TYPES.includes(alt.type)) {
        alternativeRelationships.push({
          type: alt.type,
          confidence: Math.min(100, Math.max(0, alt.confidence || 0)),
          reasoning: alt.reasoning || ''
        });
      }
    }

    return {
      primaryRelationship,
      confidence: Math.min(100, Math.max(0, parsed.confidence || 0)),
      reasoning: parsed.reasoning || '',
      alternativeRelationships,
      metadata: {
        analyzedAt: new Date(),
        modelVersion: TEXT_MODEL,
        kbContextUsed: responseText.includes('Knowledge Base') || responseText.includes('knowledge base')
      }
    };

  } catch (error) {
    console.error('[RelationshipRAG] Failed to parse analysis:', error);
    return defaultResult;
  }
}

/**
 * Batch suggest relationships for multiple products
 */
export async function batchSuggestRelationships(
  productIds: string[],
  userId: string,
  options?: {
    maxSuggestionsPerProduct?: number;
    minScore?: number;
  }
): Promise<Map<string, RelationshipSuggestion[]>> {
  const results = new Map<string, RelationshipSuggestion[]>();

  // Process in parallel with concurrency limit
  const batchSize = 3;
  for (let i = 0; i < productIds.length; i += batchSize) {
    const batch = productIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(productId =>
        suggestRelationships(productId, userId, options)
          .then(suggestions => ({ productId, suggestions }))
          .catch(error => {
            console.error(`[RelationshipRAG] Failed for ${productId}:`, error);
            return { productId, suggestions: [] };
          })
      )
    );

    for (const { productId, suggestions } of batchResults) {
      results.set(productId, suggestions);
    }
  }

  return results;
}

/**
 * Auto-create relationships from suggestions above threshold
 */
export async function autoCreateRelationships(
  productId: string,
  userId: string,
  options?: {
    minScore?: number;
    relationshipTypes?: RelationshipType[];
    maxToCreate?: number;
    dryRun?: boolean;
  }
): Promise<{
  created: ProductRelationship[];
  skipped: RelationshipSuggestion[];
  errors: Array<{ suggestion: RelationshipSuggestion; error: string }>;
}> {
  const minScore = options?.minScore ?? 80;
  const maxToCreate = options?.maxToCreate ?? 5;
  const dryRun = options?.dryRun ?? false;
  const relationshipTypes = options?.relationshipTypes;

  const created: ProductRelationship[] = [];
  const skipped: RelationshipSuggestion[] = [];
  const errors: Array<{ suggestion: RelationshipSuggestion; error: string }> = [];

  // Get suggestions
  const suggestions = await suggestRelationships(productId, userId, {
    maxSuggestions: maxToCreate * 2, // Get extra in case some fail
    minScore,
    includeExisting: false
  });

  // Filter by relationship types if specified
  const filtered = relationshipTypes
    ? suggestions.filter(s => relationshipTypes.includes(s.relationshipType))
    : suggestions;

  // Create relationships
  let createdCount = 0;
  for (const suggestion of filtered) {
    if (createdCount >= maxToCreate) {
      skipped.push(suggestion);
      continue;
    }

    if (dryRun) {
      // Simulate creation for dry run
      created.push({
        id: `dry-run-${Date.now()}`,
        userId,
        sourceProductId: productId,
        targetProductId: suggestion.targetProductId,
        relationshipType: suggestion.relationshipType,
        description: suggestion.reasoning,
        isRequired: suggestion.relationshipType === 'requires',
        displayOrder: createdCount,
        createdAt: new Date()
      });
      createdCount++;
      continue;
    }

    try {
      const relationship = await storage.createProductRelationship({
        userId,
        sourceProductId: productId,
        targetProductId: suggestion.targetProductId,
        relationshipType: suggestion.relationshipType,
        description: suggestion.reasoning,
        isRequired: suggestion.relationshipType === 'requires',
        displayOrder: createdCount
      });
      created.push(relationship);
      createdCount++;
    } catch (error) {
      errors.push({
        suggestion,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return { created, skipped, errors };
}
