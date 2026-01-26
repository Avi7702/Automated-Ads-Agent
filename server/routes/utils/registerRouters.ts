/**
 * Router Registration Utility
 * Handles mounting all router modules to the Express app
 */

import type { Express } from 'express';
import type { RouterModule, RouterContext } from '../../types/router';
import { logger } from '../../lib/logger';

/**
 * Register all router modules with the Express app
 */
export function registerRouters(
  app: Express,
  modules: RouterModule[],
  ctx: RouterContext
): void {
  const startTime = Date.now();
  let totalEndpoints = 0;

  logger.info({ moduleCount: modules.length }, 'Registering router modules');

  for (const module of modules) {
    try {
      const router = module.factory(ctx);
      app.use(module.prefix, router);
      totalEndpoints += module.endpointCount;

      logger.debug({
        prefix: module.prefix,
        endpoints: module.endpointCount,
        description: module.description
      }, 'Router registered');
    } catch (error) {
      logger.error({
        prefix: module.prefix,
        err: error
      }, 'Failed to register router');
      throw error;
    }
  }

  const duration = Date.now() - startTime;
  logger.info({
    totalModules: modules.length,
    totalEndpoints,
    durationMs: duration
  }, 'All routers registered');
}

/**
 * Get router module by prefix
 */
export function getRouterModule(
  modules: RouterModule[],
  prefix: string
): RouterModule | undefined {
  return modules.find(m => m.prefix === prefix);
}

/**
 * Get all router prefixes
 */
export function getRouterPrefixes(modules: RouterModule[]): string[] {
  return modules.map(m => m.prefix);
}

/**
 * Get total endpoint count
 */
export function getTotalEndpointCount(modules: RouterModule[]): number {
  return modules.reduce((sum, m) => sum + m.endpointCount, 0);
}
