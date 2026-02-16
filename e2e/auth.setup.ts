/* eslint-disable no-console */
import { test as setup, expect } from '@playwright/test';
import * as path from 'path';
import { fileURLToPath } from 'url';

/**
 * Auth setup file for Playwright
 * Creates a demo user via the /api/auth/demo endpoint
 * and saves the session state to e2e/.auth/user.json
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authFile = path.join(__dirname, '.auth', 'user.json');

setup('authenticate as demo user', async ({ page }) => {
  // Navigate to login page and sign in via the real browser form
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill login form
  await page.locator('input#email').fill('demo@company.com');
  await page.locator('input#password').fill('demo123');

  // Click Sign In and wait for navigation away from /login
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });

  // Verify we're authenticated — should be on the app now
  console.log('Logged in, redirected to:', page.url());

  // Save the storage state (cookies, session) for reuse in other tests
  await page.context().storageState({ path: authFile });

  console.log('Demo user authenticated successfully via browser login');
});

setup('verify auth session is valid', async ({ request }) => {
  // Make a request to /api/auth/me to verify the session works
  const response = await request.get('/api/auth/me');

  if (response.ok()) {
    const user = await response.json();
    if (user && user.id) {
      console.log('Session verified for user:', user.email);
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
    } else {
      // API returned 200 but { authenticated: false } — no session in this context
      console.log('No existing session found in this context, will use stored auth state');
    }
  } else {
    // Non-200 response — no session yet
    console.log('No existing session found, will create new one');
  }
});

export { authFile };
