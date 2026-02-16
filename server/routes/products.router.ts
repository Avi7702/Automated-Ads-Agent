/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Products Router
 * Product management including CRUD, Cloudinary uploads, analysis, and enrichment
 *
 * Endpoints:
 * - POST /api/products - Create product with image upload
 * - GET /api/products - List all products
 * - GET /api/products/:id - Get single product
 * - DELETE /api/products/:id - Delete product
 * - DELETE /api/products - Clear all products
 * - POST /api/products/sync - Sync products from Cloudinary
 * - POST /api/products/:productId/analyze - Vision analysis
 * - GET /api/products/:productId/analysis - Get cached analysis
 * - POST /api/products/:productId/enrich - Generate enrichment draft
 * - POST /api/products/:productId/enrich-from-url - Enrich from URL
 * - GET /api/products/:productId/enrichment - Get enrichment data
 * - POST /api/products/:productId/enrichment/verify - Verify enrichment
 * - GET /api/products/enrichment/pending - Get pending enrichments
 * - GET /api/products/:productId/relationships - Get product relationships
 * - GET /api/products/:productId/relationships/:relationshipType - Get by type
 * - POST /api/products/:productId/suggest-relationships - AI suggestions
 * - POST /api/products/find-similar - Find similar products
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import type { EnrichmentStatus, VerificationInput } from '../services/productEnrichmentService';
import { createRouter, asyncHandler } from './utils/createRouter';
import { validate } from '../middleware/validate';
import { productsEnrichmentQuerySchema } from '../validation/schemas';

export const productsRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, cloudinary, logger } = ctx.services;
  const { visionAnalysis, productKnowledge } = ctx.domainServices;
  const { requireAuth } = ctx.middleware;
  const { single: uploadSingle } = ctx.uploads;

  // Helper to check if Cloudinary is configured
  const isCloudinaryConfigured = (): boolean => {
    return !!(
      process.env['CLOUDINARY_CLOUD_NAME'] &&
      process.env['CLOUDINARY_API_KEY'] &&
      process.env['CLOUDINARY_API_SECRET']
    );
  };

  /**
   * POST / - Create product with image upload
   */
  router.post(
    '/',
    requireAuth,
    uploadSingle('image'),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        if (!isCloudinaryConfigured()) {
          return res.status(503).json({ error: 'Product library is not configured' });
        }

        const file = req.file;
        if (!file) {
          return res.status(400).json({ error: 'No image file provided' });
        }

        // Validate file is an image
        const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return res.status(400).json({ error: 'Only image files are allowed (JPEG, PNG, GIF, WebP)' });
        }

        // Validate file size (10MB max)
        const maxSize = 10 * 1024 * 1024;
        if (file.size > maxSize) {
          return res.status(400).json({ error: 'File size must be less than 10MB' });
        }

        const body = req.body as Record<string, unknown>;
        const name = body['name'] as string | undefined;
        const category = body['category'] as string | undefined;
        if (!name) {
          return res.status(400).json({ error: 'Product name is required' });
        }

        logger.info({ module: 'ProductUpload', productName: name }, 'Uploading to Cloudinary');

        if (!cloudinary) {
          return res.status(503).json({ error: 'Cloudinary not configured' });
        }

        // Upload to Cloudinary using buffer
        const uploadResult = await new Promise<Record<string, unknown>>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'product-library',
              resource_type: 'image',
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as unknown as Record<string, unknown>);
            },
          );
          uploadStream.end(file.buffer);
        });

        // Save product to database
        const product = await storage.saveProduct({
          name,
          cloudinaryUrl: uploadResult['secure_url'] as string,
          cloudinaryPublicId: uploadResult['public_id'] as string,
          category: category || null,
        });

        logger.info({ module: 'ProductUpload', productId: product.id }, 'Saved product');
        res.json(product);
      } catch (error: unknown) {
        logger.error({ module: 'ProductUpload', err: error }, 'Upload error');
        res.status(500).json({ error: 'Failed to upload product' });
      }
    }),
  );

  /**
   * GET / - Get all products
   */
  router.get(
    '/',
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const products = await storage.getProducts();
        res.json(products);
      } catch (error: unknown) {
        logger.error({ module: 'Products', err: error }, 'Error fetching products');
        res.status(500).json({ error: 'Failed to fetch products' });
      }
    }),
  );

  /**
   * GET /enrichment/pending - Get products needing enrichment
   * (Must be before /:id to avoid route conflict)
   */
  router.get(
    '/enrichment/pending',
    validate(productsEnrichmentQuerySchema, 'query'),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const validated =
          ((req as unknown as Record<string, unknown>)['validatedQuery'] as Record<string, unknown> | undefined) ?? {};

        const { productEnrichmentService } = await import('../services/productEnrichmentService');
        const products = await productEnrichmentService.getProductsNeedingEnrichment(
          validated['status'] as EnrichmentStatus | undefined,
        );

        // Return with completeness info
        const productsWithInfo = products.map((product) => ({
          ...product,
          completeness: productEnrichmentService.getEnrichmentCompleteness(product),
          isReady: productEnrichmentService.isProductReady(product),
        }));

        res.json({ products: productsWithInfo });
      } catch (error: unknown) {
        logger.error({ module: 'ProductsPendingEnrichment', err: error }, 'Error fetching products pending enrichment');
        res.status(500).json({ error: 'Failed to get products needing enrichment' });
      }
    }),
  );

  /**
   * POST /sync - Sync products from Cloudinary
   */
  router.post(
    '/sync',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        if (!isCloudinaryConfigured() || !cloudinary) {
          return res.status(503).json({ error: 'Cloudinary is not configured' });
        }

        logger.info({ module: 'CloudinarySync' }, 'Starting sync');

        const body = req.body as Record<string, unknown>;

        // Fetch all images from Cloudinary (max 500 for now)
        const result = await cloudinary.api.resources({
          type: 'upload',
          resource_type: 'image',
          max_results: 500,
          prefix: (body['folder'] as string) || '', // Optional folder filter
        });

        logger.info({ module: 'CloudinarySync', imageCount: result.resources.length }, 'Found images');

        // Get existing products to avoid duplicates
        const existingProducts = await storage.getProducts();
        const existingPublicIds = new Set(existingProducts.map((p) => p.cloudinaryPublicId));

        let imported = 0;
        let skipped = 0;

        // Import each image
        for (const resource of result.resources) {
          // Skip if already in database
          if (existingPublicIds.has(resource.public_id)) {
            skipped++;
            continue;
          }

          // Extract name from public_id (e.g., "product-library/bottle" -> "bottle")
          const nameParts = resource.public_id.split('/');
          const name = nameParts[nameParts.length - 1] || resource.public_id;

          // Save to database
          await storage.saveProduct({
            name: name,
            cloudinaryUrl: resource.secure_url,
            cloudinaryPublicId: resource.public_id,
            category: null, // User can update later
          });

          imported++;
        }

        logger.info({ module: 'CloudinarySync', imported, skipped }, 'Sync complete');

        res.json({
          success: true,
          imported,
          skipped,
          total: result.resources.length,
        });
      } catch (error: unknown) {
        logger.error({ module: 'CloudinarySync', err: error }, 'Sync error');
        res.status(500).json({ error: 'Failed to sync from Cloudinary' });
      }
    }),
  );

  /**
   * POST /find-similar - Find similar products
   */
  router.post(
    '/find-similar',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const body = req.body as Record<string, unknown>;
        const productId = body['productId'] as string | undefined;
        const maxResults = body['maxResults'] as number | undefined;
        const minSimilarity = body['minSimilarity'] as number | undefined;

        if (!productId) {
          return res.status(400).json({ error: 'productId is required' });
        }

        // Get the product first
        const product = await storage.getProductById(productId);
        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        const { findSimilarProducts } = await import('../services/relationshipDiscoveryRAG');
        const similar = await findSimilarProducts(product, {
          maxResults: maxResults ?? 10,
          minSimilarity: minSimilarity ?? 30,
        });

        res.json(similar);
      } catch (error: unknown) {
        logger.error({ module: 'RelationshipRAG', err: error }, 'Error finding similar products');
        res.status(500).json({ error: 'Failed to find similar products' });
      }
    }),
  );

  /**
   * GET /:id - Get single product
   */
  router.get(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const product = await storage.getProductById(String(req.params['id'] ?? ''));
        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
      } catch (error: unknown) {
        logger.error({ module: 'Product', err: error }, 'Error fetching product');
        res.status(500).json({ error: 'Failed to fetch product' });
      }
    }),
  );

  /**
   * DELETE /:id - Delete product
   */
  router.delete(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const product = await storage.getProductById(String(req.params['id'] ?? ''));
        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        const productId = String(req.params['id'] ?? '');

        // Delete from Cloudinary
        if (cloudinary && product.cloudinaryPublicId) {
          await cloudinary.uploader.destroy(product.cloudinaryPublicId);
        }

        // Invalidate all caches for this product
        await Promise.all([
          visionAnalysis.invalidateAnalysisCache(productId),
          productKnowledge.invalidateProductKnowledgeCache(productId),
        ]);
        logger.info({ module: 'DeleteProduct', productId }, 'Product caches invalidated');

        // Delete from database
        await storage.deleteProduct(productId);

        res.json({ success: true });
      } catch (error: unknown) {
        logger.error({ module: 'DeleteProduct', err: error }, 'Error deleting product');
        res.status(500).json({ error: 'Failed to delete product' });
      }
    }),
  );

  /**
   * DELETE / - Clear all products
   */
  router.delete(
    '/',
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const products = await storage.getProducts();
        const productIds = products.map((p) => p.id);

        // Invalidate all caches for products being deleted
        if (productIds.length > 0) {
          await Promise.all([
            ...productIds.map((id) => visionAnalysis.invalidateAnalysisCache(id)),
            productKnowledge.invalidateMultiProductKnowledgeCache(productIds),
          ]);
          logger.info({ module: 'ClearProducts', productCount: productIds.length }, 'Product caches invalidated');
        }

        for (const product of products) {
          await storage.deleteProduct(product.id);
        }

        logger.info({ module: 'Products', clearedCount: products.length }, 'Cleared products from database');
        res.json({ success: true, deleted: products.length });
      } catch (error: unknown) {
        logger.error({ module: 'ClearProducts', err: error }, 'Error clearing products');
        res.status(500).json({ error: 'Failed to clear products' });
      }
    }),
  );

  /**
   * POST /:productId/analyze - Analyze product image with vision AI
   */
  router.post(
    '/:productId/analyze',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = String(req.params['productId'] ?? '');
        const userId = (req.session as unknown as Record<string, unknown>)['userId'] as string;
        const body = (req.body || {}) as Record<string, unknown>;
        const forceRefresh = body['forceRefresh'] as boolean | undefined;

        const product = await storage.getProductById(productId);

        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        const result = await visionAnalysis.analyzeProductImage(product, userId, forceRefresh);

        if (!result.success) {
          const statusCode = result.error.code === 'RATE_LIMITED' ? 429 : 500;
          return res.status(statusCode).json({ error: result.error.message, code: result.error.code });
        }

        res.json({
          analysis: result.analysis,
          fromCache: !forceRefresh,
        });
      } catch (error: unknown) {
        logger.error({ module: 'ProductAnalyze', err: error }, 'Error analyzing product');
        res.status(500).json({ error: 'Failed to analyze product' });
      }
    }),
  );

  /**
   * GET /:productId/analysis - Get cached analysis for a product
   */
  router.get(
    '/:productId/analysis',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = String(req.params['productId'] ?? '');

        const analysis = await visionAnalysis.getCachedAnalysis(productId);

        if (!analysis) {
          return res.status(404).json({ error: 'No analysis found for this product' });
        }

        res.json({ analysis });
      } catch (error: unknown) {
        logger.error({ module: 'ProductAnalysisGet', err: error }, 'Error getting product analysis');
        res.status(500).json({ error: 'Failed to get product analysis' });
      }
    }),
  );

  /**
   * POST /:productId/enrich - Generate enrichment draft
   */
  router.post(
    '/:productId/enrich',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = String(req.params['productId'] ?? '');
        const userId = ((req.session as unknown as Record<string, unknown>)['userId'] as string) ?? '';

        const { productEnrichmentService } = await import('../services/productEnrichmentService');
        const result = await productEnrichmentService.generateEnrichmentDraft(productId, userId);

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        res.json({
          success: true,
          productId: result.productId,
          draft: result.draft,
        });
      } catch (error: unknown) {
        logger.error({ module: 'ProductEnrichment', err: error }, 'Error enriching product');
        res.status(500).json({ error: 'Failed to generate enrichment draft' });
      }
    }),
  );

  /**
   * POST /:productId/enrich-from-url - Enrich from URL
   */
  router.post(
    '/:productId/enrich-from-url',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = String(req.params['productId'] ?? '');
        const body = req.body as Record<string, unknown>;
        const productUrl = body['productUrl'];

        if (!productUrl || typeof productUrl !== 'string') {
          return res.status(400).json({ error: 'Product URL is required' });
        }

        // Validate URL format
        try {
          new URL(productUrl);
        } catch {
          return res.status(400).json({ error: 'Invalid URL format' });
        }

        const { enrichFromUrl, saveEnrichmentDraft } = await import('../services/enrichmentServiceWithUrl');
        const result = await enrichFromUrl({ productId, productUrl });

        if (!result.success || !result.enrichmentDraft) {
          return res.status(400).json({ error: result.error || 'Failed to enrich from URL' });
        }

        // Save the draft to the product
        await saveEnrichmentDraft(productId, result.enrichmentDraft);

        res.json({
          success: true,
          productId: result.productId,
          draft: result.enrichmentDraft,
        });
      } catch (error: unknown) {
        logger.error({ module: 'URLEnrichment', err: error }, 'Error enriching from URL');
        res.status(500).json({ error: 'Failed to enrich product from URL' });
      }
    }),
  );

  /**
   * GET /:productId/enrichment - Get enrichment data
   */
  router.get(
    '/:productId/enrichment',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = String(req.params['productId'] ?? '');
        const product = await storage.getProductById(productId);

        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        const { productEnrichmentService } = await import('../services/productEnrichmentService');
        const completeness = productEnrichmentService.getEnrichmentCompleteness(product);

        res.json({
          productId,
          status: product.enrichmentStatus || 'pending',
          draft: product.enrichmentDraft,
          verifiedAt: product.enrichmentVerifiedAt,
          source: product.enrichmentSource,
          completeness,
          isReady: productEnrichmentService.isProductReady(product),
        });
      } catch (error: unknown) {
        logger.error({ module: 'ProductEnrichmentGet', err: error }, 'Error getting product enrichment');
        res.status(500).json({ error: 'Failed to get enrichment data' });
      }
    }),
  );

  /**
   * POST /:productId/enrichment/verify - Verify enrichment
   */
  router.post(
    '/:productId/enrichment/verify',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = String(req.params['productId'] ?? '');
        const userId = ((req.session as unknown as Record<string, unknown>)['userId'] as string) ?? '';
        const body = req.body as Record<string, unknown>;

        const verificationInput: VerificationInput = { productId };
        if (body['description'] != null) verificationInput.description = body['description'] as string;
        if (body['features'] != null)
          verificationInput.features = body['features'] as Record<string, string | string[]>;
        if (body['benefits'] != null) verificationInput.benefits = body['benefits'] as string[];
        if (body['specifications'] != null)
          verificationInput.specifications = body['specifications'] as Record<string, string>;
        if (body['tags'] != null) verificationInput.tags = body['tags'] as string[];
        if (body['sku'] != null) verificationInput.sku = body['sku'] as string;
        if (body['approvedAsIs'] != null) verificationInput.approvedAsIs = body['approvedAsIs'] as boolean;

        const { productEnrichmentService } = await import('../services/productEnrichmentService');
        const result = await productEnrichmentService.verifyEnrichment(verificationInput, userId);

        if (!result.success) {
          return res.status(400).json({ error: result.error });
        }

        res.json({ success: true, message: 'Product enrichment verified' });
      } catch (error: unknown) {
        logger.error({ module: 'ProductEnrichmentVerify', err: error }, 'Error verifying product enrichment');
        res.status(500).json({ error: 'Failed to verify enrichment' });
      }
    }),
  );

  /**
   * GET /:productId/relationships - Get product relationships
   */
  router.get(
    '/:productId/relationships',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const relationships = await storage.getProductRelationships([String(req.params['productId'] ?? '')]);
        res.json(relationships);
      } catch (error: unknown) {
        logger.error({ module: 'ProductRelationships', err: error }, 'Get error');
        res.status(500).json({ error: 'Failed to get product relationships' });
      }
    }),
  );

  /**
   * GET /:productId/relationships/:relationshipType - Get by type
   */
  router.get(
    '/:productId/relationships/:relationshipType',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const relationships = await storage.getProductRelationshipsByType(
          String(req.params['productId'] ?? ''),
          String(req.params['relationshipType'] ?? ''),
        );
        res.json(relationships);
      } catch (error: unknown) {
        logger.error({ module: 'ProductRelationships', err: error }, 'Get by type error');
        res.status(500).json({ error: 'Failed to get product relationships' });
      }
    }),
  );

  /**
   * POST /:productId/suggest-relationships - AI-powered relationship suggestions
   */
  router.post(
    '/:productId/suggest-relationships',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as unknown as Record<string, unknown>)['userId'] as string;
        const productId = String(req.params['productId'] ?? '');
        const body = req.body as Record<string, unknown>;
        const maxSuggestions = body['maxSuggestions'] as number | undefined;
        const minScore = body['minScore'] as number | undefined;
        const includeExisting = body['includeExisting'] as boolean | undefined;

        const { suggestRelationships } = await import('../services/relationshipDiscoveryRAG');
        const suggestions = await suggestRelationships(productId, userId, {
          maxSuggestions: maxSuggestions ?? 10,
          minScore: minScore ?? 50,
          includeExisting: includeExisting ?? false,
        });

        res.json(suggestions);
      } catch (error: unknown) {
        logger.error({ module: 'RelationshipRAG', err: error }, 'Error suggesting relationships');
        res.status(500).json({ error: 'Failed to suggest relationships' });
      }
    }),
  );

  return router;
};

export const productsRouterModule: RouterModule = {
  prefix: '/api/products',
  factory: productsRouter,
  description: 'Product management, analysis, and enrichment',
  endpointCount: 17,
  requiresAuth: false, // Mixed - some require auth
  tags: ['products', 'cloudinary', 'vision', 'enrichment'],
};
