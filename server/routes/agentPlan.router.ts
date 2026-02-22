// @ts-nocheck
/**
 * Agent Plan Router
 * REST pipeline for Agent Mode planning & execution
 *
 * Endpoints:
 * - GET  /api/agent/suggestions         — Stage 1: dynamic suggestion cards
 * - POST /api/agent/plan/preview        — Stage 2: build Plan Brief
 * - POST /api/agent/plan/execute        — Execute an approved plan (idempotent)
 * - POST /api/agent/plan/revise         — Revise a plan with user feedback
 * - GET  /api/agent/execution/:executionId — Poll execution status
 * - GET  /api/agent/plans               — Plan history for current user
 * - POST /api/agent/execution/:executionId/cancel — Cancel running execution
 * - POST /api/agent/execution/:executionId/retry  — Retry failed steps
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler, handleRouteError } from './utils/createRouter';
import {
  generateSuggestions,
  buildPlanPreview,
  executePlan,
  revisePlan,
  getExecution,
  listPlans,
  cancelExecution,
  retryFailedSteps,
  PlanNotFoundError,
} from '../services/agent/orchestratorService';
import {
  agentSuggestionsQuerySchema,
  planPreviewSchema,
  planExecuteSchema,
  planReviseSchema,
  executionIdParamSchema,
  planHistoryQuerySchema,
} from '../validation/schemas';

export const agentPlanRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth, validate, createRateLimiter } = ctx.middleware;

  // Rate limits
  const suggestionsLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
  });

  const executeLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 10,
  });

  /**
   * GET /suggestions
   * Returns dynamic suggestion cards based on current pipeline state
   * Query params: ?products=id1,id2&limit=6
   */
  router.get(
    '/suggestions',
    requireAuth,
    suggestionsLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const parsed = agentSuggestionsQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const userId = req.user!.id;
      const { products: productsRaw, limit: limitRaw } = parsed.data;
      const productIds = productsRaw
        ? productsRaw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
      const limit = limitRaw ?? 6;

      try {
        const suggestions = await generateSuggestions(storage, userId, productIds, limit);
        res.json({ suggestions });
      } catch (err) {
        handleRouteError(res, err, 'agentPlan.suggestions');
      }
    }),
  );

  /**
   * POST /plan/preview
   * Takes a suggestion ID + clarifying answers, returns Plan Brief
   */
  router.post(
    '/plan/preview',
    requireAuth,
    suggestionsLimiter,
    validate(planPreviewSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user!.id;
      const { suggestionId, answers } = req.body;

      try {
        const result = await buildPlanPreview(storage, userId, suggestionId, answers);
        res.json(result);
      } catch (err) {
        handleRouteError(res, err, 'agentPlan.planPreview');
      }
    }),
  );

  /**
   * POST /plan/execute
   * Execute an approved plan. Uses idempotency keys.
   */
  router.post(
    '/plan/execute',
    requireAuth,
    executeLimiter,
    validate(planExecuteSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user!.id;
      const { planId, idempotencyKey } = req.body;

      try {
        const result = await executePlan(storage, userId, planId, idempotencyKey);
        res.json(result);
      } catch (err) {
        if (err instanceof PlanNotFoundError) {
          return res.status(404).json({ error: err.message });
        }
        handleRouteError(res, err, 'agentPlan.planExecute');
      }
    }),
  );

  /**
   * POST /plan/revise
   * Revise a plan with user feedback
   */
  router.post(
    '/plan/revise',
    requireAuth,
    suggestionsLimiter,
    validate(planReviseSchema),
    asyncHandler(async (req: Request, res: Response) => {
      const userId = req.user!.id;
      const { planId, feedback } = req.body;

      try {
        const plan = await revisePlan(storage, userId, planId, feedback);
        res.json({ plan });
      } catch (err) {
        if (err instanceof PlanNotFoundError) {
          return res.status(404).json({ error: err.message });
        }
        handleRouteError(res, err, 'agentPlan.planRevise');
      }
    }),
  );

  /**
   * GET /execution/:executionId
   * Poll execution status for progress tracking
   */
  router.get(
    '/execution/:executionId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const parsed = executionIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid execution ID',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const userId = req.user!.id;
      const { executionId } = parsed.data;

      try {
        const result = await getExecution(storage, executionId, userId);
        if (!result) {
          return res.status(404).json({ error: 'Execution not found' });
        }
        res.json(result);
      } catch (err) {
        handleRouteError(res, err, 'agentPlan.getExecution');
      }
    }),
  );

  /**
   * GET /plans
   * Plan history for the current user
   */
  router.get(
    '/plans',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const parsed = planHistoryQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const userId = req.user!.id;
      const limit = Math.min(parsed.data.limit ?? 20, 50);

      try {
        const plans = await listPlans(storage, userId, limit);
        res.json({ plans });
      } catch (err) {
        handleRouteError(res, err, 'agentPlan.listPlans');
      }
    }),
  );

  /**
   * POST /execution/:executionId/cancel
   * Cancel a running or queued execution
   */
  router.post(
    '/execution/:executionId/cancel',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const parsed = executionIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid execution ID',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const userId = req.user!.id;
      const { executionId } = parsed.data;

      try {
        await cancelExecution(storage, executionId, userId);
        res.json({ success: true, message: 'Execution cancelled' });
      } catch (err) {
        if (err instanceof PlanNotFoundError) {
          return res.status(404).json({ error: err.message });
        }
        handleRouteError(res, err, 'agentPlan.cancelExecution');
      }
    }),
  );

  /**
   * POST /execution/:executionId/retry
   * Retry failed steps in an execution
   */
  router.post(
    '/execution/:executionId/retry',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const parsed = executionIdParamSchema.safeParse(req.params);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Invalid execution ID',
          details: parsed.error.flatten().fieldErrors,
        });
      }

      const userId = req.user!.id;
      const { executionId } = parsed.data;

      try {
        const result = await retryFailedSteps(storage, executionId, userId);
        res.json(result);
      } catch (err) {
        if (err instanceof PlanNotFoundError) {
          return res.status(404).json({ error: err.message });
        }
        handleRouteError(res, err, 'agentPlan.retryFailedSteps');
      }
    }),
  );

  return router;
};

export const agentPlanRouterModule: RouterModule = {
  prefix: '/api/agent',
  factory: agentPlanRouter,
  description: 'Agent Mode planning & execution pipeline',
  endpointCount: 8,
  requiresAuth: true,
  tags: ['agent', 'planning', 'ai'],
};
