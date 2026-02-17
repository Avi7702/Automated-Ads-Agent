/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * Catalog Router (File Search)
 * RAG file search and reference file management
 *
 * Endpoints:
 * - POST /api/file-search/initialize - Initialize file search store
 * - POST /api/file-search/upload - Upload reference file
 * - POST /api/file-search/upload-directory - Upload directory of files
 * - GET /api/file-search/files - List reference files
 * - DELETE /api/file-search/files/:fileId - Delete reference file
 * - POST /api/file-search/seed - Seed file search store
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { validate } from '../middleware/validate';
import { catalogFilesQuerySchema } from '../validation/schemas';
import path from 'path';

export const catalogRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { requireAuth } = ctx.middleware;
  const { single: uploadSingle } = ctx.uploads;

  /**
   * POST /initialize - Initialize file search store
   */
  router.post(
    '/initialize',
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const { initializeFileSearchStore } = await import('../services/fileSearchService');
        const store = await initializeFileSearchStore();
        res.json({ success: true, store: { name: store.name, displayName: store.config?.displayName } });
      } catch (error: any) {
        logger.error({ module: 'InitializeFileSearch', err: error }, 'Error initializing file search');
        res.status(500).json({ error: 'Failed to initialize File Search Store' });
      }
    }),
  );

  /**
   * POST /upload - Upload reference file
   */
  router.post(
    '/upload',
    requireAuth,
    uploadSingle('file'),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        if (!req.file) {
          return res.status(400).json({ error: 'No file uploaded' });
        }

        const { category, description, metadata } = req.body;
        if (!category) {
          return res.status(400).json({ error: 'Category is required' });
        }

        // Safely parse metadata JSON
        let parsedMetadata = {};
        if (metadata) {
          try {
            parsedMetadata = JSON.parse(metadata);
          } catch {
            return res.status(400).json({ error: 'Invalid metadata JSON format' });
          }
        }

        const { uploadReferenceFile } = await import('../services/fileSearchService');
        const result = await uploadReferenceFile({
          filePath: req.file.path,
          category,
          description,
          metadata: parsedMetadata,
        });

        res.json({ success: true, file: result });
      } catch (error: any) {
        logger.error({ module: 'UploadReferenceFile', err: error }, 'Error uploading reference file');
        res.status(500).json({ error: 'Failed to upload file' });
      }
    }),
  );

  /**
   * POST /upload-directory - Upload directory of reference files
   */
  router.post(
    '/upload-directory',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { directoryPath, category, description } = req.body;
        if (!directoryPath || !category) {
          return res.status(400).json({ error: 'Directory path and category are required' });
        }

        // BUG-009 fix: Validate directory path to prevent path traversal
        const allowedBaseDir = path.resolve(process.cwd(), 'uploads');
        const resolvedPath = path.resolve(directoryPath);
        if (!resolvedPath.startsWith(allowedBaseDir)) {
          return res.status(400).json({ error: 'Directory path must be within the allowed uploads directory' });
        }

        const { uploadDirectoryToFileSearch } = await import('../services/fileSearchService');
        const results = await uploadDirectoryToFileSearch({
          directoryPath: resolvedPath,
          category,
          description,
        });

        res.json({ success: true, files: results, count: results.length });
      } catch (error: any) {
        logger.error({ module: 'UploadDirectory', err: error }, 'Error uploading directory');
        res.status(500).json({ error: 'Failed to upload directory' });
      }
    }),
  );

  /**
   * GET /files - List reference files
   */
  router.get(
    '/files',
    requireAuth,
    validate(catalogFilesQuerySchema, 'query'),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const validated = (req as any).validatedQuery ?? {};
        const { listReferenceFiles } = await import('../services/fileSearchService');

        const files = await listReferenceFiles(validated.category);
        res.json({ success: true, files, count: files.length });
      } catch (error: any) {
        logger.error({ module: 'ListReferenceFiles', err: error }, 'Error listing reference files');
        res.status(500).json({ error: 'Failed to list files' });
      }
    }),
  );

  /**
   * DELETE /files/:fileId - Delete reference file
   */
  router.delete(
    '/files/:fileId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const fileId = String(req.params['fileId']);
        const { deleteReferenceFile } = await import('../services/fileSearchService');

        await deleteReferenceFile(fileId);
        res.json({ success: true });
      } catch (error: any) {
        logger.error({ module: 'DeleteReferenceFile', err: error }, 'Error deleting reference file');
        res.status(500).json({ error: 'Failed to delete file' });
      }
    }),
  );

  /**
   * POST /seed - Seed file search store with initial structure
   */
  router.post(
    '/seed',
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const { seedFileSearchStore } = await import('../services/fileSearchService');
        const result = await seedFileSearchStore();
        res.json(result);
      } catch (error: any) {
        logger.error({ module: 'SeedFileSearch', err: error }, 'Error seeding file search');
        res.status(500).json({ error: 'Failed to seed File Search Store' });
      }
    }),
  );

  return router;
};

export const catalogRouterModule: RouterModule = {
  prefix: '/api/file-search',
  factory: catalogRouter,
  description: 'RAG file search and reference file management',
  endpointCount: 6,
  requiresAuth: true,
  tags: ['rag', 'files', 'search'],
};
