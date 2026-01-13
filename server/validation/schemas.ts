import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required')
});

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().trim().max(2000, 'Description too long').optional(),
  imageUrl: z.string().url().optional()
});

export const transformSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt is required').max(2000, 'Prompt too long'),
  referenceImages: z.array(z.string().min(1, 'Image data required')).optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional().default('1:1')
});

export const editSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt is required').max(500, 'Edit prompt too long'),
  maskData: z.string().optional()
});

export const generateCopySchema = z.object({
  generationId: z.string().uuid('Invalid generation ID'),

  // Required fields
  platform: z.enum(['instagram', 'linkedin', 'twitter', 'facebook', 'tiktok'], {
    error: 'Platform must be one of: instagram, linkedin, twitter, facebook, tiktok'
  }),
  tone: z.enum(['professional', 'casual', 'technical', 'urgent', 'minimal', 'authentic'], {
    error: 'Tone must be one of: professional, casual, technical, urgent, minimal, authentic'
  }),
  productName: z.string().trim().min(1, 'Product name is required').max(100, 'Product name too long'),
  productDescription: z.string().trim().min(10, 'Product description must be at least 10 characters').max(500, 'Product description too long'),
  industry: z.string().trim().min(1, 'Industry is required').max(100, 'Industry name too long'),

  // Optional campaign context
  framework: z.enum(['aida', 'pas', 'bab', 'fab', 'auto']).optional(),
  campaignObjective: z.enum(['awareness', 'consideration', 'conversion', 'engagement']).optional(),
  variations: z.number().int().min(1, 'Must generate at least 1 variation').max(5, 'Maximum 5 variations allowed').default(3),

  // Optional product details
  productBenefits: z.array(z.string().trim().min(1).max(200)).max(5, 'Maximum 5 benefits allowed').optional(),
  uniqueValueProp: z.string().trim().max(200, 'Unique value proposition too long').optional(),

  // Optional audience
  targetAudience: z.object({
    demographics: z.string().trim().max(200, 'Demographics too long'),
    psychographics: z.string().trim().max(200, 'Psychographics too long'),
    painPoints: z.array(z.string().trim().min(1).max(100)).max(5, 'Maximum 5 pain points allowed'),
  }).optional(),

  // Optional brand voice
  brandVoice: z.object({
    principles: z.array(z.string().trim().min(1).max(50)).min(1, 'At least 1 principle required').max(4, 'Maximum 4 principles allowed'),
    wordsToAvoid: z.array(z.string().trim().min(1).max(50)).max(20, 'Maximum 20 words to avoid').optional(),
    wordsToUse: z.array(z.string().trim().min(1).max(50)).max(20, 'Maximum 20 words to use').optional(),
  }).optional(),

  // Optional social proof
  socialProof: z.object({
    testimonial: z.string().trim().max(300, 'Testimonial too long').optional(),
    stats: z.string().trim().max(100, 'Stats too long').optional(),
  }).optional(),
});

// API Key Management schemas
export const saveApiKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  cloudName: z.string().optional(),
  apiSecret: z.string().optional(),
});

// ============================================
// LEARN FROM WINNERS - PATTERN SCHEMAS
// ============================================

// Category and platform enums for patterns
const patternCategoryEnum = z.enum([
  'product_showcase', 'testimonial', 'comparison', 'educational', 'promotional', 'brand_awareness'
]);

const patternPlatformEnum = z.enum([
  'linkedin', 'facebook', 'instagram', 'twitter', 'tiktok', 'youtube', 'pinterest', 'general'
]);

const patternEngagementTierEnum = z.enum(['top-1', 'top-5', 'top-10', 'top-25', 'unverified']);

/**
 * Schema for uploading an ad image for pattern extraction
 * File is handled by multer, this validates the metadata
 */
export const uploadPatternSchema = z.object({
  // Required name for the pattern
  name: z.string().trim().min(1, 'Pattern name is required').max(100, 'Name too long'),

  // Required categorization
  category: patternCategoryEnum,
  platform: patternPlatformEnum,

  // Optional industry context
  industry: z.string().trim().max(100, 'Industry name too long').optional(),

  // Optional engagement tier (user-provided estimate)
  engagementTier: patternEngagementTierEnum.optional(),
});

/**
 * Schema for updating an existing pattern
 */
export const updatePatternSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  category: patternCategoryEnum.optional(),
  platform: patternPlatformEnum.optional(),
  industry: z.string().trim().max(100).optional(),
  engagementTier: patternEngagementTierEnum.optional(),
  isActive: z.boolean().optional(),
});

/**
 * Schema for applying a pattern to ad generation
 */
export const applyPatternSchema = z.object({
  productIds: z.array(z.string().uuid('Invalid product ID')).min(1, 'At least one product required').max(6, 'Maximum 6 products allowed'),
  targetPlatform: z.enum(['linkedin', 'facebook', 'instagram', 'twitter', 'tiktok']),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional().default('1:1'),
  customizations: z.object({
    adjustColorMood: z.string().max(50).optional(),
    emphasizeElement: z.string().max(100).optional(),
  }).optional(),
});

/**
 * Schema for rating pattern effectiveness
 */
export const ratePatternSchema = z.object({
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  wasUsed: z.boolean(),
  feedback: z.string().trim().max(500, 'Feedback too long').optional(),
});

/**
 * Query parameters for listing patterns
 */
export const listPatternsQuerySchema = z.object({
  category: patternCategoryEnum.optional(),
  platform: patternPlatformEnum.optional(),
  industry: z.string().trim().max(100).optional(),
  isActive: z.enum(['true', 'false']).transform(v => v === 'true').optional(),
  limit: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 1 && n <= 100, 'Limit must be 1-100').optional(),
  offset: z.string().regex(/^\d+$/).transform(Number).refine(n => n >= 0, 'Offset must be non-negative').optional(),
});

// Type exports for use in routes
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type TransformInput = z.infer<typeof transformSchema>;
export type EditInput = z.infer<typeof editSchema>;
export type GenerateCopyInput = z.infer<typeof generateCopySchema>;
export type SaveApiKeyInput = z.infer<typeof saveApiKeySchema>;

// Learn from Winners types
export type UploadPatternInput = z.infer<typeof uploadPatternSchema>;
export type UpdatePatternInput = z.infer<typeof updatePatternSchema>;
export type ApplyPatternInput = z.infer<typeof applyPatternSchema>;
export type RatePatternInput = z.infer<typeof ratePatternSchema>;
export type ListPatternsQuery = z.infer<typeof listPatternsQuerySchema>;
