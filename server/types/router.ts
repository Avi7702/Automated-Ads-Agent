/**
 * Router Types - Dependency Injection Pattern for Modular Routing
 * Sprint 2, Week 1, Days 3-5 - Task 2.3
 */

import { Router, Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodSchema } from 'zod';
import type { IStorage } from '../storage';
import type { GoogleGenerativeAI } from '@google/generative-ai';
import type { v2 as cloudinaryType } from 'cloudinary';
import type { Logger } from 'pino';
import type multer from 'multer';

/**
 * Core services available to all routers
 */
export interface RouterServices {
  /** Database/storage operations */
  storage: IStorage;

  /** Gemini AI client for text operations */
  genAIText: GoogleGenerativeAI;

  /** Gemini AI client for image operations */
  genAIImage: GoogleGenerativeAI;

  /** Cloudinary client (may be null if not configured) */
  cloudinary: typeof cloudinaryType | null;

  /** Structured logger instance */
  logger: Logger;

  /** Generation queue for async jobs */
  generationQueue: typeof import('../lib/queue').generationQueue;

  /** Queue events for SSE streaming */
  generationQueueEvents: typeof import('../lib/queue').generationQueueEvents;

  /** Telemetry for tracking */
  telemetry: typeof import('../instrumentation').telemetry;

  /** Database pool for raw queries */
  pool: typeof import('../db').pool;
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
  brandImageRAG: typeof import('../services/brandImageRecommendationRAG').brandImageRecommendationRAG;

  /** Template pattern matching RAG */
  templatePatternRAG: typeof import('../services/templatePatternRAG');

  /** Pattern extraction service */
  patternExtraction: typeof import('../services/patternExtractionService');

  /** Encryption service for API keys */
  encryption: typeof import('../services/encryptionService');

  /** API key validation */
  apiKeyValidation: typeof import('../services/apiKeyValidationService');

  /** Authentication service */
  authService: typeof import('../services/authService').authService;

  /** Pricing estimator */
  pricingEstimator: typeof import('../services/pricingEstimator');

  /** Google Cloud Monitoring (optional, lazy loaded) */
  getGoogleCloudService: () => Promise<any>;
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
  /** Standard upload instance (10MB, 6 files) */
  standard: multer.Multer;

  /** Single file upload middleware */
  single: (fieldName: string) => RequestHandler;

  /** Array of files upload middleware */
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

  /** Check if server is shutting down */
  isServerShuttingDown: typeof import('../utils/gracefulShutdown').isServerShuttingDown;
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
