/**
 * ContentFormatterService Tests
 *
 * Tests platform-specific content formatting:
 * - formatContentForPlatform (main function)
 * - formatContentForMultiplePlatforms (batch)
 * - generateCaptionSuggestions (caption optimization)
 *
 * Covers: happy paths, edge cases, platform-specific behavior, error handling
 */

// Mock logger before imports
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  formatContentForPlatform,
  formatContentForMultiplePlatforms,
  generateCaptionSuggestions,
} from '../services/contentFormatterService';

// ============================================
// formatContentForPlatform
// ============================================

describe('formatContentForPlatform', () => {
  describe('happy path - Instagram', () => {
    it('should format a basic caption with hashtags for Instagram', async () => {
      const result = await formatContentForPlatform(
        'Check out our new product!',
        ['marketing', 'product'],
        'instagram',
      );

      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('instagram');
      expect(result.caption).toContain('Check out our new product!');
      expect(result.hashtags).toEqual(['#marketing', '#product']);
      expect(result.hashtagCount).toBe(2);
      expect(result.truncated).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should add # symbol to hashtags for Instagram', async () => {
      const result = await formatContentForPlatform('Caption here', ['noprefix', '#withprefix'], 'instagram');

      expect(result.hashtags).toEqual(['#noprefix', '#withprefix']);
    });

    it('should place hashtags at end (separated by line breaks) for Instagram', async () => {
      const result = await formatContentForPlatform('My caption', ['tag1'], 'instagram');

      // Instagram uses 'end' position: text\n\nhashtags
      expect(result.caption).toContain('My caption');
      expect(result.caption).toContain('#tag1');
    });

    it('should remove links for Instagram (links not clickable in captions)', async () => {
      const result = await formatContentForPlatform('Visit https://example.com for more info', [], 'instagram');

      // Instagram supportsLinks=false, so links are stripped
      expect(result.caption).not.toContain('https://example.com');
      expect(result.linkHandling).toBeDefined();
      expect(result.linkHandling?.linksDetected).toBe(1);
      expect(result.linkHandling?.linksRemoved).toBe(1);
    });

    it('should return image requirements for Instagram', async () => {
      const result = await formatContentForPlatform('test', [], 'instagram');

      expect(result.imageRequirements).toBeDefined();
      expect(result.imageRequirements?.formats).toContain('jpg');
      expect(result.imageRequirements?.formats).toContain('png');
    });
  });

  describe('happy path - LinkedIn (professional platform)', () => {
    it('should format content for LinkedIn', async () => {
      const result = await formatContentForPlatform(
        'Excited to share our latest industry insights.',
        ['leadership', 'business'],
        'linkedin',
      );

      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('linkedin');
      expect(result.hashtags).toEqual(['#leadership', '#business']);
    });

    it('should optimize emojis for professional platform (LinkedIn)', async () => {
      // LinkedIn is professional - max 3 emojis
      const captionWithManyEmojis = 'Great news \u{1F389}\u{1F389}\u{1F389}\u{1F389}\u{1F389} everyone!';
      const result = await formatContentForPlatform(captionWithManyEmojis, [], 'linkedin');

      // Should have removed excessive emojis
      expect(result.warnings.some((w) => w.includes('emojis'))).toBe(true);
    });

    it('should allow links in LinkedIn captions', async () => {
      const result = await formatContentForPlatform('Read our blog: https://example.com/blog', [], 'linkedin');

      expect(result.caption).toContain('https://example.com/blog');
      expect(result.linkHandling?.linksDetected).toBe(1);
      expect(result.linkHandling?.linksRemoved).toBe(0);
    });
  });

  describe('happy path - Twitter', () => {
    it('should format content for Twitter with inline hashtags', async () => {
      const result = await formatContentForPlatform('Short tweet here.', ['trending'], 'twitter');

      expect(result.isValid).toBe(true);
      expect(result.platform).toBe('twitter');
      // Twitter uses inline position: text + space + hashtags
      expect(result.caption).toContain('Short tweet here.');
      expect(result.caption).toContain('#trending');
    });

    it('should compact line breaks for Twitter', async () => {
      const result = await formatContentForPlatform('Line 1\n\n\nLine 2', [], 'twitter');

      // Twitter optimizes line breaks (max 1)
      expect(result.caption).not.toContain('\n\n');
    });
  });

  describe('happy path - TikTok', () => {
    it('should remove links for TikTok (no clickable links)', async () => {
      const result = await formatContentForPlatform('Check this out https://example.com', ['fyp'], 'tiktok');

      expect(result.caption).not.toContain('https://example.com');
      expect(result.linkHandling?.linksDetected).toBe(1);
      expect(result.linkHandling?.linksRemoved).toBe(1);
    });
  });

  describe('character limit enforcement', () => {
    it('should truncate content exceeding character limit (Twitter 280)', async () => {
      const longCaption = 'A'.repeat(300);
      const result = await formatContentForPlatform(longCaption, [], 'twitter');

      expect(result.truncated).toBe(true);
      expect(result.characterCount).toBeLessThanOrEqual(280);
      expect(result.caption).toContain('...');
      expect(result.warnings.some((w) => w.includes('truncated'))).toBe(true);
    });

    it('should not truncate content within limit', async () => {
      const result = await formatContentForPlatform('Short text', [], 'instagram');

      expect(result.truncated).toBe(false);
    });
  });

  describe('hashtag validation', () => {
    it('should limit hashtags to platform maximum', async () => {
      // Twitter max is 2
      const manyTags = Array.from({ length: 10 }, (_, i) => `tag${i}`);
      const result = await formatContentForPlatform('Tweet', manyTags, 'twitter');

      expect(result.hashtagCount).toBeLessThanOrEqual(2);
      expect(result.warnings.some((w) => w.includes('exceeds'))).toBe(true);
    });

    it('should warn about invalid hashtag characters', async () => {
      const result = await formatContentForPlatform('Caption', ['valid', 'inv@lid!'], 'instagram');

      expect(result.warnings.some((w) => w.includes('Invalid hashtag'))).toBe(true);
    });

    it('should remove empty hashtags', async () => {
      const result = await formatContentForPlatform('Caption', ['', '  ', 'valid'], 'instagram');

      expect(result.hashtags).not.toContain('');
      expect(result.hashtags).not.toContain('#');
    });
  });

  describe('unsupported platform', () => {
    it('should return error for unknown platform', async () => {
      const result = await formatContentForPlatform('Some text', ['tag'], 'myspace');

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("'myspace' not supported");
    });
  });

  describe('edge cases', () => {
    it('should handle empty caption', async () => {
      const result = await formatContentForPlatform('', [], 'instagram');

      expect(result.caption).toBe('');
      expect(result.characterCount).toBe(0);
    });

    it('should handle caption with only whitespace', async () => {
      const result = await formatContentForPlatform('   ', [], 'instagram');

      // trim() should make it empty
      expect(result.caption.trim()).toBe('');
    });

    it('should handle no hashtags', async () => {
      const result = await formatContentForPlatform('Just text', [], 'instagram');

      expect(result.hashtagCount).toBe(0);
      expect(result.hashtags).toHaveLength(0);
    });

    it('should handle text with no links (no link handling metadata)', async () => {
      const result = await formatContentForPlatform('No links here', [], 'instagram');

      expect(result.linkHandling?.linksDetected).toBe(0);
      expect(result.linkHandling?.linksRemoved).toBe(0);
    });

    it('should remove excessive consecutive line breaks', async () => {
      const result = await formatContentForPlatform('Line 1\n\n\n\n\nLine 2', [], 'instagram');

      // Max 2 consecutive line breaks
      expect(result.caption).not.toContain('\n\n\n');
    });

    it('should count emojis correctly', async () => {
      const result = await formatContentForPlatform('Hello \u{1F600}\u{1F601}\u{1F602}', [], 'instagram');

      expect(result.emojiCount).toBe(3);
    });
  });
});

// ============================================
// formatContentForMultiplePlatforms
// ============================================

describe('formatContentForMultiplePlatforms', () => {
  it('should format content for multiple platforms in parallel', async () => {
    const results = await formatContentForMultiplePlatforms(
      'Great new product launch!',
      ['marketing'],
      ['instagram', 'linkedin', 'twitter'],
    );

    expect(Object.keys(results)).toHaveLength(3);
    expect(results['instagram']).toBeDefined();
    expect(results['linkedin']).toBeDefined();
    expect(results['twitter']).toBeDefined();

    // Each platform should have a valid result
    expect(results['instagram']?.platform).toBe('instagram');
    expect(results['linkedin']?.platform).toBe('linkedin');
    expect(results['twitter']?.platform).toBe('twitter');
  });

  it('should handle empty platforms array', async () => {
    const results = await formatContentForMultiplePlatforms('Caption', [], []);

    expect(Object.keys(results)).toHaveLength(0);
  });

  it('should handle mix of valid and unsupported platforms', async () => {
    const results = await formatContentForMultiplePlatforms('Caption', [], ['instagram', 'myspace']);

    expect(results['instagram']?.isValid).toBe(true);
    expect(results['myspace']?.isValid).toBe(false);
  });
});

// ============================================
// generateCaptionSuggestions
// ============================================

describe('generateCaptionSuggestions', () => {
  it('should return original caption as first suggestion', () => {
    const suggestions = generateCaptionSuggestions('My caption', 'instagram');

    expect(suggestions[0]).toBe('My caption');
  });

  it('should return only original if within recommended length', () => {
    const shortCaption = 'Short';
    const suggestions = generateCaptionSuggestions(shortCaption, 'instagram');

    expect(suggestions).toHaveLength(1);
    expect(suggestions[0]).toBe(shortCaption);
  });

  it('should add truncated suggestion when exceeding recommended length', () => {
    // Instagram recommended is 150
    const longCaption = 'A'.repeat(200);
    const suggestions = generateCaptionSuggestions(longCaption, 'instagram');

    expect(suggestions.length).toBeGreaterThan(1);
    // Second suggestion should be truncated to recommended length
    const truncated = suggestions[1];
    expect(truncated).toBeDefined();
    expect(truncated!.endsWith('...')).toBe(true);
  });

  it('should add "See more" truncation suggestion when applicable', () => {
    // Instagram truncation point is 125
    const longCaption = 'A'.repeat(200);
    const suggestions = generateCaptionSuggestions(longCaption, 'instagram');

    // Should have original + recommended truncation + "see more" truncation
    expect(suggestions.length).toBeGreaterThanOrEqual(2);
  });

  it('should return original if platform is unsupported', () => {
    const suggestions = generateCaptionSuggestions('My caption', 'unknownPlatform');

    expect(suggestions).toEqual(['My caption']);
  });

  it('should deduplicate suggestions', () => {
    const suggestions = generateCaptionSuggestions('Short', 'instagram');

    const uniqueCount = new Set(suggestions).size;
    expect(suggestions).toHaveLength(uniqueCount);
  });
});
