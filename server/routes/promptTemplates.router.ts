/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Prompt Templates Router
 * CRUD for user prompt templates
 *
 * Endpoints:
 * - POST /api/prompt-templates - Create prompt template
 * - GET /api/prompt-templates - List prompt templates (optionally by category)
 * - DELETE /api/prompt-templates/:id - Delete prompt template
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const promptTemplatesRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;

  /**
   * POST / - Create prompt template
   */
  router.post(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { title, prompt, category, tags } = req.body;
        if (!title || !prompt) {
          return res.status(400).json({ error: 'Title and prompt are required' });
        }

        const template = await storage.savePromptTemplate({
          title,
          prompt,
          category: category || null,
          tags: tags || [],
        });

        res.json(template);
      } catch (error: any) {
        logger.error({ module: 'PromptTemplate', err: error }, 'Error creating template');
        res.status(500).json({ error: 'Failed to create prompt template' });
      }
    }),
  );

  /**
   * GET / - List prompt templates (optionally filtered by category)
   */
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const category = req.query['category'] as string | undefined;
        const templates = await storage.getPromptTemplates(category);
        res.json(templates);
      } catch (error: any) {
        logger.error({ module: 'PromptTemplates', err: error }, 'Error fetching templates');
        res.status(500).json({ error: 'Failed to fetch prompt templates' });
      }
    }),
  );

  /**
   * DELETE /:id - Delete prompt template
   */
  router.delete(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        await storage.deletePromptTemplate(String(req.params['id']));
        res.json({ success: true });
      } catch (error: any) {
        logger.error({ module: 'DeletePromptTemplate', err: error }, 'Error deleting template');
        res.status(500).json({ error: 'Failed to delete prompt template' });
      }
    }),
  );

  return router;
};

export const promptTemplatesRouterModule: RouterModule = {
  prefix: '/api/prompt-templates',
  factory: promptTemplatesRouter,
  description: 'User prompt template CRUD',
  endpointCount: 3,
  requiresAuth: false,
  tags: ['templates', 'prompts'],
};
