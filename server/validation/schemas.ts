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
    errorMap: () => ({ message: 'Platform must be one of: instagram, linkedin, twitter, facebook, tiktok' })
  }),
  tone: z.enum(['professional', 'casual', 'fun', 'luxury', 'minimal', 'authentic'], {
    errorMap: () => ({ message: 'Tone must be one of: professional, casual, fun, luxury, minimal, authentic' })
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

// Type exports for use in routes
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type TransformInput = z.infer<typeof transformSchema>;
export type EditInput = z.infer<typeof editSchema>;
export type GenerateCopyInput = z.infer<typeof generateCopySchema>;
