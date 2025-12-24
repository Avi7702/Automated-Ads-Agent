import { GoogleGenAI } from '@google/genai';
<<<<<<< HEAD
=======
import { telemetry } from '../instrumentation';
>>>>>>> 154999650a04bb9973c5cddeae01dd5ce52ab181

export interface ConversationMessage {
  role: 'user' | 'model';
  parts: {
    text?: string;
    inlineData?: {
      mimeType: string;
      data: string;
    };
  }[];
}

export interface GenerateResult {
  imageBase64: string;
  conversationHistory: ConversationMessage[];
  model: string;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
}

export interface GenerateOptions {
  referenceImages?: string[];
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

export class GeminiService {
  private readonly genAI: GoogleGenAI;
<<<<<<< HEAD
  private readonly modelName = 'gemini-3-pro-image-preview';
=======
  private readonly modelName = 'gemini-2.0-flash-exp';
>>>>>>> 154999650a04bb9973c5cddeae01dd5ce52ab181

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY_TEST;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

<<<<<<< HEAD
  async analyzeGeneration(
    originalImageBase64: string[],
    generatedImageBase64: string,
    originalPrompt: string,
    userQuestion: string
  ): Promise<string> {
    const systemContext = `You are an AI assistant helping users understand image transformations. 
You are looking at:
1. Original product image(s)
2. A transformed/generated marketing image
3. The prompt that was used: "${originalPrompt}"

The user wants to understand what happened during the transformation and get guidance on how to improve their prompts.
Be helpful, specific, and give actionable advice. Keep responses concise but informative.`;

    const parts: any[] = [
      { text: systemContext + "\n\nOriginal image(s):" }
    ];

    for (const imgData of originalImageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: imgData
        }
      });
    }

    parts.push({ text: "\n\nTransformed/generated image:" });
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: generatedImageBase64
      }
    });

    parts.push({ text: `\n\nUser question: ${userQuestion}` });

    const result = await this.genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts }],
    });

    const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error('No text response from analysis');
    }

    return text;
=======
  async generateImage(prompt: string, options?: GenerateOptions, userId?: string): Promise<GenerateResult> {
    const startTime = Date.now();
    let success = false;
    let errorType: string | undefined;

    try {
      // Build the content parts
      const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];

      // Add aspect ratio to prompt if specified
      let enhancedPrompt = prompt;
      if (options?.aspectRatio) {
        enhancedPrompt = `${prompt} [Aspect ratio: ${options.aspectRatio}]`;
      }
      parts.push({ text: enhancedPrompt });

      // Add reference images if provided
      if (options?.referenceImages && options.referenceImages.length > 0) {
        for (const refImage of options.referenceImages) {
          parts.push({
            inlineData: {
              mimeType: 'image/png',
              data: refImage
            }
          });
        }
      }

      // Create conversation history
      const conversationHistory: ConversationMessage[] = [
        {
          role: 'user',
          parts: parts as ConversationMessage['parts']
        }
      ];

      // Generate content using the new SDK pattern
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents: parts,
        config: {
          responseModalities: ['TEXT', 'IMAGE']
        }
      });

      // Extract image data from response
      const candidate = response.candidates?.[0];
      if (!candidate?.content?.parts) {
        errorType = 'no_content';
        throw new Error('No content in response');
      }

      let imageData = '';
      let mimeType = 'image/png';

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageData = part.inlineData.data || '';
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }

      if (!imageData) {
        errorType = 'no_image_data';
        throw new Error('No image data in response');
      }

      // Add model response to conversation history
      conversationHistory.push({
        role: 'model',
        parts: [{
          inlineData: {
            mimeType,
            data: imageData
          }
        }]
      });

      success = true;

      return {
        imageBase64: imageData,
        conversationHistory,
        model: this.modelName,
        usageMetadata: response.usageMetadata
      };
    } catch (error) {
      errorType = errorType || (error instanceof Error ? error.name : 'unknown');
      throw error;
    } finally {
      // Track Gemini API usage and cost
      const durationMs = Date.now() - startTime;
      telemetry.trackGeminiUsage({
        model: this.modelName,
        operation: 'generate',
        inputTokens: prompt.length * 0.25, // Rough estimate: ~4 chars per token
        outputTokens: 0, // Image output
        durationMs,
        userId,
        success,
        errorType,
      });
    }
  }

  async continueConversation(
    history: ConversationMessage[],
    editPrompt: string,
    userId?: string
  ): Promise<GenerateResult> {
    const startTime = Date.now();
    let success = false;
    let errorType: string | undefined;

    try {
      // Create new history with the edit prompt
      const newHistory: ConversationMessage[] = [
        ...history,
        {
          role: 'user',
          parts: [{ text: editPrompt }]
        }
      ];

      // Build contents array from history for the API
      const contents = newHistory.map(msg => ({
        role: msg.role,
        parts: msg.parts
      }));

      // Generate content using the new SDK pattern
      const response = await this.genAI.models.generateContent({
        model: this.modelName,
        contents,
        config: {
          responseModalities: ['TEXT', 'IMAGE']
        }
      });

      // Extract image data from response
      const candidate = response.candidates?.[0];
      if (!candidate?.content?.parts) {
        errorType = 'no_content';
        throw new Error('No content in response');
      }

      let imageData = '';
      let mimeType = 'image/png';

      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageData = part.inlineData.data || '';
          mimeType = part.inlineData.mimeType || 'image/png';
          break;
        }
      }

      if (!imageData) {
        errorType = 'no_image_data';
        throw new Error('No image data in response');
      }

      // Add model response to conversation history
      newHistory.push({
        role: 'model',
        parts: [{
          inlineData: {
            mimeType,
            data: imageData
          }
        }]
      });

      success = true;

      return {
        imageBase64: imageData,
        conversationHistory: newHistory,
        model: this.modelName,
        usageMetadata: response.usageMetadata
      };
    } catch (error) {
      errorType = errorType || (error instanceof Error ? error.name : 'unknown');
      throw error;
    } finally {
      // Track Gemini API usage and cost
      const durationMs = Date.now() - startTime;
      telemetry.trackGeminiUsage({
        model: this.modelName,
        operation: 'edit',
        inputTokens: editPrompt.length * 0.25, // Rough estimate
        outputTokens: 0,
        durationMs,
        userId,
        success,
        errorType,
      });
    }
>>>>>>> 154999650a04bb9973c5cddeae01dd5ce52ab181
  }
}

export const geminiService = new GeminiService();
