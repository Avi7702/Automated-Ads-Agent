# E2E Wave 2 Report — Login, Navigation, Legacy Redirects, 404

## Summary

Wave 2 adds 53 E2E tests across 4 spec files covering core authentication, navigation, legacy route redirects, and the 404 error page.

## Files Created

| File                              | Tests | Tag                 | Description                                                               |
| --------------------------------- | ----- | ------------------- | ------------------------------------------------------------------------- |
| `e2e/01-login.spec.ts`            | 18    | `@login`            | Login form UI, password visibility, validation, auth flow, auth redirects |
| `e2e/30-navigation.spec.ts`       | 14    | `@navigation`       | Desktop header nav, theme toggle, logout, mobile sheet nav                |
| `e2e/31-legacy-redirects.spec.ts` | 16    | `@legacy-redirects` | All legacy route -> new route redirects from App.tsx                      |
| `e2e/32-404-page.spec.ts`         | 5     | `@404`              | 404 page rendering, buttons, navigation back to Studio                    |

## Test Breakdown

### 01-login.spec.ts (18 tests)

**Page Display (4)**

- Shows login form with email, password, sign in button
- Shows Google OAuth button
- Sign in button disabled when empty
- Sign in button enables when both fields filled

**Password Visibility (3)**

- Password starts hidden
- Toggle reveals password
- Toggle again hides password

**Form Validation (2)**

- Email field requires valid email format
- Both fields have required attribute

**Authentication Flow (4)**

- Valid demo credentials login + redirect to /
- Invalid email shows error
- Wrong password shows error
- Empty submit does not navigate

**Auth Redirects (3)** — Uses empty storageState (unauthenticated)

- Unauthenticated user on / redirects to /login
- Unauthenticated user on /settings redirects to /login
- Unauthenticated user on /gallery redirects to /login

Note: Some tests overlap with existing `e2e/login.spec.ts` but use more specific selectors and the unauthenticated storageState pattern.

### 30-navigation.spec.ts (14 tests)

**Desktop Header Nav (6)**

- Logo click navigates to /
- Studio nav link has active state on /
- Gallery nav navigates to /gallery
- Pipeline nav navigates to /pipeline
- Library nav navigates to /library
- Settings nav navigates to /settings

**Theme Toggle (3)**

- Toggle to Dark adds dark class
- Toggle to Light removes dark class
- Toggle to System mode

**Auth (1)**

- Logout button destroys session and redirects to /login

**Mobile Nav at 375px (3)**

- Hamburger opens navigation sheet
- Mobile nav items navigate correctly
- Sheet closes after navigation

Note: Some overlap with `e2e/journey-navigation.spec.ts` — these are standalone, independently runnable versions.

### 31-legacy-redirects.spec.ts (16 tests)

**Library redirects (7):** /products, /brand-images, /template-library, /templates, /admin/templates, /installation-scenarios, /learn-from-winners

**Pipeline redirects (3):** /content-planner, /approval-queue, /social-accounts

**Settings redirects (3):** /usage, /brand-profile, /settings/api-keys

**Studio redirects (1):** /generation/123

**404 (1):** /nonexistent-route renders 404

**Chain validation (1):** Double-redirect chains resolve correctly

### 32-404-page.spec.ts (5 tests)

- Shows 404 heading
- Shows descriptive text
- Go to Studio button navigates to /
- Go Home button navigates to /
- Renders on unknown route /some-random-page

## Key Design Decisions

1. **Unauthenticated tests** (`01-login.spec.ts`): Uses `test.use({ storageState: { cookies: [], origins: [] } })` to override the default authenticated state from the setup project.

2. **Page Objects**: Reuses existing `LoginPage` and `NotFoundPage` from `e2e/pages/`.

3. **Auth helper**: Uses `gotoWithAuth()` from `e2e/helpers/ensureAuth.ts` for authenticated page navigation with retry logic.

4. **Selectors**: All selectors derived from actual component DOM — `aria-label`, `role`, `aria-current`, CSS classes, and element IDs as seen in Login.tsx, Header.tsx, ThemeToggle.tsx, and not-found.tsx.

5. **Parallel-safe**: Each test is independent with no shared state between tests. Mobile tests use `test.use({ viewport })` scoping.

## Running

```bash
# Run all wave 2 tests
npx playwright test e2e/01-login.spec.ts e2e/30-navigation.spec.ts e2e/31-legacy-redirects.spec.ts e2e/32-404-page.spec.ts

# Run by tag
npx playwright test --grep @login
npx playwright test --grep @navigation
npx playwright test --grep @legacy-redirects
npx playwright test --grep @404
```
