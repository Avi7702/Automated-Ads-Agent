/**
 * Generation Pipeline Service — Refactored for Project Phoenix v2
 *
 * Now delegates context assembly to the UnifiedContextQualityPipeline,
 * while retaining ownership of:
 *   - Prompt Assembly (buildPrompt + buildImageParts)
 *   - Pre-Gen Gate (block/warn behavior with throw semantics)
 *   - Image Generation (Gemini API call)
 *   - Critic Stage (auto-quality evaluation + silent retry)
 *   - Persistence (save to storage + cost tracking)
 *
 * This refactor eliminates duplicated context-gathering code (stages 2-7)
 * and ensures every generation request benefits from the unified pipeline's
 * parallel context assembly and fault tolerance.
 */

import { logger } from '../../lib/logger';
import { storage } from '../../storage';
import { genAI, createGeminiClient } from '../../lib/gemini';
import { buildStyleDirective } from '../styleAnalysisService';
import { saveOriginalFile, saveGeneratedImage } from '../../fileStorage';
import { estimateGenerationCostMicros } from '../pricingEstimator';
import { buildPrompt } from './promptBuilder';
import { runCriticLoop } from './criticStage';
import { evaluatePreGenGate, BLOCK_THRESHOLD, WARN_THRESHOLD } from './preGenGate';
import type { PreGenGateResult } from './preGenGate';
import { captureException } from '../../lib/sentry';
import { notify } from '../notificationService';
import { generateContentWithRetry } from '../../lib/geminiClient';

// ── Unified Pipeline ────────────────────────────────────────────────
import { assembleContext, toGenerationContext, type AssembledContext } from '../unifiedContextQualityPipeline';

import type { GenerationContext, GenerationInput, GenerationResult } from '../../types/generationPipeline';

// ============================================
// MAIN PIPELINE
// ============================================

/**
 * Execute the full generation pipeline.
 *
 * Takes a GenerationInput, delegates context gathering to the
 * UnifiedContextQualityPipeline, assembles the prompt, calls Gemini,
 * runs the critic loop, and persists the result.
 *
 * Optionally accepts a pre-assembled context to skip the assembly stage
 * (used by the Orchestrator when it has already assembled context).
 */
export async function executeGenerationPipeline(
  input: GenerationInput,
  preAssembledContext?: AssembledContext,
): Promise<GenerationResult> {
  const startTime = Date.now();
  const stagesCompleted: string[] = [];

  logger.info(
    {
      module: 'GenerationPipeline',
      mode: input.mode,
      imageCount: input.images.length,
      hasTemplate: !!input.templateId,
      hasRecipe: !!input.recipe,
      hasStyleRefs: !!input.styleReferenceIds?.length,
      hasPreAssembledContext: !!preAssembledContext,
    },
    'Pipeline started',
  );

  // ── Stage 1: Context Assembly (via Unified Pipeline) ──────────
  let assembled: AssembledContext;
  if (preAssembledContext) {
    assembled = preAssembledContext;
    stagesCompleted.push('contextAssembly(pre-assembled)');
  } else {
    assembled = await assembleContext({
      outputType: 'image',
      generationInput: input,
    });
    stagesCompleted.push('contextAssembly');
  }

  // Convert to GenerationContext for downstream compatibility
  const ctx: GenerationContext = toGenerationContext(input, assembled);

  // ── Stage 8: Template Resolution ──────────────────────────────
  // Template resolution is image-pipeline-specific, so it stays here.
  await runStage('template', stagesCompleted, async () => {
    const result = await stageTemplateResolution(ctx);
    if (result) ctx.template = result;
  });

  // ── Stage 9: Prompt Assembly (must succeed) ───────────────────
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
      contextSourcesLoaded: assembled.sourcesLoaded,
    },
    'Prompt assembled',
  );

  // ── Stage 9.5: Pre-Generation Quality Gate ────────────────────
  // Evaluates prompt + context completeness before expensive image generation.
  // Score < 40 blocks (throws), 40-60 warns (continues), > 60 passes.
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
    if (err instanceof Error && err.name === 'PreGenGateError') {
      throw err;
    }
    logger.warn(
      { module: 'GenerationPipeline', stage: 'preGenGate', err },
      'Pre-gen gate failed — continuing without it',
    );
  }

  // ── Stage 10: Generation (must succeed — alert on failure) ────
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
    throw err;
  }
  ctx.result = genResult;
  stagesCompleted.push('generation');

  // ── Stage 10.5: Critic — silent auto-quality evaluation + retry ─
  await runStage('critic', stagesCompleted, async () => {
    const geminiClient = await resolveGeminiClient(ctx.input.userId);

    const { retriesUsed, finalCritique } = await runCriticLoop(ctx, geminiClient, async (revisedPrompt: string) => {
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

  // ── Stage 11: Persistence ─────────────────────────────────────
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
// STAGE IMPLEMENTATIONS (Pipeline-specific)
// ============================================

/**
 * Stage 8: Template Resolution
 * Fetch template details if a templateId was provided.
 * This is image-pipeline-specific and stays in this service.
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

  const modelName = 'gemini-3.1-flash-image-preview';
  const validResolutions = ['1K', '2K', '4K'];
  const resolution = validResolutions.includes(ctx.input.resolution) ? ctx.input.resolution : '2K';

  // Build content parts: images first, then prompt text
  const assembled = ctx.assembled!;
  const userParts = [...assembled.imageParts, { text: assembled.finalPrompt }];

  const contents = [{ role: 'user', parts: userParts }];

  logger.info({ module: 'GenerationPipeline', model: modelName, resolution }, 'Calling Gemini API');

  const result = await generateContentWithRetry(
    {
      model: modelName,
      contents,
      config: {
        imageConfig: {
          imageSize: resolution,
        },
      },
    },
    { operation: 'image_generation' },
    geminiClient,
  );

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
      model: 'gemini-3.1-flash-image-preview',
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
