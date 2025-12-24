import { GoogleGenerativeAI } from '@google/generative-ai';

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
    const apiKey = process.env.GOOGLE_API_KEY_TEST;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateImage(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      } as any
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

    return {
      imageBase64: imageData,
      conversationHistory,
      model: this.modelName
    };
  }

  async continueConversation(
    history: ConversationMessage[],
    editPrompt: string
  ): Promise<GenerateResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseModalities: ['TEXT', 'IMAGE']
      } as any
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

    return {
      imageBase64: imageData,
      conversationHistory: newHistory,
      model: this.modelName
    };
  }

  async analyzeGeneration(
    originalImageBase64: string[],
    generatedImageBase64: string,
    originalPrompt: string,
    userQuestion: string
  ): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    });

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

    // Add original images
    for (const imgData of originalImageBase64) {
      parts.push({
        inlineData: {
          mimeType: 'image/png',
          data: imgData
        }
      });
    }

    // Add generated image
    parts.push({ text: "\n\nTransformed/generated image:" });
    parts.push({
      inlineData: {
        mimeType: 'image/png',
        data: generatedImageBase64
      }
    });

    // Add user question
    parts.push({ text: `\n\nUser question: ${userQuestion}` });

    const result = await model.generateContent(parts);
    const response = result.response;
    const text = response.text();

    if (!text) {
      throw new Error('No text response from analysis');
    }

    return text;
  }
}

export const geminiService = new GeminiService();
