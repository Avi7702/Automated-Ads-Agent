import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the 404 Not Found page.
 * Rendered when the user navigates to an invalid route.
 */
export class NotFoundPage {
  readonly page: Page;

  // Page elements
  readonly heading: Locator;
  readonly description: Locator;
  readonly goToStudioButton: Locator;
  readonly goHomeButton: Locator;
  readonly alertIcon: Locator;
  readonly card: Locator;

  constructor(page: Page) {
    this.page = page;

    // The 404 page has a Card centered on screen
    this.card = page.locator('.max-w-md');
    this.heading = page.getByText('404 Page Not Found');
    this.description = page.getByText("The page you're looking for doesn't exist");
    this.alertIcon = page.locator('svg.text-red-500');

    // Action buttons — each is an <a> wrapping a <button>, so target the <a> link role
    this.goToStudioButton = page.getByRole('link', { name: /Go to Studio/i });
    this.goHomeButton = page.getByRole('link', { name: /Go Home/i });
  }

  /**
   * Navigate to an invalid path to trigger 404
   */
  async goto(invalidPath: string = '/this-page-does-not-exist') {
    await this.page.goto(invalidPath);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if the 404 page is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      await this.heading.waitFor({ state: 'visible', timeout: 10000 });
      return await this.heading.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Click "Go to Studio" to navigate home
   */
  async clickGoToStudio() {
    await this.goToStudioButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click "Go Home" to navigate home
   */
  async clickGoHome() {
    await this.goHomeButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}
