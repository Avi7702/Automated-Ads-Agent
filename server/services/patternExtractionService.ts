/**
 * PatternExtractionService
 *
 * Extracts abstract SUCCESS PATTERNS from high-performing ad images.
 *
 * Key Principle: Extract WHAT makes an ad work, not the ad itself.
 *
 * Extracts:
 * - Layout structure (hero-top, split-50-50, text-overlay)
 * - Visual hierarchy (what draws attention first/second/third)
 * - Color psychology (mood, scheme, contrast)
 * - Hook patterns (question, statistic, pain-point, benefit)
 * - Visual elements (photography vs illustration, human presence)
 *
 * DOES NOT extract:
 * - Actual headline text or copy
 * - Brand names or company information
 * - Specific products or logos
 * - Contact information or faces
 */

import { createHash } from 'crypto';
import { generateContentWithRetry } from '../lib/geminiClient';
import { logger } from '../lib/logger';
import { storage } from '../storage';
import {
  scanForPrivateContent,
  sanitizeExtractedPattern,
  type PrivacyScanResult,
  type ExtractedPatternData,
} from './patternPrivacyFilter';
import type { LearnedAdPattern } from '../../shared/schema';

// Type definitions matching the schema JSONB types
interface LayoutPattern {
  structure: string;
  visualHierarchy: string[];
  whitespaceUsage: 'minimal' | 'balanced' | 'generous';
  focalPointPosition: string;
}

interface ColorPsychology {
  dominantMood: string;
  colorScheme: 'monochromatic' | 'complementary' | 'analogous' | 'triadic';
  contrastLevel: 'low' | 'medium' | 'high';
  emotionalTone: string;
}

interface HookPatterns {
  hookType: string;
  headlineFormula: string;
  ctaStyle: 'soft' | 'direct' | 'urgency';
  persuasionTechnique: string;
}

interface VisualElements {
  imageStyle: 'photography' | 'illustration' | 'mixed' | '3d-render' | 'abstract';
  humanPresence: boolean;
  productVisibility: 'prominent' | 'subtle' | 'none';
  iconography: boolean;
  backgroundType: 'solid' | 'gradient' | 'image' | 'pattern';
}

// Model for pattern extraction (use pro for quality)
const EXTRACTION_MODEL = process.env.GEMINI_EXTRACTION_MODEL || 'gemini-3-pro-preview';

/**
 * Pattern extraction request
 */
export interface PatternExtractionRequest {
  imageBuffer: Buffer;
  mimeType: string;
  userId: string;
  metadata: {
    name: string;
    category: 'product_showcase' | 'testimonial' | 'comparison' | 'educational' | 'promotional' | 'brand_awareness';
    platform: 'linkedin' | 'facebook' | 'instagram' | 'twitter' | 'tiktok' | 'youtube' | 'pinterest' | 'general';
    industry?: string;
    engagementTier?: 'top-1' | 'top-5' | 'top-10' | 'top-25' | 'unverified';
  };
}

/**
 * Pattern extraction result
 */
export interface PatternExtractionResult {
  success: boolean;
  pattern?: LearnedAdPattern;
  uploadId?: string;
  privacyScan?: PrivacyScanResult;
  error?: string;
  isDuplicate?: boolean;
  existingPatternId?: string;
}

/**
 * Raw extracted pattern from Gemini
 */
interface RawExtractedPattern {
  layoutPattern: LayoutPattern;
  colorPsychology: ColorPsychology;
  hookPatterns: HookPatterns;
  visualElements: VisualElements;
  confidenceScore: number;
}

/**
 * Generate SHA-256 hash of image for deduplication
 */
function generateImageHash(imageBuffer: Buffer): string {
  return createHash('sha256').update(imageBuffer).digest('hex');
}

/**
 * Privacy-focused extraction prompt
 *
 * CRITICAL: This prompt explicitly instructs the model to NOT extract
 * any actual text, brand names, or identifying information.
 */
const EXTRACTION_PROMPT = `Analyze this advertisement image and extract ABSTRACT PATTERNS only.

CRITICAL INSTRUCTIONS - READ CAREFULLY:
1. DO NOT extract or describe any actual text, headlines, or copy
2. DO NOT mention any brand names, company names, or product names
3. DO NOT describe specific products, logos, or trademarks
4. DO NOT include contact information, URLs, or specific numbers/statistics
5. DO NOT describe faces or identifiable people

ONLY extract structural and psychological PATTERNS:

Return a JSON object with these exact fields:

{
  "layoutPattern": {
    "structure": "<layout type: hero-top, hero-left, hero-right, split-50-50, text-overlay, grid, full-bleed, minimal-centered>",
    "visualHierarchy": ["<first attention element>", "<second attention element>", "<third attention element>"],
    "whitespaceUsage": "<one of: minimal, balanced, generous>",
    "focalPointPosition": "<position: center, upper-third, lower-third, left-third, right-third, golden-ratio>"
  },
  "colorPsychology": {
    "dominantMood": "<emotional tone: trust, excitement, calm, urgency, luxury, friendly, professional>",
    "colorScheme": "<one of: monochromatic, complementary, analogous, triadic>",
    "contrastLevel": "<one of: low, medium, high>",
    "emotionalTone": "<feeling: energetic, serene, bold, subtle, warm, cool>"
  },
  "hookPatterns": {
    "hookType": "<opening strategy: question, statistic, pain-point, benefit, curiosity, fear, aspiration, social-proof>",
    "headlineFormula": "<structure: how-to, number-list, problem-solution, before-after, testimonial-style, command, comparison>",
    "ctaStyle": "<one of: soft, direct, urgency>",
    "persuasionTechnique": "<primary technique: scarcity, authority, social-proof, reciprocity, commitment, liking>"
  },
  "visualElements": {
    "imageStyle": "<one of: photography, illustration, mixed, 3d-render, abstract>",
    "humanPresence": <boolean - true if humans are visible, false otherwise>,
    "productVisibility": "<one of: prominent, subtle, none>",
    "iconography": <boolean - true if icons are used, false otherwise>,
    "backgroundType": "<one of: solid, gradient, image, pattern>"
  },
  "confidenceScore": <number 0.0-1.0 indicating confidence in this analysis>
}

Return ONLY generic pattern descriptors. Do not include any specific content from the ad.`;

/**
 * Extract abstract patterns from an ad image
 *
 * Flow:
 * 1. Generate image hash for deduplication
 * 2. Check for existing pattern with same hash
 * 3. Run privacy scan
 * 4. If safe, extract patterns using Gemini Vision
 * 5. Sanitize extracted patterns
 * 6. Store in database
 */
export async function extractPatterns(
  request: PatternExtractionRequest
): Promise<PatternExtractionResult> {
  const { imageBuffer, mimeType, userId, metadata } = request;

  try {
    // Step 1: Generate image hash for deduplication
    const sourceHash = generateImageHash(imageBuffer);

    // Step 2: Check for existing pattern with same hash
    const existingPattern = await storage.getLearnedPatternByHash(userId, sourceHash);
    if (existingPattern) {
      logger.info({ patternId: existingPattern.id, userId }, 'Duplicate pattern detected');
      return {
        success: true,
        pattern: existingPattern,
        isDuplicate: true,
        existingPatternId: existingPattern.id,
      };
    }

    // Step 3: Run privacy scan
    const privacyScan = await scanForPrivateContent(imageBuffer, mimeType);

    if (!privacyScan.isSafeToProcess) {
      logger.warn({
        userId,
        reason: privacyScan.rejectionReason,
        hasFaces: privacyScan.hasFaces,
        detectedBrands: privacyScan.detectedBrands,
      }, 'Image rejected by privacy scan');

      return {
        success: false,
        privacyScan,
        error: privacyScan.rejectionReason,
      };
    }

    // Step 4: Extract patterns using Gemini Vision
    const base64Image = imageBuffer.toString('base64');

    const response = await generateContentWithRetry({
      model: EXTRACTION_MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            { text: EXTRACTION_PROMPT },
            {
              inlineData: {
                mimeType,
                data: base64Image,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.2, // Low temperature for consistent pattern extraction
      },
    }, { operation: 'pattern_extraction' });

    const responseText = response.text || '';

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.error({ responseText: responseText.substring(0, 500) }, 'Failed to parse pattern extraction response');
      return {
        success: false,
        privacyScan,
        error: 'Failed to extract patterns from image',
      };
    }

    const rawPattern: RawExtractedPattern = JSON.parse(jsonMatch[0]);

    // Step 5: Sanitize extracted patterns (second-pass safety)
    const sanitizedPattern = sanitizeExtractedPattern({
      layoutPattern: rawPattern.layoutPattern,
      colorPsychology: rawPattern.colorPsychology,
      hookPatterns: rawPattern.hookPatterns,
      visualElements: rawPattern.visualElements,
    });

    // Step 6: Store in database
    const pattern = await storage.createLearnedPattern({
      userId,
      name: metadata.name,
      category: metadata.category,
      platform: metadata.platform,
      industry: metadata.industry,
      layoutPattern: sanitizedPattern.layoutPattern as LayoutPattern,
      colorPsychology: sanitizedPattern.colorPsychology as ColorPsychology,
      hookPatterns: sanitizedPattern.hookPatterns as HookPatterns,
      visualElements: sanitizedPattern.visualElements as VisualElements,
      engagementTier: metadata.engagementTier,
      confidenceScore: rawPattern.confidenceScore || 0.8,
      sourceHash,
    });

    logger.info({
      patternId: pattern.id,
      userId,
      category: metadata.category,
      platform: metadata.platform,
      confidenceScore: rawPattern.confidenceScore,
    }, 'Pattern extracted successfully');

    return {
      success: true,
      pattern,
      privacyScan,
    };

  } catch (error) {
    logger.error({ err: error, userId }, 'Pattern extraction failed');
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Pattern extraction failed',
    };
  }
}

/**
 * Process an upload record end-to-end
 *
 * This is the main entry point for the upload processing pipeline.
 * It handles the full flow from upload to pattern storage.
 */
export async function processUploadForPatterns(
  uploadId: string,
  imageBuffer: Buffer,
  mimeType: string,
  metadata: PatternExtractionRequest['metadata']
): Promise<PatternExtractionResult> {
  // Get upload record
  const upload = await storage.getUploadById(uploadId);
  if (!upload) {
    return {
      success: false,
      error: 'Upload record not found',
    };
  }

  // Update status to processing
  await storage.updateUploadStatus(uploadId, 'processing');

  const startTime = Date.now();

  try {
    // Extract patterns
    const result = await extractPatterns({
      imageBuffer,
      mimeType,
      userId: upload.userId,
      metadata,
    });

    const processingDurationMs = Date.now() - startTime;

    if (result.success && result.pattern) {
      // Update upload with extracted pattern
      await storage.updateUploadWithPattern(
        uploadId,
        result.pattern.id,
        processingDurationMs
      );
    } else {
      // Update upload as failed
      await storage.updateUploadStatus(
        uploadId,
        'failed',
        result.error
      );
    }

    return result;

  } catch (error) {
    await storage.updateUploadStatus(
      uploadId,
      'failed',
      error instanceof Error ? error.message : 'Processing failed'
    );

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
    };
  }
}

/**
 * Get patterns relevant to a specific generation context
 *
 * Used by IdeaBankService to fetch patterns for ad generation.
 */
export async function getRelevantPatterns(params: {
  userId: string;
  category?: string;
  platform?: string;
  industry?: string;
  maxPatterns?: number;
}): Promise<LearnedAdPattern[]> {
  const { userId, category, platform, industry, maxPatterns = 5 } = params;

  // Fetch user's active patterns
  const allPatterns = await storage.getLearnedPatterns(userId, { isActive: true });

  if (allPatterns.length === 0) {
    return [];
  }

  // Score patterns based on relevance
  const scoredPatterns = allPatterns.map(pattern => {
    let score = 0;

    // Category match (highest weight)
    if (category && pattern.category === category) {
      score += 25;
    }

    // Industry match
    if (industry && pattern.industry === industry) {
      score += 20;
    }

    // Platform match
    if (platform && pattern.platform === platform) {
      score += 15;
    } else if (pattern.platform === 'general') {
      score += 5; // General patterns are always somewhat relevant
    }

    // Engagement tier bonus
    const tierScores: Record<string, number> = {
      'top-1': 15,
      'top-5': 12,
      'top-10': 8,
      'top-25': 4,
      'unverified': 0,
    };
    score += tierScores[pattern.engagementTier || 'unverified'] || 0;

    // Recency bonus (patterns used recently are more likely relevant)
    if (pattern.lastUsedAt) {
      const daysSinceUse = (Date.now() - new Date(pattern.lastUsedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceUse < 7) score += 10;
      else if (daysSinceUse < 30) score += 5;
    }

    // Usage count bonus (popular patterns)
    if (pattern.usageCount > 10) score += 5;
    else if (pattern.usageCount > 5) score += 3;
    else if (pattern.usageCount > 0) score += 1;

    return { pattern, score };
  });

  // Sort by score and take top N
  return scoredPatterns
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPatterns)
    .map(sp => sp.pattern);
}

/**
 * Format patterns for inclusion in LLM generation prompt
 */
export function formatPatternsForPrompt(patterns: LearnedAdPattern[]): string {
  if (patterns.length === 0) {
    return '';
  }

  const formattedPatterns = patterns.map((pattern, index) => {
    const parts: string[] = [`Pattern ${index + 1}: "${pattern.name}"`];

    if (pattern.layoutPattern) {
      const lp = pattern.layoutPattern;
      const hierarchy = lp.visualHierarchy?.join(' -> ') || 'balanced';
      parts.push(`  Layout: ${lp.structure || 'flexible'} structure, ${hierarchy} flow, ${lp.whitespaceUsage || 'balanced'} whitespace`);
    }

    if (pattern.colorPsychology) {
      const cp = pattern.colorPsychology;
      parts.push(`  Color Mood: ${cp.dominantMood || 'neutral'}, ${cp.colorScheme || 'balanced'} scheme, ${cp.contrastLevel || 'medium'} contrast`);
    }

    if (pattern.hookPatterns) {
      const hp = pattern.hookPatterns;
      parts.push(`  Hook: ${hp.hookType || 'benefit'} opening, ${hp.headlineFormula || 'direct'} headline, ${hp.ctaStyle || 'direct'} CTA`);
    }

    if (pattern.visualElements) {
      const ve = pattern.visualElements;
      const humanText = ve.humanPresence ? 'with people' : 'no people';
      parts.push(`  Visuals: ${ve.imageStyle || 'photography'} style, ${ve.productVisibility || 'prominent'} product focus, ${humanText}`);
    }

    if (pattern.engagementTier && pattern.engagementTier !== 'unverified') {
      parts.push(`  Performance: ${pattern.engagementTier.replace('-', ' ')} percentile`);
    }

    return parts.join('\n');
  });

  return `
LEARNED SUCCESS PATTERNS FROM HIGH-PERFORMING ADS:
Use these proven patterns as inspiration for the ad design.

${formattedPatterns.join('\n\n')}

Apply these patterns to create an effective ad while keeping the content original.
`;
}
