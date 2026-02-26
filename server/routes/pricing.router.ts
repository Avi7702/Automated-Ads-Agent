/**
 * Pricing Router
 * Adaptive pricing estimation based on generation history
 *
 * Endpoints:
 * - GET /api/pricing/estimate - Get adaptive cost estimate
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const pricingRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { pricingEstimator } = ctx.domainServices;

  /**
   * GET /estimate - Adaptive cost estimate based on generation history
   */
  router.get(
    '/estimate',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const brandId = req.session?.userId || 'anonymous';

        const resolution = pricingEstimator.normalizeResolution(String(req.query['resolution'] ?? '')) || '2K';
        const operation = (req.query['operation'] === 'edit' ? 'edit' : 'generate') as 'generate' | 'edit';
        const inputImagesCount = Math.max(
          0,
          Math.min(6, parseInt(String(req.query['inputImagesCount'] ?? '0'), 10) || 0),
        );
        const promptChars = Math.max(0, Math.min(20000, parseInt(String(req.query['promptChars'] ?? '0'), 10) || 0));

        const prior = pricingEstimator.estimateGenerationCostMicros({
          resolution,
          inputImagesCount,
          promptChars,
        });

        const rows = await storage.getGenerationUsageRows({
          brandId,
          operation,
          resolution,
          inputImagesCount,
          limit: 300,
        });

        const estimate = pricingEstimator.computeAdaptiveEstimate({
          rows,
          priorMeanMicros: prior.estimatedCostMicros,
          priorStrength: 10,
          halfLifeDays: 7,
        });

        const microsToUsd = (micros: number) => Math.round(micros) / 1_000_000;

        res.json({
          currency: 'USD',
          estimatedCost: microsToUsd(estimate.estimatedCostMicros),
          p50: microsToUsd(estimate.p50Micros),
          p90: microsToUsd(estimate.p90Micros),
          sampleCount: estimate.sampleCount,
          effectiveSampleCount: estimate.effectiveSampleCount,
          lastUpdatedAt: estimate.lastUpdatedAt,
          usedFallback: estimate.usedFallback,
        });
      } catch (err: unknown) {
        logger.error({ module: 'PricingEstimate', err }, 'Failed to estimate price');
        res.status(500).json({ error: 'Failed to estimate price' });
      }
    }),
  );

  return router;
};

export const pricingRouterModule: RouterModule = {
  prefix: '/api/pricing',
  factory: pricingRouter,
  description: 'Adaptive pricing estimation based on generation history',
  endpointCount: 1,
  requiresAuth: false,
  tags: ['pricing', 'estimation'],
};
