import { GoogleGenAI } from "@google/genai";
import { logger } from './logger';

const apiKey = process.env.GOOGLE_API_KEY_TEST || process.env.GOOGLE_API_KEY;

if (!apiKey) {
    // Warn but don't crash, in case we are just building or running tests without keys
    logger.warn({ module: 'gemini' }, 'Neither GOOGLE_API_KEY_TEST nor GOOGLE_API_KEY is set. Gemini features will fail.');
}

// Single instance of the client
// We use the TEST key as the primary source of truth as requested
// MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.
export const genAI = new GoogleGenAI({
    apiKey: apiKey || "" // Empty string fallback to prevent crash if missing (warning logged above)
});

// Helper to get a model with standard configuration if needed
export const getModel = (modelName: string) => {
    return genAI.models.generateContent;
};
