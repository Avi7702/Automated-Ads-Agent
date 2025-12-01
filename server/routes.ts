import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { saveOriginalFile, saveGeneratedImage, deleteFile } from "./fileStorage";
import { insertGenerationSchema, insertProductSchema, insertPromptTemplateSchema } from "@shared/schema";
import express from "express";
import path from "path";
import { v2 as cloudinary } from "cloudinary";

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

// Validate and initialize Gemini client using direct Google API
if (!process.env.GOOGLE_API_KEY) {
  throw new Error("[Gemini] Missing GOOGLE_API_KEY");
}

const genai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from attached_assets directory
  app.use("/attached_assets", express.static(path.join(process.cwd(), "attached_assets")));
  
  // Image transformation endpoint (supports both image transformation and text-only generation)
  app.post("/api/transform", upload.array("images", 6), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      const { prompt } = req.body;
      
      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }

      const hasFiles = files && files.length > 0;
      console.log(`[Transform] Processing ${hasFiles ? files.length : 0} image(s) with prompt: "${prompt.substring(0, 100)}..."`);

      // Build the prompt for transformation or generation
      let enhancedPrompt = prompt;
      
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
      // If no files, use prompt as-is for text-only generation

      // Build user message parts
      const userParts: any[] = [];
      
      // Add all images first (if provided)
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
      const modelName = "gemini-3-pro-image-preview";
      console.log(`[Transform] Using model: ${modelName}`);
      
      const result = await genai.models.generateContent({
        model: modelName,
        contents,
      });
      
      console.log(`[Transform] Model response - modelVersion: ${result.modelVersion}, candidates: ${result.candidates?.length}`);

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
          resolution: "2K",
          conversationHistory,  // Pass as object, Drizzle handles JSONB
          parentGenerationId: null,
          editPrompt: null,
        });

        console.log(`[Transform] Saved generation ${generation.id} with conversation history`);
        
        // Return the file path for the frontend to use
        res.json({ 
          success: true,
          imageUrl: `/${generatedImagePath}`,
          generationId: generation.id,
          prompt: prompt,
          canEdit: true
        });
      } else {
        throw new Error("Generated content was not an image");
      }

    } catch (error: any) {
      console.error("[Transform] Error:", error);
      res.status(500).json({ 
        error: "Failed to transform image",
        details: error.message 
      });
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
      const modelName = "gemini-3-pro-image-preview";
      console.log(`[Edit] Using model: ${modelName}`);
      
      const result = await genai.models.generateContent({
        model: modelName,
        contents: history,
      });
      
      console.log(`[Edit] Model response - modelVersion: ${result.modelVersion}, candidates: ${result.candidates?.length}`);

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

      return res.json({
        success: true,
        generationId: newGeneration.id,
        imageUrl: `/${generatedImagePath}`,
        parentId: parentGeneration.id,
        canEdit: true
      });

    } catch (error: any) {
      console.error("[Edit] Error:", error);
      return res.status(500).json({ 
        success: false, 
        error: error.message || "Failed to edit image" 
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

      const modelName = "gemini-3-pro-preview";
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

  const httpServer = createServer(app);
  return httpServer;
}
