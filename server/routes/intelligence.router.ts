/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Intelligence Router (WS-C5)
 * Product intelligence layer — priorities, business intelligence, and selection
 *
 * Endpoints:
 * - GET /api/intelligence/priorities — Get user's product priorities
 * - PUT /api/intelligence/priorities/:productId — Set priority for one product
 * - POST /api/intelligence/priorities/bulk — Batch set priorities (from onboarding)
 * - GET /api/intelligence/business — Get business intelligence
 * - PUT /api/intelligence/business — Save/update business intelligence
 * - GET /api/intelligence/onboarding-status — Check if onboarding complete
 * - GET /api/intelligence/stats — Get posting stats per product
 * - POST /api/intelligence/select — Select products for weekly plan
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const intelligenceRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  /**
   * GET /priorities — Get all product priorities for the current user
   */
  router.get(
    '/priorities',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const { productIntelligenceService } = await import('../services/productIntelligenceService');
        const priorities = await productIntelligenceService.getProductPriorities(userId);
        res.json({ priorities });
      } catch (error: any) {
        logger.error({ module: 'Intelligence', err: error }, 'Failed to get priorities');
        res.status(500).json({ error: 'Failed to get product priorities' });
      }
    }),
  );

  /**
   * PUT /priorities/:productId — Set priority for one product
   */
  router.put(
    '/priorities/:productId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const productId = req.params['productId'] as string;
        const { revenueTier, revenueWeight, competitiveAngle, keySellingPoints, monthlyTarget, seasonalRelevance } =
          req.body;

        const { productIntelligenceService } = await import('../services/productIntelligenceService');
        const priority = await productIntelligenceService.setProductPriority(userId, productId, {
          revenueTier,
          revenueWeight,
          competitiveAngle,
          keySellingPoints,
          monthlyTarget,
          seasonalRelevance,
        });

        res.json({ priority });
      } catch (error: any) {
        logger.error({ module: 'Intelligence', err: error }, 'Failed to set priority');
        res.status(500).json({ error: 'Failed to set product priority' });
      }
    }),
  );

  /**
   * POST /priorities/bulk — Batch set priorities (from onboarding)
   */
  router.post(
    '/priorities/bulk',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const { priorities } = req.body;

        if (!Array.isArray(priorities) || priorities.length === 0) {
          return res.status(400).json({ error: 'priorities must be a non-empty array' });
        }

        // Validate each entry
        for (const p of priorities) {
          if (!p.productId || typeof p.productId !== 'string') {
            return res.status(400).json({ error: 'Each priority must have a productId string' });
          }
          if (
            p.revenueWeight !== undefined &&
            (typeof p.revenueWeight !== 'number' || p.revenueWeight < 1 || p.revenueWeight > 10)
          ) {
            return res.status(400).json({ error: 'revenueWeight must be a number between 1 and 10' });
          }
        }

        const { productIntelligenceService } = await import('../services/productIntelligenceService');
        await productIntelligenceService.bulkSetPriorities(userId, priorities);

        res.json({ message: 'Priorities updated', count: priorities.length });
      } catch (error: any) {
        logger.error({ module: 'Intelligence', err: error }, 'Failed to bulk set priorities');
        res.status(500).json({ error: 'Failed to bulk set priorities' });
      }
    }),
  );

  /**
   * GET /business — Get business intelligence for the current user
   */
  router.get(
    '/business',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const { productIntelligenceService } = await import('../services/productIntelligenceService');
        const bi = await productIntelligenceService.getBusinessIntelligence(userId);
        res.json({ businessIntelligence: bi });
      } catch (error: any) {
        logger.error({ module: 'Intelligence', err: error }, 'Failed to get business intelligence');
        res.status(500).json({ error: 'Failed to get business intelligence' });
      }
    }),
  );

  /**
   * PUT /business — Save/update business intelligence
   */
  router.put(
    '/business',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const {
          industry,
          niche,
          differentiator,
          targetCustomer,
          contentThemes,
          postsPerWeek,
          categoryTargets,
          preferredPlatforms,
          postingTimes,
          onboardingComplete,
        } = req.body;

        const { productIntelligenceService } = await import('../services/productIntelligenceService');
        const bi = await productIntelligenceService.saveBusinessIntelligence(userId, {
          industry,
          niche,
          differentiator,
          targetCustomer,
          contentThemes,
          postsPerWeek,
          categoryTargets,
          preferredPlatforms,
          postingTimes,
          onboardingComplete,
        });

        res.json({ businessIntelligence: bi });
      } catch (error: any) {
        logger.error({ module: 'Intelligence', err: error }, 'Failed to save business intelligence');
        res.status(500).json({ error: 'Failed to save business intelligence' });
      }
    }),
  );

  /**
   * GET /onboarding-status — Check if user has completed onboarding
   */
  router.get(
    '/onboarding-status',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any)?.userId as string | undefined;

        // Public-safe fallback: avoid noisy 401s for logged-out sessions.
        if (!userId) {
          return res.json({
            onboardingComplete: true,
            hasBusinessData: false,
            hasPriorities: false,
          });
        }

        const { productIntelligenceService } = await import('../services/productIntelligenceService');
        const complete = await productIntelligenceService.isOnboardingComplete(userId);
        res.json({
          onboardingComplete: complete,
          hasBusinessData: complete,
          hasPriorities: complete,
        });
      } catch (error: any) {
        logger.error({ module: 'Intelligence', err: error }, 'Failed to check onboarding status');
        res.status(500).json({ error: 'Failed to check onboarding status' });
      }
    }),
  );

  /**
   * GET /stats — Get posting stats per product
   */
  router.get(
    '/stats',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const { productIntelligenceService } = await import('../services/productIntelligenceService');
        const stats = await productIntelligenceService.getProductPostingStats(userId);
        res.json({ stats });
      } catch (error: any) {
        logger.error({ module: 'Intelligence', err: error }, 'Failed to get posting stats');
        res.status(500).json({ error: 'Failed to get posting stats' });
      }
    }),
  );

  /**
   * POST /select — Select products for weekly plan (used by planner)
   */
  router.post(
    '/select',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const { numPosts } = req.body;

        if (!numPosts || typeof numPosts !== 'number' || numPosts < 1 || numPosts > 30) {
          return res.status(400).json({ error: 'numPosts must be a number between 1 and 30' });
        }

        const { productIntelligenceService } = await import('../services/productIntelligenceService');
        const selections = await productIntelligenceService.selectProductsForWeek(userId, numPosts);
        res.json({ selections });
      } catch (error: any) {
        logger.error({ module: 'Intelligence', err: error }, 'Failed to select products');
        res.status(500).json({ error: 'Failed to select products for weekly plan' });
      }
    }),
  );

  return router;
};

export const intelligenceRouterModule: RouterModule = {
  prefix: '/api/intelligence',
  factory: intelligenceRouter,
  description: 'Product intelligence layer — priorities, business intelligence, and smart selection',
  endpointCount: 8,
  requiresAuth: true,
  tags: ['intelligence', 'products', 'planning', 'onboarding'],
};
