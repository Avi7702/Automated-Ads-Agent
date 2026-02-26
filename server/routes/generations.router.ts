/**
 * Generations Router
 * Generation CRUD, job management, and SSE streaming
 *
 * Endpoints:
 * - GET /api/generations - List generations
 * - GET /api/generations/:id - Get single generation
 * - GET /api/generations/:id/history - Get edit history
 * - DELETE /api/generations/:id - Delete generation
 * - POST /api/generations/:id/edit - Edit generation (async BullMQ)
 * - POST /api/generations/:id/analyze - Analyze generation
 * - GET /api/jobs/:jobId - Get job status
 * - GET /api/jobs/:jobId/stream - SSE job status stream
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { JobType, JobProgress, VIDEO_JOB_OPTIONS } from '../jobs/types';
import type { EditJobData, VideoGenerateJobData } from '../jobs/types';
import { getGlobalGeminiClient } from '../lib/geminiClient';
import type { Part } from '@google/genai';
import { promptInjectionGuard } from '../middleware/promptInjectionGuard';

export const generationsRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger, generationQueue, telemetry } = ctx.services;
  const { requireAuth } = ctx.middleware;
  const { toGenerationDTO, toGenerationDTOArray, deleteFile } = ctx.utils;

  /**
   * GET / - List all generations
   */
  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const limitQuery = req.query['limit'];
        const limitValue = Array.isArray(limitQuery) ? limitQuery[0] : limitQuery;
        const limit = Number.parseInt(typeof limitValue === 'string' ? limitValue : '', 10) || 50;
        const allGenerations = await storage.getGenerations(limit);
        res.json(toGenerationDTOArray(allGenerations));
      } catch (err: unknown) {
        logger.error({ module: 'Generations', err }, 'Error fetching generations');
        res.status(500).json({ error: 'Failed to fetch generations' });
      }
    }),
  );

  /**
   * GET /:id - Get single generation by ID
   */
  router.get(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const generationId = req.params['id'];
        if (typeof generationId !== 'string') {
          return res.status(400).json({ error: 'Generation ID is required' });
        }

        const generation = await storage.getGenerationById(generationId);
        if (!generation) {
          return res.status(404).json({ error: 'Generation not found' });
        }
        res.json(toGenerationDTO(generation));
      } catch (err: unknown) {
        logger.error({ module: 'Generation', err }, 'Error fetching generation');
        res.status(500).json({ error: 'Failed to fetch generation' });
      }
    }),
  );

  /**
   * GET /:id/history - Get edit history for a generation
   */
  router.get(
    '/:id/history',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const id = req.params['id'];
        if (typeof id !== 'string') {
          return res.status(400).json({ error: 'Generation ID is required' });
        }

        const generation = await storage.getGenerationById(id);
        if (!generation) {
          return res.status(404).json({ error: 'Generation not found' });
        }

        // Get full edit chain
        const history = await storage.getEditHistory(id);

        res.json({
          current: generation,
          history: history,
          totalEdits: history.length - 1, // Subtract 1 because the original is included
        });
      } catch (err: unknown) {
        logger.error({ module: 'GenerationHistory', err }, 'Error fetching generation history');
        res.status(500).json({ error: 'Failed to fetch generation history' });
      }
    }),
  );

  /**
   * DELETE /:id - Delete generation
   */
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const generationId = req.params['id'];
        if (typeof generationId !== 'string') {
          return res.status(400).json({ error: 'Generation ID is required' });
        }

        const generation = await storage.getGenerationById(generationId);
        if (!generation) {
          return res.status(404).json({ error: 'Generation not found' });
        }

        // Delete files from disk
        await deleteFile(generation.generatedImagePath);
        for (const originalPath of generation.originalImagePaths) {
          await deleteFile(originalPath);
        }

        // Delete from database
        await storage.deleteGeneration(generationId);

        res.json({ success: true });
      } catch (err: unknown) {
        logger.error({ module: 'DeleteGeneration', err }, 'Error deleting generation');
        res.status(500).json({ error: 'Failed to delete generation' });
      }
    }),
  );

  /**
   * POST /:id/edit - Edit generation (async via BullMQ)
   * Returns immediately with jobId, client polls /api/jobs/:jobId for status
   */
  router.post(
    '/:id/edit',
    requireAuth,
    promptInjectionGuard,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.session?.userId;

      try {
        const id = req.params['id'];
        const { editPrompt } = req.body;
        if (typeof id !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Generation ID is required',
          });
        }

        // Validate input
        if (!editPrompt || editPrompt.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Edit prompt is required',
          });
        }

        // Load the parent generation to validate it exists and supports editing
        const parentGeneration = await storage.getGenerationById(id);

        if (!parentGeneration) {
          return res.status(404).json({
            success: false,
            error: 'Generation not found',
          });
        }

        // Check if this generation supports editing
        if (!parentGeneration.conversationHistory) {
          return res.status(400).json({
            success: false,
            error: 'This generation does not support editing. It was created before the edit feature was available.',
          });
        }

        // Create a new generation record for the edit (status: pending)
        const newGeneration = await storage.saveGeneration({
          userId: userId || undefined,
          prompt: parentGeneration.prompt,
          editPrompt: editPrompt.trim(),
          generatedImagePath: parentGeneration.generatedImagePath, // Placeholder, will be updated by worker
          conversationHistory: parentGeneration.conversationHistory,
          parentGenerationId: parentGeneration.id,
          originalImagePaths: parentGeneration.originalImagePaths,
          resolution: parentGeneration.resolution || '2K',
          status: 'pending',
        });

        logger.info(
          { module: 'Edit', generationId: newGeneration.id, parentId: id },
          'Created pending generation for async edit',
        );

        // Enqueue job for background processing
        const editJobName = JobType.EDIT as Parameters<typeof generationQueue.add>[0];
        const editJobData: EditJobData = {
          jobType: JobType.EDIT,
          userId: typeof userId === 'string' && userId.length > 0 ? userId : 'anonymous',
          generationId: newGeneration.id,
          editPrompt: String(editPrompt).trim(),
          originalImageUrl: parentGeneration.generatedImagePath,
          createdAt: new Date().toISOString(),
        };
        const job = await generationQueue.add(editJobName, editJobData as Parameters<typeof generationQueue.add>[1]);

        logger.info({ module: 'Edit', jobId: job.id, generationId: newGeneration.id }, 'Edit job enqueued');

        // Return immediately with job info - client should poll for status
        return res.json({
          success: true,
          generationId: newGeneration.id,
          jobId: job.id,
          status: 'pending',
          message: 'Edit job started. Poll /api/jobs/:jobId for status.',
          parentId: parentGeneration.id,
        });
      } catch (err: unknown) {
        logger.error({ module: 'Edit', err }, 'Edit enqueue error');

        telemetry.trackError({
          endpoint: '/api/generations/:id/edit',
          errorType: err instanceof Error ? err.name : 'unknown',
          statusCode: 500,
          userId,
        });

        return res.status(500).json({
          success: false,
          error: 'Failed to start edit job',
        });
      }
    }),
  );

  /**
   * POST /:id/analyze - Analyze generation with AI
   */
  router.post(
    '/:id/analyze',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const id = req.params['id'];
        const { question } = req.body;
        if (typeof id !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Generation ID is required',
          });
        }

        if (!question || question.trim().length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Question is required',
          });
        }

        const generation = await storage.getGenerationById(id);
        if (!generation) {
          return res.status(404).json({
            success: false,
            error: 'Generation not found',
          });
        }

        logger.info({ module: 'Analyze', generationId: id, question }, 'Analyzing generation');

        // Helper to get MIME type from file path
        const getMimeType = (filePath: string): string => {
          const ext = filePath.toLowerCase().split('.').pop();
          const mimeTypes: Record<string, string> = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            gif: 'image/gif',
            webp: 'image/webp',
          };
          return mimeTypes[ext || ''] || 'image/png';
        };

        // Load original images as base64
        const fs = await import('fs/promises');
        const pathModule = await import('path');

        const originalImages: { data: string; mimeType: string }[] = [];
        for (const imagePath of generation.originalImagePaths) {
          try {
            const isUrl = imagePath.startsWith('http://') || imagePath.startsWith('https://');
            if (isUrl) {
              // Fetch image from URL and convert to base64
              const response = await fetch(imagePath);
              const arrayBuffer = await response.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString('base64');
              const mimeType = response.headers.get('content-type') || getMimeType(imagePath);
              originalImages.push({ data: base64, mimeType });
            } else {
              // Load from file system
              const fullPath = pathModule.join(process.cwd(), imagePath);
              const buffer = await fs.readFile(fullPath);
              const base64 = buffer.toString('base64');
              originalImages.push({ data: base64, mimeType: getMimeType(imagePath) });
            }
          } catch (err: unknown) {
            logger.warn({ module: 'Analyze', imagePath, err }, 'Failed to load original image');
          }
        }

        // Load generated image
        let generatedImage: { data: string; mimeType: string } | null = null;
        const genPath = generation.generatedImagePath;
        if (genPath) {
          try {
            const isUrl = genPath.startsWith('http://') || genPath.startsWith('https://');
            if (isUrl) {
              const response = await fetch(genPath);
              const arrayBuffer = await response.arrayBuffer();
              const base64 = Buffer.from(arrayBuffer).toString('base64');
              const mimeType = response.headers.get('content-type') || getMimeType(genPath);
              generatedImage = { data: base64, mimeType };
            } else {
              const fullPath = pathModule.join(process.cwd(), genPath);
              const buffer = await fs.readFile(fullPath);
              const base64 = buffer.toString('base64');
              generatedImage = { data: base64, mimeType: getMimeType(genPath) };
            }
          } catch (err: unknown) {
            logger.warn({ module: 'Analyze', genPath, err }, 'Failed to load generated image');
          }
        }

        // Build multimodal prompt
        const parts: Part[] = [
          {
            text: `You are an AI assistant analyzing an image transformation.

Original prompt: "${generation.prompt}"
${generation.editPrompt ? `Edit prompt: "${generation.editPrompt}"` : ''}

User's question: "${question}"

Please analyze the transformation and answer the user's question.`,
          },
        ];

        // Add original images
        for (const img of originalImages) {
          parts.push({
            inlineData: {
              mimeType: img.mimeType,
              data: img.data,
            },
          });
          parts.push({ text: '[Original image]' });
        }

        // Add generated image
        if (generatedImage) {
          parts.push({
            inlineData: {
              mimeType: generatedImage.mimeType,
              data: generatedImage.data,
            },
          });
          parts.push({ text: '[Generated/transformed image]' });
        }

        const result = await getGlobalGeminiClient().models.generateContent({
          model: 'gemini-3-flash',
          contents: [{ role: 'user', parts }],
        });
        const answer = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!answer) {
          return res.status(500).json({
            success: false,
            error: 'AI did not return a response',
          });
        }

        res.json({
          success: true,
          answer,
          generationId: id,
          question,
        });
      } catch (err: unknown) {
        logger.error({ module: 'Analyze', err }, 'Analyze error');
        return res.status(500).json({
          success: false,
          error: 'Failed to analyze image',
        });
      }
    }),
  );

  /**
   * POST /video - Generate a video (async via BullMQ + Veo)
   * Returns immediately with jobId, client polls /api/jobs/:jobId for status
   */
  router.post(
    '/video',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.session?.userId;

      try {
        const { prompt, duration, aspectRatio, videoResolution, sourceImageUrl } = req.body;
        const promptText = typeof prompt === 'string' ? prompt.trim() : '';

        if (!promptText) {
          return res.status(400).json({ error: 'Prompt is required for video generation' });
        }

        // Validate duration
        const validDurations = ['4', '6', '8'] as const;
        const durationValue = typeof duration === 'string' ? duration : '';
        const finalDuration = (validDurations as readonly string[]).includes(durationValue)
          ? (durationValue as (typeof validDurations)[number])
          : '8';

        // Validate aspect ratio
        const validAspectRatios = ['16:9', '9:16'] as const;
        const aspectRatioValue = typeof aspectRatio === 'string' ? aspectRatio : '';
        const finalAspectRatio = (validAspectRatios as readonly string[]).includes(aspectRatioValue)
          ? (aspectRatioValue as (typeof validAspectRatios)[number])
          : '16:9';

        // Validate resolution
        const validResolutions = ['720p', '1080p', '4k'] as const;
        const resolutionValue = typeof videoResolution === 'string' ? videoResolution : '';
        const finalResolution = (validResolutions as readonly string[]).includes(resolutionValue)
          ? (resolutionValue as (typeof validResolutions)[number])
          : '720p';
        const normalizedSourceImageUrl =
          typeof sourceImageUrl === 'string' && sourceImageUrl.length > 0 ? sourceImageUrl : undefined;

        // Create generation record (status: pending, mediaType: video)
        const generation = await storage.saveGeneration({
          userId: userId || undefined,
          prompt: promptText,
          generatedImagePath: '', // Placeholder — updated by worker
          originalImagePaths: normalizedSourceImageUrl ? [normalizedSourceImageUrl] : [],
          resolution: finalResolution,
          status: 'pending',
          mediaType: 'video',
          videoDurationSec: parseInt(finalDuration, 10),
        });

        // Enqueue video generation job with longer timeout
        const videoJobName = JobType.GENERATE_VIDEO as Parameters<typeof generationQueue.add>[0];
        const videoJobData: VideoGenerateJobData = {
          jobType: JobType.GENERATE_VIDEO,
          userId: typeof userId === 'string' && userId.length > 0 ? userId : 'anonymous',
          generationId: generation.id,
          prompt: promptText,
          duration: finalDuration,
          aspectRatio: finalAspectRatio,
          videoResolution: finalResolution,
          ...(normalizedSourceImageUrl ? { sourceImageUrl: normalizedSourceImageUrl } : {}),
          createdAt: new Date().toISOString(),
        };
        const job = await generationQueue.add(videoJobName, videoJobData as Parameters<typeof generationQueue.add>[1], {
          ...VIDEO_JOB_OPTIONS,
        });

        logger.info({ jobId: job.id, generationId: generation.id }, 'Video generation job enqueued');

        return res.json({
          success: true,
          generationId: generation.id,
          jobId: job.id,
          status: 'pending',
          mediaType: 'video',
          message: 'Video generation started. Poll /api/jobs/:jobId for status. This typically takes 2-10 minutes.',
        });
      } catch (err: unknown) {
        logger.error({ module: 'VideoGeneration', err }, 'Video generation enqueue error');
        return res.status(500).json({ error: 'Failed to start video generation' });
      }
    }),
  );

  return router;
};

/**
 * Jobs Router - Separate but related to generations
 * Handles job status and SSE streaming
 */
export const jobsRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger, generationQueue, generationQueueEvents } = ctx.services;
  const { requireAuth } = ctx.middleware;

  /**
   * GET /:jobId - Get job status
   */
  router.get(
    '/:jobId',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const jobId = req.params['jobId'];
        if (typeof jobId !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Job ID is required',
          });
        }

        const job = await generationQueue.getJob(jobId);

        if (!job) {
          return res.status(404).json({
            success: false,
            error: 'Job not found',
          });
        }

        const state = await job.getState();
        const progress = job.progress;

        // Get the generation record if available
        let generation = null;
        if (job.data.generationId) {
          generation = await storage.getGenerationById(String(job.data.generationId));
        }

        return res.json({
          success: true,
          jobId: job.id,
          state, // 'waiting', 'active', 'completed', 'failed', 'delayed'
          progress, // { stage, percentage, message }
          data: {
            jobType: job.data.jobType,
            generationId: job.data.generationId,
            createdAt: job.data.createdAt,
          },
          returnvalue: job.returnvalue, // Result when completed
          failedReason: job.failedReason, // Error when failed
          // Include generation data if available and completed
          generation: generation
            ? {
                id: generation.id,
                status: generation.status,
                generatedImagePath: generation.generatedImagePath,
                imageUrl: generation.generatedImagePath?.startsWith('http')
                  ? generation.generatedImagePath
                  : generation.generatedImagePath
                    ? `/${generation.generatedImagePath.replace(/\\/g, '/')}`
                    : null,
              }
            : null,
        });
      } catch (err: unknown) {
        logger.error({ module: 'JobStatus', err }, 'Error getting job status');
        return res.status(500).json({
          success: false,
          error: 'Failed to get job status',
        });
      }
    }),
  );

  /**
   * GET /:jobId/stream - SSE endpoint for real-time job status updates
   */
  router.get(
    '/:jobId/stream',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const jobId = req.params['jobId'];
      if (typeof jobId !== 'string') {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Job ID is required' })}\n\n`);
        return res.end();
      }

      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Send initial status
      const job = await generationQueue.getJob(jobId);
      if (!job) {
        res.write(`data: ${JSON.stringify({ type: 'error', message: 'Job not found' })}\n\n`);
        return res.end();
      }

      const state = await job.getState();
      const progress = job.progress as JobProgress | undefined;
      res.write(
        `data: ${JSON.stringify({
          type: 'status',
          state,
          progress: progress || { percentage: 0 },
        })}\n\n`,
      );

      // If job is already completed or failed, send final state and close
      if (state === 'completed') {
        res.write(
          `data: ${JSON.stringify({
            type: 'completed',
            result: job.returnvalue,
          })}\n\n`,
        );
        return res.end();
      }

      if (state === 'failed') {
        res.write(
          `data: ${JSON.stringify({
            type: 'failed',
            error: job.failedReason || 'Unknown error',
          })}\n\n`,
        );
        return res.end();
      }

      // Listen for job events
      const progressListener = ({ jobId: eventJobId, data }: { jobId: string; data: JobProgress }) => {
        if (eventJobId === jobId) {
          res.write(`data: ${JSON.stringify({ type: 'progress', progress: data })}\n\n`);
        }
      };

      const completedListener = ({ jobId: eventJobId, returnvalue }: { jobId: string; returnvalue: unknown }) => {
        if (eventJobId === jobId) {
          res.write(
            `data: ${JSON.stringify({
              type: 'completed',
              result: returnvalue,
            })}\n\n`,
          );
          cleanup();
          res.end();
        }
      };

      const failedListener = ({ jobId: eventJobId, failedReason }: { jobId: string; failedReason: string }) => {
        if (eventJobId === jobId) {
          res.write(
            `data: ${JSON.stringify({
              type: 'failed',
              error: failedReason,
            })}\n\n`,
          );
          cleanup();
          res.end();
        }
      };

      // Cleanup function to remove all listeners
      const cleanup = () => {
        generationQueueEvents.off('progress', progressListener as (...args: unknown[]) => void);
        generationQueueEvents.off('completed', completedListener as (...args: unknown[]) => void);
        generationQueueEvents.off('failed', failedListener as (...args: unknown[]) => void);
      };

      generationQueueEvents.on('progress', progressListener as (...args: unknown[]) => void);
      generationQueueEvents.on('completed', completedListener as (...args: unknown[]) => void);
      generationQueueEvents.on('failed', failedListener as (...args: unknown[]) => void);

      // Cleanup on connection close (client disconnects)
      req.on('close', () => {
        logger.debug({ module: 'SSE', jobId }, 'Client disconnected from SSE stream');
        cleanup();
      });
    }),
  );

  return router;
};

export const generationsRouterModule: RouterModule = {
  prefix: '/api/generations',
  factory: generationsRouter,
  description: 'Generation CRUD, editing, analysis, and video generation',
  endpointCount: 7,
  requiresAuth: false, // Mixed
  tags: ['generations', 'ai', 'images'],
};

export const jobsRouterModule: RouterModule = {
  prefix: '/api/jobs',
  factory: jobsRouter,
  description: 'Job status and SSE streaming for async operations',
  endpointCount: 2,
  requiresAuth: false, // Status is public, stream requires auth
  tags: ['jobs', 'queue', 'sse'],
};

/**
 * Transform Router
 * Image transformation and text-only generation
 * Mounted at /api prefix to preserve /api/transform path
 */
export const transformRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger, telemetry } = ctx.services;
  const { requireAuth } = ctx.middleware;

  router.post(
    '/transform',
    ctx.middleware.extendedTimeout,
    ctx.middleware.haltOnTimeout,
    requireAuth,
    ctx.uploads.array('images', 6),
    promptInjectionGuard,
    asyncHandler(async (req: Request, res: Response) => {
      const startTime = Date.now();
      const userId = req.user?.id;
      let success = false;
      let errorType: string | undefined;
      let totalImageCount = 0;

      try {
        const files = Array.isArray(req.files) ? (req.files as Express.Multer.File[]) : [];
        const { prompt, resolution, mode, templateId, templateReferenceUrls, recipe: recipeJson } = req.body;

        if (typeof prompt !== 'string' || prompt.trim().length === 0) {
          return res.status(400).json({ error: 'No prompt provided' });
        }

        const parseStringArray = (value: unknown): string[] => {
          if (Array.isArray(value)) {
            return value.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
          }
          if (typeof value === 'string') {
            const trimmed = value.trim();
            if (!trimmed) return [];
            try {
              const parsed = JSON.parse(trimmed);
              if (Array.isArray(parsed)) {
                return parsed.filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
              }
            } catch {
              // Fall through to single-string interpretation.
            }
            return [trimmed];
          }
          return [];
        };

        let recipe: Record<string, unknown> | undefined;
        if (recipeJson) {
          try {
            const parsed: unknown = typeof recipeJson === 'string' ? JSON.parse(recipeJson) : recipeJson;
            if (parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)) {
              recipe = parsed as Record<string, unknown>;
            }
          } catch {
            logger.warn({ module: 'Transform' }, 'Failed to parse recipe JSON');
          }
        }

        const parsedProductIds = parseStringArray(req.body.productIds).slice(0, 6);

        const generationMode = mode || 'standard';
        const validModes = ['standard', 'exact_insert', 'inspiration'];
        if (!validModes.includes(generationMode)) {
          return res.status(400).json({ error: `Invalid mode. Must be one of: ${validModes.join(', ')}` });
        }

        if ((generationMode === 'exact_insert' || generationMode === 'inspiration') && !templateId) {
          return res.status(400).json({ error: `templateId is required for ${generationMode} mode` });
        }

        const { normalizeResolution } = ctx.domainServices.pricingEstimator;
        const selectedResolution = normalizeResolution(resolution) || '2K';
        logger.info(
          {
            module: 'Transform',
            imageCount: files.length,
            productIdsCount: parsedProductIds.length,
            promptPreview: prompt.substring(0, 100),
            mode: generationMode,
          },
          'Processing request',
        );

        const imageInputs = files.map((f: Express.Multer.File) => ({
          buffer: f.buffer,
          mimetype: f.mimetype,
          originalname: f.originalname,
        }));
        const recipeProductsFromIds: Array<{
          id: string;
          name: string;
          category?: string;
          description?: string;
          imageUrls: string[];
        }> = [];

        if (parsedProductIds.length > 0 && imageInputs.length < 6) {
          for (const productId of parsedProductIds) {
            if (imageInputs.length >= 6) break;
            const product = await storage.getProductById(productId);
            if (!product) continue;

            recipeProductsFromIds.push({
              id: String(product.id),
              name: product.name ?? String(product.id),
              ...(product.category ? { category: product.category } : {}),
              ...(product.description ? { description: product.description } : {}),
              imageUrls: product.cloudinaryUrl ? [product.cloudinaryUrl] : [],
            });

            if (!product.cloudinaryUrl) continue;

            let productUrl: URL;
            try {
              productUrl = new URL(product.cloudinaryUrl);
            } catch {
              logger.warn({ module: 'Transform', productId }, 'Invalid product cloudinaryUrl');
              continue;
            }

            const isAllowedHost =
              productUrl.hostname === 'res.cloudinary.com' ||
              productUrl.hostname.endsWith('.cloudinary.com') ||
              productUrl.hostname === 'images.unsplash.com' ||
              productUrl.hostname === 'nextdaysteel.co.uk' ||
              productUrl.hostname.endsWith('.nextdaysteel.co.uk');

            if (productUrl.protocol !== 'https:' || !isAllowedHost) {
              logger.warn(
                { module: 'Transform', productId, hostname: productUrl.hostname },
                'Blocked product image host',
              );
              continue;
            }

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);
            try {
              const response = await fetch(product.cloudinaryUrl, { signal: controller.signal });

              if (!response.ok) {
                logger.warn(
                  { module: 'Transform', productId, status: response.status },
                  'Failed to fetch product image server-side',
                );
                continue;
              }

              const contentType = response.headers.get('content-type') || 'image/jpeg';
              if (!contentType.startsWith('image/')) {
                logger.warn({ module: 'Transform', productId, contentType }, 'Skipped non-image product URL');
                continue;
              }

              const buffer = Buffer.from(await response.arrayBuffer());
              if (!buffer.length) continue;

              const extension = contentType.split('/')[1]?.split(';')[0] || 'jpg';
              imageInputs.push({
                buffer,
                mimetype: contentType,
                originalname: `${String(product.id)}.${extension}`,
              });
            } catch (fetchError) {
              logger.warn(
                { module: 'Transform', productId, err: fetchError },
                'Server-side fetch failed for product image',
              );
            } finally {
              clearTimeout(timeoutId);
            }
          }
        }

        totalImageCount = imageInputs.length;

        type GenRecipe = import('@shared/types/ideaBank').GenerationRecipe;
        const parsedRecipe = recipe;
        const effectiveRecipe =
          recipeProductsFromIds.length > 0 &&
          (!Array.isArray(parsedRecipe?.['products']) || parsedRecipe['products'].length === 0)
            ? ({
                version: '1.0',
                products: recipeProductsFromIds,
                relationships: Array.isArray(parsedRecipe?.['relationships']) ? parsedRecipe['relationships'] : [],
                scenarios: Array.isArray(parsedRecipe?.['scenarios']) ? parsedRecipe['scenarios'] : [],
                ...(parsedRecipe?.['template'] ? { template: parsedRecipe['template'] } : {}),
                ...(Array.isArray(parsedRecipe?.['brandImages']) ? { brandImages: parsedRecipe['brandImages'] } : {}),
                ...(parsedRecipe?.['brandVoice'] ? { brandVoice: parsedRecipe['brandVoice'] } : {}),
                ...(parsedRecipe?.['debugContext'] ? { debugContext: parsedRecipe['debugContext'] } : {}),
              } as GenRecipe)
            : (parsedRecipe as GenRecipe | undefined);

        let parsedTemplateReferenceUrls: string[] | undefined;
        if (templateReferenceUrls) {
          try {
            parsedTemplateReferenceUrls =
              typeof templateReferenceUrls === 'string' ? JSON.parse(templateReferenceUrls) : templateReferenceUrls;
          } catch {
            parsedTemplateReferenceUrls = Array.isArray(templateReferenceUrls)
              ? templateReferenceUrls
              : [templateReferenceUrls];
          }
        }

        const { executeGenerationPipeline } = await import('../services/generation');
        const pipelineResult = await executeGenerationPipeline({
          prompt,
          mode: generationMode as 'standard' | 'exact_insert' | 'inspiration',
          images: imageInputs,
          resolution: selectedResolution as '1K' | '2K' | '4K',
          userId: userId ?? 'anonymous',
          ...(templateId ? { templateId } : {}),
          ...(parsedTemplateReferenceUrls ? { templateReferenceUrls: parsedTemplateReferenceUrls } : {}),
          ...(effectiveRecipe ? { recipe: effectiveRecipe } : {}),
          ...(req.body.styleReferenceIds ? { styleReferenceIds: req.body.styleReferenceIds } : {}),
          ...(req.body.aspectRatio ? { aspectRatio: req.body.aspectRatio } : {}),
          ...(parsedProductIds.length > 0 ? { productIds: parsedProductIds } : {}),
        });

        success = true;

        res.json({
          success: true,
          imageUrl: pipelineResult.imageUrl,
          generationId: pipelineResult.generationId,
          prompt: pipelineResult.prompt,
          canEdit: pipelineResult.canEdit,
          mode: pipelineResult.mode,
          templateId: pipelineResult.templateId || null,
          stagesCompleted: pipelineResult.stagesCompleted,
        });
      } catch (err: unknown) {
        logger.error({ module: 'Transform', err }, 'Transform error');
        const errName = err instanceof Error ? err.name : 'unknown';
        const errMessage = err instanceof Error ? err.message : String(err);
        errorType = errorType || errName;

        if (err instanceof Error && err.name === 'PreGenGateError') {
          const gateErr = err as Error & { score?: number; suggestions?: string[]; breakdown?: unknown };
          telemetry.trackError({
            endpoint: '/api/transform',
            errorType: 'pre_gen_gate_blocked',
            statusCode: 400,
            ...(userId != null && { userId }),
          });

          return res.status(400).json({
            error: 'Generation request does not meet quality threshold',
            details: errMessage,
            score: gateErr.score,
            suggestions: gateErr.suggestions,
            breakdown: gateErr.breakdown,
          });
        }

        telemetry.trackError({
          endpoint: '/api/transform',
          errorType: errorType || 'unknown',
          statusCode: 500,
          ...(userId != null && { userId }),
        });

        res.status(500).json({
          error: 'Failed to transform image',
          details: errMessage,
        });
      } finally {
        const durationMs = Date.now() - startTime;
        const inputTokensEstimate = Math.ceil((req.body.prompt?.length || 0) * 0.25);

        telemetry.trackGeminiUsage({
          model: 'gemini-3-pro-image-preview',
          operation: 'generate',
          inputTokens: inputTokensEstimate,
          outputTokens: 0,
          durationMs,
          success,
          ...(userId != null && { userId }),
          ...(errorType != null && { errorType }),
        });

        const { quotaMonitoring } = ctx.domainServices;
        try {
          await quotaMonitoring.trackApiCall({
            brandId: userId || 'anonymous',
            operation: 'generate',
            model: 'gemini-3-pro-image-preview',
            success,
            durationMs,
            inputTokens: inputTokensEstimate,
            outputTokens: 0,
            costMicros: success
              ? ctx.domainServices.pricingEstimator.estimateGenerationCostMicros({
                  resolution: req.body.resolution || '2K',
                  inputImagesCount: totalImageCount,
                  promptChars: String(req.body.prompt || '').length,
                }).estimatedCostMicros
              : 0,
            ...(errorType != null && { errorType }),
            isRateLimited: errorType === 'RESOURCE_EXHAUSTED' || errorType === 'rate_limit',
          });
        } catch (trackError) {
          logger.warn({ module: 'Transform', err: trackError }, 'Failed to track quota');
        }
      }
    }),
  );

  return router;
};

export const transformRouterModule: RouterModule = {
  prefix: '/api',
  factory: transformRouter,
  description: 'Image transformation and generation pipeline',
  endpointCount: 1,
  requiresAuth: true,
  tags: ['generations', 'ai', 'images', 'transform'],
};
