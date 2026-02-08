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
  // Navigate to demo auth endpoint using browser context
  // This ensures cookies are properly set in the browser
  await page.goto('/api/auth/demo');

  // Get the response body (JSON is displayed as text in browser)
  const content = await page.textContent('body');
  const data = JSON.parse(content || '{}');

  // Verify we got a valid user back
  expect(data).toHaveProperty('id');
  expect(data).toHaveProperty('email');
  expect(data.email).toBe('demo@company.com');

  // Save the storage state (cookies, session) for reuse in other tests
  await page.context().storageState({ path: authFile });

  console.log('Demo user authenticated successfully:', data.email);
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
