# Router Architecture Design

## Sprint 2, Week 1, Days 1-2 - Task 2.1

**Status**: Implementation In Progress
**Created**: 2026-01-26
**Author**: Architecture Agent
**Document Version**: 1.1

---

## Implementation Progress (Task 2.7 - Days 6-7)

### Routers Migrated

| Router | Prefix | Endpoints | Status | Security |
|--------|--------|-----------|--------|----------|
| health | /api/health | 3 | Complete | Public |
| auth | /api/auth | 5 | Complete | Mixed |
| monitoring | /api/monitoring | 5 | Complete | Public |
| templates | /api/templates | 6 | Complete | Public |
| brandImages | /api/brand-images | 7 | Complete | Auth |
| catalog | /api/file-search | 6 | Complete | Auth |
| image | /api/analyze-image | 1 | Complete | Mixed |
| scenarios | /api/installation-scenarios | 6 | Complete | Auth |
| patterns | /api/learned-patterns | 9 | Complete | Auth |
| copywriting | /api/copywriting | 1 | Complete | Public |
| social | /api/social | 3 | Complete | Auth |
| n8n | /api/n8n | 1 | Complete | Webhook |
| planning | /api/content-planner | 7 | Complete | Auth |
| **products** | /api/products | 17 | **NEW** | Mixed |
| **generations** | /api/generations | 6 | **NEW** | Mixed |
| **jobs** | /api/jobs | 2 | **NEW** | Mixed |
| **ideaBank** | /api/idea-bank | 2 | **NEW** | Mixed |
| **productRelationships** | /api/product-relationships | 3 | **NEW** | Auth |
| **relationshipsRAG** | /api/relationships | 3 | **NEW** | Auth |
| **admin** | /api/admin | 10 | **NEW** | **Auth Required** |

### Sprint 2 Day 6-7 Summary

- **Products Router**: 17 endpoints including CRUD, Cloudinary uploads, vision analysis, enrichment
- **Generations Router**: 6 endpoints for generation CRUD and editing
- **Jobs Router**: 2 endpoints for job status polling and SSE streaming
- **Idea Bank Router**: 2 endpoints for AI-powered idea generation
- **Relationships Routers**: 6 endpoints (3 + 3) for relationship CRUD and AI discovery
- **Admin Router**: 10 endpoints, ALL require authentication (security-critical)

### Security Notes

- Admin router uses `router.use(requireAuth)` to protect ALL endpoints
- Products router has mixed auth (some endpoints public for single-tenant mode)
- Generations router has mixed auth (some endpoints public)
- Idea Bank suggest endpoint allows optional auth for single-tenant mode

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current State Analysis](#2-current-state-analysis)
3. [RouterContext Interface](#3-routercontext-interface)
4. [Router Factory Pattern](#4-router-factory-pattern)
5. [Router Modules Breakdown](#5-router-modules-breakdown)
6. [Example Router Implementations](#6-example-router-implementations)
7. [Router Index and Registration](#7-router-index-and-registration)
8. [Type Definitions Structure](#8-type-definitions-structure)
9. [Migration Strategy](#9-migration-strategy)
10. [Testing Strategy](#10-testing-strategy)
11. [Success Criteria](#11-success-criteria)
12. [ADR: Router Factory Pattern](#12-adr-router-factory-pattern)
13. [Appendix: Route Inventory](#appendix-route-inventory)

---

## 1. Executive Summary

This document specifies the architecture for breaking the monolithic `routes.ts` (5,399 lines) into 25+ modular routers using a dependency injection pattern.

### Key Benefits

- **Maintainability**: Each router is ~200-300 lines, focused on a single domain
- **Testability**: Routers can be unit tested in isolation with mock dependencies
- **Scalability**: New routes added without touching core routing logic
- **Type Safety**: Full TypeScript coverage with explicit interfaces
- **Onboarding**: New developers can understand one domain at a time

### Scope

- 162 HTTP endpoints across 25 domain areas
- 40+ imports consolidated into RouterContext
- Zero functional regression after migration
- Complete test coverage for all routers

---

## 2. Current State Analysis

### 2.1 File Metrics

| Metric | Value |
|--------|-------|
| Total Lines | 5,399 |
| HTTP Endpoints | 162 |
| Import Statements | 40+ |
| Middleware Combinations | 15+ unique patterns |
| External Services | 12+ (Gemini, Cloudinary, etc.) |

### 2.2 Current Problems

1. **Monolithic Structure**: Single file handles all domains
2. **Tight Coupling**: Direct service imports in route handlers
3. **Testing Difficulty**: Cannot unit test routes without full app context
4. **Code Duplication**: Error handling repeated across routes
5. **Inconsistent Patterns**: Some routes use middleware, others inline logic
6. **Import Explosion**: 40+ imports at file top
7. **Merge Conflicts**: Multiple developers editing same file

### 2.3 Domain Analysis

Based on endpoint prefixes, the following domains exist:

```
/api/health/*           - 3 endpoints  (Health checks)
/api/auth/*             - 5 endpoints  (Authentication)
/api/pricing/*          - 1 endpoint   (Pricing estimates)
/api/transform          - 1 endpoint   (Image transformation)
/api/generations/*      - 6 endpoints  (Generation CRUD)
/api/jobs/*             - 2 endpoints  (Job status/streaming)
/api/products/*         - 15 endpoints (Product management)
/api/prompt-templates/* - 3 endpoints  (Prompt templates)
/api/ad-templates/*     - 6 endpoints  (Ad templates)
/api/copy/*             - 5 endpoints  (Copywriting)
/api/copywriting/*      - 1 endpoint   (Standalone copy)
/api/user/*             - 1 endpoint   (User settings)
/api/admin/*            - 9 endpoints  (Admin operations)
/api/file-search/*      - 6 endpoints  (RAG/File search)
/api/installation/*     - 4 endpoints  (Installation scenarios)
/api/product-relationships/* - 5 endpoints
/api/brand-images/*     - 7 endpoints
/api/performing-ad-templates/* - 11 endpoints
/api/idea-bank/*        - 2 endpoints
/api/templates/*        - 6 endpoints
/api/brand-profile/*    - 3 endpoints
/api/quota/*            - 12 endpoints
/api/monitoring/*       - 5 endpoints
/api/settings/*         - 8 endpoints
/api/social/*           - 3 endpoints
/api/n8n/*              - 1 endpoint
/api/learned-patterns/* - 9 endpoints
/api/content-planner/*  - 7 endpoints
```

---

## 3. RouterContext Interface

The RouterContext provides all dependencies needed by routers through dependency injection.

### 3.1 Core Type Definitions

```typescript
// server/types/router.ts

import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { IStorage } from '../storage';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { v2 as cloudinary } from 'cloudinary';
import { Logger } from '../lib/logger';
import { Telemetry } from '../instrumentation';
import multer from 'multer';
import { ZodSchema } from 'zod';

/**
 * Services available to all routers
 */
export interface RouterServices {
  /** Database/storage operations */
  storage: IStorage;

  /** Gemini AI client for text operations */
  genAIText: GoogleGenerativeAI;

  /** Gemini AI client for image operations */
  genAIImage: GoogleGenerativeAI;

  /** Cloudinary client (may be null if not configured) */
  cloudinary: typeof cloudinary | null;

  /** Structured logger instance */
  logger: Logger;

  /** OpenTelemetry instance */
  telemetry: Telemetry;

  /** Generation queue for async jobs */
  generationQueue: typeof import('../lib/queue').generationQueue;

  /** Queue events for SSE streaming */
  generationQueueEvents: typeof import('../lib/queue').generationQueueEvents;
}

/**
 * Domain-specific services (lazy loaded)
 */
export interface RouterDomainServices {
  /** Vision analysis for product images */
  visionAnalysis: typeof import('../services/visionAnalysisService').visionAnalysisService;

  /** Idea bank orchestration */
  ideaBank: typeof import('../services/ideaBankService').ideaBankService;

  /** Product knowledge base */
  productKnowledge: typeof import('../services/productKnowledgeService').productKnowledgeService;

  /** Quota monitoring */
  quotaMonitoring: typeof import('../services/quotaMonitoringService').quotaMonitoringService;

  /** Installation scenario RAG */
  installationRAG: typeof import('../services/installationScenarioRAG');

  /** Relationship discovery RAG */
  relationshipRAG: typeof import('../services/relationshipDiscoveryRAG');

  /** Brand image recommendation RAG */
  brandImageRAG: typeof import('../services/brandImageRecommendationRAG');

  /** Template pattern matching RAG */
  templatePatternRAG: typeof import('../services/templatePatternRAG');

  /** Pattern extraction service */
  patternExtraction: typeof import('../services/patternExtractionService');

  /** Encryption service for API keys */
  encryption: typeof import('../services/encryptionService');

  /** API key validation */
  apiKeyValidation: typeof import('../services/apiKeyValidationService');

  /** Google Cloud Monitoring (optional) */
  googleCloudMonitoring?: any;
}

/**
 * Middleware functions available to routers
 */
export interface RouterMiddleware {
  /** Require authenticated user */
  requireAuth: RequestHandler;

  /** Optional authentication (sets req.user if token present) */
  optionalAuth: RequestHandler;

  /** Validate request body/params against Zod schema */
  validate: (schema: ZodSchema) => RequestHandler;

  /** Extended timeout for long operations (5 minutes) */
  extendedTimeout: RequestHandler;

  /** Halt processing if request timed out */
  haltOnTimeout: RequestHandler;

  /** Validate N8N webhook signature */
  validateN8nWebhook: RequestHandler;

  /** File type validation for uploads */
  validateFileType: RequestHandler;

  /** Pattern upload rate limiter */
  uploadPatternLimiter: RequestHandler;

  /** Check pattern quota before upload */
  checkPatternQuota: RequestHandler;

  /** Create custom rate limiter */
  createRateLimiter: typeof import('../middleware/rateLimit').createRateLimiter;
}

/**
 * Multer upload configurations
 */
export interface RouterUploads {
  /** Standard upload (10MB, 6 files) */
  standard: multer.Multer;

  /** Single file upload */
  single: (fieldName: string) => RequestHandler;

  /** Array of files upload */
  array: (fieldName: string, maxCount: number) => RequestHandler;
}

/**
 * Validation schemas available to routers
 */
export interface RouterSchemas {
  insertGeneration: ZodSchema;
  insertProduct: ZodSchema;
  insertPromptTemplate: ZodSchema;
  insertInstallationScenario: ZodSchema;
  insertProductRelationship: ZodSchema;
  saveApiKey: ZodSchema;
  uploadPattern: ZodSchema;
  updatePattern: ZodSchema;
  applyPattern: ZodSchema;
  ratePattern: ZodSchema;
  listPatternsQuery: ZodSchema;
  generateCompletePost: ZodSchema;
  saveN8nConfig: ZodSchema;
  n8nCallback: ZodSchema;
  syncAccount: ZodSchema;
}

/**
 * Utility functions for route handlers
 */
export interface RouterUtils {
  /** Save original file to storage */
  saveOriginalFile: typeof import('../fileStorage').saveOriginalFile;

  /** Save generated image */
  saveGeneratedImage: typeof import('../fileStorage').saveGeneratedImage;

  /** Delete file from storage */
  deleteFile: typeof import('../fileStorage').deleteFile;

  /** Convert generation to DTO */
  toGenerationDTO: typeof import('../dto/generationDTO').toGenerationDTO;

  /** Convert generation array to DTO array */
  toGenerationDTOArray: typeof import('../dto/generationDTO').toGenerationDTOArray;

  /** Compute adaptive cost estimate */
  computeAdaptiveEstimate: typeof import('../services/pricingEstimator').computeAdaptiveEstimate;

  /** Estimate generation cost */
  estimateGenerationCostMicros: typeof import('../services/pricingEstimator').estimateGenerationCostMicros;

  /** Normalize resolution string */
  normalizeResolution: typeof import('../services/pricingEstimator').normalizeResolution;

  /** Check if server is shutting down */
  isServerShuttingDown: () => boolean;
}

/**
 * Complete router context with all dependencies
 */
export interface RouterContext {
  services: RouterServices;
  domainServices: RouterDomainServices;
  middleware: RouterMiddleware;
  uploads: RouterUploads;
  schemas: RouterSchemas;
  utils: RouterUtils;
}

/**
 * Router factory function signature
 */
export type RouterFactory = (ctx: RouterContext) => Router;

/**
 * Router module metadata for registration
 */
export interface RouterModule {
  /** URL prefix for all routes (e.g., '/api/auth') */
  prefix: string;

  /** Factory function that creates the router */
  factory: RouterFactory;

  /** Human-readable description */
  description: string;

  /** Number of endpoints in this router */
  endpointCount: number;

  /** Whether router requires authentication for all routes */
  requiresAuth?: boolean;

  /** Tags for documentation/organization */
  tags?: string[];
}
```

### 3.2 Extended Request Type

```typescript
// server/types/session.ts

import { Session } from 'express-session';

declare module 'express-session' {
  interface SessionData {
    userId?: number;
    email?: string;
    isDemo?: boolean;
    createdAt?: string;
  }
}

declare module 'express' {
  interface Request {
    user?: {
      id: number;
      email: string;
      isDemo: boolean;
    };
  }
}
```

---

## 4. Router Factory Pattern

### 4.1 Base Factory Utility

```typescript
// server/routes/utils/createRouter.ts

import { Router, Request, Response, NextFunction } from 'express';
import { RouterContext } from '../../types/router';
import { logger } from '../../lib/logger';

/**
 * Create a new Express router with standard configuration
 */
export function createRouter(): Router {
  return Router({ mergeParams: true });
}

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Handle route errors with consistent format
 */
export function handleRouteError(
  res: Response,
  error: unknown,
  context: string
): void {
  logger.error({ err: error, context }, `Route error in ${context}`);

  if (error instanceof Error) {
    // Known error types
    if (error.name === 'ValidationError') {
      res.status(400).json({
        error: error.message,
        code: 'VALIDATION_ERROR'
      } as ErrorResponse);
      return;
    }

    if (error.name === 'NotFoundError') {
      res.status(404).json({
        error: error.message,
        code: 'NOT_FOUND'
      } as ErrorResponse);
      return;
    }

    if (error.name === 'UnauthorizedError') {
      res.status(401).json({
        error: error.message,
        code: 'UNAUTHORIZED'
      } as ErrorResponse);
      return;
    }

    if (error.name === 'ForbiddenError') {
      res.status(403).json({
        error: error.message,
        code: 'FORBIDDEN'
      } as ErrorResponse);
      return;
    }

    // Rate limit errors
    if (error.message.includes('rate limit') || error.message.includes('quota')) {
      res.status(429).json({
        error: error.message,
        code: 'RATE_LIMITED'
      } as ErrorResponse);
      return;
    }
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  } as ErrorResponse);
}
```

### 4.2 Router Registration

```typescript
// server/routes/utils/registerRouters.ts

import { Express, Router } from 'express';
import { RouterModule, RouterContext } from '../../types/router';
import { logger } from '../../lib/logger';

/**
 * Register all router modules with the Express app
 */
export function registerRouters(
  app: Express,
  modules: RouterModule[],
  ctx: RouterContext
): void {
  const startTime = Date.now();
  let totalEndpoints = 0;

  logger.info({ moduleCount: modules.length }, 'Registering router modules');

  for (const module of modules) {
    try {
      const router = module.factory(ctx);
      app.use(module.prefix, router);
      totalEndpoints += module.endpointCount;

      logger.debug({
        prefix: module.prefix,
        endpoints: module.endpointCount,
        description: module.description
      }, 'Router registered');
    } catch (error) {
      logger.error({
        prefix: module.prefix,
        err: error
      }, 'Failed to register router');
      throw error;
    }
  }

  const duration = Date.now() - startTime;
  logger.info({
    totalModules: modules.length,
    totalEndpoints,
    durationMs: duration
  }, 'All routers registered');
}
```

### 4.3 Context Builder

```typescript
// server/routes/utils/buildContext.ts

import { RouterContext, RouterServices, RouterMiddleware } from '../../types/router';
import { storage } from '../../storage';
import { genAI } from '../../lib/gemini';
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../../lib/logger';
import { telemetry } from '../../instrumentation';
import { generationQueue, generationQueueEvents } from '../../lib/queue';
import { requireAuth, optionalAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { extendedTimeout, haltOnTimeout } from '../../middleware/timeout';
import { validateN8nWebhook } from '../../middleware/webhookAuth';
import { createRateLimiter } from '../../middleware/rateLimit';
import { validateFileType, uploadPatternLimiter, checkPatternQuota } from '../../middleware/uploadValidation';
import multer from 'multer';

// Validation schemas
import {
  insertGenerationSchema,
  insertProductSchema,
  insertPromptTemplateSchema,
  insertInstallationScenarioSchema,
  insertProductRelationshipSchema
} from '@shared/schema';
import {
  saveApiKeySchema,
  uploadPatternSchema,
  updatePatternSchema,
  applyPatternSchema,
  ratePatternSchema,
  listPatternsQuerySchema,
  generateCompletePostSchema,
  saveN8nConfigSchema,
  n8nCallbackSchema,
  syncAccountSchema
} from '../../validation/schemas';

// File utilities
import { saveOriginalFile, saveGeneratedImage, deleteFile } from '../../fileStorage';
import { toGenerationDTO, toGenerationDTOArray } from '../../dto/generationDTO';
import { computeAdaptiveEstimate, estimateGenerationCostMicros, normalizeResolution } from '../../services/pricingEstimator';
import { isServerShuttingDown } from '../../utils/gracefulShutdown';

// Domain services (lazy loaded)
import { visionAnalysisService } from '../../services/visionAnalysisService';
import { ideaBankService } from '../../services/ideaBankService';
import { productKnowledgeService } from '../../services/productKnowledgeService';
import { quotaMonitoringService } from '../../services/quotaMonitoringService';
import * as installationRAG from '../../services/installationScenarioRAG';
import * as relationshipRAG from '../../services/relationshipDiscoveryRAG';
import { brandImageRecommendationRAG } from '../../services/brandImageRecommendationRAG';
import * as templatePatternRAG from '../../services/templatePatternRAG';
import * as patternExtraction from '../../services/patternExtractionService';
import * as encryption from '../../services/encryptionService';
import * as apiKeyValidation from '../../services/apiKeyValidationService';

/**
 * Check if Cloudinary is properly configured
 */
function isCloudinaryConfigured(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

/**
 * Create multer upload instance
 */
function createUploader(): multer.Multer {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB per file
      files: 6 // Max 6 files
    }
  });
}

/**
 * Build the complete router context
 */
export function buildRouterContext(): RouterContext {
  const upload = createUploader();

  // Configure Cloudinary if credentials present
  let cloudinaryClient: typeof cloudinary | null = null;
  if (isCloudinaryConfigured()) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    cloudinaryClient = cloudinary;
  }

  const services: RouterServices = {
    storage,
    genAIText: genAI,
    genAIImage: genAI,
    cloudinary: cloudinaryClient,
    logger,
    telemetry,
    generationQueue,
    generationQueueEvents
  };

  const middleware: RouterMiddleware = {
    requireAuth,
    optionalAuth,
    validate,
    extendedTimeout,
    haltOnTimeout,
    validateN8nWebhook,
    validateFileType,
    uploadPatternLimiter,
    checkPatternQuota,
    createRateLimiter
  };

  const uploads = {
    standard: upload,
    single: (fieldName: string) => upload.single(fieldName),
    array: (fieldName: string, maxCount: number) => upload.array(fieldName, maxCount)
  };

  const schemas = {
    insertGeneration: insertGenerationSchema,
    insertProduct: insertProductSchema,
    insertPromptTemplate: insertPromptTemplateSchema,
    insertInstallationScenario: insertInstallationScenarioSchema,
    insertProductRelationship: insertProductRelationshipSchema,
    saveApiKey: saveApiKeySchema,
    uploadPattern: uploadPatternSchema,
    updatePattern: updatePatternSchema,
    applyPattern: applyPatternSchema,
    ratePattern: ratePatternSchema,
    listPatternsQuery: listPatternsQuerySchema,
    generateCompletePost: generateCompletePostSchema,
    saveN8nConfig: saveN8nConfigSchema,
    n8nCallback: n8nCallbackSchema,
    syncAccount: syncAccountSchema
  };

  const utils = {
    saveOriginalFile,
    saveGeneratedImage,
    deleteFile,
    toGenerationDTO,
    toGenerationDTOArray,
    computeAdaptiveEstimate,
    estimateGenerationCostMicros,
    normalizeResolution,
    isServerShuttingDown
  };

  const domainServices = {
    visionAnalysis: visionAnalysisService,
    ideaBank: ideaBankService,
    productKnowledge: productKnowledgeService,
    quotaMonitoring: quotaMonitoringService,
    installationRAG,
    relationshipRAG,
    brandImageRAG: brandImageRecommendationRAG,
    templatePatternRAG,
    patternExtraction,
    encryption,
    apiKeyValidation
  };

  return {
    services,
    domainServices,
    middleware,
    uploads,
    schemas,
    utils
  };
}
```

---

## 5. Router Modules Breakdown

### 5.1 Complete Router List

| # | Router | Prefix | Endpoints | Lines Est. | Complexity |
|---|--------|--------|-----------|------------|------------|
| 1 | health | `/api/health` | 3 | 50 | Low |
| 2 | auth | `/api/auth` | 5 | 150 | Medium |
| 3 | pricing | `/api/pricing` | 1 | 80 | Low |
| 4 | transform | `/api/transform` | 1 | 450 | High |
| 5 | generations | `/api/generations` | 6 | 200 | Medium |
| 6 | jobs | `/api/jobs` | 2 | 150 | Medium |
| 7 | products | `/api/products` | 15 | 400 | High |
| 8 | promptTemplates | `/api/prompt-templates` | 3 | 80 | Low |
| 9 | adTemplates | `/api/ad-templates` | 6 | 150 | Medium |
| 10 | copy | `/api/copy` | 5 | 200 | Medium |
| 11 | copywriting | `/api/copywriting` | 1 | 100 | Low |
| 12 | user | `/api/user` | 1 | 50 | Low |
| 13 | admin | `/api/admin` | 9 | 200 | Medium |
| 14 | fileSearch | `/api/file-search` | 6 | 180 | Medium |
| 15 | installation | `/api/installation` | 4 | 120 | Medium |
| 16 | installationScenarios | `/api/installation-scenarios` | 6 | 150 | Medium |
| 17 | productRelationships | `/api/product-relationships` | 5 | 120 | Medium |
| 18 | brandImages | `/api/brand-images` | 7 | 200 | Medium |
| 19 | performingTemplates | `/api/performing-ad-templates` | 11 | 250 | Medium |
| 20 | ideaBank | `/api/idea-bank` | 2 | 200 | High |
| 21 | templates | `/api/templates` | 6 | 150 | Medium |
| 22 | brandProfile | `/api/brand-profile` | 3 | 80 | Low |
| 23 | quota | `/api/quota` | 12 | 300 | High |
| 24 | monitoring | `/api/monitoring` | 5 | 150 | Medium |
| 25 | settings | `/api/settings` | 8 | 350 | High |
| 26 | social | `/api/social` | 3 | 150 | Medium |
| 27 | n8n | `/api/n8n` | 1 | 80 | Low |
| 28 | learnedPatterns | `/api/learned-patterns` | 9 | 350 | High |
| 29 | contentPlanner | `/api/content-planner` | 7 | 250 | High |
| 30 | relationships | `/api/relationships` | 4 | 120 | Medium |

**Total: 162 endpoints, ~5,000 lines distributed across 30 routers**

### 5.2 Router Dependencies Matrix

```
Router              | storage | genAI | cloudinary | queue | domain services
--------------------|---------|-------|------------|-------|----------------
health              |    -    |   -   |     -      |   -   |       -
auth                |    X    |   -   |     -      |   -   |       -
pricing             |    -    |   -   |     -      |   -   | quotaMonitoring
transform           |    X    |   X   |     X      |   X   | vision, ideaBank
generations         |    X    |   -   |     -      |   -   |       -
jobs                |    -    |   -   |     -      |   X   |       -
products            |    X    |   X   |     X      |   -   | vision, knowledge
adTemplates         |    X    |   -   |     -      |   -   |       -
copy                |    X    |   X   |     -      |   -   |       -
admin               |    X    |   -   |     -      |   -   |       -
fileSearch          |    X    |   -   |     -      |   -   |       -
brandImages         |    X    |   -   |     X      |   -   | brandImageRAG
ideaBank            |    X    |   X   |     -      |   -   | ideaBank
quota               |    X    |   -   |     -      |   -   | quotaMonitoring
settings            |    X    |   -   |     -      |   -   | encryption, apiKey
learnedPatterns     |    X    |   X   |     X      |   -   | patternExtraction
contentPlanner      |    X    |   X   |     -      |   -   |       -
```

---

## 6. Example Router Implementations

### 6.1 Health Router (Simplest Example)

```typescript
// server/routes/health.router.ts

import { Router } from 'express';
import { RouterContext, RouterFactory } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { db, pool } from '../db';

/**
 * Health check endpoints for liveness, readiness, and general health
 *
 * Endpoints:
 * - GET /api/health/live - Liveness probe (is process running?)
 * - GET /api/health/ready - Readiness probe (can accept traffic?)
 * - GET /api/health - General health status
 */
export const healthRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { logger } = ctx.services;

  /**
   * Liveness probe - Is the process running?
   * Always returns 200 if the server is up
   */
  router.get('/live', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  });

  /**
   * Readiness probe - Can the server accept traffic?
   * Checks database connectivity
   */
  router.get('/ready', asyncHandler(async (req, res) => {
    try {
      // Verify database connection
      await db.execute('SELECT 1');

      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'connected'
        }
      });
    } catch (error) {
      logger.error({ err: error }, 'Readiness check failed');
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'disconnected'
        }
      });
    }
  }));

  /**
   * General health check with detailed status
   */
  router.get('/', (req, res) => {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();

    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor(uptime),
      memory: {
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        rss: Math.round(memoryUsage.rss / 1024 / 1024)
      }
    });
  });

  return router;
};

// Module metadata for registration
export const healthRouterModule = {
  prefix: '/api/health',
  factory: healthRouter,
  description: 'Health check endpoints for monitoring',
  endpointCount: 3,
  requiresAuth: false,
  tags: ['infrastructure', 'monitoring']
};
```

### 6.2 Auth Router (With Storage and Middleware)

```typescript
// server/routes/auth.router.ts

import { Router, Request, Response } from 'express';
import { RouterContext, RouterFactory } from '../types/router';
import { createRouter, asyncHandler, handleRouteError } from './utils/createRouter';
import { authService } from '../services/authService';

/**
 * Authentication endpoints for user registration, login, and session management
 *
 * Endpoints:
 * - POST /api/auth/register - Register new user
 * - POST /api/auth/login - Login user
 * - POST /api/auth/logout - Logout user
 * - GET /api/auth/me - Get current user
 * - GET /api/auth/demo - Get or create demo session
 */
export const authRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth } = ctx.middleware;

  /**
   * Register a new user account
   */
  router.post('/register', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }

      // Check if user exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'User already exists'
        });
      }

      // Create user
      const user = await authService.register(email, password);

      // Set session
      req.session.userId = user.id;
      req.session.email = user.email;
      req.session.isDemo = false;
      req.session.createdAt = new Date().toISOString();

      logger.info({ userId: user.id, email }, 'User registered');

      res.status(201).json({
        success: true,
        user: {
          id: user.id,
          email: user.email
        }
      });
    } catch (error) {
      handleRouteError(res, error, 'auth.register');
    }
  }));

  /**
   * Login existing user
   */
  router.post('/login', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          error: 'Email and password are required'
        });
      }

      const result = await authService.login(email, password);

      if (!result.success || !result.user) {
        return res.status(401).json({
          error: result.error || 'Invalid credentials'
        });
      }

      // Set session
      req.session.userId = result.user.id;
      req.session.email = result.user.email;
      req.session.isDemo = false;
      req.session.createdAt = new Date().toISOString();

      logger.info({ userId: result.user.id, email }, 'User logged in');

      res.json({
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email
        }
      });
    } catch (error) {
      handleRouteError(res, error, 'auth.login');
    }
  }));

  /**
   * Logout current user
   */
  router.post('/logout', (req: Request, res: Response) => {
    const userId = req.session.userId;

    req.session.destroy((err) => {
      if (err) {
        logger.error({ err, userId }, 'Logout failed');
        return res.status(500).json({ error: 'Logout failed' });
      }

      logger.info({ userId }, 'User logged out');
      res.json({ success: true });
    });
  });

  /**
   * Get current authenticated user
   */
  router.get('/me', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = await storage.getUser(req.session.userId!);

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({
        id: user.id,
        email: user.email,
        isDemo: req.session.isDemo || false,
        createdAt: user.createdAt
      });
    } catch (error) {
      handleRouteError(res, error, 'auth.me');
    }
  }));

  /**
   * Get or create demo session
   */
  router.get('/demo', asyncHandler(async (req: Request, res: Response) => {
    try {
      // Check for existing demo session
      if (req.session.userId && req.session.isDemo) {
        const user = await storage.getUser(req.session.userId);
        if (user) {
          return res.json({
            id: user.id,
            email: user.email,
            isDemo: true
          });
        }
      }

      // Create new demo user
      const demoUser = await authService.createDemoUser();

      req.session.userId = demoUser.id;
      req.session.email = demoUser.email;
      req.session.isDemo = true;
      req.session.createdAt = new Date().toISOString();

      logger.info({ userId: demoUser.id }, 'Demo session created');

      res.json({
        id: demoUser.id,
        email: demoUser.email,
        isDemo: true
      });
    } catch (error) {
      handleRouteError(res, error, 'auth.demo');
    }
  }));

  return router;
};

// Module metadata
export const authRouterModule = {
  prefix: '/api/auth',
  factory: authRouter,
  description: 'User authentication and session management',
  endpointCount: 5,
  requiresAuth: false, // Mixed - some endpoints require auth
  tags: ['authentication', 'users']
};
```

### 6.3 Products Router (Complex with Uploads)

```typescript
// server/routes/products.router.ts

import { Router, Request, Response } from 'express';
import { RouterContext, RouterFactory } from '../types/router';
import { createRouter, asyncHandler, handleRouteError } from './utils/createRouter';

/**
 * Product management endpoints including CRUD, analysis, and enrichment
 *
 * Endpoints:
 * - POST /api/products - Create product with image upload
 * - GET /api/products - List all products
 * - GET /api/products/:id - Get single product
 * - DELETE /api/products/:id - Delete product
 * - DELETE /api/products - Bulk delete products
 * - POST /api/products/sync - Sync products from external source
 * - POST /api/products/:productId/analyze - Analyze product image
 * - GET /api/products/:productId/analysis - Get analysis results
 * - POST /api/products/:productId/enrich - Enrich product data
 * - POST /api/products/:productId/enrich-from-url - Enrich from URL
 * - GET /api/products/:productId/enrichment - Get enrichment data
 * - POST /api/products/:productId/enrichment/verify - Verify enrichment
 * - GET /api/products/enrichment/pending - Get pending enrichments
 * - POST /api/products/:productId/suggest-relationships - Suggest relationships
 * - POST /api/products/find-similar - Find similar products
 */
export const productsRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, cloudinary, logger } = ctx.services;
  const { visionAnalysis, productKnowledge, relationshipRAG } = ctx.domainServices;
  const { requireAuth } = ctx.middleware;
  const { single: uploadSingle } = ctx.uploads;
  const { insertProduct: insertProductSchema } = ctx.schemas;
  const { validate } = ctx.middleware;

  /**
   * Create a new product with optional image upload
   */
  router.post('/',
    uploadSingle('image'),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { name, description, category, price, sku } = req.body;

        if (!name) {
          return res.status(400).json({ error: 'Product name is required' });
        }

        let imageUrl: string | null = null;

        // Handle image upload to Cloudinary
        if (req.file && cloudinary) {
          const uploadResult = await new Promise<{ secure_url: string }>((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              {
                folder: 'products',
                resource_type: 'image',
                transformation: [
                  { width: 1024, height: 1024, crop: 'limit' },
                  { quality: 'auto:good' }
                ]
              },
              (error, result) => {
                if (error) reject(error);
                else resolve(result as { secure_url: string });
              }
            );
            uploadStream.end(req.file!.buffer);
          });

          imageUrl = uploadResult.secure_url;
        }

        const product = await storage.createProduct({
          name,
          description: description || null,
          category: category || null,
          price: price ? parseFloat(price) : null,
          sku: sku || null,
          imageUrl,
          userId: req.session.userId
        });

        logger.info({ productId: product.id, name }, 'Product created');

        res.status(201).json(product);
      } catch (error) {
        handleRouteError(res, error, 'products.create');
      }
    })
  );

  /**
   * List all products for current user
   */
  router.get('/', asyncHandler(async (req: Request, res: Response) => {
    try {
      const products = await storage.getProducts(req.session.userId);
      res.json(products);
    } catch (error) {
      handleRouteError(res, error, 'products.list');
    }
  }));

  /**
   * Get single product by ID
   */
  router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
    try {
      const product = await storage.getProduct(parseInt(req.params.id));

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      res.json(product);
    } catch (error) {
      handleRouteError(res, error, 'products.get');
    }
  }));

  /**
   * Delete a product
   */
  router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
    try {
      const productId = parseInt(req.params.id);
      const product = await storage.getProduct(productId);

      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Delete from Cloudinary if image exists
      if (product.imageUrl && cloudinary) {
        try {
          const publicId = extractCloudinaryPublicId(product.imageUrl);
          if (publicId) {
            await cloudinary.uploader.destroy(publicId);
          }
        } catch (cloudinaryError) {
          logger.warn({ err: cloudinaryError, productId }, 'Failed to delete image from Cloudinary');
        }
      }

      await storage.deleteProduct(productId);

      logger.info({ productId }, 'Product deleted');
      res.json({ success: true });
    } catch (error) {
      handleRouteError(res, error, 'products.delete');
    }
  }));

  /**
   * Bulk delete products
   */
  router.delete('/', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { productIds } = req.body;

      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ error: 'productIds array is required' });
      }

      let deletedCount = 0;
      for (const id of productIds) {
        try {
          await storage.deleteProduct(id);
          deletedCount++;
        } catch (err) {
          logger.warn({ err, productId: id }, 'Failed to delete product in bulk operation');
        }
      }

      logger.info({ deletedCount, requested: productIds.length }, 'Bulk delete completed');
      res.json({ success: true, deletedCount });
    } catch (error) {
      handleRouteError(res, error, 'products.bulkDelete');
    }
  }));

  /**
   * Analyze product image with vision AI
   */
  router.post('/:productId/analyze',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = parseInt(req.params.productId);
        const product = await storage.getProduct(productId);

        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        if (!product.imageUrl) {
          return res.status(400).json({ error: 'Product has no image to analyze' });
        }

        const analysis = await visionAnalysis.analyzeProductImage(product.imageUrl);

        // Store analysis results
        await storage.updateProductAnalysis(productId, analysis);

        logger.info({ productId }, 'Product analysis completed');
        res.json(analysis);
      } catch (error) {
        handleRouteError(res, error, 'products.analyze');
      }
    })
  );

  /**
   * Get product analysis results
   */
  router.get('/:productId/analysis',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = parseInt(req.params.productId);
        const analysis = await storage.getProductAnalysis(productId);

        if (!analysis) {
          return res.status(404).json({ error: 'No analysis found for product' });
        }

        res.json(analysis);
      } catch (error) {
        handleRouteError(res, error, 'products.getAnalysis');
      }
    })
  );

  /**
   * Suggest relationships for a product
   */
  router.post('/:productId/suggest-relationships',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const productId = parseInt(req.params.productId);
        const product = await storage.getProduct(productId);

        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        const allProducts = await storage.getProducts(req.session.userId);
        const suggestions = await relationshipRAG.suggestRelationships(product, allProducts);

        res.json(suggestions);
      } catch (error) {
        handleRouteError(res, error, 'products.suggestRelationships');
      }
    })
  );

  /**
   * Find similar products
   */
  router.post('/find-similar',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { productId, limit = 5 } = req.body;

        if (!productId) {
          return res.status(400).json({ error: 'productId is required' });
        }

        const product = await storage.getProduct(productId);
        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        const allProducts = await storage.getProducts(req.session.userId);
        const similar = await relationshipRAG.findSimilarProducts(product, allProducts, limit);

        res.json(similar);
      } catch (error) {
        handleRouteError(res, error, 'products.findSimilar');
      }
    })
  );

  // Additional endpoints would follow same pattern...
  // POST /sync, POST /:productId/enrich, etc.

  return router;
};

/**
 * Extract Cloudinary public ID from URL
 */
function extractCloudinaryPublicId(url: string): string | null {
  const match = url.match(/\/v\d+\/(.+)\.\w+$/);
  return match ? match[1] : null;
}

// Module metadata
export const productsRouterModule = {
  prefix: '/api/products',
  factory: productsRouter,
  description: 'Product management, analysis, and enrichment',
  endpointCount: 15,
  requiresAuth: false, // Mixed - most require auth
  tags: ['products', 'catalog', 'vision']
};
```

### 6.4 Quota Router (High Complexity with External Services)

```typescript
// server/routes/quota.router.ts

import { Router, Request, Response } from 'express';
import { RouterContext, RouterFactory } from '../types/router';
import { createRouter, asyncHandler, handleRouteError } from './utils/createRouter';

/**
 * Quota monitoring and management endpoints
 *
 * Endpoints:
 * - GET /api/quota/status - Current quota status
 * - GET /api/quota/history - Quota usage history
 * - GET /api/quota/breakdown - Detailed breakdown by service
 * - GET /api/quota/rate-limit-status - Rate limit status
 * - GET /api/quota/alerts - Get alert configuration
 * - PUT /api/quota/alerts - Update alert thresholds
 * - GET /api/quota/check-alerts - Check for triggered alerts
 * - GET /api/quota/google/status - Google Cloud quota status
 * - GET /api/quota/google/snapshot - Current Google quota snapshot
 * - POST /api/quota/google/sync - Sync quota from Google Cloud
 * - GET /api/quota/google/history - Google quota history
 * - GET /api/quota/google/snapshots - List all quota snapshots
 */
export const quotaRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { quotaMonitoring } = ctx.domainServices;
  const { requireAuth } = ctx.middleware;

  // Lazy load Google Cloud Monitoring service
  let googleCloudService: any = null;
  async function getGoogleCloudService() {
    if (!googleCloudService) {
      try {
        const module = await import('../services/googleCloudMonitoringService');
        googleCloudService = module.googleCloudMonitoringService;
      } catch (error) {
        logger.error({ err: error }, 'Failed to load Google Cloud Monitoring');
      }
    }
    return googleCloudService;
  }

  /**
   * Get current quota status
   */
  router.get('/status', asyncHandler(async (req: Request, res: Response) => {
    try {
      const status = await quotaMonitoring.getQuotaStatus();
      res.json(status);
    } catch (error) {
      handleRouteError(res, error, 'quota.status');
    }
  }));

  /**
   * Get quota usage history
   */
  router.get('/history', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { days = 7 } = req.query;
      const history = await quotaMonitoring.getQuotaHistory(parseInt(days as string));
      res.json(history);
    } catch (error) {
      handleRouteError(res, error, 'quota.history');
    }
  }));

  /**
   * Get detailed breakdown by service
   */
  router.get('/breakdown', asyncHandler(async (req: Request, res: Response) => {
    try {
      const breakdown = await quotaMonitoring.getQuotaBreakdown();
      res.json(breakdown);
    } catch (error) {
      handleRouteError(res, error, 'quota.breakdown');
    }
  }));

  /**
   * Get rate limit status
   */
  router.get('/rate-limit-status', asyncHandler(async (req: Request, res: Response) => {
    try {
      const status = await quotaMonitoring.getRateLimitStatus();
      res.json(status);
    } catch (error) {
      handleRouteError(res, error, 'quota.rateLimitStatus');
    }
  }));

  /**
   * Get alert configuration
   */
  router.get('/alerts', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    try {
      const alerts = await storage.getQuotaAlerts(req.session.userId!);
      res.json(alerts);
    } catch (error) {
      handleRouteError(res, error, 'quota.getAlerts');
    }
  }));

  /**
   * Update alert thresholds
   */
  router.put('/alerts', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    try {
      const { warningThreshold, criticalThreshold, emailNotify } = req.body;

      const alerts = await storage.updateQuotaAlerts(req.session.userId!, {
        warningThreshold,
        criticalThreshold,
        emailNotify
      });

      logger.info({ userId: req.session.userId }, 'Quota alerts updated');
      res.json(alerts);
    } catch (error) {
      handleRouteError(res, error, 'quota.updateAlerts');
    }
  }));

  /**
   * Check for triggered alerts
   */
  router.get('/check-alerts', asyncHandler(async (req: Request, res: Response) => {
    try {
      const triggeredAlerts = await quotaMonitoring.checkAlerts();
      res.json(triggeredAlerts);
    } catch (error) {
      handleRouteError(res, error, 'quota.checkAlerts');
    }
  }));

  /**
   * Get Google Cloud quota status
   */
  router.get('/google/status', asyncHandler(async (req: Request, res: Response) => {
    try {
      const gcService = await getGoogleCloudService();

      if (!gcService) {
        return res.status(503).json({
          error: 'Google Cloud Monitoring not available',
          configured: false
        });
      }

      const status = await gcService.getQuotaStatus();
      res.json(status);
    } catch (error) {
      handleRouteError(res, error, 'quota.googleStatus');
    }
  }));

  /**
   * Get current Google quota snapshot
   */
  router.get('/google/snapshot', asyncHandler(async (req: Request, res: Response) => {
    try {
      const gcService = await getGoogleCloudService();

      if (!gcService) {
        return res.status(503).json({
          error: 'Google Cloud Monitoring not available'
        });
      }

      const snapshot = await gcService.getCurrentSnapshot();
      res.json(snapshot);
    } catch (error) {
      handleRouteError(res, error, 'quota.googleSnapshot');
    }
  }));

  /**
   * Sync quota from Google Cloud
   */
  router.post('/google/sync', asyncHandler(async (req: Request, res: Response) => {
    try {
      const gcService = await getGoogleCloudService();

      if (!gcService) {
        return res.status(503).json({
          error: 'Google Cloud Monitoring not available'
        });
      }

      const result = await gcService.syncQuota();

      logger.info({ result }, 'Google quota synced');
      res.json(result);
    } catch (error) {
      handleRouteError(res, error, 'quota.googleSync');
    }
  }));

  /**
   * Get Google quota history
   */
  router.get('/google/history', asyncHandler(async (req: Request, res: Response) => {
    try {
      const gcService = await getGoogleCloudService();

      if (!gcService) {
        return res.status(503).json({
          error: 'Google Cloud Monitoring not available'
        });
      }

      const history = await gcService.getQuotaHistory();
      res.json(history);
    } catch (error) {
      handleRouteError(res, error, 'quota.googleHistory');
    }
  }));

  /**
   * List all quota snapshots
   */
  router.get('/google/snapshots', asyncHandler(async (req: Request, res: Response) => {
    try {
      const { limit = 100, offset = 0 } = req.query;

      const gcService = await getGoogleCloudService();

      if (!gcService) {
        return res.status(503).json({
          error: 'Google Cloud Monitoring not available'
        });
      }

      const snapshots = await gcService.listSnapshots({
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      });

      res.json(snapshots);
    } catch (error) {
      handleRouteError(res, error, 'quota.googleSnapshots');
    }
  }));

  return router;
};

// Module metadata
export const quotaRouterModule = {
  prefix: '/api/quota',
  factory: quotaRouter,
  description: 'Quota monitoring, alerts, and Google Cloud integration',
  endpointCount: 12,
  requiresAuth: false, // Mixed
  tags: ['monitoring', 'quota', 'google-cloud']
};
```

---

## 7. Router Index and Registration

### 7.1 Router Index File

```typescript
// server/routes/index.ts

import { RouterModule } from '../types/router';

// Import all router modules
import { healthRouterModule } from './health.router';
import { authRouterModule } from './auth.router';
import { pricingRouterModule } from './pricing.router';
import { transformRouterModule } from './transform.router';
import { generationsRouterModule } from './generations.router';
import { jobsRouterModule } from './jobs.router';
import { productsRouterModule } from './products.router';
import { promptTemplatesRouterModule } from './promptTemplates.router';
import { adTemplatesRouterModule } from './adTemplates.router';
import { copyRouterModule } from './copy.router';
import { copywritingRouterModule } from './copywriting.router';
import { userRouterModule } from './user.router';
import { adminRouterModule } from './admin.router';
import { fileSearchRouterModule } from './fileSearch.router';
import { installationRouterModule } from './installation.router';
import { installationScenariosRouterModule } from './installationScenarios.router';
import { productRelationshipsRouterModule } from './productRelationships.router';
import { brandImagesRouterModule } from './brandImages.router';
import { performingTemplatesRouterModule } from './performingTemplates.router';
import { ideaBankRouterModule } from './ideaBank.router';
import { templatesRouterModule } from './templates.router';
import { brandProfileRouterModule } from './brandProfile.router';
import { quotaRouterModule } from './quota.router';
import { monitoringRouterModule } from './monitoring.router';
import { settingsRouterModule } from './settings.router';
import { socialRouterModule } from './social.router';
import { n8nRouterModule } from './n8n.router';
import { learnedPatternsRouterModule } from './learnedPatterns.router';
import { contentPlannerRouterModule } from './contentPlanner.router';
import { relationshipsRouterModule } from './relationships.router';

/**
 * All router modules in registration order
 *
 * Order matters for middleware application:
 * 1. Infrastructure routers first (health, monitoring)
 * 2. Auth routers (needed by other routers)
 * 3. Core domain routers
 * 4. Feature routers
 * 5. Admin routers last
 */
export const routerModules: RouterModule[] = [
  // Infrastructure (no auth required)
  healthRouterModule,
  monitoringRouterModule,

  // Authentication
  authRouterModule,

  // Core resources
  productsRouterModule,
  generationsRouterModule,
  jobsRouterModule,

  // Content generation
  transformRouterModule,
  copyRouterModule,
  copywritingRouterModule,
  ideaBankRouterModule,

  // Templates
  templatesRouterModule,
  adTemplatesRouterModule,
  promptTemplatesRouterModule,
  performingTemplatesRouterModule,

  // Brand management
  brandProfileRouterModule,
  brandImagesRouterModule,

  // Product features
  productRelationshipsRouterModule,
  installationRouterModule,
  installationScenariosRouterModule,
  relationshipsRouterModule,

  // Content planning
  contentPlannerRouterModule,
  learnedPatternsRouterModule,

  // Integrations
  socialRouterModule,
  n8nRouterModule,
  fileSearchRouterModule,

  // Settings and quota
  settingsRouterModule,
  quotaRouterModule,
  pricingRouterModule,

  // User management
  userRouterModule,

  // Admin (last)
  adminRouterModule
];

/**
 * Get router module by prefix
 */
export function getRouterModule(prefix: string): RouterModule | undefined {
  return routerModules.find(m => m.prefix === prefix);
}

/**
 * Get all router prefixes
 */
export function getRouterPrefixes(): string[] {
  return routerModules.map(m => m.prefix);
}

/**
 * Get total endpoint count
 */
export function getTotalEndpointCount(): number {
  return routerModules.reduce((sum, m) => sum + m.endpointCount, 0);
}
```

### 7.2 Updated Main Routes File

```typescript
// server/routes.ts (refactored)

import type { Express } from 'express';
import { createServer, type Server } from 'http';
import express from 'express';
import path from 'path';

import { routerModules } from './routes/index';
import { registerRouters } from './routes/utils/registerRouters';
import { buildRouterContext } from './routes/utils/buildContext';
import { logger } from './lib/logger';
import { startPatternCleanupScheduler } from './jobs/patternCleanupJob';

/**
 * Register all API routes and return HTTP server
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Build dependency injection context
  const ctx = buildRouterContext();

  // Register all router modules
  registerRouters(app, routerModules, ctx);

  // Start background jobs
  startPatternCleanupScheduler();

  logger.info('All routes registered successfully');

  // Create and return HTTP server
  const httpServer = createServer(app);
  return httpServer;
}
```

---

## 8. Type Definitions Structure

### 8.1 Directory Structure

```
server/
├── types/
│   ├── router.ts          # RouterContext, RouterFactory, RouterModule
│   ├── api.ts             # API response types (existing)
│   ├── session.ts         # Session extensions
│   └── index.ts           # Re-exports all types
├── routes/
│   ├── utils/
│   │   ├── createRouter.ts    # Router factory utilities
│   │   ├── registerRouters.ts # Registration logic
│   │   └── buildContext.ts    # Context builder
│   ├── health.router.ts
│   ├── auth.router.ts
│   ├── products.router.ts
│   ├── ... (25+ more routers)
│   └── index.ts           # Module exports
└── routes.ts              # Main entry (simplified)
```

### 8.2 Types Index

```typescript
// server/types/index.ts

// Router types
export type {
  RouterContext,
  RouterFactory,
  RouterModule,
  RouterServices,
  RouterMiddleware,
  RouterUploads,
  RouterSchemas,
  RouterUtils,
  RouterDomainServices
} from './router';

// API types
export type {
  ApiResponse,
  ApiError,
  PaginatedResponse
} from './api';

// Session types
export type {} from './session'; // Side-effect import for declaration merging
```

---

## 9. Migration Strategy

### 9.1 14-Day Migration Plan

#### Phase 1: Infrastructure (Day 1)

| Task | Files | Est. Hours |
|------|-------|------------|
| Create type definitions | `server/types/router.ts` | 2 |
| Create router utilities | `server/routes/utils/*.ts` | 3 |
| Create health router (test migration) | `server/routes/health.router.ts` | 1 |
| Write tests for health router | `server/__tests__/routes/health.test.ts` | 1 |
| Verify parallel operation | Manual testing | 1 |

**Deliverables:**
- Type system in place
- Health router working alongside old routes
- Test infrastructure ready

#### Phase 2: Easy Routers (Days 2-3)

| Router | Endpoints | Complexity | Day |
|--------|-----------|------------|-----|
| auth | 5 | Medium | 2 |
| user | 1 | Low | 2 |
| pricing | 1 | Low | 2 |
| brandProfile | 3 | Low | 2 |
| promptTemplates | 3 | Low | 3 |
| monitoring | 5 | Medium | 3 |

**Deliverables:**
- 6 routers migrated
- 18 endpoints moved
- All tests passing

#### Phase 3: Medium Routers (Days 4-5)

| Router | Endpoints | Complexity | Day |
|--------|-----------|------------|-----|
| generations | 6 | Medium | 4 |
| jobs | 2 | Medium | 4 |
| adTemplates | 6 | Medium | 4 |
| copy | 5 | Medium | 5 |
| copywriting | 1 | Low | 5 |
| templates | 6 | Medium | 5 |

**Deliverables:**
- 6 more routers migrated
- 26 endpoints moved
- Total: 44 endpoints migrated

#### Phase 4: Complex Routers (Days 6-8)

| Router | Endpoints | Complexity | Day |
|--------|-----------|------------|-----|
| products | 15 | High | 6 |
| transform | 1 | High | 7 |
| ideaBank | 2 | High | 7 |
| admin | 9 | Medium | 8 |
| fileSearch | 6 | Medium | 8 |

**Deliverables:**
- 5 complex routers migrated
- 33 endpoints moved
- Total: 77 endpoints migrated

#### Phase 5: Specialized Routers (Days 9-10)

| Router | Endpoints | Complexity | Day |
|--------|-----------|------------|-----|
| quota | 12 | High | 9 |
| settings | 8 | High | 9 |
| brandImages | 7 | Medium | 10 |
| performingTemplates | 11 | Medium | 10 |

**Deliverables:**
- 4 specialized routers migrated
- 38 endpoints moved
- Total: 115 endpoints migrated

#### Phase 6: Final Routers (Days 11-12)

| Router | Endpoints | Complexity | Day |
|--------|-----------|------------|-----|
| learnedPatterns | 9 | High | 11 |
| contentPlanner | 7 | High | 11 |
| installation | 4 | Medium | 12 |
| installationScenarios | 6 | Medium | 12 |
| productRelationships | 5 | Medium | 12 |
| relationships | 4 | Medium | 12 |
| social | 3 | Medium | 12 |
| n8n | 1 | Low | 12 |

**Deliverables:**
- All remaining routers migrated
- 39 endpoints moved
- Total: 154 endpoints migrated

#### Phase 7: Cleanup and Testing (Days 13-14)

| Task | Est. Hours |
|------|------------|
| Remove old route handlers from routes.ts | 4 |
| Update imports across codebase | 2 |
| Run full test suite | 2 |
| Performance benchmarking | 2 |
| Documentation updates | 2 |
| Code review and fixes | 4 |
| Production deployment prep | 2 |
| Final verification | 2 |

**Deliverables:**
- Old monolithic code removed
- All tests passing
- Documentation updated
- Ready for production

### 9.2 Migration Checklist Per Router

```markdown
## Router Migration Checklist: [RouterName]

### Pre-Migration
- [ ] Read existing endpoint code in routes.ts
- [ ] Identify all dependencies (services, middleware, schemas)
- [ ] List all endpoints with methods and paths
- [ ] Check for any special middleware combinations

### Implementation
- [ ] Create `server/routes/[name].router.ts`
- [ ] Implement RouterFactory function
- [ ] Export RouterModule metadata
- [ ] Add to `server/routes/index.ts`

### Testing
- [ ] Create `server/__tests__/routes/[name].test.ts`
- [ ] Test each endpoint with mock context
- [ ] Test error handling paths
- [ ] Test authentication requirements

### Verification
- [ ] Run full test suite
- [ ] Test manually in development
- [ ] Compare response formats with original
- [ ] Check for any breaking changes

### Cleanup
- [ ] Remove old handlers from routes.ts
- [ ] Update any direct imports
- [ ] Document any changes
```

### 9.3 Rollback Strategy

If issues arise during migration:

1. **Per-Router Rollback**: Each router can be individually disabled by removing from `routerModules` array
2. **Full Rollback**: Keep old routes.ts as `routes.legacy.ts` during migration
3. **Feature Flags**: Use environment variable to switch between old and new routing

```typescript
// Emergency rollback switch
const USE_MODULAR_ROUTERS = process.env.USE_MODULAR_ROUTERS !== 'false';

if (USE_MODULAR_ROUTERS) {
  registerRouters(app, routerModules, ctx);
} else {
  // Fall back to monolithic routes
  await registerLegacyRoutes(app);
}
```

---

## 10. Testing Strategy

### 10.1 Unit Test Template

```typescript
// server/__tests__/routes/[name].test.ts

import { Router } from 'express';
import request from 'supertest';
import express from 'express';
import { [name]Router, [name]RouterModule } from '../../routes/[name].router';
import { RouterContext } from '../../types/router';

describe('[Name] Router', () => {
  let app: express.Application;
  let mockCtx: RouterContext;

  beforeEach(() => {
    // Create mock context
    mockCtx = createMockRouterContext();

    // Create test app
    app = express();
    app.use(express.json());

    // Mount router
    const router = [name]Router(mockCtx);
    app.use([name]RouterModule.prefix, router);
  });

  describe('Module Metadata', () => {
    it('should have correct prefix', () => {
      expect([name]RouterModule.prefix).toBe('/api/[name]');
    });

    it('should have correct endpoint count', () => {
      expect([name]RouterModule.endpointCount).toBe(X);
    });
  });

  describe('GET /endpoint', () => {
    it('should return expected data', async () => {
      // Arrange
      mockCtx.services.storage.getSomething = jest.fn().mockResolvedValue({ data: 'test' });

      // Act
      const response = await request(app)
        .get('/api/[name]/endpoint')
        .expect(200);

      // Assert
      expect(response.body).toEqual({ data: 'test' });
      expect(mockCtx.services.storage.getSomething).toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      mockCtx.services.storage.getSomething = jest.fn().mockRejectedValue(new Error('DB error'));

      // Act
      const response = await request(app)
        .get('/api/[name]/endpoint')
        .expect(500);

      // Assert
      expect(response.body).toHaveProperty('error');
    });
  });

  // Add tests for each endpoint...
});

/**
 * Create mock RouterContext for testing
 */
function createMockRouterContext(): RouterContext {
  return {
    services: {
      storage: {
        // Mock all storage methods
      },
      genAIText: {} as any,
      genAIImage: {} as any,
      cloudinary: null,
      logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
      } as any,
      telemetry: {} as any,
      generationQueue: {} as any,
      generationQueueEvents: {} as any
    },
    domainServices: {
      // Mock domain services
    } as any,
    middleware: {
      requireAuth: (req, res, next) => {
        req.session = { userId: 1 } as any;
        next();
      },
      optionalAuth: (req, res, next) => next(),
      validate: () => (req, res, next) => next(),
      // ... other middleware
    } as any,
    uploads: {
      standard: {} as any,
      single: () => (req, res, next) => next(),
      array: () => (req, res, next) => next()
    },
    schemas: {} as any,
    utils: {
      // Mock utilities
    } as any
  };
}
```

### 10.2 Integration Test Template

```typescript
// server/__tests__/integration/routes.integration.test.ts

import request from 'supertest';
import { app } from '../../app';
import { db } from '../../db';

describe('Routes Integration', () => {
  beforeAll(async () => {
    // Setup test database
  });

  afterAll(async () => {
    // Cleanup
    await db.end();
  });

  describe('Router Registration', () => {
    it('should register all expected routes', async () => {
      // Health check should work
      const response = await request(app)
        .get('/api/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
    });

    it('should return 404 for unregistered routes', async () => {
      await request(app)
        .get('/api/nonexistent')
        .expect(404);
    });
  });

  describe('Cross-Router Dependencies', () => {
    it('should share authentication state', async () => {
      // Login
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password' });

      const cookie = loginRes.headers['set-cookie'];

      // Access protected route
      await request(app)
        .get('/api/products')
        .set('Cookie', cookie)
        .expect(200);
    });
  });
});
```

### 10.3 Test Coverage Requirements

| Router | Min Coverage | Critical Paths |
|--------|--------------|----------------|
| health | 100% | All endpoints |
| auth | 95% | Login, logout, session |
| products | 90% | CRUD, upload, analysis |
| transform | 85% | Generation pipeline |
| quota | 90% | Status, alerts |
| settings | 90% | API key management |

---

## 11. Success Criteria

### 11.1 Functional Requirements

- [ ] All 162 endpoints respond identically to pre-migration
- [ ] No breaking changes to API contracts
- [ ] Session/authentication works across routers
- [ ] File uploads work correctly
- [ ] Error responses follow standard format

### 11.2 Quality Requirements

- [ ] Each router < 500 lines of code
- [ ] Full TypeScript coverage (no `any` types in router code)
- [ ] >90% test coverage for all routers
- [ ] All routers testable in isolation
- [ ] Clear separation of concerns

### 11.3 Performance Requirements

- [ ] No measurable latency increase (< 5ms overhead)
- [ ] Memory usage within 10% of baseline
- [ ] Startup time within 20% of baseline
- [ ] No new memory leaks

### 11.4 Documentation Requirements

- [ ] Each router has JSDoc comments
- [ ] RouterModule metadata complete and accurate
- [ ] Migration guide for team members
- [ ] Updated API documentation

---

## 12. ADR: Router Factory Pattern

### ADR-001: Modular Router Architecture with Dependency Injection

**Status**: Accepted

**Context**:
The `routes.ts` file has grown to 5,399 lines with 162 endpoints, making it difficult to maintain, test, and understand. Multiple developers editing the same file leads to merge conflicts. Testing individual routes requires spinning up the entire application.

**Decision**:
We will adopt a modular router architecture using the Factory Pattern with Dependency Injection:

1. **RouterFactory Pattern**: Each router is created by a factory function that receives a `RouterContext` containing all dependencies.

2. **Dependency Injection**: Services, middleware, and utilities are injected through the context rather than imported directly.

3. **RouterModule Metadata**: Each router exports metadata including prefix, endpoint count, and description for registration and documentation.

4. **Centralized Registration**: A single `registerRouters()` function handles mounting all routers to the Express app.

**Alternatives Considered**:

1. **Class-based Controllers**: More OOP-style, but adds complexity and doesn't fit Express idioms well.

2. **Simple File Split**: Just splitting routes.ts into files without DI - easier initially but doesn't solve testability.

3. **Decorator Pattern**: Using decorators like NestJS - requires significant refactoring and adds framework lock-in.

**Consequences**:

**Positive**:
- Routes testable in isolation with mock dependencies
- Clear domain boundaries
- Smaller, focused files
- Easier onboarding for new developers
- Parallel development without conflicts
- Type-safe dependency injection

**Negative**:
- Initial migration effort (~14 days)
- More files to navigate
- Context building adds some overhead
- Team needs to learn new pattern

**Risks**:
- Migration could introduce bugs (mitigated by comprehensive testing)
- Performance impact (mitigated by benchmarking)
- Incomplete migration leaves codebase in inconsistent state (mitigated by rollback strategy)

---

## Appendix: Route Inventory

### Complete Endpoint List by Router

#### Health Router (`/api/health`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /live | No | Liveness probe |
| GET | /ready | No | Readiness probe |
| GET | / | No | Health status |

#### Auth Router (`/api/auth`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /register | No | Register user |
| POST | /login | No | Login user |
| POST | /logout | No | Logout user |
| GET | /me | Yes | Get current user |
| GET | /demo | No | Get/create demo session |

#### Products Router (`/api/products`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | / | No | Create product |
| GET | / | No | List products |
| GET | /:id | No | Get product |
| DELETE | /:id | No | Delete product |
| DELETE | / | No | Bulk delete |
| POST | /sync | No | Sync products |
| POST | /:productId/analyze | Yes | Analyze product |
| GET | /:productId/analysis | Yes | Get analysis |
| POST | /:productId/enrich | Yes | Enrich product |
| POST | /:productId/enrich-from-url | Yes | Enrich from URL |
| GET | /:productId/enrichment | Yes | Get enrichment |
| POST | /:productId/enrichment/verify | Yes | Verify enrichment |
| GET | /enrichment/pending | No | Get pending |
| POST | /:productId/suggest-relationships | Yes | Suggest relationships |
| POST | /find-similar | Yes | Find similar |

#### Generations Router (`/api/generations`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | / | No | List generations |
| GET | /:id | No | Get generation |
| GET | /:id/history | No | Get history |
| DELETE | /:id | No | Delete generation |
| POST | /:id/edit | No | Edit generation |
| POST | /:id/analyze | No | Analyze generation |

#### Quota Router (`/api/quota`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /status | No | Get status |
| GET | /history | No | Get history |
| GET | /breakdown | No | Get breakdown |
| GET | /rate-limit-status | No | Rate limit status |
| GET | /alerts | Yes | Get alerts |
| PUT | /alerts | Yes | Update alerts |
| GET | /check-alerts | No | Check alerts |
| GET | /google/status | No | Google status |
| GET | /google/snapshot | No | Google snapshot |
| POST | /google/sync | No | Sync Google quota |
| GET | /google/history | No | Google history |
| GET | /google/snapshots | No | List snapshots |

#### Settings Router (`/api/settings`)
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /api-keys | Yes | List API keys |
| POST | /api-keys/:service | Yes | Save API key |
| DELETE | /api-keys/:service | Yes | Delete API key |
| POST | /api-keys/:service/validate | Yes | Validate key |
| POST | /n8n | Yes | Save N8N config |
| GET | /n8n | Yes | Get N8N config |
| DELETE | /n8n | Yes | Delete N8N config |

*(Additional routers follow same pattern - total 162 endpoints across 30 routers)*

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-26 | Architecture Agent | Initial design document |

---

**End of Router Architecture Design Document**
