/**
 * Agent Router
 * Conversational AI agent for the Studio page
 *
 * Endpoints:
 * - POST /api/agent/chat - Stream agent response (SSE)
 * - DELETE /api/agent/session/:sessionId - Delete agent session
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { streamAgentResponse, deleteAgentSession } from '../services/agent';

const MAX_MESSAGE_LENGTH = 4000;
const MAX_SESSION_ID_LENGTH = 128;
const SESSION_ID_PATTERN = /^[a-zA-Z0-9_\-]+$/;

export const agentRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth, createRateLimiter } = ctx.middleware;

  // Rate limit: 30 requests per 15 minutes per user
  const agentLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000,
    maxRequests: 30,
  });

  /**
   * POST /chat - Stream agent response via SSE
   */
  router.post(
    '/chat',
    requireAuth,
    agentLimiter,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const { message, sessionId } = req.body;
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'message is required and must be a string' });
      }
      if (message.length > MAX_MESSAGE_LENGTH) {
        return res.status(400).json({ error: `Message too long (max ${MAX_MESSAGE_LENGTH} characters)` });
      }
      if (
        sessionId &&
        (typeof sessionId !== 'string' ||
          sessionId.length > MAX_SESSION_ID_LENGTH ||
          !SESSION_ID_PATTERN.test(sessionId))
      ) {
        return res.status(400).json({ error: 'Invalid sessionId' });
      }

      const sid = typeof sessionId === 'string' && sessionId.length > 0 ? sessionId : `session_${userId}_${Date.now()}`;

      // SSE headers — include session ID so client can track conversations
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');
      res.setHeader('X-Session-Id', sid);
      res.flushHeaders();

      // Track client disconnect to stop agent execution
      let clientDisconnected = false;
      req.on('close', () => {
        clientDisconnected = true;
      });

      try {
        for await (const event of streamAgentResponse(storage, userId, sid, message)) {
          if (res.writableEnded || clientDisconnected) break;
          res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
      } catch (err: unknown) {
        logger.error({ module: 'AgentRouter', err }, 'SSE stream error');
        if (!res.writableEnded) {
          res.write(
            `data: ${JSON.stringify({ type: 'error', content: 'Something went wrong. Please try again.' })}\n\n`,
          );
        }
      }

      if (!res.writableEnded) {
        res.end();
      }
      return;
    }),
  );

  /**
   * DELETE /session/:sessionId - Delete an agent session
   */
  router.delete(
    '/session/:sessionId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).session?.userId;
      if (!userId) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const sessionId = req.params['sessionId'];
      if (!sessionId || typeof sessionId !== 'string') {
        return res.status(400).json({ error: 'sessionId is required' });
      }
      if (sessionId.length > MAX_SESSION_ID_LENGTH || !SESSION_ID_PATTERN.test(sessionId)) {
        return res.status(400).json({ error: 'Invalid sessionId format' });
      }

      const deleted = await deleteAgentSession(storage, userId, sessionId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: 'Session not found or already deleted' });
      }
      res.json({ success: true });
    }),
  );

  return router;
};

export const agentRouterModule: RouterModule = {
  prefix: '/api/agent',
  factory: agentRouter,
  description: 'Conversational AI agent for Studio',
  endpointCount: 2,
  requiresAuth: true,
  tags: ['agent', 'ai', 'chat'],
};
