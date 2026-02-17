/**
 * BullMQ Queue Infrastructure
 *
 * Provides Redis-backed job queue for async generation processing.
 * Handles long-running Gemini API calls without blocking HTTP requests.
 *
 * Usage:
 * - Import generationQueue to add jobs
 * - Import generationQueueEvents to listen for job events
 * - Workers are defined separately in server/workers/
 */

import { Queue, QueueEvents, type ConnectionOptions, Job } from 'bullmq';
import { type RedisOptions } from 'ioredis';
import { logger } from './logger';
import {
  GenerationJobData,
  GenerationJobResult,
  DeadLetterJobData,
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
} from '../jobs/types';

/**
 * Redis connection options interface for BullMQ
 */
interface RedisConnectionOptions extends RedisOptions {
  host: string;
  port: number;
}

/** Helper to cast our options to BullMQ ConnectionOptions */
function asConnectionOptions(opts: RedisConnectionOptions): ConnectionOptions {
  return opts as unknown as ConnectionOptions;
}

/**
 * Parse Redis URL into connection options for BullMQ
 * Handles both redis:// URLs and individual host/port config
 */
function getConnectionOptions(): RedisConnectionOptions {
  const redisUrl = process.env['REDIS_URL'];

  if (redisUrl) {
    // Parse redis:// URL format
    try {
      const url = new URL(redisUrl);
      return {
        host: url.hostname,
        port: parseInt(url.port) || 6379,
        password: url.password || undefined,
        username: url.username || undefined,
        // TLS for production Redis (e.g., Railway, Upstash)
        tls: url.protocol === 'rediss:' ? {} : undefined,
      };
    } catch {
      logger.warn({ module: 'Queue', redisUrl }, 'Failed to parse REDIS_URL, falling back to host/port config');
    }
  }

  // Fallback to individual host/port config
  return {
    host: process.env['REDIS_HOST'] || 'localhost',
    port: parseInt(process.env['REDIS_PORT'] || '6379'),
    password: process.env['REDIS_PASSWORD'] || undefined,
  };
}

// Connection options shared by queue and events
const connection = getConnectionOptions();

/**
 * Main generation queue for image and copy generation jobs
 *
 * Supports job types: generate, edit, variation, copy
 */
export const generationQueue = new Queue<GenerationJobData, GenerationJobResult>(QUEUE_NAMES.GENERATION, {
  connection: asConnectionOptions(connection),
  defaultJobOptions: {
    ...(DEFAULT_JOB_OPTIONS.attempts !== undefined && { attempts: DEFAULT_JOB_OPTIONS.attempts }),
    ...(DEFAULT_JOB_OPTIONS.backoff !== undefined && { backoff: DEFAULT_JOB_OPTIONS.backoff }),
    ...(DEFAULT_JOB_OPTIONS.removeOnComplete !== undefined && {
      removeOnComplete: DEFAULT_JOB_OPTIONS.removeOnComplete,
    }),
    ...(DEFAULT_JOB_OPTIONS.removeOnFail !== undefined && { removeOnFail: DEFAULT_JOB_OPTIONS.removeOnFail }),
  },
});

/**
 * Dead Letter Queue for jobs that have exhausted all retries
 *
 * Stores failed job data + error context for admin review and potential retry.
 * Jobs are automatically moved here when they fail after all retry attempts.
 */
export const deadLetterQueue = new Queue<DeadLetterJobData>(QUEUE_NAMES.DEAD_LETTER, {
  connection: asConnectionOptions(connection),
  defaultJobOptions: {
    removeOnComplete: { count: 500 }, // Keep last 500 resolved DLQ items
    removeOnFail: false, // Never auto-remove DLQ failures
  },
});

/**
 * Move a failed job to the Dead Letter Queue
 * Called when a job has exhausted all retry attempts
 */
export async function moveToDeadLetterQueue(
  job: Job<GenerationJobData, GenerationJobResult>,
  error: Error,
): Promise<void> {
  try {
    const dlqData: DeadLetterJobData = {
      originalQueue: QUEUE_NAMES.GENERATION,
      jobId: job.id ?? 'unknown',
      jobData: job.data,
      error: error.message,
      ...(error.stack !== undefined && { stackTrace: error.stack }),
      failedAt: new Date().toISOString(),
      attempts: job.attemptsMade,
      maxAttempts: (job.opts.attempts ?? DEFAULT_JOB_OPTIONS.attempts) as number,
    };

    await (deadLetterQueue as Queue).add('failed-job', dlqData, {
      jobId: `dlq-${job.id ?? Date.now()}`,
    });

    logger.info(
      {
        module: 'Queue',
        event: 'dead-letter',
        originalJobId: job.id,
        jobType: job.data.jobType,
        attempts: job.attemptsMade,
        error: error.message,
      },
      'Job moved to dead letter queue',
    );
  } catch (dlqError) {
    logger.error(
      {
        module: 'Queue',
        event: 'dead-letter-error',
        originalJobId: job.id,
        dlqError,
      },
      'Failed to move job to dead letter queue',
    );
  }
}

/**
 * Retry a job from the Dead Letter Queue by re-adding it to the original queue
 */
export async function retryDeadLetterJob(
  dlqJobId: string,
): Promise<{ success: boolean; newJobId?: string; error?: string }> {
  try {
    const dlqJob = await deadLetterQueue.getJob(dlqJobId);
    if (!dlqJob) {
      return { success: false, error: 'DLQ job not found' };
    }

    const dlqData = dlqJob.data;

    // Re-add to the original generation queue
    const newJob = await (generationQueue as Queue).add(dlqData.jobData.jobType, dlqData.jobData, {
      ...(DEFAULT_JOB_OPTIONS.attempts !== undefined && { attempts: DEFAULT_JOB_OPTIONS.attempts }),
      ...(DEFAULT_JOB_OPTIONS.backoff !== undefined && { backoff: DEFAULT_JOB_OPTIONS.backoff }),
      ...(DEFAULT_JOB_OPTIONS.removeOnComplete !== undefined && {
        removeOnComplete: DEFAULT_JOB_OPTIONS.removeOnComplete,
      }),
      ...(DEFAULT_JOB_OPTIONS.removeOnFail !== undefined && { removeOnFail: DEFAULT_JOB_OPTIONS.removeOnFail }),
    });

    // Remove from DLQ after successful re-queue
    await dlqJob.remove();

    logger.info(
      {
        module: 'Queue',
        event: 'dead-letter-retry',
        dlqJobId,
        newJobId: newJob.id,
        jobType: dlqData.jobData.jobType,
      },
      'DLQ job retried successfully',
    );

    return { success: true, ...(newJob.id !== undefined && { newJobId: newJob.id }) };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error({ module: 'Queue', event: 'dead-letter-retry-error', dlqJobId, error }, 'Failed to retry DLQ job');
    return { success: false, error: message };
  }
}

/**
 * List jobs in the Dead Letter Queue with pagination
 */
export async function listDeadLetterJobs(
  start = 0,
  end = 19,
): Promise<{
  jobs: Array<{
    id: string | undefined;
    data: DeadLetterJobData;
    timestamp: number | undefined;
  }>;
  total: number;
}> {
  const [jobs, total] = await Promise.all([
    deadLetterQueue.getJobs(['waiting', 'delayed', 'completed', 'failed'], start, end),
    deadLetterQueue.getJobCounts('waiting', 'delayed', 'completed', 'failed'),
  ]);

  const totalCount = Object.values(total).reduce((sum, count) => sum + count, 0);

  return {
    jobs: jobs.map((job) => ({
      id: job.id,
      data: job.data,
      timestamp: job.timestamp,
    })),
    total: totalCount,
  };
}

/**
 * Queue events listener for monitoring job progress
 *
 * Events emitted:
 * - completed: Job finished successfully
 * - failed: Job failed after all retry attempts
 * - progress: Job progress update
 * - active: Job started processing
 * - stalled: Job stalled (worker died mid-processing)
 */
export const generationQueueEvents = new QueueEvents(QUEUE_NAMES.GENERATION, {
  connection: asConnectionOptions(connection),
});

// Set up event listeners for logging and monitoring
generationQueueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info(
    {
      module: 'Queue',
      event: 'completed',
      jobId,
      result: returnvalue,
    },
    'Job completed successfully',
  );
});

generationQueueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(
    {
      module: 'Queue',
      event: 'failed',
      jobId,
      reason: failedReason,
    },
    'Job failed',
  );
});

generationQueueEvents.on('progress', ({ jobId, data }) => {
  logger.debug(
    {
      module: 'Queue',
      event: 'progress',
      jobId,
      progress: data,
    },
    'Job progress update',
  );
});

generationQueueEvents.on('stalled', ({ jobId }) => {
  logger.warn(
    {
      module: 'Queue',
      event: 'stalled',
      jobId,
    },
    'Job stalled - worker may have died',
  );
});

generationQueueEvents.on('active', ({ jobId }) => {
  logger.debug(
    {
      module: 'Queue',
      event: 'active',
      jobId,
    },
    'Job started processing',
  );
});

/**
 * Gracefully close queue connections
 * Call this during server shutdown
 */
export async function closeQueues(): Promise<void> {
  logger.info({ module: 'Queue' }, 'Closing queue connections...');

  try {
    await Promise.all([generationQueue.close(), generationQueueEvents.close(), deadLetterQueue.close()]);
    logger.info({ module: 'Queue' }, 'Queue connections closed (including DLQ)');
  } catch (error) {
    logger.error({ module: 'Queue', error }, 'Error closing queue connections');
    throw error;
  }
}

/**
 * Check if Redis/queue is healthy
 * Returns false if Redis is not available
 */
export async function isQueueHealthy(): Promise<boolean> {
  try {
    // Ping Redis through the queue client
    const client = await generationQueue.client;
    const pong = await client.ping();
    return pong === 'PONG';
  } catch {
    return false;
  }
}

/**
 * Get queue statistics for monitoring
 * Includes generation queue stats and dead letter queue count
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  deadLetterCount: number;
}> {
  const [waiting, active, completed, failed, delayed, dlqCounts] = await Promise.all([
    generationQueue.getWaitingCount(),
    generationQueue.getActiveCount(),
    generationQueue.getCompletedCount(),
    generationQueue.getFailedCount(),
    generationQueue.getDelayedCount(),
    deadLetterQueue.getJobCounts('waiting', 'delayed', 'completed', 'failed'),
  ]);

  const deadLetterCount = Object.values(dlqCounts).reduce((sum, count) => sum + count, 0);

  return { waiting, active, completed, failed, delayed, deadLetterCount };
}

// Log connection status on module load
logger.info(
  {
    module: 'Queue',
    queueName: QUEUE_NAMES.GENERATION,
    dlqName: QUEUE_NAMES.DEAD_LETTER,
    host: connection.host,
    port: connection.port,
  },
  'Queue infrastructure initialized (with DLQ)',
);
