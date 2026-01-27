import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object for the Product Library workflow
 * Handles interactions with product management features
 */
export class ProductLibraryPage {
  readonly page: Page;
  readonly header: Locator;
  readonly pageTitle: Locator;
  readonly searchInput: Locator;
  readonly addProductButton: Locator;
  readonly productGrid: Locator;
  readonly productCards: Locator;
  readonly loadingSkeletons: Locator;
  readonly emptyState: Locator;

  // Add Product Modal elements
  readonly addProductModal: Locator;
  readonly modalTitle: Locator;
  readonly dropzone: Locator;
  readonly fileInput: Locator;
  readonly productNameInput: Locator;
  readonly categoryInput: Locator;
  readonly descriptionInput: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly uploadError: Locator;

  // Product Detail Modal elements
  readonly detailModal: Locator;
  readonly detailsTab: Locator;
  readonly relationshipsTab: Locator;
  readonly enrichTab: Locator;
  readonly useInStudioButton: Locator;
  readonly closeDetailButton: Locator;

  // Enrichment Form elements
  readonly enrichmentForm: Locator;
  readonly generateDraftButton: Locator;
  readonly urlEnrichInput: Locator;
  readonly fetchUrlButton: Locator;
  readonly descriptionTextarea: Locator;
  readonly addBenefitInput: Locator;
  readonly addTagInput: Locator;
  readonly saveVerifyButton: Locator;
  readonly approveAsIsButton: Locator;
  readonly completenessBar: Locator;
  readonly enrichmentSources: Locator;

  // Delete confirmation dialog
  readonly deleteDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly cancelDeleteButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.header = page.locator('header').first();
    this.pageTitle = page.locator('h1').filter({ hasText: 'Product Library' });
    this.searchInput = page.locator('input[placeholder*="Search products"]');
    this.addProductButton = page.getByRole('button', { name: /Add Product/i });
    this.productGrid = page.locator('.grid').filter({ has: page.locator('[class*="aspect-square"]') });
    this.productCards = page.locator('[class*="Card"]').filter({ has: page.locator('[class*="aspect-square"]') });
    this.loadingSkeletons = page.locator('[class*="Skeleton"]');
    this.emptyState = page.locator('text=No products yet');

    // Add Product Modal
    this.addProductModal = page.locator('[role="dialog"]').filter({ hasText: 'Add New Product' });
    this.modalTitle = this.addProductModal.locator('h2, [class*="DialogTitle"]');
    this.dropzone = page.locator('[class*="border-dashed"]');
    this.fileInput = page.locator('input[type="file"]');
    this.productNameInput = page.locator('input#name');
    this.categoryInput = page.locator('input#category');
    this.descriptionInput = page.locator('textarea#description');
    this.submitButton = page.getByRole('button', { name: /Add Product|Uploading/i });
    this.cancelButton = page.getByRole('button', { name: /Cancel/i });
    this.uploadError = page.locator('.text-destructive');

    // Product Detail Modal
    this.detailModal = page.locator('[role="dialog"]').filter({ has: page.locator('[role="tablist"]') });
    this.detailsTab = page.getByRole('tab', { name: /Details/i });
    this.relationshipsTab = page.getByRole('tab', { name: /Relationships/i });
    this.enrichTab = page.getByRole('tab', { name: /Enrich/i });
    this.useInStudioButton = page.getByRole('button', { name: /Use in Studio/i });
    this.closeDetailButton = this.detailModal.locator('button').filter({ hasText: /Close/i });

    // Enrichment Form
    this.enrichmentForm = page.locator('[class*="rounded-lg border bg-card"]');
    this.generateDraftButton = page.getByRole('button', { name: /Generate Draft/i });
    this.urlEnrichInput = page.locator('input[placeholder*="example.com"]');
    this.fetchUrlButton = page.getByRole('button', { name: /Fetch/i });
    this.descriptionTextarea = page.locator('textarea[placeholder*="Describe the product"]');
    this.addBenefitInput = page.locator('input[placeholder*="Add a benefit"]');
    this.addTagInput = page.locator('input[placeholder*="Add a tag"]');
    this.saveVerifyButton = page.getByRole('button', { name: /Save & Verify/i });
    this.approveAsIsButton = page.getByRole('button', { name: /Approve As-Is/i });
    this.completenessBar = page.locator('[class*="h-1.5 bg-muted rounded-full"]');
    this.enrichmentSources = page.locator('text=Sources').locator('..');

    // Delete confirmation
    this.deleteDialog = page.locator('[role="alertdialog"]');
    this.confirmDeleteButton = this.deleteDialog.getByRole('button', { name: /Delete/i });
    this.cancelDeleteButton = this.deleteDialog.getByRole('button', { name: /Cancel/i });
  }

  /**
   * Navigate to the Product Library page
   */
  async goto() {
    await this.page.goto('/library?tab=products');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to standalone Product Library page
   */
  async gotoStandalone() {
    await this.page.goto('/products');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Check if the Product Library is visible
   */
  async isVisible(): Promise<boolean> {
    try {
      // Wait for products to load or empty state
      await Promise.race([
        this.productCards.first().waitFor({ state: 'visible', timeout: 10000 }),
        this.emptyState.waitFor({ state: 'visible', timeout: 10000 }),
        this.loadingSkeletons.first().waitFor({ state: 'hidden', timeout: 10000 }),
      ]);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Wait for products to load
   */
  async waitForProductsLoaded() {
    // Wait for skeletons to disappear
    const skeletonCount = await this.loadingSkeletons.count();
    if (skeletonCount > 0) {
      await this.loadingSkeletons.first().waitFor({ state: 'hidden', timeout: 15000 });
    }
  }

  /**
   * Get the count of product cards
   */
  async getProductCount(): Promise<number> {
    await this.waitForProductsLoaded();
    return await this.productCards.count();
  }

  /**
   * Search for products by query
   */
  async searchProducts(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500); // Debounce
  }

  /**
   * Clear the search input
   */
  async clearSearch() {
    await this.searchInput.clear();
    await this.page.waitForTimeout(500);
  }

  /**
   * Open the Add Product modal
   */
  async openAddProductModal() {
    await this.addProductButton.click();
    await expect(this.addProductModal).toBeVisible({ timeout: 5000 });
  }

  /**
   * Upload a product image via the modal
   */
  async uploadProductImage(imagePath: string) {
    await this.fileInput.setInputFiles(imagePath);
  }

  /**
   * Fill in the product details in the Add Product modal
   */
  async fillProductDetails(details: {
    name: string;
    category?: string;
    description?: string;
  }) {
    await this.productNameInput.fill(details.name);
    if (details.category) {
      await this.categoryInput.fill(details.category);
    }
    if (details.description) {
      await this.descriptionInput.fill(details.description);
    }
  }

  /**
   * Submit the Add Product form
   */
  async submitAddProduct() {
    await this.submitButton.click();
  }

  /**
   * Close the Add Product modal
   */
  async closeAddProductModal() {
    await this.cancelButton.click();
    await expect(this.addProductModal).not.toBeVisible({ timeout: 3000 });
  }

  /**
   * Complete the full add product flow
   */
  async addProduct(imagePath: string, details: {
    name: string;
    category?: string;
    description?: string;
  }) {
    await this.openAddProductModal();
    await this.uploadProductImage(imagePath);
    await this.fillProductDetails(details);
    await this.submitAddProduct();

    // Wait for modal to close and products to refresh
    await expect(this.addProductModal).not.toBeVisible({ timeout: 15000 });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click on a product card to open detail modal
   */
  async clickProduct(index: number = 0) {
    await this.productCards.nth(index).click();
    await expect(this.detailModal).toBeVisible({ timeout: 5000 });
  }

  /**
   * Click on the product card by name
   */
  async clickProductByName(name: string) {
    const productCard = this.productCards.filter({ hasText: name }).first();
    await productCard.click();
    await expect(this.detailModal).toBeVisible({ timeout: 5000 });
  }

  /**
   * Switch to a tab in the product detail modal
   */
  async switchToTab(tab: 'details' | 'relationships' | 'enrich') {
    const tabMap = {
      details: this.detailsTab,
      relationships: this.relationshipsTab,
      enrich: this.enrichTab,
    };
    await tabMap[tab].click();
    await this.page.waitForTimeout(300);
  }

  /**
   * Close the product detail modal
   */
  async closeDetailModal() {
    await this.closeDetailButton.click();
    await expect(this.detailModal).not.toBeVisible({ timeout: 3000 });
  }

  /**
   * Trigger AI enrichment for the current product
   */
  async triggerEnrichment() {
    await this.switchToTab('enrich');
    await this.generateDraftButton.click();

    // Wait for enrichment to complete (can take time)
    await expect(this.saveVerifyButton).toBeVisible({ timeout: 60000 });
  }

  /**
   * Enrich from URL
   */
  async enrichFromUrl(url: string) {
    await this.switchToTab('enrich');
    await this.urlEnrichInput.fill(url);
    await this.fetchUrlButton.click();

    // Wait for fetch to complete
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify the enriched data
   */
  async verifyEnrichment() {
    await this.saveVerifyButton.click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Edit product description in enrichment form
   */
  async editDescription(description: string) {
    await this.switchToTab('enrich');
    await this.descriptionTextarea.fill(description);
  }

  /**
   * Add a benefit to the product
   */
  async addBenefit(benefit: string) {
    await this.addBenefitInput.fill(benefit);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Add a tag to the product
   */
  async addTag(tag: string) {
    await this.addTagInput.fill(tag);
    await this.page.keyboard.press('Enter');
  }

  /**
   * Get enrichment status badge text
   */
  async getEnrichmentStatus(): Promise<string> {
    const statusBadge = this.page.locator('[class*="rounded-full"][class*="text-xs"]').first();
    return await statusBadge.textContent() || '';
  }

  /**
   * Get completeness percentage
   */
  async getCompletenessPercentage(): Promise<number | null> {
    const text = await this.page.locator('text=/\\d+%/').first().textContent();
    if (text) {
      const match = text.match(/(\d+)%/);
      return match ? parseInt(match[1]) : null;
    }
    return null;
  }

  /**
   * Delete a product
   */
  async deleteProduct(index: number = 0) {
    const deleteButton = this.productCards.nth(index).locator('button').filter({ has: this.page.locator('[class*="Trash"]') });
    await deleteButton.click();

    // Confirm deletion
    await expect(this.deleteDialog).toBeVisible({ timeout: 3000 });
    await this.confirmDeleteButton.click();

    // Wait for deletion to complete
    await expect(this.deleteDialog).not.toBeVisible({ timeout: 5000 });
  }

  /**
   * Check if a product exists by name
   */
  async productExists(name: string): Promise<boolean> {
    await this.waitForProductsLoaded();
    const product = this.productCards.filter({ hasText: name });
    return await product.count() > 0;
  }

  /**
   * Take screenshot of current state
   */
  async takeScreenshot(name: string) {
    await this.page.screenshot({
      path: `e2e/screenshots/${name}.png`,
      fullPage: true,
    });
  }
}
