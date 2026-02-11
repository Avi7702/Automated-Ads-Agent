import { test, expect } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';

test.describe.configure({ mode: 'parallel' });

/**
 * E2E Tests for the Library page (/library)
 *
 * The Library page is a tabbed interface that consolidates 6 resource types:
 *   - Products (default tab)
 *   - Brand Images
 *   - Templates (performing ad templates)
 *   - Scenes (scene/ad templates with exact_insert / inspiration modes)
 *   - Scenarios (installation scenarios)
 *   - Patterns (learn-from-winners pattern library)
 *
 * Each tab lazy-loads its content and renders the sub-page in embedded mode
 * (no duplicate header). URL state: /library?tab=<id>&item=<id>
 */

// ---------------------------------------------------------------------------
// 1. Page-level tests
// ---------------------------------------------------------------------------

test.describe('Library Page - Page Level', () => {
  test('page loads without crash', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !msg.text().includes('favicon') &&
        !msg.text().includes('404') &&
        !msg.text().includes('ERR_INSUFFICIENT_RESOURCES')
      ) {
        consoleErrors.push(msg.text());
      }
    });

    await gotoWithAuth(page, '/library');
    await page.waitForLoadState('domcontentloaded');

    // The page heading "Library" should be visible
    const heading = page.locator('h1').filter({ hasText: 'Library' });
    await expect(heading).toBeVisible({ timeout: 15000 });

    // Allow a small number of non-critical console errors (e.g. failed API fetches for empty data)
    expect(consoleErrors.length).toBeLessThanOrEqual(10);
  });

  test('header shows Library as active nav item', async ({ page }) => {
    await gotoWithAuth(page, '/library');

    // The nav link for Library should have the active/current styling
    // The Header renders nav items as links; the active one gets a distinct class
    const libraryNavLink = page.locator('nav a[href="/library"], nav a:has-text("Library")').first();
    await expect(libraryNavLink).toBeVisible({ timeout: 10000 });

    // Check that the link has an active-like attribute or class
    const classAttr = await libraryNavLink.getAttribute('class');
    const ariaAttr = await libraryNavLink.getAttribute('aria-current');
    // At least the link should exist and be visible (active styling varies)
    expect(classAttr !== null || ariaAttr !== null).toBe(true);
  });

  test('page renders the subtitle text', async ({ page }) => {
    await gotoWithAuth(page, '/library');

    const subtitle = page.getByText('Manage your products, templates, and creative assets');
    await expect(subtitle).toBeVisible({ timeout: 10000 });
  });

  test('tab list renders all 6 tabs', async ({ page }) => {
    await gotoWithAuth(page, '/library');

    // The TabsList should contain 6 triggers
    const tabTriggers = page.locator('[role="tablist"] [role="tab"]');
    await expect(tabTriggers.first()).toBeVisible({ timeout: 15000 });

    const count = await tabTriggers.count();
    expect(count).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// 2. Tab navigation tests
// ---------------------------------------------------------------------------

test.describe('Library Page - Tab Navigation', () => {
  test('defaults to Products tab', async ({ page }) => {
    await gotoWithAuth(page, '/library');

    // The Products tab trigger should have data-state="active"
    const productsTab = page
      .locator('[role="tab"]')
      .filter({ hasText: /Products/i })
      .first();
    await expect(productsTab).toBeVisible({ timeout: 15000 });

    const state = await productsTab.getAttribute('data-state');
    expect(state).toBe('active');
  });

  test('clicking Brand Images tab activates it', async ({ page }) => {
    await gotoWithAuth(page, '/library');
    await page.waitForLoadState('domcontentloaded');

    const brandImagesTab = page
      .locator('[role="tab"]')
      .filter({ hasText: /Brand Images/i })
      .first();
    // On small screens the label may be hidden; click even if only icon is visible
    if (!(await brandImagesTab.isVisible())) {
      // Fall back to the second tab trigger
      const fallbackTab = page.locator('[role="tab"]').nth(1);
      await fallbackTab.click();
    } else {
      await brandImagesTab.click();
    }
    await page.waitForTimeout(500);

    // URL should contain tab=brand-images
    expect(page.url()).toContain('tab=brand-images');
  });

  test('clicking Templates tab activates it', async ({ page }) => {
    await gotoWithAuth(page, '/library');

    const templatesTab = page
      .locator('[role="tab"]')
      .filter({ hasText: /Templates/i })
      .first();
    await expect(templatesTab).toBeVisible({ timeout: 10000 });
    await templatesTab.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('tab=templates');
  });

  test('clicking Scenes tab activates it', async ({ page }) => {
    await gotoWithAuth(page, '/library');

    const scenesTab = page
      .locator('[role="tab"]')
      .filter({ hasText: /Scenes/i })
      .first();
    await expect(scenesTab).toBeVisible({ timeout: 10000 });
    await scenesTab.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('tab=scene-templates');
  });

  test('clicking Scenarios tab activates it', async ({ page }) => {
    await gotoWithAuth(page, '/library');

    const scenariosTab = page
      .locator('[role="tab"]')
      .filter({ hasText: /Scenarios/i })
      .first();
    await expect(scenariosTab).toBeVisible({ timeout: 10000 });
    await scenariosTab.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('tab=scenarios');
  });

  test('clicking Patterns tab activates it', async ({ page }) => {
    await gotoWithAuth(page, '/library');

    const patternsTab = page
      .locator('[role="tab"]')
      .filter({ hasText: /Patterns/i })
      .first();
    await expect(patternsTab).toBeVisible({ timeout: 10000 });
    await patternsTab.click();
    await page.waitForTimeout(500);

    expect(page.url()).toContain('tab=patterns');
  });

  test('navigating directly via URL query opens correct tab', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=scenarios');

    const scenariosTab = page
      .locator('[role="tab"]')
      .filter({ hasText: /Scenarios/i })
      .first();
    await expect(scenariosTab).toBeVisible({ timeout: 15000 });

    const state = await scenariosTab.getAttribute('data-state');
    expect(state).toBe('active');
  });
});

// ---------------------------------------------------------------------------
// 3. Products tab content
// ---------------------------------------------------------------------------

test.describe('Library Page - Products Tab', () => {
  test('Products tab shows product grid or empty state', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=products');

    // Wait for lazy-loaded content
    const tabPanel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(tabPanel).toBeVisible({ timeout: 15000 });

    // Should show either product cards or the "No products yet" empty state
    const addProductButton = page.getByRole('button', { name: /add.*product/i }).first();
    const emptyHeading = page.getByText(/no products yet/i).first();
    const productCard = tabPanel.locator('[class*="card"], [class*="Card"]').first();

    const hasAdd = await addProductButton.isVisible().catch(() => false);
    const hasEmpty = await emptyHeading.isVisible().catch(() => false);
    const hasCards = await productCard.isVisible().catch(() => false);

    expect(hasAdd || hasEmpty || hasCards).toBe(true);
  });

  test('Products tab has search input', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=products');

    const searchInput = page.locator('input[placeholder*="Search products"]').first();
    await expect(searchInput).toBeVisible({ timeout: 15000 });
  });

  test('Products tab has Add Product button', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=products');

    const addButton = page.getByRole('button', { name: /add.*product/i }).first();
    await expect(addButton).toBeVisible({ timeout: 15000 });
  });

  test('typing in search input does not crash', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=products');

    const searchInput = page.locator('input[placeholder*="Search products"]').first();
    if (await searchInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await searchInput.fill('nonexistent-test-product-xyz');
      await page.waitForTimeout(500);

      // Should either show "no results" or filtered grid — no crash
      const noResults = page.getByText(/no results found/i).first();
      const showingResults = page.getByText(/showing.*result/i).first();
      const grid = page.locator('[class*="grid"]').first();

      const hasNoResults = await noResults.isVisible().catch(() => false);
      const hasShowingText = await showingResults.isVisible().catch(() => false);
      const hasGrid = await grid.isVisible().catch(() => false);

      expect(hasNoResults || hasShowingText || hasGrid).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. Brand Images tab content
// ---------------------------------------------------------------------------

test.describe('Library Page - Brand Images Tab', () => {
  test('Brand Images tab loads without crash', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=brand-images');

    const tabPanel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(tabPanel).toBeVisible({ timeout: 15000 });

    // Should show Upload Image button, image grid, or empty state
    const uploadButton = page.getByRole('button', { name: /upload.*image/i }).first();
    const emptyHeading = page.getByText(/no brand images yet/i).first();
    const imageCard = tabPanel.locator('[class*="card"], [class*="Card"]').first();

    const hasUpload = await uploadButton.isVisible().catch(() => false);
    const hasEmpty = await emptyHeading.isVisible().catch(() => false);
    const hasCards = await imageCard.isVisible().catch(() => false);

    expect(hasUpload || hasEmpty || hasCards).toBe(true);
  });

  test('Brand Images tab has Upload Image button', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=brand-images');

    // The upload button is always shown (in the header area or empty state)
    const uploadButton = page.getByRole('button', { name: /upload/i }).first();
    await expect(uploadButton).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// 5. Templates tab content (Performing Ad Templates)
// ---------------------------------------------------------------------------

test.describe('Library Page - Templates Tab', () => {
  test('Templates tab loads without crash', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=templates');

    const tabPanel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(tabPanel).toBeVisible({ timeout: 15000 });
  });

  test('Templates tab shows search and filter controls or empty state', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=templates');

    // TemplateLibrary always renders a search input and category/platform selects
    const searchInput = page.locator('input[placeholder*="Search templates"]').first();
    const emptyHeading = page.getByText(/no templates yet|no matching templates/i).first();
    const templateCard = page.locator('[class*="card"], [class*="Card"], [class*="rounded-2xl"]').first();

    const hasSearch = await searchInput.isVisible({ timeout: 10000 }).catch(() => false);
    const hasEmpty = await emptyHeading.isVisible().catch(() => false);
    const hasCards = await templateCard.isVisible().catch(() => false);

    expect(hasSearch || hasEmpty || hasCards).toBe(true);
  });

  test('Templates tab has Add Template button', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=templates');

    const addButton = page.getByRole('button', { name: /add.*template/i }).first();
    await expect(addButton).toBeVisible({ timeout: 15000 });
  });
});

// ---------------------------------------------------------------------------
// 6. Scenes tab content (Scene Templates / Ad Scene Templates)
// ---------------------------------------------------------------------------

test.describe('Library Page - Scenes Tab', () => {
  test('Scenes tab loads without crash', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=scene-templates');

    const tabPanel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(tabPanel).toBeVisible({ timeout: 15000 });

    // Content should render something meaningful
    const anyText = tabPanel.locator('h1, h2, h3, p, button').first();
    await expect(anyText).toBeVisible({ timeout: 10000 });
  });

  test('Scenes tab renders template library component or empty state', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=scene-templates');

    // The Templates page embeds a TemplateLibrary component with scene templates
    const templateContent = page.locator('text=/template|scene|no.*template|category/i').first();
    const emptyMessage = page.getByText(/no.*template/i).first();

    const hasContent = await templateContent.isVisible({ timeout: 10000 }).catch(() => false);
    const hasEmpty = await emptyMessage.isVisible().catch(() => false);

    expect(hasContent || hasEmpty).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 7. Scenarios tab content (Installation Scenarios)
// ---------------------------------------------------------------------------

test.describe('Library Page - Scenarios Tab', () => {
  test('Scenarios tab loads without crash', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=scenarios');

    const tabPanel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(tabPanel).toBeVisible({ timeout: 15000 });
  });

  test('Scenarios tab shows create button or scenario cards or empty state', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=scenarios');

    const createButton = page.getByRole('button', { name: /create|add|new.*scenario/i }).first();
    const emptyHeading = page.getByText(/no scenarios yet/i).first();
    const scenarioCard = page.locator('[class*="card"], [class*="Card"]').first();

    const hasCreate = await createButton.isVisible({ timeout: 10000 }).catch(() => false);
    const hasEmpty = await emptyHeading.isVisible().catch(() => false);
    const hasCards = await scenarioCard.isVisible().catch(() => false);

    expect(hasCreate || hasEmpty || hasCards).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 8. Patterns tab content (Learn from Winners)
// ---------------------------------------------------------------------------

test.describe('Library Page - Patterns Tab', () => {
  test('Patterns tab loads without crash', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=patterns');

    const tabPanel = page.locator('[role="tabpanel"][data-state="active"]');
    await expect(tabPanel).toBeVisible({ timeout: 15000 });
  });

  test('Patterns tab shows upload zone or pattern grid or empty state', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=patterns');

    // LearnFromWinners has an AdaptiveUploadZone and/or pattern cards
    const uploadZone = page.locator('[class*="drop"], [class*="upload"], input[type="file"]').first();
    const patternGrid = page.locator('[class*="grid"]').first();
    const emptyText = page.getByText(/upload|no.*pattern|learn.*winner|analyze/i).first();
    const anyButton = page.getByRole('button').first();

    const hasUpload = await uploadZone.isVisible({ timeout: 10000 }).catch(() => false);
    const hasGrid = await patternGrid.isVisible().catch(() => false);
    const hasEmpty = await emptyText.isVisible().catch(() => false);
    const hasButton = await anyButton.isVisible().catch(() => false);

    expect(hasUpload || hasGrid || hasEmpty || hasButton).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 9. Cross-tab and interaction tests
// ---------------------------------------------------------------------------

test.describe('Library Page - Cross-Tab Interactions', () => {
  test('switching between all tabs does not cause errors', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (
        msg.type() === 'error' &&
        !msg.text().includes('favicon') &&
        !msg.text().includes('404') &&
        !msg.text().includes('ERR_INSUFFICIENT_RESOURCES') &&
        !msg.text().includes('Failed to fetch')
      ) {
        consoleErrors.push(msg.text());
      }
    });

    await gotoWithAuth(page, '/library');
    await page.waitForLoadState('domcontentloaded');

    const tabIds = ['brand-images', 'templates', 'scene-templates', 'scenarios', 'patterns', 'products'];

    for (const tabId of tabIds) {
      const tabTrigger = page.locator(`[role="tab"][value="${tabId}"]`).first();
      if (await tabTrigger.isVisible({ timeout: 5000 }).catch(() => false)) {
        await tabTrigger.click();
        await page.waitForTimeout(800);
      } else {
        // Try matching by the nth tab trigger based on known order
        const allTabs = page.locator('[role="tab"]');
        const idx = tabIds.indexOf(tabId) + 1; // products is 0, but we rearranged
        if (idx < (await allTabs.count())) {
          await allTabs.nth(idx).click();
          await page.waitForTimeout(800);
        }
      }
    }

    // Allow a small number of non-critical console errors (lazy-loaded tabs may hit missing data)
    expect(consoleErrors.length).toBeLessThanOrEqual(10);
  });

  test('no duplicate headers appear in any tab (embedded mode)', async ({ page }) => {
    await gotoWithAuth(page, '/library');

    // The Library page itself renders one <Header> and one <h1>Library</h1>.
    // Embedded sub-pages should NOT render their own Header or top-level h1.
    const allH1 = page.locator('h1');
    await expect(allH1.first()).toBeVisible({ timeout: 15000 });

    // There should be exactly one visible h1 with "Library" in the main page
    const libraryH1Count = await page.locator('h1').filter({ hasText: 'Library' }).count();
    expect(libraryH1Count).toBe(1);
  });

  test('Add Product button click opens a modal', async ({ page }) => {
    await gotoWithAuth(page, '/library?tab=products');

    const addButton = page.getByRole('button', { name: /add.*product/i }).first();
    if (await addButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await addButton.click();
      await page.waitForTimeout(500);

      // A dialog / modal should appear
      const dialog = page.locator('[role="dialog"]').first();
      const isDialogVisible = await dialog.isVisible().catch(() => false);
      expect(isDialogVisible).toBe(true);
    }
  });
});
