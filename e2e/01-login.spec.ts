import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';

/**
 * Login Page E2E Tests
 *
 * Tests the login form UI, password visibility toggle, form validation,
 * authentication flow (valid/invalid credentials), and auth redirects
 * for unauthenticated users.
 *
 * NOTE: These tests do NOT use the shared storageState (authenticated session).
 * Each test creates a fresh browser context to simulate an unauthenticated user.
 */

test.describe('Login Page', { tag: '@login' }, () => {
  // Override the default storageState so tests run unauthenticated
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe('Page Display', () => {
    test('shows login form with email, password, and sign in button', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(loginPage.pageTitle).toContainText('Product Content Studio');
      await expect(loginPage.pageSubtitle).toBeVisible();
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.signInButton).toBeVisible();

      // Verify placeholders
      await expect(loginPage.emailInput).toHaveAttribute('placeholder', 'you@company.com');
      await expect(loginPage.passwordInput).toHaveAttribute('placeholder', 'Enter your password');
    });

    test('shows Google OAuth button', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // The Google OAuth button is inside a link to /api/auth/google
      const googleLink = page.locator('a[href="/api/auth/google"]');
      await expect(googleLink).toBeVisible();

      const googleButton = googleLink.getByRole('button', { name: /Sign in with Google/i });
      await expect(googleButton).toBeVisible();
    });

    test('sign in button is disabled when fields are empty', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(loginPage.signInButton).toBeDisabled();
    });

    test('sign in button enables when both fields are filled', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.fillEmail('test@example.com');
      await loginPage.fillPassword('password123');

      await expect(loginPage.signInButton).toBeEnabled();
    });
  });

  test.describe('Password Visibility', () => {
    test('password starts as hidden (type="password")', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.fillPassword('secret123');
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });

    test('toggle button reveals password (type="text")', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.fillPassword('secret123');

      // Click the show password button (aria-label="Show password")
      const showBtn = page.getByRole('button', { name: /show password/i });
      await showBtn.click();

      await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');
    });

    test('toggle again hides password', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.fillPassword('secret123');

      // Show
      const showBtn = page.getByRole('button', { name: /show password/i });
      await showBtn.click();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

      // Hide — after toggling the label changes to "Hide password"
      const hideBtn = page.getByRole('button', { name: /hide password/i });
      await hideBtn.click();
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Form Validation', () => {
    test('email field requires valid email format', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // The input has type="email" which enforces browser validation
      await expect(loginPage.emailInput).toHaveAttribute('type', 'email');
    });

    test('both fields have required attribute', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await expect(loginPage.emailInput).toHaveAttribute('required', '');
      await expect(loginPage.passwordInput).toHaveAttribute('required', '');
    });
  });

  test.describe('Authentication Flow', () => {
    test('valid demo credentials login and redirect to Studio /', async ({ page, baseURL: _baseURL }) => {
      // Ensure demo user exists via API
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login('demo@company.com', 'demo123');

      // Should redirect to Studio (/)
      await page.waitForURL('/', { timeout: 15000 });
      await expect(page).toHaveURL('/');
    });

    test('invalid email shows error message', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login('nonexistent@fake.com', 'password123');

      // Wait for the error alert to appear
      const errorAlert = page.locator('[role="alert"]');
      await expect(errorAlert).toBeVisible({ timeout: 10000 });
      const errorText = await errorAlert.textContent();
      expect(errorText).toBeTruthy();

      // Should remain on login page
      await expect(page).toHaveURL(/\/login/);
    });

    test('wrong password shows error', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      await loginPage.login('demo@company.com', 'wrongpassword');

      const errorAlert = page.locator('[role="alert"]');
      await expect(errorAlert).toBeVisible({ timeout: 10000 });

      await expect(page).toHaveURL(/\/login/);
    });

    test('empty submit does not navigate', async ({ page }) => {
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Button is disabled when fields are empty, so clicking should do nothing
      await expect(loginPage.signInButton).toBeDisabled();

      // Force-click anyway (Playwright allows clicking disabled buttons)
      await loginPage.signInButton.click({ force: true });

      // Should still be on login page
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Auth Redirects', () => {
    test('unauthenticated user on / redirects to /login', async ({ page }) => {
      await page.goto('/');
      await page.waitForURL(/\/login/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/login/);
    });

    test('unauthenticated user on /settings redirects to /login', async ({ page }) => {
      await page.goto('/settings');
      await page.waitForURL(/\/login/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/login/);
    });

    test('unauthenticated user on /gallery redirects to /login', async ({ page }) => {
      await page.goto('/gallery');
      await page.waitForURL(/\/login/, { timeout: 15000 });
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
