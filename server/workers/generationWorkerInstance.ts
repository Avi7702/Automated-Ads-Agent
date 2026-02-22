/**
 * Generation Worker Instance
 *
 * Instantiates and exports the BullMQ Worker for processing generation jobs.
 * This module should be imported by app.ts to start the worker.
 *
 * The worker processes jobs from the 'generation-jobs' queue and handles:
 * - Image generation (generate)
 * - Image editing (edit)
 * - Image variations (variation)
 * - Ad copy generation (copy)
 */

import { Worker, type ConnectionOptions } from 'bullmq';
import { logger } from '../lib/logger';
import { processGenerationJob } from '../jobs/generationWorker';
import { moveToDeadLetterQueue } from '../lib/queue';
import { GenerationJobData, GenerationJobResult, QUEUE_NAMES, DEFAULT_JOB_OPTIONS } from '../jobs/types';

/**
 * Get Redis connection options for the worker
 * Mirrors the logic in lib/queue.ts for consistency
 */
function getWorkerConnectionOptions(): ConnectionOptions {
  const redisUrl = process.env['REDIS_URL'];

  if (redisUrl) {
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        ...(url.password ? { password: url.password } : {}),
        ...(url.username ? { username: url.username } : {}),
        ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
      };
    } catch {
      logger.warn({ module: 'Worker', redisUrl }, 'Failed to parse REDIS_URL, falling back to host/port config');
    }
  }

  const redisPassword = process.env['REDIS_PASSWORD'];
  return {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    ...(redisPassword ? { password: redisPassword } : {}),
  };
}

// Worker instance - will be null if Redis is not available
let generationWorker: Worker<GenerationJobData, GenerationJobResult> | null = null;

/**
 * Initialize and start the generation worker
 * Should be called during app startup
 */
export function startGenerationWorker(): Worker<GenerationJobData, GenerationJobResult> | null {
  // Skip worker initialization if Redis is not configured
  if (!process.env['REDIS_URL'] && !process.env['REDIS_HOST']) {
    logger.warn(
      { module: 'Worker' },
      'Redis not configured - generation worker disabled. Jobs will be queued but not processed.',
    );
    return null;
  }

  const connection = getWorkerConnectionOptions();

  generationWorker = new Worker<GenerationJobData, GenerationJobResult>(QUEUE_NAMES.GENERATION, processGenerationJob, {
    connection,
    concurrency: parseInt(process.env['WORKER_CONCURRENCY'] || '5'), // Process up to 5 jobs in parallel
    lockDuration: 180000, // 3 minutes lock (jobs can take up to 2 min)
    stalledInterval: 30000, // Check for stalled jobs every 30s (Phase 3 hardening)
    maxStalledCount: 2, // Allow 2 stalls before marking failed → moves to DLQ
  });

  // Worker event listeners for monitoring
  generationWorker.on('ready', () => {
    logger.info(
      {
        module: 'Worker',
        queueName: QUEUE_NAMES.GENERATION,
        concurrency: parseInt(process.env['WORKER_CONCURRENCY'] || '5'),
      },
      'Generation worker started and ready',
    );
  });

  generationWorker.on('active', (job) => {
    logger.debug({ module: 'Worker', jobId: job.id, jobType: job.data.jobType }, 'Job started processing');
  });

  generationWorker.on('completed', (job, result) => {
    logger.info(
      {
        module: 'Worker',
        jobId: job.id,
        jobType: job.data.jobType,
        generationId: result.generationId,
        processingTimeMs: result.processingTimeMs,
      },
      'Job completed successfully',
    );
  });

  generationWorker.on('failed', (job, error) => {
    const maxAttempts = (job?.opts.attempts ?? DEFAULT_JOB_OPTIONS.attempts) as number;
    const hasExhaustedRetries = job !== undefined && job.attemptsMade >= maxAttempts;

    logger.error(
      {
        module: 'Worker',
        jobId: job?.id,
        jobType: job?.data.jobType,
        error: error.message,
        attemptsMade: job?.attemptsMade,
        maxAttempts,
        exhaustedRetries: hasExhaustedRetries,
      },
      hasExhaustedRetries ? 'Job failed - all retries exhausted, moving to DLQ' : 'Job failed - will retry',
    );

    // Move to DLQ when all retries are exhausted
    if (hasExhaustedRetries && job !== undefined) {
      void moveToDeadLetterQueue(job, error);
    }
  });

  generationWorker.on('error', (error) => {
    logger.error({ module: 'Worker', error: error.message }, 'Worker error');
  });

  generationWorker.on('stalled', (jobId) => {
    logger.warn({ module: 'Worker', jobId }, 'Job stalled - will be retried');
  });

  return generationWorker;
}

/**
 * Gracefully close the worker
 * Should be called during app shutdown
 */
export async function closeGenerationWorker(): Promise<void> {
  if (generationWorker) {
    logger.info({ module: 'Worker' }, 'Closing generation worker...');
    await generationWorker.close();
    generationWorker = null;
    logger.info({ module: 'Worker' }, 'Generation worker closed');
  }
}

/**
 * Get the current worker instance
 * Returns null if worker is not running
 */
export function getGenerationWorker(): Worker<GenerationJobData, GenerationJobResult> | null {
  return generationWorker;
}

/**
 * Check if the worker is running
 */
export function isWorkerRunning(): boolean {
  return generationWorker !== null && !generationWorker.isPaused();
}
