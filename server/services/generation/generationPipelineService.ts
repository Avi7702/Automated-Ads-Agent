/**
 * Generation Pipeline Service
 *
 * Systematic orchestrator for image generation that connects ALL context sources.
 *
 * Pipeline stages (in order):
 * 1. Input (already parsed)
 * 2. Product Context — productKnowledgeService
 * 3. Brand Context — storage.getBrandProfileByUserId
 * 4. Style References — styleAnalysisService (KEY FIX: was 100% disconnected)
 * 5. Vision Analysis — visionAnalysisService
 * 6. KB/RAG Enrichment — fileSearchService
 * 7. Learned Patterns — patternExtractionService
 * 8. Template Resolution — storage.getAdSceneTemplateById
 * 9. Prompt Assembly — promptBuilder
 * 9.5. Pre-Generation Quality Gate — preGenGate (blocks score<40, warns 40-60)
 * 10. Generation — Gemini API
 * 10.5. Critic — auto-quality evaluation + silent retry (PaperBanana pattern)
 * 11. Persistence — storage.saveGeneration
 *
 * Each stage is fault-tolerant: if any context source fails, the pipeline
 * continues with what it has (same pattern as IdeaBank).
 */

import { logger } from '../../lib/logger';
import { storage } from '../../storage';
import { genAI, createGeminiClient } from '../../lib/gemini';
// telemetry import reserved for future usage tracking integration
import { buildStyleDirective } from '../styleAnalysisService';
import { buildEnhancedContext } from '../productKnowledgeService';
import { analyzeProductImage } from '../visionAnalysisService';
import { queryFileSearchStore } from '../fileSearchService';
import { getRelevantPatterns, formatPatternsForPrompt } from '../patternExtractionService';
import { saveOriginalFile, saveGeneratedImage } from '../../fileStorage';
import { estimateGenerationCostMicros } from '../pricingEstimator';
import { buildPrompt } from './promptBuilder';
import { runCriticLoop } from './criticStage';
import { evaluatePreGenGate, BLOCK_THRESHOLD, WARN_THRESHOLD } from './preGenGate';
import type { PreGenGateResult } from './preGenGate';
import { captureException } from '../../lib/sentry';
import { notify } from '../notificationService';
import { getBrandDNAContext } from '../brandDNAService';

import type {
  GenerationContext,
  GenerationInput,
  GenerationResult,
  ProductContext,
} from '../../types/generationPipeline';

// ============================================
// MAIN PIPELINE
// ============================================

/**
 * Execute the full generation pipeline.
 *
 * Takes a GenerationInput, runs all context-gathering stages,
 * assembles the prompt, calls Gemini, and persists the result.
 */
export async function executeGenerationPipeline(input: GenerationInput): Promise<GenerationResult> {
  const startTime = Date.now();
  const stagesCompleted: string[] = [];

  // Initialize context with input
  const ctx: GenerationContext = { input };

  logger.info(
    {
      module: 'GenerationPipeline',
      mode: input.mode,
      imageCount: input.images.length,
      hasTemplate: !!input.templateId,
      hasRecipe: !!input.recipe,
      hasStyleRefs: !!input.styleReferenceIds?.length,
    },
    'Pipeline started',
  );

  // Stage 2: Product Context
  await runStage('product', stagesCompleted, async () => {
    const result = await stageProductContext(ctx);
    if (result) ctx.product = result;
  });

  // Stage 3: Brand Context
  await runStage('brand', stagesCompleted, async () => {
    const result = await stageBrandContext(ctx);
    if (result) ctx.brand = result;
  });

  // Stage 4: Style References (was completely disconnected)
  await runStage('style', stagesCompleted, async () => {
    const result = await stageStyleReferences(ctx);
    if (result) ctx.style = result;
  });

  // Stage 5: Vision Analysis
  await runStage('vision', stagesCompleted, async () => {
    const result = await stageVisionAnalysis(ctx);
    if (result) ctx.vision = result;
  });

  // Stage 6: KB/RAG Enrichment
  await runStage('kb', stagesCompleted, async () => {
    const result = await stageKBEnrichment(ctx);
    if (result) ctx.kb = result;
  });

  // Stage 7: Learned Patterns
  await runStage('patterns', stagesCompleted, async () => {
    const result = await stageLearnedPatterns(ctx);
    if (result) ctx.patterns = result;
  });

  // Stage 8: Template Resolution
  await runStage('template', stagesCompleted, async () => {
    const result = await stageTemplateResolution(ctx);
    if (result) ctx.template = result;
  });

  // Stage 9: Prompt Assembly (not try/catch — must succeed)
  const finalPrompt = buildPrompt(ctx);
  const imageParts = await buildImageParts(ctx);
  ctx.assembled = { finalPrompt, imageParts };
  stagesCompleted.push('assembly');

  logger.info(
    {
      module: 'GenerationPipeline',
      stagesCompleted,
      promptLength: finalPrompt.length,
      imagePartsCount: imageParts.length,
    },
    'Prompt assembled',
  );

  // Stage 9.5: Pre-Generation Quality Gate
  // Evaluates prompt + context completeness before expensive image generation.
  // Score < 40 blocks (throws), 40-60 warns (continues), > 60 passes.
  // NOTE: Unlike other stages, a BLOCK result must propagate — not be swallowed by runStage.
  let preGenGateResult: PreGenGateResult | undefined;
  try {
    preGenGateResult = await evaluatePreGenGate({
      prompt: input.prompt,
      hasImages: input.images.length > 0,
      imageCount: input.images.length,
      hasTemplate: !!ctx.template,
      hasBrandContext: !!ctx.brand,
      hasRecipe: !!input.recipe,
      mode: input.mode,
    });
    stagesCompleted.push('preGenGate');

    if (preGenGateResult.score < BLOCK_THRESHOLD) {
      // Block generation — throw with suggestions so the caller can return a 400
      const suggestionsText =
        preGenGateResult.suggestions.length > 0
          ? `\nSuggestions:\n${preGenGateResult.suggestions.map((s) => `  - ${s}`).join('\n')}`
          : '';
      const err = Object.assign(
        new Error(`Pre-generation quality gate failed (score: ${preGenGateResult.score}/100).${suggestionsText}`),
        {
          name: 'PreGenGateError',
          score: preGenGateResult.score,
          suggestions: preGenGateResult.suggestions,
          breakdown: preGenGateResult.breakdown,
        },
      );
      throw err;
    }

    if (preGenGateResult.score < WARN_THRESHOLD) {
      logger.warn(
        {
          module: 'GenerationPipeline',
          score: preGenGateResult.score,
          suggestions: preGenGateResult.suggestions,
          breakdown: preGenGateResult.breakdown,
        },
        'Pre-gen gate warning — proceeding with reduced confidence',
      );
    } else {
      logger.info({ module: 'GenerationPipeline', score: preGenGateResult.score }, 'Pre-gen gate passed');
    }
  } catch (err: unknown) {
    // If it's a PreGenGateError, re-throw — caller should handle it
    if (err instanceof Error && err.name === 'PreGenGateError') {
      throw err;
    }
    // For any other error (LLM failure, network issue), log and continue
    logger.warn(
      { module: 'GenerationPipeline', stage: 'preGenGate', err },
      'Pre-gen gate failed — continuing without it',
    );
  }

  // Stage 10: Generation (must succeed — alert on failure)
  let genResult;
  try {
    genResult = await stageGeneration(ctx);
  } catch (err: unknown) {
    captureException(err instanceof Error ? err : new Error(String(err)), {
      stage: 'generation',
      mode: input.mode,
      userId: input.userId,
    });
    notify({
      severity: 'error',
      title: 'Image Generation Failed',
      message: err instanceof Error ? err.message : 'Gemini API call failed',
      context: {
        mode: input.mode,
        userId: input.userId,
        promptLength: ctx.assembled?.finalPrompt?.length ?? 0,
        imageCount: input.images.length,
      },
    }).catch((notifyErr) => {
      logger.debug({ module: 'GenerationPipeline', err: notifyErr }, 'Notification delivery failed');
    });
    throw err; // Re-throw — caller handles the error response
  }
  ctx.result = genResult;
  stagesCompleted.push('generation');

  // Stage 10.5: Critic — silent auto-quality evaluation + retry
  await runStage('critic', stagesCompleted, async () => {
    const geminiClient = await resolveGeminiClient(ctx.input.userId);

    const { retriesUsed, finalCritique } = await runCriticLoop(ctx, geminiClient, async (revisedPrompt: string) => {
      // Re-generate with revised prompt — keep same images, swap prompt text
      const revisedCtx = { ...ctx };
      revisedCtx.assembled = {
        finalPrompt: revisedPrompt,
        imageParts: ctx.assembled?.imageParts ?? [],
      };
      return stageGeneration(revisedCtx);
    });

    if (retriesUsed > 0) {
      logger.info(
        {
          module: 'GenerationPipeline',
          retriesUsed,
          finalScore: finalCritique.score,
        },
        'Critic improved generation via auto-retry',
      );
    }
  });

  // Stage 11: Persistence
  const persistResult = await stagePersistence(ctx, startTime);
  stagesCompleted.push('persistence');

  const processingTimeMs = Date.now() - startTime;
  logger.info(
    {
      module: 'GenerationPipeline',
      generationId: persistResult.generationId,
      processingTimeMs,
      stagesCompleted,
    },
    'Pipeline completed',
  );

  return {
    generationId: persistResult.generationId,
    imageUrl: persistResult.imageUrl,
    prompt: input.prompt,
    canEdit: true,
    mode: input.mode,
    ...(input.templateId ? { templateId: input.templateId } : {}),
    stagesCompleted,
  };
}

// ============================================
// HELPER: Fault-tolerant stage runner
// ============================================

async function runStage(name: string, stagesCompleted: string[], fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
    stagesCompleted.push(name);
  } catch (err) {
    logger.warn({ module: 'GenerationPipeline', stage: name, err }, `Stage ${name} failed — continuing without it`);
  }
}

// ============================================
// STAGE IMPLEMENTATIONS
// ============================================

/**
 * Stage 2: Product Context
 * Fetch product data and enhanced context (relationships, scenarios, brand images).
 */
async function stageProductContext(ctx: GenerationContext) {
  // Extract product IDs from recipe (validate structure defensively)
  const productIds = Array.isArray(ctx.input.recipe?.products)
    ? ctx.input.recipe.products.map((p) => (typeof p?.id === 'string' ? p.id : '')).filter(Boolean)
    : [];
  const primaryId = productIds[0];
  if (!primaryId) return undefined;

  const enhanced = await buildEnhancedContext(primaryId, ctx.input.userId);
  if (!enhanced) return undefined;

  const result: ProductContext = {
    primaryId,
    primaryName: enhanced.product.name,
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
  if (enhanced.product.category) result.category = enhanced.product.category;
  if (enhanced.product.description) result.description = enhanced.product.description;
  return result;
}

/**
 * Stage 3: Brand Context
 * Fetch brand profile for the current user.
 * Also fetches Brand DNA context for enrichment.
 */
async function stageBrandContext(ctx: GenerationContext) {
  const brandProfile = await storage.getBrandProfileByUserId(ctx.input.userId);

  // Fetch Brand DNA context (Phase 5) — runs in parallel, fault-tolerant
  try {
    const dnaContext = await getBrandDNAContext(ctx.input.userId, storage);
    if (dnaContext) {
      ctx.brandDNA = {
        contentRules: dnaContext,
      };
    }
  } catch (err) {
    logger.warn({ module: 'GenerationPipeline', err }, 'Brand DNA fetch failed — continuing without it');
  }

  if (!brandProfile) return undefined;

  return {
    name: brandProfile.brandName || 'Unknown',
    styles: brandProfile.preferredStyles || [],
    values: brandProfile.brandValues || [],
    colors: brandProfile.colorPreferences || [],
    voicePrinciples:
      ((brandProfile.voice as Record<string, unknown> | null)?.['principles'] as string[] | undefined) ?? [],
  };
}

/**
 * Stage 4: Style References (KEY FIX — was completely disconnected)
 * Fetch user's selected style references and build a style directive.
 */
async function stageStyleReferences(ctx: GenerationContext) {
  const ids = ctx.input.styleReferenceIds;
  if (!ids || ids.length === 0) return undefined;

  const directives: string[] = [];

  for (const id of ids.slice(0, 3)) {
    const ref = await storage.getStyleReferenceById(id);
    if (!ref) continue;

    // Use cached analysis if available
    if (ref.styleDescription && ref.extractedElements) {
      const directive = buildStyleDirective(
        ref.styleDescription,
        ref.extractedElements as Parameters<typeof buildStyleDirective>[1],
      );
      directives.push(directive);
    }
  }

  if (directives.length === 0) return undefined;

  return {
    directive: directives.join('\n'),
    referenceCount: directives.length,
  };
}

/**
 * Stage 5: Vision Analysis
 * Analyze the product image to extract visual characteristics.
 */
async function stageVisionAnalysis(ctx: GenerationContext) {
  // Need a product with an image to analyze
  const productIds = ctx.input.recipe?.products?.map((p) => p.id) || [];
  const firstProductId = productIds[0];
  if (!firstProductId) return undefined;

  const product = await storage.getProductById(firstProductId);
  if (!product || !product.cloudinaryUrl) return undefined;

  const result = await analyzeProductImage(product, ctx.input.userId);
  if (!result.success || !result.analysis) return undefined;

  const analysis = result.analysis;
  return {
    category: analysis.category,
    materials: analysis.materials,
    colors: analysis.colors,
    style: analysis.style,
    usageContext: analysis.usageContext,
  };
}

/**
 * Stage 6: KB/RAG Enrichment
 * Query the knowledge base for relevant brand guidelines and context.
 */
async function stageKBEnrichment(ctx: GenerationContext) {
  // Build a query from the prompt + product context
  const queryParts = [ctx.input.prompt];
  if (ctx.product?.primaryName) {
    queryParts.push(ctx.product.primaryName);
  }
  if (ctx.product?.category) {
    queryParts.push(ctx.product.category);
  }

  const result = await queryFileSearchStore({
    query: queryParts.join(' '),
    maxResults: 3,
  });

  if (!result) return undefined;

  return {
    context: result.context,
    citations: result.citations?.map((c) => String(c)) || [],
  };
}

/**
 * Stage 7: Learned Patterns
 * Fetch relevant patterns from the user's pattern library.
 */
async function stageLearnedPatterns(ctx: GenerationContext) {
  const categoryVal = ctx.vision?.category || ctx.product?.category;
  const patterns = await getRelevantPatterns({
    userId: ctx.input.userId,
    ...(categoryVal ? { category: categoryVal } : {}),
    maxPatterns: 3,
  });

  if (patterns.length === 0) return undefined;

  const directive = formatPatternsForPrompt(patterns);
  return {
    directive,
    patternCount: patterns.length,
  };
}

/**
 * Stage 8: Template Resolution
 * Fetch template details if a templateId was provided.
 */
async function stageTemplateResolution(ctx: GenerationContext) {
  if (!ctx.input.templateId) return undefined;

  const template = await storage.getAdSceneTemplateById(ctx.input.templateId);
  if (!template) return undefined;

  return {
    id: template.id,
    title: template.title,
    blueprint: template.promptBlueprint,
    mood: template.mood || '',
    lighting: template.lightingStyle || '',
    environment: template.environment || '',
    placementHints: (template.placementHints as Record<string, unknown>) ?? {},
    category: template.category,
    referenceImageUrls: Array.isArray(template.referenceImages)
      ? (template.referenceImages as Array<Record<string, unknown>>)
          .map((img) => String(img['url'] ?? ''))
          .filter(Boolean)
      : [],
  };
}

// ============================================
// IMAGE PARTS BUILDER
// ============================================

/**
 * Build the image parts array for the Gemini API call.
 * Includes template reference images + user-uploaded product images.
 */
async function buildImageParts(
  ctx: GenerationContext,
): Promise<Array<{ inlineData: { mimeType: string; data: string } }>> {
  const parts: Array<{ inlineData: { mimeType: string; data: string } }> = [];

  // Add template reference images (for exact_insert mode)
  if (ctx.input.mode === 'exact_insert' && ctx.input.templateReferenceUrls) {
    const isAllowedUrl = (url: string): boolean => {
      try {
        const parsed = new URL(url);
        const allowedHosts = ['res.cloudinary.com', 'images.unsplash.com', 'cdn.pixabay.com'];
        return parsed.protocol === 'https:' && allowedHosts.some((h) => parsed.hostname.endsWith(h));
      } catch {
        return false;
      }
    };

    for (const refUrl of ctx.input.templateReferenceUrls.slice(0, 3)) {
      if (!isAllowedUrl(refUrl)) {
        logger.warn({ module: 'GenerationPipeline', url: refUrl }, 'Skipping disallowed URL');
        continue;
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(refUrl, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (response.ok) {
          const buffer = await response.arrayBuffer();
          parts.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: Buffer.from(buffer).toString('base64'),
            },
          });
        }
      } catch (err) {
        logger.warn({ module: 'GenerationPipeline', url: refUrl, err }, 'Failed to fetch template reference image');
      }
    }
  }

  // Add user-uploaded product images
  for (const img of ctx.input.images) {
    parts.push({
      inlineData: {
        mimeType: img.mimetype,
        data: img.buffer.toString('base64'),
      },
    });
  }

  return parts;
}

// ============================================
// STAGE 10: GENERATION
// ============================================

async function stageGeneration(ctx: GenerationContext) {
  const geminiClient = await resolveGeminiClient(ctx.input.userId);

  const modelName = 'gemini-3-pro-image-preview';
  const validResolutions = ['1K', '2K', '4K'];
  const resolution = validResolutions.includes(ctx.input.resolution) ? ctx.input.resolution : '2K';

  // Build content parts: images first, then prompt text
  const assembled = ctx.assembled!;
  const userParts = [...assembled.imageParts, { text: assembled.finalPrompt }];

  const contents = [{ role: 'user', parts: userParts }];

  logger.info({ module: 'GenerationPipeline', model: modelName, resolution }, 'Calling Gemini API');

  const result = await geminiClient.models.generateContent({
    model: modelName,
    contents,
    config: {
      imageConfig: {
        imageSize: resolution,
      },
    },
  });

  // Extract image from response
  if (!result.candidates?.[0]?.content?.parts?.[0]) {
    throw new Error('No image generated');
  }

  const modelResponse = result.candidates[0].content;
  const imagePart = modelResponse.parts?.find((p) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error('Generated content was not an image');
  }

  // Build conversation history for future edits
  const conversationHistory = [
    { role: 'user', parts: userParts },
    modelResponse, // Contains thoughtSignature fields — DO NOT MODIFY
  ];

  return {
    imageBase64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
    conversationHistory,
    usageMetadata: ((result as unknown as Record<string, unknown>)['usageMetadata'] as Record<string, unknown>) ?? {},
    modelResponse,
  };
}

// ============================================
// STAGE 11: PERSISTENCE
// ============================================

async function stagePersistence(
  ctx: GenerationContext,
  startTime: number,
): Promise<{ generationId: string; imageUrl: string }> {
  const result = ctx.result!;

  // Save uploaded originals to disk
  const originalImagePaths: string[] = [];
  for (const img of ctx.input.images) {
    const savedPath = await saveOriginalFile(img.buffer, img.originalname);
    originalImagePaths.push(savedPath);
  }

  // Save generated image
  const format = (result.mimeType || 'image/png').split('/')[1] ?? 'png';
  const generatedImagePath = await saveGeneratedImage(result.imageBase64, format);

  // Save generation record
  const generation = await storage.saveGeneration({
    userId: ctx.input.userId,
    prompt: ctx.input.prompt,
    originalImagePaths,
    generatedImagePath,
    resolution: ctx.input.resolution,
    conversationHistory: result.conversationHistory,
    parentGenerationId: null,
    editPrompt: null,
    // Wave 3: Persist generation context metadata
    productIds: ctx.input.productIds ?? ctx.input.recipe?.products?.map((p) => p.id) ?? null,
    templateId: ctx.input.templateId ?? null,
    generationMode: ctx.input.mode ?? null,
  });

  // Persist usage/cost estimate
  try {
    const durationMs = Date.now() - startTime;
    const cost = estimateGenerationCostMicros({
      resolution: ctx.input.resolution,
      inputImagesCount: ctx.input.images.length,
      promptChars: ctx.input.prompt.length,
      usageMetadata: typeof result.usageMetadata === 'object' ? result.usageMetadata : null,
    });

    await storage.saveGenerationUsage({
      generationId: generation.id,
      brandId: ctx.input.userId || 'anonymous',
      model: 'gemini-3-pro-image-preview',
      operation: 'generate',
      resolution: ctx.input.resolution,
      inputImagesCount: ctx.input.images.length,
      promptChars: ctx.input.prompt.length,
      durationMs,
      inputTokens: cost.inputTokens,
      outputTokens: cost.outputTokens,
      estimatedCostMicros: cost.estimatedCostMicros,
      estimationSource: cost.estimationSource,
    });
  } catch (e) {
    logger.warn({ module: 'GenerationPipeline', err: e }, 'Failed to persist generation usage');
  }

  const imageUrl = generatedImagePath.startsWith('http')
    ? generatedImagePath
    : `/${generatedImagePath.replace(/\\/g, '/')}`;

  return { generationId: generation.id, imageUrl };
}

// ============================================
// UTILITIES
// ============================================

/**
 * Resolve the Gemini client for a user (uses their saved API key if available).
 */
async function resolveGeminiClient(userId: string | undefined) {
  if (!userId) return genAI;
  try {
    const resolved = await storage.resolveApiKey(userId, 'gemini');
    if (resolved.key && resolved.source === 'user') {
      return createGeminiClient(resolved.key);
    }
  } catch {
    // Fall through to default
  }
  return genAI;
}
