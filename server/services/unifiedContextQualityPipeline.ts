/**
 * Unified Context & Quality Pipeline — Project Phoenix v2
 *
 * This is the single entry point for ALL AI-powered content generation.
 * Every image, video, and copy request flows through this pipeline.
 *
 * Pipeline Stages:
 *   1. Context Assembly — Gathers all 8 context sources
 *   2. Pre-Generation Gate — Scores readiness, blocks bad prompts
 *   3. Execution — Delegates to the appropriate generation service
 *   4. Critic Stage — Evaluates output quality, retries if needed (image only)
 *   5. Safety & Scoring — Validates content safety and brand alignment
 *   6. Return — Returns the final, quality-assured result
 *
 * Design Principles:
 *   - Every stage is fault-tolerant: failure in one context source
 *     does not block the pipeline (except Pre-Gen Gate block).
 *   - The pipeline is format-agnostic: it handles image, video, and copy.
 *   - All existing services are reused, not rewritten.
 */

import { logger } from '../lib/logger';

// ── Context Assembly Imports ────────────────────────────────────────
import { storage } from '../storage';
import { productKnowledgeService, buildEnhancedContext } from './productKnowledgeService';
import { getBrandDNAContext } from './brandDNAService';
import { getRelevantPatterns, formatPatternsForPrompt } from './patternExtractionService';
import { analyzeProductImage } from './visionAnalysisService';
import { queryFileSearchStore } from './fileSearchService';
import { getPlatformSpecs } from './platformSpecsService';
import { buildPrompt, getPlatformGuidelines } from './generation/promptBuilder';

// ── Quality Gate Imports ────────────────────────────────────────────
import { evaluatePreGenGate, type PreGenGateResult } from './generation/preGenGate';
import { runCriticLoop } from './generation/criticStage';
import { checkContentSafety, type SafetyChecks } from './contentSafetyService';
import { evaluateContent, type ConfidenceScore } from './confidenceScoringService';

// ── Type Imports ────────────────────────────────────────────────────
import type {
  GenerationInput,
  GenerationContext,
  ProductContext,
  BrandContext,
  StyleContext,
  VisionContext,
  KBContext,
  PatternsContext,
  TemplateContext,
  BrandDNAContext,
  CritiqueResult,
} from '../types/generationPipeline';

// ============================================
// PUBLIC TYPES
// ============================================

export type PipelineOutputType = 'image' | 'video' | 'copy';

/**
 * Input for the unified pipeline.
 * Extends the existing GenerationInput with output type and copy-specific fields.
 */
export interface UnifiedPipelineInput {
  /** The type of content to generate */
  outputType: PipelineOutputType;

  /** For image/video generation — reuses the existing GenerationInput */
  generationInput?: GenerationInput;

  /** For copy generation */
  copyInput?: {
    productIds: string[];
    platform: string;
    tone?: string;
    goal?: string;
    additionalContext?: string;
    userId: string;
  };

  /** For video generation — additional video-specific options */
  videoInput?: {
    prompt: string;
    duration?: '4' | '6' | '8';
    aspectRatio?: '16:9' | '9:16';
    sourceImageBase64?: string;
    sourceImageMimeType?: string;
    userId: string;
    productIds?: string[];
  };

  /** Skip specific quality gates (for internal/batch use) */
  skipGates?: {
    preGen?: boolean;
    critic?: boolean;
    safety?: boolean;
    confidence?: boolean;
  };
}

/**
 * The assembled context object — all 8 sources gathered.
 * This is the "brain" that downstream services consume.
 */
export interface AssembledContext {
  product?: ProductContext;
  brand?: BrandContext;
  brandDNA?: BrandDNAContext;
  style?: StyleContext;
  vision?: VisionContext;
  kb?: KBContext;
  patterns?: PatternsContext;
  template?: TemplateContext;
  platformGuidelines?: string;
  /** Summary of which context sources were successfully loaded */
  sourcesLoaded: string[];
  /** Summary of which context sources failed (for diagnostics) */
  sourcesFailed: string[];
}

/**
 * Pre-generation gate result, exposed for callers.
 */
export interface GateResult {
  passed: boolean;
  score: number;
  suggestions: string[];
  blocked: boolean;
}

/**
 * Quality assessment result — combines safety and confidence scoring.
 */
export interface QualityAssessment {
  safety?: SafetyChecks;
  confidence?: ConfidenceScore;
  critique?: CritiqueResult;
  overallRecommendation: 'auto_approve' | 'manual_review' | 'auto_reject';
}

/**
 * The final result returned by the unified pipeline.
 */
export interface UnifiedPipelineResult {
  /** The type of content that was generated */
  outputType: PipelineOutputType;

  /** The assembled context used for generation */
  context: AssembledContext;

  /** Pre-generation gate result */
  gate: GateResult;

  /** Quality assessment (post-generation) */
  quality: QualityAssessment;

  /** Stages that completed successfully */
  stagesCompleted: string[];

  /** Total processing time in milliseconds */
  processingTimeMs: number;

  /** Image-specific result */
  image?: {
    generationId: string;
    imageUrl: string;
    imageBase64?: string;
    mimeType?: string;
  };

  /** Video-specific result */
  video?: {
    videoBase64: string;
    mimeType: string;
    durationSec: number;
  };

  /** Copy-specific result */
  copy?: {
    headline: string;
    hook: string;
    bodyText: string;
    cta: string;
    caption: string;
    hashtags: string[];
  };
}

// ============================================
// THRESHOLDS
// ============================================

const PRE_GEN_BLOCK_THRESHOLD = 40;
const PRE_GEN_WARN_THRESHOLD = 60;

// ============================================
// STAGE 1: CONTEXT ASSEMBLY
// ============================================

/**
 * Assemble all 8 context sources in parallel.
 * Each source is fault-tolerant — failure logs a warning but does not block.
 */
export async function assembleContext(input: UnifiedPipelineInput): Promise<AssembledContext> {
  const sourcesLoaded: string[] = [];
  const sourcesFailed: string[] = [];
  const userId = input.generationInput?.userId ?? input.copyInput?.userId ?? input.videoInput?.userId ?? '';
  const productIds =
    input.generationInput?.productIds ??
    input.generationInput?.recipe?.products?.map((p) => p.id) ??
    input.copyInput?.productIds ??
    input.videoInput?.productIds ??
    [];
  const platform = input.generationInput?.platform ?? input.copyInput?.platform ?? undefined;
  const prompt = input.generationInput?.prompt ?? input.videoInput?.prompt ?? input.copyInput?.additionalContext ?? '';

  const result: AssembledContext = { sourcesLoaded, sourcesFailed };

  // Run all context-gathering stages in parallel for speed
  const stages = await Promise.allSettled([
    // 1. Product Context
    (async () => {
      const primaryId = productIds[0];
      if (!primaryId) return;
      const enhanced = await buildEnhancedContext(primaryId, userId);
      if (!enhanced) return;
      result.product = {
        primaryId,
        primaryName: enhanced.product.name,
        category: enhanced.product.category ?? undefined,
        description: enhanced.product.description ?? undefined,
        relationships: enhanced.relatedProducts.map((rp) => ({
          targetProductName: rp.product.name,
          relationshipType: rp.relationshipType,
          ...(rp.relationshipDescription ? { description: rp.relationshipDescription } : {}),
        })),
        scenarios: enhanced.installationScenarios.map((s) => ({
          title: s.title,
          description: s.description,
          ...(s.installationSteps ? { steps: s.installationSteps } : {}),
          isActive: true,
        })),
        brandImages: enhanced.brandImages.map((bi) => ({
          imageUrl: bi.cloudinaryUrl,
          category: bi.category,
        })),
        formattedContext: enhanced.formattedContext,
      };
      sourcesLoaded.push('product');
    })(),

    // 2. Brand Context
    (async () => {
      const brandProfile = await storage.getBrandProfileByUserId(userId);
      if (!brandProfile) return;
      result.brand = {
        name: brandProfile.brandName || 'Unknown',
        styles: brandProfile.preferredStyles || [],
        values: brandProfile.brandValues || [],
        colors: brandProfile.brandColors || [],
        voicePrinciples: [],
      };
      sourcesLoaded.push('brand');
    })(),

    // 3. Brand DNA
    (async () => {
      const dnaContext = await getBrandDNAContext(userId, storage);
      if (!dnaContext) return;
      result.brandDNA = { contentRules: dnaContext };
      sourcesLoaded.push('brandDNA');
    })(),

    // 4. Learned Patterns
    (async () => {
      const categoryVal = result.product?.category;
      const patterns = await getRelevantPatterns({
        userId,
        ...(categoryVal ? { category: categoryVal } : {}),
        maxPatterns: 3,
      });
      if (patterns.length === 0) return;
      result.patterns = {
        directive: formatPatternsForPrompt(patterns),
        patternCount: patterns.length,
      };
      sourcesLoaded.push('patterns');
    })(),

    // 5. Vision Analysis
    (async () => {
      const firstProductId = productIds[0];
      if (!firstProductId) return;
      const product = await storage.getProductById(firstProductId);
      if (!product || !product.cloudinaryUrl) return;
      const analysisResult = await analyzeProductImage(product, userId);
      if (!analysisResult.success || !analysisResult.analysis) return;
      const analysis = analysisResult.analysis;
      result.vision = {
        category: analysis.category,
        materials: analysis.materials,
        colors: analysis.colors,
        style: analysis.style,
        usageContext: analysis.usageContext,
      };
      sourcesLoaded.push('vision');
    })(),

    // 6. Knowledge Base (RAG)
    (async () => {
      const queryParts = [prompt];
      if (result.product?.primaryName) queryParts.push(result.product.primaryName);
      if (result.product?.category) queryParts.push(result.product.category);
      const kbResult = await queryFileSearchStore({
        query: queryParts.join(' '),
        maxResults: 3,
      });
      if (!kbResult) return;
      result.kb = {
        context: kbResult.context,
        citations: kbResult.citations,
      };
      sourcesLoaded.push('kb');
    })(),

    // 7. Style References (image generation only)
    (async () => {
      const styleIds = input.generationInput?.styleReferenceIds;
      if (!styleIds || styleIds.length === 0) return;
      const directives: string[] = [];
      for (const id of styleIds.slice(0, 3)) {
        const ref = await storage.getStyleReferenceById(id);
        if (!ref?.styleDescription) continue;
        directives.push(ref.styleDescription);
      }
      if (directives.length === 0) return;
      result.style = {
        directive: directives.join('\n'),
        referenceCount: directives.length,
      };
      sourcesLoaded.push('style');
    })(),

    // 8. Platform Guidelines
    (async () => {
      if (!platform) return;
      const guidelines = getPlatformGuidelines(platform);
      if (guidelines) {
        result.platformGuidelines = guidelines;
        sourcesLoaded.push('platform');
      }
    })(),
  ]);

  // Log failures
  const stageNames = ['product', 'brand', 'brandDNA', 'patterns', 'vision', 'kb', 'style', 'platform'];
  stages.forEach((s, i) => {
    if (s.status === 'rejected') {
      sourcesFailed.push(stageNames[i]);
      logger.warn(
        { module: 'UnifiedPipeline', stage: stageNames[i], err: s.reason },
        `Context assembly stage failed: ${stageNames[i]}`,
      );
    }
  });

  logger.info(
    {
      module: 'UnifiedPipeline',
      sourcesLoaded,
      sourcesFailed,
      totalLoaded: sourcesLoaded.length,
      totalFailed: sourcesFailed.length,
    },
    'Context assembly complete',
  );

  return result;
}

// ============================================
// STAGE 2: PRE-GENERATION GATE
// ============================================

/**
 * Evaluate prompt readiness before spending API credits.
 * Returns a GateResult. If blocked, the pipeline will not proceed.
 */
export async function runPreGenGate(input: UnifiedPipelineInput, context: AssembledContext): Promise<GateResult> {
  if (input.skipGates?.preGen) {
    return { passed: true, score: 100, suggestions: [], blocked: false };
  }

  try {
    const prompt =
      input.generationInput?.prompt ?? input.videoInput?.prompt ?? input.copyInput?.additionalContext ?? '';

    const gateResult: PreGenGateResult = await evaluatePreGenGate({
      prompt,
      hasImages: (input.generationInput?.images?.length ?? 0) > 0,
      imageCount: input.generationInput?.images?.length ?? 0,
      hasTemplate: !!input.generationInput?.templateId,
      hasBrandContext: !!context.brand,
      hasRecipe: !!input.generationInput?.recipe,
      mode: input.generationInput?.mode ?? 'standard',
    });

    const blocked = gateResult.score < PRE_GEN_BLOCK_THRESHOLD;
    const passed = gateResult.score >= PRE_GEN_WARN_THRESHOLD;

    if (blocked) {
      logger.warn(
        { module: 'UnifiedPipeline', score: gateResult.score, suggestions: gateResult.suggestions },
        'Pre-gen gate BLOCKED generation',
      );
    } else if (!passed) {
      logger.warn(
        { module: 'UnifiedPipeline', score: gateResult.score },
        'Pre-gen gate warning — proceeding with reduced confidence',
      );
    } else {
      logger.info({ module: 'UnifiedPipeline', score: gateResult.score }, 'Pre-gen gate passed');
    }

    return {
      passed,
      score: gateResult.score,
      suggestions: gateResult.suggestions,
      blocked,
    };
  } catch (err) {
    logger.warn({ module: 'UnifiedPipeline', err }, 'Pre-gen gate evaluation failed — allowing generation to proceed');
    return { passed: true, score: -1, suggestions: ['Gate evaluation failed'], blocked: false };
  }
}

// ============================================
// STAGE 5: QUALITY ASSESSMENT (POST-GENERATION)
// ============================================

/**
 * Run post-generation quality checks: safety validation and confidence scoring.
 * Applies to copy output. Critic stage applies to image output (handled in pipeline).
 */
export async function runQualityAssessment(
  input: UnifiedPipelineInput,
  caption?: string,
  imageUrl?: string,
  critique?: CritiqueResult,
): Promise<QualityAssessment> {
  const userId = input.generationInput?.userId ?? input.copyInput?.userId ?? input.videoInput?.userId ?? '';
  const platform = input.generationInput?.platform ?? input.copyInput?.platform ?? 'instagram';

  let safety: SafetyChecks | undefined;
  let confidence: ConfidenceScore | undefined;

  // Safety check
  if (!input.skipGates?.safety && caption) {
    try {
      safety = await checkContentSafety({
        caption,
        imageUrl,
        userId,
      });
    } catch (err) {
      logger.warn({ module: 'UnifiedPipeline', err }, 'Safety check failed — skipping');
    }
  }

  // Confidence scoring
  if (!input.skipGates?.confidence && caption) {
    try {
      confidence = await evaluateContent({
        caption,
        platform: platform as 'instagram' | 'linkedin' | 'facebook' | 'twitter' | 'tiktok',
        imageUrl,
        userId,
      });
    } catch (err) {
      logger.warn({ module: 'UnifiedPipeline', err }, 'Confidence scoring failed — skipping');
    }
  }

  // Determine overall recommendation
  let overallRecommendation: 'auto_approve' | 'manual_review' | 'auto_reject' = 'manual_review';

  if (safety && safety.brandSafetyScore < 30) {
    overallRecommendation = 'auto_reject';
  } else if (confidence?.recommendation) {
    overallRecommendation = confidence.recommendation;
  } else if (safety && safety.brandSafetyScore >= 80 && (!critique || critique.passed)) {
    overallRecommendation = 'auto_approve';
  }

  return {
    safety,
    confidence,
    critique,
    overallRecommendation,
  };
}

// ============================================
// MAIN PIPELINE EXECUTOR
// ============================================

/**
 * Execute the full Unified Context & Quality Pipeline.
 *
 * This is the single entry point for all content generation.
 * It assembles context, evaluates readiness, delegates to the
 * appropriate generation service, and runs quality checks.
 *
 * NOTE: This pipeline does NOT call the generation services directly
 * for image/video — it returns the assembled context and gate result
 * so the caller (Orchestrator or existing routes) can invoke generation
 * with the enriched context. This avoids circular dependencies and
 * allows the existing generation pipeline to continue working.
 *
 * For copy generation, the pipeline assembles context that the
 * copywriting service can consume.
 */
export async function executePipeline(input: UnifiedPipelineInput): Promise<{
  context: AssembledContext;
  gate: GateResult;
  stagesCompleted: string[];
}> {
  const startTime = Date.now();
  const stagesCompleted: string[] = [];

  // Stage 1: Context Assembly
  const context = await assembleContext(input);
  stagesCompleted.push('contextAssembly');

  // Stage 2: Pre-Generation Gate
  const gate = await runPreGenGate(input, context);
  stagesCompleted.push('preGenGate');

  if (gate.blocked) {
    const processingTimeMs = Date.now() - startTime;
    logger.info(
      { module: 'UnifiedPipeline', processingTimeMs, stagesCompleted, gateScore: gate.score },
      'Pipeline blocked by pre-gen gate',
    );
    return { context, gate, stagesCompleted };
  }

  const processingTimeMs = Date.now() - startTime;
  logger.info(
    {
      module: 'UnifiedPipeline',
      processingTimeMs,
      stagesCompleted,
      sourcesLoaded: context.sourcesLoaded.length,
      gateScore: gate.score,
    },
    'Pipeline context ready for generation',
  );

  return { context, gate, stagesCompleted };
}

// ============================================
// CONVENIENCE: Build GenerationContext from AssembledContext
// ============================================

/**
 * Convert the AssembledContext into the existing GenerationContext format
 * so the existing generationPipelineService can consume it directly.
 * This is the bridge between the new unified pipeline and the existing code.
 */
export function toGenerationContext(input: GenerationInput, assembled: AssembledContext): GenerationContext {
  return {
    input,
    product: assembled.product,
    brand: assembled.brand,
    brandDNA: assembled.brandDNA,
    style: assembled.style,
    vision: assembled.vision,
    kb: assembled.kb,
    patterns: assembled.patterns,
    template: assembled.template,
  };
}
