# Phase 1B Context Consolidation Report

**Branch:** `claude/phase1b-context-consolidation`
**Date:** 2026-02-23

---

## Task 1: Consolidate Context Directories

### Before

Two separate context directories existed:

| Path                   | Contents                                                            |
| ---------------------- | ------------------------------------------------------------------- |
| `client/src/context/`  | `StudioContext.tsx`, `index.ts`, `__tests__/StudioContext.test.tsx` |
| `client/src/contexts/` | `AuthContext.tsx`, `__tests__/AuthContext.test.tsx`                 |

### Action Taken

Moved all files from `client/src/context/` → `client/src/contexts/`:

- `client/src/context/StudioContext.tsx` → `client/src/contexts/StudioContext.tsx`
- `client/src/context/__tests__/StudioContext.test.tsx` → `client/src/contexts/__tests__/StudioContext.test.tsx`
- `client/src/context/index.ts` → `client/src/contexts/index.ts`
- Deleted `client/src/context/` directory

### Import Updates

Updated 2 files that referenced the old `@/context/` path:

1. `client/src/hooks/useStudioState.ts:2`
   - Before: `from '@/context/StudioContext'`
   - After: `from '@/contexts/StudioContext'`

2. `client/src/pages/Studio.tsx:17`
   - Before: `from '@/context/StudioContext'`
   - After: `from '@/contexts/StudioContext'`

### Verification

```
grep -r "context/" client/src/ --include="*.ts" --include="*.tsx" | grep -v "contexts/"
# → 0 results (no stale imports)
```

Build result: `✓ built in 1m 26s` — zero errors.

---

## Task 2: useStudioState.ts Usage Analysis

### Finding: USED — do not delete

`useStudioState` is actively imported in **6 production components**:

| File                                                                   | Usage                             |
| ---------------------------------------------------------------------- | --------------------------------- |
| `client/src/components/studio/AssetDrawer/tabs/ProductsTab.tsx`        | State + product actions           |
| `client/src/components/studio/AssetDrawer/tabs/TemplatesTab.tsx`       | State + template actions          |
| `client/src/components/studio/SmartCanvas/sections/GenerateButton.tsx` | canGenerate, isGenerating         |
| `client/src/components/studio/SmartCanvas/sections/OutputSettings.tsx` | platform, aspectRatio, resolution |
| `client/src/components/studio/SmartCanvas/sections/PromptEditor.tsx`   | prompt, setSuggestion             |
| `client/src/components/studio/SmartCanvas/sections/ResultView.tsx`     | state + generation actions        |
| `client/src/components/studio/SmartCanvas/SmartCanvas.tsx`             | hasResult                         |

Also re-exported from `client/src/hooks/index.ts`.

**Action:** Kept as-is. Only import path updated (`@/context/` → `@/contexts/`).

---

## Task 3: StudioContext vs useStudioOrchestrator Analysis

### Finding: Independent Parallel Systems (Different Concerns)

These are NOT duplicates. They serve distinct purposes:

|                 | `StudioContext` (+ `useStudioState`)                 | `useStudioOrchestrator`                                                             |
| --------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------- |
| **Pattern**     | `useReducer` + React Context                         | `useState` / `useEffect` (direct hooks)                                             |
| **Scope**       | Shared global state for UI components                | Local Studio page orchestration                                                     |
| **Consumers**   | SmartCanvas components (6 files)                     | Studio.tsx only (via `@ts-nocheck`)                                                 |
| **State**       | Products, templates, uploads, prompt, platform, mode | Products, templates, API calls, generation, keyboard shortcuts, CSRF, history panel |
| **TS Checking** | Strict TypeScript                                    | `@ts-nocheck`                                                                       |

`useStudioOrchestrator` is a 580+ line hook that also manages: API calls, toast notifications, CSRF tokens, keyboard shortcuts, URL state, haptics, and more. It is not a pure state container.

### Decision: Do NOT merge yet

Merging would require:

1. Refactoring 6 consumer components to use a different hook
2. Rewriting all of Studio.tsx's orchestration logic to use the reducer pattern
3. Extensive testing — this is a high-risk change

**Recommendation for future work:** If desired, `StudioContext` could be made to wrap `useStudioOrchestrator`'s core state fields. But this requires a dedicated sprint with full test coverage.

---

## Files Changed

| File                                                   | Change                        |
| ------------------------------------------------------ | ----------------------------- |
| `client/src/contexts/StudioContext.tsx`                | Created (moved from context/) |
| `client/src/contexts/__tests__/StudioContext.test.tsx` | Created (moved from context/) |
| `client/src/contexts/index.ts`                         | Created (moved from context/) |
| `client/src/context/`                                  | Deleted (entire directory)    |
| `client/src/hooks/useStudioState.ts`                   | Updated import path           |
| `client/src/pages/Studio.tsx`                          | Updated import path           |

---

## Build Status

```
✓ built in 1m 26s
Zero TypeScript errors
Zero stale imports to old context/ path
```
