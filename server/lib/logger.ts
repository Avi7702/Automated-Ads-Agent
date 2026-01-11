/**
 * Structured logging with Pino
 *
 * Provides JSON-structured logs that are searchable in Axiom.
 * Use this instead of console.log for production code.
 *
 * Usage:
 *   import { logger } from './lib/logger';
 *
 *   logger.info({ userId, action: 'generate' }, 'Image generation started');
 *   logger.error({ err, userId }, 'Generation failed');
 *   logger.warn({ endpoint, ip }, 'Rate limit exceeded');
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Configure Pino
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Add base context to all logs
  base: {
    service: process.env.OTEL_SERVICE_NAME || 'automated-ads-agent',
    env: process.env.NODE_ENV || 'development',
  },

  // Format timestamps as ISO strings
  timestamp: pino.stdTimeFunctions.isoTime,

  // Pretty print in development
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname,service,env',
        },
      }
    : undefined,

  // Custom serializers for common objects
  serializers: {
    err: pino.stdSerializers.err,
    req: (req) => ({
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      requestId: req.requestId,
      headers: {
        'user-agent': req.headers?.['user-agent'],
        'content-type': req.headers?.['content-type'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

// Child logger for specific modules
export const createModuleLogger = (module: string) =>
  logger.child({ module });

// Pre-configured module loggers
export const authLogger = createModuleLogger('auth');
export const geminiLogger = createModuleLogger('gemini');
export const storageLogger = createModuleLogger('storage');
export const apiLogger = createModuleLogger('api');

/**
 * Log levels guide:
 *
 * - trace: Very detailed debugging (usually disabled)
 * - debug: Debugging info, not for production
 * - info:  Normal operations (user actions, API calls)
 * - warn:  Something unexpected but handled
 * - error: Something failed, needs attention
 * - fatal: App is crashing
 *
 * Examples:
 *
 * logger.info({ userId: '123', action: 'login' }, 'User logged in');
 * logger.warn({ ip: '1.2.3.4', attempts: 5 }, 'Multiple failed login attempts');
 * logger.error({ err, userId: '123' }, 'Failed to generate image');
 */

export default logger;
