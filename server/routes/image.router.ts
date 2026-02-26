/**
 * Image Router
 * Image analysis endpoints (standalone, not product-specific)
 *
 * Endpoints:
 * - POST /api/analyze-image - Analyze an uploaded image with vision AI
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const imageRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { requireAuth } = ctx.middleware;
  const { single: uploadSingle } = ctx.uploads;

  /**
   * POST /analyze-image - Analyze an uploaded image
   * Standalone image analysis, not tied to a product
   */
  router.post(
    '/analyze-image',
    requireAuth,
    uploadSingle('image'),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId || 'system-user';
        const file = req.file;

        if (!file) {
          return res.status(400).json({ error: 'No image file provided' });
        }

        // Validate file type
        if (!file.mimetype.startsWith('image/')) {
          return res.status(400).json({ error: 'File must be an image' });
        }

        const { visionAnalysisService } = await import('../services/visionAnalysisService');
        const result = await visionAnalysisService.analyzeArbitraryImage(file.buffer, file.mimetype, userId);

        if (!result.success) {
          if (result.error.code === 'RATE_LIMITED') {
            return res.status(429).json({ error: result.error.message });
          }
          return res.status(500).json({ error: result.error.message });
        }

        res.json({
          description: result.analysis.description,
          confidence: result.analysis.confidence,
        });
      } catch (err: unknown) {
        logger.error({ module: 'AnalyzeImage', err }, 'Error analyzing image');
        res.status(500).json({ error: 'Failed to analyze image' });
      }
    }),
  );

  return router;
};

export const imageRouterModule: RouterModule = {
  prefix: '/api',
  factory: imageRouter,
  description: 'Standalone image analysis',
  endpointCount: 1,
  requiresAuth: false,
  tags: ['vision', 'image', 'analysis'],
};
