/**
 * Studio Memoized Components
 *
 * These components are optimized with React.memo to reduce unnecessary re-renders.
 *
 * Component Hierarchy:
 * - StudioHeader: Hero section with title and quick actions
 * - StudioSidebar: Left column with upload, products, templates
 * - StudioCanvas: Main workspace (prompt, IdeaBank, settings)
 * - StudioToolbar: Generate button and action buttons
 *
 * Performance Guidelines:
 * - Always use useCallback for event handlers passed to memoized components
 * - Use useMemo for computed values (filtered lists, derived state)
 * - Keep prop types primitive when possible (strings, numbers, booleans)
 * - For objects/arrays, ensure stable references with useMemo
 *
 * Target: 70% reduction in re-renders
 */

export { StudioHeader } from './StudioHeader';
export { StudioSidebar } from './StudioSidebar';
export { StudioCanvas } from './StudioCanvas';
export {
  StudioToolbar,
  GenerateButton,
  ActionButtons,
  ResultHeader,
  StickyGenerateBar,
} from './StudioToolbar';
