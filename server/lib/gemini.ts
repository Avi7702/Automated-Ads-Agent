import { GoogleGenAI } from '@google/genai';
import { logger } from './logger';

const envApiKey = process.env['GOOGLE_API_KEY_TEST'] || process.env['GOOGLE_API_KEY'];

if (!envApiKey) {
  logger.warn(
    { module: 'gemini' },
    'Neither GOOGLE_API_KEY_TEST nor GOOGLE_API_KEY is set. Gemini features will use user-saved keys only.',
  );
}

// Default singleton for backward compatibility (env-var based)
export const genAI = new GoogleGenAI({
  apiKey: envApiKey || '',
});

// Factory: create a GoogleGenAI client with a specific API key
export function createGeminiClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({ apiKey });
}

// Get the default env-based API key (for resolveApiKey fallback)
export function getEnvApiKey(): string | undefined {
  return envApiKey;
}
