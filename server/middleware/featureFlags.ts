/**
 * Feature Flags for Phase 2 Duplication Removal
 *
 * These flags allow gradual rollout and easy rollback of deprecations.
 */

export const featureFlags = {
  /**
   * USE_LEGACY_PROMPT_ENDPOINT
   *
   * Controls whether the legacy /api/prompt-suggestions endpoint is available.
   *
   * - `true`: Keep legacy endpoint active (default during migration)
   * - `false`: Disable legacy endpoint (after monitoring period)
   *
   * Related: Phase 2 Task 2 - Prompt Endpoint Duplication Removal
   */
  USE_LEGACY_PROMPT_ENDPOINT: process.env.USE_LEGACY_PROMPT_ENDPOINT === 'true'
};
