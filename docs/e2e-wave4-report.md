# E2E Wave 4 Report: Gallery + Pipeline Specs

## Summary

Created 6 spec files covering the Gallery page and all 5 Pipeline tabs with a total of **68 tests**.

## Files Created

| File                                | Tests | Scope                                                                                                                                           |
| ----------------------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/12-gallery.spec.ts`            | 16    | Gallery page: heading, search, sort, grid, select, multi-select, delete dialog, empty state, mobile                                             |
| `e2e/13-pipeline-planner.spec.ts`   | 12    | Content Planner tab: heading, weekly balance, suggested post, View Guide, Mark as Posted, categories, templates, Create in Studio, recent posts |
| `e2e/14-pipeline-calendar.spec.ts`  | 12    | Calendar tab: heading, month/year, prev/next nav, weekday headers, Schedule Post dialog, color legend, day cell click, grid layout, mobile      |
| `e2e/15-pipeline-approval.spec.ts`  | 12    | Approval Queue tab: heading, stats cards, filter dropdowns, status/priority filters, Refresh, empty state, bulk actions                         |
| `e2e/16-pipeline-accounts.spec.ts`  | 10    | Social Accounts tab: heading, Refresh, n8n docs link, empty/connected states, setup instructions, supported platforms                           |
| `e2e/17-pipeline-dashboard.spec.ts` | 6     | Dashboard tab: week label, navigation buttons, post cards/empty state, strategy balance, mobile                                                 |

## Test Breakdown by Category

### Gallery (16 tests)

- **Page Load (4):** heading, back button, navigation to Studio, generation count
- **Search/Filter (4):** search input, filter by prompt, clear search, sort dropdown
- **Gallery Items (4):** grid rendering, card click to Studio, select checkbox, multi-select count
- **Delete (3):** confirmation dialog, dialog buttons (Cancel/Delete), clear selection
- **Empty State (1):** message + Go to Studio CTA
- **Mobile (1):** 2-column grid at 375px, no horizontal overflow

### Pipeline Planner (12 tests)

- **Heading (2):** Content Planner heading, NDS subtitle
- **Weekly Balance (2):** card display, Total Posts count
- **Suggested Post (2):** card display, View Guide button
- **Dialogs (2):** View Guide opens template detail, Mark as Posted opens platform dialog
- **Categories (2):** section visible, expand shows Best Practices
- **Templates (1):** card click opens dialog with Hook Formulas / Post Structure
- **Create in Studio (1):** Start Fresh warning dialog

### Pipeline Calendar (12 tests + 1 mobile)

- **Display (2):** heading, subtitle
- **Navigation (3):** month/year display, prev month, next month, Today button
- **Weekday Headers (1):** Sun through Sat
- **Schedule Post (2):** button visible, dialog opens
- **Legend (1):** color legend below grid
- **Grid (2):** day cell click, 7-column layout
- **Embedded (1):** no duplicate headers
- **Mobile (1):** condensed view, no overflow

### Pipeline Approval (12 tests)

- **Heading (2):** title, subtitle
- **Stats (4):** Pending Review, Avg Confidence, Urgent Items, High Priority
- **Filters (3):** card with dropdowns, status filter, priority filter
- **Refresh (1):** button reloads queue
- **Empty State (1):** filtered to empty shows message
- **Embedded (1):** no duplicate headers

### Pipeline Accounts (10 tests)

- **Heading (2):** title, subtitle
- **Refresh (2):** button visible, triggers reload
- **n8n Link (1):** external link with target=\_blank
- **States (1):** empty or connected accounts
- **Setup (2):** instructions card heading, ordered steps
- **Platforms (1):** info block with LinkedIn, Instagram, Facebook, Twitter/X, TikTok
- **Embedded (1):** no duplicate headers

### Pipeline Dashboard (6 tests)

- **Display (1):** Week label or empty/error state
- **Navigation (1):** prev/next week buttons
- **Content (1):** post cards or empty state
- **Strategy (1):** balance section (conditional)
- **Embedded (1):** no duplicate headers
- **Mobile (1):** no horizontal overflow at 375px

## Architecture Decisions

- **Auth:** All tests use `gotoWithAuth(page, url)` from `e2e/helpers/ensureAuth.ts`
- **Tags:** `@gallery` and `@pipeline` for test organization/filtering
- **Viewport:** Mobile tests use `MOBILE` preset (375x667) from `e2e/helpers/viewport.ts`
- **Lazy loading:** Tests use `test.slow()` for pipeline tabs with Suspense boundaries
- **Graceful skips:** Tests that depend on data (gallery items, weekly plan) use `test.skip()` when no data is available
- **Selectors derived from source:** All selectors match actual component markup from GalleryPage.tsx, Pipeline.tsx, ContentPlanner.tsx, ApprovalQueue.tsx, SocialAccounts.tsx, CalendarView.tsx, WeeklyPlanView.tsx
- **Page objects available:** `GalleryPage` and `PipelinePage` page objects exist in `e2e/pages/` for more complex test scenarios

## No Blockers

All 6 files written successfully.
