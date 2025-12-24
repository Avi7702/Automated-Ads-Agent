import { GoogleGenerativeAI } from '@google/generative-ai';
import { telemetry } from '../instrumentation';

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
}

export interface GenerateOptions {
  referenceImages?: string[];
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
}

export class GeminiService {
  private readonly genAI: GoogleGenerativeAI;
  private readonly modelName = 'gemini-3-pro-image-preview';

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateImage(prompt: string, options?: GenerateOptions, userId?: string): Promise<GenerateResult> {
    const startTime = Date.now();
    let success = false;
    let errorType: string | undefined;

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          // @ts-expect-error - responseModalities is valid for image models
          responseModalities: ['TEXT', 'IMAGE']
        }
      });

      // Build the user message parts
      const userParts: ConversationMessage['parts'] = [{ text: prompt }];

      // Add aspect ratio to prompt if specified
      let enhancedPrompt = prompt;
      if (options?.aspectRatio) {
        enhancedPrompt = `${prompt} [Aspect ratio: ${options.aspectRatio}]`;
        userParts[0].text = enhancedPrompt;
      }

      // Add reference images if provided
      if (options?.referenceImages && options.referenceImages.length > 0) {
        for (const refImage of options.referenceImages) {
          userParts.push({
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
          parts: userParts
        }
      ];

      // Generate content
      const result = await model.generateContent(enhancedPrompt);
      const response = result.response;

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
          imageData = part.inlineData.data;
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
        model: this.modelName
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
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          // @ts-expect-error - responseModalities is valid for image models
          responseModalities: ['TEXT', 'IMAGE']
        }
      });

      // Create new history with the edit prompt
      const newHistory: ConversationMessage[] = [
        ...history,
        {
          role: 'user',
          parts: [{ text: editPrompt }]
        }
      ];

      // Generate content with the conversation history
      const result = await model.generateContent(editPrompt);
      const response = result.response;

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
          imageData = part.inlineData.data;
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
        model: this.modelName
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
  }
}
