/**
 * Router Context Builder
 * Creates the dependency injection context for all routers
 */

import type {
  RouterContext,
  RouterServices,
  RouterMiddleware,
  RouterDomainServices,
  RouterUploads,
  RouterSchemas,
  RouterUtils,
} from '../../types/router';
import { storage } from '../../storage';
import { genAI } from '../../lib/gemini';
import { v2 as cloudinary } from 'cloudinary';
import { logger } from '../../lib/logger';
import { telemetry } from '../../instrumentation';
import { generationQueue, generationQueueEvents } from '../../lib/queue';
import { pool } from '../../db';
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
  insertProductRelationshipSchema,
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
  syncAccountSchema,
} from '../../validation/schemas';

// File utilities
import { saveOriginalFile, saveGeneratedImage, deleteFile } from '../../fileStorage';
import { toGenerationDTO, toGenerationDTOArray } from '../../dto/generationDTO';
import { isServerShuttingDown } from '../../utils/gracefulShutdown';

// Domain services
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
import { authService } from '../../services/authService';
import * as pricingEstimator from '../../services/pricingEstimator';

/**
 * Check if Cloudinary is properly configured
 */
function isCloudinaryConfigured(): boolean {
  return !!(
    process.env['CLOUDINARY_CLOUD_NAME'] &&
    process.env['CLOUDINARY_API_KEY'] &&
    process.env['CLOUDINARY_API_SECRET']
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
      files: 6, // Max 6 files
    },
  });
}

// Lazy-load Google Cloud Monitoring to prevent any import-time errors
let googleCloudMonitoringService: any = null;
async function getGoogleCloudService() {
  if (!googleCloudMonitoringService) {
    try {
      const module = await import('../../services/googleCloudMonitoringService');
      googleCloudMonitoringService = module.googleCloudMonitoringService;
    } catch (error) {
      logger.error({ module: 'GoogleCloudMonitoring', err: error }, 'Failed to load module');
    }
  }
  return googleCloudMonitoringService;
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
      cloud_name: process.env['CLOUDINARY_CLOUD_NAME'] ?? '',
      api_key: process.env['CLOUDINARY_API_KEY'] ?? '',
      api_secret: process.env['CLOUDINARY_API_SECRET'] ?? '',
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
    generationQueueEvents,
    pool,
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
    createRateLimiter,
  };

  const uploads: RouterUploads = {
    standard: upload,
    single: (fieldName: string) => upload.single(fieldName),
    array: (fieldName: string, maxCount: number) => upload.array(fieldName, maxCount),
  };

  const schemas: RouterSchemas = {
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
    syncAccount: syncAccountSchema,
  };

  const utils: RouterUtils = {
    saveOriginalFile,
    saveGeneratedImage,
    deleteFile,
    toGenerationDTO,
    toGenerationDTOArray,
    isServerShuttingDown,
  };

  const domainServices: RouterDomainServices = {
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
    apiKeyValidation,
    authService,
    pricingEstimator,
    getGoogleCloudService,
  };

  return {
    services,
    domainServices,
    middleware,
    uploads,
    schemas,
    utils,
  };
}
