import Redis from 'ioredis';
import { logger } from './logger';

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    const redisUrl = process.env['REDIS_URL'] || 'redis://localhost:6379';

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) {
          logger.error({ module: 'Redis', retries: times }, 'Connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      enableOfflineQueue: false,
    });

    redisClient.on('error', (err) => {
      logger.error({ module: 'Redis', err }, 'Redis error occurred');
    });

    redisClient.on('connect', () => {
      logger.info({ module: 'Redis' }, 'Redis connected');
    });
  }

  return redisClient;
}

export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}

export function setRedisClient(client: Redis | null): void {
  redisClient = client;
}
