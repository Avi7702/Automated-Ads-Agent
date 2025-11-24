import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { GoogleGenAI } from "@google/genai";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Initialize Gemini client
const genai = new GoogleGenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Image transformation endpoint
  app.post("/api/transform", upload.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image file provided" });
      }

      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "No prompt provided" });
      }

      console.log(`[Transform] Processing image with prompt: "${prompt}"`);

      // Convert buffer to base64
      const imageBase64 = req.file.buffer.toString("base64");
      const mimeType = req.file.mimetype;

      // Build the prompt for transformation
      const enhancedPrompt = `Transform this product photo based on the following instructions: ${prompt}

Guidelines:
- Keep the product as the hero/focus
- Maintain professional photography quality
- Ensure the product is clearly visible and recognizable
- Apply the requested scene, lighting, and style changes
- Do not add text or watermarks`;

      // Generate content with image input using Gemini image generation model
      const result = await genai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: imageBase64,
                },
              },
              { text: enhancedPrompt },
            ],
          },
        ],
      });

      // Check if we got an image back
      if (!result.candidates?.[0]?.content?.parts?.[0]) {
        throw new Error("No image generated");
      }

      const part = result.candidates[0].content.parts[0];
      
      if (part.inlineData) {
        // Return the generated image
        const generatedImageData = part.inlineData.data;
        const generatedMimeType = part.inlineData.mimeType || "image/png";
        
        // Send as base64 data URL
        const dataUrl = `data:${generatedMimeType};base64,${generatedImageData}`;
        
        res.json({ 
          success: true,
          imageUrl: dataUrl,
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

  const httpServer = createServer(app);
  return httpServer;
}
