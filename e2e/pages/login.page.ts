import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Login page
 * Handles all interactions with /login route
 */
export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly signInButton: Locator;
  readonly errorMessage: Locator;
  readonly pageTitle: Locator;
  readonly pageSubtitle: Locator;
  readonly showPasswordButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('input#email');
    this.passwordInput = page.locator('input#password');
    this.signInButton = page.getByRole('button', { name: 'Sign In', exact: true });
    this.errorMessage = page.locator('.text-destructive');
    this.pageTitle = page.locator('h1');
    this.pageSubtitle = page.locator('text=Sign in to continue');
    this.showPasswordButton = page.locator('button[type="button"]').filter({ has: page.locator('svg') });
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Fill the email input field
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email);
  }

  /**
   * Fill the password input field
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password);
  }

  /**
   * Click the sign in button
   */
  async submit() {
    await this.signInButton.click();
  }

  /**
   * Get the error message text if displayed
   * Returns null if no error message is visible
   */
  async getErrorMessage(): Promise<string | null> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 });
      return await this.errorMessage.textContent();
    } catch {
      return null;
    }
  }

  /**
   * Convenience method to perform a complete login
   * @param email - User email
   * @param password - User password
   */
  async login(email: string, password: string) {
    await this.fillEmail(email);
    await this.fillPassword(password);
    await this.submit();
  }

  /**
   * Check if the login page is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      await expect(this.pageTitle).toContainText('Product Content Studio');
      await expect(this.pageSubtitle).toBeVisible();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for redirect after successful login
   */
  async waitForRedirect() {
    await this.page.waitForURL('/', { timeout: 10000 });
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility() {
    await this.showPasswordButton.click();
  }

  /**
   * Check if sign in button is enabled
   */
  async isSignInButtonEnabled(): Promise<boolean> {
    return await this.signInButton.isEnabled();
  }
}
