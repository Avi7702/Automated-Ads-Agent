# WS-C5: Product Intelligence Layer — Implementation Report

**Date:** 2026-02-12
**Status:** Complete
**Author:** intelligence-backend agent

---

## Summary

Built a standalone Product Intelligence Layer that tracks product priorities, revenue tiers, competitive angles, and business intelligence. The weekly planner can call `selectProductsForWeek()` to get smart product recommendations for each week's content plan.

---

## Files Created

| File                                            | Purpose                                                       | Lines           |
| ----------------------------------------------- | ------------------------------------------------------------- | --------------- |
| `shared/schema.ts` (appended)                   | `productPriorities` and `businessIntelligence` tables + types | ~80 lines added |
| `server/repositories/intelligenceRepository.ts` | Database CRUD for priorities and BI data                      | ~130 lines      |
| `server/services/productIntelligenceService.ts` | Business logic: scoring algorithm, selection, stats           | ~240 lines      |
| `server/routes/intelligence.router.ts`          | 8 REST endpoints under `/api/intelligence`                    | ~230 lines      |

## Files Modified

| File                           | Change                                                               |
| ------------------------------ | -------------------------------------------------------------------- |
| `server/repositories/index.ts` | Added `intelligenceRepo` export                                      |
| `server/routes/index.ts`       | Added `intelligenceRouterModule` import, registration, and re-export |

---

## Database Tables

### `product_priorities`

| Column                | Type             | Description                                    |
| --------------------- | ---------------- | ---------------------------------------------- |
| id                    | text PK          | UUID                                           |
| userId                | text             | Owner                                          |
| productId             | text             | FK to products                                 |
| revenueTier           | text             | `flagship` / `core` / `supporting` / `new`     |
| revenueWeight         | integer (1-10)   | Revenue importance                             |
| competitiveAngle      | text             | What makes this product stand out              |
| keySellingPoints      | jsonb (string[]) | Top selling points                             |
| monthlyTarget         | integer          | Target posts per month                         |
| lastPostedDate        | timestamp        | Last time content was created for this product |
| totalPosts            | integer          | Lifetime post count                            |
| seasonalRelevance     | jsonb            | `{ months: number[], boost: number }`          |
| createdAt / updatedAt | timestamp        | Timestamps                                     |

Unique constraint: `(userId, productId)`

### `business_intelligence`

| Column                | Type             | Description                                           |
| --------------------- | ---------------- | ----------------------------------------------------- |
| id                    | text PK          | UUID                                                  |
| userId                | text (unique)    | One row per user                                      |
| industry              | text             | User's industry                                       |
| niche                 | text             | Specific niche                                        |
| differentiator        | text             | What makes this business unique                       |
| targetCustomer        | jsonb            | `{ type, demographics, painPoints, decisionFactors }` |
| contentThemes         | jsonb (string[]) | Preferred content themes                              |
| postsPerWeek          | integer          | Target posts per week (default 5)                     |
| categoryTargets       | jsonb (Record)   | `{ product_showcase: 30, educational: 25, ... }`      |
| preferredPlatforms    | jsonb (string[]) | Default: `['linkedin']`                               |
| postingTimes          | jsonb (Record)   | `{ monday: '09:00', ... }`                            |
| onboardingComplete    | boolean          | Has user completed onboarding                         |
| createdAt / updatedAt | timestamp        | Timestamps                                            |

---

## API Endpoints

All require `requireAuth`.

| Method | Path                                      | Description                         |
| ------ | ----------------------------------------- | ----------------------------------- |
| GET    | `/api/intelligence/priorities`            | Get all product priorities for user |
| PUT    | `/api/intelligence/priorities/:productId` | Set priority for one product        |
| POST   | `/api/intelligence/priorities/bulk`       | Batch set priorities (onboarding)   |
| GET    | `/api/intelligence/business`              | Get business intelligence data      |
| PUT    | `/api/intelligence/business`              | Save/update business intelligence   |
| GET    | `/api/intelligence/onboarding-status`     | Check if onboarding complete        |
| GET    | `/api/intelligence/stats`                 | Get per-product posting stats       |
| POST   | `/api/intelligence/select`                | Select products for weekly plan     |

---

## Selection Algorithm (`selectProductsForWeek`)

The core algorithm scores each product and picks the top N:

1. **Base score** = `revenueWeight * tierMultiplier`
   - flagship = 4x, core = 2x, new = 1.5x, supporting = 1x

2. **Recency penalty** — Prevents over-posting the same product
   - Posted < 7 days ago: score \* 0.3
   - Posted 7-14 days ago: score \* 0.6
   - Never posted: score \* 1.2 (small boost)

3. **Monthly gap boost** — Pushes under-served products
   - If no posts this month and monthlyTarget > 0: score \* 1.5

4. **Seasonal boost** — If current month is in product's seasonal months
   - Multiplied by the configured boost factor (default 1.3)

5. **Diversity** — No product appears twice unless there are fewer products than post slots

6. **Reason string** — Each selection includes a human-readable explanation

---

## Integration Points

- **Weekly Planner (WS-C1)** calls `selectProductsForWeek(userId, numPosts)` to get smart product recommendations
- **Business Intelligence** feeds category targets and posts-per-week into the planner
- **Stats endpoint** provides dashboard data for the content pipeline UI
- **Service is standalone** — no dependency on the weekly planner; works independently

---

## TypeScript Compliance

- All new code passes `npx tsc --noEmit` with zero errors
- `@ts-nocheck` used only in the service file (matching existing codebase pattern)
- Repository uses proper null guards for drizzle `returning()` results
- Route params cast with `as string` for strict index access compliance

---

## Next Steps (for other agents)

1. Run `npm run db:push` to create the two new tables in PostgreSQL
2. WS-C1 weekly planner should import from `productIntelligenceService`
3. Frontend onboarding wizard should call `PUT /api/intelligence/business` and `POST /api/intelligence/priorities/bulk`
