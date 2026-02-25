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
import { generationsRouterModule, jobsRouterModule, transformRouterModule } from './generations.router';

// Content management
import { templatesRouterModule } from './templates.router';
import { brandImagesRouterModule } from './brandImages.router';

// AI-powered features (Sprint 2 Day 6-7)
import { ideaBankRouterModule } from './ideaBank.router';
import { productRelationshipsRouterModule, relationshipsRAGRouterModule } from './relationships.router';

// Studio agent (conversational AI)
import { agentRouterModule } from './agent.router';

// Agent plan pipeline (suggestions, preview, execute, revise)
import { agentPlanRouterModule } from './agentPlan.router';

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

// Content calendar
import { calendarRouterModule } from './calendar.router';

// Content planning
import { planningRouterModule } from './planning.router';

// Weekly planner (WS-C1)
import { weeklyPlannerRouterModule } from './weeklyPlanner.router';

// Approval queue (Phase 8)
import { approvalQueueRouterModule } from './approvalQueue.router';

// Style references (Character/Style Consistency)
import { styleReferencesRouterModule } from './styleReferences.router';

// Custom model training
import { trainingRouterModule } from './training.router';

// Product intelligence layer (WS-C5)
import { intelligenceRouterModule } from './intelligence.router';

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
  transformRouterModule,

  // Templates
  templatesRouterModule,

  // Brand assets
  brandImagesRouterModule,

  // AI-powered features
  ideaBankRouterModule,
  productRelationshipsRouterModule,
  relationshipsRAGRouterModule,

  // Studio agent (conversational AI)
  agentRouterModule,

  // Agent plan pipeline (suggestions, preview, execute, revise)
  agentPlanRouterModule,

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

  // Content calendar
  calendarRouterModule,

  // Content planning
  planningRouterModule,

  // Weekly planner (WS-C1)
  weeklyPlannerRouterModule,

  // Approval queue (Phase 8)
  approvalQueueRouterModule,

  // Style references (Character/Style Consistency)
  styleReferencesRouterModule,

  // Custom model training
  trainingRouterModule,

  // Product intelligence layer (WS-C5)
  intelligenceRouterModule,

  // Admin (last - security critical)
  adminRouterModule,
];

/**
 * Get router module by prefix
 */
export function getRouterModule(prefix: string): RouterModule | undefined {
  return routerModules.find((m) => m.prefix === prefix);
}

/**
 * Get all router prefixes
 */
export function getRouterPrefixes(): string[] {
  return routerModules.map((m) => m.prefix);
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
export { generationsRouterModule, jobsRouterModule, transformRouterModule } from './generations.router';
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
export { calendarRouterModule } from './calendar.router';
export { planningRouterModule } from './planning.router';
export { weeklyPlannerRouterModule } from './weeklyPlanner.router';
export { approvalQueueRouterModule } from './approvalQueue.router';
export { styleReferencesRouterModule } from './styleReferences.router';
export { trainingRouterModule } from './training.router';
export { agentRouterModule } from './agent.router';
export { agentPlanRouterModule } from './agentPlan.router';
export { intelligenceRouterModule } from './intelligence.router';
export { adminRouterModule } from './admin.router';
