/**
 * Zod contracts for Generation API endpoints
 *
 * GET /api/generations → ListGenerationsResponse (array of GenerationDTO)
 * GET /api/generations/:id → GenerationDTO
 * POST /api/transform → TransformResponse
 */
import { z } from 'zod';

/**
 * GenerationDTO — matches the shape returned by toGenerationDTO()
 * See server/dto/generationDTO.ts and shared/types/api.ts
 */
export const GenerationDTO = z
  .object({
    id: z.string(),
    userId: z.string().nullable(),
    prompt: z.string(),
    imageUrl: z.string(),
    originalImagePaths: z.array(z.string()),
    resolution: z.string().nullable(),
    model: z.string().nullable(),
    aspectRatio: z.string().nullable(),
    status: z.string().nullable(),
    parentGenerationId: z.string().nullable(),
    editPrompt: z.string().nullable(),
    editCount: z.number().nullable(),
    createdAt: z.string().or(z.date()),
    updatedAt: z.string().or(z.date()),
    canEdit: z.boolean().optional(),
    productIds: z.array(z.string()).nullable().optional(),
    templateId: z.string().nullable().optional(),
    generationMode: z.string().nullable().optional(),
  })
  .passthrough();

export type GenerationDTO = z.infer<typeof GenerationDTO>;

/**
 * ListGenerationsResponse — GET /api/generations returns a plain array of GenerationDTO
 */
export const ListGenerationsResponse = z.array(GenerationDTO);
export type ListGenerationsResponse = z.infer<typeof ListGenerationsResponse>;

/**
 * TransformResponse — POST /api/transform success response
 * See server/routes.ts around line 700
 */
export const TransformResponse = z
  .object({
    // Keep this tolerant: transform payloads vary in mocks and queue paths.
    success: z.boolean().optional(),
    imageUrl: z.string().optional(),
    generationId: z.string().optional(),
    prompt: z.string().optional(),
    canEdit: z.boolean().optional(),
    mode: z.string().optional(),
    templateId: z.string().nullable().optional(),
    stagesCompleted: z.array(z.string()).optional(),
  })
  .passthrough();

export type TransformResponse = z.infer<typeof TransformResponse>;
