import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Automated accessibility testing with axe-core.
 *
 * Scans all 4 main routes for WCAG 2.1 AA violations.
 * Fails on critical and serious violations only.
 */

test.describe('Accessibility — axe-core scans', () => {
  test('Studio page (/) has no critical/serious a11y violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critical, `Found ${critical.length} critical/serious a11y violations on /`).toHaveLength(0);
  });

  test('Gallery page (/gallery) has no critical/serious a11y violations', async ({ page }) => {
    await page.goto('/gallery');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critical, `Found ${critical.length} critical/serious a11y violations on /gallery`).toHaveLength(0);
  });

  test('Pipeline page (/pipeline) has no critical/serious a11y violations', async ({ page }) => {
    await page.goto('/pipeline');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critical, `Found ${critical.length} critical/serious a11y violations on /pipeline`).toHaveLength(0);
  });

  test('Settings page (/settings) has no critical/serious a11y violations', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

    const critical = results.violations.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    expect(critical, `Found ${critical.length} critical/serious a11y violations on /settings`).toHaveLength(0);
  });
});
