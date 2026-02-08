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
import { JobType, JobProgress } from '../jobs/types';

export const generationsRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger, generationQueue, generationQueueEvents, genAIText, telemetry } = ctx.services;
  const { requireAuth } = ctx.middleware;
  const { toGenerationDTO, toGenerationDTOArray, deleteFile } = ctx.utils;

  /**
   * GET / - List all generations
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const allGenerations = await storage.getGenerations(limit);
      res.json(toGenerationDTOArray(allGenerations));
    } catch (error: any) {
      logger.error({ module: 'Generations', err: error }, 'Error fetching generations');
      res.status(500).json({ error: 'Failed to fetch generations' });
    }
  }));

  /**
   * GET /:id - Get single generation by ID
   */
  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    try {
      const generation = await storage.getGenerationById(req.params.id);
      if (!generation) {
        return res.status(404).json({ error: 'Generation not found' });
      }
      res.json(toGenerationDTO(generation));
    } catch (error: any) {
      logger.error({ module: 'Generation', err: error }, 'Error fetching generation');
      res.status(500).json({ error: 'Failed to fetch generation' });
    }
  }));

  /**
   * GET /:id/history - Get edit history for a generation
   */
  router.get('/:id/history', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      const generation = await storage.getGenerationById(id);
      if (!generation) {
        return res.status(404).json({ error: 'Generation not found' });
      }

      // Get full edit chain
      const history = await storage.getEditHistory(id);

      res.json({
        current: generation,
        history: history,
        totalEdits: history.length - 1 // Subtract 1 because the original is included
      });
    } catch (error: any) {
      logger.error({ module: 'GenerationHistory', err: error }, 'Error fetching generation history');
      res.status(500).json({ error: 'Failed to fetch generation history' });
    }
  }));

  /**
   * DELETE /:id - Delete generation
   */
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    try {
      const generation = await storage.getGenerationById(req.params.id);
      if (!generation) {
        return res.status(404).json({ error: 'Generation not found' });
      }

      // Delete files from disk
      await deleteFile(generation.generatedImagePath);
      for (const originalPath of generation.originalImagePaths) {
        await deleteFile(originalPath);
      }

      // Delete from database
      await storage.deleteGeneration(req.params.id);

      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'DeleteGeneration', err: error }, 'Error deleting generation');
      res.status(500).json({ error: 'Failed to delete generation' });
    }
  }));

  /**
   * POST /:id/edit - Edit generation (async via BullMQ)
   * Returns immediately with jobId, client polls /api/jobs/:jobId for status
   */
  router.post('/:id/edit', asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).session?.userId;

    try {
      const { id } = req.params;
      const { editPrompt } = req.body;
      const generationId = id;

      // Validate input
      if (!editPrompt || editPrompt.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Edit prompt is required'
        });
      }

      // Load the parent generation to validate it exists and supports editing
      const parentGeneration = await storage.getGenerationById(id);

      if (!parentGeneration) {
        return res.status(404).json({
          success: false,
          error: 'Generation not found'
        });
      }

      // Check if this generation supports editing
      if (!parentGeneration.conversationHistory) {
        return res.status(400).json({
          success: false,
          error: 'This generation does not support editing. It was created before the edit feature was available.'
        });
      }

      // Create a new generation record for the edit (status: pending)
      const newGeneration = await storage.saveGeneration({
        prompt: parentGeneration.prompt,
        editPrompt: editPrompt.trim(),
        generatedImagePath: parentGeneration.generatedImagePath, // Placeholder, will be updated by worker
        conversationHistory: parentGeneration.conversationHistory,
        parentGenerationId: parentGeneration.id,
        originalImagePaths: parentGeneration.originalImagePaths,
        resolution: parentGeneration.resolution || '2K',
        status: 'pending',
      });

      logger.info({ module: 'Edit', generationId: newGeneration.id, parentId: id }, 'Created pending generation for async edit');

      // Enqueue job for background processing
      const job = await generationQueue.add('edit-generation', {
        jobType: JobType.EDIT,
        userId: userId || 'anonymous',
        generationId: parseInt(newGeneration.id, 10),
        editPrompt: editPrompt.trim(),
        originalImageUrl: parentGeneration.generatedImagePath,
        createdAt: new Date().toISOString(),
      });

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

    } catch (error: any) {
      logger.error({ module: 'Edit', err: error }, 'Edit enqueue error');

      telemetry.trackError({
        endpoint: '/api/generations/:id/edit',
        errorType: error.name || 'unknown',
        statusCode: 500,
        userId,
      });

      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to start edit job'
      });
    }
  }));

  /**
   * POST /:id/analyze - Analyze generation with AI
   */
  router.post('/:id/analyze', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { question } = req.body;

      if (!question || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Question is required'
        });
      }

      const generation = await storage.getGenerationById(id);
      if (!generation) {
        return res.status(404).json({
          success: false,
          error: 'Generation not found'
        });
      }

      logger.info({ module: 'Analyze', generationId: id, question }, 'Analyzing generation');

      // Helper to get MIME type from file path
      const getMimeType = (filePath: string): string => {
        const ext = filePath.toLowerCase().split('.').pop();
        const mimeTypes: Record<string, string> = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
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
        } catch (err: any) {
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
        } catch (err: any) {
          logger.warn({ module: 'Analyze', genPath, err }, 'Failed to load generated image');
        }
      }

      // Build multimodal prompt
      const model = genAIText.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      const parts: any[] = [
        {
          text: `You are an AI assistant analyzing an image transformation.

Original prompt: "${generation.prompt}"
${generation.editPrompt ? `Edit prompt: "${generation.editPrompt}"` : ''}

User's question: "${question}"

Please analyze the transformation and answer the user's question.`
        }
      ];

      // Add original images
      for (const img of originalImages) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data
          }
        });
        parts.push({ text: '[Original image]' });
      }

      // Add generated image
      if (generatedImage) {
        parts.push({
          inlineData: {
            mimeType: generatedImage.mimeType,
            data: generatedImage.data
          }
        });
        parts.push({ text: '[Generated/transformed image]' });
      }

      const result = await model.generateContent(parts);
      const response = await result.response;
      const answer = response.text();

      res.json({
        success: true,
        answer,
        generationId: id,
        question
      });

    } catch (error: any) {
      logger.error({ module: 'Analyze', err: error }, 'Analyze error');
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to analyze image'
      });
    }
  }));

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
  router.get('/:jobId', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;

      const job = await generationQueue.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Job not found'
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
        generation: generation ? {
          id: generation.id,
          status: generation.status,
          generatedImagePath: generation.generatedImagePath,
          imageUrl: generation.generatedImagePath?.startsWith('http')
            ? generation.generatedImagePath
            : generation.generatedImagePath ? `/${generation.generatedImagePath.replace(/\\/g, '/')}` : null,
        } : null,
      });

    } catch (error: any) {
      logger.error({ module: 'JobStatus', err: error }, 'Error getting job status');
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to get job status'
      });
    }
  }));

  /**
   * GET /:jobId/stream - SSE endpoint for real-time job status updates
   */
  router.get('/:jobId/stream', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    const jobId = req.params.jobId;

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
    res.write(`data: ${JSON.stringify({
      type: 'status',
      state,
      progress: progress || { percentage: 0 }
    })}\n\n`);

    // If job is already completed or failed, send final state and close
    if (state === 'completed') {
      res.write(`data: ${JSON.stringify({
        type: 'completed',
        result: job.returnvalue
      })}\n\n`);
      return res.end();
    }

    if (state === 'failed') {
      res.write(`data: ${JSON.stringify({
        type: 'failed',
        error: job.failedReason || 'Unknown error'
      })}\n\n`);
      return res.end();
    }

    // Listen for job events
    const progressListener = async ({ jobId: eventJobId, data }: { jobId: string; data: JobProgress }) => {
      if (eventJobId === jobId) {
        res.write(`data: ${JSON.stringify({ type: 'progress', progress: data })}\n\n`);
      }
    };

    const completedListener = async ({ jobId: eventJobId, returnvalue }: { jobId: string; returnvalue: any }) => {
      if (eventJobId === jobId) {
        res.write(`data: ${JSON.stringify({
          type: 'completed',
          result: returnvalue
        })}\n\n`);
        cleanup();
        res.end();
      }
    };

    const failedListener = async ({ jobId: eventJobId, failedReason }: { jobId: string; failedReason: string }) => {
      if (eventJobId === jobId) {
        res.write(`data: ${JSON.stringify({
          type: 'failed',
          error: failedReason
        })}\n\n`);
        cleanup();
        res.end();
      }
    };

    // Cleanup function to remove all listeners
    const cleanup = () => {
      generationQueueEvents.off('progress', progressListener);
      generationQueueEvents.off('completed', completedListener);
      generationQueueEvents.off('failed', failedListener);
    };

    generationQueueEvents.on('progress', progressListener);
    generationQueueEvents.on('completed', completedListener);
    generationQueueEvents.on('failed', failedListener);

    // Cleanup on connection close (client disconnects)
    req.on('close', () => {
      logger.debug({ module: 'SSE', jobId }, 'Client disconnected from SSE stream');
      cleanup();
    });
  }));

  return router;
};

export const generationsRouterModule: RouterModule = {
  prefix: '/api/generations',
  factory: generationsRouter,
  description: 'Generation CRUD, editing, and analysis',
  endpointCount: 6,
  requiresAuth: false, // Mixed
  tags: ['generations', 'ai', 'images']
};

export const jobsRouterModule: RouterModule = {
  prefix: '/api/jobs',
  factory: jobsRouter,
  description: 'Job status and SSE streaming for async operations',
  endpointCount: 2,
  requiresAuth: false, // Status is public, stream requires auth
  tags: ['jobs', 'queue', 'sse']
};
