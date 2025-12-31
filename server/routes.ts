import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { seedBrandProfile } from "./seeds/seedBrandProfile";
import multer from "multer";

import { saveOriginalFile, saveGeneratedImage, deleteFile } from "./fileStorage";
import { insertGenerationSchema, insertProductSchema, insertPromptTemplateSchema } from "@shared/schema";
import express from "express";
import path from "path";
import { v2 as cloudinary } from "cloudinary";
import { authService } from "./services/authService";
import { requireAuth } from "./middleware/auth";
import { createRateLimiter } from "./middleware/rateLimit";
import { telemetry } from "./instrumentation";
import { computeAdaptiveEstimate, estimateGenerationCostMicros, normalizeResolution } from "./services/pricingEstimator";
import { quotaMonitoringService, parseRetryDelay, parseLimitType } from "./services/quotaMonitoringService";

// Lazy-load Google Cloud Monitoring to prevent any import-time errors
let googleCloudMonitoringService: any = null;
async function getGoogleCloudService() {
  if (!googleCloudMonitoringService) {
    try {
      const module = await import("./services/googleCloudMonitoringService");
      googleCloudMonitoringService = module.googleCloudMonitoringService;
    } catch (error) {
      console.error("[GoogleCloudMonitoring] Failed to load module:", error);
    }
  }
  return googleCloudMonitoringService;
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 6 // Max 6 files
  }
});

// Validate and initialize Cloudinary
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  console.warn("[Cloudinary] Missing credentials - product library features disabled");
}

const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Initialize TWO Gemini clients:
// 1. genaiText - for text operations (uses Replit AI Integrations for better quotas)
// 2. genaiImage - for image generation (uses direct Google API as Replit doesn't support image models)

import { genAI } from "./lib/gemini";

// Use the shared client for all operations
const genaiText = genAI;
const genaiImage = genAI;


// Legacy alias for backward compatibility
const genai = genaiText;

export async function registerRoutes(app: Express): Promise<Server> {
  // Health check endpoint (no rate limiting)
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Serve static files from attached_assets directory
  app.use("/attached_assets", express.static(path.join(process.cwd(), "attached_assets")));

  // Serve uploaded images (generations)
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Apply rate limiting to API routes
  const rateLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
  });
  app.use("/api/", rateLimiter);

  // ===== AUTH ROUTES =====

  // POST /api/auth/register
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({ error: "User already exists" });
      }

      const hashedPassword = await authService.hashPassword(password);
      const user = await storage.createUser(email, hashedPassword);

      (req as any).session.userId = user.id;

      telemetry.trackAuth({
        action: 'register',
        success: true,
        userId: user.id,
      });

      res.json({ id: user.id, email: user.email });
    } catch (error: any) {
      console.error("[Auth Register] Error:", error);

      telemetry.trackAuth({
        action: 'register',
        success: false,
        reason: error.message,
      });

      res.status(500).json({ error: "Registration failed" });
    }
  });

  // POST /api/auth/login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      // Check lockout
      if (authService.isLockedOut(email)) {
        const remaining = authService.getLockoutTimeRemaining(email);
        return res.status(429).json({
          error: "Too many failed attempts. Try again later.",
          retryAfter: remaining
        });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        authService.recordFailedLogin(email);
        telemetry.trackAuth({
          action: 'login',
          success: false,
          reason: 'user_not_found',
        });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const valid = await authService.comparePassword(password, user.passwordHash || "");
      if (!valid) {
        authService.recordFailedLogin(email);
        telemetry.trackAuth({
          action: 'login',
          success: false,
          reason: 'invalid_password',
        });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      authService.clearFailedLogins(email);
      (req as any).session.userId = user.id;

      telemetry.trackAuth({
        action: 'login',
        success: true,
        userId: user.id,
      });

      res.json({ id: user.id, email: user.email });
    } catch (error: any) {
      console.error("[Auth Login] Error:", error);

      telemetry.trackAuth({
        action: 'login',
        success: false,
        reason: error.message,
      });

      res.status(500).json({ error: "Login failed" });
    }
  });

  // POST /api/auth/logout
  app.post("/api/auth/logout", (req, res) => {
    (req as any).session.destroy((err: any) => {
      if (err) {
        return res.status(500).json({ error: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  // GET /api/auth/me
  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const userId = (req as any).session.userId;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json({ id: user.id, email: user.email });
    } catch (error: any) {
      console.error("[Auth Me] Error:", error);
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  // GET /api/auth/demo - Auto-login as demo user for single-tenant mode
  app.get("/api/auth/demo", async (req, res) => {
    try {
      const demoEmail = "demo@company.com";
      let user = await storage.getUserByEmail(demoEmail);

      if (!user) {
        // Create demo user if doesn't exist
        const hashedPassword = await authService.hashPassword("demo123");
        user = await storage.createUser(demoEmail, hashedPassword);
      }

      (req as any).session.userId = user.id;
      res.json({ id: user.id, email: user.email, isDemo: true });
    } catch (error: any) {
      console.error("[Auth Demo] Error:", error);
      res.status(500).json({ error: "Demo login failed" });
    }
  });

  // ===== END AUTH ROUTES =====
  // Price estimator (adaptive, based on generation history)
  app.get("/api/pricing/estimate", async (req, res) => {
    try {
      const brandId = (req as any).session?.userId || 'anonymous';

      const resolution = normalizeResolution(req.query.resolution) || '2K';
      const operation = (req.query.operation === 'edit' ? 'edit' : 'generate') as 'generate' | 'edit';
      const inputImagesCount = Math.max(0, Math.min(6, parseInt(String(req.query.inputImagesCount || '0'), 10) || 0));
      const promptChars = Math.max(0, Math.min(20000, parseInt(String(req.query.promptChars || '0'), 10) || 0));

      const prior = estimateGenerationCostMicros({
        resolution,
        inputImagesCount,
        promptChars,
      });

      const rows = await storage.getGenerationUsageRows({
        brandId,
        operation,
        resolution,
        inputImagesCount,
        limit: 300,
      });

      const estimate = computeAdaptiveEstimate({
        rows,
        priorMeanMicros: prior.estimatedCostMicros,
        priorStrength: 10,
        halfLifeDays: 7,
      });

      const microsToUsd = (micros: number) => Math.round(micros) / 1_000_000;

      res.json({
        currency: 'USD',
        estimatedCost: microsToUsd(estimate.estimatedCostMicros),
        p50: microsToUsd(estimate.p50Micros),
        p90: microsToUsd(estimate.p90Micros),
        sampleCount: estimate.sampleCount,
        effectiveSampleCount: estimate.effectiveSampleCount,
        lastUpdatedAt: estimate.lastUpdatedAt,
        usedFallback: estimate.usedFallback,
      });
    } catch (error: any) {
      console.error('[Pricing Estimate] Error:', error);
      res.status(500).json({ error: 'Failed to estimate price' });
    }
  });

  // Image transformation endpoint (supports both image transformation and text-only generation)
  app.post("/api/transform", upload.array("images", 6), async (req, res) => {
    const startTime = Date.now();
    const userId = (req as any).session?.userId;
    let success = false;
    let errorType: string | undefined;

    try {
      // Safely handle files - could be undefined, null, or empty
      const files = Array.isArray(req.files) ? req.files as Express.Multer.File[] : [];
      const { prompt, resolution, mode, templateId, templateReferenceUrls } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }

      const hasFiles = files.length > 0;

      // Parse and validate generation mode
      const generationMode = mode || 'standard';
      const validModes = ['standard', 'exact_insert', 'inspiration'];
      if (!validModes.includes(generationMode)) {
        return res.status(400).json({ error: `Invalid mode. Must be one of: ${validModes.join(', ')}` });
      }

      // Validate template-related parameters
      if ((generationMode === 'exact_insert' || generationMode === 'inspiration') && !templateId) {
        return res.status(400).json({ error: `templateId is required for ${generationMode} mode` });
      }

      const selectedResolution = normalizeResolution(resolution) || '2K';
      console.log(`[Transform] Processing ${hasFiles ? files.length : 0} image(s) with prompt: "${prompt.substring(0, 100)}..." [Mode: ${generationMode}]`);

      // Fetch template if using template-based mode
      let template = null;
      if (templateId) {
        template = await storage.getAdSceneTemplateById(templateId);
        if (!template) {
          return res.status(404).json({ error: "Template not found" });
        }
      }

      // Build the prompt for transformation or generation based on mode
      let enhancedPrompt = prompt;

      if (generationMode === 'exact_insert' && template) {
        // EXACT_INSERT MODE: Product must be inserted into template scene with quality constraints
        if (hasFiles) {
          enhancedPrompt = `Insert this product into the following scene template while maintaining exact quality standards.

Template Scene: ${template.promptBlueprint}

User Instructions: ${prompt}

CRITICAL QUALITY CONSTRAINTS:
- Product must be clearly visible and recognizable as the main subject
- Product lighting must match the template scene's lighting style exactly
- Product placement must follow the template's placement hints: ${JSON.stringify(template.placementHints || {})}
- Maintain professional photography quality
- Scene environment should match template exactly: ${template.environment || 'as described'}
- Overall mood must match template mood: ${template.mood || 'as described'}
- Do not add text or watermarks
- Product must look natural and integrated into the scene, not pasted on

If multiple products provided, arrange them according to the template's composition while maintaining all quality constraints.`;
        } else {
          enhancedPrompt = `Generate an image following this scene template exactly.

Template Scene: ${template.promptBlueprint}

User Instructions: ${prompt}

QUALITY CONSTRAINTS:
- Follow the template's scene description precisely
- Match lighting style: ${template.lightingStyle || 'as described in template'}
- Match environment: ${template.environment || 'as described'}
- Match mood: ${template.mood || 'as described'}
- Professional photography quality
- Do not add text or watermarks`;
        }
      } else if (generationMode === 'inspiration' && template) {
        // INSPIRATION MODE: Use template as style guide, but create new scene
        if (hasFiles) {
          enhancedPrompt = `Transform this product photo inspired by the following template style, but create a unique scene.

Template Inspiration:
- Category: ${template.category}
- Mood: ${template.mood || 'not specified'}
- Lighting Style: ${template.lightingStyle || 'not specified'}
- Environment Type: ${template.environment || 'not specified'}
- General Vibe: ${template.promptBlueprint.slice(0, 200)}

User Instructions: ${prompt}

Guidelines:
- Keep the product as the hero/focus
- Capture the template's mood and style, but create a NEW unique scene
- Maintain professional photography quality
- Ensure the product is clearly visible and recognizable
- Do not copy the template scene exactly - be creative while maintaining the aesthetic
- Do not add text or watermarks`;
        } else {
          enhancedPrompt = `Generate an image inspired by this template style, creating a unique scene.

Template Inspiration:
- Category: ${template.category}
- Mood: ${template.mood || 'not specified'}
- Lighting Style: ${template.lightingStyle || 'not specified'}
- Environment: ${template.environment || 'not specified'}

User Instructions: ${prompt}

Guidelines:
- Capture the template's aesthetic and mood
- Create a unique scene, don't copy the template exactly
- Professional photography quality
- Do not add text or watermarks`;
        }
      } else {
        // STANDARD MODE: Original behavior
        if (hasFiles) {
          if (files.length === 1) {
            enhancedPrompt = `Transform this product photo based on the following instructions: ${prompt}

Guidelines:
- Keep the product as the hero/focus
- Maintain professional photography quality
- Ensure the product is clearly visible and recognizable
- Apply the requested scene, lighting, and style changes
- Do not add text or watermarks`;
          } else {
            enhancedPrompt = `Transform these ${files.length} product photos based on the following instructions: ${prompt}

Guidelines:
- Combine/arrange all products in a cohesive scene
- Keep all products clearly visible and recognizable
- Maintain professional photography quality
- Apply the requested scene, lighting, and style changes
- Show how the products work together or as a collection
- Do not add text or watermarks`;
          }
        }
        // If no files in standard mode, use prompt as-is for text-only generation
      }

      // INJECT BRAND PROFILE (if available)
      const brandProfile = await storage.getBrandProfileByUserId(req.params.userId || (req.user as any)?.id || req.session.userId);
      if (brandProfile) {
        console.log(`[Transform] Applying Brand Profile: ${brandProfile.brandName}`);
        const brandContext = `

BRAND GUIDELINES (${brandProfile.brandName}):
- Visual Style: ${brandProfile.preferredStyles?.join(", ") || "Professional"}
- Brand Values: ${brandProfile.brandValues?.join(", ") || "Reliability"}
- Brand Colors: ${brandProfile.colorPreferences?.join(", ") || "Standard"}
- Voice Principles: ${(brandProfile.voice as { principles?: string[] })?.principles?.join(", ") || "Professional"}

Ensure the generated image aligns with these brand guidelines where possible.`;
        enhancedPrompt += brandContext;
      }

      // Build user message parts
      const userParts: any[] = [];

      // Add template reference images first (for exact_insert mode)
      if (generationMode === 'exact_insert' && templateReferenceUrls && Array.isArray(templateReferenceUrls)) {
        // Helper to validate URL is safe (SSRF protection)
        const isAllowedUrl = (url: string): boolean => {
          try {
            const parsed = new URL(url);
            // Only allow HTTPS from known CDN domains
            const allowedHosts = ['res.cloudinary.com', 'images.unsplash.com', 'cdn.pixabay.com'];
            return parsed.protocol === 'https:' && allowedHosts.some(h => parsed.hostname.endsWith(h));
          } catch {
            return false;
          }
        };

        for (const refUrl of templateReferenceUrls.slice(0, 3)) { // Max 3 reference images
          // Skip invalid or potentially malicious URLs
          if (!isAllowedUrl(refUrl)) {
            console.warn(`[Transform] Skipping disallowed URL: ${refUrl}`);
            continue;
          }

          try {
            // Add timeout with AbortController
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(refUrl, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (response.ok) {
              const buffer = await response.arrayBuffer();
              userParts.push({
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: Buffer.from(buffer).toString('base64'),
                },
              });
            }
          } catch (err) {
            console.warn(`[Transform] Failed to fetch template reference image: ${refUrl}`, err);
          }
        }
      }

      // Add product images (if provided)
      if (hasFiles) {
        files.forEach((file, index) => {
          userParts.push({
            inlineData: {
              mimeType: file.mimetype,
              data: file.buffer.toString("base64"),
            },
          });
        });
      }

      // Then add the prompt
      userParts.push({ text: enhancedPrompt });

      // Build the contents array for the API call
      const contents = [
        { role: "user", parts: userParts }
      ];

      // Generate content with image input using Gemini image generation model
      // MUST use genaiImage (direct Google API) - Replit AI Integrations doesn't support image models
      if (!genaiImage) {
        throw new Error("Image generation requires GEMINI_API_KEY or GOOGLE_API_KEY (direct API, not AI Integrations)");
      }

      const modelName = "gemini-3-pro-image-preview";
      const validResolutions = ["1K", "2K", "4K"];
      const requestedResolution = validResolutions.includes(req.body.resolution)
        ? req.body.resolution
        : "2K";
      console.log(`[Transform] Using model: ${modelName}, resolution: ${requestedResolution} (direct Google API)`);

      const result = await genaiImage.models.generateContent({
        model: modelName,
        contents,
        config: {
          imageConfig: {
            imageSize: requestedResolution, // "1K", "2K", or "4K"
          }
        }
      });

      console.log(`[Transform] Model response - modelVersion: ${result.modelVersion}, candidates: ${result.candidates?.length}`);
      const usageMetadata = (result as any).usageMetadata;
      if (usageMetadata) {
        console.log(`[Transform] Captured usageMetadata: ${JSON.stringify(usageMetadata)}`);
      }

      // Check if we got an image back
      if (!result.candidates?.[0]?.content?.parts?.[0]) {
        throw new Error("No image generated");
      }

      const modelResponse = result.candidates[0].content;
      const imagePart = modelResponse.parts?.find((p: any) => p.inlineData);

      if (imagePart && imagePart.inlineData && imagePart.inlineData.data) {
        // Save uploaded files to disk (if any were provided)
        const originalImagePaths: string[] = [];
        if (hasFiles) {
          for (const file of files) {
            const savedPath = await saveOriginalFile(file.buffer, file.originalname);
            originalImagePaths.push(savedPath);
          }
        }

        // Save generated image to disk
        const generatedImageData = imagePart.inlineData.data;
        const mimeType = imagePart.inlineData.mimeType || "image/png";
        const format = mimeType.split("/")[1] || "png";
        const generatedImagePath = await saveGeneratedImage(generatedImageData, format);

        // CRITICAL: Build and store conversation history for future edits
        // This includes the thought signatures that Gemini needs to "remember" the image
        // Store as raw object - Drizzle will handle JSONB serialization
        const conversationHistory = [
          { role: "user", parts: userParts },
          modelResponse  // This contains thoughtSignature fields - DO NOT MODIFY
        ];

        // Save generation record to database with conversation history
        const generation = await storage.saveGeneration({
          prompt,
          originalImagePaths,
          generatedImagePath,
          resolution: selectedResolution,
          conversationHistory,  // Pass as object, Drizzle handles JSONB
          parentGenerationId: null,
          editPrompt: null,
        });

        console.log(`[Transform] Saved generation ${generation.id} with conversation history`);
        // Persist usage/cost estimate for adaptive pricing
        try {
          const durationMsForUsage = Date.now() - startTime;
          const cost = estimateGenerationCostMicros({
            resolution: selectedResolution,
            inputImagesCount: hasFiles ? files.length : 0,
            promptChars: String(prompt).length,
            usageMetadata: (typeof usageMetadata === "object" ? usageMetadata : null),
          });

          await storage.saveGenerationUsage({
            generationId: generation.id,
            brandId: userId || "anonymous",
            model: modelName,
            operation: "generate",
            resolution: selectedResolution,
            inputImagesCount: hasFiles ? files.length : 0,
            promptChars: String(prompt).length,
            durationMs: durationMsForUsage,
            inputTokens: cost.inputTokens,
            outputTokens: cost.outputTokens,
            estimatedCostMicros: cost.estimatedCostMicros,
            estimationSource: cost.estimationSource,
          });
        } catch (e) {
          console.warn("[Transform] Failed to persist generation usage (run db:push?):", e);
        }

        success = true;

        // Return the file path or Cloudinary URL for the frontend to use
        res.json({
          success: true,
          imageUrl: generatedImagePath.startsWith("http") ? generatedImagePath : `/${generatedImagePath}`,
          generationId: generation.id,
          prompt: prompt,
          canEdit: true,
          mode: generationMode,
          templateId: templateId || null
        });
      } else {
        errorType = 'no_image_content';
        throw new Error("Generated content was not an image");
      }

    } catch (error: any) {
      console.error("[Transform] Error:", error);
      errorType = errorType || (error.name || 'unknown');

      telemetry.trackError({
        endpoint: '/api/transform',
        errorType: errorType || 'unknown',
        statusCode: 500,
        userId,
      });

      res.status(500).json({
        error: "Failed to transform image",
        details: error.message
      });
    } finally {
      // Track Gemini API usage and cost
      const durationMs = Date.now() - startTime;
      const inputTokensEstimate = Math.ceil((req.body.prompt?.length || 0) * 0.25);

      telemetry.trackGeminiUsage({
        model: 'gemini-3-pro-image-preview',
        operation: 'generate',
        inputTokens: inputTokensEstimate,
        outputTokens: 0,
        durationMs,
        userId,
        success,
        errorType,
      });

      // Track for quota monitoring dashboard
      try {
        await quotaMonitoringService.trackApiCall({
          brandId: userId || 'anonymous',
          operation: 'generate',
          model: 'gemini-3-pro-image-preview',
          success,
          durationMs,
          inputTokens: inputTokensEstimate,
          outputTokens: 0,
          costMicros: success ? estimateGenerationCostMicros({
            resolution: req.body.resolution || '2K',
            inputImagesCount: Array.isArray(req.files) ? req.files.length : 0,
            promptChars: String(req.body.prompt || '').length,
          }).estimatedCostMicros : 0,
          errorType,
          isRateLimited: errorType === 'RESOURCE_EXHAUSTED' || errorType === 'rate_limit',
        });
      } catch (trackError) {
        console.warn('[Transform] Failed to track quota:', trackError);
      }
    }
  });

  // Get all generations (gallery)
  app.get("/api/generations", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const allGenerations = await storage.getGenerations(limit);
      res.json(allGenerations);
    } catch (error: any) {
      console.error("[Generations] Error:", error);
      res.status(500).json({ error: "Failed to fetch generations" });
    }
  });

  // Get single generation by ID
  app.get("/api/generations/:id", async (req, res) => {
    try {
      const generation = await storage.getGenerationById(req.params.id);
      if (!generation) {
        return res.status(404).json({ error: "Generation not found" });
      }
      res.json({
        ...generation,
        canEdit: !!generation.conversationHistory
      });
    } catch (error: any) {
      console.error("[Generation] Error:", error);
      res.status(500).json({ error: "Failed to fetch generation" });
    }
  });

  // Get edit history for a generation
  app.get("/api/generations/:id/history", async (req, res) => {
    try {
      const { id } = req.params;

      const generation = await storage.getGenerationById(id);
      if (!generation) {
        return res.status(404).json({ error: "Generation not found" });
      }

      // Get full edit chain
      const history = await storage.getEditHistory(id);

      res.json({
        current: generation,
        history: history,
        totalEdits: history.length - 1 // Subtract 1 because the original is included
      });
    } catch (error: any) {
      console.error("[Generation History] Error:", error);
      res.status(500).json({ error: "Failed to fetch generation history" });
    }
  });

  // Delete generation
  app.delete("/api/generations/:id", async (req, res) => {
    try {
      const generation = await storage.getGenerationById(req.params.id);
      if (!generation) {
        return res.status(404).json({ error: "Generation not found" });
      }

      // Delete files from disk
      await deleteFile(generation.generatedImagePath);
      for (const originalPath of generation.originalImagePaths) {
        await deleteFile(originalPath);
      }

      // Delete from database
      await storage.deleteGeneration(req.params.id);

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Delete Generation] Error:", error);
      res.status(500).json({ error: "Failed to delete generation" });
    }
  });

  // Edit generation - Multi-turn image editing using stored conversation history
  app.post("/api/generations/:id/edit", async (req, res) => {
    const startTime = Date.now();
    const userId = (req as any).session?.userId;
    let success = false;
    let errorType: string | undefined;

    try {
      const { id } = req.params;
      const { editPrompt } = req.body;

      // Validate input
      if (!editPrompt || editPrompt.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Edit prompt is required"
        });
      }

      // Load the parent generation
      const parentGeneration = await storage.getGenerationById(id);

      if (!parentGeneration) {
        return res.status(404).json({
          success: false,
          error: "Generation not found"
        });
      }

      // Check if this generation supports editing
      if (!parentGeneration.conversationHistory) {
        return res.status(400).json({
          success: false,
          error: "This generation does not support editing. It was created before the edit feature was available."
        });
      }

      // Get the stored conversation history
      // JSONB column returns parsed object directly, no need to JSON.parse
      let history: any[];
      const storedHistory = parentGeneration.conversationHistory;

      if (typeof storedHistory === 'string') {
        // Handle legacy data that might be double-stringified
        try {
          history = JSON.parse(storedHistory);
        } catch (e) {
          return res.status(500).json({
            success: false,
            error: "Failed to parse conversation history"
          });
        }
      } else if (Array.isArray(storedHistory)) {
        // JSONB returns parsed array directly
        history = storedHistory;
      } else {
        return res.status(500).json({
          success: false,
          error: "Invalid conversation history format"
        });
      }

      console.log(`[Edit] Editing generation ${id} with prompt: "${editPrompt}"`);

      // Append the new edit request to the history
      // This is the key to multi-turn editing - we send the FULL history
      history.push({
        role: "user",
        parts: [{ text: editPrompt }]
      });

      // Call Gemini with the full conversation history
      // The thought signatures in the history allow Gemini to "remember" the image
      // MUST use genaiImage (direct Google API) - Replit AI Integrations doesn't support image models
      if (!genaiImage) {
        return res.status(500).json({
          success: false,
          error: "Image editing requires GEMINI_API_KEY or GOOGLE_API_KEY (direct API)"
        });
      }

      const modelName = "gemini-3-pro-image-preview";
      console.log(`[Edit] Using model: ${modelName} (direct Google API)`);

      const result = await genaiImage.models.generateContent({
        model: modelName,
        contents: history,
      });

      console.log(`[Edit] Model response - modelVersion: ${result.modelVersion}, candidates: ${result.candidates?.length}`);
      const usageMetadata = (result as any).usageMetadata;
      if (usageMetadata) {
        console.log(`[Edit] Captured usageMetadata: ${JSON.stringify(usageMetadata)}`);
      }

      // Extract the new image
      if (!result.candidates?.[0]?.content?.parts) {
        return res.status(500).json({
          success: false,
          error: "Gemini did not return a valid response. Try a different edit prompt."
        });
      }

      const modelResponse = result.candidates[0].content;
      const imagePart = modelResponse.parts?.find((p: any) => p.inlineData);

      if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
        return res.status(500).json({
          success: false,
          error: "Gemini did not return an image. Try a different edit prompt."
        });
      }

      // Save the new image
      const generatedImageData = imagePart.inlineData.data;
      const mimeType = imagePart.inlineData.mimeType || "image/png";
      const format = mimeType.split("/")[1] || "png";
      const generatedImagePath = await saveGeneratedImage(generatedImageData, format);

      // Update history with the new response (for potential future edits)
      history.push(modelResponse);

      // Create a NEW generation record (don't overwrite the original)
      // Pass history as object - Drizzle handles JSONB serialization
      const newGeneration = await storage.saveGeneration({
        prompt: parentGeneration.prompt,
        editPrompt: editPrompt.trim(),
        generatedImagePath,
        conversationHistory: history,  // Pass as object, Drizzle handles JSONB
        parentGenerationId: parentGeneration.id,
        originalImagePaths: parentGeneration.originalImagePaths,
        resolution: parentGeneration.resolution || "2K",
      });

      console.log(`[Edit] Created new generation ${newGeneration.id} from parent ${id}`);
      // Persist usage/cost estimate for adaptive pricing
      try {
        const durationMsForUsage = Date.now() - startTime;
        const resolution = normalizeResolution(parentGeneration.resolution) || '2K';
        const inputImagesCount = Array.isArray(parentGeneration.originalImagePaths) ? parentGeneration.originalImagePaths.length : 0;

        const cost = estimateGenerationCostMicros({
          resolution,
          inputImagesCount,
          promptChars: String(editPrompt).length,
          usageMetadata: (typeof usageMetadata === "object" ? usageMetadata : null),
        });

        await storage.saveGenerationUsage({
          generationId: newGeneration.id,
          brandId: userId || "anonymous",
          model: modelName,
          operation: "edit",
          resolution,
          inputImagesCount,
          promptChars: String(editPrompt).length,
          durationMs: durationMsForUsage,
          inputTokens: cost.inputTokens,
          outputTokens: cost.outputTokens,
          estimatedCostMicros: cost.estimatedCostMicros,
          estimationSource: cost.estimationSource,
        });
      } catch (e) {
        console.warn("[Edit] Failed to persist generation usage (run db:push?):", e);
      }

      success = true;

      return res.json({
        success: true,
        generationId: newGeneration.id,
        imageUrl: generatedImagePath.startsWith("http") ? generatedImagePath : `/${generatedImagePath}`,
        parentId: parentGeneration.id,
        canEdit: true
      });

    } catch (error: any) {
      console.error("[Edit] Error:", error);
      errorType = errorType || (error.name || 'unknown');

      telemetry.trackError({
        endpoint: '/api/generations/:id/edit',
        errorType: errorType || 'unknown',
        statusCode: 500,
        userId,
      });

      return res.status(500).json({
        success: false,
        error: error.message || "Failed to edit image"
      });
    } finally {
      // Track Gemini API usage and cost
      const durationMs = Date.now() - startTime;
      const inputTokensEstimate = Math.ceil((req.body.editPrompt?.length || 0) * 0.25);

      telemetry.trackGeminiUsage({
        model: 'gemini-3-pro-image-preview',
        operation: 'edit',
        inputTokens: inputTokensEstimate,
        outputTokens: 0,
        durationMs,
        userId,
        success,
        errorType,
      });

      // Track for quota monitoring dashboard
      try {
        await quotaMonitoringService.trackApiCall({
          brandId: userId || 'anonymous',
          operation: 'edit',
          model: 'gemini-3-pro-image-preview',
          success,
          durationMs,
          inputTokens: inputTokensEstimate,
          outputTokens: 0,
          costMicros: success ? estimateGenerationCostMicros({
            resolution: '2K', // Edits use same resolution as parent
            inputImagesCount: 1,
            promptChars: String(req.body.editPrompt || '').length,
          }).estimatedCostMicros : 0,
          errorType,
          isRateLimited: errorType === 'RESOURCE_EXHAUSTED' || errorType === 'rate_limit',
        });
      } catch (trackError) {
        console.warn('[Edit] Failed to track quota:', trackError);
      }
    }
  });

  // Analyze generation - Ask AI about the transformation
  app.post("/api/generations/:id/analyze", async (req, res) => {
    try {
      const { id } = req.params;
      const { question } = req.body;

      if (!question || question.trim().length === 0) {
        return res.status(400).json({
          success: false,
          error: "Question is required"
        });
      }

      const generation = await storage.getGenerationById(id);
      if (!generation) {
        return res.status(404).json({
          success: false,
          error: "Generation not found"
        });
      }

      console.log(`[Analyze] Analyzing generation ${id} with question: "${question}"`);

      // Helper to get MIME type from file path
      const getMimeType = (filePath: string): string => {
        const ext = filePath.toLowerCase().split('.').pop();
        const mimeTypes: Record<string, string> = {
          'jpg': 'image/jpeg',
          'jpeg': 'image/jpeg',
          'png': 'image/png',
          'gif': 'image/gif',
          'webp': 'image/webp',
        };
        return mimeTypes[ext || ''] || 'image/png';
      };

      // Load original images as base64
      const fs = await import('fs/promises');
      const pathModule = await import('path');

      const originalImages: { data: string; mimeType: string }[] = [];
      for (const imagePath of generation.originalImagePaths) {
        try {
          const fullPath = pathModule.join(process.cwd(), imagePath);
          const imageBuffer = await fs.readFile(fullPath);
          originalImages.push({
            data: imageBuffer.toString('base64'),
            mimeType: getMimeType(imagePath)
          });
        } catch (e) {
          console.warn(`[Analyze] Could not load original image: ${imagePath}`);
        }
      }

      // Load generated image as base64
      const generatedPath = pathModule.join(process.cwd(), generation.generatedImagePath);
      const generatedBuffer = await fs.readFile(generatedPath);
      const generatedImageBase64 = generatedBuffer.toString('base64');
      const generatedMimeType = getMimeType(generation.generatedImagePath);

      // Call Gemini text model to analyze
      const analysisPrompt = `You are an AI assistant helping users understand image transformations.

Looking at the transformation:
- Original product image(s): [attached]
- Generated marketing image: [attached]  
- Original prompt used: "${generation.prompt}"

User question: ${question}

Provide a helpful, specific answer. If suggesting prompt improvements, give concrete examples. Keep your response concise but informative.`;

      const modelName = "gemini-3-flash-preview";

      // Build multipart content with images
      const parts: any[] = [{ text: analysisPrompt }];

      // Add original images with correct MIME types
      for (const img of originalImages) {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.data
          }
        });
      }

      // Add generated image with correct MIME type
      parts.push({
        inlineData: {
          mimeType: generatedMimeType,
          data: generatedImageBase64
        }
      });

      const result = await genai.models.generateContent({
        model: modelName,
        contents: [{ role: 'user', parts }],
      });

      const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!responseText) {
        return res.status(500).json({
          success: false,
          error: "AI did not return a response"
        });
      }

      console.log(`[Analyze] Response generated (${responseText.length} chars)`);

      return res.json({
        success: true,
        answer: responseText
      });

    } catch (error: any) {
      console.error("[Analyze] Error:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Failed to analyze image"
      });
    }
  });

  // Product routes - Upload product to Cloudinary and save to DB
  app.post("/api/products", upload.single("image"), async (req, res) => {
    try {
      if (!isCloudinaryConfigured) {
        return res.status(503).json({ error: "Product library is not configured" });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Validate file is an image
      const allowedMimeTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        return res.status(400).json({ error: "Only image files are allowed (JPEG, PNG, GIF, WebP)" });
      }

      // Validate file size (10MB max)
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return res.status(400).json({ error: "File size must be less than 10MB" });
      }

      const { name, category } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Product name is required" });
      }

      console.log(`[Product Upload] Uploading ${name} to Cloudinary...`);

      // Upload to Cloudinary using buffer
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "product-library",
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(file.buffer);
      });

      // Save product to database
      const product = await storage.saveProduct({
        name,
        cloudinaryUrl: uploadResult.secure_url,
        cloudinaryPublicId: uploadResult.public_id,
        category: category || null,
      });

      console.log(`[Product Upload] Saved product ${product.id}`);
      res.json(product);
    } catch (error: any) {
      console.error("[Product Upload] Error:", error);
      res.status(500).json({ error: "Failed to upload product", details: error.message });
    }
  });

  // Get all products
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error: any) {
      console.error("[Products] Error:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Get single product by ID
  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      res.json(product);
    } catch (error: any) {
      console.error("[Product] Error:", error);
      res.status(500).json({ error: "Failed to fetch product" });
    }
  });

  // Delete product
  app.delete("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProductById(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Delete from Cloudinary
      await cloudinary.uploader.destroy(product.cloudinaryPublicId);

      // Delete from database
      await storage.deleteProduct(req.params.id);

      res.json({ success: true });
    } catch (error: any) {
      console.error("[Delete Product] Error:", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  // Clear all products from database
  app.delete("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();

      for (const product of products) {
        await storage.deleteProduct(product.id);
      }

      console.log(`[Products] Cleared ${products.length} products from database`);
      res.json({ success: true, deleted: products.length });
    } catch (error: any) {
      console.error("[Clear Products] Error:", error);
      res.status(500).json({ error: "Failed to clear products" });
    }
  });

  // Sync products from Cloudinary
  app.post("/api/products/sync", async (req, res) => {
    try {
      if (!isCloudinaryConfigured) {
        return res.status(503).json({ error: "Cloudinary is not configured" });
      }

      console.log("[Cloudinary Sync] Starting sync...");

      // Fetch all images from Cloudinary (max 500 for now)
      const result = await cloudinary.api.resources({
        type: 'upload',
        resource_type: 'image',
        max_results: 500,
        prefix: req.body.folder || '', // Optional folder filter
      });

      console.log(`[Cloudinary Sync] Found ${result.resources.length} images`);

      // Get existing products to avoid duplicates
      const existingProducts = await storage.getProducts();
      const existingPublicIds = new Set(existingProducts.map(p => p.cloudinaryPublicId));

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

      console.log(`[Cloudinary Sync] Imported: ${imported}, Skipped: ${skipped}`);

      res.json({
        success: true,
        imported,
        skipped,
        total: result.resources.length,
      });
    } catch (error: any) {
      console.error("[Cloudinary Sync] Error:", error);
      res.status(500).json({ error: "Failed to sync from Cloudinary", details: error.message });
    }
  });

  // Prompt template routes
  app.post("/api/prompt-templates", async (req, res) => {
    try {
      const { title, prompt, category, tags } = req.body;
      if (!title || !prompt) {
        return res.status(400).json({ error: "Title and prompt are required" });
      }

      const template = await storage.savePromptTemplate({
        title,
        prompt,
        category: category || null,
        tags: tags || [],
      });

      res.json(template);
    } catch (error: any) {
      console.error("[Prompt Template] Error:", error);
      res.status(500).json({ error: "Failed to create prompt template" });
    }
  });

  // Get prompt templates (optionally filtered by category)
  app.get("/api/prompt-templates", async (req, res) => {
    try {
      const category = req.query.category as string | undefined;
      const templates = await storage.getPromptTemplates(category);
      res.json(templates);
    } catch (error: any) {
      console.error("[Prompt Templates] Error:", error);
      res.status(500).json({ error: "Failed to fetch prompt templates" });
    }
  });

  // Get AI-generated prompt suggestions based on curated templates
  app.post("/api/prompt-suggestions", async (req, res) => {
    try {
      const { productName, category } = req.body;

      // Input validation
      if (!productName || typeof productName !== 'string') {
        return res.status(400).json({ error: "Product name is required" });
      }

      // Sanitize product name to prevent injection
      const sanitizedProductName = productName.replace(/[^\w\s-]/g, '').slice(0, 100);

      // Get curated templates for the category (or all if no category)
      const templates = await storage.getPromptTemplates(category);

      if (templates.length === 0) {
        return res.json([]);
      }

      // Use Gemini to generate variations of the curated prompts
      const templateExamples = templates.slice(0, 5).map(t => `"${t.prompt}"`).join(", ");

      const suggestionPrompt = `You are a creative marketing prompt generator. Given a product called "${sanitizedProductName}", generate 4 creative, professional marketing scene ideas similar to these examples: ${templateExamples}.

Each suggestion should be a concise, vivid description (max 15 words) of a marketing scene or lifestyle context for the product.

Return ONLY a JSON array of 4 strings, nothing else. Example format:
["professional desk setup with morning sunlight", "outdoor adventure scene in mountains", "minimalist lifestyle flat lay", "urban street photography aesthetic"]`;

      const modelName = "gemini-3-flash-preview";
      console.log(`[Prompt Suggestions] Using model: ${modelName}`);

      const result = await genai.models.generateContent({
        model: modelName,
        contents: suggestionPrompt,
      });

      console.log(`[Prompt Suggestions] Model response - modelVersion: ${result.modelVersion}`);

      const responseText = result.text || "[]";

      // Parse the JSON response
      let suggestions: string[] = [];
      try {
        suggestions = JSON.parse(responseText);
        // Validate array and limit to 4 suggestions
        if (!Array.isArray(suggestions)) {
          suggestions = templates.slice(0, 4).map(t => t.prompt);
        } else {
          suggestions = suggestions.slice(0, 4);
        }
      } catch (e) {
        // Fallback to template prompts if parsing fails
        suggestions = templates.slice(0, 4).map(t => t.prompt);
      }

      res.json(suggestions);
    } catch (error: any) {
      console.error("[Prompt Suggestions] Error:", error);
      res.status(500).json({ error: "Failed to generate suggestions", details: error.message });
    }
  });

  // Delete prompt template
  app.delete("/api/prompt-templates/:id", async (req, res) => {
    try {
      await storage.deletePromptTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Delete Prompt Template] Error:", error);
      res.status(500).json({ error: "Failed to delete prompt template" });
    }
  });

  // ===== AD SCENE TEMPLATE ROUTES =====

  // GET /api/ad-templates/categories - Get available categories (must be before :id route)
  app.get("/api/ad-templates/categories", async (_req, res) => {
    try {
      // Return the predefined categories from PRD
      const categories = [
        { id: "lifestyle", label: "Lifestyle", description: "Home and living scenes" },
        { id: "professional", label: "Professional", description: "Studio and work environments" },
        { id: "outdoor", label: "Outdoor", description: "Garden, patio, and landscape" },
        { id: "luxury", label: "Luxury", description: "High-end showroom and premium" },
        { id: "seasonal", label: "Seasonal", description: "Holiday and seasonal themes" },
      ];
      res.json(categories);
    } catch (error: any) {
      console.error("[Get Template Categories] Error:", error);
      res.status(500).json({ error: "Failed to fetch categories" });
    }
  });

  // GET /api/ad-templates - List templates with filters
  app.get("/api/ad-templates", async (req, res) => {
    try {
      const { category, search, platform, aspectRatio } = req.query;

      // If search query provided, use search function
      if (search && typeof search === "string") {
        const templates = await storage.searchAdSceneTemplates(search);
        return res.json(templates);
      }

      // Otherwise use filters
      const filters: { category?: string; isGlobal?: boolean } = {};
      if (category && typeof category === "string") {
        filters.category = category;
      }
      filters.isGlobal = true; // Only return global templates by default

      let templates = await storage.getAdSceneTemplates(filters);

      // Additional filtering for platform and aspect ratio
      if (platform && typeof platform === "string") {
        templates = templates.filter(t =>
          t.platformHints?.includes(platform)
        );
      }
      if (aspectRatio && typeof aspectRatio === "string") {
        templates = templates.filter(t =>
          t.aspectRatioHints?.includes(aspectRatio)
        );
      }

      res.json(templates);
    } catch (error: any) {
      console.error("[Get Ad Templates] Error:", error);
      res.status(500).json({ error: "Failed to fetch ad templates" });
    }
  });

  // GET /api/ad-templates/:id - Get single template
  app.get("/api/ad-templates/:id", async (req, res) => {
    try {
      const template = await storage.getAdSceneTemplateById(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      console.error("[Get Ad Template] Error:", error);
      res.status(500).json({ error: "Failed to fetch ad template" });
    }
  });

  // POST /api/ad-templates - Create template (admin)
  app.post("/api/ad-templates", requireAuth, async (req, res) => {
    try {
      const { insertAdSceneTemplateSchema } = await import("@shared/schema");
      const validatedData = insertAdSceneTemplateSchema.parse(req.body);

      // Set createdBy to current user
      const userId = (req as any).session?.userId;
      const template = await storage.saveAdSceneTemplate({
        ...validatedData,
        createdBy: userId,
      });

      res.status(201).json(template);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      console.error("[Create Ad Template] Error:", error);
      res.status(500).json({ error: "Failed to create ad template" });
    }
  });

  // PUT /api/ad-templates/:id - Update template
  app.put("/api/ad-templates/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getAdSceneTemplateById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Validate using partial schema (all fields optional for updates)
      const { insertAdSceneTemplateSchema } = await import("@shared/schema");
      const updateSchema = insertAdSceneTemplateSchema.partial();
      const validatedData = updateSchema.parse(req.body);

      const template = await storage.updateAdSceneTemplate(req.params.id, validatedData);
      res.json(template);
    } catch (error: any) {
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Invalid template data", details: error.errors });
      }
      console.error("[Update Ad Template] Error:", error);
      res.status(500).json({ error: "Failed to update ad template" });
    }
  });

  // DELETE /api/ad-templates/:id - Delete template (admin)
  app.delete("/api/ad-templates/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getAdSceneTemplateById(req.params.id);
      if (!existing) {
        return res.status(404).json({ error: "Template not found" });
      }

      await storage.deleteAdSceneTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Delete Ad Template] Error:", error);
      res.status(500).json({ error: "Failed to delete ad template" });
    }
  });

  // ===== END AD SCENE TEMPLATE ROUTES =====

  // COPYWRITING ENDPOINTS

  // Generate ad copy with multiple variations
  app.post("/api/copy/generate", async (req, res) => {
    try {
      // Use session userId if available, otherwise use a default for demo
      const userId = req.session?.userId || "demo-user";

      // Validate request
      const { generateCopySchema } = await import("./validation/schemas");
      const validatedData = generateCopySchema.parse(req.body);

      // Verify generation exists
      const generation = await storage.getGenerationById(validatedData.generationId);
      if (!generation) {
        return res.status(404).json({ error: "Generation not found" });
      }

      // Get user's brand voice if not provided
      let brandVoice = validatedData.brandVoice;
      if (!brandVoice) {
        const user = await storage.getUserById(userId);
        if (user?.brandVoice) {
          brandVoice = user.brandVoice as any;
        }
      }

      // Generate copy variations
      const { copywritingService } = await import("./services/copywritingService");
      const variations = await copywritingService.generateCopy({
        ...validatedData,
        brandVoice,
      });

      // Save all variations to database - use allSettled to handle partial failures
      const saveResults = await Promise.allSettled(
        variations.map((variation, index) =>
          storage.saveAdCopy({
            generationId: validatedData.generationId,
            userId,
            headline: variation.headline,
            hook: variation.hook,
            bodyText: variation.bodyText,
            cta: variation.cta,
            caption: variation.caption,
            hashtags: variation.hashtags,
            platform: validatedData.platform,
            tone: validatedData.tone,
            framework: variation.framework.toLowerCase(),
            campaignObjective: validatedData.campaignObjective,
            productName: validatedData.productName,
            productDescription: validatedData.productDescription,
            productBenefits: validatedData.productBenefits,
            uniqueValueProp: validatedData.uniqueValueProp,
            industry: validatedData.industry,
            targetAudience: validatedData.targetAudience,
            brandVoice: brandVoice,
            socialProof: validatedData.socialProof,
            qualityScore: variation.qualityScore,
            characterCounts: variation.characterCounts,
            variationNumber: index + 1,
            parentCopyId: null,
          })
        )
      );

      // Extract successful saves and log any failures
      const savedCopies = saveResults
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const failedCount = saveResults.filter(r => r.status === 'rejected').length;
      if (failedCount > 0) {
        console.warn(`[Generate Copy] ${failedCount}/${variations.length} variations failed to save`);
      }

      if (savedCopies.length === 0) {
        return res.status(500).json({ error: "Failed to save any copy variations" });
      }

      res.json({
        success: true,
        copies: savedCopies,
        recommended: 0, // First variation is recommended
      });
    } catch (error: any) {
      console.error("[Generate Copy] Error:", error);
      if (error.name === "ZodError") {
        return res.status(400).json({ error: "Validation failed", details: error.errors });
      }
      res.status(500).json({ error: "Failed to generate copy", details: error.message });
    }
  });

  // Get copy by generation ID
  app.get("/api/copy/generation/:generationId", async (req, res) => {
    try {
      const copies = await storage.getAdCopyByGenerationId(req.params.generationId);
      res.json({ copies });
    } catch (error: any) {
      console.error("[Get Copy by Generation] Error:", error);
      res.status(500).json({ error: "Failed to fetch copy" });
    }
  });

  // Get specific copy by ID
  app.get("/api/copy/:id", async (req, res) => {
    try {
      const copy = await storage.getAdCopyById(req.params.id);
      if (!copy) {
        return res.status(404).json({ error: "Copy not found" });
      }
      res.json({ copy });
    } catch (error: any) {
      console.error("[Get Copy] Error:", error);
      res.status(500).json({ error: "Failed to fetch copy" });
    }
  });

  // Delete copy
  app.delete("/api/copy/:id", async (req, res) => {
    try {
      await storage.deleteAdCopy(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Delete Copy] Error:", error);
      res.status(500).json({ error: "Failed to delete copy" });
    }
  });

  // Update user's brand voice
  app.put("/api/user/brand-voice", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const { brandVoice } = req.body;
      if (!brandVoice || !brandVoice.principles || !Array.isArray(brandVoice.principles)) {
        return res.status(400).json({ error: "Invalid brand voice data" });
      }

      const updatedUser = await storage.updateUserBrandVoice(userId, brandVoice);
      res.json({ success: true, brandVoice: updatedUser.brandVoice });
    } catch (error: any) {
      console.error("[Update Brand Voice] Error:", error);
      res.status(500).json({ error: "Failed to update brand voice" });
    }
  });

  // Admin: Force verification of Brand Profile Seed
  app.post("/api/admin/seed-brand", async (req, res) => {
    try {
      console.log("[Admin] Force seeding brand profile...");
      await seedBrandProfile();
      res.json({ success: true, message: "Brand Profile seeded successfully" });
    } catch (error: any) {
      console.error("[Admin] Seed failed:", error);
      res.status(500).json({ error: "Seed failed", details: error.message });
    }
  });

  // =============================================================================
  // File Search RAG Endpoints
  // =============================================================================

  // Initialize File Search Store
  app.post("/api/file-search/initialize", requireAuth, async (req, res) => {
    try {
      const { initializeFileSearchStore } = await import('./services/fileSearchService');
      const store = await initializeFileSearchStore();
      res.json({ success: true, store: { name: store.name, displayName: store.config?.displayName } });
    } catch (error: any) {
      console.error("[Initialize File Search] Error:", error);
      res.status(500).json({ error: "Failed to initialize File Search Store" });
    }
  });

  // Upload reference file
  app.post("/api/file-search/upload", upload.single("file"), requireAuth, async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const { category, description, metadata } = req.body;
      if (!category) {
        return res.status(400).json({ error: "Category is required" });
      }

      // Safely parse metadata JSON
      let parsedMetadata = {};
      if (metadata) {
        try {
          parsedMetadata = JSON.parse(metadata);
        } catch {
          return res.status(400).json({ error: "Invalid metadata JSON format" });
        }
      }

      const { uploadReferenceFile } = await import('./services/fileSearchService');
      const result = await uploadReferenceFile({
        filePath: req.file.path,
        category,
        description,
        metadata: parsedMetadata,
      });

      res.json({ success: true, file: result });
    } catch (error: any) {
      console.error("[Upload Reference File] Error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Upload directory of reference files
  app.post("/api/file-search/upload-directory", requireAuth, async (req, res) => {
    try {
      const { directoryPath, category, description } = req.body;
      if (!directoryPath || !category) {
        return res.status(400).json({ error: "Directory path and category are required" });
      }

      const { uploadDirectoryToFileSearch } = await import('./services/fileSearchService');
      const results = await uploadDirectoryToFileSearch({
        directoryPath,
        category,
        description,
      });

      res.json({ success: true, files: results, count: results.length });
    } catch (error: any) {
      console.error("[Upload Directory] Error:", error);
      res.status(500).json({ error: "Failed to upload directory" });
    }
  });

  // List reference files
  app.get("/api/file-search/files", requireAuth, async (req, res) => {
    try {
      const { category } = req.query;
      const { listReferenceFiles, FileCategory } = await import('./services/fileSearchService');

      const files = await listReferenceFiles(category as any);
      res.json({ success: true, files, count: files.length });
    } catch (error: any) {
      console.error("[List Reference Files] Error:", error);
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  // Delete reference file
  app.delete("/api/file-search/files/:fileId", requireAuth, async (req, res) => {
    try {
      const { fileId } = req.params;
      const { deleteReferenceFile } = await import('./services/fileSearchService');

      await deleteReferenceFile(fileId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Delete Reference File] Error:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Seed File Search Store with initial structure
  app.post("/api/file-search/seed", requireAuth, async (req, res) => {
    try {
      const { seedFileSearchStore } = await import('./services/fileSearchService');
      const result = await seedFileSearchStore();
      res.json(result);
    } catch (error: any) {
      console.error("[Seed File Search] Error:", error);
      res.status(500).json({ error: "Failed to seed File Search Store" });
    }
  });

  // ============================================
  // INTELLIGENT IDEA BANK ENDPOINTS
  // ============================================

  // Analyze a product image (vision analysis)
  app.post("/api/products/:productId/analyze", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = (req.session as any).userId;
      const { forceRefresh } = req.body || {};

      const { visionAnalysisService } = await import('./services/visionAnalysisService');
      const product = await storage.getProductById(productId);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const result = await visionAnalysisService.analyzeProductImage(product, userId, forceRefresh);

      if (!result.success) {
        const statusCode = result.error.code === "RATE_LIMITED" ? 429 : 500;
        return res.status(statusCode).json({ error: result.error.message, code: result.error.code });
      }

      res.json({
        analysis: result.analysis,
        fromCache: !forceRefresh,
      });
    } catch (error: any) {
      console.error("[Product Analyze] Error:", error);
      res.status(500).json({ error: "Failed to analyze product" });
    }
  });

  // Get cached analysis for a product
  app.get("/api/products/:productId/analysis", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      const { visionAnalysisService } = await import('./services/visionAnalysisService');

      const analysis = await visionAnalysisService.getCachedAnalysis(productId);

      if (!analysis) {
        return res.status(404).json({ error: "No analysis found for this product" });
      }

      res.json({ analysis });
    } catch (error: any) {
      console.error("[Product Analysis Get] Error:", error);
      res.status(500).json({ error: "Failed to get product analysis" });
    }
  });

  // ===== ARBITRARY IMAGE ANALYSIS =====
  // Analyze a temporary upload image (not a product) for IdeaBank context

  app.post("/api/analyze-image", upload.single("image"), async (req, res) => {
    try {
      const userId = (req.session as any)?.userId || "system-user";
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      // Validate file type
      if (!file.mimetype.startsWith("image/")) {
        return res.status(400).json({ error: "File must be an image" });
      }

      const { visionAnalysisService } = await import('./services/visionAnalysisService');
      const result = await visionAnalysisService.analyzeArbitraryImage(
        file.buffer,
        file.mimetype,
        userId
      );

      if (!result.success) {
        if (result.error.code === "RATE_LIMITED") {
          return res.status(429).json({ error: result.error.message });
        }
        return res.status(500).json({ error: result.error.message });
      }

      res.json({
        description: result.analysis.description,
        confidence: result.analysis.confidence,
      });
    } catch (error: any) {
      console.error("[Analyze Image] Error:", error);
      res.status(500).json({ error: "Failed to analyze image" });
    }
  });

  // ===== PRODUCT ENRICHMENT ROUTES =====
  // Phase 0.5: Human-in-the-loop product data collection

  // Generate enrichment draft for a product (AI analyzes image + searches web)
  app.post("/api/products/:productId/enrich", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = (req.session as any)?.userId;

      const { productEnrichmentService } = await import('./services/productEnrichmentService');
      const result = await productEnrichmentService.generateEnrichmentDraft(productId, userId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        productId: result.productId,
        draft: result.draft,
      });
    } catch (error: any) {
      console.error("[Product Enrichment] Error:", error);
      res.status(500).json({ error: "Failed to generate enrichment draft" });
    }
  });

  // Enrich product from a user-provided URL
  app.post("/api/products/:productId/enrich-from-url", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      const { productUrl } = req.body;

      if (!productUrl || typeof productUrl !== "string") {
        return res.status(400).json({ error: "Product URL is required" });
      }

      // Validate URL format
      try {
        new URL(productUrl);
      } catch {
        return res.status(400).json({ error: "Invalid URL format" });
      }

      const { enrichFromUrl, saveEnrichmentDraft } = await import('./services/enrichmentServiceWithUrl');
      const result = await enrichFromUrl({ productId, productUrl });

      if (!result.success || !result.enrichmentDraft) {
        return res.status(400).json({ error: result.error || "Failed to enrich from URL" });
      }

      // Save the draft to the product
      await saveEnrichmentDraft(productId, result.enrichmentDraft);

      res.json({
        success: true,
        productId: result.productId,
        draft: result.enrichmentDraft,
      });
    } catch (error: any) {
      console.error("[URL Enrichment] Error:", error);
      res.status(500).json({ error: "Failed to enrich product from URL" });
    }
  });

  // Get enrichment draft for a product
  app.get("/api/products/:productId/enrichment", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      const product = await storage.getProductById(productId);

      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }

      const { productEnrichmentService } = await import('./services/productEnrichmentService');
      const completeness = productEnrichmentService.getEnrichmentCompleteness(product);

      res.json({
        productId,
        status: product.enrichmentStatus || "pending",
        draft: product.enrichmentDraft,
        verifiedAt: product.enrichmentVerifiedAt,
        source: product.enrichmentSource,
        completeness,
        isReady: productEnrichmentService.isProductReady(product),
      });
    } catch (error: any) {
      console.error("[Product Enrichment Get] Error:", error);
      res.status(500).json({ error: "Failed to get enrichment data" });
    }
  });

  // Verify/approve enrichment data (human-in-the-loop)
  app.post("/api/products/:productId/enrichment/verify", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = (req.session as any)?.userId;
      const { description, features, benefits, specifications, tags, sku, approvedAsIs } = req.body;

      const { productEnrichmentService } = await import('./services/productEnrichmentService');
      const result = await productEnrichmentService.verifyEnrichment(
        { productId, description, features, benefits, specifications, tags, sku, approvedAsIs },
        userId
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({ success: true, message: "Product enrichment verified" });
    } catch (error: any) {
      console.error("[Product Enrichment Verify] Error:", error);
      res.status(500).json({ error: "Failed to verify enrichment" });
    }
  });

  // Get all products needing enrichment
  app.get("/api/products/enrichment/pending", async (req, res) => {
    try {
      const { status } = req.query;

      const { productEnrichmentService } = await import('./services/productEnrichmentService');
      const products = await productEnrichmentService.getProductsNeedingEnrichment(
        status as any
      );

      // Return with completeness info
      const productsWithInfo = products.map(product => ({
        ...product,
        completeness: productEnrichmentService.getEnrichmentCompleteness(product),
        isReady: productEnrichmentService.isProductReady(product),
      }));

      res.json({ products: productsWithInfo });
    } catch (error: any) {
      console.error("[Products Pending Enrichment] Error:", error);
      res.status(500).json({ error: "Failed to get products needing enrichment" });
    }
  });

  // ============================================
  // INSTALLATION SCENARIOS
  // ============================================

  // Create installation scenario
  app.post("/api/installation-scenarios", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const scenario = await storage.createInstallationScenario({
        ...req.body,
        userId,
      });
      res.status(201).json(scenario);
    } catch (error: any) {
      console.error("[Installation Scenarios] Create error:", error);
      res.status(500).json({ error: "Failed to create installation scenario" });
    }
  });

  // Get all installation scenarios for user
  app.get("/api/installation-scenarios", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const scenarios = await storage.getInstallationScenariosByUser(userId);
      res.json(scenarios);
    } catch (error: any) {
      console.error("[Installation Scenarios] List error:", error);
      res.status(500).json({ error: "Failed to get installation scenarios" });
    }
  });

  // Get single installation scenario
  app.get("/api/installation-scenarios/:id", requireAuth, async (req, res) => {
    try {
      const scenario = await storage.getInstallationScenarioById(req.params.id);
      if (!scenario) {
        return res.status(404).json({ error: "Installation scenario not found" });
      }
      res.json(scenario);
    } catch (error: any) {
      console.error("[Installation Scenarios] Get error:", error);
      res.status(500).json({ error: "Failed to get installation scenario" });
    }
  });

  // Update installation scenario
  app.put("/api/installation-scenarios/:id", requireAuth, async (req, res) => {
    try {
      const scenario = await storage.updateInstallationScenario(req.params.id, req.body);
      res.json(scenario);
    } catch (error: any) {
      console.error("[Installation Scenarios] Update error:", error);
      res.status(500).json({ error: "Failed to update installation scenario" });
    }
  });

  // Delete installation scenario
  app.delete("/api/installation-scenarios/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteInstallationScenario(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Installation Scenarios] Delete error:", error);
      res.status(500).json({ error: "Failed to delete installation scenario" });
    }
  });

  // Get scenarios by room type
  app.get("/api/installation-scenarios/room-type/:roomType", requireAuth, async (req, res) => {
    try {
      const scenarios = await storage.getScenariosByRoomType(req.params.roomType);
      res.json(scenarios);
    } catch (error: any) {
      console.error("[Installation Scenarios] Room type query error:", error);
      res.status(500).json({ error: "Failed to get scenarios by room type" });
    }
  });

  // Get scenarios for products
  app.post("/api/installation-scenarios/for-products", requireAuth, async (req, res) => {
    try {
      const { productIds } = req.body;
      if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ error: "productIds array is required" });
      }
      const scenarios = await storage.getInstallationScenariosForProducts(productIds);
      res.json(scenarios);
    } catch (error: any) {
      console.error("[Installation Scenarios] Products query error:", error);
      res.status(500).json({ error: "Failed to get scenarios for products" });
    }
  });

  // ============================================
  // PRODUCT RELATIONSHIPS
  // ============================================

  // Create product relationship
  app.post("/api/product-relationships", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const relationship = await storage.createProductRelationship({
        ...req.body,
        userId,
      });
      res.status(201).json(relationship);
    } catch (error: any) {
      console.error("[Product Relationships] Create error:", error);
      if (error.code === "23505") { // Unique constraint violation
        return res.status(409).json({ error: "This relationship already exists" });
      }
      res.status(500).json({ error: "Failed to create product relationship" });
    }
  });

  // Get relationships for a product
  app.get("/api/products/:productId/relationships", requireAuth, async (req, res) => {
    try {
      const relationships = await storage.getProductRelationships([req.params.productId]);
      res.json(relationships);
    } catch (error: any) {
      console.error("[Product Relationships] Get error:", error);
      res.status(500).json({ error: "Failed to get product relationships" });
    }
  });

  // Get relationships by type for a product
  app.get("/api/products/:productId/relationships/:relationshipType", requireAuth, async (req, res) => {
    try {
      const relationships = await storage.getProductRelationshipsByType(
        req.params.productId,
        req.params.relationshipType
      );
      res.json(relationships);
    } catch (error: any) {
      console.error("[Product Relationships] Get by type error:", error);
      res.status(500).json({ error: "Failed to get product relationships" });
    }
  });

  // Delete product relationship
  app.delete("/api/product-relationships/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteProductRelationship(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Product Relationships] Delete error:", error);
      res.status(500).json({ error: "Failed to delete product relationship" });
    }
  });

  // Bulk get relationships for multiple products
  app.post("/api/product-relationships/bulk", requireAuth, async (req, res) => {
    try {
      const { productIds } = req.body;
      if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ error: "productIds array is required" });
      }
      const relationships = await storage.getProductRelationships(productIds);
      res.json(relationships);
    } catch (error: any) {
      console.error("[Product Relationships] Bulk get error:", error);
      res.status(500).json({ error: "Failed to get product relationships" });
    }
  });

  // ============================================
  // BRAND IMAGES
  // ============================================

  // Upload brand image
  app.post("/api/brand-images", upload.single("image"), requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: "Image file is required" });
      }

      // Upload to Cloudinary
      const cloudinary = (await import("cloudinary")).v2;
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          {
            folder: "brand-images",
            resource_type: "image",
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        ).end(file.buffer);
      });

      // Parse metadata from body
      const category = req.body.category || "general";
      const tags = req.body.tags ? JSON.parse(req.body.tags) : [];
      const productIds = req.body.productIds ? JSON.parse(req.body.productIds) : [];
      const suggestedUse = req.body.suggestedUse ? JSON.parse(req.body.suggestedUse) : [];

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
    } catch (error: any) {
      console.error("[Brand Images] Upload error:", error);
      res.status(500).json({ error: "Failed to upload brand image" });
    }
  });

  // Get all brand images for user
  app.get("/api/brand-images", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const images = await storage.getBrandImagesByUser(userId);
      res.json(images);
    } catch (error: any) {
      console.error("[Brand Images] List error:", error);
      res.status(500).json({ error: "Failed to get brand images" });
    }
  });

  // Get brand images by category
  app.get("/api/brand-images/category/:category", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const images = await storage.getBrandImagesByCategory(userId, req.params.category);
      res.json(images);
    } catch (error: any) {
      console.error("[Brand Images] Category query error:", error);
      res.status(500).json({ error: "Failed to get brand images by category" });
    }
  });

  // Get brand images for products
  app.post("/api/brand-images/for-products", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const { productIds } = req.body;
      if (!productIds || !Array.isArray(productIds)) {
        return res.status(400).json({ error: "productIds array is required" });
      }
      const images = await storage.getBrandImagesForProducts(productIds, userId);
      res.json(images);
    } catch (error: any) {
      console.error("[Brand Images] Products query error:", error);
      res.status(500).json({ error: "Failed to get brand images for products" });
    }
  });

  // Update brand image
  app.put("/api/brand-images/:id", requireAuth, async (req, res) => {
    try {
      const image = await storage.updateBrandImage(req.params.id, req.body);
      res.json(image);
    } catch (error: any) {
      console.error("[Brand Images] Update error:", error);
      res.status(500).json({ error: "Failed to update brand image" });
    }
  });

  // Delete brand image
  app.delete("/api/brand-images/:id", requireAuth, async (req, res) => {
    try {
      // Get the image to delete from Cloudinary
      const images = await storage.getBrandImagesByUser((req.session as any).userId);
      const imageToDelete = images.find(img => img.id === req.params.id);

      if (imageToDelete) {
        // Delete from Cloudinary
        const cloudinary = (await import("cloudinary")).v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        try {
          await cloudinary.uploader.destroy(imageToDelete.cloudinaryPublicId);
        } catch (cloudinaryError) {
          console.warn("[Brand Images] Cloudinary delete warning:", cloudinaryError);
          // Continue with database deletion even if Cloudinary fails
        }
      }

      await storage.deleteBrandImage(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Brand Images] Delete error:", error);
      res.status(500).json({ error: "Failed to delete brand image" });
    }
  });

  // ============================================
  // PERFORMING AD TEMPLATES ENDPOINTS
  // ============================================

  // Create performing ad template
  app.post("/api/performing-ad-templates", upload.single("preview"), requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      let previewImageUrl: string | undefined;
      let previewPublicId: string | undefined;

      // Upload preview image to Cloudinary if provided
      if (req.file) {
        const cloudinary = (await import("cloudinary")).v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        const result = await new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "performing-ad-templates",
              resource_type: "image",
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(req.file!.buffer);
        });

        previewImageUrl = result.secure_url;
        previewPublicId = result.public_id;
      }

      // Parse JSON fields from form data
      const templateData = {
        userId,
        name: req.body.name,
        description: req.body.description,
        category: req.body.category,
        sourceUrl: req.body.sourceUrl,
        sourcePlatform: req.body.sourcePlatform,
        advertiserName: req.body.advertiserName,
        engagementTier: req.body.engagementTier,
        estimatedEngagementRate: req.body.estimatedEngagementRate ? parseInt(req.body.estimatedEngagementRate) : undefined,
        runningDays: req.body.runningDays ? parseInt(req.body.runningDays) : undefined,
        estimatedBudget: req.body.estimatedBudget,
        platformMetrics: req.body.platformMetrics ? JSON.parse(req.body.platformMetrics) : undefined,
        layouts: req.body.layouts ? JSON.parse(req.body.layouts) : undefined,
        colorPalette: req.body.colorPalette ? JSON.parse(req.body.colorPalette) : undefined,
        typography: req.body.typography ? JSON.parse(req.body.typography) : undefined,
        backgroundType: req.body.backgroundType,
        contentBlocks: req.body.contentBlocks ? JSON.parse(req.body.contentBlocks) : undefined,
        visualPatterns: req.body.visualPatterns ? JSON.parse(req.body.visualPatterns) : undefined,
        mood: req.body.mood,
        style: req.body.style,
        templateFormat: req.body.templateFormat,
        sourceFileUrl: req.body.sourceFileUrl,
        previewImageUrl,
        previewPublicId,
        editableVariables: req.body.editableVariables ? JSON.parse(req.body.editableVariables) : undefined,
        targetPlatforms: req.body.targetPlatforms ? JSON.parse(req.body.targetPlatforms) : undefined,
        targetAspectRatios: req.body.targetAspectRatios ? JSON.parse(req.body.targetAspectRatios) : undefined,
        bestForIndustries: req.body.bestForIndustries ? JSON.parse(req.body.bestForIndustries) : undefined,
        bestForObjectives: req.body.bestForObjectives ? JSON.parse(req.body.bestForObjectives) : undefined,
        isActive: req.body.isActive !== "false",
        isFeatured: req.body.isFeatured === "true",
      };

      const template = await storage.createPerformingAdTemplate(templateData);
      res.json(template);
    } catch (error: any) {
      console.error("[Performing Templates] Create error:", error);
      res.status(500).json({ error: "Failed to create performing ad template" });
    }
  });

  // Get all performing ad templates for user
  app.get("/api/performing-ad-templates", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const templates = await storage.getPerformingAdTemplates(userId);
      res.json(templates);
    } catch (error: any) {
      console.error("[Performing Templates] List error:", error);
      res.status(500).json({ error: "Failed to fetch performing ad templates" });
    }
  });

  // Get single performing ad template
  app.get("/api/performing-ad-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.getPerformingAdTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      res.json(template);
    } catch (error: any) {
      console.error("[Performing Templates] Get error:", error);
      res.status(500).json({ error: "Failed to fetch performing ad template" });
    }
  });

  // Get templates by category
  app.get("/api/performing-ad-templates/category/:category", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const templates = await storage.getPerformingAdTemplatesByCategory(userId, req.params.category);
      res.json(templates);
    } catch (error: any) {
      console.error("[Performing Templates] Get by category error:", error);
      res.status(500).json({ error: "Failed to fetch templates by category" });
    }
  });

  // Get templates by platform
  app.get("/api/performing-ad-templates/platform/:platform", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const templates = await storage.getPerformingAdTemplatesByPlatform(userId, req.params.platform);
      res.json(templates);
    } catch (error: any) {
      console.error("[Performing Templates] Get by platform error:", error);
      res.status(500).json({ error: "Failed to fetch templates by platform" });
    }
  });

  // Get featured templates
  app.get("/api/performing-ad-templates/featured", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const templates = await storage.getFeaturedPerformingAdTemplates(userId);
      res.json(templates);
    } catch (error: any) {
      console.error("[Performing Templates] Get featured error:", error);
      res.status(500).json({ error: "Failed to fetch featured templates" });
    }
  });

  // Get top performing templates
  app.get("/api/performing-ad-templates/top", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const limit = parseInt(req.query.limit as string) || 10;
      const templates = await storage.getTopPerformingAdTemplates(userId, limit);
      res.json(templates);
    } catch (error: any) {
      console.error("[Performing Templates] Get top error:", error);
      res.status(500).json({ error: "Failed to fetch top templates" });
    }
  });

  // Search templates with filters
  app.post("/api/performing-ad-templates/search", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const filters = req.body;
      const templates = await storage.searchPerformingAdTemplates(userId, filters);
      res.json(templates);
    } catch (error: any) {
      console.error("[Performing Templates] Search error:", error);
      res.status(500).json({ error: "Failed to search templates" });
    }
  });

  // Update performing ad template
  app.put("/api/performing-ad-templates/:id", requireAuth, async (req, res) => {
    try {
      const template = await storage.updatePerformingAdTemplate(req.params.id, req.body);
      res.json(template);
    } catch (error: any) {
      console.error("[Performing Templates] Update error:", error);
      res.status(500).json({ error: "Failed to update performing ad template" });
    }
  });

  // Delete performing ad template
  app.delete("/api/performing-ad-templates/:id", requireAuth, async (req, res) => {
    try {
      // Get the template to delete preview from Cloudinary
      const template = await storage.getPerformingAdTemplate(req.params.id);

      if (template?.previewPublicId) {
        const cloudinary = (await import("cloudinary")).v2;
        cloudinary.config({
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        try {
          await cloudinary.uploader.destroy(template.previewPublicId);
        } catch (cloudinaryError) {
          console.warn("[Performing Templates] Cloudinary delete warning:", cloudinaryError);
        }
      }

      await storage.deletePerformingAdTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Performing Templates] Delete error:", error);
      res.status(500).json({ error: "Failed to delete performing ad template" });
    }
  });

  // Generate idea bank suggestions (optional auth for single-tenant mode)
  app.post("/api/idea-bank/suggest", async (req, res) => {
    try {
      // Use authenticated userId or default system user for single-tenant mode
      const userId = (req.session as any)?.userId || "system-user";
      const { productId, productIds, uploadDescriptions, userGoal, enableWebSearch, maxSuggestions } = req.body;

      // Support both single productId and multiple productIds
      const ids = productIds || (productId ? [productId] : []);

      // Validate upload descriptions if provided
      const validUploadDescriptions: string[] = Array.isArray(uploadDescriptions)
        ? uploadDescriptions.filter((d: any) => typeof d === "string" && d.trim().length > 0).slice(0, 6)
        : [];

      // Require at least products or upload descriptions
      if (ids.length === 0 && validUploadDescriptions.length === 0) {
        return res.status(400).json({ error: "productId, productIds, or uploadDescriptions is required" });
      }

      const { ideaBankService } = await import('./services/ideaBankService');

      // For multiple products, aggregate suggestions from each
      if (ids.length > 1) {
        const results = await Promise.all(
          ids.slice(0, 6).map((id: string) => // Limit to 6 products max
            ideaBankService.generateSuggestions({
              productId: id,
              userId,
              userGoal,
              uploadDescriptions: validUploadDescriptions,
              enableWebSearch: enableWebSearch || false,
              maxSuggestions: 2, // Fewer per product when multiple
            })
          )
        );

        // Filter successful results and aggregate
        const successfulResults = results.filter(r => r.success);
        if (successfulResults.length === 0) {
          return res.status(500).json({ error: "Failed to generate suggestions for all products" });
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
            allSuggestions.push(...result.response.suggestions);
            aggregateStatus.visionComplete = aggregateStatus.visionComplete || result.response.analysisStatus.visionComplete;
            aggregateStatus.kbQueried = aggregateStatus.kbQueried || result.response.analysisStatus.kbQueried;
            aggregateStatus.templatesMatched += result.response.analysisStatus.templatesMatched;
            aggregateStatus.webSearchUsed = aggregateStatus.webSearchUsed || result.response.analysisStatus.webSearchUsed;
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
      const result = await ideaBankService.generateSuggestions({
        productId: ids.length > 0 ? ids[0] : undefined,
        userId,
        userGoal,
        uploadDescriptions: validUploadDescriptions,
        enableWebSearch: enableWebSearch || false,
        maxSuggestions: Math.min(maxSuggestions || 3, 5),
      });

      if (!result.success) {
        const statusCode = result.error.code === "RATE_LIMITED" ? 429 :
          result.error.code === "PRODUCT_NOT_FOUND" ? 404 : 500;
        return res.status(statusCode).json({ error: result.error.message, code: result.error.code });
      }

      res.json(result.response);
    } catch (error: any) {
      console.error("[Idea Bank Suggest] Error:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // Get matched templates for a product
  app.get("/api/idea-bank/templates/:productId", requireAuth, async (req, res) => {
    try {
      const { productId } = req.params;
      const userId = (req.session as any).userId;

      const { ideaBankService } = await import('./services/ideaBankService');

      const result = await ideaBankService.getMatchedTemplates(productId, userId);

      if (!result) {
        return res.status(404).json({ error: "Product not found or analysis failed" });
      }

      res.json({
        templates: result.templates,
        productAnalysis: result.analysis,
      });
    } catch (error: any) {
      console.error("[Idea Bank Templates] Error:", error);
      res.status(500).json({ error: "Failed to get matched templates" });
    }
  });

  // ============================================
  // AD SCENE TEMPLATE ENDPOINTS
  // ============================================

  // List all templates (with optional filters) - Public endpoint
  app.get("/api/templates", async (req, res) => {
    try {
      const { category, isGlobal } = req.query;

      const templates = await storage.getAdSceneTemplates({
        category: category as string | undefined,
        isGlobal: isGlobal === "true" ? true : isGlobal === "false" ? false : undefined,
      });

      res.json({ templates, total: templates.length });
    } catch (error: any) {
      console.error("[Templates List] Error:", error);
      res.status(500).json({ error: "Failed to list templates" });
    }
  });

  // Get a single template - Public endpoint
  app.get("/api/templates/:id", async (req, res) => {
    try {
      const template = await storage.getAdSceneTemplateById(req.params.id);

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      res.json(template);
    } catch (error: any) {
      console.error("[Template Get] Error:", error);
      res.status(500).json({ error: "Failed to get template" });
    }
  });

  // Search templates - Public endpoint
  app.get("/api/templates/search", async (req, res) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== "string") {
        return res.status(400).json({ error: "Query parameter 'q' is required" });
      }

      const templates = await storage.searchAdSceneTemplates(q);
      res.json({ templates, total: templates.length });
    } catch (error: any) {
      console.error("[Templates Search] Error:", error);
      res.status(500).json({ error: "Failed to search templates" });
    }
  });

  // Create a new template (admin only for now - TODO: add admin check)
  app.post("/api/templates", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      // TODO: Add admin role check here
      // if (!await isUserAdmin(userId)) {
      //   return res.status(403).json({ error: "Admin access required" });
      // }

      const templateData = {
        ...req.body,
        createdBy: userId,
        isGlobal: req.body.isGlobal ?? true,
      };

      const template = await storage.saveAdSceneTemplate(templateData);
      res.status(201).json(template);
    } catch (error: any) {
      console.error("[Template Create] Error:", error);
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  // Update a template
  app.patch("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const template = await storage.getAdSceneTemplateById(req.params.id);

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Only creator or admin can update
      // TODO: Add admin check
      if (template.createdBy !== userId) {
        return res.status(403).json({ error: "Not authorized to update this template" });
      }

      const updated = await storage.updateAdSceneTemplate(req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      console.error("[Template Update] Error:", error);
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  // Delete a template
  app.delete("/api/templates/:id", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const template = await storage.getAdSceneTemplateById(req.params.id);

      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }

      // Only creator or admin can delete
      // TODO: Add admin check
      if (template.createdBy !== userId) {
        return res.status(403).json({ error: "Not authorized to delete this template" });
      }

      await storage.deleteAdSceneTemplate(req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Template Delete] Error:", error);
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  // ============================================
  // BRAND PROFILE ENDPOINTS
  // ============================================

  // Get current user's brand profile
  app.get("/api/brand-profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const profile = await storage.getBrandProfileByUserId(userId);

      if (!profile) {
        return res.status(404).json({ error: "Brand profile not found" });
      }

      res.json(profile);
    } catch (error: any) {
      console.error("[Brand Profile Get] Error:", error);
      res.status(500).json({ error: "Failed to get brand profile" });
    }
  });

  // Create or update brand profile
  app.put("/api/brand-profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;

      const existing = await storage.getBrandProfileByUserId(userId);

      if (existing) {
        const updated = await storage.updateBrandProfile(userId, req.body);
        res.json(updated);
      } else {
        const created = await storage.saveBrandProfile({
          userId,
          ...req.body,
        });
        res.status(201).json(created);
      }
    } catch (error: any) {
      console.error("[Brand Profile Update] Error:", error);
      res.status(500).json({ error: "Failed to update brand profile" });
    }
  });

  // Delete brand profile
  app.delete("/api/brand-profile", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      await storage.deleteBrandProfile(userId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Brand Profile Delete] Error:", error);
      res.status(500).json({ error: "Failed to delete brand profile" });
    }
  });

  // ============================================
  // QUOTA MONITORING ENDPOINTS
  // ============================================

  // GET /api/quota/status - Real-time quota status
  app.get("/api/quota/status", async (req, res) => {
    try {
      const brandId = (req.session as any)?.userId || "anonymous";
      const status = await quotaMonitoringService.getQuotaStatus(brandId);
      res.json(status);
    } catch (error: any) {
      console.error("[Quota Status] Error:", error);
      res.status(500).json({ error: "Failed to get quota status" });
    }
  });

  // GET /api/quota/history - Historical usage data
  app.get("/api/quota/history", async (req, res) => {
    try {
      const brandId = (req.session as any)?.userId || "anonymous";
      const { windowType, startDate, endDate } = req.query;

      const history = await quotaMonitoringService.getUsageHistory({
        brandId,
        windowType: (windowType as 'minute' | 'hour' | 'day') || 'hour',
        startDate: startDate ? new Date(startDate as string) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: endDate ? new Date(endDate as string) : new Date(),
      });

      res.json({ history });
    } catch (error: any) {
      console.error("[Quota History] Error:", error);
      res.status(500).json({ error: "Failed to get quota history" });
    }
  });

  // GET /api/quota/breakdown - Usage breakdown by category
  app.get("/api/quota/breakdown", async (req, res) => {
    try {
      const brandId = (req.session as any)?.userId || "anonymous";
      const { period } = req.query;

      const breakdown = await quotaMonitoringService.getUsageBreakdown({
        brandId,
        period: (period as 'today' | 'week' | 'month') || 'today',
      });

      res.json(breakdown);
    } catch (error: any) {
      console.error("[Quota Breakdown] Error:", error);
      res.status(500).json({ error: "Failed to get quota breakdown" });
    }
  });

  // GET /api/quota/rate-limit-status - Check if currently rate limited
  app.get("/api/quota/rate-limit-status", async (req, res) => {
    try {
      const brandId = (req.session as any)?.userId || "anonymous";
      const status = await quotaMonitoringService.getRateLimitStatus(brandId);
      res.json(status);
    } catch (error: any) {
      console.error("[Rate Limit Status] Error:", error);
      res.status(500).json({ error: "Failed to get rate limit status" });
    }
  });

  // GET /api/quota/alerts - Get alert configurations
  app.get("/api/quota/alerts", requireAuth, async (req, res) => {
    try {
      const brandId = (req.session as any).userId;
      const alerts = await quotaMonitoringService.getAlerts(brandId);
      res.json({ alerts });
    } catch (error: any) {
      console.error("[Quota Alerts Get] Error:", error);
      res.status(500).json({ error: "Failed to get quota alerts" });
    }
  });

  // PUT /api/quota/alerts - Update or create alert configuration
  app.put("/api/quota/alerts", requireAuth, async (req, res) => {
    try {
      const brandId = (req.session as any).userId;
      const { alertType, thresholdValue, isEnabled } = req.body;

      if (!alertType || thresholdValue === undefined) {
        return res.status(400).json({ error: "alertType and thresholdValue are required" });
      }

      const alert = await quotaMonitoringService.setAlert({
        brandId,
        alertType,
        thresholdValue,
        isEnabled: isEnabled ?? true,
      });

      res.json(alert);
    } catch (error: any) {
      console.error("[Quota Alerts Update] Error:", error);
      res.status(500).json({ error: "Failed to update quota alert" });
    }
  });

  // GET /api/quota/check-alerts - Check triggered alerts
  app.get("/api/quota/check-alerts", async (req, res) => {
    try {
      const brandId = (req.session as any)?.userId || "anonymous";
      const triggered = await quotaMonitoringService.checkAlerts(brandId);
      res.json({ triggered });
    } catch (error: any) {
      console.error("[Check Alerts] Error:", error);
      res.status(500).json({ error: "Failed to check alerts" });
    }
  });

  // ============================================
  // GOOGLE CLOUD MONITORING SYNC ENDPOINTS
  // ============================================

  // GET /api/quota/google/status - Get Google Cloud sync status
  app.get("/api/quota/google/status", async (req, res) => {
    try {
      const service = await getGoogleCloudService();
      if (!service) {
        return res.status(503).json({ error: "Google Cloud Monitoring not available" });
      }
      const syncStatus = service.getSyncStatus();
      const lastSnapshot = service.getLastSync();

      res.json({
        ...syncStatus,
        lastSnapshot: lastSnapshot ? {
          quotas: lastSnapshot.quotas,
          projectId: lastSnapshot.projectId,
          service: lastSnapshot.service,
        } : null,
      });
    } catch (error: any) {
      console.error("[Google Quota Status] Error:", error);
      res.status(500).json({ error: "Failed to get Google quota status" });
    }
  });

  // GET /api/quota/google/snapshot - Get latest Google quota snapshot
  app.get("/api/quota/google/snapshot", async (req, res) => {
    try {
      const service = await getGoogleCloudService();
      const snapshot = service?.getLastSync();

      if (!snapshot) {
        // Try to get from database if not in memory
        const dbSnapshot = await storage.getLatestGoogleQuotaSnapshot();
        if (dbSnapshot) {
          res.json(dbSnapshot);
          return;
        }
        return res.status(404).json({ error: "No quota snapshot available" });
      }

      res.json(snapshot);
    } catch (error: any) {
      console.error("[Google Quota Snapshot] Error:", error);
      res.status(500).json({ error: "Failed to get Google quota snapshot" });
    }
  });

  // POST /api/quota/google/sync - Trigger manual sync
  app.post("/api/quota/google/sync", async (req, res) => {
    try {
      const service = await getGoogleCloudService();
      if (!service) {
        return res.status(503).json({ error: "Google Cloud Monitoring not available" });
      }
      if (!service.isConfigured()) {
        return res.status(400).json({
          error: "Google Cloud Monitoring not configured",
          details: "Set GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_CREDENTIALS_JSON environment variables",
        });
      }

      // Create sync history entry
      const syncEntry = await storage.createSyncHistoryEntry({
        startedAt: new Date(),
        status: 'running',
        metricsRequested: 3, // We request 3 metrics
        metricsFetched: 0,
        triggerType: 'manual',
      });

      // Perform the sync
      const snapshot = await service.triggerManualSync();

      // Update sync history
      await storage.updateSyncHistoryEntry(syncEntry.id, {
        completedAt: new Date(),
        durationMs: Date.now() - syncEntry.startedAt.getTime(),
        status: snapshot.syncStatus,
        metricsFetched: snapshot.quotas.length,
        errorMessage: snapshot.errorMessage,
      });

      res.json({
        success: snapshot.syncStatus !== 'failed',
        snapshot,
        syncHistoryId: syncEntry.id,
      });
    } catch (error: any) {
      console.error("[Google Quota Manual Sync] Error:", error);
      res.status(500).json({ error: "Failed to sync Google quota data" });
    }
  });

  // GET /api/quota/google/history - Get sync history
  app.get("/api/quota/google/history", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const history = await storage.getRecentSyncHistory(limit);
      res.json({ history });
    } catch (error: any) {
      console.error("[Google Quota Sync History] Error:", error);
      res.status(500).json({ error: "Failed to get sync history" });
    }
  });

  // GET /api/quota/google/snapshots - Get historical snapshots
  app.get("/api/quota/google/snapshots", async (req, res) => {
    try {
      const brandId = req.query.brandId as string | undefined;
      const startDate = new Date(req.query.startDate as string || Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date(req.query.endDate as string || Date.now());
      const limit = parseInt(req.query.limit as string) || 100;

      const snapshots = await storage.getGoogleQuotaSnapshotHistory({
        brandId,
        startDate,
        endDate,
        limit,
      });

      res.json({ snapshots });
    } catch (error: any) {
      console.error("[Google Quota Snapshots History] Error:", error);
      res.status(500).json({ error: "Failed to get snapshot history" });
    }
  });

  // Start Google Cloud Monitoring auto-sync on server startup
  // Uses lazy-loading to prevent import-time errors
  (async () => {
    try {
      const service = await getGoogleCloudService();
      if (service) {
        service.startAutoSync();
        console.log('[GoogleCloudMonitoring] Auto-sync started');
      }
    } catch (error) {
      console.error('[GoogleCloudMonitoring] Failed to start auto-sync:', error);
    }
  })();

  const httpServer = createServer(app);
  return httpServer;
}





