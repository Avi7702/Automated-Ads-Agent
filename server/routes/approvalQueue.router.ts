/**
 * Approval Queue Router
 * Human-in-the-loop approval workflow for AI-generated content
 *
 * Endpoints:
 * - GET /api/approval-queue - List approval queue items
 * - GET /api/approval-queue/:id - Get single queue item
 * - POST /api/approval-queue/:id/approve - Approve content
 * - POST /api/approval-queue/:id/reject - Reject content
 * - POST /api/approval-queue/:id/revision - Request revision
 * - POST /api/approval-queue/bulk-approve - Bulk approve multiple items
 * - GET /api/approval-queue/:id/audit - Get audit log for item
 * - GET /api/approval-queue/settings - Get user approval settings
 * - PUT /api/approval-queue/settings - Update user approval settings
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import * as approvalQueueService from '../services/approvalQueueService';
import { validate } from '../middleware/validate';
import { approvalQueueQuerySchema } from '../validation/schemas';

export const approvalQueueRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  /**
   * GET / - List approval queue items for current user
   */
  router.get(
    '/',
    requireAuth,
    validate(approvalQueueQuerySchema, 'query'),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const validated = (req as any).validatedQuery ?? {};

        const filters: {
          status?: string;
          priority?: string;
          dateFrom?: Date;
          dateTo?: Date;
        } = {};

        if (validated.status) filters.status = validated.status;
        if (validated.priority) filters.priority = validated.priority;
        if (validated.dateFrom) filters.dateFrom = new Date(validated.dateFrom);
        if (validated.dateTo) filters.dateTo = new Date(validated.dateTo);

        const items = await approvalQueueService.getQueueForUser(req.user!.id, filters);

        // Calculate stats
        const stats = {
          total: items.length,
          pendingReview: items.filter((i) => i.status === 'pending_review').length,
          approved: items.filter((i) => i.status === 'approved').length,
          rejected: items.filter((i) => i.status === 'rejected').length,
          needsRevision: items.filter((i) => i.status === 'needs_revision').length,
          urgent: items.filter((i) => i.priority === 'urgent').length,
          highPriority: items.filter((i) => i.priority === 'high').length,
        };

        // Calculate average confidence
        const withConfidence = items.filter((i) => i.aiConfidenceScore !== null);
        const avgConfidence =
          withConfidence.length > 0
            ? withConfidence.reduce((sum, i) => sum + (i.aiConfidenceScore ?? 0), 0) / withConfidence.length
            : 0;

        res.json({
          success: true,
          data: {
            items,
            stats: {
              ...stats,
              avgConfidence: Math.round(avgConfidence),
            },
          },
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const errorCode = (error as any)?.code;
        logger.error({ module: 'ApprovalQueue', err: error, errorMessage, errorCode }, 'Failed to fetch queue items');
        res.status(500).json({
          success: false,
          error: 'Failed to fetch approval queue',
          // Temporarily expose error details to diagnose the issue
          details: errorMessage,
          code: errorCode,
        });
      }
    }),
  );

  /**
   * GET /:id - Get single queue item by ID
   */
  router.get(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const item = await storage.getApprovalQueue(id);

        if (!item) {
          return res.status(404).json({
            success: false,
            error: 'Queue item not found',
          });
        }

        // Verify ownership
        if (item.userId !== req.user!.id) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized: You do not own this item',
          });
        }

        res.json({
          success: true,
          data: item,
        });
      } catch (error) {
        logger.error({ module: 'ApprovalQueue', err: error, id: req.params.id }, 'Failed to fetch queue item');
        res.status(500).json({
          success: false,
          error: 'Failed to fetch queue item',
        });
      }
    }),
  );

  /**
   * POST /:id/approve - Approve a queue item
   */
  router.post(
    '/:id/approve',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { notes } = req.body;

        // Verify ownership
        const item = await storage.getApprovalQueue(id);
        if (!item) {
          return res.status(404).json({
            success: false,
            error: 'Queue item not found',
          });
        }

        if (item.userId !== req.user!.id) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized: You do not own this item',
          });
        }

        await approvalQueueService.approveContent(id, req.user!.id, notes);

        logger.info({ userId: req.user!.id, queueItemId: id }, 'Content approved');

        res.json({
          success: true,
          message: 'Content approved',
        });
      } catch (error) {
        logger.error({ module: 'ApprovalQueue', err: error, id: req.params.id }, 'Failed to approve content');
        res.status(500).json({
          success: false,
          error: 'Failed to approve content',
        });
      }
    }),
  );

  /**
   * POST /:id/reject - Reject a queue item
   */
  router.post(
    '/:id/reject',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { reason } = req.body;

        if (!reason || typeof reason !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Rejection reason is required',
          });
        }

        // Verify ownership
        const item = await storage.getApprovalQueue(id);
        if (!item) {
          return res.status(404).json({
            success: false,
            error: 'Queue item not found',
          });
        }

        if (item.userId !== req.user!.id) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized: You do not own this item',
          });
        }

        await approvalQueueService.rejectContent(id, req.user!.id, reason);

        logger.info({ userId: req.user!.id, queueItemId: id }, 'Content rejected');

        res.json({
          success: true,
          message: 'Content rejected',
        });
      } catch (error) {
        logger.error({ module: 'ApprovalQueue', err: error, id: req.params.id }, 'Failed to reject content');
        res.status(500).json({
          success: false,
          error: 'Failed to reject content',
        });
      }
    }),
  );

  /**
   * POST /:id/revision - Request revision for a queue item
   */
  router.post(
    '/:id/revision',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { id } = req.params;
        const { notes } = req.body;

        if (!notes || typeof notes !== 'string') {
          return res.status(400).json({
            success: false,
            error: 'Revision notes are required',
          });
        }

        // Verify ownership
        const item = await storage.getApprovalQueue(id);
        if (!item) {
          return res.status(404).json({
            success: false,
            error: 'Queue item not found',
          });
        }

        if (item.userId !== req.user!.id) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized: You do not own this item',
          });
        }

        await approvalQueueService.requestRevision(id, req.user!.id, notes);

        logger.info({ userId: req.user!.id, queueItemId: id }, 'Revision requested');

        res.json({
          success: true,
          message: 'Revision requested',
        });
      } catch (error) {
        logger.error({ module: 'ApprovalQueue', err: error, id: req.params.id }, 'Failed to request revision');
        res.status(500).json({
          success: false,
          error: 'Failed to request revision',
        });
      }
    }),
  );

  /**
   * POST /bulk-approve - Bulk approve multiple items
   */
  router.post(
    '/bulk-approve',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { ids } = req.body;

        if (!Array.isArray(ids) || ids.length === 0) {
          return res.status(400).json({
            success: false,
            error: 'Array of item IDs is required',
          });
        }

        // Verify ownership of all items
        for (const id of ids) {
          const item = await storage.getApprovalQueue(id);
          if (!item) {
            return res.status(404).json({
              success: false,
              error: `Queue item not found: ${id}`,
            });
          }
          if (item.userId !== req.user!.id) {
            return res.status(403).json({
              success: false,
              error: `Unauthorized: You do not own item ${id}`,
            });
          }
        }

        const result = await approvalQueueService.bulkApprove(ids, req.user!.id);

        logger.info(
          {
            userId: req.user!.id,
            succeeded: result.succeeded.length,
            failed: result.failed.length,
          },
          'Bulk approve completed',
        );

        res.json({
          success: true,
          data: result,
        });
      } catch (error) {
        logger.error({ module: 'ApprovalQueue', err: error }, 'Failed to bulk approve');
        res.status(500).json({
          success: false,
          error: 'Failed to bulk approve',
        });
      }
    }),
  );

  /**
   * GET /:id/audit - Get audit log for a queue item
   */
  router.get(
    '/:id/audit',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { id } = req.params;

        // Verify ownership
        const item = await storage.getApprovalQueue(id);
        if (!item) {
          return res.status(404).json({
            success: false,
            error: 'Queue item not found',
          });
        }

        if (item.userId !== req.user!.id) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized: You do not own this item',
          });
        }

        const auditLog = await approvalQueueService.getAuditLog(id);

        res.json({
          success: true,
          data: auditLog,
        });
      } catch (error) {
        logger.error({ module: 'ApprovalQueue', err: error, id: req.params.id }, 'Failed to fetch audit log');
        res.status(500).json({
          success: false,
          error: 'Failed to fetch audit log',
        });
      }
    }),
  );

  /**
   * GET /settings - Get user approval settings
   */
  router.get(
    '/settings',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const settings = await approvalQueueService.getApprovalSettings(req.user!.id);

        res.json({
          success: true,
          data: settings || {
            autoApproveEnabled: false,
            minConfidenceForAutoApprove: 95,
            notifyOnPending: true,
            notifyOnAutoApprove: false,
          },
        });
      } catch (error) {
        logger.error({ module: 'ApprovalQueue', err: error }, 'Failed to fetch approval settings');
        res.status(500).json({
          success: false,
          error: 'Failed to fetch approval settings',
        });
      }
    }),
  );

  /**
   * PUT /settings - Update user approval settings
   */
  router.put(
    '/settings',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { autoApproveEnabled, minConfidenceForAutoApprove, notifyOnPending, notifyOnAutoApprove } = req.body;

        const settings = await approvalQueueService.updateApprovalSettings(req.user!.id, {
          autoApproveEnabled,
          minConfidenceForAutoApprove,
          notifyOnPending,
          notifyOnAutoApprove,
        });

        logger.info({ userId: req.user!.id }, 'Approval settings updated');

        res.json({
          success: true,
          data: settings,
        });
      } catch (error) {
        logger.error({ module: 'ApprovalQueue', err: error }, 'Failed to update approval settings');
        res.status(500).json({
          success: false,
          error: 'Failed to update approval settings',
        });
      }
    }),
  );

  return router;
};

export const approvalQueueRouterModule: RouterModule = {
  prefix: '/api/approval-queue',
  factory: approvalQueueRouter,
  description: 'Approval queue for AI-generated content',
  endpointCount: 9,
  requiresAuth: true,
  tags: ['approval', 'queue', 'hitl', 'workflow'],
};
