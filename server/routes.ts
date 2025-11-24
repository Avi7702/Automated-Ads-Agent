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

// Validate and initialize Gemini client using Replit AI Integrations
if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY || !process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
  throw new Error("[Gemini] Missing AI integration credentials");
}

const genai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve static files from attached_assets directory
  app.use("/attached_assets", express.static(path.join(process.cwd(), "attached_assets")));
  
  // Image transformation endpoint
  app.post("/api/transform", upload.array("images", 6), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No image files provided" });
      }

      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }

      console.log(`[Transform] Processing ${files.length} image(s) with prompt: "${prompt}"`);

      // Build the prompt for transformation
      let enhancedPrompt = "";
      
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

      // Build content parts with all images
      const parts: any[] = [];
      
      // Add all images first
      files.forEach((file, index) => {
        parts.push({
          inlineData: {
            mimeType: file.mimetype,
            data: file.buffer.toString("base64"),
          },
        });
      });
      
      // Then add the prompt
      parts.push({ text: enhancedPrompt });

      // Generate content with image input using Gemini image generation model
      const result = await genai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          {
            role: "user",
            parts,
          },
        ],
      });

      // Check if we got an image back
      if (!result.candidates?.[0]?.content?.parts?.[0]) {
        throw new Error("No image generated");
      }

      const part = result.candidates[0].content.parts[0];
      
      if (part.inlineData && part.inlineData.data) {
        // Save uploaded files to disk
        const originalImagePaths: string[] = [];
        for (const file of files) {
          const savedPath = await saveOriginalFile(file.buffer, file.originalname);
          originalImagePaths.push(savedPath);
        }

        // Save generated image to disk
        const generatedImageData = part.inlineData.data;
        const mimeType = part.inlineData.mimeType || "image/png";
        const format = mimeType.split("/")[1] || "png";
        const generatedImagePath = await saveGeneratedImage(generatedImageData, format);

        // Save generation record to database
        const generation = await storage.saveGeneration({
          prompt,
          originalImagePaths,
          generatedImagePath,
          resolution: "2K", // Default for now
        });

        console.log(`[Transform] Saved generation ${generation.id}`);
        
        // Return the file path for the frontend to use
        res.json({ 
          success: true,
          imageUrl: `/${generatedImagePath}`,
          generationId: generation.id,
          prompt: prompt
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
      res.json(generation);
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

      const result = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: suggestionPrompt,
      });

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
