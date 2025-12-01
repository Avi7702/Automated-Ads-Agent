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

// Type exports for use in routes
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ProductInput = z.infer<typeof productSchema>;
export type TransformInput = z.infer<typeof transformSchema>;
export type EditInput = z.infer<typeof editSchema>;
