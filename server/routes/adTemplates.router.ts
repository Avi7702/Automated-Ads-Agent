/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Ad Templates Router (Ad Scene Templates)
 * CRUD for ad scene templates with category filtering
 *
 * Endpoints:
 * - GET /api/ad-templates/categories - Get available categories
 * - GET /api/ad-templates - List templates with filters
 * - GET /api/ad-templates/:id - Get single template
 * - POST /api/ad-templates - Create template (admin)
 * - PUT /api/ad-templates/:id - Update template
 * - DELETE /api/ad-templates/:id - Delete template (admin)
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const adTemplatesRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  /**
   * GET /categories - Get available categories (must be before :id route)
   */
  router.get(
    '/categories',
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        // Return construction-focused categories for NDS
        const categories = [
          { id: 'product_showcase', label: 'Product Showcase', description: 'Rebar, mesh, and materials display' },
          { id: 'installation', label: 'Installation', description: 'On-site installation and usage' },
          { id: 'worksite', label: 'Worksite', description: 'Construction site environments' },
          { id: 'professional', label: 'Professional', description: 'Studio and professional shots' },
          { id: 'outdoor', label: 'Outdoor', description: 'Outdoor construction contexts' },
        ];
        res.json(categories);
      } catch (error: any) {
        logger.error({ module: 'GetTemplateCategories', err: error }, 'Error fetching categories');
        res.status(500).json({ error: 'Failed to fetch categories' });
      }
    }),
  );

  /**
   * GET / - List templates with filters
   */
  router.get(
    '/',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { category, search, platform, aspectRatio } = req.query;

        // If search query provided, use search function
        if (search && typeof search === 'string') {
          const templates = await storage.searchAdSceneTemplates(search);
          return res.json(templates);
        }

        // Otherwise use filters
        const filters: { category?: string; isGlobal?: boolean } = {};
        if (category && typeof category === 'string') {
          filters.category = category;
        }
        filters.isGlobal = true; // Only return global templates by default

        let templates = await storage.getAdSceneTemplates(filters);

        // Additional filtering for platform and aspect ratio
        if (platform && typeof platform === 'string') {
          templates = templates.filter((t) => t.platformHints?.includes(platform));
        }
        if (aspectRatio && typeof aspectRatio === 'string') {
          templates = templates.filter((t) => t.aspectRatioHints?.includes(aspectRatio));
        }

        res.json(templates);
      } catch (error: any) {
        logger.error({ module: 'GetAdTemplates', err: error }, 'Error fetching ad templates');
        res.status(500).json({ error: 'Failed to fetch ad templates' });
      }
    }),
  );

  /**
   * GET /:id - Get single template
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
      } catch (error: any) {
        logger.error({ module: 'GetAdTemplate', err: error }, 'Error fetching ad template');
        res.status(500).json({ error: 'Failed to fetch ad template' });
      }
    }),
  );

  /**
   * POST / - Create template (admin)
   */
  router.post(
    '/',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { insertAdSceneTemplateSchema } = await import('@shared/schema');
        const validatedData = insertAdSceneTemplateSchema.parse(req.body);

        // Set createdBy to current user
        const userId = (req as any).session?.userId;
        const template = await storage.saveAdSceneTemplate({
          ...validatedData,
          createdBy: userId,
        });

        res.status(201).json(template);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return res.status(400).json({ error: 'Invalid template data', details: error.issues });
        }
        logger.error({ module: 'CreateAdTemplate', err: error }, 'Error creating ad template');
        res.status(500).json({ error: 'Failed to create ad template' });
      }
    }),
  );

  /**
   * PUT /:id - Update template
   */
  router.put(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const existing = await storage.getAdSceneTemplateById(String(req.params['id']));
        if (!existing) {
          return res.status(404).json({ error: 'Template not found' });
        }

        // Validate using partial schema (all fields optional for updates)
        const { insertAdSceneTemplateSchema } = await import('@shared/schema');
        const updateSchema = insertAdSceneTemplateSchema.partial();
        const validatedData = updateSchema.parse(req.body);

        // Strip undefined values for exactOptionalPropertyTypes compatibility
        const cleanData = Object.fromEntries(Object.entries(validatedData).filter(([, v]) => v !== undefined));
        const template = await storage.updateAdSceneTemplate(String(req.params['id']), cleanData);
        res.json(template);
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return res.status(400).json({ error: 'Invalid template data', details: error.issues });
        }
        logger.error({ module: 'UpdateAdTemplate', err: error }, 'Error updating ad template');
        res.status(500).json({ error: 'Failed to update ad template' });
      }
    }),
  );

  /**
   * DELETE /:id - Delete template (admin)
   */
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const existing = await storage.getAdSceneTemplateById(String(req.params['id']));
        if (!existing) {
          return res.status(404).json({ error: 'Template not found' });
        }

        await storage.deleteAdSceneTemplate(String(req.params['id']));
        res.json({ success: true });
      } catch (error: any) {
        logger.error({ module: 'DeleteAdTemplate', err: error }, 'Error deleting ad template');
        res.status(500).json({ error: 'Failed to delete ad template' });
      }
    }),
  );

  return router;
};

export const adTemplatesRouterModule: RouterModule = {
  prefix: '/api/ad-templates',
  factory: adTemplatesRouter,
  description: 'Ad scene template CRUD with category and platform filtering',
  endpointCount: 6,
  requiresAuth: false, // Mixed - read operations are public
  tags: ['templates', 'ad-scenes'],
};
