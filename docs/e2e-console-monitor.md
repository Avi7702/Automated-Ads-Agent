# E2E Console & Network Error Monitoring

## Summary

Added automatic console error and failed network request monitoring to the E2E test suite. This catches production bugs like 500 server errors, 429 rate limits, and uncaught JavaScript exceptions that the existing UI-focused tests missed.

## Files Created

### `e2e/helpers/consoleMonitor.ts` — Reusable Playwright Fixture

A custom Playwright test fixture that wraps `page` and automatically monitors:

- **Console errors** (`console.error` messages)
- **Page errors** (uncaught exceptions — `window.onerror`, `unhandledrejection`)
- **Failed network requests** (HTTP status >= 400)

**Usage in any test:**

```typescript
import { test, expect } from '../helpers/consoleMonitor';

test('my test', async ({ page, consoleMonitor }) => {
  await page.goto('/');
  const report = consoleMonitor.report();
  // report.has5xx, report.has4xx, report.hasPageErrors
  // report.networkFailures, report.consoleErrors, report.pageErrors
});
```

**Features:**

- Allow-list for expected failures (e.g., 401 on auth check, 404 on favicon)
- Allow-list for expected console errors (React DevTools, Vite HMR, Chrome extensions)
- Auto-annotates test results in the HTML report
- Logs 5xx errors to stderr for CI visibility
- `reset()` method for multi-page tests
- Typed exports: `MonitorReport`, `NetworkFailure`, `ConsoleEntry`, `PageError`

### `e2e/38-production-health.spec.ts` — Dedicated Health Check Spec

Visits every major route and monitors for errors:

| Route       | Name          | Auth Required |
| ----------- | ------------- | ------------- |
| `/`         | Studio (Home) | Yes           |
| `/gallery`  | Gallery       | Yes           |
| `/pipeline` | Pipeline      | Yes           |
| `/library`  | Library       | Yes           |
| `/settings` | Settings      | Yes           |
| `/login`    | Login         | No            |

**Per-route tests (3 per route = 18 tests):**

1. **No server errors (5xx)** — FAILS on any 5xx response. Takes screenshot on failure.
2. **No uncaught exceptions** — FAILS on any `window.onerror` / `unhandledrejection`. Takes screenshot.
3. **Console errors report** — Logs console errors and 4xx as warnings. Never fails (informational).

**Aggregate test (1 test):**

4. **Aggregate health check** — Visits all routes sequentially, prints a formatted summary table, FAILS if any 5xx or uncaught exceptions found across all routes.

**Total: 19 tests** (18 per-route + 1 aggregate)

## File Deleted

### `e2e/console-errors.spec.ts` — Replaced

The old spec was a single test that visited only `/`, captured errors in an array, and logged them without any assertions. It has been replaced by the comprehensive `38-production-health.spec.ts`.

## How It Works

1. `ConsoleMonitor` class attaches event listeners to `page` during fixture setup
2. Listeners capture `console.error`, `pageerror`, and `response` events
3. Captured events are filtered against allow-lists (known acceptable errors)
4. At test end, the fixture auto-annotates findings in the HTML report
5. The health spec uses `expect()` assertions to FAIL on 5xx and uncaught exceptions

## Allow-Lists

### Network failures (ignored):

- `/api/auth/get-session` returning 401 (expected when checking auth state)
- `favicon.ico` returning 404
- `.map` files returning 404 (source maps in production)

### Console errors (ignored):

- React DevTools download prompt
- Vite HMR messages
- Chrome extension noise
- CORS preflight messages

## Running

```bash
# Run just the health check
npx playwright test 38-production-health --project=chromium

# Run with verbose output
npx playwright test 38-production-health --project=chromium --reporter=list
```

## Integration with Existing Tests

Any existing spec can opt into monitoring by importing from the fixture instead of `@playwright/test`:

```diff
- import { test, expect } from '@playwright/test';
+ import { test, expect } from './helpers/consoleMonitor';
```

No other changes needed — the `consoleMonitor` fixture is optional and non-breaking.
