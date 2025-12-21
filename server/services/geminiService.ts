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
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateImage(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
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
}
