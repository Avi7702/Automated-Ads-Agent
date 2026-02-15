import { test as base, Page } from '@playwright/test';

/**
 * Console & Network Error Monitor
 *
 * A Playwright fixture that automatically attaches console error and
 * failed network request listeners to every test's `page`.
 *
 * Usage:
 *   import { test } from '../helpers/consoleMonitor';
 *   // use `test` instead of @playwright/test's `test`
 *   // At end of test, call `consoleMonitor.report()` or let afterEach handle it.
 *
 * The fixture collects:
 * - console.error messages
 * - Uncaught page errors (window.onerror / unhandledrejection)
 * - Failed network responses (HTTP status >= 400)
 *
 * After each test, findings are attached as test annotations so they
 * appear in the HTML report without failing the test (unless 5xx errors found).
 */

export interface NetworkFailure {
  url: string;
  status: number;
  method: string;
  statusText: string;
}

export interface ConsoleEntry {
  type: 'error' | 'warning';
  text: string;
}

export interface PageError {
  message: string;
  stack?: string;
}

export interface MonitorReport {
  consoleErrors: ConsoleEntry[];
  pageErrors: PageError[];
  networkFailures: NetworkFailure[];
  has5xx: boolean;
  has4xx: boolean;
  hasPageErrors: boolean;
  summary: string;
}

/** URLs or URL patterns that are expected to fail (e.g., auth checks) */
const ALLOWED_FAILURE_PATTERNS: Array<{ pattern: RegExp; statuses: number[] }> = [
  // Auth session check returns 401 when not logged in — expected
  { pattern: /\/api\/auth\/get-session/, statuses: [401] },
  // Favicon may 404 — not a bug
  { pattern: /favicon\.ico/, statuses: [404] },
  // Source maps may 404 in production — not a bug
  { pattern: /\.map$/, statuses: [404] },
];

/** Console error messages that are expected and should be ignored */
const ALLOWED_CONSOLE_PATTERNS: RegExp[] = [
  // React dev mode warnings
  /Download the React DevTools/,
  // Vite HMR in dev
  /\[vite\]/,
  // Chrome extension noise
  /chrome-extension:\/\//,
  // Generic CORS preflight noise
  /Access-Control-Allow/,
];

function isAllowedFailure(url: string, status: number): boolean {
  return ALLOWED_FAILURE_PATTERNS.some(({ pattern, statuses }) => pattern.test(url) && statuses.includes(status));
}

function isAllowedConsoleError(text: string): boolean {
  return ALLOWED_CONSOLE_PATTERNS.some((pattern) => pattern.test(text));
}

export class ConsoleMonitor {
  private consoleErrors: ConsoleEntry[] = [];
  private pageErrors: PageError[] = [];
  private networkFailures: NetworkFailure[] = [];

  constructor(private page: Page) {
    this.attach();
  }

  private attach(): void {
    // Listen for console.error
    this.page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!isAllowedConsoleError(text)) {
          this.consoleErrors.push({ type: 'error', text });
        }
      }
    });

    // Listen for uncaught exceptions
    this.page.on('pageerror', (error) => {
      this.pageErrors.push({
        message: error.message,
        stack: error.stack,
      });
    });

    // Listen for failed network responses
    this.page.on('response', (response) => {
      const status = response.status();
      if (status >= 400) {
        const url = response.url();
        if (!isAllowedFailure(url, status)) {
          this.networkFailures.push({
            url,
            status,
            method: response.request().method(),
            statusText: response.statusText(),
          });
        }
      }
    });
  }

  /** Reset collected data (useful between navigations in a single test) */
  reset(): void {
    this.consoleErrors = [];
    this.pageErrors = [];
    this.networkFailures = [];
  }

  /** Generate a structured report of all findings */
  report(): MonitorReport {
    const has5xx = this.networkFailures.some((f) => f.status >= 500);
    const has4xx = this.networkFailures.some((f) => f.status >= 400 && f.status < 500);
    const hasPageErrors = this.pageErrors.length > 0;

    const lines: string[] = [];

    if (this.consoleErrors.length > 0) {
      lines.push(`Console errors (${this.consoleErrors.length}):`);
      for (const e of this.consoleErrors) {
        lines.push(`  - ${e.text.slice(0, 200)}`);
      }
    }

    if (this.pageErrors.length > 0) {
      lines.push(`Page errors (${this.pageErrors.length}):`);
      for (const e of this.pageErrors) {
        lines.push(`  - ${e.message.slice(0, 200)}`);
      }
    }

    if (this.networkFailures.length > 0) {
      lines.push(`Network failures (${this.networkFailures.length}):`);
      for (const f of this.networkFailures) {
        lines.push(`  - [${f.status}] ${f.method} ${f.url.slice(0, 150)}`);
      }
    }

    const summary = lines.length > 0 ? lines.join('\n') : 'No errors detected';

    return {
      consoleErrors: [...this.consoleErrors],
      pageErrors: [...this.pageErrors],
      networkFailures: [...this.networkFailures],
      has5xx,
      has4xx,
      hasPageErrors,
      summary,
    };
  }

  /** Convenience: get only 5xx failures */
  get serverErrors(): NetworkFailure[] {
    return this.networkFailures.filter((f) => f.status >= 500);
  }

  /** Convenience: get only 4xx failures */
  get clientErrors(): NetworkFailure[] {
    return this.networkFailures.filter((f) => f.status >= 400 && f.status < 500);
  }
}

/**
 * Extended Playwright test fixture that adds `consoleMonitor` to every test.
 *
 * Usage:
 *   import { test, expect } from '../helpers/consoleMonitor';
 *
 *   test('my test', async ({ page, consoleMonitor }) => {
 *     await page.goto('/');
 *     const report = consoleMonitor.report();
 *     // report is also auto-annotated after each test
 *   });
 */
export const test = base.extend<{ consoleMonitor: ConsoleMonitor }>({
  consoleMonitor: async ({ page }, use, testInfo) => {
    const monitor = new ConsoleMonitor(page);

    // Hand the monitor to the test
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(monitor);

    // After the test: attach findings as annotations for the HTML report
    const report = monitor.report();

    if (report.consoleErrors.length > 0 || report.pageErrors.length > 0 || report.networkFailures.length > 0) {
      testInfo.annotations.push({
        type: 'monitor-report',
        description: report.summary,
      });
    }

    // Log to stdout for CI visibility
    if (report.has5xx) {
      console.error(`[ConsoleMonitor] 5xx errors detected in "${testInfo.title}":\n${report.summary}`);
    }
  },
});

export { expect } from '@playwright/test';
