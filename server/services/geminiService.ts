import { GoogleGenAI } from '@google/genai';

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
  private readonly genAI: GoogleGenAI;
  private readonly modelName = 'gemini-3-pro-image-preview';

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY_TEST;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

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
  }
}

export const geminiService = new GeminiService();
