/**
 * Represents a temporarily uploaded image with AI analysis
 * Used for non-product images that need context before IdeaBank can use them
 */
export interface AnalyzedUpload {
  /** Temporary UUID for this upload session */
  id: string;

  /** Original browser File object */
  file: File;

  /** Object URL for preview display (created via URL.createObjectURL) */
  previewUrl: string;

  /** AI-generated description of the image content */
  description: string | null;

  /** Confidence score from AI analysis (0-100) */
  confidence: number;

  /** Current status of the upload */
  status: 'analyzing' | 'confirmed';

  /** UI state: whether user is currently editing the description */
  isEditing?: boolean;

  /** Whether this upload is selected for generation */
  selected?: boolean;
}

/** Threshold for auto-confirming high-confidence analyses */
export const AUTO_CONFIRM_THRESHOLD = 85;

/** Response from the /api/analyze-image endpoint */
export interface ImageAnalysisResponse {
  description: string;
  confidence: number;
}
