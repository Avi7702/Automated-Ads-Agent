/**
 * Relationships Router
 * Product relationships CRUD and AI-powered relationship discovery
 *
 * Endpoints:
 * - POST /api/product-relationships - Create relationship
 * - DELETE /api/product-relationships/:id - Delete relationship
 * - POST /api/product-relationships/bulk - Bulk get relationships
 * - POST /api/relationships/analyze - Analyze relationship between products
 * - POST /api/relationships/batch-suggest - Batch suggest relationships
 * - POST /api/relationships/auto-create - Auto-create relationships
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const productRelationshipsRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth, validate } = ctx.middleware;
  const { insertProductRelationship } = ctx.schemas;

  /**
   * POST / - Create product relationship
   */
  router.post('/', requireAuth, validate(insertProductRelationship), asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const { sourceProductId, targetProductId } = req.body;

      // Prevent self-relationships
      if (sourceProductId === targetProductId) {
        return res.status(400).json({ error: 'Cannot create a relationship between a product and itself' });
      }

      const relationship = await storage.createProductRelationship({
        ...req.body,
        userId,
      });
      res.status(201).json(relationship);
    } catch (error: any) {
      logger.error({ module: 'ProductRelationships', err: error }, 'Create error');
      if (error.code === '23505') { // Unique constraint violation
        return res.status(409).json({ error: 'This relationship already exists' });
      }
      res.status(500).json({ error: 'Failed to create product relationship' });
    }
  }));

  /**
   * DELETE /:id - Delete product relationship
   */
  router.delete('/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    try {
      await storage.deleteProductRelationship(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      logger.error({ module: 'ProductRelationships', err: error }, 'Delete error');
      res.status(500).json({ error: 'Failed to delete product relationship' });
    }
  }));

  /**
   * POST /bulk - Bulk get relationships for multiple products
   */
  router.post('/bulk', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    try {
      const { productIds } = req.body;
      if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ error: 'productIds array is required' });
      }
      const relationships = await storage.getProductRelationships(productIds);
      res.json(relationships);
    } catch (error: any) {
      logger.error({ module: 'ProductRelationships', err: error }, 'Bulk get error');
      res.status(500).json({ error: 'Failed to get product relationships' });
    }
  }));

  return router;
};

export const relationshipsRAGRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  /**
   * POST /analyze - Analyze relationship between two products
   */
  router.post('/analyze', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    try {
      const { sourceProductId, targetProductId } = req.body;

      if (!sourceProductId || !targetProductId) {
        return res.status(400).json({ error: 'sourceProductId and targetProductId are required' });
      }

      const { analyzeRelationshipType } = await import('../services/relationshipDiscoveryRAG');
      const analysis = await analyzeRelationshipType(sourceProductId, targetProductId);
      res.json(analysis);
    } catch (error: any) {
      logger.error({ module: 'RelationshipRAG', err: error }, 'Error analyzing relationship');
      res.status(500).json({ error: 'Failed to analyze relationship' });
    }
  }));

  /**
   * POST /batch-suggest - Batch suggest relationships for multiple products
   */
  router.post('/batch-suggest', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const { productIds } = req.body;

      if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'productIds array is required' });
      }

      const { batchSuggestRelationships } = await import('../services/relationshipDiscoveryRAG');
      const suggestions = await batchSuggestRelationships(productIds, userId);
      res.json(suggestions);
    } catch (error: any) {
      logger.error({ module: 'RelationshipRAG', err: error }, 'Error batch suggesting');
      res.status(500).json({ error: 'Failed to batch suggest relationships' });
    }
  }));

  /**
   * POST /auto-create - Auto-create relationships based on AI suggestions
   */
  router.post('/auto-create', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    try {
      const userId = (req.session as any).userId;
      const { productId, minScore, maxToCreate, dryRun } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'productId is required' });
      }

      const { autoCreateRelationships } = await import('../services/relationshipDiscoveryRAG');
      const result = await autoCreateRelationships(productId, userId, {
        minScore: minScore ?? 70,
        maxToCreate: maxToCreate ?? 5,
        dryRun: dryRun ?? false,
      });

      res.json(result);
    } catch (error: any) {
      logger.error({ module: 'RelationshipRAG', err: error }, 'Error auto-creating relationships');
      res.status(500).json({ error: 'Failed to auto-create relationships' });
    }
  }));

  return router;
};

export const productRelationshipsRouterModule: RouterModule = {
  prefix: '/api/product-relationships',
  factory: productRelationshipsRouter,
  description: 'Product relationships CRUD operations',
  endpointCount: 3,
  requiresAuth: true,
  tags: ['products', 'relationships']
};

export const relationshipsRAGRouterModule: RouterModule = {
  prefix: '/api/relationships',
  factory: relationshipsRAGRouter,
  description: 'AI-powered relationship discovery and analysis',
  endpointCount: 3,
  requiresAuth: true,
  tags: ['ai', 'relationships', 'rag']
};
