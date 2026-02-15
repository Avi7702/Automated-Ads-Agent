# E2E Fix Report: Group 1 (Login + Legacy Redirects + 404)

**Date:** 2026-02-15
**Spec Files:** `e2e/01-login.spec.ts`, `e2e/31-legacy-redirects.spec.ts`, `e2e/32-404-page.spec.ts`
**Target:** Production (`https://automated-ads-agent-production.up.railway.app`)

## Initial Run Results

- **30 passed, 9 failed** (out of 39 total)
- All 16 legacy redirect tests passed on first run
- Failures were in login spec (7) and 404 page spec (2)

## Failures and Fixes

### Issue 1: `signInButton` strict mode violation (5 tests)

**Affected tests:**

- `shows login form with email, password, and sign in button`
- `sign in button is disabled when fields are empty`
- `sign in button enables when both fields are filled`
- `invalid email shows error message`
- `empty submit does not navigate`

**Root cause:** The `LoginPage` page object used `page.getByRole('button', { name: /Sign In/i })` which matched TWO buttons on the page:

1. The submit button: `<button type="submit">Sign In</button>`
2. The Google OAuth button: `<button type="button">Sign in with Google</button>`

The regex `/Sign In/i` matched both because "Sign in with Google" contains "Sign In".

**Fix (in `e2e/pages/login.page.ts`):**

```diff
- this.signInButton = page.getByRole('button', { name: /Sign In/i });
+ this.signInButton = page.getByRole('button', { name: 'Sign In', exact: true });
```

### Issue 2: `localhost:3000` API calls (2 tests)

**Affected tests:**

- `valid demo credentials login and redirect to Studio /`
- `wrong password shows error`

**Root cause:** Both tests called `request.get('http://localhost:3000/api/auth/demo')` to ensure the demo user exists before testing login. Since tests run against production (not localhost), this caused `ECONNREFUSED ::1:3000`.

**Fix (in `e2e/01-login.spec.ts`):**

- Removed the `request.get('http://localhost:3000/api/auth/demo')` pre-check from both tests
- The demo user already exists on production (auth setup creates it)
- Changed `valid demo credentials` test signature from `{ page, request }` to `{ page, baseURL }` (request fixture no longer needed)
- Changed `wrong password shows error` test signature from `{ page, request }` to `{ page }`

### Issue 3: 404 page button strict mode violation (2 tests)

**Affected tests:**

- `Go to Studio button navigates to /`
- `Go Home button navigates to /`

**Root cause:** The `NotFoundPage` page object used `.or()` to match either a button or link role:

```ts
page.getByRole('button', { name: /Go to Studio/i }).or(page.getByRole('link', { name: /Go to Studio/i }));
```

The actual DOM has a `<Link href="/">` (renders as `<a>`) wrapping a `<Button>` (renders as `<button>`). Both the `<a>` and `<button>` have accessible name "Go to Studio", so `.or()` resolved to 2 elements.

**Fix (in `e2e/pages/not-found.page.ts`):**

```diff
- this.goToStudioButton = page
-   .getByRole('button', { name: /Go to Studio/i })
-   .or(page.getByRole('link', { name: /Go to Studio/i }));
- this.goHomeButton = page.getByRole('button', { name: /Go Home/i })
-   .or(page.getByRole('link', { name: /Go Home/i }));
+ this.goToStudioButton = page.getByRole('link', { name: /Go to Studio/i });
+ this.goHomeButton = page.getByRole('link', { name: /Go Home/i });
```

## Final Run Results

**39 passed, 0 failed** -- all tests green.

## Files Modified

| File                          | Change                                                    |
| ----------------------------- | --------------------------------------------------------- |
| `e2e/pages/login.page.ts`     | `signInButton` locator: regex -> exact match              |
| `e2e/01-login.spec.ts`        | Removed `localhost:3000` API calls from 2 auth flow tests |
| `e2e/pages/not-found.page.ts` | Button locators: `.or()` combo -> single `link` role      |
