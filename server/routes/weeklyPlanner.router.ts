/**
 * Weekly Planner Router — WS-C1
 *
 * Endpoints:
 * - GET  /api/planner/weekly?weekStart=ISO  — Get or generate plan for a week
 * - GET  /api/planner/weekly/current        — Get plan for current week
 * - PATCH /api/planner/weekly/:planId/posts/:index — Update a single post's status
 * - POST  /api/planner/weekly/:planId/regenerate   — Regenerate plan
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler, handleRouteError } from './utils/createRouter';
import { generateWeeklyPlan, updatePlanPostStatus, regeneratePlan } from '../services/weeklyPlannerService';

/** Safely extract a route param as string */
function param(req: Request, key: string): string {
  const val = req.params[key];
  return Array.isArray(val) ? (val[0] ?? '') : (val ?? '');
}

export const weeklyPlannerRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  // All weekly planner endpoints require authentication
  router.use(requireAuth);

  /**
   * GET /weekly/current — Get plan for the current week (convenience)
   * Must be registered BEFORE the parameterized /weekly/:planId routes
   */
  router.get(
    '/weekly/current',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const plan = await generateWeeklyPlan(userId, new Date());

        res.json(plan);
      } catch (error) {
        handleRouteError(res, error, 'weeklyPlanner.getCurrent');
      }
    }),
  );

  /**
   * GET /weekly?weekStart=2026-02-16 — Get or generate plan for a specific week
   * weekStart should be a Monday; if not, will adjust to previous Monday
   */
  router.get(
    '/weekly',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const { weekStart } = req.query;

        if (!weekStart) {
          return res.status(400).json({ error: 'weekStart query param required (ISO date)' });
        }

        const weekStartDate = new Date(weekStart as string);
        if (isNaN(weekStartDate.getTime())) {
          return res.status(400).json({ error: 'Invalid weekStart date format. Use ISO 8601.' });
        }

        const plan = await generateWeeklyPlan(userId, weekStartDate);

        res.json(plan);
      } catch (error) {
        handleRouteError(res, error, 'weeklyPlanner.getWeekly');
      }
    }),
  );

  /**
   * PATCH /weekly/:planId/posts/:index — Update a single post's status
   * Body: { status, generationId?, scheduledPostId? }
   */
  router.patch(
    '/weekly/:planId/posts/:index',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const planId = param(req, 'planId');
        const postIndex = parseInt(param(req, 'index'), 10);

        if (isNaN(postIndex) || postIndex < 0) {
          return res.status(400).json({ error: 'Invalid post index' });
        }

        const { status, generationId, scheduledPostId } = req.body;

        const validStatuses = ['planned', 'in_progress', 'generated', 'approved', 'scheduled'];
        if (!status || !validStatuses.includes(status)) {
          return res.status(400).json({
            error: `status must be one of: ${validStatuses.join(', ')}`,
          });
        }

        const linkIds: { generationId?: string; scheduledPostId?: string } = {};
        if (generationId) linkIds.generationId = generationId;
        if (scheduledPostId) linkIds.scheduledPostId = scheduledPostId;

        await updatePlanPostStatus(planId, postIndex, status, linkIds);

        logger.info({ planId, postIndex, status }, 'Weekly plan post status updated');
        res.json({ message: 'Post status updated', planId, postIndex, status });
      } catch (error) {
        handleRouteError(res, error, 'weeklyPlanner.updatePostStatus');
      }
    }),
  );

  /**
   * POST /weekly/:planId/regenerate — Regenerate plan with fresh data
   */
  router.post(
    '/weekly/:planId/regenerate',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.user?.id;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        const planId = param(req, 'planId');

        const plan = await regeneratePlan(planId);

        logger.info({ planId: plan.id }, 'Weekly plan regenerated');
        res.json(plan);
      } catch (error) {
        handleRouteError(res, error, 'weeklyPlanner.regenerate');
      }
    }),
  );

  return router;
};

export const weeklyPlannerRouterModule: RouterModule = {
  prefix: '/api/planner',
  factory: weeklyPlannerRouter,
  description: 'Weekly content planner — generate and manage weekly post plans',
  endpointCount: 4,
  requiresAuth: true,
  tags: ['planner', 'weekly', 'content', 'strategy'],
};
