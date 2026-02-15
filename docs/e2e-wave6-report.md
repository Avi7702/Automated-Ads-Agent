# E2E Wave 6 Report — Settings + Cross-cutting Specs

**Date:** 2026-02-15
**Total files created:** 12
**Total tests written:** ~114

## Summary

Wave 6 covers the Settings page (all 5 sections) and cross-cutting concerns (onboarding, global chat, cross-feature flows, mobile responsiveness, error handling, accessibility, API smoke tests).

All spec files use existing page objects (`SettingsPage`, `OnboardingPage`, `GlobalChatPage`) and helpers (`gotoWithAuth`, `apiGet`, `apiPost`, `MOBILE` viewport).

## Settings Spec Files (5 files)

### `e2e/24-settings-brand.spec.ts` — 12 tests

- Default Brand Profile section load
- Settings heading and description
- Brand profile content area rendering
- Edit Profile button opens dialog
- Dialog has form fields
- Dialog close via Cancel/X
- Brand Values badges display
- Voice & Tone section display
- Visual Style with color preferences
- All 5 section nav buttons visible
- Nav button descriptions visible
- Direct URL access to `?section=brand`

### `e2e/25-settings-knowledge-base.spec.ts` — 8 tests

- KB heading with icon and description
- URL contains `section=knowledge-base`
- KB status indicator (active/empty/loading)
- Products stat card
- Brand Images stat card
- Installation Scenarios stat card
- Gen Templates stat card
- Stat card links to Library tabs + Quick Actions (3 buttons)

### `e2e/26-settings-api-keys.spec.ts` — 14 tests

- AES-256-GCM security notice
- Security shield icon
- 4 service cards: Google Gemini, Cloudinary, Firecrawl, Redis
- Status badges on each card
- Configure/Edit button presence
- Click Configure opens dialog
- Dialog has inputs and Save button
- Dialog can be closed
- n8n Automation section rendering
- n8n URL and API key inputs
- n8n Save button disabled when URL empty
- How It Works info section

### `e2e/27-settings-strategy.spec.ts` — 8 tests

- Content Strategy heading
- URL contains `section=strategy`
- Posting Frequency with 3 options (3/5/7 posts/week)
- Frequency option click marks as active
- Category Targets with sliders + total badge
- Preferred Platforms checkboxes (5 platforms)
- Posting Times with day selectors
- Save Strategy button disabled when no changes

### `e2e/28-settings-usage.spec.ts` — 10 tests

- Monitoring Dashboard heading
- URL contains `section=usage`
- 4 dashboard tabs: API Quota, System Health, Performance, Errors
- Tab switching: Health, Performance, Errors
- API Quota default tab with content panel
- Mobile viewport no overflow

## Cross-cutting Spec Files (7 files)

### `e2e/02-onboarding.spec.ts` — 8 tests

- Onboarding overlay appears for new user
- Skip for now button visible
- Skip dismisses overlay
- Step indicator "Step X of 7"
- Welcome step has Next button
- Next advances through steps
- Back returns to previous step
- Complete all steps reaches Review & Confirm

### `e2e/29-global-chat.spec.ts` — 10 tests

- FAB visible on Studio, Settings, Gallery pages
- Click FAB opens chat panel
- FAB aria-label changes when open
- Click again closes panel
- Chat panel shows Ad Assistant title
- Chat input field present
- Empty state / quick-start suggestions
- Can type message in input

### `e2e/33-cross-feature-flows.spec.ts` — 10 tests

- Navigate Studio -> Gallery -> Pipeline -> Settings -> Studio via header
- Legacy redirects: `/content-planner`, `/usage`, `/brand-profile`, `/settings/api-keys`
- Settings section URL state preserved through navigation
- KB stat card links navigate to Library with correct tab

### `e2e/34-mobile-responsive.spec.ts` — 12 tests

- Studio: no horizontal scroll, content visible
- Gallery: no horizontal scroll, accessible
- Pipeline: no horizontal scroll, content visible
- Settings: no horizontal scroll, sidebar stacks vertically
- Library: no horizontal scroll
- Header renders on mobile
- Global Chat FAB visible and within viewport
- Chat panel fits mobile viewport

### `e2e/35-error-handling.spec.ts` — 10 tests

- Studio fallback when products API returns 500
- Brand Profile error on API 500
- KB section fallback on data fetch failure
- API Keys section handles key fetch errors
- Gallery handles API errors without crashing
- Studio: no critical console errors
- Settings: no critical console errors
- Gallery: no critical console errors
- ErrorBoundary catches render errors (malformed JSON)

### `e2e/36-accessibility.spec.ts` — 10 tests

- Skip-to-content link targets `#main-content`
- Skip-to-content visible on focus
- Header links have accessible text
- Buttons have accessible names
- Settings page has navigation landmark
- Main content area exists (`main#main-content`)
- API key form dialog has `[role="dialog"]`
- Chat panel opens with dialog role
- Brand Profile form fields have labels/accessible names
- Tab key moves focus through interactive elements
- Escape key closes dialogs

### `e2e/37-api-smoke.spec.ts` — 20 tests

- Health: `/api/health` (200), `/api/health/live` (200), `/api/health/ready` (200/503)
- Auth: `/api/auth/demo`, `/api/auth/me`, `/api/auth/logout`
- Products: list (200 with array), invalid ID (404)
- Generations: list (200 with array), invalid ID (404)
- Templates: `/api/templates` (200), `/api/ad-templates/categories` (200)
- Brand: `/api/brand-profile` (200/404)
- Quota: `/api/quota/status` (200 with status)
- Planner: templates (200), posts (200/401)
- Idea Bank: suggest (200/400/422)
- Copy: invalid ID (404)
- Settings: `/api/settings/api-keys` (200/401 with keys)
- Social: `/api/social/accounts` (200/401)

## Technical Notes

- All specs use `gotoWithAuth` for authenticated page navigation
- Onboarding tests use fresh browser contexts (`storageState: { cookies: [], origins: [] }`)
- Error handling tests use `page.route()` to intercept and mock API failures
- Mobile tests use `test.use({ viewport: { width: 375, height: 667 } })`
- API smoke tests use `apiGet`/`apiPost` helpers with `x-e2e-test` header
- Selectors derived from actual component source code (not guessed)
- Tests are permissive where data may not exist (conditional assertions)
- Tags: `@settings`, `@onboarding`, `@chat`, `@cross-feature`, `@mobile`, `@errors`, `@a11y`, `@api`
