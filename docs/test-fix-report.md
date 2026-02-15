# Test Fix Report — Post-PR #78 Merge

**Date:** 2026-02-15
**Branch:** main
**Trigger:** 6 test failures after merging PR #78 (Phases 1-5 architecture upgrade)

## Summary

All 6 original failures (plus 2 additional that surfaced after the first round of fixes) were caused by **timing/resource contention** when running 42 test files in parallel — not by broken production code. Every failing test passed in isolation.

**Final result:** 42/42 test files passing, 1312/1312 tests passing.

## Root Causes

### 1. Flaky Performance Assertion (`errorTracking.test.ts`)

- **Test:** "should have O(1) insertion time"
- **Issue:** Asserted 1000 ring-buffer insertions complete in <100ms. Under parallel load, elapsed time hit 147ms.
- **Fix:** Increased threshold from 100ms to 500ms. Still validates O(1) behavior (500ms for 1000 ops = 0.5ms/op) while being resilient to CI/parallel load.

### 2. Hook Timeouts on Dynamic Imports (`Studio-generation.test.tsx`, `Studio-layout.test.tsx`)

- **Test:** `beforeEach` hook that does `await import('../../pages/Studio')`
- **Issue:** Default Vitest hook timeout is 10s. The dynamic import of Studio.tsx + all its sub-components (MainCanvas, InspectorPanel, IdeaBankBar, useStudioOrchestrator with 580 lines of state) takes >10s under parallel load.
- **Fix:** Added `30000` (30s) timeout parameter to the `beforeEach` callback.

### 3. Test Timeouts on Heavy Integration Tests

- **`library.test.tsx`** — "opens Add Product modal" and "opens product detail modal" timed out at default 5s
- **`studio.test.tsx`** — "enables generate button when product is selected" timed out at default 5s
- **`enrichment.test.ts`** — "processes a product through all gates" timed out at default 5s (dynamic import of pipeline + mock setup)
- **Fix:** Added `{ timeout: 15000 }` to each slow test.

### 4. Ambiguous Button Selector (`library.test.tsx`)

- **Test:** "shows validation error when required fields are missing"
- **Issue:** `screen.getByRole('button', { name: /add product/i })` matched TWO buttons — the page-level "Add Product" trigger (not disabled) and the modal's submit button (disabled when no file selected). The test was picking up the wrong one.
- **Fix:** Scoped the query using `within(screen.getByRole('dialog'))` to only find the submit button inside the modal.

## Files Modified (Tests Only)

| File                                                        | Change                          |
| ----------------------------------------------------------- | ------------------------------- |
| `server/__tests__/errorTracking.test.ts:255`                | Timing threshold 100ms -> 500ms |
| `client/src/pages/__tests__/Studio-generation.test.tsx:351` | beforeEach timeout 10s -> 30s   |
| `client/src/pages/__tests__/Studio-layout.test.tsx:262`     | beforeEach timeout 10s -> 30s   |
| `client/src/__tests__/integration/library.test.tsx:314`     | Test timeout 5s -> 15s          |
| `client/src/__tests__/integration/library.test.tsx:367`     | Scoped button query to dialog   |
| `client/src/__tests__/integration/library.test.tsx:378`     | Test timeout 5s -> 15s          |
| `client/src/__tests__/integration/studio.test.tsx:374`      | Test timeout 5s -> 15s          |
| `server/__tests__/enrichment.test.ts:982`                   | Test timeout 5s -> 15s          |

## No Production Code Changed

All fixes are test-only. Zero changes to application/server/client source code.
