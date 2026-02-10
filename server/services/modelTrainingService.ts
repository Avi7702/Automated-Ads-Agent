// @ts-nocheck
/**
 * Custom Model Training Service
 *
 * Manages the lifecycle of fine-tuning jobs:
 * 1. Training data curation (collect, validate, score examples)
 * 2. Dataset preparation (format for Gemini tuning API)
 * 3. Tuning job submission via @google/genai SDK
 * 4. Status polling and metrics collection
 * 5. Model version management
 *
 * The Gemini API supports supervised fine-tuning on gemini-2.5-flash.
 * Training data format: { input, output } pairs in JSONL.
 */

import { getGlobalGeminiClient } from '../lib/geminiClient';
import { logger } from '../lib/logger';

const DEFAULT_BASE_MODEL = 'models/gemini-2.5-flash-001-tuning';

export interface TrainingConfig {
  epochs?: number; // Default: 5
  learningRateMultiplier?: number; // Default: 1.0
  batchSize?: number; // Default: 4
}

export interface TrainingExample {
  input: string;
  output: string;
}

export interface TuningJobStatus {
  name: string;
  state: 'CREATING' | 'ACTIVE' | 'FAILED' | 'STATE_UNSPECIFIED';
  tunedModel?: string;
  metadata?: {
    totalSteps?: number;
    completedSteps?: number;
    completedPercent?: number;
    snapshots?: Array<{
      step: number;
      meanLoss: number;
      computeTime: string;
    }>;
  };
  error?: string;
  createTime?: string;
  updateTime?: string;
}

/**
 * Submit a fine-tuning job to the Gemini API.
 *
 * @param displayName - Human-readable name for the tuned model
 * @param examples - Training data (input/output pairs)
 * @param config - Training configuration
 * @returns The tuning job name for status polling
 */
export async function createTuningJob(
  displayName: string,
  examples: TrainingExample[],
  config: TrainingConfig = {},
): Promise<{ jobName: string; tunedModelName: string }> {
  const client = getGlobalGeminiClient();

  logger.info({ displayName, exampleCount: examples.length, config }, 'Creating tuning job');

  if (examples.length < 10) {
    throw new Error('At least 10 training examples are required for fine-tuning');
  }

  if (examples.length > 1000) {
    throw new Error('Maximum 1000 training examples per tuning job');
  }

  // Format examples for the Gemini tuning API
  const trainingData = examples.map((ex) => ({
    textInput: ex.input,
    output: ex.output,
  }));

  // Create the tuning job
  const result = await client.tunedModels.create({
    displayName,
    baseModel: DEFAULT_BASE_MODEL,
    trainingData: {
      examples: { examples: trainingData },
    },
    tuningTask: {
      hyperparameters: {
        epochCount: config.epochs || 5,
        learningRateMultiplier: config.learningRateMultiplier || 1.0,
        batchSize: config.batchSize || 4,
      },
    },
  });

  const jobName = result.name || '';
  const tunedModelName = result.metadata?.tunedModel || '';

  logger.info({ jobName, tunedModelName, displayName }, 'Tuning job created successfully');

  return { jobName, tunedModelName };
}

/**
 * Check the status of a tuning job.
 */
export async function getTuningJobStatus(jobName: string): Promise<TuningJobStatus> {
  const client = getGlobalGeminiClient();

  const operation = await client.operations.get({ name: jobName });

  const metadata = operation.metadata;
  const snapshots = metadata?.snapshots || [];

  return {
    name: jobName,
    state: operation.done ? 'ACTIVE' : 'CREATING',
    tunedModel: metadata?.tunedModel,
    metadata: {
      totalSteps: metadata?.totalSteps,
      completedSteps: metadata?.completedSteps,
      completedPercent: metadata?.completedPercent,
      snapshots: snapshots.map((s) => ({
        step: s.step,
        meanLoss: s.meanLoss,
        computeTime: s.computeTime,
      })),
    },
    error: operation.error?.message,
    createTime: metadata?.createTime,
    updateTime: metadata?.updateTime,
  };
}

/**
 * List all tuned models for the current API key.
 */
export async function listTunedModels(): Promise<
  Array<{
    name: string;
    displayName: string;
    state: string;
    baseModel: string;
    createTime: string;
  }>
> {
  const client = getGlobalGeminiClient();

  const result = await client.tunedModels.list();
  const models = [];

  for await (const model of result) {
    models.push({
      name: model.name || '',
      displayName: model.displayName || '',
      state: model.state || 'unknown',
      baseModel: model.baseModel || '',
      createTime: model.createTime || '',
    });
  }

  return models;
}

/**
 * Delete a tuned model.
 */
export async function deleteTunedModel(modelName: string): Promise<void> {
  const client = getGlobalGeminiClient();
  await client.tunedModels.delete({ name: modelName });
  logger.info({ modelName }, 'Tuned model deleted');
}

/**
 * Generate content using a tuned model.
 */
export async function generateWithTunedModel(tunedModelName: string, prompt: string): Promise<string> {
  const client = getGlobalGeminiClient();

  const response = await client.models.generateContent({
    model: tunedModelName,
    contents: prompt,
  });

  return response.text || '';
}

/**
 * Auto-curate training examples from approved generations.
 *
 * Takes high-quality approved generations and converts them
 * into input/output training pairs.
 */
export function curateFromGeneration(
  prompt: string,
  result: string,
  category: string,
  quality: number,
): TrainingExample & { category: string; quality: number } {
  return {
    input: prompt,
    output: result,
    category,
    quality,
  };
}

export const modelTrainingService = {
  createTuningJob,
  getTuningJobStatus,
  listTunedModels,
  deleteTunedModel,
  generateWithTunedModel,
  curateFromGeneration,
};
