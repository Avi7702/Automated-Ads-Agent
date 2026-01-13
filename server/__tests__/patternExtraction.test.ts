/**
 * Pattern Extraction Tests
 *
 * Tests for the Learn from Winners feature:
 * - Validation schemas
 * - Privacy filter
 * - Pattern extraction types
 * - Cleanup job
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  uploadPatternSchema,
  updatePatternSchema,
  applyPatternSchema,
  ratePatternSchema,
  listPatternsQuerySchema,
} from '../validation/schemas';
import {
  sanitizeExtractedPattern,
  type ExtractedPatternData,
} from '../services/patternPrivacyFilter';
import { formatPatternsForPrompt } from '../services/patternExtractionService';
import type { LearnedAdPattern } from '../../shared/schema';

describe('Pattern Validation Schemas', () => {
  describe('uploadPatternSchema', () => {
    it('accepts valid upload data', () => {
      const result = uploadPatternSchema.safeParse({
        name: 'High-Converting Product Ad',
        category: 'product_showcase',
        platform: 'instagram',
      });
      expect(result.success).toBe(true);
    });

    it('accepts optional fields', () => {
      const result = uploadPatternSchema.safeParse({
        name: 'Test Pattern',
        category: 'testimonial',
        platform: 'linkedin',
        industry: 'SaaS',
        engagementTier: 'top-5',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing required name', () => {
      const result = uploadPatternSchema.safeParse({
        category: 'product_showcase',
        platform: 'instagram',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid category', () => {
      const result = uploadPatternSchema.safeParse({
        name: 'Test',
        category: 'invalid_category',
        platform: 'instagram',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid platform', () => {
      const result = uploadPatternSchema.safeParse({
        name: 'Test',
        category: 'product_showcase',
        platform: 'invalid_platform',
      });
      expect(result.success).toBe(false);
    });

    it('rejects name over 100 chars', () => {
      const result = uploadPatternSchema.safeParse({
        name: 'a'.repeat(101),
        category: 'product_showcase',
        platform: 'instagram',
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updatePatternSchema', () => {
    it('accepts partial updates', () => {
      const result = updatePatternSchema.safeParse({
        name: 'Updated Name',
      });
      expect(result.success).toBe(true);
    });

    it('accepts isActive toggle', () => {
      const result = updatePatternSchema.safeParse({
        isActive: false,
      });
      expect(result.success).toBe(true);
    });

    it('accepts full update', () => {
      const result = updatePatternSchema.safeParse({
        name: 'New Name',
        category: 'comparison',
        platform: 'facebook',
        industry: 'E-commerce',
        engagementTier: 'top-10',
        isActive: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('applyPatternSchema', () => {
    it('accepts valid apply request', () => {
      const result = applyPatternSchema.safeParse({
        productIds: ['550e8400-e29b-41d4-a716-446655440000'],
        targetPlatform: 'linkedin',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty product array', () => {
      const result = applyPatternSchema.safeParse({
        productIds: [],
        targetPlatform: 'instagram',
      });
      expect(result.success).toBe(false);
    });

    it('rejects more than 6 products', () => {
      const result = applyPatternSchema.safeParse({
        productIds: Array(7).fill('550e8400-e29b-41d4-a716-446655440000'),
        targetPlatform: 'instagram',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional aspect ratio', () => {
      const result = applyPatternSchema.safeParse({
        productIds: ['550e8400-e29b-41d4-a716-446655440000'],
        targetPlatform: 'tiktok',
        aspectRatio: '9:16',
      });
      expect(result.success).toBe(true);
    });
  });

  describe('ratePatternSchema', () => {
    it('accepts valid rating', () => {
      const result = ratePatternSchema.safeParse({
        rating: 5,
        wasUsed: true,
      });
      expect(result.success).toBe(true);
    });

    it('accepts rating with feedback', () => {
      const result = ratePatternSchema.safeParse({
        rating: 4,
        wasUsed: true,
        feedback: 'Great pattern, helped generate high-quality ads!',
      });
      expect(result.success).toBe(true);
    });

    it('rejects rating below 1', () => {
      const result = ratePatternSchema.safeParse({
        rating: 0,
        wasUsed: false,
      });
      expect(result.success).toBe(false);
    });

    it('rejects rating above 5', () => {
      const result = ratePatternSchema.safeParse({
        rating: 6,
        wasUsed: true,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('listPatternsQuerySchema', () => {
    it('accepts empty query', () => {
      const result = listPatternsQuerySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts category filter', () => {
      const result = listPatternsQuerySchema.safeParse({
        category: 'product_showcase',
      });
      expect(result.success).toBe(true);
    });

    it('accepts platform filter', () => {
      const result = listPatternsQuerySchema.safeParse({
        platform: 'instagram',
      });
      expect(result.success).toBe(true);
    });

    it('transforms isActive string to boolean', () => {
      const result = listPatternsQuerySchema.safeParse({
        isActive: 'true',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(true);
      }
    });

    it('transforms limit string to number', () => {
      const result = listPatternsQuerySchema.safeParse({
        limit: '50',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
      }
    });
  });
});

describe('Privacy Filter', () => {
  describe('sanitizeExtractedPattern', () => {
    it('passes through valid pattern descriptions', () => {
      const pattern: ExtractedPatternData = {
        layoutPattern: {
          structure: 'hero-top',
          visualHierarchy: ['image', 'headline', 'cta'],
          whitespaceUsage: 'generous',
          focalPointPosition: 'center',
        },
        colorPsychology: {
          dominantMood: 'trust',
          colorScheme: 'complementary',
          contrastLevel: 'high',
          emotionalTone: 'professional',
        },
      };

      const sanitized = sanitizeExtractedPattern(pattern);
      expect(sanitized.layoutPattern?.structure).toBe('hero-top');
      expect(sanitized.colorPsychology?.dominantMood).toBe('trust');
    });

    it('redacts content that looks like ad copy', () => {
      const pattern: ExtractedPatternData = {
        layoutPattern: {
          structure: 'Get 50% OFF TODAY ONLY! Limited time offer!',
          visualHierarchy: ['image'],
          whitespaceUsage: 'minimal',
          focalPointPosition: 'center',
        },
      };

      const sanitized = sanitizeExtractedPattern(pattern);
      expect(sanitized.layoutPattern?.structure).toBe('[content redacted - pattern only]');
    });

    it('redacts dollar amounts', () => {
      const pattern: ExtractedPatternData = {
        hookPatterns: {
          hookType: 'Save $100 on your first order',
          headlineFormula: 'number-list',
          ctaStyle: 'direct',
          persuasionTechnique: 'scarcity',
        },
      };

      const sanitized = sanitizeExtractedPattern(pattern);
      expect(sanitized.hookPatterns?.hookType).toBe('[content redacted - pattern only]');
    });

    it('redacts percentages in marketing copy', () => {
      const pattern: ExtractedPatternData = {
        hookPatterns: {
          hookType: '70% of customers prefer this over competitors',
          headlineFormula: 'social-proof',
          ctaStyle: 'soft',
          persuasionTechnique: 'social-proof',
        },
      };

      const sanitized = sanitizeExtractedPattern(pattern);
      expect(sanitized.hookPatterns?.hookType).toBe('[content redacted - pattern only]');
    });

    it('preserves enum values unchanged', () => {
      const pattern: ExtractedPatternData = {
        visualElements: {
          imageStyle: 'photography',
          humanPresence: true,
          productVisibility: 'prominent',
          iconography: false,
          backgroundType: 'gradient',
        },
      };

      const sanitized = sanitizeExtractedPattern(pattern);
      expect(sanitized.visualElements?.imageStyle).toBe('photography');
      expect(sanitized.visualElements?.humanPresence).toBe(true);
      expect(sanitized.visualElements?.productVisibility).toBe('prominent');
    });
  });
});

describe('Pattern Prompt Formatting', () => {
  it('returns empty string for empty patterns', () => {
    const result = formatPatternsForPrompt([]);
    expect(result).toBe('');
  });

  it('formats single pattern correctly', () => {
    const patterns: LearnedAdPattern[] = [
      {
        id: 'test-id',
        userId: 'user-1',
        name: 'High-Converting Layout',
        category: 'product_showcase',
        platform: 'instagram',
        industry: 'E-commerce',
        layoutPattern: {
          structure: 'hero-top',
          visualHierarchy: ['image', 'headline', 'cta'],
          whitespaceUsage: 'balanced',
          focalPointPosition: 'center',
        },
        colorPsychology: {
          dominantMood: 'trust',
          colorScheme: 'complementary',
          contrastLevel: 'high',
          emotionalTone: 'professional',
        },
        hookPatterns: null,
        visualElements: null,
        engagementTier: 'top-5',
        confidenceScore: 0.9,
        sourceHash: 'abc123',
        usageCount: 5,
        lastUsedAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = formatPatternsForPrompt(patterns);
    expect(result).toContain('LEARNED SUCCESS PATTERNS');
    expect(result).toContain('High-Converting Layout');
    expect(result).toContain('hero-top');
    expect(result).toContain('trust');
    expect(result).toContain('top 5 percentile');
  });

  it('formats multiple patterns with numbering', () => {
    const patterns: LearnedAdPattern[] = [
      {
        id: 'test-1',
        userId: 'user-1',
        name: 'Pattern One',
        category: 'product_showcase',
        platform: 'instagram',
        industry: null,
        layoutPattern: { structure: 'hero-top', visualHierarchy: [], whitespaceUsage: 'balanced', focalPointPosition: 'center' },
        colorPsychology: null,
        hookPatterns: null,
        visualElements: null,
        engagementTier: null,
        confidenceScore: 0.8,
        sourceHash: 'hash1',
        usageCount: 0,
        lastUsedAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'test-2',
        userId: 'user-1',
        name: 'Pattern Two',
        category: 'testimonial',
        platform: 'linkedin',
        industry: null,
        layoutPattern: { structure: 'split-50-50', visualHierarchy: [], whitespaceUsage: 'generous', focalPointPosition: 'left-third' },
        colorPsychology: null,
        hookPatterns: null,
        visualElements: null,
        engagementTier: null,
        confidenceScore: 0.7,
        sourceHash: 'hash2',
        usageCount: 0,
        lastUsedAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];

    const result = formatPatternsForPrompt(patterns);
    expect(result).toContain('Pattern 1:');
    expect(result).toContain('Pattern 2:');
    expect(result).toContain('Pattern One');
    expect(result).toContain('Pattern Two');
  });
});
