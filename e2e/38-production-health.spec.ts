/* eslint-disable no-console */
import { test, expect } from './helpers/consoleMonitor';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * Production Health Check E2E Tests
 *
 * Monitors every major route for:
 * - Console errors (console.error)
 * - Uncaught JavaScript exceptions (window.onerror / unhandledrejection)
 * - Failed network requests (HTTP 4xx and 5xx)
 *
 * 5xx server errors FAIL the test — these are always bugs.
 * 4xx client errors are reported as warnings (some are expected, e.g., auth checks).
 * Console errors and page exceptions are reported but only fail on severity.
 *
 * This replaces the old `console-errors.spec.ts` with comprehensive per-route monitoring.
 */

/** Routes to check. Authenticated routes use gotoWithAuth. */
const ROUTES = [
  { path: '/', name: 'Studio (Home)', requiresAuth: true },
  { path: '/gallery', name: 'Gallery', requiresAuth: true },
  { path: '/pipeline', name: 'Pipeline', requiresAuth: true },
  { path: '/library', name: 'Library', requiresAuth: true },
  { path: '/settings', name: 'Settings', requiresAuth: true },
  { path: '/login', name: 'Login', requiresAuth: false },
] as const;

/** Time to let the page settle after load (in ms) — allows async API calls to complete */
const SETTLE_TIME_MS = 3000;

test.describe('Production Health Check', { tag: '@health' }, () => {
  for (const route of ROUTES) {
    test.describe(route.name, () => {
      test(`no server errors (5xx) on ${route.path}`, async ({ page, consoleMonitor }) => {
        // Navigate to the route
        if (route.requiresAuth) {
          await gotoWithAuth(page, route.path);
        } else {
          // For login page, use a fresh context without auth
          await page.goto(route.path);
          await page.waitForLoadState('domcontentloaded');
        }

        // Wait for async API calls to settle
        // Using a short polling wait for network to go quiet instead of fixed timeout
        await page.waitForLoadState('domcontentloaded');
        await page.waitForTimeout(SETTLE_TIME_MS);

        // Collect the report
        const report = consoleMonitor.report();

        // Log findings for CI output
        if (report.summary !== 'No errors detected') {
          console.log(`\n=== ${route.name} (${route.path}) ===`);
          console.log(report.summary);
        }

        // Take screenshot if there are any issues
        if (report.has5xx || report.hasPageErrors) {
          await page.screenshot({
            path: `e2e/test-results/health-${route.path.replace(/\//g, '_') || 'home'}.png`,
            fullPage: true,
          });
        }

        // FAIL on 5xx — server errors are always bugs
        if (report.has5xx) {
          const serverErrors = report.networkFailures
            .filter((f) => f.status >= 500)
            .map((f) => `  [${f.status}] ${f.method} ${f.url}`)
            .join('\n');
          expect(report.has5xx, `Server errors (5xx) detected on ${route.path}:\n${serverErrors}`).toBe(false);
        }
      });

      test(`no uncaught exceptions on ${route.path}`, async ({ page, consoleMonitor }) => {
        // Navigate to the route
        if (route.requiresAuth) {
          await gotoWithAuth(page, route.path);
        } else {
          await page.goto(route.path);
          await page.waitForLoadState('domcontentloaded');
        }

        // Let page settle
        await page.waitForTimeout(SETTLE_TIME_MS);

        const report = consoleMonitor.report();

        // FAIL on uncaught JavaScript exceptions — these crash the app
        if (report.hasPageErrors) {
          const errors = report.pageErrors.map((e) => `  ${e.message}`).join('\n');

          await page.screenshot({
            path: `e2e/test-results/health-exception-${route.path.replace(/\//g, '_') || 'home'}.png`,
            fullPage: true,
          });

          expect(report.hasPageErrors, `Uncaught exceptions on ${route.path}:\n${errors}`).toBe(false);
        }
      });

      test(`console errors report for ${route.path}`, async ({ page, consoleMonitor }) => {
        // Navigate to the route
        if (route.requiresAuth) {
          await gotoWithAuth(page, route.path);
        } else {
          await page.goto(route.path);
          await page.waitForLoadState('domcontentloaded');
        }

        // Let page settle
        await page.waitForTimeout(SETTLE_TIME_MS);

        const report = consoleMonitor.report();

        // Log console errors as warnings — they don't fail the test
        // but are visible in test output and HTML report
        if (report.consoleErrors.length > 0) {
          console.warn(`[WARN] ${report.consoleErrors.length} console error(s) on ${route.path}:`);
          for (const err of report.consoleErrors) {
            console.warn(`  - ${err.text.slice(0, 300)}`);
          }
        }

        // Log 4xx as informational — some are expected
        if (report.has4xx) {
          const clientErrors = report.networkFailures.filter((f) => f.status >= 400 && f.status < 500);
          console.warn(`[INFO] ${clientErrors.length} client error(s) (4xx) on ${route.path}:`);
          for (const err of clientErrors) {
            console.warn(`  - [${err.status}] ${err.method} ${err.url.slice(0, 150)}`);
          }
        }

        // This test always passes — it's for reporting only.
        // 5xx and exceptions are caught by the other tests above.
        expect(true).toBe(true);
      });
    });
  }
});

test.describe('Production Health Summary', { tag: '@health' }, () => {
  test('aggregate health check across all routes', async ({ page, consoleMonitor }) => {
    const allFindings: Array<{ route: string; report: ReturnType<typeof consoleMonitor.report> }> = [];

    for (const route of ROUTES) {
      consoleMonitor.reset();

      if (route.requiresAuth) {
        await gotoWithAuth(page, route.path);
      } else {
        await page.goto(route.path);
        await page.waitForLoadState('domcontentloaded');
      }

      await page.waitForTimeout(SETTLE_TIME_MS);

      allFindings.push({
        route: `${route.name} (${route.path})`,
        report: consoleMonitor.report(),
      });
    }

    // Print aggregate summary
    console.log('\n========================================');
    console.log('  PRODUCTION HEALTH SUMMARY');
    console.log('========================================');

    let total5xx = 0;
    let total4xx = 0;
    let totalConsoleErrors = 0;
    let totalPageErrors = 0;

    for (const finding of allFindings) {
      const r = finding.report;
      const status5xx = r.networkFailures.filter((f) => f.status >= 500).length;
      const status4xx = r.networkFailures.filter((f) => f.status >= 400 && f.status < 500).length;

      total5xx += status5xx;
      total4xx += status4xx;
      totalConsoleErrors += r.consoleErrors.length;
      totalPageErrors += r.pageErrors.length;

      const icon = status5xx > 0 ? 'FAIL' : r.pageErrors.length > 0 ? 'WARN' : 'OK';
      console.log(
        `  [${icon}] ${finding.route}: ${status5xx} 5xx, ${status4xx} 4xx, ${r.consoleErrors.length} console, ${r.pageErrors.length} exceptions`,
      );
    }

    console.log('----------------------------------------');
    console.log(
      `  TOTALS: ${total5xx} 5xx, ${total4xx} 4xx, ${totalConsoleErrors} console errors, ${totalPageErrors} exceptions`,
    );
    console.log('========================================\n');

    // FAIL if any 5xx errors found across all routes
    expect(
      total5xx,
      `${total5xx} server error(s) detected across all routes. Check individual test output for details.`,
    ).toBe(0);

    // FAIL if any uncaught exceptions found
    expect(
      totalPageErrors,
      `${totalPageErrors} uncaught exception(s) detected across all routes. Check individual test output for details.`,
    ).toBe(0);
  });
});
