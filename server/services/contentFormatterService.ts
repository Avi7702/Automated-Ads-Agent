/**
 * Content Formatter Service
 *
 * Handles platform-specific content formatting for social media posting.
 * Validates character limits, formats hashtags, handles links, and optimizes content.
 *
 * Usage:
 *   import { formatContentForPlatform } from './services/contentFormatterService';
 *   const formatted = await formatContentForPlatform('My caption', ['marketing'], 'instagram');
 */

import { logger } from '../lib/logger';
import { getPlatformSpecs, type PlatformSpecs } from './platformSpecsService';

/**
 * Formatted content result with validation
 */
export interface FormattedContent {
  caption: string;
  hashtags: string[];
  characterCount: number;
  hashtagCount: number;
  warnings: string[];
  errors: string[];
  isValid: boolean;

  // Image requirements for this platform
  imageRequirements?: {
    aspectRatio: string;
    minWidth: number;
    minHeight: number;
    formats: string[];
    maxSizeMB: number;
  };

  // Metadata
  platform: string;
  truncated: boolean;
  emojiCount: number;
  linkHandling?: {
    linksDetected: number;
    linksRemoved: number;
    message?: string;
  };
}

/**
 * Content type for specialized formatting
 */
export type ContentType = 'feed' | 'story' | 'reel' | 'short' | 'video';

/**
 * Format content for a specific platform
 *
 * @param caption - Original caption text
 * @param hashtags - Array of hashtags (with or without # symbol)
 * @param platform - Platform identifier (e.g., 'instagram', 'linkedin')
 * @param contentType - Optional content type for specialized handling
 * @returns Formatted content with validation results
 */
export async function formatContentForPlatform(
  caption: string,
  hashtags: string[],
  platform: string,
  _contentType?: ContentType,
): Promise<FormattedContent> {
  const startTime = Date.now();

  try {
    // Get platform specs
    const specs = getPlatformSpecs(platform);
    if (!specs) {
      return createErrorResult(caption, hashtags, platform, `Platform '${platform}' not supported`);
    }

    // Initialize result
    const result: FormattedContent = {
      caption: caption,
      hashtags: [],
      characterCount: 0,
      hashtagCount: 0,
      warnings: [],
      errors: [],
      isValid: true,
      platform: platform,
      truncated: false,
      emojiCount: 0,
    };

    // Step 1: Clean and normalize input
    let processedCaption = caption.trim();
    const processedHashtags = normalizeHashtags(hashtags, specs);

    // Step 2: Emoji optimization (for professional platforms)
    if (specs.features.professionalPlatform) {
      const emojiResult = optimizeEmojis(processedCaption, specs);
      processedCaption = emojiResult.text;
      if (emojiResult.removed > 0) {
        result.warnings.push(`Removed ${emojiResult.removed} excessive emojis for professional platform`);
      }
    }

    // Step 3: Link handling
    const linkResult = handleLinks(processedCaption, specs);
    processedCaption = linkResult.text;
    result.linkHandling = linkResult.metadata;
    if (linkResult.metadata.message) {
      result.warnings.push(linkResult.metadata.message);
    }

    // Step 4: Hashtag validation and formatting
    const hashtagResult = formatHashtags(processedHashtags, specs);
    result.hashtags = hashtagResult.formatted;
    result.hashtagCount = hashtagResult.formatted.length;
    result.warnings.push(...hashtagResult.warnings);
    result.errors.push(...hashtagResult.errors);

    // Step 5: Combine caption and hashtags
    const combinedText = combineTextAndHashtags(processedCaption, result.hashtags, specs);

    // Step 6: Character limit validation and truncation
    const charLimitResult = enforceCharacterLimit(combinedText, specs);
    result.caption = charLimitResult.text;
    result.characterCount = charLimitResult.count;
    result.truncated = charLimitResult.truncated;
    if (charLimitResult.truncated) {
      result.warnings.push(`Caption truncated from ${combinedText.length} to ${specs.caption.maxLength} characters`);
    }

    // Step 7: Line break optimization
    result.caption = optimizeLineBreaks(result.caption, specs);

    // Step 8: Count emojis
    result.emojiCount = countEmojis(result.caption);

    // Step 9: Add image requirements
    result.imageRequirements = getImageRequirements(specs);

    // Step 10: Final validation
    const validation = validateContent(result, specs);
    result.errors.push(...validation.errors);
    result.warnings.push(...validation.warnings);
    result.isValid = result.errors.length === 0;

    // Log formatting
    logger.debug(
      {
        platform,
        characterCount: result.characterCount,
        hashtagCount: result.hashtagCount,
        truncated: result.truncated,
        isValid: result.isValid,
        duration: Date.now() - startTime,
      },
      'Content formatted for platform',
    );

    return result;
  } catch (error) {
    logger.error({ error, platform, caption }, 'Content formatting failed');
    return createErrorResult(caption, hashtags, platform, 'Formatting failed due to internal error');
  }
}

/**
 * Normalize hashtags: add/remove # symbol based on platform
 */
function normalizeHashtags(hashtags: string[], specs: PlatformSpecs): string[] {
  return hashtags
    .map((tag) => {
      const cleaned = tag.trim().replace(/^#+/, ''); // Remove existing #

      if (specs.hashtags.requiresSymbol) {
        return `#${cleaned}`;
      } else {
        return cleaned;
      }
    })
    .filter((tag) => tag.length > (specs.hashtags.requiresSymbol ? 1 : 0)); // Remove empty
}

/**
 * Optimize emojis for professional platforms
 */
function optimizeEmojis(text: string, specs: PlatformSpecs): { text: string; removed: number } {
  if (!specs.features.professionalPlatform) {
    return { text, removed: 0 };
  }

  // LinkedIn/professional: max 3 emojis total
  const emojiRegex = new RegExp('[\\u{1F300}-\\u{1F9FF}]|[\\u{2600}-\\u{26FF}]|[\\u{2700}-\\u{27BF}]', 'gu');
  const emojis = text.match(emojiRegex) || [];

  if (emojis.length <= 3) {
    return { text, removed: 0 };
  }

  // Remove excessive emojis (keep first 3)
  let count = 0;
  const optimized = text.replace(emojiRegex, (match) => {
    count++;
    return count <= 3 ? match : '';
  });

  return { text: optimized, removed: emojis.length - 3 };
}

/**
 * Handle links based on platform capabilities
 */
function handleLinks(
  text: string,
  specs: PlatformSpecs,
): {
  text: string;
  metadata: {
    linksDetected: number;
    linksRemoved: number;
    message?: string;
  };
} {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const links = text.match(urlRegex) || [];
  const linksDetected = links.length;

  if (linksDetected === 0) {
    return {
      text,
      metadata: { linksDetected: 0, linksRemoved: 0 },
    };
  }

  // Platform supports links
  if (specs.features.supportsLinks) {
    let message: string | undefined;

    if (specs.features.linkPosition === 'bio') {
      // Instagram: suggest moving to bio
      const textWithoutLinks = text.replace(urlRegex, '').trim();
      message = `Links not clickable in captions. Add "Link in bio" message instead.`;
      return {
        text: textWithoutLinks + '\n\n🔗 Link in bio',
        metadata: { linksDetected, linksRemoved: linksDetected, message },
      };
    } else if (specs.features.linkPosition === 'firstComment') {
      // Some platforms: suggest first comment
      const textWithoutLinks = text.replace(urlRegex, '').trim();
      message = `Links moved to first comment for better engagement.`;
      return {
        text: textWithoutLinks,
        metadata: { linksDetected, linksRemoved: linksDetected, message },
      };
    }

    // Links allowed in caption (LinkedIn, Facebook, etc.)
    return {
      text,
      metadata: { linksDetected, linksRemoved: 0 },
    };
  }

  // Platform doesn't support links (TikTok)
  const textWithoutLinks = text.replace(urlRegex, '').trim();
  return {
    text: textWithoutLinks,
    metadata: {
      linksDetected,
      linksRemoved: linksDetected,
      message: `Platform doesn't support clickable links. Links removed.`,
    },
  };
}

/**
 * Format hashtags according to platform rules
 */
function formatHashtags(
  hashtags: string[],
  specs: PlatformSpecs,
): {
  formatted: string[];
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Validate hashtag count
  if (hashtags.length > specs.hashtags.max) {
    warnings.push(
      `${hashtags.length} hashtags exceeds platform limit of ${specs.hashtags.max}. Using first ${specs.hashtags.max}.`,
    );
    hashtags = hashtags.slice(0, specs.hashtags.max);
  }

  if (hashtags.length < specs.hashtags.min) {
    errors.push(`Platform requires at least ${specs.hashtags.min} hashtags, but ${hashtags.length} provided.`);
  }

  // Validate hashtag format
  const formatted = hashtags
    .map((tag) => {
      // Remove spaces
      const noSpaces = tag.replace(/\s+/g, '');

      // Validate characters (alphanumeric + underscore)
      if (!/^#?[a-zA-Z0-9_]+$/.test(noSpaces)) {
        warnings.push(`Invalid hashtag format: "${tag}" (special characters removed)`);
        return noSpaces.replace(/[^a-zA-Z0-9_#]/g, '');
      }

      return noSpaces;
    })
    .filter((tag) => tag.length > (specs.hashtags.requiresSymbol ? 1 : 0));

  return { formatted, warnings, errors };
}

/**
 * Combine text and hashtags based on platform position preference
 */
function combineTextAndHashtags(text: string, hashtags: string[], specs: PlatformSpecs): string {
  if (hashtags.length === 0) {
    return text;
  }

  const hashtagString = hashtags.join(' ');

  switch (specs.hashtags.position) {
    case 'inline':
      // Twitter/TikTok: hashtags within the text is common
      return `${text} ${hashtagString}`;

    case 'end':
      // Instagram/LinkedIn: hashtags at the end after line breaks
      return `${text}\n\n${hashtagString}`;

    case 'both':
      // Flexible: allow both inline and end
      return `${text}\n\n${hashtagString}`;

    case 'none':
      // Platform doesn't use hashtags
      return text;

    default:
      return `${text}\n\n${hashtagString}`;
  }
}

/**
 * Enforce character limit with smart truncation
 */
function enforceCharacterLimit(
  text: string,
  specs: PlatformSpecs,
): {
  text: string;
  count: number;
  truncated: boolean;
} {
  const count = countCharacters(text);

  if (count <= specs.caption.maxLength) {
    return { text, count, truncated: false };
  }

  // Truncate with ellipsis
  const maxChars = specs.caption.maxLength - 3; // Leave room for "..."
  let truncated = text.substring(0, maxChars);

  // Try to break at word boundary
  const lastSpace = truncated.lastIndexOf(' ');
  if (lastSpace > maxChars * 0.8) {
    // Only break at word if we're keeping at least 80% of text
    truncated = truncated.substring(0, lastSpace);
  }

  truncated += '...';

  return {
    text: truncated,
    count: countCharacters(truncated),
    truncated: true,
  };
}

/**
 * Optimize line breaks for readability
 */
function optimizeLineBreaks(text: string, specs: PlatformSpecs): string {
  // Remove excessive line breaks (max 2 consecutive)
  let optimized = text.replace(/\n{3,}/g, '\n\n');

  // Platform-specific optimizations
  if (specs.platform === 'twitter') {
    // Twitter: compact formatting to save characters
    optimized = optimized.replace(/\n{2,}/g, '\n');
  }

  // Trim trailing whitespace
  optimized = optimized.trim();

  return optimized;
}

/**
 * Count characters (handles emojis correctly)
 */
function countCharacters(text: string): number {
  // Use Array.from to properly count multi-byte characters (emojis)
  return Array.from(text).length;
}

/**
 * Count emojis in text
 */
function countEmojis(text: string): number {
  const emojiRegex = new RegExp('[\\u{1F300}-\\u{1F9FF}]|[\\u{2600}-\\u{26FF}]|[\\u{2700}-\\u{27BF}]', 'gu');
  const emojis = text.match(emojiRegex) || [];
  return emojis.length;
}

/**
 * Get image requirements for platform
 */
function getImageRequirements(specs: PlatformSpecs) {
  const recommended = specs.image.aspectRatios.find((ar) => ar.recommended);

  return {
    aspectRatio: recommended?.ratio || specs.image.aspectRatios[0]?.ratio || '1:1',
    minWidth: specs.image.minWidth,
    minHeight: specs.image.minHeight,
    formats: specs.image.formats,
    maxSizeMB: specs.image.maxSizeMB,
  };
}

/**
 * Validate final content
 */
function validateContent(
  result: FormattedContent,
  specs: PlatformSpecs,
): {
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Character count validation
  if (result.characterCount > specs.caption.maxLength) {
    errors.push(`Character count ${result.characterCount} exceeds platform limit ${specs.caption.maxLength}`);
  }

  if (result.characterCount < specs.caption.minLength) {
    errors.push(`Character count ${result.characterCount} below platform minimum ${specs.caption.minLength}`);
  }

  // Truncation warning
  if (specs.caption.truncationPoint && result.characterCount > specs.caption.truncationPoint) {
    warnings.push(
      `Caption will be truncated in feed at ${specs.caption.truncationPoint} characters (current: ${result.characterCount})`,
    );
  }

  // Hashtag validation
  if (result.hashtagCount > specs.hashtags.max) {
    errors.push(`Hashtag count ${result.hashtagCount} exceeds platform limit ${specs.hashtags.max}`);
  }

  if (result.hashtagCount < specs.hashtags.min && specs.hashtags.min > 0) {
    errors.push(`Platform requires at least ${specs.hashtags.min} hashtags`);
  }

  // Recommended length warning
  if (result.characterCount > specs.caption.recommended * 1.5) {
    warnings.push(
      `Caption is ${result.characterCount} characters. Platform recommends ${specs.caption.recommended} for optimal engagement.`,
    );
  }

  return { errors, warnings };
}

/**
 * Create error result
 */
function createErrorResult(
  caption: string,
  hashtags: string[],
  platform: string,
  errorMessage: string,
): FormattedContent {
  return {
    caption: caption,
    hashtags: hashtags,
    characterCount: caption.length,
    hashtagCount: hashtags.length,
    warnings: [],
    errors: [errorMessage],
    isValid: false,
    platform: platform,
    truncated: false,
    emojiCount: 0,
  };
}

/**
 * Batch format content for multiple platforms
 *
 * @param caption - Original caption text
 * @param hashtags - Array of hashtags
 * @param platforms - Array of platform identifiers
 * @returns Map of platform to formatted content
 */
export async function formatContentForMultiplePlatforms(
  caption: string,
  hashtags: string[],
  platforms: string[],
): Promise<Record<string, FormattedContent>> {
  const results: Record<string, FormattedContent> = {};

  // Process all platforms in parallel
  const formatPromises = platforms.map(async (platform) => {
    const formatted = await formatContentForPlatform(caption, hashtags, platform);
    return { platform, formatted };
  });

  const formattedResults = await Promise.all(formatPromises);

  // Build result object
  formattedResults.forEach(({ platform, formatted }) => {
    results[platform] = formatted;
  });

  logger.info(
    {
      platforms,
      totalResults: Object.keys(results).length,
    },
    'Batch content formatting completed',
  );

  return results;
}

/**
 * Generate platform-optimized caption suggestions
 *
 * @param originalCaption - Original caption text
 * @param platform - Target platform
 * @returns Optimized caption suggestions
 */
export function generateCaptionSuggestions(originalCaption: string, platform: string): string[] {
  const specs = getPlatformSpecs(platform);
  if (!specs) return [originalCaption];

  const suggestions: string[] = [];

  // Original
  suggestions.push(originalCaption);

  // Truncated to recommended length
  if (originalCaption.length > specs.caption.recommended) {
    const truncated = originalCaption.substring(0, specs.caption.recommended - 3) + '...';
    suggestions.push(truncated);
  }

  // Truncated to "See more" point
  if (specs.caption.truncationPoint && originalCaption.length > specs.caption.truncationPoint) {
    const previewLength = specs.caption.truncationPoint - 3;
    const preview = originalCaption.substring(0, previewLength) + '...';
    suggestions.push(preview);
  }

  return [...new Set(suggestions)]; // Remove duplicates
}
