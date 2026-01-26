/**
 * N8N Router
 * N8N webhook callback endpoint for social posting results
 *
 * Endpoints:
 * - POST /api/n8n/callback - Webhook handler for n8n posting results
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const n8nRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { validateN8nWebhook, validate } = ctx.middleware;
  const { n8nCallback } = ctx.schemas;

  /**
   * POST /callback - Webhook handler for n8n posting results
   * Called by n8n workflows after posting to social platforms
   */
  router.post('/callback', validateN8nWebhook, validate(n8nCallback), asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        scheduledPostId,
        platform,
        success,
        platformPostId,
        platformPostUrl,
        error,
        executionId,
        postedAt,
      } = req.body;

      logger.info({
        scheduledPostId,
        platform,
        success,
        executionId,
      }, 'n8n callback received');

      // TODO: Update scheduledPosts table (Phase 8.2 - Approval Queue)
      // For now, just log and acknowledge

      res.json({
        success: true,
        message: 'Callback received and processed'
      });
    } catch (error) {
      logger.error({
        module: 'n8nCallback',
        err: error
      }, 'Failed to process n8n callback');

      res.status(500).json({
        success: false,
        error: 'Failed to process callback'
      });
    }
  }));

  return router;
};

export const n8nRouterModule: RouterModule = {
  prefix: '/api/n8n',
  factory: n8nRouter,
  description: 'N8N webhook callbacks',
  endpointCount: 1,
  requiresAuth: false, // Uses webhook signature validation instead
  tags: ['n8n', 'webhooks', 'social']
};
