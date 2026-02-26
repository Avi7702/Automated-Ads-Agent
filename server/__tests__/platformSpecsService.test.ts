/**
 * PlatformSpecsService Tests
 *
 * Tests the platform specifications data and accessor functions:
 * - PLATFORM_SPECS (data integrity)
 * - getPlatformSpecs (lookup by platform)
 * - getAvailablePlatforms (list all platforms)
 * - isPlatformSupported (validation)
 * - getRecommendedAspectRatio (aspect ratio lookup)
 * - getAspectRatios (all ratios for platform)
 *
 * Covers: data integrity, accessor functions, edge cases
 */

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import {
  PLATFORM_SPECS,
  getPlatformSpecs,
  getAvailablePlatforms,
  isPlatformSupported,
  getRecommendedAspectRatio,
  getAspectRatios,
} from '../services/platformSpecsService';

// ============================================
// PLATFORM_SPECS data integrity
// ============================================

describe('PLATFORM_SPECS data integrity', () => {
  const allPlatforms = Object.keys(PLATFORM_SPECS);

  it('should have at least 5 major platforms defined', () => {
    expect(allPlatforms.length).toBeGreaterThanOrEqual(5);
  });

  it('should include all major platforms', () => {
    expect(PLATFORM_SPECS['instagram']).toBeDefined();
    expect(PLATFORM_SPECS['linkedin']).toBeDefined();
    expect(PLATFORM_SPECS['facebook']).toBeDefined();
    expect(PLATFORM_SPECS['twitter']).toBeDefined();
    expect(PLATFORM_SPECS['tiktok']).toBeDefined();
  });

  it.each(allPlatforms)('platform "%s" should have required caption fields', (platform) => {
    const specs = PLATFORM_SPECS[platform];
    expect(specs).toBeDefined();
    expect(specs?.caption.maxLength).toBeGreaterThan(0);
    expect(specs?.caption.recommended).toBeGreaterThan(0);
    expect(specs?.caption.recommended).toBeLessThanOrEqual(specs?.caption.maxLength ?? 0);
  });

  it.each(allPlatforms)('platform "%s" should have valid hashtag config', (platform) => {
    const specs = PLATFORM_SPECS[platform];
    expect(specs).toBeDefined();
    expect(specs?.hashtags.max).toBeGreaterThanOrEqual(specs?.hashtags.min ?? 0);
    expect(['inline', 'end', 'both', 'none']).toContain(specs?.hashtags.position);
    expect(typeof specs?.hashtags.requiresSymbol).toBe('boolean');
  });

  it.each(allPlatforms)('platform "%s" should have valid image specs', (platform) => {
    const specs = PLATFORM_SPECS[platform];
    expect(specs).toBeDefined();
    expect(specs?.image.formats.length).toBeGreaterThan(0);
    expect(specs?.image.maxSizeMB).toBeGreaterThan(0);
    expect(specs?.image.minWidth).toBeGreaterThan(0);
    expect(specs?.image.minHeight).toBeGreaterThan(0);
    expect(specs?.image.aspectRatios.length).toBeGreaterThan(0);
  });

  it.each(allPlatforms)('platform "%s" should have at least one aspect ratio', (platform) => {
    const specs = PLATFORM_SPECS[platform];
    expect(specs?.image.aspectRatios.length).toBeGreaterThan(0);

    // Each aspect ratio should have required fields
    for (const ar of specs?.image.aspectRatios ?? []) {
      expect(ar.name).toBeTruthy();
      expect(ar.ratio).toBeTruthy();
      expect(ar.width).toBeGreaterThan(0);
      expect(ar.height).toBeGreaterThan(0);
      expect(typeof ar.recommended).toBe('boolean');
    }
  });

  it.each(allPlatforms)('platform "%s" should have valid features', (platform) => {
    const specs = PLATFORM_SPECS[platform];
    expect(specs).toBeDefined();
    expect(typeof specs?.features.supportsCarousel).toBe('boolean');
    expect(typeof specs?.features.supportsStories).toBe('boolean');
    expect(typeof specs?.features.supportsReels).toBe('boolean');
    expect(typeof specs?.features.supportsPolls).toBe('boolean');
    expect(typeof specs?.features.supportsLinks).toBe('boolean');
    expect(typeof specs?.features.supportsEmojis).toBe('boolean');
    expect(typeof specs?.features.professionalPlatform).toBe('boolean');
  });

  it('should have at least one recommended aspect ratio per platform', () => {
    for (const platform of allPlatforms) {
      const specs = PLATFORM_SPECS[platform];
      const hasRecommended = specs?.image.aspectRatios.some((ar) => ar.recommended);
      expect(hasRecommended).toBe(true);
    }
  });
});

// ============================================
// Platform-specific data validation
// ============================================

describe('Platform-specific specs', () => {
  describe('Twitter', () => {
    it('should have 280 character max length', () => {
      const specs = PLATFORM_SPECS['twitter'];
      expect(specs?.caption.maxLength).toBe(280);
    });

    it('should allow max 2 hashtags (recommended)', () => {
      const specs = PLATFORM_SPECS['twitter'];
      expect(specs?.hashtags.recommended).toBe(2);
    });

    it('should use inline hashtag position', () => {
      const specs = PLATFORM_SPECS['twitter'];
      expect(specs?.hashtags.position).toBe('inline');
    });
  });

  describe('Instagram', () => {
    it('should have 2200 character max length', () => {
      const specs = PLATFORM_SPECS['instagram'];
      expect(specs?.caption.maxLength).toBe(2200);
    });

    it('should have max 30 hashtags', () => {
      const specs = PLATFORM_SPECS['instagram'];
      expect(specs?.hashtags.max).toBe(30);
    });

    it('should not be a professional platform', () => {
      const specs = PLATFORM_SPECS['instagram'];
      expect(specs?.features.professionalPlatform).toBe(false);
    });
  });

  describe('LinkedIn', () => {
    it('should be a professional platform', () => {
      const specs = PLATFORM_SPECS['linkedin'];
      expect(specs?.features.professionalPlatform).toBe(true);
    });

    it('should support links in caption', () => {
      const specs = PLATFORM_SPECS['linkedin'];
      expect(specs?.features.supportsLinks).toBe(true);
      expect(specs?.features.linkPosition).toBe('caption');
    });

    it('should have truncation point around 210', () => {
      const specs = PLATFORM_SPECS['linkedin'];
      expect(specs?.caption.truncationPoint).toBe(210);
    });
  });

  describe('TikTok', () => {
    it('should not support clickable links', () => {
      const specs = PLATFORM_SPECS['tiktok'];
      expect(specs?.features.supportsLinks).toBe(false);
    });

    it('should have 4000 character max', () => {
      const specs = PLATFORM_SPECS['tiktok'];
      expect(specs?.caption.maxLength).toBe(4000);
    });
  });
});

// ============================================
// getPlatformSpecs
// ============================================

describe('getPlatformSpecs', () => {
  it('should return specs for a valid platform', () => {
    const specs = getPlatformSpecs('instagram');
    expect(specs).toBeDefined();
    expect(specs?.platform).toBe('instagram');
    expect(specs?.displayName).toBeTruthy();
  });

  it('should be case-insensitive', () => {
    const specs = getPlatformSpecs('Instagram');
    expect(specs).toBeDefined();
    expect(specs?.platform).toBe('instagram');
  });

  it('should return undefined for unknown platform', () => {
    const specs = getPlatformSpecs('myspace');
    expect(specs).toBeUndefined();
  });

  it('should return undefined for empty string', () => {
    const specs = getPlatformSpecs('');
    expect(specs).toBeUndefined();
  });

  it('should return correct specs for compound platform names', () => {
    const specs = getPlatformSpecs('linkedin-company');
    expect(specs).toBeDefined();
    expect(specs?.platform).toBe('linkedin-company');
  });
});

// ============================================
// getAvailablePlatforms
// ============================================

describe('getAvailablePlatforms', () => {
  it('should return an array of platform identifiers', () => {
    const platforms = getAvailablePlatforms();
    expect(Array.isArray(platforms)).toBe(true);
    expect(platforms.length).toBeGreaterThan(0);
  });

  it('should include major platforms', () => {
    const platforms = getAvailablePlatforms();
    expect(platforms).toContain('instagram');
    expect(platforms).toContain('linkedin');
    expect(platforms).toContain('twitter');
    expect(platforms).toContain('facebook');
    expect(platforms).toContain('tiktok');
  });

  it('should match PLATFORM_SPECS keys', () => {
    const platforms = getAvailablePlatforms();
    const specKeys = Object.keys(PLATFORM_SPECS);
    expect(platforms.sort()).toEqual(specKeys.sort());
  });
});

// ============================================
// isPlatformSupported
// ============================================

describe('isPlatformSupported', () => {
  it('should return true for supported platforms', () => {
    expect(isPlatformSupported('instagram')).toBe(true);
    expect(isPlatformSupported('linkedin')).toBe(true);
    expect(isPlatformSupported('twitter')).toBe(true);
  });

  it('should be case-insensitive', () => {
    expect(isPlatformSupported('Instagram')).toBe(true);
    expect(isPlatformSupported('LINKEDIN')).toBe(true);
  });

  it('should return false for unsupported platforms', () => {
    expect(isPlatformSupported('myspace')).toBe(false);
    expect(isPlatformSupported('snapchat')).toBe(false);
    expect(isPlatformSupported('')).toBe(false);
  });
});

// ============================================
// getRecommendedAspectRatio
// ============================================

describe('getRecommendedAspectRatio', () => {
  it('should return recommended aspect ratio for Instagram', () => {
    const ar = getRecommendedAspectRatio('instagram');
    expect(ar).toBeDefined();
    expect(ar?.recommended).toBe(true);
    expect(ar?.ratio).toBeTruthy();
  });

  it('should return recommended aspect ratio for LinkedIn', () => {
    const ar = getRecommendedAspectRatio('linkedin');
    expect(ar).toBeDefined();
    expect(ar?.recommended).toBe(true);
  });

  it('should return undefined for unknown platform', () => {
    const ar = getRecommendedAspectRatio('myspace');
    expect(ar).toBeUndefined();
  });
});

// ============================================
// getAspectRatios
// ============================================

describe('getAspectRatios', () => {
  it('should return all aspect ratios for a platform', () => {
    const ratios = getAspectRatios('instagram');
    expect(ratios.length).toBeGreaterThan(0);
    expect(ratios[0]?.ratio).toBeTruthy();
  });

  it('should return empty array for unknown platform', () => {
    const ratios = getAspectRatios('myspace');
    expect(ratios).toEqual([]);
  });

  it('should return multiple aspect ratios for platforms that support them', () => {
    const ratios = getAspectRatios('facebook');
    expect(ratios.length).toBeGreaterThanOrEqual(2);
  });
});
