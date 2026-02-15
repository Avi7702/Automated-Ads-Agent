# E2E Test Quality Rules (MANDATORY)

Inject these rules into every teammate writing Playwright E2E tests.

---

## BANNED PATTERNS (zero tolerance)

These patterns make tests silently pass when features are broken. Using any of them is a test-quality failure.

### 1. Error-swallowing catch

```typescript
// BANNED — silently passes if element not found
if (await element.isVisible().catch(() => false)) {
  await element.click();
}

// CORRECT — fails fast if element missing
await expect(element).toBeVisible();
await element.click();
```

### 2. Conditional test skipping

```typescript
// BANNED — skips test body if element missing
if (await element.isVisible()) {
  // test code
}

// CORRECT — assert visibility, then test
await expect(element).toBeVisible();
// test code
```

### 3. Meaningless type assertions

```typescript
// BANNED — always passes regardless of element state
const visible = await element.isVisible();
expect(typeof visible).toBe('boolean');

// CORRECT — asserts actual state
await expect(element).toBeVisible();
```

### 4. Try-catch swallowing

```typescript
// BANNED
try { await element.click(); } catch () {}

// CORRECT
await element.click();
```

### 5. Fallback values hiding failures

```typescript
// BANNED
const text = await element.textContent().catch(() => '');

// CORRECT
await expect(element).toBeVisible();
const text = await element.textContent();
```

### 6. Always-true assertions

```typescript
// BANNED
expect(someCondition || true).toBeTruthy();

// CORRECT
expect(someCondition).toBeTruthy();
```

---

## REQUIRED PATTERNS

### Locator priority (best to worst)

1. `page.getByRole('button', { name: /Submit/i })` — semantic, accessible
2. `page.getByText('Submit')` — text-based
3. `page.getByPlaceholder('Search...')` — for inputs
4. `page.getByTestId('submit-btn')` — data-testid
5. `page.locator('.submit-button')` — CSS selector (last resort)

### Assertions must be strict

```typescript
// Use Playwright's auto-waiting expect
await expect(element).toBeVisible();
await expect(element).toHaveText('Expected');
await expect(element).toBeEnabled();
await expect(element).toHaveAttribute('href', '/path');

// NOT manual boolean checks
const isVisible = await element.isVisible(); // don't do this
```

### Page Object pattern

```typescript
// Define locators as class properties
class GalleryPage {
  readonly searchInput: Locator;
  constructor(page: Page) {
    this.searchInput = page.getByPlaceholder('Search prompts...');
  }
}

// Tests use page objects
const gallery = new GalleryPage(page);
await expect(gallery.searchInput).toBeVisible();
```

### Auth helper

```typescript
import { gotoWithAuth } from './helpers/ensureAuth';

// Always use gotoWithAuth for authenticated pages
await gotoWithAuth(page, '/gallery');
```

---

## VISUAL VERIFICATION API

For annotated screenshot tests, use the helper:

```typescript
import { verifyAndAnnotate, generateDock } from './helpers/annotate-screenshot';

// Verify elements + take annotated screenshot with numbered green ticks
const results = await verifyAndAnnotate(
  page,
  [
    { label: 'Page heading', locator: page.locator('h1') },
    { label: 'Search input', locator: page.getByPlaceholder('Search...') },
    { label: 'Data grid (optional)', locator: page.locator('.grid'), soft: true },
  ],
  'page-name',
);

// Generate dock reference document from all results
generateDock(allResults);
```

- `soft: true` — records pass/fail but doesn't fail the test (for data-dependent elements)
- Numbering resets per page (each page starts at #1)
- Output: `e2e/test-results/screenshots/*.png` + `e2e/test-results/VERIFICATION-DOCK.md`

---

## EXISTING HELPERS

| Helper                           | Import                            | Purpose                               |
| -------------------------------- | --------------------------------- | ------------------------------------- |
| `gotoWithAuth`                   | `e2e/helpers/ensureAuth`          | Navigate with auth retry              |
| `apiGet/apiPost/apiDelete`       | `e2e/helpers/api`                 | API requests with `x-e2e-test` header |
| `seedProduct/seedGeneration`     | `e2e/helpers/test-data`           | Seed test data via API                |
| `MOBILE/TABLET/DESKTOP/WIDE`     | `e2e/helpers/viewport`            | Viewport presets                      |
| `verifyAndAnnotate/generateDock` | `e2e/helpers/annotate-screenshot` | Annotated screenshots                 |

---

## QUICK REFERENCE

- **Config**: `playwright.config.ts` — base URL `localhost:3000`, chromium + mobile projects
- **Auth**: Demo user via `/api/auth/demo`, stored at `e2e/.auth/user.json`
- **Rate limit bypass**: `x-e2e-test: true` header (auto-set in config)
- **Page objects**: `e2e/pages/*.page.ts`
- **Spec naming**: `e2e/XX-feature-name.spec.ts` (numbered 01-37)
- **Run**: `npx playwright test visual-verification --project=chromium`
