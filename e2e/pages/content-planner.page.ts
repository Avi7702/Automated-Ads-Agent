import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Content Planner page (/content-planner)
 * Handles all interactions with the Content Planner feature
 */
export class ContentPlannerPage {
  readonly page: Page;

  // Main page elements
  readonly pageTitle: Locator;
  readonly pageDescription: Locator;

  // Balance card elements
  readonly balanceCard: Locator;
  readonly balanceCardTitle: Locator;
  readonly totalPostsText: Locator;

  // Suggestion card elements
  readonly suggestionCard: Locator;
  readonly suggestionCardTitle: Locator;
  readonly viewGuideButton: Locator;
  readonly markAsPostedButton: Locator;

  // Category section elements
  readonly categoriesSection: Locator;
  readonly categoryHeaders: Locator;

  // Template modal elements
  readonly templateModal: Locator;
  readonly hookFormulasSection: Locator;
  readonly postStructureSection: Locator;
  readonly whatToAvoidSection: Locator;
  readonly createInStudioLink: Locator;

  // Mark as Posted dialog elements
  readonly markAsPostedDialog: Locator;
  readonly platformSelect: Locator;
  readonly notesTextarea: Locator;
  readonly recordPostButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Main page elements
    this.pageTitle = page.locator('h1').filter({ hasText: 'Content Planner' });
    this.pageDescription = page.locator('text=Strategic guide');

    // Balance card elements
    this.balanceCard = page.locator('text=This Week\'s Balance').locator('..');
    this.balanceCardTitle = page.locator('text=This Week\'s Balance');
    this.totalPostsText = page.locator('text=Total Posts This Week');

    // Suggestion card elements
    this.suggestionCard = page.locator('text=Suggested Next Post').locator('..');
    this.suggestionCardTitle = page.locator('text=Suggested Next Post');
    this.viewGuideButton = page.locator('button', { hasText: 'View Guide' });
    this.markAsPostedButton = page.locator('button', { hasText: 'Mark as Posted' }).first();

    // Category section elements
    this.categoriesSection = page.locator('text=Content Categories');
    this.categoryHeaders = page.locator('[class*="CardHeader"]');

    // Template modal elements
    this.templateModal = page.locator('[role="dialog"]');
    this.hookFormulasSection = page.locator('text=Hook Formulas That Work');
    this.postStructureSection = page.locator('text=Post Structure Template');
    this.whatToAvoidSection = page.locator('text=What to Avoid');
    this.createInStudioLink = page.locator('a', { hasText: 'Create in Studio' });

    // Mark as Posted dialog elements
    this.markAsPostedDialog = page.locator('text=Mark Post as Complete').locator('..').locator('..');
    this.platformSelect = page.locator('text=Platform').locator('..').locator('select, [role="combobox"]');
    this.notesTextarea = page.locator('textarea[placeholder*="notes"]');
    this.recordPostButton = page.locator('button', { hasText: 'Record Post' });
  }

  /**
   * Navigate to the Content Planner page
   */
  async goto(): Promise<void> {
    await this.page.goto('/content-planner');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to Studio with Content Planner template ID
   */
  async gotoStudioWithTemplate(templateId: string): Promise<void> {
    await this.page.goto(`/?cpTemplateId=${templateId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if the page is fully loaded
   */
  async isVisible(): Promise<boolean> {
    try {
      await expect(this.pageTitle).toBeVisible({ timeout: 10000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for the balance data to load
   */
  async waitForBalanceToLoad(): Promise<void> {
    await expect(this.totalPostsText).toBeVisible({ timeout: 10000 });
  }

  /**
   * Wait for the suggestion to load
   */
  async waitForSuggestionToLoad(): Promise<void> {
    // Wait for either View Guide button or loading to complete
    await this.page.waitForTimeout(2000);
    await expect(this.suggestionCardTitle).toBeVisible({ timeout: 10000 });
  }

  /**
   * Get all category names displayed on the page
   */
  async getCategoryNames(): Promise<string[]> {
    const categoryNames = [
      'Product Showcases',
      'Educational Content',
      'Industry Insights',
      'Customer Success',
      'Company Updates',
      'Engagement Content',
    ];

    const visibleNames: string[] = [];
    for (const name of categoryNames) {
      const locator = this.page.locator(`text=${name}`).first();
      if (await locator.isVisible()) {
        visibleNames.push(name);
      }
    }
    return visibleNames;
  }

  /**
   * Expand a category by clicking its header
   */
  async expandCategory(categoryName: string): Promise<void> {
    const categoryHeader = this.page.locator(`text=${categoryName}`).first();
    await categoryHeader.click();
    await this.page.waitForTimeout(500);
  }

  /**
   * Click on a specific template within a category
   */
  async clickTemplate(templateTitle: string): Promise<void> {
    const templateCard = this.page.locator(`text=${templateTitle}`).first();
    await templateCard.click();
    await expect(this.hookFormulasSection).toBeVisible({ timeout: 5000 });
  }

  /**
   * Close the template modal
   */
  async closeTemplateModal(): Promise<void> {
    const closeButton = this.templateModal.locator('button').first();
    await closeButton.click();
    await expect(this.templateModal).not.toBeVisible({ timeout: 3000 });
  }

  /**
   * Click the View Guide button in suggestion card
   */
  async clickViewGuide(): Promise<void> {
    await this.viewGuideButton.click();
    await expect(this.hookFormulasSection).toBeVisible({ timeout: 5000 });
  }

  /**
   * Open the Mark as Posted dialog
   */
  async openMarkAsPostedDialog(): Promise<void> {
    await this.markAsPostedButton.click();
    await expect(this.page.locator('text=Mark Post as Complete')).toBeVisible({ timeout: 5000 });
  }

  /**
   * Get the total posts count from the balance card
   */
  async getTotalPostsCount(): Promise<number> {
    await this.waitForBalanceToLoad();
    const totalText = await this.totalPostsText.locator('..').textContent();
    const match = totalText?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * Get progress bar values for all categories
   */
  async getCategoryProgress(): Promise<Map<string, number>> {
    const progress = new Map<string, number>();
    const progressBars = this.page.locator('[role="progressbar"]');
    const count = await progressBars.count();

    for (let i = 0; i < count; i++) {
      const value = await progressBars.nth(i).getAttribute('aria-valuenow');
      if (value) {
        progress.set(`category-${i}`, parseInt(value, 10));
      }
    }

    return progress;
  }

  /**
   * Copy a hook formula to clipboard
   */
  async copyHookFormula(index: number = 0): Promise<void> {
    const copyButtons = this.page.locator('button').filter({ has: this.page.locator('svg.lucide-copy') });
    await copyButtons.nth(index).click();
  }

  /**
   * Navigate to Studio from template modal
   */
  async navigateToStudioFromModal(): Promise<void> {
    await this.createInStudioLink.click();
    await expect(this.page).toHaveURL(/cpTemplateId=/);
  }

  /**
   * Get the suggested category name
   */
  async getSuggestedCategoryName(): Promise<string | null> {
    await this.waitForSuggestionToLoad();
    const badge = this.suggestionCard.locator('[class*="Badge"]').first();
    return await badge.textContent();
  }

  /**
   * Check if a specific template is visible within expanded category
   */
  async isTemplateVisible(templateTitle: string): Promise<boolean> {
    const templateCard = this.page.locator(`text=${templateTitle}`).first();
    return await templateCard.isVisible();
  }

  /**
   * Get template count for a category
   */
  async getTemplateBadgeCount(categoryIndex: number): Promise<number> {
    const badges = this.page.locator('text=/\\d+ templates/');
    const badgeText = await badges.nth(categoryIndex).textContent();
    const match = badgeText?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 0;
  }
}
