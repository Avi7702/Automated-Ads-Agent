/**
 * Content Safety Service - Phase 8.0 HITL Approval System
 *
 * Performs multi-layer content safety validation to ensure brand-safe content:
 * 1. Gemini Safety API for hate speech, violence, sexual content, harassment
 * 2. PII detection (emails, phones, SSN, credit cards)
 * 3. Prohibited words detection (from brand profile)
 * 4. Competitor brand mentions
 * 5. Overall brand safety scoring (0-100)
 *
 * Returns comprehensive safety checks for approval queue filtering.
 */

import { logger } from '../lib/logger';
import { generateContentWithRetry } from '../lib/geminiClient';
import { storage } from '../storage';
import { HarmCategory, HarmBlockThreshold, HarmBlockMethod } from '@google/genai';

// Fast model for safety checks
const SAFETY_MODEL = 'gemini-3-flash-preview';

/**
 * Safety check results interface
 * All boolean flags: true = PASSED (safe), false = FAILED (unsafe)
 */
export interface SafetyChecks {
  hateSpeech: boolean; // true = no hate speech detected
  violence: boolean; // true = no violence detected
  sexualContent: boolean; // true = no sexual content detected
  piiDetection: boolean; // true = no PII detected
  prohibitedWords: string[]; // List of prohibited words found
  competitorMentions: string[]; // List of competitor brands mentioned
  brandSafetyScore: number; // 0-100 (100 = perfect, 0 = multiple critical issues)
}

/**
 * Parameters for content safety check
 */
export interface CheckSafetyParams {
  caption: string;
  imageUrl?: string; // Optional: for future image-based safety checks
  userId: string;
}

/**
 * Hardcoded list of common competitor brands in steel/manufacturing industry
 * TODO: Make this configurable per brand profile in future
 */
const COMMON_COMPETITORS = [
  'AcelorMittal',
  'Nucor',
  'Steel Dynamics',
  'U.S. Steel',
  'United States Steel',
  'Commercial Metals',
  'CMC Steel',
  'ArcelorMittal',
  'POSCO',
  'Nippon Steel',
  'JFE Steel',
  'Baosteel',
  'Tata Steel',
  'ThyssenKrupp',
  'Gerdau',
];

/**
 * PII detection patterns
 */
const PII_PATTERNS = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
};

/**
 * Detect PII in text content
 * @returns true if NO PII found (safe), false if PII detected (unsafe)
 */
function detectPII(text: string): boolean {
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      logger.warn(
        {
          piiType: type,
          matchCount: matches.length,
        },
        'PII detected in content',
      );
      return false;
    }
  }
  return true;
}

/**
 * Detect prohibited words from brand profile
 * @returns Array of prohibited words found (case-insensitive)
 */
function detectProhibitedWords(text: string, prohibitedWords: string[]): string[] {
  if (!prohibitedWords || prohibitedWords.length === 0) {
    return [];
  }

  const textLower = text.toLowerCase();
  const found: string[] = [];

  for (const word of prohibitedWords) {
    const wordLower = word.toLowerCase();
    // Use word boundary regex for exact word matching
    const regex = new RegExp(`\\b${wordLower}\\b`, 'i');
    if (regex.test(textLower)) {
      found.push(word);
    }
  }

  return found;
}

/**
 * Detect competitor brand mentions
 * @returns Array of competitor brands found (case-insensitive)
 */
function detectCompetitors(text: string): string[] {
  const textLower = text.toLowerCase();
  const found: string[] = [];

  for (const competitor of COMMON_COMPETITORS) {
    const competitorLower = competitor.toLowerCase();
    // Use word boundary regex for exact word matching
    const regex = new RegExp(`\\b${competitorLower}\\b`, 'i');
    if (regex.test(textLower)) {
      found.push(competitor);
    }
  }

  return found;
}

/**
 * Check content with Gemini Safety API
 * @returns Object with safety category results (true = safe, false = unsafe)
 */
async function checkGeminiSafety(
  caption: string,
  imageUrl?: string,
): Promise<{
  hateSpeech: boolean;
  violence: boolean;
  sexualContent: boolean;
  harassment: boolean;
}> {
  try {
    // Build contents array
    const parts: Array<{ text?: string; fileData?: { mimeType: string; fileUri: string } }> = [{ text: caption }];

    // Add image if provided (for future image safety checks)
    if (imageUrl) {
      // Note: Image safety checks require file upload to Gemini File API first
      // For now, we only check text content
      logger.info({ imageUrl }, 'Image URL provided but not yet implemented for safety checks');
    }

    const response = await generateContentWithRetry(
      {
        model: SAFETY_MODEL,
        contents: [
          {
            role: 'user',
            parts,
          },
        ],
        config: {
          // Configure strict safety settings
          safetySettings: [
            {
              method: HarmBlockMethod.SEVERITY,
              category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              method: HarmBlockMethod.SEVERITY,
              category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              method: HarmBlockMethod.SEVERITY,
              category: HarmCategory.HARM_CATEGORY_HARASSMENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
            {
              method: HarmBlockMethod.SEVERITY,
              category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
              threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
            },
          ],
          maxOutputTokens: 10, // We don't care about the output, just the safety ratings
          temperature: 0,
        },
      },
      { operation: 'content_safety_check' },
    );

    // Check safety ratings
    // If content was blocked, the response will indicate which categories triggered
    const safetyRatings = response.candidates?.[0]?.safetyRatings || [];

    // Initialize all as safe
    let hateSpeech = true;
    let violence = true;
    let sexualContent = true;
    let harassment = true;

    // Check each safety rating
    for (const rating of safetyRatings) {
      const isUnsafe = rating.probability === 'HIGH' || rating.probability === 'MEDIUM';

      switch (rating.category) {
        case HarmCategory.HARM_CATEGORY_HATE_SPEECH:
          hateSpeech = !isUnsafe;
          break;
        case HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT:
          violence = !isUnsafe;
          break;
        case HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT:
          sexualContent = !isUnsafe;
          break;
        case HarmCategory.HARM_CATEGORY_HARASSMENT:
          harassment = !isUnsafe;
          break;
      }
    }

    // Also check if content was blocked entirely
    const wasBlocked = response.candidates?.[0]?.finishReason === 'SAFETY';
    if (wasBlocked) {
      logger.warn({ safetyRatings }, 'Content was blocked by Gemini Safety API');
      // If blocked, mark all as unsafe to be conservative
      return {
        hateSpeech: false,
        violence: false,
        sexualContent: false,
        harassment: false,
      };
    }

    return { hateSpeech, violence, sexualContent, harassment };
  } catch (error: any) {
    // FAIL-CLOSED: If Gemini Safety API fails, default to BLOCK (all flags false = unsafe).
    // This prevents unsafe content from passing through on API failures.
    // Set SAFETY_FAIL_OPEN=true in non-production environments to bypass this.
    const failOpen = process.env['SAFETY_FAIL_OPEN'] === 'true' && process.env['NODE_ENV'] !== 'production';

    logger.warn(
      {
        err: error,
        errorMessage: error?.message,
        failOpen,
      },
      `Gemini Safety API failed, defaulting to ${failOpen ? 'PASS (dev override)' : 'BLOCK (fail-closed)'}`,
    );

    return {
      hateSpeech: failOpen,
      violence: failOpen,
      sexualContent: failOpen,
      harassment: failOpen,
    };
  }
}

/**
 * Calculate brand safety score (0-100)
 * 100 = perfect (all checks passed)
 * 0 = multiple critical issues
 */
function calculateBrandSafetyScore(checks: {
  hateSpeech: boolean;
  violence: boolean;
  sexualContent: boolean;
  harassment: boolean;
  piiDetection: boolean;
  prohibitedWords: string[];
  competitorMentions: string[];
}): number {
  let score = 100;

  // Critical failures (instant fail)
  if (!checks.hateSpeech) score -= 100;
  if (!checks.violence) score -= 100;
  if (!checks.sexualContent) score -= 100;
  if (!checks.harassment) score -= 100;

  // Major issues
  if (!checks.piiDetection) score -= 50;

  // Minor issues
  if (checks.prohibitedWords.length > 0) {
    score -= 10 * checks.prohibitedWords.length;
  }

  if (checks.competitorMentions.length > 0) {
    score -= 20 * checks.competitorMentions.length;
  }

  // Ensure score doesn't go below 0
  return Math.max(0, score);
}

/**
 * Main function: Check content safety with multi-layer validation
 *
 * @param params - Content to check (caption, optional imageUrl, userId)
 * @returns Comprehensive safety check results
 *
 * Usage:
 * ```typescript
 * const safetyChecks = await checkContentSafety({
 *   caption: "Check out our new product!",
 *   userId: "user-123",
 * });
 *
 * if (safetyChecks.brandSafetyScore < 80) {
 *   // Flag for manual review
 * }
 * ```
 */
export async function checkContentSafety(params: CheckSafetyParams): Promise<SafetyChecks> {
  const { caption, imageUrl, userId } = params;

  logger.info(
    {
      userId,
      captionLength: caption.length,
      hasImage: !!imageUrl,
    },
    'Starting content safety check',
  );

  // STEP 1: Gemini Safety API check
  const geminiChecks = await checkGeminiSafety(caption, imageUrl);

  // STEP 2: PII detection
  const piiDetection = detectPII(caption);

  // STEP 3: Fetch brand profile for prohibited words
  let prohibitedWords: string[] = [];
  try {
    const brandProfile = await storage.getBrandProfileByUserId(userId);
    if (brandProfile?.voice && typeof brandProfile.voice === 'object') {
      const voice = brandProfile.voice as { wordsToAvoid?: string[] };
      prohibitedWords = voice.wordsToAvoid || [];
    }
  } catch (error: any) {
    logger.warn(
      {
        err: error,
        userId,
      },
      'Failed to fetch brand profile for prohibited words check',
    );
  }

  // STEP 4: Prohibited words detection
  const prohibitedWordsFound = detectProhibitedWords(caption, prohibitedWords);

  // STEP 5: Competitor detection
  const competitorMentions = detectCompetitors(caption);

  // STEP 6: Calculate brand safety score
  const brandSafetyScore = calculateBrandSafetyScore({
    ...geminiChecks,
    piiDetection,
    prohibitedWords: prohibitedWordsFound,
    competitorMentions,
  });

  const result: SafetyChecks = {
    hateSpeech: geminiChecks.hateSpeech,
    violence: geminiChecks.violence,
    sexualContent: geminiChecks.sexualContent,
    piiDetection,
    prohibitedWords: prohibitedWordsFound,
    competitorMentions,
    brandSafetyScore,
  };

  logger.info(
    {
      userId,
      result,
    },
    'Content safety check completed',
  );

  return result;
}
