/**
 * Templates Router
 * Ad scene template management and AI-powered pattern matching endpoints
 *
 * Endpoints:
 * - GET /api/templates - List all templates
 * - GET /api/templates/search - Search templates
 * - POST /api/templates/match-context - Match templates to user context
 * - GET /api/templates/analyze-patterns/:templateId - Analyze visual patterns
 * - POST /api/templates/suggest-customizations - Suggest brand-aligned customizations
 * - GET /api/templates/:id - Get single template
 * - POST /api/templates - Create template
 * - PATCH /api/templates/:id - Update template
 * - DELETE /api/templates/:id - Delete template
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { validate } from '../middleware/validate';
import { requireRole } from '../middleware/requireRole';
import { templatesListQuerySchema, templatesSearchQuerySchema } from '../validation/schemas';

export const templatesRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  /**
   * GET / - List all templates
   * Public endpoint with optional filtering
   */
  router.get(
    '/',
    validate(templatesListQuerySchema, 'query'),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const validated = ((req as unknown as Record<string, unknown>)['validatedQuery'] ?? {}) as {
          category?: string;
          isGlobal?: boolean;
        };

        const filter: { category?: string; isGlobal?: boolean } = {};
        if (validated.category !== undefined) filter.category = validated.category;
        if (validated.isGlobal !== undefined) filter.isGlobal = validated.isGlobal;

        const templates = await storage.getAdSceneTemplates(filter);

        res.json({ templates, total: templates.length });
      } catch (err: unknown) {
        logger.error({ module: 'TemplatesList', err }, 'Error listing templates');
        res.status(500).json({ error: 'Failed to list templates' });
      }
    }),
  );

  /**
   * GET /search - Search templates
   * Public endpoint
   */
  router.get(
    '/search',
    validate(templatesSearchQuerySchema, 'query'),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { q } = (req as unknown as Record<string, unknown>)['validatedQuery'] as { q: string };

        const templates = await storage.searchAdSceneTemplates(q);
        res.json({ templates, total: templates.length });
      } catch (err: unknown) {
        logger.error({ module: 'TemplatesSearch', err }, 'Error searching templates');
        res.status(500).json({ error: 'Failed to search templates' });
      }
    }),
  );

  // ----- Template Pattern RAG (must be before /:id catch-all) -----

  /**
   * POST /match-context - Match templates to user context
   */
  router.post(
    '/match-context',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const { industry, objective, platform, aspectRatio, mood, style } = req.body;

        if (!industry || !objective || !platform || !aspectRatio) {
          return res.status(400).json({
            error: 'industry, objective, platform, and aspectRatio are required',
          });
        }

        const result = await ctx.domainServices.templatePatternRAG.matchTemplateForContext({
          industry,
          objective,
          platform,
          aspectRatio,
          mood,
          style,
          userId,
        });

        res.json(result);
      } catch (err: unknown) {
        logger.error({ module: 'TemplateRAG', err }, 'Error matching templates');
        res.status(500).json({ error: 'Failed to match templates' });
      }
    }),
  );

  /**
   * GET /analyze-patterns/:templateId - Analyze visual patterns of a template
   */
  router.get(
    '/analyze-patterns/:templateId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const templateId = String(req.params['templateId']);

        const template = await storage.getPerformingAdTemplate(templateId);
        if (!template) {
          return res.status(404).json({ error: 'Template not found' });
        }

        const analysis = await ctx.domainServices.templatePatternRAG.analyzeTemplatePatterns(template);

        res.json(analysis);
      } catch (err: unknown) {
        logger.error({ module: 'TemplateRAG', err }, 'Error analyzing patterns');
        res.status(500).json({ error: 'Failed to analyze template patterns' });
      }
    }),
  );

  /**
   * POST /suggest-customizations - Suggest customizations for brand alignment
   */
  router.post(
    '/suggest-customizations',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { templateId, brandGuidelines } = req.body;

        if (!templateId) {
          return res.status(400).json({ error: 'templateId is required' });
        }

        const suggestions = await ctx.domainServices.templatePatternRAG.suggestTemplateCustomizations(
          templateId,
          brandGuidelines || {},
        );

        if (!suggestions) {
          return res.status(404).json({ error: 'Template not found' });
        }

        res.json(suggestions);
      } catch (err: unknown) {
        logger.error({ module: 'TemplateRAG', err }, 'Error suggesting customizations');
        res.status(500).json({ error: 'Failed to suggest customizations' });
      }
    }),
  );

  // ----- CRUD routes (/:id catch-all must be last) -----

  /**
   * GET /:id - Get a single template
   * Public endpoint
   */
  router.get(
    '/:id',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const template = await storage.getAdSceneTemplateById(String(req.params['id']));

        if (!template) {
          return res.status(404).json({ error: 'Template not found' });
        }

        res.json(template);
      } catch (err: unknown) {
        logger.error({ module: 'TemplateGet', err }, 'Error getting template');
        res.status(500).json({ error: 'Failed to get template' });
      }
    }),
  );

  /**
   * POST / - Create a new template
   * Admin only
   */
  router.post(
    '/',
    requireAuth,
    requireRole('admin'),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;

        const templateData = {
          ...req.body,
          createdBy: userId,
          isGlobal: req.body.isGlobal ?? true,
        };

        const template = await storage.saveAdSceneTemplate(templateData);
        res.status(201).json(template);
      } catch (err: unknown) {
        logger.error({ module: 'TemplateCreate', err }, 'Error creating template');
        res.status(500).json({ error: 'Failed to create template' });
      }
    }),
  );

  /**
   * PATCH /:id - Update a template
   * Only creator or admin can update
   */
  router.patch(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        const userRole = req.user?.role;
        const template = await storage.getAdSceneTemplateById(String(req.params['id']));

        if (!template) {
          return res.status(404).json({ error: 'Template not found' });
        }

        // Only creator or admin can update
        if (template.createdBy !== userId && userRole !== 'admin') {
          return res.status(403).json({ error: 'Not authorized to update this template' });
        }

        const updated = await storage.updateAdSceneTemplate(String(req.params['id']), req.body);
        res.json(updated);
      } catch (err: unknown) {
        logger.error({ module: 'TemplateUpdate', err }, 'Error updating template');
        res.status(500).json({ error: 'Failed to update template' });
      }
    }),
  );

  /**
   * DELETE /:id - Delete a template
   * Only creator or admin can delete
   */
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        const userRole = req.user?.role;
        const template = await storage.getAdSceneTemplateById(String(req.params['id']));

        if (!template) {
          return res.status(404).json({ error: 'Template not found' });
        }

        // Only creator or admin can delete
        if (template.createdBy !== userId && userRole !== 'admin') {
          return res.status(403).json({ error: 'Not authorized to delete this template' });
        }

        await storage.deleteAdSceneTemplate(String(req.params['id']));
        res.json({ success: true });
      } catch (err: unknown) {
        logger.error({ module: 'TemplateDelete', err }, 'Error deleting template');
        res.status(500).json({ error: 'Failed to delete template' });
      }
    }),
  );

  return router;
};

export const templatesRouterModule: RouterModule = {
  prefix: '/api/templates',
  factory: templatesRouter,
  description: 'Ad scene template management and AI pattern matching',
  endpointCount: 9,
  requiresAuth: false,
  tags: ['templates', 'content', 'rag'],
};
