import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";
import { saveOriginalFile, saveGeneratedImage, deleteFile } from "./fileStorage";
import { insertGenerationSchema } from "@shared/schema";
import express from "express";
import path from "path";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 6 // Max 6 files
  }
});

// Initialize Gemini client using Replit AI Integrations
const genai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
  httpOptions: {
    apiVersion: "",
    baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL!,
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

  const httpServer = createServer(app);
  return httpServer;
}
