import { Server } from 'http';
import { logger } from '../lib/logger';

let isShuttingDown = false;
const shutdownCallbacks: Array<() => Promise<void>> = [];

/**
 * Register a cleanup callback for graceful shutdown
 */
export function onShutdown(callback: () => Promise<void>): void {
  shutdownCallbacks.push(callback);
}

/**
 * Check if server is shutting down (for health checks)
 */
export function isServerShuttingDown(): boolean {
  return isShuttingDown;
}

/**
 * Initialize graceful shutdown handlers
 */
export function initGracefulShutdown(server: Server): void {
  const shutdown = async (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info({ signal }, 'Graceful shutdown initiated');

    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');

      // Run cleanup callbacks
      for (const callback of shutdownCallbacks) {
        try {
          await callback();
        } catch (err) {
          logger.error({ err }, 'Shutdown callback failed');
        }
      }

      logger.info('Graceful shutdown complete');
      process.exit(0);
    });

    // Force exit after 30 seconds
    setTimeout(() => {
      logger.warn('Forced shutdown after timeout');
      process.exit(1);
    }, 30000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
