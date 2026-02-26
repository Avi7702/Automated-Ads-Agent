/**
 * Scenarios Router
 * Installation scenarios management and AI-powered installation assistant endpoints
 *
 * Endpoints (CRUD - /api/installation-scenarios):
 * - POST /api/installation-scenarios - Create scenario
 * - GET /api/installation-scenarios - List scenarios
 * - GET /api/installation-scenarios/room-type/:roomType - Get by room type
 * - POST /api/installation-scenarios/for-products - Get for products
 * - GET /api/installation-scenarios/:id - Get single scenario
 * - PUT /api/installation-scenarios/:id - Update scenario
 * - DELETE /api/installation-scenarios/:id - Delete scenario
 *
 * Endpoints (RAG - /api/installation):
 * - POST /api/installation/suggest-steps - AI-powered installation step suggestions
 * - GET /api/installation/room-context/:roomType - Get room-specific installation context
 * - POST /api/installation/suggest-accessories - Suggest accessories for installation
 * - POST /api/installation/tips - Get installation tips
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const scenariosRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth, validate } = ctx.middleware;
  const { insertInstallationScenario } = ctx.schemas;

  /**
   * POST / - Create installation scenario
   */
  router.post(
    '/',
    requireAuth,
    validate(insertInstallationScenario),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const scenario = await storage.createInstallationScenario({
          ...req.body,
          userId,
        });
        res.status(201).json(scenario);
      } catch (err: unknown) {
        logger.error({ module: 'InstallationScenarios', err }, 'Create error');
        res.status(500).json({ error: 'Failed to create installation scenario' });
      }
    }),
  );

  /**
   * GET / - Get all installation scenarios for user
   */
  router.get(
    '/',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const scenarios = await (
          storage as unknown as { getInstallationScenariosByUser(userId: string): Promise<unknown[]> }
        ).getInstallationScenariosByUser(userId);
        res.json(scenarios);
      } catch (err: unknown) {
        logger.error({ module: 'InstallationScenarios', err }, 'List error');
        res.status(500).json({ error: 'Failed to get installation scenarios' });
      }
    }),
  );

  /**
   * GET /room-type/:roomType - Get scenarios by room type
   * Note: Must be before :id catch-all
   */
  router.get(
    '/room-type/:roomType',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const scenarios = await storage.getScenariosByRoomType(String(req.params['roomType']));
        res.json(scenarios);
      } catch (err: unknown) {
        logger.error({ module: 'InstallationScenarios', err }, 'Room type query error');
        res.status(500).json({ error: 'Failed to get scenarios by room type' });
      }
    }),
  );

  /**
   * POST /for-products - Get scenarios for products
   * Note: Must be before :id catch-all
   */
  router.post(
    '/for-products',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { productIds } = req.body;
        if (!productIds || !Array.isArray(productIds)) {
          return res.status(400).json({ error: 'productIds array is required' });
        }
        const scenarios = await storage.getInstallationScenariosForProducts(productIds);
        res.json(scenarios);
      } catch (err: unknown) {
        logger.error({ module: 'InstallationScenarios', err }, 'Products query error');
        res.status(500).json({ error: 'Failed to get scenarios for products' });
      }
    }),
  );

  /**
   * GET /:id - Get single installation scenario
   * Note: catch-all - must be after specific routes
   */
  router.get(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const scenario = await storage.getInstallationScenarioById(String(req.params['id']));
        if (!scenario) {
          return res.status(404).json({ error: 'Installation scenario not found' });
        }
        res.json(scenario);
      } catch (err: unknown) {
        logger.error({ module: 'InstallationScenarios', err }, 'Get error');
        res.status(500).json({ error: 'Failed to get installation scenario' });
      }
    }),
  );

  /**
   * PUT /:id - Update installation scenario (with ownership check)
   */
  router.put(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const scenarioId = String(req.params['id']);
        const existing = await storage.getInstallationScenarioById(scenarioId);
        if (!existing) {
          return res.status(404).json({ error: 'Installation scenario not found' });
        }
        if (existing.userId !== userId) {
          return res.status(403).json({ error: 'Not authorized to update this scenario' });
        }
        const scenario = await storage.updateInstallationScenario(scenarioId, req.body);
        res.json(scenario);
      } catch (err: unknown) {
        logger.error({ module: 'InstallationScenarios', err }, 'Update error');
        res.status(500).json({ error: 'Failed to update installation scenario' });
      }
    }),
  );

  /**
   * DELETE /:id - Delete installation scenario (with ownership check)
   */
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const scenarioId = String(req.params['id']);
        const existing = await storage.getInstallationScenarioById(scenarioId);
        if (!existing) {
          return res.status(404).json({ error: 'Installation scenario not found' });
        }
        if (existing.userId !== userId) {
          return res.status(403).json({ error: 'Not authorized to delete this scenario' });
        }
        await storage.deleteInstallationScenario(scenarioId);
        res.json({ success: true });
      } catch (err: unknown) {
        logger.error({ module: 'InstallationScenarios', err }, 'Delete error');
        res.status(500).json({ error: 'Failed to delete installation scenario' });
      }
    }),
  );

  return router;
};

export const scenariosRouterModule: RouterModule = {
  prefix: '/api/installation-scenarios',
  factory: scenariosRouter,
  description: 'Installation scenarios management',
  endpointCount: 7,
  requiresAuth: true,
  tags: ['scenarios', 'installation', 'products'],
};

// ----- Installation Assistant RAG Router -----

export const installationRAGRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { requireAuth } = ctx.middleware;
  const { installationRAG } = ctx.domainServices;

  /**
   * POST /suggest-steps - AI-powered installation step suggestions
   */
  router.post(
    '/suggest-steps',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const { productId, roomType, includeRelatedProducts, maxSteps } = req.body;

        if (!productId) {
          return res.status(400).json({ error: 'productId is required' });
        }

        const result = await installationRAG.installationScenarioRAG.suggestInstallationSteps({
          productId,
          roomType,
          userId,
          includeRelatedProducts: includeRelatedProducts ?? true,
          maxSteps: maxSteps ?? 10,
        });

        res.json(result);
      } catch (err: unknown) {
        logger.error({ module: 'InstallationRAG', err }, 'Error suggesting steps');
        res.status(500).json({ error: 'Failed to suggest installation steps' });
      }
    }),
  );

  /**
   * GET /room-context/:roomType - Get room-specific installation context
   */
  router.get(
    '/room-context/:roomType',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const roomType = String(req.params['roomType']) as import('../services/installationScenarioRAG').RoomType;

        if (!installationRAG.ROOM_TYPES.includes(roomType)) {
          return res.status(400).json({
            error: `Invalid roomType. Must be one of: ${installationRAG.ROOM_TYPES.join(', ')}`,
          });
        }

        const context = installationRAG.getRoomInstallationContext(roomType);
        res.json(context);
      } catch (err: unknown) {
        logger.error({ module: 'InstallationRAG', err }, 'Error getting room context');
        res.status(500).json({ error: 'Failed to get room context' });
      }
    }),
  );

  /**
   * POST /suggest-accessories - Suggest accessories for installation
   */
  router.post(
    '/suggest-accessories',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const { productId, roomType } = req.body;

        if (!productId) {
          return res.status(400).json({ error: 'productId is required' });
        }

        const accessories = await installationRAG.installationScenarioRAG.suggestAccessories(
          productId,
          roomType,
          userId,
        );

        res.json(accessories);
      } catch (err: unknown) {
        logger.error({ module: 'InstallationRAG', err }, 'Error suggesting accessories');
        res.status(500).json({ error: 'Failed to suggest accessories' });
      }
    }),
  );

  /**
   * POST /tips - Get installation tips
   */
  router.post(
    '/tips',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const { productId, roomType } = req.body;

        if (!productId) {
          return res.status(400).json({ error: 'productId is required' });
        }

        const tips = await installationRAG.installationScenarioRAG.getInstallationTips(productId, roomType, userId);

        res.json(tips);
      } catch (err: unknown) {
        logger.error({ module: 'InstallationRAG', err }, 'Error getting tips');
        res.status(500).json({ error: 'Failed to get installation tips' });
      }
    }),
  );

  return router;
};

export const installationRAGRouterModule: RouterModule = {
  prefix: '/api/installation',
  factory: installationRAGRouter,
  description: 'AI-powered installation assistant (RAG)',
  endpointCount: 4,
  requiresAuth: true,
  tags: ['installation', 'rag', 'ai'],
};
