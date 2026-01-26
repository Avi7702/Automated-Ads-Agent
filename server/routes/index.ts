/**
 * Router Index
 * Central registry for all router modules
 *
 * Order matters for middleware application:
 * 1. Infrastructure routers first (health, monitoring)
 * 2. Auth routers (needed by other routers)
 * 3. Core domain routers
 * 4. Feature routers
 */

import type { RouterModule } from '../types/router';

// Infrastructure routers (no auth required)
import { healthRouterModule } from './health.router';
import { monitoringRouterModule } from './monitoring.router';

// Authentication
import { authRouterModule } from './auth.router';

// Content management
import { templatesRouterModule } from './templates.router';
import { brandImagesRouterModule } from './brandImages.router';

// File search (RAG)
import { catalogRouterModule } from './catalog.router';

// Image analysis
import { imageRouterModule } from './image.router';

// Installation scenarios
import { scenariosRouterModule } from './scenarios.router';

// Learned patterns (Learn from Winners)
import { patternsRouterModule } from './patterns.router';

// Copywriting
import { copywritingRouterModule } from './copywriting.router';

// Social media
import { socialRouterModule } from './social.router';

// N8N webhooks
import { n8nRouterModule } from './n8n.router';

// Content planning
import { planningRouterModule } from './planning.router';

/**
 * All router modules in registration order
 */
export const routerModules: RouterModule[] = [
  // Infrastructure (no auth required)
  healthRouterModule,
  monitoringRouterModule,

  // Authentication
  authRouterModule,

  // Templates
  templatesRouterModule,

  // Brand assets
  brandImagesRouterModule,

  // File search (RAG)
  catalogRouterModule,

  // Image analysis
  imageRouterModule,

  // Scenarios
  scenariosRouterModule,

  // Patterns (Learn from Winners)
  patternsRouterModule,

  // Copywriting
  copywritingRouterModule,

  // Social media
  socialRouterModule,

  // N8N webhooks
  n8nRouterModule,

  // Content planning
  planningRouterModule,
];

/**
 * Get router module by prefix
 */
export function getRouterModule(prefix: string): RouterModule | undefined {
  return routerModules.find(m => m.prefix === prefix);
}

/**
 * Get all router prefixes
 */
export function getRouterPrefixes(): string[] {
  return routerModules.map(m => m.prefix);
}

/**
 * Get total endpoint count
 */
export function getTotalEndpointCount(): number {
  return routerModules.reduce((sum, m) => sum + m.endpointCount, 0);
}

// Re-export individual router modules for direct access
export { healthRouterModule } from './health.router';
export { authRouterModule } from './auth.router';
export { monitoringRouterModule } from './monitoring.router';
export { templatesRouterModule } from './templates.router';
export { brandImagesRouterModule } from './brandImages.router';
export { catalogRouterModule } from './catalog.router';
export { imageRouterModule } from './image.router';
export { scenariosRouterModule } from './scenarios.router';
export { patternsRouterModule } from './patterns.router';
export { copywritingRouterModule } from './copywriting.router';
export { socialRouterModule } from './social.router';
export { n8nRouterModule } from './n8n.router';
export { planningRouterModule } from './planning.router';
