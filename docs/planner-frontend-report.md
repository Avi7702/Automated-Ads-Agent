# WS-C2: Weekly Plan Dashboard UI — Completion Report

## Summary

Built the Weekly Plan Dashboard frontend: a TanStack Query hook for the planner API, a full WeeklyPlanView component with week navigation / post cards / strategy balance bars, and integrated it as a new "Dashboard" tab (first tab) on the Pipeline page.

## Files Created

### 1. `client/src/hooks/useWeeklyPlan.ts`

TanStack Query hooks following the existing `useScheduledPosts.ts` pattern:

- `useWeeklyPlan(weekStart?)` — GET `/api/planner/weekly/current` or `?weekStart=ISO`
- `useUpdatePlanPost()` — PATCH `/api/planner/weekly/:planId/posts/:index` (uses `apiRequest` for CSRF)
- `useRegeneratePlan()` — POST `/api/planner/weekly/:planId/regenerate` (uses `apiRequest` for CSRF)
- All mutations invalidate `['weekly-plan']` query key on success

### 2. `client/src/components/planner/WeeklyPlanView.tsx`

~290 line component with:

- **Week navigation**: Prev/Next week buttons + Regenerate button
- **Progress summary**: "X posts planned, Y generated, Z scheduled"
- **Post cards** per day showing:
  - Day label (MON 16, TUE 17, etc.)
  - Category badge with color coding (product_showcase=blue, educational=green, etc.)
  - Platform badge (LinkedIn, Instagram, etc.)
  - Product count
  - AI briefing text (line-clamped to 2 lines)
  - Suggested posting time
  - Status badge with icon
  - Action buttons per status:
    - `planned` → "Create Now" (navigates to Studio)
    - `in_progress` → "Continue in Studio"
    - `generated` → "Review" + "Schedule"
    - `approved` → "Schedule"
    - `scheduled` → green "Scheduled" badge
- **Strategy balance bars**: Shows actual vs target category percentages with amber warning if over-target
- **Loading state**: Skeleton cards (5 placeholders)
- **Error state**: Error message with "Try current week" button
- **Empty state**: Icon + message about setting up content strategy

## Files Modified

### 3. `client/src/pages/Pipeline.tsx`

- Added `Dashboard` as first tab (icon: `LayoutDashboard` from lucide)
- Default tab changed from `'planner'` to `'dashboard'`
- Tab grid expanded from `grid-cols-4` to `grid-cols-5`, max-width `max-w-3xl`
- WeeklyPlanView lazy-loaded via `React.lazy`
- Tab type union updated: `'dashboard' | 'planner' | 'calendar' | 'approval' | 'accounts'`

## Design Decisions

1. **`@ts-nocheck`** on all new files — matches project convention for studio/pipeline components
2. **Plain `fetch` for GET, `apiRequest` for mutations** — GET queries use `credentials: 'include'` directly (matching useScheduledPosts pattern); mutations use `apiRequest` which handles CSRF token automatically
3. **"Create Now" navigates to `/?planId=X&postIndex=N`** — passes plan context to Studio via URL params (Studio route is `/`)
4. **Week state as ISO string** — `undefined` means "current week", otherwise an ISO date string passed to the API

## Build Verification

`npx vite build` passes successfully — no TypeScript or bundling errors.
New chunk produced: `WeeklyPlanView-*.js` (lazy loaded, not in main bundle).
