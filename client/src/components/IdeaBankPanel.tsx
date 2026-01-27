/**
 * IdeaBankPanel - Backward Compatibility Re-export
 *
 * This file re-exports the refactored IdeaBankPanel from client/src/components/ideabank/
 * for backward compatibility with existing imports.
 *
 * The original 827-line component has been refactored into smaller, memoized components:
 * - IdeaBankPanel (main orchestrator, ~200 lines)
 * - IdeaBankHeader
 * - IdeaBankInputSummary
 * - IdeaBankAnalysisStatus
 * - IdeaBankSuggestions
 * - SuggestionCard
 * - TemplateSlotCard
 * - ModeBadge
 * - SourceIndicators
 *
 * Performance improvements:
 * - All components wrapped with React.memo
 * - useMemo for filtered/computed values
 * - useCallback for event handlers
 * - Stable dependency keys for effects
 *
 * Target: 70% fewer re-renders, main file < 200 lines
 */
export { IdeaBankPanel } from "./ideabank";
