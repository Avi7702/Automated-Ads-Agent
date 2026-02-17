/**
 * Generation DTO Transformer
 *
 * Transforms database Generation models into API-friendly GenerationDTO responses.
 * Centralizes the logic for adding derived fields like imageUrl and canEdit.
 */

import { Generation } from '@shared/schema';
import { GenerationDTO } from '@shared/types/api';

/**
 * Transform a single Generation model to GenerationDTO
 *
 * Key transformations:
 * - generatedImagePath → imageUrl (with proper URL handling)
 * - conversationHistory → canEdit (boolean)
 * - Handles both Cloudinary URLs and local paths
 */
export function toGenerationDTO(generation: Generation): GenerationDTO {
  // Smart URL handling: Cloudinary URLs start with http/https, local paths don't
  // Normalize Windows backslashes to forward slashes for URL compatibility
  const rawPath = generation.generatedImagePath || generation.imagePath || '';
  const imageUrl = rawPath.startsWith('http') ? rawPath : `/${rawPath.replace(/\\/g, '/')}`;

  return {
    id: generation.id,
    userId: generation.userId,
    prompt: generation.prompt,
    imageUrl,
    originalImagePaths: generation.originalImagePaths || [],
    resolution: generation.resolution,
    model: generation.model,
    aspectRatio: generation.aspectRatio,
    status: generation.status,
    parentGenerationId: generation.parentGenerationId,
    editPrompt: generation.editPrompt,
    editCount: generation.editCount,
    createdAt: generation.createdAt,
    updatedAt: generation.updatedAt,
    canEdit: !!generation.conversationHistory,
    productIds: generation.productIds ?? null,
    templateId: generation.templateId ?? null,
    generationMode: generation.generationMode ?? null,
  };
}

/**
 * Transform an array of Generation models to GenerationDTO array
 *
 * Used by GET /api/generations (gallery/history endpoints)
 */
export function toGenerationDTOArray(generations: Generation[]): GenerationDTO[] {
  return generations.map(toGenerationDTO);
}
