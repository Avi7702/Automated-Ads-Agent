/**
 * API Response DTOs (Data Transfer Objects)
 *
 * These interfaces define the shape of data returned by API endpoints.
 * They differ from database models by including derived/transformed fields.
 */

/**
 * Generation API Response
 *
 * Used by:
 * - GET /api/generations (array)
 * - GET /api/generations/:id (single)
 * - POST /api/transform (single)
 * - POST /api/generations/:id/edit (single)
 */
export interface GenerationDTO {
  id: string;
  userId: string | null;
  prompt: string;
  imageUrl: string;  // Transformed from generatedImagePath (adds / prefix for local paths)
  originalImagePaths: string[];
  resolution: string | null;
  model: string | null;
  aspectRatio: string | null;
  status: string | null;
  parentGenerationId: string | null;
  editPrompt: string | null;
  editCount: number | null;
  createdAt: Date;
  updatedAt: Date;
  canEdit?: boolean;  // Derived from conversationHistory existence
}
