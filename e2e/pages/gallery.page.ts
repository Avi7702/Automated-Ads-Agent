import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Gallery page (/gallery)
 * Handles interactions with the generation gallery grid, search, sort, selection, and deletion.
 */
export class GalleryPage {
  readonly page: Page;

  // Header and navigation
  readonly header: Locator;
  readonly pageHeading: Locator;
  readonly backToStudioButton: Locator;
  readonly generationCount: Locator;

  // Search and filters
  readonly searchInput: Locator;
  readonly sortSelect: Locator;

  // Generation grid
  readonly generationCards: Locator;
  readonly generationImages: Locator;

  // Selection
  readonly selectButtons: Locator;
  readonly selectedCountText: Locator;
  readonly clearSelectionButton: Locator;

  // Bulk actions
  readonly bulkDeleteButton: Locator;

  // Delete confirmation dialog
  readonly deleteDialog: Locator;
  readonly deleteDialogTitle: Locator;
  readonly deleteDialogConfirm: Locator;
  readonly deleteDialogCancel: Locator;

  // Empty state
  readonly emptyState: Locator;
  readonly emptyStateGoToStudio: Locator;

  // Loading state
  readonly loadingGrid: Locator;

  constructor(page: Page) {
    this.page = page;

    // Header / nav
    this.header = page.locator('header').first();
    this.pageHeading = page.locator('h1').filter({ hasText: 'Gallery' });
    this.backToStudioButton = page.getByRole('button', { name: /Studio/i }).first();
    this.generationCount = page.locator('span.text-sm.text-muted-foreground').filter({ hasText: /generation/i });

    // Search and sort
    this.searchInput = page.getByPlaceholder('Search prompts...');
    this.sortSelect = page.locator('button[role="combobox"]').filter({ has: page.locator('svg') });

    // Grid items — each card is a div with aspect-square and overflow-hidden
    this.generationCards = page.locator('.grid .aspect-square.rounded-lg');
    this.generationImages = page.locator('.grid .aspect-square.rounded-lg img');

    // Selection checkboxes (round buttons top-left of each card)
    this.selectButtons = page.locator('button[aria-label^="Select generation"]');

    // Bulk selection header
    this.selectedCountText = page.locator('span').filter({ hasText: /\d+ selected/ });
    this.clearSelectionButton = page.getByRole('button', { name: /Clear/i });
    this.bulkDeleteButton = page.getByRole('button', { name: /Delete/i }).filter({ has: page.locator('svg') });

    // Delete dialog
    this.deleteDialog = page.locator('[role="alertdialog"]');
    this.deleteDialogTitle = page.getByText('Delete Generations');
    this.deleteDialogConfirm = page.getByRole('button', { name: /^Delete$|^Deleting/ });
    this.deleteDialogCancel = page.getByRole('button', { name: /Cancel/i });

    // Empty state
    this.emptyState = page.getByText('No generations yet');
    this.emptyStateGoToStudio = page.getByRole('button', { name: /Go to Studio/i });

    // Loading skeleton grid
    this.loadingGrid = page.locator('[aria-label="Loading gallery"]');
  }

  /**
   * Navigate to the Gallery page
   */
  async goto() {
    await this.page.goto('/gallery');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if the Gallery page is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      await this.page.waitForSelector('h1', { timeout: 10000 });
      return await this.pageHeading.isVisible();
    } catch {
      return false;
    }
  }

  /**
   * Search generations by prompt text
   */
  async search(query: string) {
    await this.searchInput.fill(query);
    // Allow filtering to process
    await this.page.waitForTimeout(300);
  }

  /**
   * Clear the search input
   */
  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(300);
  }

  /**
   * Sort generations (opens select, clicks option)
   */
  async sort(option: 'newest' | 'oldest') {
    await this.sortSelect.click();
    const label = option === 'newest' ? 'Newest first' : 'Oldest first';
    await this.page.getByRole('option', { name: label }).click();
    await this.page.waitForTimeout(200);
  }

  /**
   * Select a generation card by index (clicks its checkbox)
   */
  async selectCard(index: number) {
    await this.selectButtons.nth(index).click({ force: true });
    await this.page.waitForTimeout(100);
  }

  /**
   * Click on a generation card to navigate to it
   */
  async clickCard(index: number) {
    await this.generationCards.nth(index).click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Delete selected cards (opens dialog and confirms)
   */
  async deleteSelected() {
    await this.bulkDeleteButton.click();
    await expect(this.deleteDialog).toBeVisible({ timeout: 5000 });
    await this.deleteDialogConfirm.click();
    await expect(this.deleteDialog).not.toBeVisible({ timeout: 10000 });
  }

  /**
   * Get the count of visible generation cards
   */
  async getCardCount(): Promise<number> {
    return await this.generationCards.count();
  }

  /**
   * Wait for the grid to finish loading
   */
  async waitForLoaded() {
    // Wait for either cards to appear or empty state
    await Promise.race([
      this.generationCards.first().waitFor({ state: 'visible', timeout: 15000 }),
      this.emptyState.waitFor({ state: 'visible', timeout: 15000 }),
    ]).catch(() => {});
  }

  /**
   * Go back to studio via the back button
   */
  async goBackToStudio() {
    await this.backToStudioButton.click();
    await this.page.waitForLoadState('networkidle');
  }
}
