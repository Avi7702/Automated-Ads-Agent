/**
 * Admin Router
 * Admin-only endpoints for seeding data and managing the system
 * SECURITY: ALL endpoints require authentication
 *
 * Endpoints:
 * - POST /api/admin/seed-brand - Seed brand profile
 * - POST /api/admin/seed-products - Seed products
 * - POST /api/admin/seed-installation-scenarios - Seed installation scenarios
 * - POST /api/admin/seed-relationships - Seed product relationships
 * - POST /api/admin/seed-brand-images - Seed brand images
 * - POST /api/admin/seed-templates - Seed performing templates
 * - POST /api/admin/seed-all - Run all seeds
 * - GET /api/admin/dead-letter-queue - List DLQ jobs with pagination
 * - POST /api/admin/dead-letter-queue/:jobId/retry - Retry a DLQ job
 * - GET /api/admin/scraper/categories - Get scraper categories
 * - POST /api/admin/scraper/scrape-all - Scrape all products
 * - POST /api/admin/scraper/scrape-category/:category - Scrape single category
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const adminRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  // SECURITY: All admin routes require authentication
  router.use(requireAuth);

  /**
   * POST /seed-brand - Seed brand profile
   */
  router.post('/seed-brand', asyncHandler(async (_req: Request, res: Response) => {
    try {
      logger.info({ module: 'Admin' }, 'Force seeding brand profile');
      const { seedBrandProfile } = await import('../seeds/seedBrandProfile');
      await seedBrandProfile();
      res.json({ success: true, message: 'Brand Profile seeded successfully' });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  }));

  /**
   * POST /seed-products - Seed products
   */
  router.post('/seed-products', asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info({ module: 'Admin' }, 'Seeding products');
      const { seedProducts } = await import('../seeds/seedProducts');
      const { sampleOnly, cloudinaryOnly, cloudinaryFolder } = req.body || {};
      const results = await seedProducts({ sampleOnly, cloudinaryOnly, cloudinaryFolder });
      res.json({ success: true, message: 'Products seeded successfully', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Product seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  }));

  /**
   * POST /seed-installation-scenarios - Seed installation scenarios
   */
  router.post('/seed-installation-scenarios', asyncHandler(async (_req: Request, res: Response) => {
    try {
      logger.info({ module: 'Admin' }, 'Seeding installation scenarios');
      const { seedInstallationScenarios } = await import('../seeds/seedInstallationScenarios');
      const results = await seedInstallationScenarios();
      res.json({ success: true, message: 'Installation scenarios seeded successfully', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Installation scenarios seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  }));

  /**
   * POST /seed-relationships - Seed product relationships
   */
  router.post('/seed-relationships', asyncHandler(async (_req: Request, res: Response) => {
    try {
      logger.info({ module: 'Admin' }, 'Seeding product relationships');
      const { seedProductRelationships } = await import('../seeds/seedRelationships');
      const results = await seedProductRelationships();
      res.json({ success: true, message: 'Product relationships seeded successfully', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Relationships seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  }));

  /**
   * POST /seed-brand-images - Seed brand images
   */
  router.post('/seed-brand-images', asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info({ module: 'Admin' }, 'Seeding brand images');
      const { seedBrandImages } = await import('../seeds/seedBrandImages');
      const { sampleOnly, cloudinaryOnly, cloudinaryFolder } = req.body || {};
      const results = await seedBrandImages({ sampleOnly, cloudinaryOnly, cloudinaryFolder });
      res.json({ success: true, message: 'Brand images seeded successfully', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Brand images seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  }));

  /**
   * POST /seed-templates - Seed performing templates
   */
  router.post('/seed-templates', asyncHandler(async (_req: Request, res: Response) => {
    try {
      logger.info({ module: 'Admin' }, 'Seeding performing templates');
      const { seedPerformingTemplates } = await import('../seeds/seedTemplates');
      const results = await seedPerformingTemplates();
      res.json({ success: true, message: 'Performing templates seeded successfully', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Templates seed failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  }));

  /**
   * POST /seed-all - Run all seeds
   */
  router.post('/seed-all', asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info({ module: 'Admin' }, 'Running all seeds');
      const { runAllSeeds } = await import('../seeds/runAllSeeds');
      const options = req.body || {};
      const results = await runAllSeeds(options);
      res.json({ success: true, message: 'All seeds completed', results });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Seed all failed');
      res.status(500).json({ error: 'Seed failed', details: error.message });
    }
  }));

  // =============================================================================
  // Dead Letter Queue (DLQ) Admin Endpoints
  // =============================================================================

  /**
   * GET /dead-letter-queue - List jobs in the Dead Letter Queue
   * Query params: start (default 0), limit (default 20)
   */
  router.get('/dead-letter-queue', asyncHandler(async (req: Request, res: Response) => {
    try {
      const start = parseInt(req.query.start as string) || 0;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const end = start + limit - 1;

      const { listDeadLetterJobs } = await import('../lib/queue');
      const result = await listDeadLetterJobs(start, end);

      res.json({
        success: true,
        data: result.jobs,
        pagination: {
          start,
          limit,
          total: result.total,
          hasMore: start + limit < result.total,
        },
      });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Failed to list DLQ jobs');
      res.status(500).json({ error: 'Failed to list dead letter queue jobs', details: error.message });
    }
  }));

  /**
   * POST /dead-letter-queue/:jobId/retry - Retry a DLQ job
   * Re-adds the job to the original generation queue
   */
  router.post('/dead-letter-queue/:jobId/retry', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { jobId } = req.params;
      if (!jobId) {
        res.status(400).json({ error: 'jobId parameter is required' });
        return;
      }

      const { retryDeadLetterJob } = await import('../lib/queue');
      const result = await retryDeadLetterJob(jobId);

      if (!result.success) {
        res.status(404).json({ error: result.error });
        return;
      }

      res.json({
        success: true,
        message: 'Job re-queued successfully',
        newJobId: result.newJobId,
      });
    } catch (error: any) {
      logger.error({ module: 'Admin', err: error }, 'Failed to retry DLQ job');
      res.status(500).json({ error: 'Failed to retry dead letter queue job', details: error.message });
    }
  }));

  // =============================================================================
  // NDS Website Scraper Endpoints
  // =============================================================================

  /**
   * GET /scraper/categories - Get available categories for scraping
   */
  router.get('/scraper/categories', asyncHandler(async (_req: Request, res: Response) => {
    try {
      const { getAvailableCategories } = await import('../services/ndsWebsiteScraper');
      const categories = getAvailableCategories();
      res.json({ success: true, categories });
    } catch (error: any) {
      logger.error({ module: 'Scraper', err: error }, 'Failed to get categories');
      res.status(500).json({ error: 'Failed to get categories', details: error.message });
    }
  }));

  /**
   * POST /scraper/scrape-all - Scrape all products from NDS website
   */
  router.post('/scraper/scrape-all', asyncHandler(async (req: Request, res: Response) => {
    try {
      logger.info({ module: 'Scraper' }, 'Starting full website scrape');
      const { scrapeNDSWebsite } = await import('../services/ndsWebsiteScraper');
      const { categories, dryRun, limit } = req.body || {};
      const results = await scrapeNDSWebsite({ categories, dryRun, limit });
      res.json({ success: true, message: 'Scraping completed', results });
    } catch (error: any) {
      logger.error({ module: 'Scraper', err: error }, 'Full scrape failed');
      res.status(500).json({ error: 'Scraping failed', details: error.message });
    }
  }));

  /**
   * POST /scraper/scrape-category/:category - Scrape a single category
   */
  router.post('/scraper/scrape-category/:category', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { category } = req.params;
      logger.info({ module: 'Scraper', category }, 'Scraping category');
      const { scrapeSingleCategory } = await import('../services/ndsWebsiteScraper');
      const results = await scrapeSingleCategory(category);
      res.json({ success: true, message: `Category ${category} scraped`, results });
    } catch (error: any) {
      logger.error({ module: 'Scraper', err: error }, 'Category scrape failed');
      res.status(500).json({ error: 'Scraping failed', details: error.message });
    }
  }));

  return router;
};

export const adminRouterModule: RouterModule = {
  prefix: '/api/admin',
  factory: adminRouter,
  description: 'Admin-only endpoints for seeding, system management, and dead letter queue',
  endpointCount: 12,
  requiresAuth: true, // ALL endpoints require auth
  tags: ['admin', 'seeds', 'scraper', 'dlq', 'security-critical']
};
