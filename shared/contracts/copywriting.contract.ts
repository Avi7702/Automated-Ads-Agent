/**
 * Zod contracts for Copywriting API endpoints
 *
 * POST /api/copywriting/generate → GenerateCopyResponse
 * POST /api/copywriting/standalone → similar shape
 */
import { z } from 'zod';

/**
 * QualityScore — nested object in saved ad copy
 */
export const QualityScoreDTO = z
  .object({
    clarity: z.number(),
    persuasiveness: z.number(),
    platformFit: z.number(),
    brandAlignment: z.number(),
    overallScore: z.number(),
    reasoning: z.string(),
  })
  .passthrough();

export type QualityScoreDTO = z.infer<typeof QualityScoreDTO>;

/**
 * CharacterCounts — character count metadata
 */
export const CharacterCountsDTO = z
  .object({
    headline: z.number(),
    hook: z.number().optional(),
    body: z.number(),
    caption: z.number(),
    total: z.number(),
  })
  .passthrough();

export type CharacterCountsDTO = z.infer<typeof CharacterCountsDTO>;

/**
 * CopyVariationDTO — a saved ad copy record from the database
 * Matches the `adCopy` table shape returned by storage.saveAdCopy()
 */
export const CopyVariationDTO = z
  .object({
    id: z.string(),
    generationId: z.string(),
    userId: z.string(),
    headline: z.string(),
    hook: z.string(),
    bodyText: z.string(),
    cta: z.string(),
    caption: z.string(),
    hashtags: z.array(z.string()),
    platform: z.string(),
    tone: z.string(),
    framework: z.string().nullable().optional(),
    campaignObjective: z.string().nullable().optional(),
    productName: z.string(),
    productDescription: z.string(),
    productBenefits: z.array(z.string()).nullable().optional(),
    uniqueValueProp: z.string().nullable().optional(),
    industry: z.string(),
    targetAudience: z.unknown().nullable().optional(),
    brandVoice: z.unknown().nullable().optional(),
    socialProof: z.unknown().nullable().optional(),
    qualityScore: QualityScoreDTO.nullable().optional(),
    characterCounts: CharacterCountsDTO.nullable().optional(),
    variationNumber: z.number().nullable().optional(),
    parentCopyId: z.string().nullable().optional(),
    createdAt: z.string().or(z.date()),
  })
  .passthrough();

export type CopyVariationDTO = z.infer<typeof CopyVariationDTO>;

/**
 * GenerateCopyResponse — POST /api/copywriting/generate success response
 * Returns { success: true, copies: AdCopy[], recommended: number }
 */
export const GenerateCopyResponse = z
  .object({
    success: z.literal(true),
    copies: z.array(CopyVariationDTO),
    recommended: z.number(),
  })
  .passthrough();

export type GenerateCopyResponse = z.infer<typeof GenerateCopyResponse>;
