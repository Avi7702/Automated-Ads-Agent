/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Idea Bank Router
 * AI-powered idea generation and template matching
 *
 * Endpoints:
 * - POST /api/idea-bank/suggest - Generate AI suggestions
 * - GET /api/idea-bank/templates/:productId - Get matched templates
 */

import type { Router, Request, Response } from 'express';
import type { IdeaBankSuggestResponse } from '@shared/types/ideaBank';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const ideaBankRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;
  const { ideaBank } = ctx.domainServices;
  const { requireAuth } = ctx.middleware;

  /**
   * POST /suggest - Generate idea bank suggestions
   * Supports single product, multiple products, and upload descriptions
   * Optional auth for single-tenant mode
   */
  router.post(
    '/suggest',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        // Use authenticated user ID, otherwise scope anonymous requests by session/IP
        // so one shared "system-user" key doesn't trigger global rate-limit collisions.
        const sessionUserId = (req.session as any)?.userId as string | undefined;
        const anonBase = String(req.sessionID || req.ip || 'unknown').replace(/[^a-zA-Z0-9_-]/g, '_');
        const userId = sessionUserId || `anon-${anonBase}`;
        const {
          productId,
          productIds,
          uploadDescriptions,
          userGoal,
          enableWebSearch,
          maxSuggestions,
          mode = 'freestyle', // Default to freestyle for backward compatibility
          templateId, // Required when mode = 'template'
        } = req.body;

        // Validate template mode requirements
        if (mode === 'template' && !templateId) {
          return res.status(400).json({
            error: 'templateId is required when mode is "template"',
          });
        }

        // Normalize productIds into a strict string[]
        const ids: string[] = Array.isArray(productIds)
          ? productIds.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
          : typeof productIds === 'string' && productIds.length > 0
            ? [productIds]
            : productId && typeof productId === 'string'
              ? [productId]
              : [];

        // Validate upload descriptions if provided
        const validUploadDescriptions: string[] = Array.isArray(uploadDescriptions)
          ? uploadDescriptions.filter((d: any) => typeof d === 'string' && d.trim().length > 0).slice(0, 6)
          : [];

        // Require at least products or upload descriptions
        if (ids.length === 0 && validUploadDescriptions.length === 0) {
          return res.status(400).json({ error: 'productId, productIds, or uploadDescriptions is required' });
        }

        // For multiple products, aggregate suggestions from each
        if (ids.length > 1) {
          const results = await Promise.all(
            ids.slice(0, 6).map(
              (
                id: string, // Limit to 6 products max
                index: number,
              ) =>
                ideaBank.generateSuggestions({
                  productId: id,
                  userId,
                  userGoal,
                  uploadDescriptions: validUploadDescriptions,
                  enableWebSearch: enableWebSearch || false,
                  maxSuggestions: 2, // Fewer per product when multiple
                  mode,
                  templateId,
                  skipRateLimitCheck: index > 0, // Count once per API request, not once per product in batch
                }),
            ),
          );

          // Filter successful results and aggregate
          const successfulResults = results.filter((r) => r.success);
          if (successfulResults.length === 0) {
            return res.status(500).json({ error: 'Failed to generate suggestions for all products' });
          }

          // Merge suggestions and aggregate analysis status
          const allSuggestions: any[] = [];
          const aggregateStatus = {
            visionComplete: false,
            kbQueried: false,
            templatesMatched: 0,
            webSearchUsed: false,
            uploadDescriptionsUsed: validUploadDescriptions.length,
          };

          for (const result of successfulResults) {
            if (result.success) {
              // Multi-product path is always freestyle mode — response is IdeaBankSuggestResponse
              const resp = result.response as IdeaBankSuggestResponse;
              allSuggestions.push(...resp.suggestions);
              aggregateStatus.visionComplete = aggregateStatus.visionComplete || resp.analysisStatus.visionComplete;
              aggregateStatus.kbQueried = aggregateStatus.kbQueried || resp.analysisStatus.kbQueried;
              aggregateStatus.templatesMatched += resp.analysisStatus.templatesMatched;
              aggregateStatus.webSearchUsed = aggregateStatus.webSearchUsed || resp.analysisStatus.webSearchUsed;
            }
          }

          // Sort by confidence and limit
          const sortedSuggestions = allSuggestions
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, Math.min(maxSuggestions || 6, 10));

          return res.json({
            suggestions: sortedSuggestions,
            analysisStatus: aggregateStatus,
          });
        }

        // Single product OR uploads-only flow
        const firstId = ids[0];
        const result = await ideaBank.generateSuggestions({
          ...(firstId != null ? { productId: firstId } : {}),
          userId,
          userGoal,
          uploadDescriptions: validUploadDescriptions,
          enableWebSearch: enableWebSearch || false,
          maxSuggestions: Math.min(maxSuggestions || 3, 5),
          mode,
          templateId,
        });

        if (!result.success) {
          const statusCode =
            result.error.code === 'RATE_LIMITED' ? 429 : result.error.code === 'PRODUCT_NOT_FOUND' ? 404 : 500;
          return res.status(statusCode).json({ error: result.error.message, code: result.error.code });
        }

        // Response shape changes based on mode
        if (mode === 'template') {
          // Type assertion: service returns IdeaBankTemplateResponse when mode='template'
          const templateResponse = result.response as import('@shared/types/ideaBank').IdeaBankTemplateResponse;
          return res.json({
            slotSuggestions: templateResponse.slotSuggestions,
            template: templateResponse.template,
            mergedPrompt: templateResponse.mergedPrompt,
            analysisStatus: templateResponse.analysisStatus,
            recipe: templateResponse.recipe,
          });
        }

        // Existing freestyle response
        // Type assertion: when mode !== 'template', service returns IdeaBankSuggestResponse
        const response = result.response as import('@shared/types/ideaBank').IdeaBankSuggestResponse;

        // Check if suggestions array is empty and provide helpful message
        if (!response.suggestions || response.suggestions.length === 0) {
          return res.status(200).json({
            suggestions: [],
            analysisStatus: {
              ...response.analysisStatus,
              message: 'No suggestions generated. Try adding products or images.',
              details: 'AI analysis completed but no viable prompts found.',
            },
          });
        }

        res.json(response);
      } catch (error: any) {
        logger.error({ module: 'IdeaBankSuggest', err: error }, 'Error suggesting ideas');

        // Return structured error with retry signal
        res.status(500).json({
          error: 'Failed to generate suggestions',
          message: 'Please try again or contact support',
          fallback: true, // Signal to client this is retryable
        });
      }
    }),
  );

  /**
   * GET /templates/:productId - Get matched templates for a product
   */
  router.get(
    '/templates/:productId',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = String(req.params['productId']);
        const userId = (req.session as any).userId;

        const result = await ideaBank.getMatchedTemplates(productId, userId);

        if (!result) {
          return res.status(404).json({ error: 'Product not found or analysis failed' });
        }

        res.json({
          templates: result.templates,
          productAnalysis: result.analysis,
        });
      } catch (error: any) {
        logger.error({ module: 'IdeaBankTemplates', err: error }, 'Error fetching templates');
        res.status(500).json({ error: 'Failed to get matched templates' });
      }
    }),
  );

  return router;
};

export const ideaBankRouterModule: RouterModule = {
  prefix: '/api/idea-bank',
  factory: ideaBankRouter,
  description: 'AI-powered idea generation and template matching',
  endpointCount: 2,
  requiresAuth: false, // suggest is optional auth
  tags: ['ai', 'ideas', 'templates'],
};
