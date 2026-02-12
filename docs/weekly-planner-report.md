# WS-C1: Weekly Plan Engine — Implementation Report

## Summary

Built a complete Weekly Content Planner backend that generates a strategy-driven weekly post plan. When a user opens the planner, the system creates a plan like: "5 posts this week - 2 product showcases (Mon, Wed), 1 educational (Tue), 1 industry insight (Thu), 1 engagement (Fri)." Each post has a suggested product, platform, time slot, and briefing.

## Files Created

### 1. `shared/schema.ts` (modified — added at end)

- **`WeeklyPlanPost` interface** — Defines a single post slot with: dayOfWeek, scheduledDate, suggestedTime, category, productIds, platform, briefing, status, and optional links to generation/scheduledPost.
- **`weeklyPlans` table** — Drizzle ORM table with: id (varchar, gen_random_uuid), userId, weekStart (Monday), status (draft/active/completed), posts (JSONB array of WeeklyPlanPost), metadata (postsPerWeek, categoryTargets, generatedAt), timestamps.
- **Indexes** — `weekly_plans_user_week_idx` (userId + weekStart), `weekly_plans_status_idx` (status).
- **Insert schema and types** — `insertWeeklyPlanSchema`, `InsertWeeklyPlan`, `WeeklyPlan` exported.

### 2. `server/services/weeklyPlannerService.ts` (new — ~290 lines)

Core functions:

| Function                                                    | Description                                                                        |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `generateWeeklyPlan(userId, weekStartDate)`                 | Get or create a plan for a week. Idempotent — returns existing plan if one exists. |
| `getWeeklyPlan(userId, weekStart)`                          | Fetch existing plan (returns null if none).                                        |
| `updatePlanPostStatus(planId, postIndex, status, linkIds?)` | Update a single post's status + optional generationId/scheduledPostId link.        |
| `regeneratePlan(planId)`                                    | Delete and recreate a plan with fresh data.                                        |

**Generation logic:**

1. Adjusts any date to the previous Monday (`toMonday()`)
2. Checks for existing plan (idempotent)
3. Uses default category targets: product_showcase 30%, educational 25%, industry_insights 20%, company_updates 15%, engagement 10%
4. Distributes 5 posts across categories using proportional allocation with remainder distribution
5. Fetches user's products via `storage.getProducts()`
6. Sorts products by recency (recently-posted products deprioritized — placeholder for WS-C5)
7. Round-robin product assignment to avoid same product appearing twice
8. Rule-based platform assignment: educational/industry/company -> LinkedIn, product_showcase/engagement -> Instagram
9. Default time slots per day: Mon 09:00, Tue 10:00, Wed 09:00, Thu 10:00, Fri 11:00
10. Template-based briefings (no AI call, instant generation)
11. Saves plan to `weeklyPlans` table

### 3. `server/routes/weeklyPlanner.router.ts` (new — ~150 lines)

| Method  | Path                                       | Description                         |
| ------- | ------------------------------------------ | ----------------------------------- |
| `GET`   | `/api/planner/weekly/current`              | Get/generate plan for current week  |
| `GET`   | `/api/planner/weekly?weekStart=ISO`        | Get/generate plan for specific week |
| `PATCH` | `/api/planner/weekly/:planId/posts/:index` | Update post status                  |
| `POST`  | `/api/planner/weekly/:planId/regenerate`   | Regenerate plan                     |

- All endpoints require authentication (`requireAuth`)
- Follows existing router patterns: `RouterFactory`, `asyncHandler`, `handleRouteError`
- `/current` registered before parameterized routes to avoid route collision
- Validates: status values, date formats, post index bounds

### 4. `server/routes/index.ts` (modified)

- Added `import { weeklyPlannerRouterModule } from './weeklyPlanner.router'`
- Registered in `routerModules` array after `planningRouterModule`
- Added re-export at bottom

## Design Decisions

1. **Idempotent generation**: `GET /weekly?weekStart=...` creates the plan on first access, returns cached on subsequent calls. No separate "create" endpoint needed.
2. **`@ts-nocheck`**: Matches project convention for new service/route files.
3. **`varchar` + `gen_random_uuid()`**: Matches all existing table ID patterns instead of the `text` + `$defaultFn` pattern from the spec.
4. **No AI dependency**: Briefings use template strings. The engine works instantly without any LLM call.
5. **Product intelligence stub**: `getRecentlyPostedProductIds()` returns empty set for now — designed to be enhanced by WS-C5.
6. **Prefix `/api/planner`**: Same prefix as existing planning routes — the weekly planner is under `/api/planner/weekly/*` which doesn't conflict with existing `/api/content-planner/*` routes.

## Verification

- TypeScript compilation: `npx tsc --noEmit` shows zero errors from new files
- All pre-existing errors are unrelated (client test files, lucide-react JSX types)
- Router registration confirmed in `routes/index.ts`
