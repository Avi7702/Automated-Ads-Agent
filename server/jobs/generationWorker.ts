/**
 * Generation Worker
 *
 * BullMQ worker processor for async generation jobs.
 * Handles generate, edit, and variation job types.
 *
 * This worker:
 * 1. Updates generation status to 'processing'
 * 2. Calls appropriate Gemini service method
 * 3. Uploads result to Cloudinary
 * 4. Updates generation with result or error
 * 5. Reports progress throughout processing
 */

import { Job } from 'bullmq';
import { v2 as cloudinary } from 'cloudinary';
import { storage } from '../storage';
import { geminiService } from '../services/geminiService';
import { logger } from '../lib/logger';
import {
  GenerationJobData,
  GenerationJobResult,
  JobType,
  JobStatus,
  JobProgress,
  isGenerateJob,
  isEditJob,
  isVariationJob,
} from './types';

// Cloudinary folder for generated images
const CLOUDINARY_FOLDER = 'automated-ads/generations';

/**
 * Report progress during job processing
 */
async function reportProgress(
  job: Job<GenerationJobData, GenerationJobResult>,
  stage: JobProgress['stage'],
  percentage: number,
  message: string
): Promise<void> {
  const progress: JobProgress = { stage, percentage, message };
  await job.updateProgress(progress);
  logger.debug(
    { jobId: job.id, ...progress },
    `Job progress: ${message}`
  );
}

/**
 * Upload base64 image to Cloudinary
 */
async function uploadToCloudinary(
  base64Data: string,
  generationId: string
): Promise<{ secure_url: string; public_id: string }> {
  const dataUri = `data:image/png;base64,${base64Data}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: CLOUDINARY_FOLDER,
    public_id: `generation-${generationId}-${Date.now()}`,
    resource_type: 'image',
  });

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
  };
}

/**
 * Process a generate job - create new image from prompt
 */
async function processGenerateJob(
  job: Job<GenerationJobData, GenerationJobResult>,
  data: GenerationJobData & { jobType: JobType.GENERATE }
): Promise<{ imageBase64: string; conversationHistory: any[] }> {
  await reportProgress(job, 'processing', 30, 'Generating image with AI...');

  const result = await geminiService.generateImage(
    data.prompt,
    {
      aspectRatio: data.aspectRatio,
      referenceImages: undefined,
    },
    data.userId
  );

  return {
    imageBase64: result.imageBase64,
    conversationHistory: result.conversationHistory,
  };
}

/**
 * Process an edit job - edit existing image with new instructions
 */
async function processEditJob(
  job: Job<GenerationJobData, GenerationJobResult>,
  data: GenerationJobData & { jobType: JobType.EDIT },
  existingGeneration: { conversationHistory: any[] | null; editCount?: number }
): Promise<{ imageBase64: string; conversationHistory: any[]; editCount: number }> {
  await reportProgress(job, 'processing', 30, 'Editing image with AI...');

  if (!existingGeneration.conversationHistory) {
    throw new Error('Edit job requires existing conversation history');
  }

  const result = await geminiService.continueConversation(
    existingGeneration.conversationHistory,
    data.editPrompt,
    data.userId
  );

  return {
    imageBase64: result.imageBase64,
    conversationHistory: result.conversationHistory,
    editCount: (existingGeneration.editCount || 0) + 1,
  };
}

/**
 * Process a variation job - create variation of existing image
 */
async function processVariationJob(
  job: Job<GenerationJobData, GenerationJobResult>,
  data: GenerationJobData & { jobType: JobType.VARIATION },
  existingGeneration: { conversationHistory: any[] | null; prompt?: string }
): Promise<{ imageBase64: string; conversationHistory: any[] }> {
  await reportProgress(job, 'processing', 30, 'Creating image variation...');

  // Extract the original image data from conversation history
  const referenceImages: string[] = [];
  if (existingGeneration.conversationHistory) {
    for (const msg of existingGeneration.conversationHistory) {
      if (msg.role === 'model' && msg.parts) {
        for (const part of msg.parts) {
          if (part.inlineData?.data) {
            referenceImages.push(part.inlineData.data);
            break;
          }
        }
      }
    }
  }

  // Create variation prompt
  const variationPrompt = data.prompt ||
    `Create a variation of the original image. Variation strength: ${data.variationStrength || 0.5}. Keep the same subject but vary the style, composition, or details.`;

  const result = await geminiService.generateImage(
    variationPrompt,
    {
      referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
      aspectRatio: undefined,
    },
    data.userId
  );

  return {
    imageBase64: result.imageBase64,
    conversationHistory: result.conversationHistory,
  };
}

/**
 * Main job processor function
 *
 * Processes generation jobs from the BullMQ queue.
 * Handles generate, edit, and variation job types.
 */
export async function processGenerationJob(
  job: Job<GenerationJobData, GenerationJobResult>
): Promise<GenerationJobResult> {
  const startTime = Date.now();
  const { data } = job;
  const { generationId, jobType, userId } = data;

  logger.info(
    { jobId: job.id, generationId, jobType, userId },
    'Starting generation job processing'
  );

  try {
    // Stage 1: Starting - verify generation exists
    await reportProgress(job, 'starting', 0, 'Initializing job...');

    const existingGeneration = await storage.getGenerationById(generationId);
    if (!existingGeneration) {
      throw new Error(`Generation not found: ${generationId}`);
    }

    // Stage 2: Update status to processing
    await reportProgress(job, 'starting', 10, 'Updating status...');
    await storage.updateGeneration(generationId, { status: 'processing' });

    // Stage 3: Process based on job type
    let processResult: {
      imageBase64: string;
      conversationHistory: any[];
      editCount?: number;
    };

    if (isGenerateJob(data)) {
      processResult = await processGenerateJob(job, data);
    } else if (isEditJob(data)) {
      processResult = await processEditJob(job, data, existingGeneration);
    } else if (isVariationJob(data)) {
      processResult = await processVariationJob(job, data, existingGeneration);
    } else {
      throw new Error(`Unknown job type: ${jobType}`);
    }

    // Stage 4: Upload to Cloudinary
    await reportProgress(job, 'uploading', 70, 'Uploading image...');
    const cloudinaryResult = await uploadToCloudinary(
      processResult.imageBase64,
      generationId
    );

    // Stage 5: Update generation record
    await reportProgress(job, 'finalizing', 90, 'Saving results...');

    const updateData: Record<string, any> = {
      status: 'completed',
      generatedImagePath: cloudinaryResult.secure_url,
      conversationHistory: processResult.conversationHistory,
    };

    if (processResult.editCount !== undefined) {
      updateData.editCount = processResult.editCount;
    }

    await storage.updateGeneration(generationId, updateData);

    // Stage 6: Complete
    await reportProgress(job, 'finalizing', 100, 'Job completed successfully');

    const processingTimeMs = Date.now() - startTime;

    logger.info(
      { jobId: job.id, generationId, processingTimeMs },
      'Generation job completed successfully'
    );

    return {
      generationId,
      status: JobStatus.COMPLETED,
      imageUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      processingTimeMs,
      completedAt: new Date().toISOString(),
    };
  } catch (error) {
    const processingTimeMs = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error(
      { jobId: job.id, generationId, error: errorMessage, processingTimeMs },
      'Generation job failed'
    );

    // Update generation status to failed
    try {
      await storage.updateGeneration(generationId, {
        status: 'failed',
      });
    } catch (updateError) {
      logger.error(
        { jobId: job.id, generationId, error: updateError },
        'Failed to update generation status to failed'
      );
    }

    return {
      generationId,
      status: JobStatus.FAILED,
      error: errorMessage,
      processingTimeMs,
      completedAt: new Date().toISOString(),
    };
  }
}
