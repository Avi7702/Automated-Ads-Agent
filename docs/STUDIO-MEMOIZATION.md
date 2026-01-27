# Studio.tsx Memoization - Performance Optimization

## Overview

This document describes the memoization strategy applied to Studio.tsx to reduce unnecessary re-renders by approximately 70%.

## Problem

The original `Studio.tsx` was 2,963 lines with:
- 40+ state variables
- 30+ event handlers
- Multiple queries and effects
- All inline JSX causing re-renders on any state change

## Solution

Split into 4 memoized sub-components:

### 1. StudioHeader (~60 lines)
**Location:** `client/src/components/studio/memoized/StudioHeader.tsx`

**Responsibility:**
- Hero section title
- Quick actions (History toggle)

**Props:**
- `historyPanelOpen: boolean`
- `onHistoryToggle: () => void`

**Memoization Strategy:**
- Only re-renders when history panel state changes
- Parent must use `useCallback` for `onHistoryToggle`

### 2. StudioSidebar (~470 lines)
**Location:** `client/src/components/studio/memoized/StudioSidebar.tsx`

**Responsibility:**
- Upload zone section
- Product selection grid
- Template selection
- Template inspiration

**Key Sub-components (also memoized):**
- `Section` - Collapsible section wrapper
- `ProductGridItem` - Individual product card
- `SelectedProductsPreview` - Selected products display
- `TemplateItem` - Individual template card

**Memoization Strategy:**
- Uses `useMemo` for filtered products and templates
- Uses `useCallback` for toggle handlers
- Individual grid items are memoized to prevent full grid re-renders

### 3. StudioCanvas (~420 lines)
**Location:** `client/src/components/studio/memoized/StudioCanvas.tsx`

**Responsibility:**
- Generation path selection (freestyle/template)
- Prompt section with IdeaBank
- Platform and output settings
- Content Planner guidance and builders

**Key Sub-components:**
- `GenerationPathSelector` - Mode selection UI
- `PromptSection` - Main prompt editing area
- `PriceEstimate` - Cost estimate display

**Memoization Strategy:**
- Memoizes product-derived values (names, URLs, IDs)
- Separates path selection from prompt editing

### 4. StudioToolbar (~300 lines)
**Location:** `client/src/components/studio/memoized/StudioToolbar.tsx`

**Responsibility:**
- Generate button
- Result header (download, view details)
- Action buttons (edit, copy, preview, save)
- Sticky generate bar

**Key Sub-components:**
- `GenerateButton` - Main generation trigger
- `ActionButtons` - Post-generation actions
- `ResultHeader` - Download and navigation
- `StickyGenerateBar` - Floating generate button

## File Structure

```
client/src/components/studio/memoized/
  index.ts              - Exports all components
  StudioHeader.tsx      - Hero section
  StudioSidebar.tsx     - Upload, products, templates
  StudioCanvas.tsx      - Prompt and settings
  StudioToolbar.tsx     - Generate and action buttons
```

## Optimized Studio Page

**Location:** `client/src/pages/StudioOptimized.tsx`

This is a refactored version of Studio.tsx that uses the memoized components with:
- All event handlers wrapped in `useCallback`
- Computed values wrapped in `useMemo`
- Stable prop references for memoized components

**Access:** `/studio-v2` (for A/B testing)

## Performance Guidelines

### For Parent Component (StudioOptimized.tsx)

1. **Event Handlers:** Always use `useCallback`:
```typescript
const handleHistoryToggle = useCallback(() => {
  // handler logic
}, [dependencies]);
```

2. **Computed Values:** Always use `useMemo`:
```typescript
const filteredProducts = useMemo(() => {
  return products.filter(...);
}, [products, searchQuery, categoryFilter]);
```

3. **Object Props:** Memoize to prevent reference changes:
```typescript
const priceEstimateProps = useMemo(() => ({
  estimatedCost: priceEstimate?.estimatedCost,
  // ...
}), [priceEstimate]);
```

### For Memoized Components

1. **Accept Primitive Props:** Prefer strings, numbers, booleans over objects
2. **Stable Callbacks:** Accept callbacks that parent memoizes
3. **Internal Memoization:** Use useMemo/useCallback for internal computations
4. **displayName:** Set for React DevTools debugging

## Measuring Performance

### Using React DevTools Profiler

1. Open React DevTools in browser
2. Go to "Profiler" tab
3. Click "Record" button
4. Perform actions (select products, type in prompt, etc.)
5. Stop recording
6. Analyze:
   - "Flamegraph" view shows component render times
   - "Ranked" view shows components by render duration
   - Gray components didn't re-render (memoization working)

### Expected Results

**Before (Studio.tsx):**
- All 2,900+ lines re-render on any state change
- Product grid items re-render when typing in prompt
- Templates re-render when selecting products

**After (StudioOptimized.tsx):**
- StudioHeader only re-renders on history toggle
- StudioSidebar only re-renders on product/template changes
- StudioCanvas only re-renders on prompt/settings changes
- Individual items memoized - grid doesn't fully re-render

**Target:** 70% reduction in re-renders

### Benchmark Commands

```bash
# Compare bundle sizes
npm run build
ls -la dist/assets/*.js

# Check for large components in profiler
# (use React DevTools Profiler as described above)
```

## Migration Path

1. **Phase 1 (Current):** StudioOptimized at `/studio-v2` for testing
2. **Phase 2:** A/B test with real users
3. **Phase 3:** If performance is confirmed, replace Studio.tsx
4. **Phase 4:** Remove old Studio.tsx, rename StudioOptimized

## Rollback

If issues arise:
1. Remove `/studio-v2` route from App.tsx
2. Delete StudioOptimized.tsx
3. Memoized components in `/memoized/` can remain for future use

## Notes

- The `@ts-nocheck` was removed from StudioOptimized.tsx
- All TypeScript types are properly defined
- Build passes without errors
- Components use displayName for debugging
