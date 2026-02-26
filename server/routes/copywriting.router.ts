/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Copywriting Router
 * Standalone copywriting generation endpoint
 *
 * Endpoints:
 * - POST /api/copywriting/standalone - Generate standalone ad copy
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const copywritingRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  /**
   * POST /standalone - Generate standalone ad copy without a linked generation
   */
  router.post(
    '/standalone',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const {
          platform = 'linkedin',
          tone = 'authentic',
          framework = 'auto',
          campaignObjective = 'engagement',
          productName,
          productDescription,
          variations = 3,
          industry = 'general',
        } = req.body;

        // Validate required fields
        if (!productName || !productDescription) {
          return res.status(400).json({
            error: 'Missing required fields',
            details: 'productName and productDescription are required',
          });
        }

        // Validate variations
        const variationCount = Math.min(Math.max(parseInt(variations) || 3, 1), 5);

        // Call copywriting service
        const { copywritingService } = await import('../services/copywritingService');
        const generatedVariations = await copywritingService.generateCopy({
          platform,
          tone,
          framework,
          campaignObjective,
          productName,
          productDescription,
          industry,
          variations: variationCount,
          // Provide defaults for fields that copywritingService expects
          productBenefits: [],
          uniqueValueProp: productDescription,
        } as unknown as Parameters<typeof copywritingService.generateCopy>[0]);

        // Transform to simplified response format
        const responseVariations = generatedVariations.map((v) => ({
          copy: v.caption || v.bodyText || '',
          headline: v.headline,
          hook: v.hook,
          hashtags: v.hashtags || [],
          framework: v.framework,
          cta: v.cta,
        }));

        res.json({
          success: true,
          variations: responseVariations,
        });
      } catch (err: unknown) {
        logger.error({ module: 'StandaloneCopy', err }, 'Error generating standalone copy');
        res.status(500).json({
          error: 'Failed to generate copy',
        });
      }
    }),
  );

  return router;
};

export const copywritingRouterModule: RouterModule = {
  prefix: '/api/copywriting',
  factory: copywritingRouter,
  description: 'Standalone copywriting generation',
  endpointCount: 1,
  requiresAuth: false,
  tags: ['copywriting', 'ai', 'content'],
};
