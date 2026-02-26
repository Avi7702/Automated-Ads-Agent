/**
 * Brand Profile Router
 * Brand profile CRUD and user brand voice management
 *
 * Endpoints:
 * - GET /api/brand-profile - Get current user's brand profile
 * - PUT /api/brand-profile - Create or update brand profile
 * - DELETE /api/brand-profile - Delete brand profile
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const brandProfileRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  /**
   * GET / - Get current user's brand profile
   */
  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const profile = await storage.getBrandProfileByUserId(userId);

        if (!profile) {
          return res.status(404).json({ error: 'Brand profile not found' });
        }

        res.json(profile);
      } catch (err: unknown) {
        logger.error({ module: 'BrandProfileGet', err }, 'Error getting brand profile');
        res.status(500).json({ error: 'Failed to get brand profile' });
      }
    }),
  );

  /**
   * PUT / - Create or update brand profile
   */
  router.put(
    '/',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }

        const existing = await storage.getBrandProfileByUserId(userId);

        const { userId: _ignored, ...body } = req.body;

        if (existing) {
          const updated = await storage.updateBrandProfile(userId, body);
          res.json(updated);
        } else {
          const created = await storage.saveBrandProfile({
            ...body,
            userId,
          });
          res.status(201).json(created);
        }
      } catch (err: unknown) {
        logger.error({ module: 'BrandProfileUpdate', err }, 'Error updating brand profile');
        res.status(500).json({ error: 'Failed to update brand profile' });
      }
    }),
  );

  /**
   * DELETE / - Delete brand profile
   */
  router.delete(
    '/',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        await storage.deleteBrandProfile(userId);
        res.json({ success: true });
      } catch (err: unknown) {
        logger.error({ module: 'BrandProfileDelete', err }, 'Error deleting brand profile');
        res.status(500).json({ error: 'Failed to delete brand profile' });
      }
    }),
  );

  return router;
};

export const brandProfileRouterModule: RouterModule = {
  prefix: '/api/brand-profile',
  factory: brandProfileRouter,
  description: 'Brand profile CRUD',
  endpointCount: 3,
  requiresAuth: true,
  tags: ['brand', 'profile', 'settings'],
};
