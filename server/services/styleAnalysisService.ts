/**
 * Style Analysis Service
 *
 * Analyzes reference images using Gemini Vision to extract style elements:
 * - Color palette, mood, composition, lighting
 * - Typography style, texture patterns
 * - Overall aesthetic description for prompt injection
 *
 * Results are cached in the styleReferences table (analyzedAt + imageFingerprint).
 */

import crypto from 'crypto';
import { generateContentWithRetry } from '../lib/geminiClient';
import { sanitizeOutputString } from '../lib/promptSanitizer';

const VISION_MODEL = process.env.GEMINI_VISION_MODEL || 'gemini-3-pro-preview';

export interface StyleElements {
  colors: string[];
  mood: string;
  composition: string;
  lighting: string;
  textures: string[];
  typography: string | null;
  dominantFeatures: string[];
}

export interface StyleAnalysisResult {
  styleDescription: string;
  extractedElements: StyleElements;
  confidence: number;
}

/**
 * Generate a fingerprint from the Cloudinary public ID for cache invalidation.
 */
export function generateStyleFingerprint(cloudinaryPublicId: string): string {
  return crypto.createHash('md5').update(cloudinaryPublicId).digest('hex');
}

/**
 * Analyze a reference image to extract style elements.
 */
export async function analyzeStyleImage(imageUrl: string, imageName: string): Promise<StyleAnalysisResult> {
  const prompt = `You are an expert visual style analyst for an advertising platform. Analyze this reference image named "${imageName}" and extract its visual style elements.

Return JSON in this exact format:
{
  "styleDescription": "A detailed 2-3 sentence prose description of the visual style, suitable for use as a style directive in an image generation prompt. Focus on the overall aesthetic, mood, and key visual characteristics.",
  "extractedElements": {
    "colors": ["array of 3-6 dominant colors using descriptive names like 'warm amber', 'deep navy', 'soft cream'"],
    "mood": "the emotional mood or atmosphere (e.g., 'professional and clean', 'warm and inviting', 'bold and energetic')",
    "composition": "how elements are arranged (e.g., 'centered product with blurred background', 'rule-of-thirds with negative space')",
    "lighting": "lighting style (e.g., 'soft natural daylight', 'dramatic side lighting', 'studio flat light')",
    "textures": ["notable textures visible (e.g., 'brushed metal', 'rough concrete', 'smooth glass')"],
    "typography": "any typography style observed, or null if no text is present",
    "dominantFeatures": ["2-4 most distinctive visual features that define this style"]
  },
  "confidence": a number 0-100 indicating analysis confidence
}

Be specific and descriptive. These style elements will be used to generate new images that match this reference style.`;

  const base64 = await fetchImageAsBase64(imageUrl);

  const response = await generateContentWithRetry(
    {
      model: VISION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }, { inlineData: { mimeType: 'image/jpeg', data: base64 } }],
        },
      ],
      config: { temperature: 0.3 },
    },
    { operation: 'style_analysis' },
  );

  const text = response.text || '';

  // Extract JSON
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse style analysis response');
  }

  const parsed = JSON.parse(jsonMatch[0]);

  // Sanitize all string outputs
  const elements: StyleElements = {
    colors: Array.isArray(parsed.extractedElements?.colors)
      ? parsed.extractedElements.colors.map(sanitizeOutputString).filter(Boolean)
      : [],
    mood: sanitizeOutputString(parsed.extractedElements?.mood) || 'neutral',
    composition: sanitizeOutputString(parsed.extractedElements?.composition) || 'standard',
    lighting: sanitizeOutputString(parsed.extractedElements?.lighting) || 'natural',
    textures: Array.isArray(parsed.extractedElements?.textures)
      ? parsed.extractedElements.textures.map(sanitizeOutputString).filter(Boolean)
      : [],
    typography: parsed.extractedElements?.typography ? sanitizeOutputString(parsed.extractedElements.typography) : null,
    dominantFeatures: Array.isArray(parsed.extractedElements?.dominantFeatures)
      ? parsed.extractedElements.dominantFeatures.map(sanitizeOutputString).filter(Boolean)
      : [],
  };

  return {
    styleDescription: sanitizeOutputString(parsed.styleDescription) || 'No style description available',
    extractedElements: elements,
    confidence: typeof parsed.confidence === 'number' ? Math.min(100, Math.max(0, parsed.confidence)) : 70,
  };
}

/**
 * Build a style directive string from a style reference for prompt injection.
 * This is appended to generation prompts to maintain visual consistency.
 */
export function buildStyleDirective(styleDescription: string, elements: StyleElements | null): string {
  const parts: string[] = [];

  parts.push(`[STYLE REFERENCE: ${styleDescription}]`);

  if (elements) {
    if (elements.colors.length > 0) {
      parts.push(`[Color palette: ${elements.colors.join(', ')}]`);
    }
    if (elements.mood) {
      parts.push(`[Mood: ${elements.mood}]`);
    }
    if (elements.lighting) {
      parts.push(`[Lighting: ${elements.lighting}]`);
    }
    if (elements.composition) {
      parts.push(`[Composition: ${elements.composition}]`);
    }
  }

  return parts.join(' ');
}

/**
 * Fetch an image URL and convert to base64.
 */
async function fetchImageAsBase64(url: string): Promise<string> {
  // Handle Shopify {width} placeholder
  const normalizedUrl = url.includes('{width}') ? url.replace('{width}', '800') : url;

  const response = await fetch(normalizedUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.status} for URL: ${normalizedUrl}`);
  }
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

export const styleAnalysisService = {
  analyzeStyleImage,
  buildStyleDirective,
  generateStyleFingerprint,
};
