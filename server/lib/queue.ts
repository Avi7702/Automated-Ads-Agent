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

import { Queue, QueueEvents } from 'bullmq';
import { RedisOptions } from 'ioredis';
import { logger } from './logger';
import {
  GenerationJobData,
  GenerationJobResult,
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

/**
 * Parse Redis URL into connection options for BullMQ
 * Handles both redis:// URLs and individual host/port config
 */
function getConnectionOptions(): RedisConnectionOptions {
  const redisUrl = process.env.REDIS_URL;

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
      logger.warn(
        { module: 'Queue', redisUrl },
        'Failed to parse REDIS_URL, falling back to host/port config'
      );
    }
  }

  // Fallback to individual host/port config
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}

// Connection options shared by queue and events
const connection = getConnectionOptions();

/**
 * Main generation queue for image and copy generation jobs
 *
 * Supports job types: generate, edit, variation, copy
 */
export const generationQueue = new Queue<GenerationJobData, GenerationJobResult>(
  QUEUE_NAMES.GENERATION,
  {
    connection,
    defaultJobOptions: {
      attempts: DEFAULT_JOB_OPTIONS.attempts,
      backoff: DEFAULT_JOB_OPTIONS.backoff,
      removeOnComplete: DEFAULT_JOB_OPTIONS.removeOnComplete,
      removeOnFail: DEFAULT_JOB_OPTIONS.removeOnFail,
    },
  }
);

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
  connection,
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
    'Job completed successfully'
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
    'Job failed'
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
    'Job progress update'
  );
});

generationQueueEvents.on('stalled', ({ jobId }) => {
  logger.warn(
    {
      module: 'Queue',
      event: 'stalled',
      jobId,
    },
    'Job stalled - worker may have died'
  );
});

generationQueueEvents.on('active', ({ jobId }) => {
  logger.debug(
    {
      module: 'Queue',
      event: 'active',
      jobId,
    },
    'Job started processing'
  );
});

/**
 * Gracefully close queue connections
 * Call this during server shutdown
 */
export async function closeQueues(): Promise<void> {
  logger.info({ module: 'Queue' }, 'Closing queue connections...');

  try {
    await Promise.all([
      generationQueue.close(),
      generationQueueEvents.close(),
    ]);
    logger.info({ module: 'Queue' }, 'Queue connections closed');
  } catch (error) {
    logger.error(
      { module: 'Queue', error },
      'Error closing queue connections'
    );
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
 */
export async function getQueueStats(): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}> {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    generationQueue.getWaitingCount(),
    generationQueue.getActiveCount(),
    generationQueue.getCompletedCount(),
    generationQueue.getFailedCount(),
    generationQueue.getDelayedCount(),
  ]);

  return { waiting, active, completed, failed, delayed };
}

// Log connection status on module load
logger.info(
  {
    module: 'Queue',
    queueName: QUEUE_NAMES.GENERATION,
    host: connection.host,
    port: connection.port,
  },
  'Queue infrastructure initialized'
);
