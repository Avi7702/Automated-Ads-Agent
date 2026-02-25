/**
 * Settings Router
 * API key management endpoints for user settings
 * SECURITY: ALL endpoints require authentication
 *
 * Endpoints:
 * - GET /api/settings/api-keys - List all API key configurations
 * - POST /api/settings/api-keys/:service - Save/update an API key
 * - DELETE /api/settings/api-keys/:service - Remove an API key
 * - POST /api/settings/api-keys/:service/validate - Re-validate an existing key
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const settingsRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth } = ctx.middleware;
  const { encryption, apiKeyValidation } = ctx.domainServices;

  // All settings routes require auth
  router.use(requireAuth);

  /**
   * GET /api-keys
   * List all API key configurations for the current user
   * Returns status and preview (not actual keys) for each supported service
   */
  router.get(
    '/api-keys',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = (req as any).session.userId;
        const supportedServices = apiKeyValidation.getSupportedServices();

        // Get all user's custom keys
        const userKeys = await storage.getAllUserApiKeys(userId);
        const userKeyMap = new Map(userKeys.map((k) => [k.service, k]));

        // Environment variable mapping for checking fallbacks
        const envVarMap: Record<string, string | undefined> = {
          gemini: process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'],
          cloudinary: process.env['CLOUDINARY_API_KEY'],
          firecrawl: process.env['FIRECRAWL_API_KEY'],
          redis: process.env['REDIS_URL'],
        };

        const keys = supportedServices.map((service) => {
          const userKey = userKeyMap.get(service);
          const hasEnvVar = !!envVarMap[service];

          if (userKey) {
            return {
              service,
              configured: true,
              source: 'user' as const,
              keyPreview: userKey.keyPreview,
              isValid: userKey.isValid,
              lastValidated: userKey.lastValidatedAt?.toISOString() || null,
            };
          } else if (hasEnvVar) {
            return {
              service,
              configured: true,
              source: 'environment' as const,
              keyPreview: null,
              isValid: null,
              lastValidated: null,
            };
          } else {
            return {
              service,
              configured: false,
              source: null,
              keyPreview: null,
              isValid: null,
              lastValidated: null,
            };
          }
        });

        res.json({ keys });
      } catch (error: any) {
        logger.error({ module: 'APIKeys', err: error }, 'Error listing keys');
        res.status(500).json({ error: 'Failed to retrieve API key configurations' });
      }
    }),
  );

  /**
   * POST /api-keys/:service
   * Save or update an API key for a specific service
   * Flow: validate format -> test API -> encrypt -> save -> log audit -> return preview
   */
  router.post(
    '/api-keys/:service',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).session.userId;
      const service = String(req.params['service']);
      const ipAddress = (req.ip ?? (req.headers['x-forwarded-for'] as string) ?? '').split(',')[0]?.trim() ?? '';
      const userAgent = req.headers['user-agent'] || '';

      try {
        // Validate service name
        if (!apiKeyValidation.isValidService(service)) {
          res.status(400).json({
            success: false,
            error: `Invalid service: ${service}`,
            solution: `Supported services: ${apiKeyValidation.getSupportedServices().join(', ')}`,
          });
          return;
        }

        // Validate request body
        const { saveApiKeySchema } = await import('../validation/schemas');
        const parseResult = saveApiKeySchema.safeParse(req.body);
        if (!parseResult.success) {
          res.status(400).json({
            success: false,
            error: parseResult.error.issues[0]?.message || 'Invalid request body',
          });
          return;
        }

        const { apiKey, cloudName, apiSecret } = parseResult.data;
        const trimmedKey = apiKey.trim();

        // Check if master encryption key is configured
        if (!encryption.validateMasterKeyConfigured()) {
          logger.error({ module: 'APIKeys' }, 'Master encryption key not configured');
          res.status(500).json({
            success: false,
            error: 'Encryption not configured',
            solution: 'Contact administrator to configure API_KEY_ENCRYPTION_KEY',
          });
          return;
        }

        // Validate the API key with the service
        type ServiceName = import('../services/apiKeyValidationService').ServiceName;
        let validationResult;
        if (service === 'cloudinary') {
          // Cloudinary requires additional parameters
          if (!cloudName || !apiSecret) {
            res.status(400).json({
              success: false,
              error: 'Cloudinary requires cloudName, apiKey, and apiSecret',
              solution: 'Provide all three Cloudinary credentials',
            });
            return;
          }
          validationResult = await apiKeyValidation.validateApiKey(service as ServiceName, trimmedKey, {
            cloudName: cloudName.trim(),
            apiKey: trimmedKey,
            apiSecret: apiSecret.trim(),
          });
        } else {
          validationResult = await apiKeyValidation.validateApiKey(service as ServiceName, trimmedKey);
        }

        if (!validationResult.valid) {
          // Log failed validation attempt
          await storage.logApiKeyAction({
            userId,
            service,
            action: 'validate',
            ipAddress,
            userAgent,
            success: false,
            ...(validationResult.error != null && { errorMessage: validationResult.error }),
          });

          res.status(400).json({
            success: false,
            error: validationResult.error || 'API key validation failed',
            solution: validationResult.solution,
          });
          return;
        }

        // Encrypt the API key
        let encryptedData;
        try {
          // For Cloudinary, we store all credentials as a JSON object
          const keyToEncrypt =
            service === 'cloudinary'
              ? JSON.stringify({ cloudName: cloudName!.trim(), apiKey: trimmedKey, apiSecret: apiSecret!.trim() })
              : trimmedKey;
          encryptedData = encryption.encryptApiKey(keyToEncrypt);
        } catch (error: any) {
          logger.error({ module: 'APIKeys', err: error }, 'Encryption failed');
          res.status(500).json({
            success: false,
            error: 'Encryption failed',
            solution: 'Contact support. This is an internal error.',
          });
          return;
        }

        // Generate key preview
        const keyPreview = encryption.generateKeyPreview(trimmedKey);

        // Check if this is a create or update operation
        const existingKey = await storage.getUserApiKey(userId, service);
        const action = existingKey ? 'update' : 'create';

        // Save to database
        await storage.saveUserApiKey({
          userId,
          service,
          encryptedKey: encryptedData.ciphertext,
          iv: encryptedData.iv,
          authTag: encryptedData.authTag,
          keyPreview,
          isValid: true,
        });

        // Update global Gemini client so ALL services use the new key immediately
        if (service === 'gemini') {
          const { setGlobalGeminiClient } = await import('../lib/geminiClient');
          const { createGeminiClient } = await import('../lib/gemini');
          setGlobalGeminiClient(createGeminiClient(trimmedKey));
        }

        // Log successful action
        await storage.logApiKeyAction({
          userId,
          service,
          action,
          ipAddress,
          userAgent,
          success: true,
        });

        const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
        res.json({
          success: true,
          keyPreview,
          message: `${serviceName} API key saved successfully`,
        });
      } catch (error: any) {
        logger.error({ module: 'APIKeys', err: error }, 'Error saving key');

        // Log error
        await storage.logApiKeyAction({
          userId,
          service,
          action: 'create',
          ipAddress,
          userAgent,
          success: false,
          errorMessage: error.message,
        });

        res.status(500).json({
          success: false,
          error: 'Failed to save API key',
          solution: 'Please try again. If the problem persists, contact support.',
        });
      }
    }),
  );

  /**
   * DELETE /api-keys/:service
   * Remove a user's custom API key for a service
   * Will fall back to environment variable if available
   */
  router.delete(
    '/api-keys/:service',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).session.userId;
      const service = String(req.params['service']);
      const ipAddress = (req.ip ?? (req.headers['x-forwarded-for'] as string) ?? '').split(',')[0]?.trim() ?? '';
      const userAgent = req.headers['user-agent'] || '';

      try {
        // Validate service name
        if (!apiKeyValidation.isValidService(service)) {
          res.status(400).json({
            success: false,
            error: `Invalid service: ${service}`,
            solution: `Supported services: ${apiKeyValidation.getSupportedServices().join(', ')}`,
          });
          return;
        }

        // Check if user has a custom key
        const existingKey = await storage.getUserApiKey(userId, service);
        if (!existingKey) {
          res.status(404).json({
            success: false,
            error: 'No custom API key found for this service',
          });
          return;
        }

        // Delete the key
        await storage.deleteUserApiKey(userId, service);

        // Revert to env var fallback when user removes their Gemini key
        if (service === 'gemini') {
          const { setGlobalGeminiClient } = await import('../lib/geminiClient');
          setGlobalGeminiClient(null);
        }

        // Log the action
        await storage.logApiKeyAction({
          userId,
          service,
          action: 'delete',
          ipAddress,
          userAgent,
          success: true,
        });

        // Check if environment fallback exists
        const envVarMap: Record<string, string | undefined> = {
          gemini: process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'],
          cloudinary: process.env['CLOUDINARY_API_KEY'],
          firecrawl: process.env['FIRECRAWL_API_KEY'],
          redis: process.env['REDIS_URL'],
        };
        const hasEnvFallback = !!envVarMap[service];

        const serviceName = service.charAt(0).toUpperCase() + service.slice(1);
        res.json({
          success: true,
          message: hasEnvFallback
            ? `${serviceName} custom key removed. Using environment variable.`
            : `${serviceName} API key removed.`,
          fallbackAvailable: hasEnvFallback,
        });
      } catch (error: any) {
        logger.error({ module: 'APIKeys', err: error }, 'Error deleting key');

        await storage.logApiKeyAction({
          userId,
          service,
          action: 'delete',
          ipAddress,
          userAgent,
          success: false,
          errorMessage: error.message,
        });

        res.status(500).json({
          success: false,
          error: 'Failed to delete API key',
        });
      }
    }),
  );

  /**
   * POST /api-keys/:service/validate
   * Re-validate an existing API key without updating it
   * Updates the lastValidatedAt and isValid fields in the database
   */
  router.post(
    '/api-keys/:service/validate',
    asyncHandler(async (req: Request, res: Response) => {
      const userId = (req as any).session.userId;
      const service = String(req.params['service']);
      const ipAddress = (req.ip ?? (req.headers['x-forwarded-for'] as string) ?? '').split(',')[0]?.trim() ?? '';
      const userAgent = req.headers['user-agent'] || '';

      try {
        // Validate service name
        type ServiceName = import('../services/apiKeyValidationService').ServiceName;
        if (!apiKeyValidation.isValidService(service)) {
          res.status(400).json({
            valid: false,
            error: `Invalid service: ${service}`,
            solution: `Supported services: ${apiKeyValidation.getSupportedServices().join(', ')}`,
          });
          return;
        }

        // Resolve the API key (user's key or environment fallback)
        const resolved = await storage.resolveApiKey(userId, service);

        if (resolved.source === 'none' || !resolved.key) {
          res.status(404).json({
            valid: false,
            error: 'No API key configured for this service',
            solution: `Add a ${service} API key in settings or configure the environment variable`,
          });
          return;
        }

        // Validate the resolved key
        let validationResult;
        if (service === 'cloudinary' && resolved.source === 'user') {
          // For user-stored Cloudinary keys, they're stored as JSON with all credentials
          try {
            const credentials = JSON.parse(resolved.key);
            validationResult = await apiKeyValidation.validateApiKey(
              service as ServiceName,
              credentials.apiKey,
              credentials,
            );
          } catch {
            validationResult = {
              valid: false,
              error: 'Stored credentials are corrupted',
              solution: 'Re-enter your Cloudinary credentials',
            };
          }
        } else if (service === 'cloudinary' && resolved.source === 'environment') {
          // For environment Cloudinary, need all env vars
          validationResult = await apiKeyValidation.validateApiKey(service as ServiceName, resolved.key, {
            cloudName: process.env['CLOUDINARY_CLOUD_NAME'] || '',
            apiKey: resolved.key,
            apiSecret: process.env['CLOUDINARY_API_SECRET'] || '',
          });
        } else {
          validationResult = await apiKeyValidation.validateApiKey(service as ServiceName, resolved.key);
        }

        // Update validity in database if this is a user key
        if (resolved.source === 'user') {
          await storage.updateUserApiKeyValidity(userId, service, validationResult.valid);
        }

        // Log the validation attempt
        await storage.logApiKeyAction({
          userId,
          service,
          action: 'validate',
          ipAddress,
          userAgent,
          success: validationResult.valid,
          ...(validationResult.error != null && { errorMessage: validationResult.error }),
        });

        if (validationResult.valid) {
          res.json({
            valid: true,
            source: resolved.source,
            details: validationResult.details,
          });
        } else {
          res.json({
            valid: false,
            error: validationResult.error,
            solution: validationResult.solution,
            source: resolved.source,
          });
        }
      } catch (error: any) {
        logger.error({ module: 'APIKeys', err: error }, 'Error validating key');

        await storage.logApiKeyAction({
          userId,
          service,
          action: 'validate',
          ipAddress,
          userAgent,
          success: false,
          errorMessage: error.message,
        });

        res.status(500).json({
          valid: false,
          error: 'Failed to validate API key',
          solution: 'Please try again. If the problem persists, contact support.',
        });
      }
    }),
  );

  return router;
};

export const settingsModule: RouterModule = {
  prefix: '/api/settings',
  factory: settingsRouter,
  description: 'Settings and API key management',
  endpointCount: 4,
  requiresAuth: true,
  tags: ['settings', 'api-keys'],
};
