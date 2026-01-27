/**
 * Router Index
 * Central registry for all router modules
 *
 * Order matters for middleware application:
 * 1. Infrastructure routers first (health, monitoring)
 * 2. Auth routers (needed by other routers)
 * 3. Core domain routers (products, generations)
 * 4. Feature routers (idea bank, relationships, etc.)
 * 5. Admin routers last (security-critical)
 */

import type { RouterModule } from '../types/router';

// Infrastructure routers (no auth required)
import { healthRouterModule } from './health.router';
import { monitoringRouterModule } from './monitoring.router';

// Authentication
import { authRouterModule } from './auth.router';

// Core domain routers (Sprint 2 Day 6-7)
import { productsRouterModule } from './products.router';
import { generationsRouterModule, jobsRouterModule } from './generations.router';

// Content management
import { templatesRouterModule } from './templates.router';
import { brandImagesRouterModule } from './brandImages.router';

// AI-powered features (Sprint 2 Day 6-7)
import { ideaBankRouterModule } from './ideaBank.router';
import { productRelationshipsRouterModule, relationshipsRAGRouterModule } from './relationships.router';

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

// Approval queue (Phase 8)
import { approvalQueueRouterModule } from './approvalQueue.router';

// Admin (security-critical - must be last)
import { adminRouterModule } from './admin.router';

/**
 * All router modules in registration order
 */
export const routerModules: RouterModule[] = [
  // Infrastructure (no auth required)
  healthRouterModule,
  monitoringRouterModule,

  // Authentication
  authRouterModule,

  // Core domain routers
  productsRouterModule,
  generationsRouterModule,
  jobsRouterModule,

  // Templates
  templatesRouterModule,

  // Brand assets
  brandImagesRouterModule,

  // AI-powered features
  ideaBankRouterModule,
  productRelationshipsRouterModule,
  relationshipsRAGRouterModule,

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

  // Approval queue (Phase 8)
  approvalQueueRouterModule,

  // Admin (last - security critical)
  adminRouterModule,
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
export { productsRouterModule } from './products.router';
export { generationsRouterModule, jobsRouterModule } from './generations.router';
export { ideaBankRouterModule } from './ideaBank.router';
export { productRelationshipsRouterModule, relationshipsRAGRouterModule } from './relationships.router';
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
export { approvalQueueRouterModule } from './approvalQueue.router';
export { adminRouterModule } from './admin.router';
