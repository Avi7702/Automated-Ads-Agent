import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'Email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email('Invalid email format'),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

export const verifyEmailSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export const productSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().trim().max(2000, 'Description too long').optional(),
  imageUrl: z.string().url().optional(),
});

export const transformSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt is required').max(2000, 'Prompt too long'),
  referenceImages: z.array(z.string().min(1, 'Image data required')).optional(),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional().default('1:1'),
});

export const editSchema = z.object({
  prompt: z.string().trim().min(1, 'Prompt is required').max(500, 'Edit prompt too long'),
  maskData: z.string().optional(),
});

export const generateCopySchema = z.object({
  generationId: z.string().uuid('Invalid generation ID'),

  // Required fields
  platform: z.enum(['instagram', 'linkedin', 'twitter', 'facebook', 'tiktok'], {
    error: 'Platform must be one of: instagram, linkedin, twitter, facebook, tiktok',
  }),
  tone: z.enum(['professional', 'casual', 'technical', 'urgent', 'minimal', 'authentic'], {
    error: 'Tone must be one of: professional, casual, technical, urgent, minimal, authentic',
  }),
  productName: z.string().trim().min(1, 'Product name is required').max(100, 'Product name too long'),
  productDescription: z
    .string()
    .trim()
    .min(10, 'Product description must be at least 10 characters')
    .max(500, 'Product description too long'),
  industry: z.string().trim().min(1, 'Industry is required').max(100, 'Industry name too long'),

  // Optional campaign context
  framework: z.enum(['aida', 'pas', 'bab', 'fab', 'auto']).optional(),
  campaignObjective: z.enum(['awareness', 'consideration', 'conversion', 'engagement']).optional(),
  variations: z
    .number()
    .int()
    .min(1, 'Must generate at least 1 variation')
    .max(5, 'Maximum 5 variations allowed')
    .default(3),

  // Optional product details
  productBenefits: z.array(z.string().trim().min(1).max(200)).max(5, 'Maximum 5 benefits allowed').optional(),
  uniqueValueProp: z.string().trim().max(200, 'Unique value proposition too long').optional(),

  // Optional audience
  targetAudience: z
    .object({
      demographics: z.string().trim().max(200, 'Demographics too long'),
      psychographics: z.string().trim().max(200, 'Psychographics too long'),
      painPoints: z.array(z.string().trim().min(1).max(100)).max(5, 'Maximum 5 pain points allowed'),
    })
    .optional(),

  // Optional brand voice
  brandVoice: z
    .object({
      principles: z
        .array(z.string().trim().min(1).max(50))
        .min(1, 'At least 1 principle required')
        .max(4, 'Maximum 4 principles allowed'),
      wordsToAvoid: z.array(z.string().trim().min(1).max(50)).max(20, 'Maximum 20 words to avoid').optional(),
      wordsToUse: z.array(z.string().trim().min(1).max(50)).max(20, 'Maximum 20 words to use').optional(),
    })
    .optional(),

  // Optional social proof
  socialProof: z
    .object({
      testimonial: z.string().trim().max(300, 'Testimonial too long').optional(),
      stats: z.string().trim().max(100, 'Stats too long').optional(),
    })
    .optional(),
});

// API Key Management schemas
export const saveApiKeySchema = z.object({
  apiKey: z.string().min(1, 'API key is required'),
  cloudName: z.string().optional(),
  apiSecret: z.string().optional(),
});

// ========================================
// n8n CONFIGURATION VAULT
// ========================================

export const saveN8nConfigSchema = z.object({
  baseUrl: z
    .string()
    .url('Invalid n8n instance URL')
    .refine((url) => url.startsWith('https://'), { message: 'n8n URL must use HTTPS in production' }),
  apiKey: z.string().min(10, 'API key must be at least 10 characters').optional(),
});

export type SaveN8nConfigInput = z.infer<typeof saveN8nConfigSchema>;

// ========================================
// SOCIAL CONNECTIONS - n8n INTEGRATION
// ========================================

export const n8nCallbackSchema = z.object({
  scheduledPostId: z.string().min(1, 'Post ID is required'),
  platform: z.enum(['linkedin', 'instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'pinterest']),
  success: z.boolean(),
  platformPostId: z.string().optional(),
  platformPostUrl: z.preprocess((val) => (val === '' ? undefined : val), z.string().url().optional()),
  error: z.string().optional(),
  errorCode: z.string().optional(),
  executionId: z.string().min(1, 'Execution ID required'),
  postedAt: z.string().datetime().optional(),
});

export const syncAccountSchema = z.object({
  platform: z.enum(['linkedin', 'instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'pinterest']),
  n8nCredentialId: z.string().min(1, 'n8n credential ID required'),
  platformUserId: z.string().min(1, 'Platform user ID required'),
  platformUsername: z.string().min(1, 'Platform username required'),
  accountType: z.enum(['personal', 'business', 'page']).optional(),
});

export type N8nCallbackInput = z.infer<typeof n8nCallbackSchema>;
export type SyncAccountInput = z.infer<typeof syncAccountSchema>;

// ============================================
// GENERATION PERFORMANCE WEBHOOK (Phase 5)
// ============================================

export const performanceWebhookSchema = z.object({
  generationId: z.string().min(1, 'Generation ID is required'),
  platform: z.enum(['linkedin', 'instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'pinterest']),
  impressions: z.number().int().min(0).optional().default(0),
  engagementRate: z.number().min(0).max(100).optional().default(0),
  clicks: z.number().int().min(0).optional().default(0),
  conversions: z.number().int().min(0).optional().default(0),
});

export type PerformanceWebhookInput = z.infer<typeof performanceWebhookSchema>;

// ============================================
// LEARN FROM WINNERS - PATTERN SCHEMAS
// ============================================

// Category and platform enums for patterns
const patternCategoryEnum = z.enum([
  'product_showcase',
  'testimonial',
  'comparison',
  'educational',
  'promotional',
  'brand_awareness',
]);

const patternPlatformEnum = z.enum([
  'linkedin',
  'facebook',
  'instagram',
  'twitter',
  'tiktok',
  'youtube',
  'pinterest',
  'general',
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
  productIds: z
    .array(z.string().uuid('Invalid product ID'))
    .min(1, 'At least one product required')
    .max(6, 'Maximum 6 products allowed'),
  targetPlatform: z.enum(['linkedin', 'facebook', 'instagram', 'twitter', 'tiktok']),
  aspectRatio: z.enum(['1:1', '16:9', '9:16', '4:3', '3:4']).optional().default('1:1'),
  customizations: z
    .object({
      adjustColorMood: z.string().max(50).optional(),
      emphasizeElement: z.string().max(100).optional(),
    })
    .optional(),
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
  isActive: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'Limit must be 1-100')
    .optional(),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 0, 'Offset must be non-negative')
    .optional(),
});

// ============================================
// QUERY PARAMETER SCHEMAS (GET endpoints)
// ============================================

/** Reusable pagination params */
const paginationParams = {
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 200, 'Limit must be 1-200')
    .optional(),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 0, 'Offset must be non-negative')
    .optional(),
};

/** GET /api/generations */
export const generationsListQuerySchema = z.object({
  ...paginationParams,
});

/** GET /api/admin/dead-letter-queue */
export const adminDlqQuerySchema = z.object({
  start: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 0)
    .optional(),
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'Limit must be 1-100')
    .optional(),
});

/** GET /api/approval-queue */
export const approvalQueueQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'all']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  dateFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/)
    .optional(),
  dateTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/)
    .optional(),
});

/** GET /api/catalog/files */
export const catalogFilesQuerySchema = z.object({
  category: z.string().trim().max(100).optional(),
});

/** GET /api/planning/posts */
export const planningPostsQuerySchema = z.object({
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Must be YYYY-MM-DD format')
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}/, 'Must be YYYY-MM-DD format')
    .optional(),
});

/** GET /api/templates */
export const templatesListQuerySchema = z.object({
  category: z.string().trim().max(100).optional(),
  isGlobal: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
});

/** GET /api/templates/search */
export const templatesSearchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Search query required').max(200, 'Query too long'),
});

/** GET /api/products/enrichment/pending */
export const productsEnrichmentQuerySchema = z.object({
  status: z.enum(['pending', 'in_progress', 'complete', 'failed']).optional(),
});

/** GET /api/monitoring/errors */
export const monitoringErrorsQuerySchema = z.object({
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 100, 'Limit must be 1-100')
    .optional(),
});

// ============================================
// CONTENT PLANNER SCHEMAS
// ============================================

/**
 * Schema for generating a complete post (copy + image)
 * Used by /api/content-planner/generate-post endpoint
 */
export const generateCompletePostSchema = z.object({
  templateId: z.string().min(1, 'Template ID is required'),
  productIds: z.array(z.string()).default([]),
  topic: z.string().trim().max(500, 'Topic too long').optional(),
  platform: z.enum(['instagram', 'linkedin', 'facebook', 'twitter', 'tiktok']).default('linkedin'),
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

// Content Planner types
export type GenerateCompletePostInput = z.infer<typeof generateCompletePostSchema>;
