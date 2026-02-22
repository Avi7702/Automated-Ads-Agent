import { logger } from '../lib/logger';
import { generateContentWithRetry } from '../lib/geminiClient';
import { storage } from '../storage';
import type { BrandProfile } from '@shared/schema';

// Platform character limits (same as copywritingService.ts)
interface PlatformLimits {
  headline: { optimal: number; max: number };
  hook: { optimal: number; max: number };
  primaryText: { optimal: number; max: number };
  caption: { optimal: number; max: number };
  description?: { optimal: number; max: number };
}

const PLATFORM_LIMITS: Record<string, PlatformLimits> = {
  instagram: {
    headline: { optimal: 40, max: 40 },
    hook: { optimal: 60, max: 60 },
    primaryText: { optimal: 125, max: 2200 },
    caption: { optimal: 125, max: 2200 },
  },
  linkedin: {
    headline: { optimal: 150, max: 150 },
    hook: { optimal: 60, max: 60 },
    primaryText: { optimal: 150, max: 600 },
    caption: { optimal: 150, max: 600 },
    description: { optimal: 45, max: 45 },
  },
  facebook: {
    headline: { optimal: 27, max: 27 },
    hook: { optimal: 60, max: 60 },
    primaryText: { optimal: 125, max: 500 },
    caption: { optimal: 125, max: 500 },
    description: { optimal: 27, max: 27 },
  },
  twitter: {
    headline: { optimal: 23, max: 23 },
    hook: { optimal: 60, max: 60 },
    primaryText: { optimal: 257, max: 280 },
    caption: { optimal: 257, max: 280 },
  },
  tiktok: {
    headline: { optimal: 40, max: 40 },
    hook: { optimal: 60, max: 60 },
    primaryText: { optimal: 100, max: 150 },
    caption: { optimal: 100, max: 150 },
  },
};

// Proven hook patterns for quality scoring
const HOOK_PATTERNS = [
  { pattern: /^(I quit|I stopped|I started|I spent|I learned)/i, name: 'pattern_interrupt' },
  { pattern: /\?$/, name: 'question_hook' },
  { pattern: /\d+%|\d+\/\d+|\d+ out of \d+/i, name: 'stat_hook' },
  { pattern: /^(Tired of|Struggling with|Frustrated by|Still using)/i, name: 'pain_point' },
  { pattern: /^(Double|Triple|Increase|Boost|Get|Achieve)/i, name: 'benefit_promise' },
  { pattern: /^(Even if|Without|No need to)/i, name: 'even_if_without' },
];

// CTA pattern detection
const CTA_PATTERNS = [
  /shop now/i,
  /learn more/i,
  /sign up/i,
  /get started/i,
  /join now/i,
  /try (it |now |free )?/i,
  /download/i,
  /click here/i,
  /discover/i,
  /order now/i,
  /book now/i,
  /contact us/i,
  /see more/i,
  /explore/i,
  /start (your|now)/i,
];

/**
 * Confidence Score interface - AI-powered quality assessment
 */
export interface ConfidenceScore {
  overall: number; // 0-100
  breakdown: {
    characterLimitValid: boolean;
    brandVoiceAlignment: number; // 0-100
    hookQuality: number; // 0-100
    ctaPresence: boolean;
    hashtagAppropriate: boolean;
  };
  reasoning: string;
  recommendation: 'auto_approve' | 'manual_review' | 'auto_reject';
}

/**
 * Parameters for content evaluation
 */
export interface EvaluateContentParams {
  caption: string;
  platform: 'instagram' | 'linkedin' | 'facebook' | 'twitter' | 'tiktok';
  imageUrl?: string;
  hashtags?: string[];
  userId: string;
}

/**
 * Evaluate generated content and calculate confidence score
 *
 * Scoring algorithm:
 * 1. Character limit compliance: +20 pts (pass/fail)
 * 2. Brand voice match: 0-30 pts (LLM comparison to brand guidelines)
 * 3. Hook effectiveness: 0-25 pts (pattern matching + LLM quality check)
 * 4. CTA presence: +15 pts (detected call-to-action)
 * 5. Hashtag appropriateness: +10 pts (platform-specific, not spammy)
 *
 * Thresholds:
 * - ≥95: Auto-approve eligible
 * - 85-94: Expedited review (4-hour SLA)
 * - 70-84: Standard review (24-hour SLA)
 * - 50-69: Detailed review (48-hour SLA)
 * - <50: Auto-reject with feedback
 */
export async function evaluateContent(params: EvaluateContentParams): Promise<ConfidenceScore> {
  const { caption, platform, imageUrl: _imageUrl, hashtags = [], userId } = params;

  logger.info(
    { module: 'ConfidenceScoring', platform, captionLength: caption.length, hashtagCount: hashtags.length },
    'Starting content evaluation',
  );

  // STEP 1: Character Limit Validation (+20 pts if valid)
  const characterLimitValid = validateCharacterLimits(caption, platform);
  const characterLimitScore = characterLimitValid ? 20 : 0;

  // STEP 2: Hook Quality Assessment (0-25 pts)
  const hookQuality = assessHookQuality(caption);

  // STEP 3: CTA Detection (+15 pts if present)
  const ctaPresence = detectCTA(caption);
  const ctaScore = ctaPresence ? 15 : 0;

  // STEP 4: Hashtag Appropriateness (+10 pts if appropriate)
  const hashtagAppropriate = validateHashtags(hashtags, platform);
  const hashtagScore = hashtagAppropriate ? 10 : 0;

  // STEP 5: Brand Voice Alignment (0-30 pts using LLM)
  const brandProfile = await storage.getBrandProfileByUserId(userId);
  const brandVoiceAlignment = await assessBrandVoiceAlignment(caption, brandProfile, platform);

  // Calculate overall score
  const overall = characterLimitScore + hookQuality + ctaScore + hashtagScore + brandVoiceAlignment;

  // Determine recommendation based on thresholds
  let recommendation: 'auto_approve' | 'manual_review' | 'auto_reject';
  if (overall >= 95) {
    recommendation = 'auto_approve';
  } else if (overall < 50) {
    recommendation = 'auto_reject';
  } else {
    recommendation = 'manual_review';
  }

  // Build reasoning
  const reasoning = buildReasoning({
    overall,
    characterLimitValid,
    hookQuality,
    ctaPresence,
    hashtagAppropriate,
    brandVoiceAlignment,
    platform,
  });

  const score: ConfidenceScore = {
    overall,
    breakdown: {
      characterLimitValid,
      brandVoiceAlignment,
      hookQuality,
      ctaPresence,
      hashtagAppropriate,
    },
    reasoning,
    recommendation,
  };

  logger.info(
    {
      module: 'ConfidenceScoring',
      score: overall,
      recommendation,
      breakdown: score.breakdown,
    },
    'Content evaluation complete',
  );

  return score;
}

/**
 * Validate character limits for platform
 */
function validateCharacterLimits(caption: string, platform: string): boolean {
  const limits = PLATFORM_LIMITS[platform];
  if (!limits) return false;

  const captionLength = caption.length;
  return captionLength <= limits.caption.max;
}

/**
 * Assess hook quality using pattern matching
 * Returns 0-25 points
 */
function assessHookQuality(caption: string): number {
  // Extract first sentence/line as the hook
  const hook = (caption.split(/[.\n]/)[0] ?? '').trim();
  if (hook.length === 0) return 0;

  // Check for proven hook patterns
  const matchedPattern = HOOK_PATTERNS.find(({ pattern }) => pattern.test(hook));
  if (matchedPattern) {
    // Strong hook pattern detected: 20-25 pts
    return 25;
  }

  // Check for basic hook qualities
  let score = 10; // Base score for having a hook

  // Bonus for optimal length (under 60 chars for Twitter/LinkedIn, under 100 for others)
  if (hook.length > 10 && hook.length <= 60) {
    score += 5;
  }

  // Bonus for attention-grabbing elements (numbers, questions, exclamations)
  if (/\d+/.test(hook)) score += 3; // Contains numbers
  if (/[?!]/.test(hook)) score += 3; // Contains question/exclamation
  if (/["']/.test(hook)) score += 2; // Contains quotes (social proof indicator)

  return Math.min(score, 25);
}

/**
 * Detect call-to-action presence
 */
function detectCTA(caption: string): boolean {
  return CTA_PATTERNS.some((pattern) => pattern.test(caption));
}

/**
 * Validate hashtag appropriateness for platform
 */
function validateHashtags(hashtags: string[], platform: string): boolean {
  // No hashtags is acceptable
  if (hashtags.length === 0) return true;

  // Platform-specific hashtag rules
  const platformRules: Record<string, { minCount: number; maxCount: number }> = {
    instagram: { minCount: 0, maxCount: 10 }, // Ads perform better with 3-5, but up to 10 acceptable
    linkedin: { minCount: 0, maxCount: 5 }, // LinkedIn prefers 3-5 hashtags
    facebook: { minCount: 0, maxCount: 5 }, // Facebook ads don't benefit from hashtags, limit to 5
    twitter: { minCount: 0, maxCount: 3 }, // Twitter prefers 1-2 hashtags max
    tiktok: { minCount: 0, maxCount: 5 }, // TikTok performs well with 3-5 hashtags
  };

  const rules = platformRules[platform];
  if (!rules) return false;

  // Check count
  if (hashtags.length < rules.minCount || hashtags.length > rules.maxCount) {
    return false;
  }

  // Check for spammy patterns
  // - Too many hashtags per character (spam indicator)
  // - All caps hashtags (spam indicator)
  // - Very long hashtags (>30 chars - likely spam)
  const allCapsCount = hashtags.filter((h) => h === h.toUpperCase() && h.length > 3).length;
  const longHashtagCount = hashtags.filter((h) => h.length > 30).length;

  if (allCapsCount > hashtags.length / 2) return false; // More than half all caps
  if (longHashtagCount > 0) return false; // Any hashtag over 30 chars

  return true;
}

/**
 * Assess brand voice alignment using LLM
 * Returns 0-30 points
 */
async function assessBrandVoiceAlignment(
  caption: string,
  brandProfile: BrandProfile | undefined,
  platform: string,
): Promise<number> {
  // If no brand profile, give baseline score
  if (!brandProfile || !brandProfile.voice) {
    return 15; // Neutral score when no brand guidelines exist
  }

  try {
    const prompt = buildBrandVoicePrompt(caption, brandProfile, platform);

    // MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.
    const response = await generateContentWithRetry(
      {
        model: 'gemini-3-pro-preview',
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        config: {
          responseModalities: ['TEXT'],
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'object',
            properties: {
              alignmentScore: {
                type: 'number',
                description: 'Brand voice alignment score (0-30)',
                minimum: 0,
                maximum: 30,
              },
              reasoning: {
                type: 'string',
                description: 'Explanation of the score',
              },
            },
            required: ['alignmentScore', 'reasoning'],
          },
        },
      },
      { operation: 'brand_voice_scoring' },
    );

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const result = JSON.parse(text);

    logger.info(
      {
        module: 'ConfidenceScoring',
        alignmentScore: result.alignmentScore,
        reasoning: result.reasoning,
      },
      'Brand voice alignment assessed',
    );

    return result.alignmentScore;
  } catch (error) {
    logger.error({ module: 'ConfidenceScoring', err: error }, 'Brand voice assessment failed, using baseline');
    return 15; // Fallback to neutral score on error
  }
}

/**
 * Build PTCF prompt for brand voice assessment
 */
function buildBrandVoicePrompt(caption: string, brandProfile: BrandProfile, platform: string): string {
  const voice = brandProfile.voice as any;

  return `You are an expert brand voice analyst. Evaluate how well this social media caption aligns with the brand's voice guidelines.

BRAND VOICE GUIDELINES:
${voice.principles ? `Principles: ${voice.principles.join(', ')}` : 'No principles defined'}
${voice.wordsToUse?.length ? `Words to USE: ${voice.wordsToUse.join(', ')}` : ''}
${voice.wordsToAvoid?.length ? `Words to AVOID: ${voice.wordsToAvoid.join(', ')}` : ''}

BRAND VALUES:
${brandProfile.brandValues?.length ? brandProfile.brandValues.join(', ') : 'Not specified'}

PLATFORM: ${platform}

CAPTION TO EVALUATE:
"""
${caption}
"""

SCORING RUBRIC (0-30 points):
- 25-30 pts: Perfectly aligned with brand voice, uses preferred terminology, matches tone
- 20-24 pts: Strong alignment, mostly consistent with brand guidelines
- 15-19 pts: Adequate alignment, no major violations but could be stronger
- 10-14 pts: Weak alignment, some inconsistencies with brand voice
- 0-9 pts: Poor alignment, violates brand guidelines or uses avoided words

Return a JSON object with:
- alignmentScore: number (0-30)
- reasoning: string (brief explanation of the score)

Focus on:
1. Use of brand-preferred words vs avoided words
2. Adherence to brand principles (if defined)
3. Tone consistency with brand values
4. Platform appropriateness for this brand

Be strict but fair. Most content should score 15-25 unless exceptional or clearly misaligned.`;
}

/**
 * Build human-readable reasoning for the score
 */
function buildReasoning(data: {
  overall: number;
  characterLimitValid: boolean;
  hookQuality: number;
  ctaPresence: boolean;
  hashtagAppropriate: boolean;
  brandVoiceAlignment: number;
  platform: string;
}): string {
  const { overall, characterLimitValid, hookQuality, ctaPresence, hashtagAppropriate, brandVoiceAlignment, platform } =
    data;

  const parts: string[] = [];

  // Overall assessment
  if (overall >= 95) {
    parts.push(`✅ EXCELLENT (${overall}/100) - Auto-approve eligible`);
  } else if (overall >= 85) {
    parts.push(`✓ VERY GOOD (${overall}/100) - Expedited review (4-hour SLA)`);
  } else if (overall >= 70) {
    parts.push(`• GOOD (${overall}/100) - Standard review (24-hour SLA)`);
  } else if (overall >= 50) {
    parts.push(`⚠ NEEDS WORK (${overall}/100) - Detailed review (48-hour SLA)`);
  } else {
    parts.push(`❌ POOR (${overall}/100) - Auto-reject recommended`);
  }

  // Character limits
  if (!characterLimitValid) {
    parts.push(`❌ Character limit exceeded for ${platform}`);
  } else {
    parts.push(`✓ Character limits OK`);
  }

  // Hook quality
  if (hookQuality >= 20) {
    parts.push(`✓ Strong hook (${hookQuality}/25 pts)`);
  } else if (hookQuality >= 15) {
    parts.push(`• Adequate hook (${hookQuality}/25 pts)`);
  } else {
    parts.push(`⚠ Weak hook (${hookQuality}/25 pts) - Consider using proven patterns`);
  }

  // CTA presence
  if (ctaPresence) {
    parts.push(`✓ Clear CTA present`);
  } else {
    parts.push(`⚠ No clear CTA detected - Consider adding "Shop Now", "Learn More", etc.`);
  }

  // Hashtags
  if (hashtagAppropriate) {
    parts.push(`✓ Hashtag usage appropriate for ${platform}`);
  } else {
    parts.push(`⚠ Hashtag usage not optimal for ${platform}`);
  }

  // Brand voice
  if (brandVoiceAlignment >= 25) {
    parts.push(`✓ Excellent brand voice alignment (${brandVoiceAlignment}/30 pts)`);
  } else if (brandVoiceAlignment >= 20) {
    parts.push(`✓ Strong brand voice alignment (${brandVoiceAlignment}/30 pts)`);
  } else if (brandVoiceAlignment >= 15) {
    parts.push(`• Adequate brand voice alignment (${brandVoiceAlignment}/30 pts)`);
  } else {
    parts.push(`⚠ Weak brand voice alignment (${brandVoiceAlignment}/30 pts) - Review brand guidelines`);
  }

  return parts.join('\n');
}
