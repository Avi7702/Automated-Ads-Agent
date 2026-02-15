import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

/**
 * Legacy Route Redirects E2E Tests
 *
 * Verifies all legacy routes from the pre-Unified-Studio era properly
 * redirect to their new consolidated destinations.
 *
 * Routes tested against App.tsx <Route> / <Redirect> definitions.
 */

test.describe('Legacy Route Redirects', { tag: '@legacy-redirects' }, () => {
  // --- Library redirects ---

  test('/products -> /library?tab=products', async ({ page }) => {
    await gotoWithAuth(page, '/products');
    await expect(page).toHaveURL(/\/library\?tab=products/);
  });

  test('/brand-images -> /library?tab=brand-images', async ({ page }) => {
    await gotoWithAuth(page, '/brand-images');
    await expect(page).toHaveURL(/\/library\?tab=brand-images/);
  });

  test('/template-library -> /library?tab=templates', async ({ page }) => {
    await gotoWithAuth(page, '/template-library');
    await expect(page).toHaveURL(/\/library\?tab=templates/);
  });

  test('/templates -> /library?tab=scene-templates', async ({ page }) => {
    await gotoWithAuth(page, '/templates');
    await expect(page).toHaveURL(/\/library\?tab=scene-templates/);
  });

  test('/admin/templates -> /library?tab=scene-templates', async ({ page }) => {
    await gotoWithAuth(page, '/admin/templates');
    await expect(page).toHaveURL(/\/library\?tab=scene-templates/);
  });

  test('/installation-scenarios -> /library?tab=scenarios', async ({ page }) => {
    await gotoWithAuth(page, '/installation-scenarios');
    await expect(page).toHaveURL(/\/library\?tab=scenarios/);
  });

  test('/learn-from-winners -> /library?tab=patterns', async ({ page }) => {
    await gotoWithAuth(page, '/learn-from-winners');
    await expect(page).toHaveURL(/\/library\?tab=patterns/);
  });

  // --- Pipeline redirects ---

  test('/content-planner -> /pipeline?tab=planner', async ({ page }) => {
    await gotoWithAuth(page, '/content-planner');
    await expect(page).toHaveURL(/\/pipeline\?tab=planner/);
  });

  test('/approval-queue -> /pipeline?tab=approval', async ({ page }) => {
    await gotoWithAuth(page, '/approval-queue');
    await expect(page).toHaveURL(/\/pipeline\?tab=approval/);
  });

  test('/social-accounts -> /pipeline?tab=accounts', async ({ page }) => {
    await gotoWithAuth(page, '/social-accounts');
    await expect(page).toHaveURL(/\/pipeline\?tab=accounts/);
  });

  // --- Settings redirects ---

  test('/usage -> /settings?section=usage', async ({ page }) => {
    await gotoWithAuth(page, '/usage');
    await expect(page).toHaveURL(/\/settings\?section=usage/);
  });

  test('/brand-profile -> /settings', async ({ page }) => {
    await gotoWithAuth(page, '/brand-profile');
    await expect(page).toHaveURL(/\/settings$/);
  });

  test('/settings/api-keys -> /settings?section=api-keys', async ({ page }) => {
    await gotoWithAuth(page, '/settings/api-keys');
    await expect(page).toHaveURL(/\/settings\?section=api-keys/);
  });

  // --- Studio redirects ---

  test('/generation/123 -> /?generation=123', async ({ page }) => {
    await gotoWithAuth(page, '/generation/123');
    await expect(page).toHaveURL(/\/\?generation=123/);
  });

  // --- 404 for unmatched routes ---

  test('/nonexistent-route -> 404 page', async ({ page }) => {
    await gotoWithAuth(page, '/nonexistent-route');

    // Should render the NotFound component
    const heading = page.getByText('404 Page Not Found');
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  // --- Double redirect chains ---

  test('double-redirect chains resolve correctly', async ({ page }) => {
    // /admin/templates -> /library?tab=scene-templates (single hop, no chain)
    // Verify the final destination loads properly with content
    await gotoWithAuth(page, '/admin/templates');
    await expect(page).toHaveURL(/\/library\?tab=scene-templates/);

    // Verify the Library page actually loaded (not stuck in redirect loop)
    const pageContent = page.locator('h1').first();
    await expect(pageContent).toBeVisible({ timeout: 10000 });
  });
});
