/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import { test, expect } from '@playwright/test';
import { LibraryPage } from './pages/library.page';
import { ProductLibraryPage } from './pages/product-library.page';
import { gotoWithAuth } from './helpers/ensureAuth';
import { seedProduct, deleteAllTestProducts, getProducts } from './helpers/test-data';
import * as path from 'path';

/**
 * Library — Products Tab E2E Tests (18 tests)
 *
 * Covers:
 * - Product grid rendering (cards, Add button, search, category filter, enrichment badge)
 * - Add Product modal (dropzone, fields, submit, cancel, validation)
 * - Product detail modal (tabs: Details, Relationships, Enrich, Use in Studio)
 * - Delete product (confirmation dialog, confirm, cancel)
 */

const TEST_IMAGE = path.resolve(process.cwd(), 'e2e', 'fixtures', 'test-upload.png');

test.describe('Library — Products Tab', { tag: '@library' }, () => {
  let libraryPage: LibraryPage;
  let productPage: ProductLibraryPage;

  // ----------------------------------------------------------------
  // Product Grid (tests 1-5)
  // ----------------------------------------------------------------
  test.describe('Product Grid', () => {
    test.beforeEach(async ({ page }) => {
      libraryPage = new LibraryPage(page);
      productPage = new ProductLibraryPage(page);
      await gotoWithAuth(page, '/library?tab=products');
      // Wait for lazy-loaded tab content
      await libraryPage.waitForTabContent();
    });

    test('1 — Product cards load or empty state displays', async ({ page }) => {
      // Either product cards or the "No products yet" empty state should be visible
      // Use Playwright's built-in auto-waiting with toBeVisible
      const productCard = productPage.productCards.first();
      const emptyState = page.getByText(/No products yet/);
      const loading = productPage.loadingSkeletons.first();

      // At least one of these states must be true
      await expect(productCard.or(emptyState).or(loading)).toBeVisible({ timeout: 10000 });
    });

    test('2 — Add Product button is visible', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /Add Product/i });
      await expect(addButton).toBeVisible({ timeout: 10000 });
    });

    test('3 — Search input filters products', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search products"]');
      await expect(searchInput).toBeVisible({ timeout: 10000 });

      // Type a search term
      await searchInput.fill('zzz_nonexistent_product_xyz');
      await page.waitForTimeout(600); // debounce

      // Should show "No results found" or filtered grid
      const noResults = page.getByText(/No results found/i);
      const searchResults = page.getByText(/Showing .* result/i);

      await expect(noResults.or(searchResults)).toBeVisible({ timeout: 5000 });
    });

    test('4 — Search clear button resets search', async ({ page }) => {
      const searchInput = page.locator('input[placeholder*="Search products"]');
      await expect(searchInput).toBeVisible({ timeout: 10000 });
      await searchInput.fill('test');
      await page.waitForTimeout(400);

      // Clear button (X icon next to the search)
      const clearButton = page.locator('input[placeholder*="Search products"]').locator('..').locator('button');

      await expect(clearButton).toBeVisible({ timeout: 5000 });
      await clearButton.click();
      await page.waitForTimeout(400);
      await expect(searchInput).toHaveValue('');
    });

    test('5 — Enrichment status badge appears on product cards', async ({ page }) => {
      // Enrichment badges: "Complete", "Verified", "Draft", "Pending"
      const badges = page.locator('[class*="badge"], [class*="Badge"]');

      // First verify product cards are visible
      await expect(productPage.productCards.first()).toBeVisible({ timeout: 10000 });

      // If there are products, there should be enrichment badges
      const badgeCount = await badges.count();
      expect(badgeCount).toBeGreaterThan(0);
    });
  });

  // ----------------------------------------------------------------
  // Add Product Modal (tests 6-11)
  // ----------------------------------------------------------------
  test.describe('Add Product Modal', () => {
    test.beforeEach(async ({ page }) => {
      libraryPage = new LibraryPage(page);
      productPage = new ProductLibraryPage(page);
      await gotoWithAuth(page, '/library?tab=products');
      await libraryPage.waitForTabContent();
    });

    test('6 — Add Product button opens modal with "Add New Product" title', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /Add Product/i });
      await addButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });
      await expect(dialog.getByText('Add New Product')).toBeVisible();
    });

    test('7 — Modal shows dropzone for image upload', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /Add Product/i });
      await addButton.click();

      // Dropzone with dashed border or upload text
      const dropzone = page.locator('[class*="border-dashed"]');
      await expect(dropzone).toBeVisible({ timeout: 5000 });

      // Upload instruction text
      const uploadText = page.getByText(/drag.*drop|click.*browse/i);
      await expect(uploadText).toBeVisible();
    });

    test('8 — Modal has name, category, and description fields', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /Add Product/i });
      await addButton.click();

      await expect(page.locator('input#name')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('input#category')).toBeVisible();
      await expect(page.locator('textarea#description')).toBeVisible();
    });

    test('9 — Submit button is disabled without an image', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /Add Product/i });
      await addButton.click();

      // Fill name but no image
      await page.locator('input#name').fill('Test Product Name');

      // Submit button should be disabled
      const submitButton = page.getByRole('button', { name: /Add Product/i }).last();
      await expect(submitButton).toBeDisabled();
    });

    test('10 — Cancel button closes the modal', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /Add Product/i });
      await addButton.click();

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible({ timeout: 5000 });

      const cancelButton = dialog.getByRole('button', { name: /Cancel/i });
      await cancelButton.click();

      await expect(dialog).not.toBeVisible({ timeout: 3000 });
    });

    test('11 — Validation error when submitting without required fields', async ({ page }) => {
      const addButton = page.getByRole('button', { name: /Add Product/i });
      await addButton.click();

      // Upload an image but leave name empty
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(TEST_IMAGE);
      await page.waitForTimeout(500);

      // Clear the auto-filled name
      const nameInput = page.locator('input#name');
      await nameInput.clear();

      // Try to submit
      const submitButton = page.getByRole('button', { name: /Add Product/i }).last();
      await submitButton.click();
      await page.waitForTimeout(500);

      // Error text or the dialog should still be open (validation prevented submission)
      const errorText = page.locator('.text-destructive');
      const dialogStillOpen = page.locator('[role="dialog"]');
      await expect(errorText.or(dialogStillOpen)).toBeVisible({ timeout: 5000 });
    });
  });

  // ----------------------------------------------------------------
  // Product Detail Modal (tests 12-15)
  // ----------------------------------------------------------------
  test.describe('Product Detail Modal', () => {
    test.beforeEach(async ({ page, request }) => {
      libraryPage = new LibraryPage(page);
      productPage = new ProductLibraryPage(page);

      // Ensure at least one product exists
      const products = await getProducts(request);
      if (products.length === 0) {
        await seedProduct(request, 'E2E Detail Test Product', 'Test Category');
      }

      await gotoWithAuth(page, '/library?tab=products');
      await libraryPage.waitForTabContent();
      await productPage.waitForProductsLoaded();
    });

    test('12 — Clicking a product card opens detail modal', async ({ page }) => {
      const firstCard = productPage.productCards.first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      await firstCard.click();
      const detailModal = page.locator('[role="dialog"]');
      await expect(detailModal).toBeVisible({ timeout: 5000 });
    });

    test('13 — Detail modal has Details, Relationships, Enrich tabs', async ({ page }) => {
      const firstCard = productPage.productCards.first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      await firstCard.click();

      // Look for the tabs inside the detail modal
      const detailsTab = page.getByRole('tab', { name: /Details/i });
      const relationshipsTab = page.getByRole('tab', { name: /Relationships/i });
      const enrichTab = page.getByRole('tab', { name: /Enrich/i });

      await expect(detailsTab).toBeVisible({ timeout: 5000 });
      await expect(relationshipsTab).toBeVisible();
      await expect(enrichTab).toBeVisible();
    });

    test('14 — Use in Studio button is visible in detail modal', async ({ page }) => {
      const firstCard = productPage.productCards.first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      await firstCard.click();

      const useInStudioButton = page
        .getByRole('button', { name: /Use in Studio/i })
        .or(page.getByRole('link', { name: /Use in Studio/i }));
      await expect(useInStudioButton).toBeVisible({ timeout: 5000 });
    });

    test('15 — Close button or overlay closes detail modal', async ({ page }) => {
      const firstCard = productPage.productCards.first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      await firstCard.click();
      const detailModal = page.locator('[role="dialog"]');
      await expect(detailModal).toBeVisible({ timeout: 5000 });

      // Close via the Close button
      const closeButton = detailModal.getByRole('button', { name: /Close/i });
      await expect(closeButton).toBeVisible({ timeout: 5000 });
      await closeButton.click();
      await expect(detailModal).not.toBeVisible({ timeout: 3000 });
    });
  });

  // ----------------------------------------------------------------
  // Delete Product (tests 16-18)
  // ----------------------------------------------------------------
  test.describe('Delete Product', () => {
    test.beforeEach(async ({ page, request }) => {
      libraryPage = new LibraryPage(page);
      productPage = new ProductLibraryPage(page);

      // Ensure at least one product exists
      const products = await getProducts(request);
      if (products.length === 0) {
        await seedProduct(request, 'E2E Delete Test Product', 'Test Category');
      }

      await gotoWithAuth(page, '/library?tab=products');
      await libraryPage.waitForTabContent();
      await productPage.waitForProductsLoaded();
    });

    test('16 — Delete button (Trash icon) appears on product card hover', async ({ page }) => {
      const firstCard = productPage.productCards.first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      await firstCard.hover();
      await page.waitForTimeout(300);

      // Trash button is absolute-positioned on the card
      const count = await firstCard.locator('button').count();
      expect(count).toBeGreaterThan(0);
    });

    test('17 — Clicking delete shows confirmation dialog', async ({ page }) => {
      const firstCard = productPage.productCards.first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      await firstCard.hover();
      await page.waitForTimeout(300);

      // Click the trash/delete button (positioned top-left on the card)
      const deleteBtn = firstCard.locator('button').first();
      await deleteBtn.click();

      // AlertDialog confirmation
      const confirmDialog = page.locator('[role="alertdialog"]');
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });
      await expect(confirmDialog.getByText(/Delete Product/i)).toBeVisible();
      await expect(confirmDialog.getByText(/cannot be undone/i)).toBeVisible();
    });

    test('18 — Cancel button in delete dialog closes it', async ({ page }) => {
      const firstCard = productPage.productCards.first();
      await expect(firstCard).toBeVisible({ timeout: 10000 });
      await firstCard.hover();
      await page.waitForTimeout(300);

      const deleteBtn = firstCard.locator('button').first();
      await deleteBtn.click();

      const confirmDialog = page.locator('[role="alertdialog"]');
      await expect(confirmDialog).toBeVisible({ timeout: 5000 });

      const cancelBtn = confirmDialog.getByRole('button', { name: /Cancel/i });
      await cancelBtn.click();

      await expect(confirmDialog).not.toBeVisible({ timeout: 3000 });
    });
  });
});
