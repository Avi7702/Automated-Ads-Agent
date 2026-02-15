# E2E Wave 5 Report — Library Tab Specs

**Date:** 2026-02-15
**Author:** E2E Testing Agent
**Tag:** `@library`

## Summary

Created 6 spec files covering all 6 Library tabs with 62 total tests. Each test is independent and uses `gotoWithAuth` for authenticated navigation. Tests target real selectors derived from reading the actual component source code.

## Files Created

| File                                   | Tab           | Tests | Key Coverage                                        |
| -------------------------------------- | ------------- | ----- | --------------------------------------------------- |
| `e2e/18-library-products.spec.ts`      | Products      | 18    | Grid, Add Modal, Detail Modal (3 tabs), Delete      |
| `e2e/19-library-brand-images.spec.ts`  | Brand Images  | 8     | Upload modal, grid/empty, category filter, mobile   |
| `e2e/20-library-templates.spec.ts`     | Ad References | 8     | Grid, detail dialog, Use Template, search/filter    |
| `e2e/21-library-gen-templates.spec.ts` | Gen Templates | 10    | Template grid, mode toggle, Admin mode CRUD         |
| `e2e/22-library-scenarios.spec.ts`     | Scenarios     | 10    | List, create form, edit, delete, room/style toggles |
| `e2e/23-library-patterns.spec.ts`      | Patterns      | 8     | Upload zone, cards, search, filters, view toggle    |

## Test Breakdown by Category

### Products (18 tests)

- **Grid (5):** Cards load, Add button visible, search input, clear search, enrichment badges
- **Add Modal (6):** Opens with title, dropzone, fields (name/category/description), submit disabled without image, cancel closes, validation
- **Detail Modal (4):** Click opens modal, 3 tabs (Details/Relationships/Enrich), Use in Studio button, close
- **Delete (3):** Trash icon on hover, confirmation dialog, cancel closes dialog

### Brand Images (8 tests)

- Upload button visible, grid/empty state, upload modal fields, cancel closes, submit disabled without file, category filter, category badge, mobile responsive

### Ad References (8 tests)

- Grid/empty state, Add Reference button, card opens detail dialog, Use This Template button, search filters, category dropdown, platform dropdown, platform icons on cards

### Gen Templates (10 tests)

- **Normal Mode (5):** Grid/empty, Admin Mode button, card select shows preview, Exact Insert/Inspiration toggle, Use Template button
- **Admin Mode (5):** Toggle into admin, template list/create shown, exit returns to normal, search filters, category buttons

### Scenarios (10 tests)

- List/empty state, New Scenario button, card details (badge + description), form dialog fields, room type toggles, cancel closes form, edit prefills data, delete confirmation, delete cancel

### Patterns (8 tests)

- Upload zone visible, cards/empty state, category + platform badges, usage count + completeness, search filters, category dropdown, platform dropdown, grid/list toggle

## Patterns Used

- **Navigation:** `gotoWithAuth(page, '/library?tab=<tab>')`
- **Page Objects:** `LibraryPage` and `ProductLibraryPage` from `e2e/pages/`
- **API Helpers:** `seedProduct`, `getProducts` from `e2e/helpers/test-data.ts`
- **Test Image Fixtures:** `e2e/fixtures/test-upload.png`, `e2e/fixtures/test-brand-image.jpg`
- **Conditional assertions:** Tests guard against empty states with `if (visible)` patterns
- **Tag:** All tests use `{ tag: '@library' }` for filtering

## Dependencies

- Playwright v1.58.2
- Dev server running at `http://localhost:3000`
- Auth via `/api/auth/demo` endpoint (handled by `gotoWithAuth`)

## Blockers

None. All files written successfully.
