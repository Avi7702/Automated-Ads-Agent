import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/login.page';
import { StudioPage } from './pages/studio.page';

test.describe('Login Page', () => {
  test.describe('Page Display', () => {
    test('shows login page with correct elements', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();

      // Verify the page displays correctly
      await expect(loginPage.pageTitle).toContainText('Product Content Studio');
      await expect(loginPage.pageSubtitle).toBeVisible();
      await expect(loginPage.emailInput).toBeVisible();
      await expect(loginPage.passwordInput).toBeVisible();
      await expect(loginPage.signInButton).toBeVisible();

      // Verify placeholder text
      await expect(loginPage.emailInput).toHaveAttribute('placeholder', 'you@company.com');
      await expect(loginPage.passwordInput).toHaveAttribute('placeholder', 'Enter your password');
    });

    test('sign in button is disabled when fields are empty', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();

      // Button should be disabled with empty fields
      const isEnabled = await loginPage.isSignInButtonEnabled();
      expect(isEnabled).toBe(false);
    });

    test('sign in button enables when both fields are filled', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.fillEmail('test@example.com');
      await loginPage.fillPassword('password123');

      // Button should now be enabled
      const isEnabled = await loginPage.isSignInButtonEnabled();
      expect(isEnabled).toBe(true);
    });
  });

  test.describe('Authentication Redirects', () => {
    test('redirects unauthenticated users to /login when accessing protected routes', async ({ page }) => {
      // Try to access the Studio (protected route) directly
      await page.goto('/');

      // Wait for redirect to happen
      await page.waitForURL('/login', { timeout: 10000 });

      // Verify we're on the login page
      const loginPage = new LoginPage(page);
      const isVisible = await loginPage.isVisible();
      expect(isVisible).toBe(true);
    });

    test('redirects unauthenticated users from /settings to /login', async ({ page }) => {
      await page.goto('/settings');

      await page.waitForURL('/login', { timeout: 10000 });

      const loginPage = new LoginPage(page);
      await expect(loginPage.pageTitle).toContainText('Product Content Studio');
    });

    test('redirects unauthenticated users from /gallery to /login', async ({ page }) => {
      await page.goto('/gallery');

      await page.waitForURL('/login', { timeout: 10000 });

      const loginPage = new LoginPage(page);
      await expect(loginPage.pageTitle).toContainText('Product Content Studio');
    });
  });

  test.describe('Login Flow', () => {
    test('successful login redirects to Studio', async ({ page, request }) => {
      // First, create a demo user via the API
      const demoResponse = await request.get('/api/auth/demo');
      expect(demoResponse.ok()).toBeTruthy();

      // Log out to clear the session
      await request.post('/api/auth/logout');

      // Now test the login flow
      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Login with demo credentials
      await loginPage.login('demo@company.com', 'demo123');

      // Wait for redirect to Studio
      await loginPage.waitForRedirect();

      // Verify we're on the Studio page
      const studioPage = new StudioPage(page);
      const isVisible = await studioPage.isVisible();
      expect(isVisible).toBe(true);
    });

    test('invalid credentials show error message', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();

      // Try to login with invalid credentials
      await loginPage.login('invalid@example.com', 'wrongpassword');

      // Wait for error message
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).not.toBeNull();
      expect(errorMessage).toBeTruthy();

      // Should still be on login page
      expect(page.url()).toContain('/login');
    });

    test('wrong password shows error message', async ({ page, request }) => {
      // First, ensure demo user exists
      const demoResponse = await request.get('/api/auth/demo');
      expect(demoResponse.ok()).toBeTruthy();

      // Log out
      await request.post('/api/auth/logout');

      const loginPage = new LoginPage(page);
      await loginPage.goto();

      // Try to login with wrong password
      await loginPage.login('demo@company.com', 'wrongpassword');

      // Wait for error message
      const errorMessage = await loginPage.getErrorMessage();
      expect(errorMessage).not.toBeNull();

      // Should still be on login page
      expect(page.url()).toContain('/login');
    });
  });

  test.describe('Password Visibility Toggle', () => {
    test('password field toggles visibility', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();
      await loginPage.fillPassword('testpassword');

      // Initially password should be hidden
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');

      // Toggle visibility
      await loginPage.togglePasswordVisibility();

      // Password should now be visible
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'text');

      // Toggle back
      await loginPage.togglePasswordVisibility();

      // Password should be hidden again
      await expect(loginPage.passwordInput).toHaveAttribute('type', 'password');
    });
  });

  test.describe('Form Validation', () => {
    test('email field requires valid email format', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();

      // Fill with invalid email
      await loginPage.fillEmail('notanemail');
      await loginPage.fillPassword('password123');

      // The email input should have validation
      const emailInput = loginPage.emailInput;
      await expect(emailInput).toHaveAttribute('type', 'email');
    });

    test('both fields are required', async ({ page }) => {
      const loginPage = new LoginPage(page);

      await loginPage.goto();

      // Both fields should have required attribute
      await expect(loginPage.emailInput).toHaveAttribute('required', '');
      await expect(loginPage.passwordInput).toHaveAttribute('required', '');
    });
  });
});
