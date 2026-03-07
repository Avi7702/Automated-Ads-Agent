/**
 * Phoenix Orchestrator Router — Task 2.07
 *
 * New API routes for the Phoenix orchestrator. Runs alongside
 * existing agent routes for backward compatibility.
 *
 * Endpoints:
 *   POST /api/phoenix/orchestrate       — Main entry point (SSE stream)
 *   POST /api/phoenix/orchestrate/sync  — Synchronous version (JSON response)
 *   GET  /api/phoenix/run/:runId        — Get orchestration run status
 */
import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { orchestrate, type OrchestratorInput, type ProgressEvent } from '../services/agent/phoenixOrchestrator';
import { logger } from '../lib/logger';

const MAX_MESSAGE_LENGTH = 8000;

function coerceStringArray(value: unknown, limit: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, limit);
}

const phoenixRouter: RouterFactory = ({ services: { storage } }: RouterContext): Router => {
  const router = createRouter();

  /**
   * POST /api/phoenix/orchestrate
   * Main entry point. Streams progress via SSE, then sends the final result.
   */
  router.post(
    '/orchestrate',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = ((req as Record<string, unknown>)['userId'] as string) || 'anonymous';
      const body = req.body as Record<string, unknown>;
      const message = typeof body['message'] === 'string' ? body['message'] : '';

      if (!message || message.length === 0) {
        res.status(400).json({ error: 'message is required' });
        return;
      }

      if (message.length > MAX_MESSAGE_LENGTH) {
        res.status(400).json({ error: `message exceeds ${MAX_MESSAGE_LENGTH} characters` });
        return;
      }

      // Set up SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.flushHeaders();

      const input: OrchestratorInput = {
        message,
        productIds: coerceStringArray(body['productIds'], 50),
        playbook: body['playbook'] as OrchestratorInput['playbook'],
        userId,
        platform: typeof body['platform'] === 'string' ? body['platform'] : undefined,
        uiContext: body['uiContext'] as OrchestratorInput['uiContext'],
      };

      const onProgress = (event: ProgressEvent) => {
        try {
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        } catch {
          // Client disconnected
        }
      };

      try {
        const result = await orchestrate(input, storage, onProgress);
        res.write(`data: ${JSON.stringify({ type: 'result', ...result })}\n\n`);
        res.end();
      } catch (error) {
        logger.error({ err: error, userId }, 'Phoenix orchestration SSE error');
        try {
          res.write(
            `data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`,
          );
          res.end();
        } catch {
          // Client already disconnected
        }
      }
    }),
  );

  /**
   * POST /api/phoenix/orchestrate/sync
   * Synchronous version — returns JSON directly (no SSE).
   */
  router.post(
    '/orchestrate/sync',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = ((req as Record<string, unknown>)['userId'] as string) || 'anonymous';
      const body = req.body as Record<string, unknown>;
      const message = typeof body['message'] === 'string' ? body['message'] : '';

      if (!message || message.length === 0) {
        res.status(400).json({ error: 'message is required' });
        return;
      }

      const input: OrchestratorInput = {
        message,
        productIds: coerceStringArray(body['productIds'], 50),
        playbook: body['playbook'] as OrchestratorInput['playbook'],
        userId,
        platform: typeof body['platform'] === 'string' ? body['platform'] : undefined,
        uiContext: body['uiContext'] as OrchestratorInput['uiContext'],
      };

      const result = await orchestrate(input, storage);
      res.json(result);
    }),
  );

  /**
   * GET /api/phoenix/run/:runId
   * Get the status of a previous orchestration run.
   */
  router.get(
    '/run/:runId',
    asyncHandler(async (_req: Request, res: Response) => {
      // TODO: Implement run persistence and retrieval in Phase 4
      res.status(501).json({ error: 'Run history not yet implemented' });
    }),
  );

  return router;
};

export const phoenixRouterModule: RouterModule = {
  prefix: '/api/phoenix',
  factory: phoenixRouter,
  description: 'Phoenix Orchestrator — playbook-driven content generation',
  endpointCount: 3,
  requiresAuth: true,
  tags: ['phoenix', 'orchestrator', 'agent'],
};
