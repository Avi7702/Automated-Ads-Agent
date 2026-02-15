import { test } from '@playwright/test';
import { gotoWithAuth } from './helpers/ensureAuth';
import {
  verifyAndAnnotate,
  generateDock,
  type VerificationCheck,
  type PageVerificationResult,
} from './helpers/annotate-screenshot';

const allResults: PageVerificationResult[] = [];
const BASE = process.env.BASE_URL || 'https://automated-ads-agent-production.up.railway.app';

test.describe.serial('Visual Verification', { tag: '@visual-verification' }, () => {
  // ---------------------------------------------------------------
  // Test 1: Login Page (/login) — 9 checks
  // ---------------------------------------------------------------
  test('Login page', async ({ browser }) => {
    // Fresh context — no auth
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(`${BASE}/login`);
    await page.waitForLoadState('networkidle');

    const checks: VerificationCheck[] = [
      {
        label: 'Logo badge "V3" visible',
        locator: page.locator('.rounded-xl.bg-gradient-to-br'),
      },
      {
        label: 'Heading "Product Content Studio"',
        locator: page.locator('h1').filter({ hasText: 'Product Content Studio' }),
      },
      {
        label: 'Subtitle "Sign in to continue"',
        locator: page.getByText('Sign in to continue'),
      },
      {
        label: 'Email input field',
        locator: page.locator('input#email'),
      },
      {
        label: 'Password input field',
        locator: page.locator('input#password'),
      },
      {
        label: 'Show/hide password toggle',
        locator: page.locator('button[aria-label="Show password"], button[aria-label="Hide password"]'),
      },
      {
        label: 'Sign In button',
        locator: page.getByRole('button', { name: 'Sign In', exact: true }),
      },
      {
        label: '"Or continue with" separator',
        locator: page.getByText('Or continue with'),
      },
      {
        label: 'Google Sign In button',
        locator: page.getByRole('button', { name: /Sign in with Google/i }),
      },
    ];

    const results = await verifyAndAnnotate(page, checks, 'login');

    allResults.push({
      pageName: 'Login',
      route: '/login',
      screenshotFilename: 'login',
      checks: results,
    });

    await context.close();
  });

  // ---------------------------------------------------------------
  // Test 2: Studio Page (/) — 11 checks
  // Header nav links are <a> tags (wouter <Link>) wrapping <span> elements.
  // Desktop nav is hidden on mobile (hidden md:flex).
  // Studio h1 = "Create stunning product visuals"
  // Quick Start textarea has id="prompt-textarea"
  // Generate button text = "Generate Now"
  // ---------------------------------------------------------------
  test('Studio page', async ({ page }) => {
    await gotoWithAuth(page, '/');
    await page.waitForLoadState('networkidle');
    // Studio page has many animations and lazy-loaded sections; wait for the Quick Start textarea
    await page.getByPlaceholder('Describe what you want to create...').waitFor({ state: 'visible', timeout: 15000 });

    const checks: VerificationCheck[] = [
      {
        label: 'Header navigation bar',
        locator: page.locator('header').first(),
      },
      {
        label: 'Nav link: Studio',
        locator: page.locator('nav[aria-label="Main navigation"] a').filter({ hasText: 'Studio' }),
      },
      {
        label: 'Nav link: Gallery',
        locator: page.locator('nav[aria-label="Main navigation"] a').filter({ hasText: 'Gallery' }),
      },
      {
        label: 'Nav link: Pipeline',
        locator: page.locator('nav[aria-label="Main navigation"] a').filter({ hasText: 'Pipeline' }),
      },
      {
        label: 'Nav link: Library',
        locator: page.locator('nav[aria-label="Main navigation"] a').filter({ hasText: 'Library' }),
      },
      {
        label: 'Nav link: Settings',
        locator: page.locator('nav[aria-label="Main navigation"] a').filter({ hasText: 'Settings' }),
      },
      {
        label: 'Quick start textarea',
        locator: page.getByPlaceholder('Describe what you want to create...'),
      },
      {
        label: '"Generate Now" button',
        locator: page.getByRole('button', { name: 'Generate Now', exact: true }),
      },
      {
        label: '"Your Products" section',
        locator: page.getByRole('button', { name: /Your Products/i }),
        soft: true,
      },
      {
        label: 'Product card loaded',
        locator: page.locator('[class*="aspect-square"] img').first(),
        soft: true,
      },
      {
        label: '"Style & Template" section',
        locator: page.getByRole('button', { name: /Style.*Template/i }),
        soft: true,
      },
    ];

    const results = await verifyAndAnnotate(page, checks, 'studio');

    allResults.push({
      pageName: 'Studio',
      route: '/',
      screenshotFilename: 'studio',
      checks: results,
    });
  });

  // ---------------------------------------------------------------
  // Test 3: Gallery Page (/gallery) — 6 checks
  // h1 = "Gallery"
  // Search input placeholder = "Search prompts..."
  // Sort dropdown is a Radix Select with SelectTrigger button
  // Back button is ghost variant with text "Studio" preceded by ArrowLeft icon
  // Empty state says "No generations yet"
  // ---------------------------------------------------------------
  test('Gallery page', async ({ page }) => {
    await gotoWithAuth(page, '/gallery');
    await page.waitForLoadState('networkidle');

    const checks: VerificationCheck[] = [
      {
        label: 'Header navigation bar',
        locator: page.locator('header').first(),
      },
      {
        label: 'Heading "Gallery"',
        locator: page.locator('h1').filter({ hasText: 'Gallery' }),
      },
      {
        label: 'Search input',
        locator: page.getByPlaceholder('Search prompts...'),
      },
      {
        label: 'Sort dropdown trigger',
        locator: page.locator('button[role="combobox"]').first(),
      },
      {
        label: 'Gallery grid or empty state',
        locator: page.locator('.grid img, :text("No generations yet")').first(),
        soft: true,
      },
      {
        label: 'Back to Studio button',
        locator: page.getByRole('button', { name: /Studio/i }).first(),
      },
    ];

    const results = await verifyAndAnnotate(page, checks, 'gallery');

    allResults.push({
      pageName: 'Gallery',
      route: '/gallery',
      screenshotFilename: 'gallery',
      checks: results,
    });
  });

  // ---------------------------------------------------------------
  // Test 4: Pipeline Page (/pipeline) — 8 checks
  // Radix Tabs: TabsList renders role="tablist", TabsTrigger renders role="tab"
  // Tab labels: "Dashboard", "Content Planner", "Calendar", "Approval Queue", "Social Accounts"
  // ---------------------------------------------------------------
  test('Pipeline page', async ({ page }) => {
    await gotoWithAuth(page, '/pipeline');
    await page.waitForLoadState('networkidle');

    const checks: VerificationCheck[] = [
      {
        label: 'Header navigation bar',
        locator: page.locator('header').first(),
      },
      {
        label: 'Tabs list',
        locator: page.locator('[role="tablist"]'),
      },
      {
        label: 'Dashboard tab',
        locator: page.getByRole('tab', { name: /Dashboard/i }),
      },
      {
        label: 'Content Planner tab',
        locator: page.getByRole('tab', { name: /Content Planner/i }),
      },
      {
        label: 'Calendar tab',
        locator: page.getByRole('tab', { name: /Calendar/i }),
      },
      {
        label: 'Approval Queue tab',
        locator: page.getByRole('tab', { name: /Approval Queue/i }),
      },
      {
        label: 'Social Accounts tab',
        locator: page.getByRole('tab', { name: /Social Accounts/i }),
      },
      {
        label: 'Dashboard content panel',
        locator: page.locator('[role="tabpanel"]').first(),
        soft: true,
      },
    ];

    const results = await verifyAndAnnotate(page, checks, 'pipeline');

    allResults.push({
      pageName: 'Pipeline',
      route: '/pipeline',
      screenshotFilename: 'pipeline',
      checks: results,
    });
  });

  // ---------------------------------------------------------------
  // Test 5: Library Page (/library) — 11 checks
  // h1 = "Library"
  // Description = "Manage your products, ad references, gen templates, and creative assets"
  // Tab labels: "Products", "Brand Images", "Ad References", "Gen Templates", "Scenarios", "Patterns"
  // Tab label text uses hidden sm:inline so icons only on mobile; text visible on desktop
  // ---------------------------------------------------------------
  test('Library page', async ({ page }) => {
    await gotoWithAuth(page, '/library');
    await page.waitForLoadState('networkidle');

    const checks: VerificationCheck[] = [
      {
        label: 'Header navigation bar',
        locator: page.locator('header').first(),
      },
      {
        label: 'Heading "Library"',
        locator: page.locator('h1').filter({ hasText: 'Library' }),
      },
      {
        label: 'Description text',
        locator: page.getByText('Manage your products, ad references, gen templates, and creative assets'),
      },
      {
        label: 'Tabs list',
        locator: page.locator('[role="tablist"]'),
      },
      {
        label: 'Products tab',
        locator: page.getByRole('tab', { name: /Products/i }),
      },
      {
        label: 'Brand Images tab',
        locator: page.getByRole('tab', { name: /Brand Images/i }),
      },
      {
        label: 'Ad References tab',
        locator: page.getByRole('tab', { name: /Ad References/i }),
      },
      {
        label: 'Gen Templates tab',
        locator: page.getByRole('tab', { name: /Gen Templates/i }),
      },
      {
        label: 'Scenarios tab',
        locator: page.getByRole('tab', { name: /Scenarios/i }),
      },
      {
        label: 'Patterns tab',
        locator: page.getByRole('tab', { name: /Patterns/i }),
      },
      {
        label: 'Tab content panel',
        locator: page.locator('[role="tabpanel"]').first(),
        soft: true,
      },
    ];

    const results = await verifyAndAnnotate(page, checks, 'library');

    allResults.push({
      pageName: 'Library',
      route: '/library',
      screenshotFilename: 'library',
      checks: results,
    });
  });

  // ---------------------------------------------------------------
  // Test 6: Settings Page (/settings) — 9 checks
  // h1 = "Settings"
  // Description = "Configure your account and preferences"
  // Sidebar buttons: "Brand Profile", "Knowledge Base", "API Keys", "Strategy", "Usage & Quotas"
  // Content area: bg-card rounded-lg border border-border
  // ---------------------------------------------------------------
  test('Settings page', async ({ page }) => {
    await gotoWithAuth(page, '/settings');
    await page.waitForLoadState('networkidle');

    const checks: VerificationCheck[] = [
      {
        label: 'Header navigation bar',
        locator: page.locator('header').first(),
      },
      {
        label: 'Heading "Settings"',
        locator: page.locator('h1').filter({ hasText: 'Settings' }),
      },
      {
        label: 'Description text',
        locator: page.getByText('Configure your account and preferences'),
      },
      {
        label: 'Brand Profile button',
        locator: page.getByRole('button', { name: /Brand Profile/i }),
      },
      {
        label: 'Knowledge Base button',
        locator: page.getByRole('button', { name: /Knowledge Base/i }),
      },
      {
        label: 'API Keys button',
        locator: page.getByRole('button', { name: /API Keys/i }),
      },
      {
        label: 'Strategy button',
        locator: page.getByRole('button', { name: /Strategy/i }),
      },
      {
        label: 'Usage & Quotas button',
        locator: page.getByRole('button', { name: /Usage/i }),
      },
      {
        label: 'Content area panel',
        locator: page.locator('.bg-card.rounded-lg.border').first(),
        soft: true,
      },
    ];

    const results = await verifyAndAnnotate(page, checks, 'settings');

    allResults.push({
      pageName: 'Settings',
      route: '/settings',
      screenshotFilename: 'settings',
      checks: results,
    });
  });

  // ---------------------------------------------------------------
  // Test 7: 404 Not Found (/this-page-does-not-exist-12345) — 5 checks
  // h1 = "404 Page Not Found"
  // Description = "The page you're looking for doesn't exist or has been moved."
  // Two buttons: "Go to Studio" and "Go Home" (both wrapped in <Link href="/">)
  // No header on this page
  // ---------------------------------------------------------------
  test('404 Not Found page', async ({ page }) => {
    await gotoWithAuth(page, '/this-page-does-not-exist-12345');
    await page.waitForLoadState('networkidle');

    const checks: VerificationCheck[] = [
      {
        label: '"404 Page Not Found" heading',
        locator: page.locator('h1').filter({ hasText: '404 Page Not Found' }),
      },
      {
        label: 'Alert/error icon',
        locator: page.locator('svg').first(),
        soft: true,
      },
      {
        label: 'Description text',
        locator: page.getByText("The page you're looking for doesn't exist or has been moved."),
      },
      {
        label: '"Go to Studio" button',
        locator: page.getByRole('button', { name: 'Go to Studio', exact: true }),
      },
      {
        label: '"Go Home" button',
        locator: page.getByRole('button', { name: 'Go Home', exact: true }),
      },
    ];

    const results = await verifyAndAnnotate(page, checks, '404-not-found');

    allResults.push({
      pageName: '404 Not Found',
      route: '/this-page-does-not-exist-12345',
      screenshotFilename: '404-not-found',
      checks: results,
    });
  });

  // ---------------------------------------------------------------
  // After all: generate the verification dock
  // ---------------------------------------------------------------
  test.afterAll(() => {
    generateDock(allResults);
  });
});
