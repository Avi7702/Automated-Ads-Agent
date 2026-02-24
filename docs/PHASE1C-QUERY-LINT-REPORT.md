# Phase 1C: React Query staleTime + ESLint Ratchet Report

**Date:** 2026-02-23
**Branch:** `claude/phase1c-query-lint-fixes`

---

## 1. staleTime Change

### File Modified

`client/src/lib/queryClient.ts` — line 141

### Before

```ts
staleTime: Infinity,
```

### After

```ts
// Default: data considered fresh for 60s. Override per-query for different needs:
// - Real-time data (gallery feed): staleTime: 0
// - Semi-static data (products, templates): staleTime: 5 * 60 * 1000
// - Static config (user profile, brand): staleTime: Infinity
staleTime: 60_000,
```

### Why

`staleTime: Infinity` means data is never considered stale — React Query will never
automatically refetch in the background. This is appropriate only for truly static
config. For most app data a 60-second window gives a good UX vs server-load balance.

The `security-guidance` plugin (auto-active on file edits) also enforces this: it
will rewrite `staleTime: Infinity` → `staleTime: 5 * 60 * 1000`. We explicitly chose
60s (stricter) and left the comment block so future devs know the override patterns.

---

## 2. ESLint Warning Ratchet

### Counts

| Stage                                   | Warnings                          |
| --------------------------------------- | --------------------------------- |
| **Baseline (origin/main)**              | 531                               |
| **Post-fix run (auto-fixable)**         | 38 warnings auto-fixable reported |
| **Current count (with Phase 1B diffs)** | 549                               |

> Note: The 549 count includes pre-existing changes from `df3a66b`
> (Phase 1B context consolidation) that landed on the branch before
> Phase 1C started. On a clean `origin/main` baseline the count is 531.

### Auto-fix attempted but reverted

ESLint `--fix` introduced parse errors in 6 files by incorrectly migrating
`useToast` API calls to the `sonner` toast API format. The auto-fixer mishandled
template literals (truncated closing `}` from template strings). Those changes
were fully reverted with `git checkout -- .` before our commit.

### Files changed

| File           | Change                                                           |
| -------------- | ---------------------------------------------------------------- |
| `package.json` | `lint` max-warnings: 600 → 549 (ratchet); lint-staged: 150 → 137 |

### Comment added to package.json

The threshold update follows the "reduce by 50 per sprint" ratchet pattern until 0.
Next sprint target: 499.

---

## 3. Build Verification

`npx vite build` was blocked by a **pre-existing** build failure unrelated to this
branch — `motion/react` package missing in `client/src/components/HistoryTimeline.tsx`.
This failure exists on `origin/main` and is not caused by Phase 1C changes.

The lint check (`npx eslint . --max-warnings 549`) passes with 0 errors.

---

## 4. Files Changed in This PR

- `client/src/lib/queryClient.ts` — staleTime: Infinity → 60_000 with comment block
- `package.json` — lint max-warnings 600→549, lint-staged 150→137
- `docs/PHASE1C-QUERY-LINT-REPORT.md` — this report
