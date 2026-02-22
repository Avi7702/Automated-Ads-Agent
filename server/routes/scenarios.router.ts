/**
 * Scenarios Router
 * Installation scenarios management endpoints
 *
 * Endpoints:
 * - POST /api/installation-scenarios - Create scenario
 * - GET /api/installation-scenarios - List scenarios
 * - GET /api/installation-scenarios/room-type/:roomType - Get by room type
 * - POST /api/installation-scenarios/for-products - Get for products
 * - GET /api/installation-scenarios/:id - Get single scenario
 * - PUT /api/installation-scenarios/:id - Update scenario
 * - DELETE /api/installation-scenarios/:id - Delete scenario
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
        const userId = (req.session as any).userId;
        const scenario = await storage.createInstallationScenario({
          ...req.body,
          userId,
        });
        res.status(201).json(scenario);
      } catch (error: any) {
        logger.error({ module: 'InstallationScenarios', err: error }, 'Create error');
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
        const userId = (req.session as any).userId;
        const scenarios = await (
          storage as unknown as { getInstallationScenariosByUser(userId: string): Promise<unknown[]> }
        ).getInstallationScenariosByUser(userId);
        res.json(scenarios);
      } catch (error: any) {
        logger.error({ module: 'InstallationScenarios', err: error }, 'List error');
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
      } catch (error: any) {
        logger.error({ module: 'InstallationScenarios', err: error }, 'Room type query error');
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
      } catch (error: any) {
        logger.error({ module: 'InstallationScenarios', err: error }, 'Products query error');
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
      } catch (error: any) {
        logger.error({ module: 'InstallationScenarios', err: error }, 'Get error');
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
        const userId = (req.session as any).userId;
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
      } catch (error: any) {
        logger.error({ module: 'InstallationScenarios', err: error }, 'Update error');
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
        const userId = (req.session as any).userId;
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
      } catch (error: any) {
        logger.error({ module: 'InstallationScenarios', err: error }, 'Delete error');
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
