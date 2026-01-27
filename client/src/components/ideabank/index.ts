/**
 * IdeaBank Components
 *
 * Refactored from the original 827-line IdeaBankPanel.tsx into smaller,
 * memoized components for better performance and maintainability.
 *
 * Component Structure:
 * - IdeaBankPanel (main orchestrator, <200 lines)
 *   - IdeaBankHeader (mode display, refresh button)
 *   - IdeaBankInputSummary (products/uploads count)
 *   - IdeaBankAnalysisStatus (vision/KB/templates status)
 *   - IdeaBankSuggestions (suggestions grid)
 *     - SuggestionCard (freestyle mode cards)
 *       - ModeBadge
 *       - SourceIndicators
 *     - TemplateSlotCard (template mode cards)
 *
 * Performance Optimizations:
 * - All components wrapped with React.memo
 * - useMemo for filtered/computed values
 * - useCallback for event handlers
 * - Stable dependency keys for effects
 */

export { IdeaBankPanel } from "./IdeaBankPanel";
export { IdeaBankHeader } from "./IdeaBankHeader";
export { IdeaBankInputSummary } from "./IdeaBankInputSummary";
export { IdeaBankAnalysisStatus } from "./IdeaBankAnalysisStatus";
export { IdeaBankSuggestions } from "./IdeaBankSuggestions";
export { SuggestionCard } from "./SuggestionCard";
export { TemplateSlotCard } from "./TemplateSlotCard";
export { ModeBadge } from "./ModeBadge";
export { SourceIndicators } from "./SourceIndicators";
export { useIdeaBankFetch } from "./useIdeaBankFetch";

// Re-export types for convenience
export type {
  IdeaBankPanelProps,
  IdeaBankHeaderProps,
  IdeaBankInputSummaryProps,
  IdeaBankAnalysisStatusProps,
  SuggestionCardProps,
  TemplateSlotCardProps,
  IdeaBankSuggestionsProps,
} from "./types";
