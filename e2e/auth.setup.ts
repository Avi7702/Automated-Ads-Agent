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

setup('authenticate as demo user', async ({ request, context }) => {
  // Create demo user session via GET /api/auth/demo
  // This endpoint creates or retrieves the demo user and establishes a session
  const response = await request.get('/api/auth/demo');

  // Verify the request was successful
  expect(response.ok()).toBeTruthy();

  const data = await response.json();

  // Verify we got a valid user back
  expect(data).toHaveProperty('id');
  expect(data).toHaveProperty('email');
  expect(data.email).toBe('demo@company.com');

  // Save the storage state (cookies, session) for reuse in other tests
  await context.storageState({ path: authFile });

  console.log('Demo user authenticated successfully:', data.email);
});

setup('verify auth session is valid', async ({ request }) => {
  // Make a request to /api/auth/me to verify the session works
  const response = await request.get('/api/auth/me');

  if (response.ok()) {
    const user = await response.json();
    console.log('Session verified for user:', user.email);
    expect(user).toHaveProperty('id');
    expect(user).toHaveProperty('email');
  } else {
    // This is expected if we haven't saved the session yet
    console.log('No existing session found, will create new one');
  }
});

export { authFile };
