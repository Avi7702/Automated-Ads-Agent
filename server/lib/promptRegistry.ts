/**
 * Prompt Registry — Centralized prompt versioning and management
 *
 * All AI prompts are registered here with version tracking. This enables:
 * - Auditable prompt changes via version numbers
 * - A/B testing different prompt versions
 * - Prompt version stored with every generation for reproducibility
 */

import { logger } from './logger';

export interface PromptDefinition {
  /** Unique identifier: "namespace.action" */
  id: string;
  /** Semantic version string */
  version: string;
  /** Human-readable description */
  description: string;
  /** The prompt template function — receives context, returns system + user prompt parts */
  build: (context: Record<string, unknown>) => PromptOutput;
}

export interface PromptOutput {
  systemInstruction?: string;
  userPrompt: string;
}

/** Internal registry store */
const registry = new Map<string, PromptDefinition>();

/**
 * Register a prompt definition. Overwrites if same ID exists (for hot-reload).
 */
export function registerPrompt(def: PromptDefinition): void {
  registry.set(def.id, def);
  logger.debug({ promptId: def.id, version: def.version }, 'Prompt registered');
}

/**
 * Get a prompt by ID. Throws if not found.
 */
export function getPrompt(id: string): PromptDefinition {
  const def = registry.get(id);
  if (!def) {
    throw new Error(`Prompt not found: "${id}". Available: ${[...registry.keys()].join(', ')}`);
  }
  return def;
}

/**
 * Build a prompt by ID with context. Returns the built prompt + version metadata.
 */
export function buildPrompt(
  id: string,
  context: Record<string, unknown> = {},
): PromptOutput & { promptId: string; promptVersion: string } {
  const def = getPrompt(id);
  const output = def.build(context);
  return {
    ...output,
    promptId: def.id,
    promptVersion: def.version,
  };
}

/**
 * Get version string for a prompt (for storing in generation metadata).
 */
export function getPromptVersion(id: string): string {
  return getPrompt(id).version;
}

/**
 * List all registered prompts (for admin/debugging).
 */
export function listPrompts(): Array<{ id: string; version: string; description: string }> {
  return [...registry.values()].map(({ id, version, description }) => ({
    id,
    version,
    description,
  }));
}

/**
 * Check if a prompt ID is registered.
 */
export function hasPrompt(id: string): boolean {
  return registry.has(id);
}
