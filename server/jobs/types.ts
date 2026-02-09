/**
 * Job Types for BullMQ Queue Processing
 *
 * Defines TypeScript interfaces for all job types used in the generation queue.
 * These types ensure type safety when enqueuing and processing jobs.
 */

/**
 * Enumeration of all supported job types
 */
export enum JobType {
  /** Generate a new image from a text prompt */
  GENERATE = 'generate',
  /** Edit an existing image based on edit instructions */
  EDIT = 'edit',
  /** Create a variation of an existing image */
  VARIATION = 'variation',
  /** Generate ad copy text */
  COPY = 'copy',
}

/**
 * Status values for job tracking
 */
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

/**
 * Base interface for all job data
 */
export interface BaseJobData {
  /** Type of job to execute */
  jobType: JobType;
  /** User ID who initiated the job */
  userId: string;
  /** Database generation ID for tracking (UUID string) */
  generationId: string;
  /** Timestamp when job was created */
  createdAt: string;
}

/**
 * Job data for generating new images
 */
export interface GenerateJobData extends BaseJobData {
  jobType: JobType.GENERATE;
  /** Text prompt for image generation */
  prompt: string;
  /** Optional aspect ratio (default: 1:1) */
  aspectRatio?: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  /** Optional style preset */
  style?: string;
  /** Optional negative prompt */
  negativePrompt?: string;
}

/**
 * Job data for editing existing images
 */
export interface EditJobData extends BaseJobData {
  jobType: JobType.EDIT;
  /** Instructions for how to edit the image */
  editPrompt: string;
  /** URL of the original image to edit */
  originalImageUrl: string;
  /** Optional mask URL for inpainting */
  maskUrl?: string;
}

/**
 * Job data for creating image variations
 */
export interface VariationJobData extends BaseJobData {
  jobType: JobType.VARIATION;
  /** URL of the original image to create variation from */
  originalImageUrl: string;
  /** How much to vary from original (0.0 - 1.0) */
  variationStrength?: number;
  /** Optional additional prompt guidance */
  prompt?: string;
}

/**
 * Job data for generating ad copy
 */
export interface CopyJobData extends BaseJobData {
  jobType: JobType.COPY;
  /** Product or service description */
  productDescription: string;
  /** Target platform for the copy */
  platform: 'instagram' | 'linkedin' | 'facebook' | 'twitter' | 'tiktok';
  /** Desired tone of the copy */
  tone?: string;
  /** Number of variations to generate */
  variations?: number;
}

/**
 * Union type of all possible job data types
 */
export type GenerationJobData =
  | GenerateJobData
  | EditJobData
  | VariationJobData
  | CopyJobData;

/**
 * Result returned when a job completes successfully
 */
export interface GenerationJobResult {
  /** Database generation ID (UUID string) */
  generationId: string;
  /** Final status of the job */
  status: JobStatus.COMPLETED | JobStatus.FAILED;
  /** URL of the generated/edited image (if successful) */
  imageUrl?: string;
  /** Cloudinary public ID for the stored image */
  cloudinaryPublicId?: string;
  /** Generated ad copy text (for copy jobs) */
  copyText?: string;
  /** Error message (if failed) */
  error?: string;
  /** Processing time in milliseconds */
  processingTimeMs?: number;
  /** Timestamp when job completed */
  completedAt: string;
}

/**
 * Progress update emitted during job processing
 */
export interface JobProgress {
  /** Current stage of processing */
  stage: 'queued' | 'starting' | 'processing' | 'uploading' | 'finalizing';
  /** Progress percentage (0-100) */
  percentage: number;
  /** Human-readable status message */
  message: string;
}

/**
 * Options for configuring job behavior
 */
export interface JobOptions {
  /** Job priority (lower = higher priority). Default: 10 */
  priority?: number;
  /** Number of retry attempts on failure. Default: 3 */
  attempts?: number;
  /** Backoff strategy for retries */
  backoff?: {
    type: 'exponential' | 'fixed';
    delay: number;
  };
  /** Job timeout in milliseconds. Default: 120000 (2 min) */
  timeout?: number;
  /** Remove job from queue after completion */
  removeOnComplete?: boolean | { count: number };
  /** Remove job from queue after failure */
  removeOnFail?: boolean | { count: number };
}

/**
 * Default job options for generation jobs
 */
export const DEFAULT_JOB_OPTIONS: JobOptions = {
  priority: 10,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // Start with 5 second delay
  },
  timeout: 120000, // 2 minutes
  removeOnComplete: { count: 100 }, // Keep last 100 completed jobs
  removeOnFail: { count: 50 }, // Keep last 50 failed jobs
};

/**
 * Queue names used in the application
 */
export const QUEUE_NAMES = {
  GENERATION: 'generation-jobs',
  DEAD_LETTER: 'dead-letter-jobs',
} as const;

/**
 * Data stored in the dead letter queue for failed jobs
 */
export interface DeadLetterJobData {
  /** Original queue the job came from */
  originalQueue: string;
  /** Original job ID */
  jobId: string;
  /** Original job data */
  jobData: GenerationJobData;
  /** Error message from the failure */
  error: string;
  /** Error stack trace if available */
  stackTrace?: string;
  /** Timestamp when the job was moved to DLQ */
  failedAt: string;
  /** Number of attempts made before failure */
  attempts: number;
  /** Maximum attempts configured */
  maxAttempts: number;
}

/**
 * Type guard to check if job data is a GenerateJobData
 */
export function isGenerateJob(data: GenerationJobData): data is GenerateJobData {
  return data.jobType === JobType.GENERATE;
}

/**
 * Type guard to check if job data is an EditJobData
 */
export function isEditJob(data: GenerationJobData): data is EditJobData {
  return data.jobType === JobType.EDIT;
}

/**
 * Type guard to check if job data is a VariationJobData
 */
export function isVariationJob(data: GenerationJobData): data is VariationJobData {
  return data.jobType === JobType.VARIATION;
}

/**
 * Type guard to check if job data is a CopyJobData
 */
export function isCopyJob(data: GenerationJobData): data is CopyJobData {
  return data.jobType === JobType.COPY;
}
