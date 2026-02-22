/**
 * @deprecated This router is deprecated. Posting is now handled in-process via publishingService.ts.
 * Kept temporarily for /api/n8n/callback rollout compatibility.
 * TODO: Remove after rollout is confirmed stable.
 *
 * N8N Router
 * N8N webhook endpoints for social posting automation
 *
 * Endpoints:
 * - GET  /api/n8n/due-posts  — n8n polls for posts ready to publish
 * - POST /api/n8n/callback   — n8n reports publish result
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { claimDuePosts } from '../services/schedulingRepository';
import { handleN8nCallback } from '../services/n8nPostingService';

export const n8nRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { validateN8nWebhook, validate } = ctx.middleware;
  const { n8nCallback } = ctx.schemas;

  /**
   * GET /due-posts — n8n polls this every few minutes
   * Returns posts that are due for publishing (atomically claimed).
   * Protected by webhook HMAC signature.
   */
  router.get(
    '/due-posts',
    validateN8nWebhook,
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const limit = 10;
        const posts = await claimDuePosts(limit);

        logger.info({ count: posts.length }, 'n8n polled for due posts');

        res.json({
          success: true,
          posts,
          claimedAt: new Date().toISOString(),
        });
      } catch (error) {
        logger.error({ module: 'n8nDuePosts', err: error }, 'Failed to claim due posts');
        res.status(500).json({ success: false, error: 'Failed to fetch due posts' });
      }
    }),
  );

  /**
   * POST /callback — n8n calls back after publishing
   * Updates the scheduled post status (published or failed).
   * Protected by webhook HMAC signature.
   */
  router.post(
    '/callback',
    validateN8nWebhook,
    validate(n8nCallback),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const {
          scheduledPostId,
          platform,
          success,
          platformPostId,
          platformPostUrl,
          error: errorMsg,
          executionId,
        } = req.body;

        logger.info(
          {
            scheduledPostId,
            platform,
            success,
            executionId,
          },
          'n8n callback received',
        );

        await handleN8nCallback({
          scheduledPostId,
          success,
          platformPostId,
          platformPostUrl,
          error: errorMsg,
          errorCode: req.body.errorCode,
          postedAt: req.body.postedAt,
        });

        res.json({
          success: true,
          message: 'Callback processed — post status updated',
        });
      } catch (error) {
        logger.error({ module: 'n8nCallback', err: error }, 'Failed to process n8n callback');
        res.status(500).json({ success: false, error: 'Failed to process callback' });
      }
    }),
  );

  return router;
};

export const n8nRouterModule: RouterModule = {
  prefix: '/api/n8n',
  factory: n8nRouter,
  description: 'N8N webhook callbacks and due-post polling',
  endpointCount: 2,
  requiresAuth: false, // Uses webhook signature validation instead
  tags: ['n8n', 'webhooks', 'social', 'calendar'],
};
