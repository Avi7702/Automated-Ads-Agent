/**
 * Shared types for agent tool declarations and executors.
 * Used by all tool modules after migration from @google/adk to @google/genai.
 */

/** Executor function signature for a single tool. */
export type ToolExecutor = (args: Record<string, unknown>, userId: string) => Promise<Record<string, unknown>>;
