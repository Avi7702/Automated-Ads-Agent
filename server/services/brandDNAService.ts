// @ts-nocheck
/**
 * Brand DNA Service
 *
 * Analyzes brand data to build a persistent "brand understanding" that enriches
 * every generation. Examines brand profile, brand images, successful generations,
 * and brand voice settings to extract:
 *
 * - Visual Signature: dominant colors, composition style, lighting preferences
 * - Tone Analysis: formality, humor, technical depth, emotional register
 * - Audience Profile: engagement patterns, content preferences
 * - Content Rules: auto-learned do's and don'ts from high-scoring generations
 *
 * The resulting Brand DNA is stored per-user and injected into generation prompts
 * via Stage 3 (Brand Context) of the generation pipeline.
 */

import { logger } from '../lib/logger';
import { generateContentWithRetry } from '../lib/geminiClient';
import type { IStorage } from '../storage';
import type { BrandDNA } from '@shared/schema';

const BRAND_DNA_MODEL = 'gemini-3-flash';

/**
 * Analyze a user's brand data and build/update their Brand DNA profile.
 *
 * Steps:
 * 1. Fetch brand profile (name, styles, values, colors, voice)
 * 2. Fetch recent successful generations (for pattern analysis)
 * 3. Fetch brand images (for visual signature)
 * 4. Use Gemini Flash to analyze patterns
 * 5. Upsert results to brandDNA table
 */
export async function analyzeBrandDNA(userId: string, storage: IStorage): Promise<BrandDNA> {
  logger.info({ module: 'BrandDNAService', userId }, 'Starting Brand DNA analysis');

  // 1. Fetch brand profile
  const brandProfile = await storage.getBrandProfileByUserId(userId);

  // 2. Fetch recent successful generations (last 20)
  // OPTIMIZATION: Filter by userId and status in the database instead of in-memory.
  // Note: getGenerationsByUserId only filters by userId, we still filter by status in memory
  // but on a much smaller dataset (only the user's generations instead of everyone's).
  const userGenerations = (await storage.getGenerationsByUserId(userId, 50, 0))
    .filter((g) => g.status === 'completed')
    .slice(0, 20);

  // 3. Fetch brand images
  const brandImages = await storage.getBrandImagesByCategory(userId, 'historical_ad');
  const productHeroImages = await storage.getBrandImagesByCategory(userId, 'product_hero');
  const allBrandImages = [...brandImages, ...productHeroImages];

  // 4. Build analysis prompt
  const analysisPrompt = buildAnalysisPrompt(brandProfile, userGenerations, allBrandImages);

  // 5. Call Gemini Flash for analysis
  let analysisResult: Record<string, unknown> = {};

  try {
    const result = await generateContentWithRetry(
      {
        model: BRAND_DNA_MODEL,
        contents: [
          {
            role: 'user',
            parts: [{ text: analysisPrompt }],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      },
      { operation: 'brand_dna_analysis' },
    );

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (responseText) {
      analysisResult = JSON.parse(responseText);
    }
  } catch (err) {
    logger.warn({ module: 'BrandDNAService', err }, 'Gemini analysis failed — using extracted data only');
    // Fall back to basic extraction without AI
    analysisResult = extractBasicBrandDNA(brandProfile, userGenerations);
  }

  // 6. Upsert to brandDNA table
  const dna = await storage.upsertBrandDNA(userId, {
    visualSignature: analysisResult.visualSignature ?? extractVisualSignature(brandProfile, allBrandImages),
    toneAnalysis: analysisResult.toneAnalysis ?? extractToneAnalysis(brandProfile),
    audienceProfile: analysisResult.audienceProfile ?? null,
    competitorDiff: analysisResult.competitorDiff ?? null,
    contentRules: analysisResult.contentRules ?? null,
  });

  logger.info({ module: 'BrandDNAService', userId, version: dna.version }, 'Brand DNA analysis completed');

  return dna;
}

/**
 * Get a text block of Brand DNA context suitable for injection into generation prompts.
 * If no Brand DNA exists for the user, returns an empty string.
 */
export async function getBrandDNAContext(userId: string, storage: IStorage): Promise<string> {
  const dna = await storage.getBrandDNA(userId);
  if (!dna) return '';

  const sections: string[] = [];

  // Visual Signature
  const visual = dna.visualSignature as Record<string, unknown> | null;
  if (visual) {
    const parts: string[] = [];
    if (visual.dominantColors) parts.push(`Dominant Colors: ${formatValue(visual.dominantColors)}`);
    if (visual.compositionStyle) parts.push(`Composition Style: ${visual.compositionStyle}`);
    if (visual.lightingPreference) parts.push(`Lighting: ${visual.lightingPreference}`);
    if (visual.typography) parts.push(`Typography: ${visual.typography}`);
    if (parts.length > 0) {
      sections.push(`Visual Signature:\n${parts.map((p) => `  - ${p}`).join('\n')}`);
    }
  }

  // Tone Analysis
  const tone = dna.toneAnalysis as Record<string, unknown> | null;
  if (tone) {
    const parts: string[] = [];
    if (tone.formality) parts.push(`Formality: ${tone.formality}`);
    if (tone.humorLevel) parts.push(`Humor: ${tone.humorLevel}`);
    if (tone.technicalDepth) parts.push(`Technical Depth: ${tone.technicalDepth}`);
    if (tone.emotionalRegister) parts.push(`Emotional Register: ${tone.emotionalRegister}`);
    if (parts.length > 0) {
      sections.push(`Brand Tone:\n${parts.map((p) => `  - ${p}`).join('\n')}`);
    }
  }

  // Content Rules
  const rules = dna.contentRules as Record<string, unknown> | null;
  if (rules) {
    const parts: string[] = [];
    if (Array.isArray(rules.doList)) {
      parts.push(`DO: ${rules.doList.join(', ')}`);
    }
    if (Array.isArray(rules.dontList)) {
      parts.push(`DON'T: ${rules.dontList.join(', ')}`);
    }
    if (parts.length > 0) {
      sections.push(`Content Rules:\n${parts.map((p) => `  - ${p}`).join('\n')}`);
    }
  }

  if (sections.length === 0) return '';

  return `\nBRAND DNA INSIGHTS (v${dna.version}):\n${sections.join('\n')}`;
}

// ============================================
// INTERNAL HELPERS
// ============================================

function buildAnalysisPrompt(brandProfile: any, generations: any[], brandImages: any[]): string {
  const brandContext = brandProfile
    ? `Brand Name: ${brandProfile.brandName || 'Unknown'}
Industry: ${brandProfile.industry || 'Unknown'}
Values: ${(brandProfile.brandValues || []).join(', ')}
Preferred Styles: ${(brandProfile.preferredStyles || []).join(', ')}
Color Preferences: ${(brandProfile.colorPreferences || []).join(', ')}
Voice Principles: ${JSON.stringify(brandProfile.voice || {})}
Target Audience: ${JSON.stringify(brandProfile.targetAudience || {})}`
    : 'No brand profile available.';

  const generationContext =
    generations.length > 0
      ? `Recent Generation Prompts (${generations.length} total):
${generations
  .slice(0, 10)
  .map((g, i) => `  ${i + 1}. "${g.prompt.slice(0, 200)}"`)
  .join('\n')}`
      : 'No generation history available.';

  const imageContext =
    brandImages.length > 0
      ? `Brand Images: ${brandImages.length} images available across categories: ${[...new Set(brandImages.map((img) => img.category))].join(', ')}`
      : 'No brand images available.';

  return `Analyze this brand's data and extract a Brand DNA profile. Return a JSON object with these exact keys:

{
  "visualSignature": {
    "dominantColors": ["color1", "color2", "color3"],
    "compositionStyle": "description of typical composition approach",
    "lightingPreference": "description of preferred lighting",
    "typography": "description of typography tendencies"
  },
  "toneAnalysis": {
    "formality": "formal | semi-formal | casual",
    "humorLevel": "none | subtle | moderate | frequent",
    "technicalDepth": "basic | intermediate | expert",
    "emotionalRegister": "description of dominant emotional tone"
  },
  "audienceProfile": {
    "primaryAudience": "description",
    "engagementDrivers": ["driver1", "driver2"],
    "contentPreferences": ["preference1", "preference2"]
  },
  "competitorDiff": {
    "uniqueStrengths": ["strength1", "strength2"],
    "differentiators": ["differentiator1", "differentiator2"]
  },
  "contentRules": {
    "doList": ["always include X", "emphasize Y"],
    "dontList": ["avoid generic claims", "no stock imagery feel"]
  }
}

BRAND DATA:
${brandContext}

GENERATION HISTORY:
${generationContext}

IMAGE LIBRARY:
${imageContext}

Analyze the patterns across all available data. If data is limited, make reasonable inferences based on the industry and brand values. Return ONLY the JSON object.`;
}

function extractBasicBrandDNA(brandProfile: any, _generations: any[]): Record<string, unknown> {
  if (!brandProfile) return {};

  return {
    visualSignature: extractVisualSignature(brandProfile, []),
    toneAnalysis: extractToneAnalysis(brandProfile),
    audienceProfile: brandProfile.targetAudience
      ? {
          primaryAudience: (brandProfile.targetAudience as any)?.demographics || 'Unknown',
          engagementDrivers: (brandProfile.targetAudience as any)?.painPoints || [],
          contentPreferences: [],
        }
      : null,
    competitorDiff: null,
    contentRules: null,
  };
}

function extractVisualSignature(brandProfile: any, _brandImages: any[]): Record<string, unknown> | null {
  if (!brandProfile) return null;

  return {
    dominantColors: brandProfile.colorPreferences || [],
    compositionStyle: (brandProfile.preferredStyles || []).join(', ') || 'professional',
    lightingPreference: 'natural',
    typography: 'clean and modern',
  };
}

function extractToneAnalysis(brandProfile: any): Record<string, unknown> | null {
  if (!brandProfile?.voice) return null;

  const voice = brandProfile.voice as any;
  return {
    formality: 'semi-formal',
    humorLevel: 'subtle',
    technicalDepth: 'intermediate',
    emotionalRegister: (voice?.principles || []).join(', ') || 'professional',
  };
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'object' && value !== null) return JSON.stringify(value);
  return String(value);
}
