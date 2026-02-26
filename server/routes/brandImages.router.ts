/**
 * Brand Images Router
 * Brand image management and AI-powered recommendation endpoints
 *
 * Endpoints:
 * - POST /api/brand-images - Upload brand image
 * - GET /api/brand-images - List all brand images
 * - GET /api/brand-images/category/:category - Get by category
 * - POST /api/brand-images/for-products - Get images for products
 * - PUT /api/brand-images/:id - Update brand image
 * - DELETE /api/brand-images/:id - Delete brand image
 * - POST /api/brand-images/recommend - AI-powered image recommendations
 * - POST /api/brand-images/match-product/:productId - Match images to a product
 * - POST /api/brand-images/suggest-category - Suggest image categories
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import type { UploadApiResponse } from 'cloudinary';
import { createRouter, asyncHandler } from './utils/createRouter';

export const brandImagesRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth } = ctx.middleware;
  const { single: uploadSingle } = ctx.uploads;

  /**
   * POST / - Upload brand image
   */
  router.post(
    '/',
    uploadSingle('image'),
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const file = req.file;

        if (!file) {
          return res.status(400).json({ error: 'Image file is required' });
        }

        // Upload to Cloudinary
        const cloudinary = (await import('cloudinary')).v2;
        cloudinary.config({
          cloud_name: process.env['CLOUDINARY_CLOUD_NAME'] ?? '',
          api_key: process.env['CLOUDINARY_API_KEY'] ?? '',
          api_secret: process.env['CLOUDINARY_API_SECRET'] ?? '',
        });

        const uploadResult = await new Promise<UploadApiResponse>((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              {
                folder: 'brand-images',
                resource_type: 'image',
              },
              (error, result) => {
                if (error) reject(error);
                else if (result) resolve(result);
                else reject(new Error('Upload returned no result'));
              },
            )
            .end(file.buffer);
        });

        // Parse metadata from body
        // Valid categories: historical_ad, product_hero, installation, detail, lifestyle, comparison
        const validCategories = ['historical_ad', 'product_hero', 'installation', 'detail', 'lifestyle', 'comparison'];
        const category = validCategories.includes(req.body.category) ? req.body.category : 'product_hero';
        const tags = req.body.tags ? (JSON.parse(req.body.tags) as string[]) : [];
        const productIds = req.body.productIds ? (JSON.parse(req.body.productIds) as string[]) : [];
        const suggestedUse = req.body.suggestedUse ? (JSON.parse(req.body.suggestedUse) as string[]) : [];

        // Create database record
        const brandImage = await storage.createBrandImage({
          userId,
          cloudinaryUrl: uploadResult.secure_url,
          cloudinaryPublicId: uploadResult.public_id,
          category,
          tags,
          description: req.body.description || null,
          productIds,
          scenarioId: req.body.scenarioId || null,
          suggestedUse,
          aspectRatio: req.body.aspectRatio || null,
        });

        res.status(201).json(brandImage);
      } catch (err: unknown) {
        logger.error({ module: 'BrandImages', err }, 'Upload error');
        res.status(500).json({ error: 'Failed to upload brand image' });
      }
    }),
  );

  /**
   * GET / - Get all brand images for user
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
        const images = await (
          storage as unknown as { getBrandImagesByUser(userId: string): Promise<unknown[]> }
        ).getBrandImagesByUser(userId);
        res.json(images);
      } catch (err: unknown) {
        logger.error({ module: 'BrandImages', err }, 'List error');
        res.status(500).json({ error: 'Failed to get brand images' });
      }
    }),
  );

  /**
   * GET /category/:category - Get brand images by category
   */
  router.get(
    '/category/:category',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const images = await storage.getBrandImagesByCategory(userId, String(req.params['category']));
        res.json(images);
      } catch (err: unknown) {
        logger.error({ module: 'BrandImages', err }, 'Category query error');
        res.status(500).json({ error: 'Failed to get brand images by category' });
      }
    }),
  );

  /**
   * POST /for-products - Get brand images for specific products
   */
  router.post(
    '/for-products',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const { productIds } = req.body;
        if (!productIds || !Array.isArray(productIds)) {
          return res.status(400).json({ error: 'productIds array is required' });
        }
        const images = await storage.getBrandImagesForProducts(productIds, userId);
        res.json(images);
      } catch (err: unknown) {
        logger.error({ module: 'BrandImages', err }, 'Products query error');
        res.status(500).json({ error: 'Failed to get brand images for products' });
      }
    }),
  );

  /**
   * PUT /:id - Update brand image
   */
  router.put(
    '/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const image = await storage.updateBrandImage(String(req.params['id']), req.body);
        res.json(image);
      } catch (err: unknown) {
        logger.error({ module: 'BrandImages', err }, 'Update error');
        res.status(500).json({ error: 'Failed to update brand image' });
      }
    }),
  );

  /**
   * DELETE /:id - Delete brand image
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
        // Get the image to delete from Cloudinary
        const imageId = String(req.params['id']);
        const images = await (
          storage as unknown as {
            getBrandImagesByUser(userId: string): Promise<Array<{ id: string; cloudinaryPublicId: string }>>;
          }
        ).getBrandImagesByUser(userId);
        const imageToDelete = images.find((img) => img.id === imageId);

        if (imageToDelete) {
          // Delete from Cloudinary
          const cloudinary = (await import('cloudinary')).v2;
          cloudinary.config({
            cloud_name: process.env['CLOUDINARY_CLOUD_NAME'] ?? '',
            api_key: process.env['CLOUDINARY_API_KEY'] ?? '',
            api_secret: process.env['CLOUDINARY_API_SECRET'] ?? '',
          });

          try {
            await cloudinary.uploader.destroy(imageToDelete.cloudinaryPublicId);
          } catch (cloudinaryError: unknown) {
            logger.warn({ module: 'BrandImages', err: cloudinaryError }, 'Cloudinary delete warning');
            // Continue with database deletion even if Cloudinary fails
          }
        }

        await storage.deleteBrandImage(imageId);
        res.json({ success: true });
      } catch (err: unknown) {
        logger.error({ module: 'BrandImages', err }, 'Delete error');
        res.status(500).json({ error: 'Failed to delete brand image' });
      }
    }),
  );

  // ----- Brand Image Recommendation RAG -----

  /**
   * POST /recommend - AI-powered image recommendations
   */
  router.post(
    '/recommend',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const { productIds, useCase, platform, mood, maxResults, aspectRatio, categoryFilter } = req.body;

        if (!useCase) {
          return res.status(400).json({ error: 'useCase is required' });
        }

        const recommendations = await ctx.domainServices.brandImageRAG.recommendImages({
          productIds,
          useCase,
          platform,
          mood,
          userId,
          maxResults: maxResults ?? 10,
          aspectRatio,
          categoryFilter,
        });

        res.json(recommendations);
      } catch (err: unknown) {
        logger.error({ module: 'BrandImageRAG', err }, 'Error recommending images');
        res.status(500).json({ error: 'Failed to recommend images' });
      }
    }),
  );

  /**
   * POST /match-product/:productId - Match images to a specific product
   */
  router.post(
    '/match-product/:productId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Not authenticated' });
        }
        const productId = String(req.params['productId']);
        const { maxResults, categoryFilter } = req.body;

        const matches = await ctx.domainServices.brandImageRAG.matchImagesForProduct(productId, userId, {
          maxResults: maxResults ?? 10,
          categoryFilter,
        });

        res.json(matches);
      } catch (err: unknown) {
        logger.error({ module: 'BrandImageRAG', err }, 'Error matching images');
        res.status(500).json({ error: 'Failed to match images for product' });
      }
    }),
  );

  /**
   * POST /suggest-category - Suggest image categories based on use case
   */
  router.post(
    '/suggest-category',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { useCase, platform, mood, maxSuggestions } = req.body;

        if (!useCase) {
          return res.status(400).json({ error: 'useCase is required' });
        }

        const suggestions = ctx.domainServices.brandImageRAG.suggestImageCategory(useCase, {
          platform,
          mood,
          maxSuggestions,
        });

        res.json(suggestions);
      } catch (err: unknown) {
        logger.error({ module: 'BrandImageRAG', err }, 'Error suggesting category');
        res.status(500).json({ error: 'Failed to suggest image category' });
      }
    }),
  );

  return router;
};

export const brandImagesRouterModule: RouterModule = {
  prefix: '/api/brand-images',
  factory: brandImagesRouter,
  description: 'Brand image management and AI recommendations',
  endpointCount: 9,
  requiresAuth: true,
  tags: ['brand', 'images', 'uploads', 'rag'],
};
