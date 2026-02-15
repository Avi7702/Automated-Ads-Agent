// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Model Training Router
 * Custom model fine-tuning management
 *
 * Endpoints:
 * - GET /api/training/datasets - List user's training datasets
 * - POST /api/training/datasets - Create a new dataset
 * - GET /api/training/datasets/:id - Get dataset with examples
 * - POST /api/training/datasets/:id/examples - Add training examples
 * - DELETE /api/training/datasets/:id/examples/:exampleId - Remove example
 * - POST /api/training/datasets/:id/start - Start tuning job
 * - GET /api/training/datasets/:id/status - Check tuning status
 * - GET /api/training/models - List tuned models
 * - DELETE /api/training/models/:name - Delete a tuned model
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import {
  createTuningJob,
  getTuningJobStatus,
  listTunedModels,
  deleteTunedModel,
} from '../services/modelTrainingService';

export const trainingRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  /**
   * GET /datasets - List user's training datasets
   */
  router.get(
    '/datasets',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const datasets = await storage.getTrainingDatasetsByUser(userId);
        res.json(datasets);
      } catch (error: any) {
        logger.error({ module: 'Training', err: error }, 'List datasets error');
        res.status(500).json({ error: 'Failed to list training datasets' });
      }
    }),
  );

  /**
   * POST /datasets - Create a new training dataset
   */
  router.post(
    '/datasets',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const { name, description, baseModel } = req.body;

        if (!name || name.trim().length === 0) {
          return res.status(400).json({ error: 'Dataset name is required' });
        }

        const dataset = await storage.createTrainingDataset({
          userId,
          name: name.trim(),
          description: description || null,
          baseModel: baseModel || 'gemini-3-flash',
          status: 'draft',
        });

        res.status(201).json(dataset);
      } catch (error: any) {
        logger.error({ module: 'Training', err: error }, 'Create dataset error');
        res.status(500).json({ error: 'Failed to create training dataset' });
      }
    }),
  );

  /**
   * GET /datasets/:id - Get dataset with example count
   */
  router.get(
    '/datasets/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const dataset = await storage.getTrainingDatasetById(req.params.id);

        if (!dataset || dataset.userId !== userId) {
          return res.status(404).json({ error: 'Training dataset not found' });
        }

        const examples = await storage.getTrainingExamples(req.params.id);

        res.json({ ...dataset, examples });
      } catch (error: any) {
        logger.error({ module: 'Training', err: error }, 'Get dataset error');
        res.status(500).json({ error: 'Failed to get training dataset' });
      }
    }),
  );

  /**
   * POST /datasets/:id/examples - Add training examples
   */
  router.post(
    '/datasets/:id/examples',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const dataset = await storage.getTrainingDatasetById(req.params.id);

        if (!dataset || dataset.userId !== userId) {
          return res.status(404).json({ error: 'Training dataset not found' });
        }

        const { examples } = req.body;
        if (!Array.isArray(examples) || examples.length === 0) {
          return res.status(400).json({ error: 'At least one example is required' });
        }

        const created = [];
        for (const ex of examples) {
          if (!ex.inputText || !ex.outputText) continue;

          const example = await storage.createTrainingExample({
            datasetId: req.params.id,
            inputText: ex.inputText,
            outputText: ex.outputText,
            category: ex.category || null,
            quality: ex.quality || null,
            sourceGenerationId: ex.sourceGenerationId || null,
          });
          created.push(example);
        }

        // Update example count
        await storage.updateTrainingDataset(req.params.id, {
          exampleCount: (dataset.exampleCount || 0) + created.length,
        });

        res.status(201).json({ added: created.length, examples: created });
      } catch (error: any) {
        logger.error({ module: 'Training', err: error }, 'Add examples error');
        res.status(500).json({ error: 'Failed to add training examples' });
      }
    }),
  );

  /**
   * DELETE /datasets/:id/examples/:exampleId - Remove an example
   */
  router.delete(
    '/datasets/:id/examples/:exampleId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const dataset = await storage.getTrainingDatasetById(req.params.id);

        if (!dataset || dataset.userId !== userId) {
          return res.status(404).json({ error: 'Training dataset not found' });
        }

        await storage.deleteTrainingExample(req.params.exampleId);

        // Update count
        await storage.updateTrainingDataset(req.params.id, {
          exampleCount: Math.max(0, (dataset.exampleCount || 0) - 1),
        });

        res.json({ success: true });
      } catch (error: any) {
        logger.error({ module: 'Training', err: error }, 'Delete example error');
        res.status(500).json({ error: 'Failed to delete training example' });
      }
    }),
  );

  /**
   * POST /datasets/:id/start - Start a tuning job
   */
  router.post(
    '/datasets/:id/start',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const dataset = await storage.getTrainingDatasetById(req.params.id);

        if (!dataset || dataset.userId !== userId) {
          return res.status(404).json({ error: 'Training dataset not found' });
        }

        if (dataset.status === 'training') {
          return res.status(400).json({ error: 'Training is already in progress' });
        }

        const examples = await storage.getTrainingExamples(req.params.id);
        if (examples.length < 10) {
          return res.status(400).json({ error: 'At least 10 training examples are required' });
        }

        // Format examples
        const trainingExamples = examples.map((ex) => ({
          input: ex.inputText,
          output: ex.outputText,
        }));

        const config = req.body.config || {};

        const { jobName, tunedModelName } = await createTuningJob(
          `${dataset.name}-${Date.now()}`,
          trainingExamples,
          config,
        );

        // Update dataset status
        await storage.updateTrainingDataset(req.params.id, {
          status: 'training',
          tunedModelName: tunedModelName || null,
          trainingConfig: config,
          startedAt: new Date(),
        });

        res.json({
          success: true,
          jobName,
          tunedModelName,
          message: 'Tuning job started. Poll /api/training/datasets/:id/status for progress.',
        });
      } catch (error: any) {
        logger.error({ module: 'Training', err: error }, 'Start tuning error');
        res.status(500).json({ error: error.message || 'Failed to start tuning job' });
      }
    }),
  );

  /**
   * GET /datasets/:id/status - Check tuning job status
   */
  router.get(
    '/datasets/:id/status',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req.session as any).userId;
        const dataset = await storage.getTrainingDatasetById(req.params.id);

        if (!dataset || dataset.userId !== userId) {
          return res.status(404).json({ error: 'Training dataset not found' });
        }

        if (!dataset.tunedModelName) {
          return res.json({ status: dataset.status, message: 'No tuning job has been started' });
        }

        // If we have a job name stored in trainingConfig, poll it
        const jobName = (dataset.trainingConfig as any)?.jobName;
        if (jobName) {
          const status = await getTuningJobStatus(jobName);

          if (status.state === 'ACTIVE' && dataset.status !== 'completed') {
            await storage.updateTrainingDataset(req.params.id, {
              status: 'completed',
              completedAt: new Date(),
              trainingMetrics: status.metadata,
            });
          } else if (status.error && dataset.status !== 'failed') {
            await storage.updateTrainingDataset(req.params.id, {
              status: 'failed',
              errorMessage: status.error,
            });
          }

          return res.json(status);
        }

        res.json({ status: dataset.status });
      } catch (error: any) {
        logger.error({ module: 'Training', err: error }, 'Check status error');
        res.status(500).json({ error: 'Failed to check tuning status' });
      }
    }),
  );

  /**
   * GET /models - List tuned models
   */
  router.get(
    '/models',
    requireAuth,
    asyncHandler(async (_req: Request, res: Response) => {
      try {
        const models = await listTunedModels();
        res.json(models);
      } catch (error: any) {
        logger.error({ module: 'Training', err: error }, 'List models error');
        res.status(500).json({ error: 'Failed to list tuned models' });
      }
    }),
  );

  /**
   * DELETE /models/:name - Delete a tuned model
   */
  router.delete(
    '/models/:name',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        await deleteTunedModel(req.params.name);
        res.json({ success: true });
      } catch (error: any) {
        logger.error({ module: 'Training', err: error }, 'Delete model error');
        res.status(500).json({ error: 'Failed to delete tuned model' });
      }
    }),
  );

  return router;
};

export const trainingRouterModule: RouterModule = {
  prefix: '/api/training',
  factory: trainingRouter,
  description: 'Custom model fine-tuning management',
  endpointCount: 9,
  requiresAuth: true,
  tags: ['training', 'tuning', 'models', 'fine-tuning'],
};
