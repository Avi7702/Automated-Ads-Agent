# Phase 2A: Hook Files Type Safety Report

**Branch:** `claude/phase2a-hooks-typefix`
**Date:** 2026-02-23
**Build Status:** PASS (`npx tsc --noEmit` -- zero errors from hook files)

## Summary

Removed `@ts-nocheck` from **9 hook files** and fixed all resulting TypeScript errors. Also replaced **2 explicit `any` types** in `useJobStatus.ts` (which never had `@ts-nocheck`). All hook source files now pass `npx tsc --noEmit` with zero errors under strict TypeScript settings including `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, and `noPropertyAccessFromIndexSignature`.

## Files Modified

### @ts-nocheck Removed (9 files)

| File                          | @ts-nocheck |      Type Fixes Applied       |
| ----------------------------- | :---------: | :---------------------------: |
| `useStudioOrchestrator.ts`    |   Removed   |           15+ fixes           |
| `useAgentPlan.ts`             |   Removed   |            7 fixes            |
| `useBusinessIntelligence.ts`  |   Removed   |            6 fixes            |
| `useScheduledPosts.ts`        |   Removed   |            8 fixes            |
| `useStyleReferences.ts`       |   Removed   |            2 fixes            |
| `useVoiceInput.ts`            |   Removed   | 4 fixes (+ type declarations) |
| `useWeeklyPlan.ts`            |   Removed   |            3 fixes            |
| `useCollaboration.ts`         |   Removed   |       0 (already clean)       |
| `useUploadStatus.example.tsx` |   Removed   |            2 fixes            |

### Explicit `any` Replaced (1 file, no @ts-nocheck)

| File              | Changes                                                                                                |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `useJobStatus.ts` | `result?: any` -> `result?: unknown`, `onComplete?: (result: any)` -> `onComplete?: (result: unknown)` |

## Types of Fixes Applied

### 1. Untyped `res.json()` Calls

Every `res.json()` call was given an explicit type assertion to avoid implicit `any`:

```typescript
// Before
const data = await res.json();

// After
const data = (await res.json()) as { csrfToken: string };
```

**Files affected**: useStudioOrchestrator.ts, useAgentPlan.ts, useBusinessIntelligence.ts, useScheduledPosts.ts, useStyleReferences.ts, useWeeklyPlan.ts, useUploadStatus.example.tsx

### 2. Array Index Access (`noUncheckedIndexedAccess`)

Array access returns `T | undefined` under strict config. Fixed by assigning to local variable and using truthiness guard:

```typescript
// Before (fails: arr[0] is T | undefined)
if (arr.length > 0) {
  use(arr[0].field);
}

// After
const first = arr[0];
if (first) {
  use(first.field);
}
```

**Files affected**: useStudioOrchestrator.ts, useVoiceInput.ts

### 3. `exactOptionalPropertyTypes` Compliance

Cannot assign `undefined` to optional properties. Fixed by conditionally including properties or using `?? null`:

```typescript
// Before (fails: undefined not assignable to string | null)
setGeneratedImage(data.imageUrl);

// After
setGeneratedImage(data.imageUrl ?? null);
```

**Files affected**: useStudioOrchestrator.ts, useScheduledPosts.ts

### 4. Missing Mutation Context Types

React Query `useMutation` needs a 4th generic for optimistic update context:

```typescript
// Before
useMutation<ScheduledPost, CalendarApiError, { postId: string; scheduledFor: string }>;

// After
useMutation<
  ScheduledPost,
  CalendarApiError,
  { postId: string; scheduledFor: string },
  { previousEntries: [QueryKey, ScheduledPost[] | undefined][] }
>;
```

**Files affected**: useScheduledPosts.ts (useReschedulePost, useCancelPost)

### 5. Wrong Return Types

Fixed `Promise<ScheduledPost>` (singular) to `Promise<ScheduledPost[]>` (array) and `Promise<DayCount[]>`:

**Files affected**: useScheduledPosts.ts (useCalendarPosts, useCalendarCounts)

### 6. Web Speech API Type Declarations

Added local type augmentation for `SpeechRecognition`, `SpeechRecognitionEvent`, `SpeechRecognitionErrorEvent`, and `Window` interface extensions (not included in standard TS DOM lib):

**Files affected**: useVoiceInput.ts

### 7. `any` -> `Record<string, unknown>`

```typescript
// Before
extractedElements: any | null;

// After
extractedElements: Record<string, unknown> | null;
```

**Files affected**: useStyleReferences.ts

### 8. Unused Import / Parameter Cleanup

- Removed unused `getCsrfToken` import from useAgentPlan.ts
- Renamed `catch (pollErr)` to `catch (_pollErr)` for unused catch parameter
- Added missing `useState` import to useUploadStatus.example.tsx

### 9. `as const` Maps

Changed Record-typed objects to `as const` assertions to enable property access without bracket notation under `noPropertyAccessFromIndexSignature`:

**Files affected**: useStudioOrchestrator.ts (formatAspectRatioMap)

## Verification

- `npx tsc --noEmit` produces **0 errors** from any hook file
- All remaining tsc errors are in non-hook files (ApprovalQueue.tsx merge conflicts -- out of scope)
- Zero `any` types remain in hook source files (test file `hooks.test.ts` excluded)
- Zero `@ts-nocheck` directives remain in any target hook file

## Out of Scope

- `use-toast.ts` -- Exists in hooks directory but was scheduled for deletion in Phase 1A
- `hooks/__tests__/hooks.test.ts` -- Test file; `any` types in mocks are acceptable
- Non-hook files with type errors (ApprovalQueue.tsx, AgentChatPanel.tsx, etc.)
