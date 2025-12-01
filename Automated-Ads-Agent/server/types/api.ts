/**
 * API Response Types for Transform and Generation endpoints
 * Task 2.4: Generate Endpoint
 */

export interface TransformResponse {
  success: true;
  generationId: string;
  imageUrl: string;
  canEdit: boolean;
}

export interface TransformErrorResponse {
  error: string;
  message?: string;
}

export interface GenerationResponse {
  id: string;
  prompt: string;
  imageUrl: string;
  aspectRatio: string;
  canEdit: boolean;
  createdAt: string;
}

export interface GenerationListResponse {
  generations: GenerationResponse[];
}

export interface EditResponse {
  success: true;
  generationId: string;
  imageUrl: string;
  canEdit: boolean;
}
