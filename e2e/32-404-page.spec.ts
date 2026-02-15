import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import { NotFoundPage } from './pages/not-found.page';

/**
 * 404 Not Found Page E2E Tests
 *
 * Verifies the NotFound component renders correctly for unknown routes,
 * displays the proper heading and description, and both navigation
 * buttons link back to the Studio (/).
 */

test.describe('404 Not Found Page', { tag: '@404' }, () => {
  test('shows 404 heading', async ({ page }) => {
    await gotoWithAuth(page, '/some-random-nonexistent-page');

    const notFoundPage = new NotFoundPage(page);
    await expect(notFoundPage.heading).toBeVisible({ timeout: 10000 });
    await expect(notFoundPage.heading).toContainText('404 Page Not Found');
  });

  test('shows descriptive text', async ({ page }) => {
    await gotoWithAuth(page, '/totally-fake-route');

    const notFoundPage = new NotFoundPage(page);
    await expect(notFoundPage.description).toBeVisible({ timeout: 10000 });
    await expect(notFoundPage.description).toContainText("The page you're looking for doesn't exist or has been moved");
  });

  test('Go to Studio button navigates to /', async ({ page }) => {
    await gotoWithAuth(page, '/does-not-exist');

    const notFoundPage = new NotFoundPage(page);
    await expect(notFoundPage.goToStudioButton).toBeVisible({ timeout: 10000 });

    await notFoundPage.clickGoToStudio();
    await page.waitForLoadState('networkidle');

    // Should navigate to Studio /
    await expect(page).toHaveURL('/');
  });

  test('Go Home button navigates to /', async ({ page }) => {
    await gotoWithAuth(page, '/does-not-exist-either');

    const notFoundPage = new NotFoundPage(page);
    await expect(notFoundPage.goHomeButton).toBeVisible({ timeout: 10000 });

    await notFoundPage.clickGoHome();
    await page.waitForLoadState('networkidle');

    // Both buttons link to /
    await expect(page).toHaveURL('/');
  });

  test('renders on unknown route /some-random-page', async ({ page }) => {
    await gotoWithAuth(page, '/some-random-page');

    const notFoundPage = new NotFoundPage(page);
    const isVisible = await notFoundPage.isVisible();
    expect(isVisible).toBe(true);

    // Verify the card container is rendered
    await expect(notFoundPage.card).toBeVisible();
  });
});
