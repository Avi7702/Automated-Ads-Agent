/**
 * Platform Specifications Service
 *
 * Comprehensive specifications for all major social media platforms.
 * Data sourced from official platform documentation as of January 2026.
 *
 * Usage:
 *   import { PLATFORM_SPECS, getPlatformSpecs } from './services/platformSpecsService';
 *   const specs = getPlatformSpecs('instagram');
 */

import { logger } from '../lib/logger';

/**
 * Platform-specific specifications for content formatting
 */
export interface PlatformSpecs {
  platform: string;
  displayName: string;

  caption: {
    minLength: number;
    maxLength: number;
    recommended: number;
    truncationPoint?: number; // Where "See more" appears
    notes?: string;
  };

  hashtags: {
    min: number;
    max: number;
    recommended: number;
    position: 'inline' | 'end' | 'both' | 'none';
    requiresSymbol: boolean; // Whether # is needed
    notes?: string;
  };

  image: {
    formats: string[]; // ['jpg', 'png', 'webp']
    maxSizeMB: number;
    minWidth: number;
    minHeight: number;
    aspectRatios: Array<{
      name: string;
      ratio: string; // '1:1', '16:9', etc.
      width: number;
      height: number;
      recommended: boolean;
      notes?: string;
    }>;
  };

  video?: {
    formats: string[];
    maxSizeMB: number;
    maxDurationSeconds: number;
    minDurationSeconds: number;
    aspectRatios?: string[];
  };

  features: {
    supportsCarousel: boolean;
    supportsStories: boolean;
    supportsReels: boolean;
    supportsPolls: boolean;
    supportsLinks: boolean;
    linkPosition?: 'caption' | 'firstComment' | 'bio' | 'anywhere';
    supportsEmojis: boolean;
    professionalPlatform: boolean; // For emoji optimization
  };

  limits?: {
    maxImagesPerPost?: number;
    maxHashtagsTotal?: number;
    maxMentions?: number;
  };
}

/**
 * Comprehensive platform specifications (January 2026)
 *
 * Sources:
 * - LinkedIn: https://socialrails.com/blog/linkedin-post-character-limits
 * - Instagram: https://www.outfy.com/blog/instagram-character-limit/
 * - Facebook: https://recurpost.com/blog/facebook-post-sizes/
 * - Twitter/X: https://socialrails.com/blog/twitter-character-limits-guide
 * - TikTok: https://cloudcampaignsupport.zendesk.com/hc/en-us/articles/42274647925267
 * - YouTube Shorts: https://postfa.st/sizes/youtube/shorts
 * - Pinterest: https://socialrails.com/blog/pinterest-pin-size-dimensions-guide
 */
export const PLATFORM_SPECS: Record<string, PlatformSpecs> = {
  // ========================================
  // LINKEDIN
  // ========================================
  linkedin: {
    platform: 'linkedin',
    displayName: 'LinkedIn (Personal Profile)',

    caption: {
      minLength: 0,
      maxLength: 3000,
      recommended: 150, // Sweet spot for engagement
      truncationPoint: 210, // "See more" cutoff on desktop
      notes: 'Mobile truncates at ~140 characters. First 100-300 chars get highest engagement.',
    },

    hashtags: {
      min: 0,
      max: 30,
      recommended: 3,
      position: 'end',
      requiresSymbol: true,
      notes: 'LinkedIn hashtags use # symbol. 3-5 hashtags optimal for reach.',
    },

    image: {
      formats: ['jpg', 'png', 'webp'],
      maxSizeMB: 8,
      minWidth: 552,
      minHeight: 276,
      aspectRatios: [
        {
          name: 'Landscape',
          ratio: '1.91:1',
          width: 1200,
          height: 627,
          recommended: true,
          notes: 'Optimal for link previews and shared posts',
        },
        {
          name: 'Square',
          ratio: '1:1',
          width: 1080,
          height: 1080,
          recommended: false,
        },
      ],
    },

    video: {
      formats: ['mp4', 'mov'],
      maxSizeMB: 200,
      maxDurationSeconds: 600, // 10 minutes
      minDurationSeconds: 3,
      aspectRatios: ['16:9', '1:1', '9:16'],
    },

    features: {
      supportsCarousel: true,
      supportsStories: false,
      supportsReels: false,
      supportsPolls: true,
      supportsLinks: true,
      linkPosition: 'caption',
      supportsEmojis: true,
      professionalPlatform: true,
    },

    limits: {
      maxImagesPerPost: 9, // Carousel
    },
  },

  // ========================================
  // LINKEDIN COMPANY PAGE
  // ========================================
  'linkedin-company': {
    platform: 'linkedin-company',
    displayName: 'LinkedIn (Company Page)',

    caption: {
      minLength: 0,
      maxLength: 3000,
      recommended: 150,
      truncationPoint: 210,
      notes: 'Same as personal profile. Keep first 210 chars compelling.',
    },

    hashtags: {
      min: 0,
      max: 30,
      recommended: 5,
      position: 'end',
      requiresSymbol: true,
      notes: 'Company pages can use slightly more hashtags (up to 5).',
    },

    image: {
      formats: ['jpg', 'png', 'webp'],
      maxSizeMB: 8,
      minWidth: 552,
      minHeight: 276,
      aspectRatios: [
        {
          name: 'Landscape',
          ratio: '1.91:1',
          width: 1200,
          height: 627,
          recommended: true,
        },
        {
          name: 'Square',
          ratio: '1:1',
          width: 1080,
          height: 1080,
          recommended: false,
        },
      ],
    },

    video: {
      formats: ['mp4', 'mov'],
      maxSizeMB: 200,
      maxDurationSeconds: 600,
      minDurationSeconds: 3,
      aspectRatios: ['16:9', '1:1', '9:16'],
    },

    features: {
      supportsCarousel: true,
      supportsStories: false,
      supportsReels: false,
      supportsPolls: true,
      supportsLinks: true,
      linkPosition: 'caption',
      supportsEmojis: true,
      professionalPlatform: true,
    },

    limits: {
      maxImagesPerPost: 9,
    },
  },

  // ========================================
  // INSTAGRAM FEED
  // ========================================
  instagram: {
    platform: 'instagram',
    displayName: 'Instagram (Feed Post)',

    caption: {
      minLength: 0,
      maxLength: 2200,
      recommended: 150, // Balance between engagement and info
      truncationPoint: 125,
      notes: 'First 125 characters show before "...more". Use line breaks for readability.',
    },

    hashtags: {
      min: 0,
      max: 30,
      recommended: 10,
      position: 'end',
      requiresSymbol: true,
      notes: 'Up to 30 hashtags total (caption + first comment). 9-11 hashtags optimal for reach.',
    },

    image: {
      formats: ['jpg', 'png'],
      maxSizeMB: 8,
      minWidth: 320,
      minHeight: 320,
      aspectRatios: [
        {
          name: 'Portrait (New 2026)',
          ratio: '3:4',
          width: 1080,
          height: 1440,
          recommended: true,
          notes: 'NEW for 2026! Maximizes vertical space on mobile',
        },
        {
          name: 'Portrait (Classic)',
          ratio: '4:5',
          width: 1080,
          height: 1350,
          recommended: true,
          notes: 'Classic portrait format, still highly recommended',
        },
        {
          name: 'Square',
          ratio: '1:1',
          width: 1080,
          height: 1080,
          recommended: false,
        },
        {
          name: 'Landscape',
          ratio: '1.91:1',
          width: 1080,
          height: 566,
          recommended: false,
          notes: 'Less visibility in feed, avoid if possible',
        },
      ],
    },

    video: {
      formats: ['mp4', 'mov'],
      maxSizeMB: 100,
      maxDurationSeconds: 60,
      minDurationSeconds: 3,
      aspectRatios: ['4:5', '1:1', '16:9'],
    },

    features: {
      supportsCarousel: true,
      supportsStories: true,
      supportsReels: true,
      supportsPolls: false, // Only in stories
      supportsLinks: false,
      linkPosition: 'bio',
      supportsEmojis: true,
      professionalPlatform: false,
    },

    limits: {
      maxImagesPerPost: 10, // Carousel
      maxHashtagsTotal: 30,
    },
  },

  // ========================================
  // INSTAGRAM STORY
  // ========================================
  'instagram-story': {
    platform: 'instagram-story',
    displayName: 'Instagram (Story)',

    caption: {
      minLength: 0,
      maxLength: 2200,
      recommended: 50,
      notes: 'Stories are visual-first. Keep text minimal or use text stickers.',
    },

    hashtags: {
      min: 0,
      max: 10,
      recommended: 5,
      position: 'inline',
      requiresSymbol: true,
      notes: 'Use hashtag stickers for better engagement than text hashtags.',
    },

    image: {
      formats: ['jpg', 'png'],
      maxSizeMB: 8,
      minWidth: 1080,
      minHeight: 1920,
      aspectRatios: [
        {
          name: 'Vertical',
          ratio: '9:16',
          width: 1080,
          height: 1920,
          recommended: true,
          notes: 'Full-screen mobile experience',
        },
      ],
    },

    video: {
      formats: ['mp4', 'mov'],
      maxSizeMB: 100,
      maxDurationSeconds: 60,
      minDurationSeconds: 1,
      aspectRatios: ['9:16'],
    },

    features: {
      supportsCarousel: false,
      supportsStories: true,
      supportsReels: false,
      supportsPolls: true,
      supportsLinks: true, // With 10k+ followers
      linkPosition: 'anywhere',
      supportsEmojis: true,
      professionalPlatform: false,
    },
  },

  // ========================================
  // INSTAGRAM REEL
  // ========================================
  'instagram-reel': {
    platform: 'instagram-reel',
    displayName: 'Instagram (Reel)',

    caption: {
      minLength: 0,
      maxLength: 2200,
      recommended: 100,
      truncationPoint: 125,
      notes: 'Reels prioritize video content. Caption supports discovery via keywords.',
    },

    hashtags: {
      min: 0,
      max: 30,
      recommended: 8,
      position: 'end',
      requiresSymbol: true,
      notes: 'Hashtags crucial for Reels discovery. Mix popular + niche.',
    },

    image: {
      formats: ['jpg', 'png'],
      maxSizeMB: 8,
      minWidth: 1080,
      minHeight: 1920,
      aspectRatios: [
        {
          name: 'Vertical',
          ratio: '9:16',
          width: 1080,
          height: 1920,
          recommended: true,
        },
      ],
    },

    video: {
      formats: ['mp4', 'mov'],
      maxSizeMB: 100,
      maxDurationSeconds: 90,
      minDurationSeconds: 3,
      aspectRatios: ['9:16'],
    },

    features: {
      supportsCarousel: false,
      supportsStories: false,
      supportsReels: true,
      supportsPolls: false,
      supportsLinks: false,
      linkPosition: 'bio',
      supportsEmojis: true,
      professionalPlatform: false,
    },

    limits: {
      maxHashtagsTotal: 30,
    },
  },

  // ========================================
  // FACEBOOK PERSONAL
  // ========================================
  facebook: {
    platform: 'facebook',
    displayName: 'Facebook (Personal Profile)',

    caption: {
      minLength: 0,
      maxLength: 63206,
      recommended: 250,
      truncationPoint: 480,
      notes: 'No hard limit, but posts truncate at ~480 chars in feed with "See more".',
    },

    hashtags: {
      min: 0,
      max: 30,
      recommended: 2,
      position: 'end',
      requiresSymbol: true,
      notes: 'Hashtags less important on Facebook. 1-3 max recommended.',
    },

    image: {
      formats: ['jpg', 'png', 'webp'],
      maxSizeMB: 30,
      minWidth: 720,
      minHeight: 720,
      aspectRatios: [
        {
          name: 'Landscape',
          ratio: '1.91:1',
          width: 1200,
          height: 630,
          recommended: true,
          notes: 'Best for link sharing',
        },
        {
          name: 'Portrait (Mobile-first)',
          ratio: '4:5',
          width: 1080,
          height: 1350,
          recommended: true,
          notes: 'Optimized for mobile feed',
        },
        {
          name: 'Square',
          ratio: '1:1',
          width: 1080,
          height: 1080,
          recommended: false,
        },
      ],
    },

    video: {
      formats: ['mp4', 'mov'],
      maxSizeMB: 4096, // 4GB
      maxDurationSeconds: 14400, // 240 minutes
      minDurationSeconds: 1,
      aspectRatios: ['16:9', '1:1', '9:16'],
    },

    features: {
      supportsCarousel: true,
      supportsStories: true,
      supportsReels: true,
      supportsPolls: true,
      supportsLinks: true,
      linkPosition: 'anywhere',
      supportsEmojis: true,
      professionalPlatform: false,
    },

    limits: {
      maxImagesPerPost: 10,
    },
  },

  // ========================================
  // FACEBOOK BUSINESS PAGE
  // ========================================
  'facebook-page': {
    platform: 'facebook-page',
    displayName: 'Facebook (Business Page)',

    caption: {
      minLength: 0,
      maxLength: 63206,
      recommended: 250,
      truncationPoint: 480,
      notes: 'Business pages: keep posts concise for better engagement.',
    },

    hashtags: {
      min: 0,
      max: 30,
      recommended: 3,
      position: 'end',
      requiresSymbol: true,
      notes: 'Slightly more hashtags acceptable on business pages.',
    },

    image: {
      formats: ['jpg', 'png', 'webp'],
      maxSizeMB: 30,
      minWidth: 720,
      minHeight: 720,
      aspectRatios: [
        {
          name: 'Landscape',
          ratio: '1.91:1',
          width: 1200,
          height: 630,
          recommended: true,
        },
        {
          name: 'Portrait',
          ratio: '4:5',
          width: 1080,
          height: 1350,
          recommended: true,
        },
        {
          name: 'Square',
          ratio: '1:1',
          width: 1080,
          height: 1080,
          recommended: false,
        },
      ],
    },

    video: {
      formats: ['mp4', 'mov'],
      maxSizeMB: 4096,
      maxDurationSeconds: 14400,
      minDurationSeconds: 1,
      aspectRatios: ['16:9', '1:1', '9:16'],
    },

    features: {
      supportsCarousel: true,
      supportsStories: true,
      supportsReels: true,
      supportsPolls: true,
      supportsLinks: true,
      linkPosition: 'anywhere',
      supportsEmojis: true,
      professionalPlatform: false,
    },

    limits: {
      maxImagesPerPost: 10,
    },
  },

  // ========================================
  // TWITTER / X
  // ========================================
  twitter: {
    platform: 'twitter',
    displayName: 'Twitter / X',

    caption: {
      minLength: 0,
      maxLength: 280,
      recommended: 260, // Leave room for retweets with comments
      notes: 'Standard users: 280 chars. Premium subscribers: 25,000 chars (long-form).',
    },

    hashtags: {
      min: 0,
      max: 2,
      recommended: 2,
      position: 'inline',
      requiresSymbol: true,
      notes: 'Hashtags count toward 280 char limit. Max 2 recommended for engagement.',
    },

    image: {
      formats: ['jpg', 'png', 'gif', 'webp'],
      maxSizeMB: 5,
      minWidth: 600,
      minHeight: 335,
      aspectRatios: [
        {
          name: 'Landscape',
          ratio: '16:9',
          width: 1600,
          height: 900,
          recommended: true,
          notes: 'Best display in timeline',
        },
        {
          name: 'Square',
          ratio: '1:1',
          width: 1200,
          height: 1200,
          recommended: false,
        },
      ],
    },

    video: {
      formats: ['mp4', 'mov'],
      maxSizeMB: 512,
      maxDurationSeconds: 140, // 2:20 for standard users
      minDurationSeconds: 0.5,
      aspectRatios: ['16:9', '1:1'],
    },

    features: {
      supportsCarousel: true, // Up to 4 images
      supportsStories: false,
      supportsReels: false,
      supportsPolls: true,
      supportsLinks: true,
      linkPosition: 'caption',
      supportsEmojis: true,
      professionalPlatform: false,
    },

    limits: {
      maxImagesPerPost: 4,
    },
  },

  // ========================================
  // TIKTOK
  // ========================================
  tiktok: {
    platform: 'tiktok',
    displayName: 'TikTok',

    caption: {
      minLength: 0,
      maxLength: 4000,
      recommended: 150,
      notes: 'Increased to 4000 chars in 2026! But keep it concise for mobile viewing.',
    },

    hashtags: {
      min: 0,
      max: 10,
      recommended: 5,
      position: 'inline',
      requiresSymbol: true,
      notes: 'Hashtags crucial for FYP algorithm. Mix trending + niche.',
    },

    image: {
      formats: ['jpg', 'png'],
      maxSizeMB: 10,
      minWidth: 1080,
      minHeight: 1920,
      aspectRatios: [
        {
          name: 'Vertical',
          ratio: '9:16',
          width: 1080,
          height: 1920,
          recommended: true,
          notes: 'Full-screen vertical video format',
        },
      ],
    },

    video: {
      formats: ['mp4', 'mov'],
      maxSizeMB: 287.6, // iOS limit
      maxDurationSeconds: 600, // 10 minutes (upload limit)
      minDurationSeconds: 1,
      aspectRatios: ['9:16'],
    },

    features: {
      supportsCarousel: false,
      supportsStories: false,
      supportsReels: false,
      supportsPolls: false,
      supportsLinks: false, // No clickable links in captions
      linkPosition: 'bio',
      supportsEmojis: true,
      professionalPlatform: false,
    },

    limits: {
      maxHashtagsTotal: 10,
    },
  },

  // ========================================
  // YOUTUBE SHORTS
  // ========================================
  'youtube-shorts': {
    platform: 'youtube-shorts',
    displayName: 'YouTube Shorts',

    caption: {
      minLength: 0,
      maxLength: 100, // Title limit
      recommended: 60,
      notes: 'Title displays in Shorts feed. Use description for longer content.',
    },

    hashtags: {
      min: 0,
      max: 15,
      recommended: 5,
      position: 'end',
      requiresSymbol: true,
      notes: 'Use #Shorts tag to ensure video appears in Shorts feed.',
    },

    image: {
      formats: ['jpg', 'png'],
      maxSizeMB: 2,
      minWidth: 1080,
      minHeight: 1920,
      aspectRatios: [
        {
          name: 'Vertical',
          ratio: '9:16',
          width: 1080,
          height: 1920,
          recommended: true,
          notes: 'Keep important content in 4:5 safe area (center)',
        },
      ],
    },

    video: {
      formats: ['mp4', 'mov'],
      maxSizeMB: 256,
      maxDurationSeconds: 180, // 3 minutes (as of Oct 2024)
      minDurationSeconds: 1,
      aspectRatios: ['9:16'],
    },

    features: {
      supportsCarousel: false,
      supportsStories: false,
      supportsReels: false,
      supportsPolls: false,
      supportsLinks: true,
      linkPosition: 'caption',
      supportsEmojis: true,
      professionalPlatform: false,
    },
  },

  // ========================================
  // YOUTUBE REGULAR VIDEO
  // ========================================
  youtube: {
    platform: 'youtube',
    displayName: 'YouTube (Regular Video)',

    caption: {
      minLength: 0,
      maxLength: 5000, // Description limit
      recommended: 300,
      notes: 'Title: 100 chars max. Description: 5000 chars. First 2-3 lines visible.',
    },

    hashtags: {
      min: 0,
      max: 15,
      recommended: 5,
      position: 'end',
      requiresSymbol: true,
      notes: 'Max 15 hashtags or video may be ignored. Place in description.',
    },

    image: {
      formats: ['jpg', 'png'],
      maxSizeMB: 2,
      minWidth: 1280,
      minHeight: 720,
      aspectRatios: [
        {
          name: 'Landscape',
          ratio: '16:9',
          width: 1920,
          height: 1080,
          recommended: true,
          notes: 'Standard YouTube video format',
        },
      ],
    },

    video: {
      formats: ['mp4', 'mov', 'avi'],
      maxSizeMB: 256000, // 256 GB
      maxDurationSeconds: 43200, // 12 hours
      minDurationSeconds: 1,
      aspectRatios: ['16:9', '4:3'],
    },

    features: {
      supportsCarousel: false,
      supportsStories: true, // Community posts
      supportsReels: false,
      supportsPolls: true, // Community tab
      supportsLinks: true,
      linkPosition: 'caption',
      supportsEmojis: true,
      professionalPlatform: false,
    },
  },

  // ========================================
  // PINTEREST
  // ========================================
  pinterest: {
    platform: 'pinterest',
    displayName: 'Pinterest',

    caption: {
      minLength: 0,
      maxLength: 500,
      recommended: 150,
      truncationPoint: 60,
      notes: 'Title: 100 chars. Description: 500 chars. First 50-60 chars visible in feed.',
    },

    hashtags: {
      min: 0,
      max: 20,
      recommended: 5,
      position: 'end',
      requiresSymbol: true,
      notes: 'Hashtags help with search discovery. Use relevant keywords.',
    },

    image: {
      formats: ['jpg', 'png'],
      maxSizeMB: 20,
      minWidth: 600,
      minHeight: 900,
      aspectRatios: [
        {
          name: 'Vertical (Standard)',
          ratio: '2:3',
          width: 1000,
          height: 1500,
          recommended: true,
          notes: '67% more engagement than square pins',
        },
        {
          name: 'Long Pin',
          ratio: '1:2.1',
          width: 1000,
          height: 2100,
          recommended: false,
          notes: 'Maximum vertical space',
        },
        {
          name: 'Square',
          ratio: '1:1',
          width: 1000,
          height: 1000,
          recommended: false,
        },
      ],
    },

    video: {
      formats: ['mp4', 'mov'],
      maxSizeMB: 2048,
      maxDurationSeconds: 900, // 15 minutes
      minDurationSeconds: 4,
      aspectRatios: ['2:3', '1:2.1', '9:16'],
    },

    features: {
      supportsCarousel: true, // Idea Pins
      supportsStories: false,
      supportsReels: false,
      supportsPolls: false,
      supportsLinks: true,
      linkPosition: 'anywhere',
      supportsEmojis: true,
      professionalPlatform: false,
    },

    limits: {
      maxImagesPerPost: 20, // Idea Pins
    },
  },
};

/**
 * Get specifications for a specific platform
 *
 * @param platform - Platform identifier (e.g., 'instagram', 'linkedin')
 * @returns Platform specifications or undefined if not found
 */
export function getPlatformSpecs(platform: string): PlatformSpecs | undefined {
  const specs = PLATFORM_SPECS[platform.toLowerCase()];

  if (!specs) {
    logger.warn({ platform }, 'Platform specifications not found');
  }

  return specs;
}

/**
 * Get all available platform identifiers
 *
 * @returns Array of platform identifiers
 */
export function getAvailablePlatforms(): string[] {
  return Object.keys(PLATFORM_SPECS);
}

/**
 * Validate if a platform is supported
 *
 * @param platform - Platform identifier to validate
 * @returns True if platform is supported
 */
export function isPlatformSupported(platform: string): boolean {
  return platform.toLowerCase() in PLATFORM_SPECS;
}

/**
 * Get recommended aspect ratio for a platform
 *
 * @param platform - Platform identifier
 * @returns Recommended aspect ratio object or undefined
 */
export function getRecommendedAspectRatio(platform: string) {
  const specs = getPlatformSpecs(platform);
  if (!specs) return undefined;

  return specs.image.aspectRatios.find(ar => ar.recommended);
}

/**
 * Get all aspect ratios for a platform
 *
 * @param platform - Platform identifier
 * @returns Array of aspect ratio objects
 */
export function getAspectRatios(platform: string) {
  const specs = getPlatformSpecs(platform);
  return specs?.image.aspectRatios || [];
}

/**
 * Export types for use in other services
 */
export type { PlatformSpecs };
