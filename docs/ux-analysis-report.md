# UX Analysis Report: Duplications, Dead Buttons & Merge Opportunities

> Generated 2026-02-15 | Based on master map of 20 pages, 400+ interactive elements, 70+ API endpoints

---

## TASK 2: Duplication Analysis

### A. Duplicate Actions (Same API endpoint called from different pages)

#### CRITICAL: Identical functionality duplicated across pages

| #   | API Endpoint                                  | Pages That Call It                                                                                       | Component                                                                    | Severity                                            |
| --- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| D1  | `POST /api/transform` (image generation)      | P1 (Studio: Quick Start, Generate Button), P2 (StudioOptimized: Quick Start, Generate, LinkedIn Preview) | ComposerView, StudioToolbar, LinkedInPreview                                 | HIGH -- Two complete Studio implementations         |
| D2  | `POST /api/copy/generate` (copy generation)   | P1 (CopyTab, ResultView, DetailsTab, LinkedInPreview), P2 (LinkedInPreview)                              | CopyTab.tsx, ResultViewEnhanced.tsx, DetailsTab.tsx, LinkedInPostPreview.tsx | HIGH -- Called from 4+ different components         |
| D3  | `POST /api/generations/:id/edit` (apply edit) | P1 (ResultView S6.6 + InspectorPanel EditTab S7.1)                                                       | ResultViewEnhanced.tsx, EditTab.tsx                                          | MEDIUM -- Same edit UI in two places on same page   |
| D4  | `POST /api/generations/:id/analyze` (ask AI)  | P1 (ResultView S6.7 + InspectorPanel AskAITab S7.3)                                                      | ResultViewEnhanced.tsx, AskAITab.tsx                                         | MEDIUM -- Same ask-AI UI in two places on same page |
| D5  | `POST /api/idea-bank/suggest`                 | P1 (IdeaBankPanel S4.7.C5 + IdeaBankBar S9)                                                              | IdeaBankPanel.tsx, IdeaBankBar.tsx                                           | LOW -- Different UI presentations of same data      |
| D6  | `GET /api/products`                           | P1, P2, P6, P7, P8, P13-S2, P13-S4                                                                       | 7+ different pages                                                           | LOW -- Read-only query, expected                    |
| D7  | `GET /api/templates`                          | P1, P2, P9, P13-S2                                                                                       | 4 pages                                                                      | LOW -- Read-only query, expected                    |
| D8  | `GET /api/generations`                        | P1 (HistoryPanel), P3 (Gallery)                                                                          | HistoryPanel.tsx, GalleryPage.tsx                                            | LOW -- Different views of same data                 |
| D9  | `POST /api/products`                          | P1 (SaveToCatalog), P6 (AddProduct)                                                                      | SaveToCatalogDialog.tsx, AddProductModal.tsx                                 | MEDIUM -- Two different "add product" flows         |
| D10 | Download image (blob)                         | P1 (ResultView S6.2.C2 + DetailsTab S7.4.C2), P2 (S12.C5, S13.C4)                                        | ResultViewEnhanced, DetailsTab, StudioOptimized                              | MEDIUM -- Same download in 4 places                 |
| D11 | Copy to clipboard                             | P1 (ResultView S6.4.C6 + CopyTab S7.2.C3 + DetailsTab S7.4.C1), P2 (S12.C4, S13.C3)                      | 5+ components                                                                | MEDIUM -- Same clipboard action in 5 places         |
| D12 | `GET /api/social/accounts`                    | P4-T5, P4-T3 (SchedulePostDialog)                                                                        | SocialAccounts.tsx, SchedulePostDialog.tsx                                   | LOW -- Read-only, expected                          |

#### Within P1 (Studio) internal duplication

These are the most concerning -- the same P1 page has duplicate UI for identical actions:

| #   | Action                    | Location 1 (ResultView inline)         | Location 2 (InspectorPanel tab)   | Notes                                                                                                                                            |
| --- | ------------------------- | -------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| I1  | Edit + Apply Changes      | S6.6 (edit section in center panel)    | S7.1 (Edit Tab in right panel)    | SAME edit prompt textarea + SAME preset chips + SAME apply button. Both call `orch.handleApplyEdit()`. Edit Tab has 8 presets vs ResultView's 5. |
| I2  | Generate Copy + Edit Copy | S6.7 (copy section in center panel)    | S7.2 (Copy Tab in right panel)    | SAME generate copy button + SAME editable textarea. CopyTab adds "Advanced Copy Studio" toggle.                                                  |
| I3  | Ask AI question           | S6.7 (ask AI input in center panel)    | S7.3 (Ask AI Tab in right panel)  | SAME question input + SAME send button. Ask AI Tab adds 4 quick question buttons.                                                                |
| I4  | LinkedIn Preview          | S6.8 (preview section in center panel) | S7.4 (Details Tab in right panel) | SAME LinkedInPostPreview component rendered in 2 locations.                                                                                      |
| I5  | Download Image            | S6.2.C2 (result header)                | S7.4.C2 (details tab)             | SAME `orch.handleDownloadWithFeedback()`                                                                                                         |
| I6  | Save to Catalog           | S6.4.C5 (action button)                | S7.4.C3 (details tab)             | SAME `orch.setShowSaveToCatalog(true)`                                                                                                           |

---

### B. Overlapping Pages

#### B1: Studio (P1) vs StudioOptimized (P2) -- HIGHEST PRIORITY

**Overlap: ~95% functional overlap**

Both pages do the same thing (create ad images) with nearly identical API calls. Key differences:

| Feature                 | P1 (Studio)                  | P2 (StudioOptimized)                 |
| ----------------------- | ---------------------------- | ------------------------------------ |
| State management        | `useStudioOrchestrator` hook | Inline useState                      |
| Agent Chat              | Yes (S2)                     | No                                   |
| IdeaBankBar             | Yes (S9)                     | No                                   |
| InspectorPanel (4 tabs) | Yes (S7)                     | No (LinkedIn Preview always visible) |
| Progress Rail           | No                           | Yes (S2, dot navigation)             |
| Component memoization   | No                           | Yes                                  |
| HistoryPanel            | Yes (S8)                     | Yes (S14)                            |
| Mobile LinkedIn Preview | Bottom sheet inspector       | Collapsible bottom sheet             |

**Verdict:** P2 is a semi-abandoned performance experiment. P1 has more features. These MUST be merged.

#### B2: Templates (P9) vs Template Library (P10) vs Template Admin (P11)

Three separate pages for "templates" with different data models:

| Page                                      | Data Model           | API                            | Purpose                                  |
| ----------------------------------------- | -------------------- | ------------------------------ | ---------------------------------------- |
| P9: Templates (/templates)                | AdSceneTemplate      | `/api/templates`               | Browse scenes, select mode, go to Studio |
| P10: Template Library (/template-library) | PerformingAdTemplate | `/api/performing-ad-templates` | Browse performing ads, CRUD              |
| P11: Template Admin (/admin/templates)    | AdSceneTemplate      | `/api/ad-templates`            | Admin CRUD for scenes                    |

**Confusion points:**

- P9 and P11 manage the SAME data model (AdSceneTemplate) but use different API paths (`/api/templates` vs `/api/ad-templates`)
- The Library hub (P5) puts P10 under "Templates" tab and P9 under "Scenes" tab -- user must understand internal data model distinction
- P11 is an admin page that duplicates P9's browse capability plus adds CRUD

**Verdict:** P9 and P11 should be merged (admin gets a toggle to show the form). P10 is a separate concept but the naming is confusing.

#### B3: Settings (P13) vs Standalone Sub-Pages (P14, P15, P16)

Three standalone pages exist that are also embedded in Settings:

| Standalone                | Settings Embedded                    | Difference                                      |
| ------------------------- | ------------------------------------ | ----------------------------------------------- |
| P14: `/brand-profile`     | P13-S1: `/settings?section=brand`    | P14 adds "Back to Studio" + "API Keys" nav card |
| P15: `/settings/api-keys` | P13-S3: `/settings?section=api-keys` | P15 adds "Back to Settings" link                |
| P16: `/usage`             | P13-S5: `/settings?section=usage`    | P16 adds Header                                 |

**Verdict:** Standalone pages are redundant. All functionality is accessible via Settings. Standalone routes should redirect to Settings.

#### B4: Library (P5) as Hub vs Direct Routes

Library is a tab container at `/library`. Each sub-page also has its own route:

- `/products` (P6) = `/library?tab=products`
- `/brand-images` (P7) = `/library?tab=brand-images`
- `/templates` (P9) = `/library?tab=scene-templates`
- `/template-library` (P10) = `/library?tab=templates`
- `/installation-scenarios` (P8) = `/library?tab=scenarios`
- `/learn-from-winners` (P12) = `/library?tab=patterns`

**Verdict:** The standalone routes should redirect to Library tabs (like Pipeline's legacy redirects).

---

### C. Dead/Disconnected Elements

| #   | Element                          | Page                    | ID         | Issue                                                                                                                                                                    | Severity |
| --- | -------------------------------- | ----------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| C1  | Gallery "Delete" button          | P3 (Gallery)            | P3.S3.C2   | Button exists with Trash2 icon but **onClick handler is missing**. The button renders but does nothing when clicked.                                                     | HIGH     |
| C2  | "Sync Accounts from n8n" button  | P4-T5 (Social Accounts) | P4T5.S3.C1 | Button shows **"Not Implemented" toast** when clicked. Handler exists but is a placeholder.                                                                              | MEDIUM   |
| C3  | HistoryPanel "Favorites" tab     | P1 (Studio)             | P1.S8.C4   | Tab trigger exists but **currently returns empty** with a TODO comment. No favorites functionality implemented.                                                          | MEDIUM   |
| C4  | StudioOptimized deep-link params | P2                      | URL params | Several URL params (`?templateId`, `?mode`, `?suggestedPrompt`, `?cpTemplateId`) are handled but **no page links TO these URLs** -- only accessible by manual URL entry. | LOW      |
| C5  | 404 Not Found page               | P19                     | -          | Page has **no links or buttons** to navigate back. User is stuck on a dead end with no way to return except browser back button.                                         | LOW      |

---

### D. Redundant Routes

| #   | Route                     | Type                 | Redirect/Replace Target                          | Notes                                                     |
| --- | ------------------------- | -------------------- | ------------------------------------------------ | --------------------------------------------------------- |
| R1  | `/studio-v2`              | Redundant page       | `/` (Studio)                                     | P2 should be removed, features merged into P1             |
| R2  | `/brand-profile`          | Standalone duplicate | `/settings?section=brand`                        | Same component, already embedded in Settings              |
| R3  | `/settings/api-keys`      | Standalone duplicate | `/settings?section=api-keys`                     | Same component, already embedded in Settings              |
| R4  | `/usage`                  | Standalone duplicate | `/settings?section=usage`                        | Same component, already embedded in Settings              |
| R5  | `/products`               | Direct route         | `/library?tab=products`                          | Already embedded in Library                               |
| R6  | `/brand-images`           | Direct route         | `/library?tab=brand-images`                      | Already embedded in Library                               |
| R7  | `/installation-scenarios` | Direct route         | `/library?tab=scenarios`                         | Already embedded in Library                               |
| R8  | `/templates`              | Direct route         | `/library?tab=scene-templates`                   | Already embedded in Library                               |
| R9  | `/template-library`       | Direct route         | `/library?tab=templates`                         | Already embedded in Library                               |
| R10 | `/learn-from-winners`     | Direct route         | `/library?tab=patterns`                          | Already embedded in Library                               |
| R11 | `/admin/templates`        | Admin route          | `/library?tab=scene-templates` (with admin mode) | Could be merged into Library with role-based admin toggle |

**Total: 11 redundant routes**

---

## TASK 3: User Journey Map

### Journey 1: Create an Ad Image

**Happy path (from scratch):**

```
P20 Header "Studio" -> P1 Studio
  P1.S4.5.C6 (select products) -> P1.S4.6.C3 (select template, optional)
  P1.S4.7.C3 (write prompt) OR P1.S9.C4 (pick suggestion from IdeaBankBar)
  P1.S4.9.C1-C3 (set platform, size, quality)
  P1.S4.11.C1 (click "Generate Image")
  -> P1.S5 (GeneratingView, wait)
  -> P1.S6 (ResultViewEnhanced, see result)
  P1.S6.4.C1 (Edit) -> P1.S6.6.C3 (Apply Changes) -- optional iteration
  P1.S6.2.C2 (Download) or P1.S6.4.C5 (Save to Catalog) -> P1.S10.C11 (Save)
```

**From Weekly Plan:**

```
P4-T1.S3.C1 ("Create Now") -> P1 Studio (with planId, postIndex, productId pre-filled)
  -> same flow as above
  -> auto-updates plan post status via PATCH /api/planner/weekly/:planId/posts/:postIndex
```

**From Content Planner template:**

```
P4-T2.S4.C2 (select template) -> P4-T2.S5.C4 ("Create in Studio")
  -> P4-T2.S7.C3 ("Start Fresh") -> P1 Studio (with cpTemplateId)
```

**From Pattern:**

```
P12.S4.C1 ("Apply") -> P1 Studio (with patternId)
```

### Journey 2: Manage Products

**Add product:**

```
P20 Header "Library" -> P5 Library -> P5.S2.C1 ("Products" tab)
  -> P6.S1.C2 ("Add Product") -> P6.S6.C7 (submit form)
```

**Enrich product:**

```
P6.S3.C1 (click product card) -> P6.S5.C3 ("Enrich" tab)
  -> P6.S8.C2 ("Generate Draft") or P6.S8.C4 ("Fetch from URL")
  -> P6.S8.C16 ("Save & Verify")
```

**Add relationship:**

```
P6.S3.C1 (click product card) -> P6.S5.C2 ("Relationships" tab)
  -> P6.S9.C1 ("Add") -> P6.S10.C6 ("Add Relationship")
```

**Delete product:**

```
P6.S3.C2 (hover trash icon) -> P6.S7.C2 ("Delete" confirmation)
```

**Also: Save generated image as product (from Studio):**

```
P1.S6.4.C5 ("Save") -> P1.S10.C11 ("Save to Catalog") -- POST /api/products
```

### Journey 3: Schedule Content

**From Calendar:**

```
P20 Header "Pipeline" -> P4 Pipeline -> P4.S2.C3 ("Calendar" tab)
  -> P4-T3.S1.C1 ("Schedule Post") -> P4-T3.S6 (SchedulePostDialog)
  -> P4-T3.S6.C10 ("Schedule Post" submit)
```

**From Weekly Plan:**

```
P4.S2.C1 ("Dashboard" tab) -> P4-T1.S3.C4 ("Schedule" on a post)
  -> P1 Studio (creates content) -> back to dashboard
```

**Approve content:**

```
P4.S2.C4 ("Approval Queue" tab) -> P4-T4.S5.C3 ("Review")
  -> P4-T4.S6.C5 ("Approve & Schedule")
  OR P4-T4.S5.C2 ("Quick Approve")
  OR P4-T4.S4.C3 ("Approve Selected" for bulk)
```

### Journey 4: Configure Brand

**Full brand profile:**

```
P20 Header "Settings" -> P13 Settings -> P13.S2.C1 ("Brand Profile")
  -> P13-S1: P2.S2.C1 ("Edit Profile") -> BrandProfileForm (Sheet)
  -> P2.S3.C22 ("Save Profile")
```

**Or standalone (redundant):**

```
Direct URL /brand-profile -> P14 -> same BrandProfileDisplay/Form
```

**Content strategy:**

```
P13 Settings -> P13.S2.C4 ("Strategy")
  -> P13-S4: Set frequency, category mix, platforms, posting times, product priorities
  -> P1.S5.C23 ("Save Strategy")
```

### Journey 5: View Results & Analytics

**Gallery view:**

```
P20 Header "Gallery" -> P3 Gallery
  -> P3.S5.C1 (click card) -> P1 Studio (with generation loaded)
```

**History panel (within Studio):**

```
P1.S3.C1 ("History" toggle) -> P1.S8.C6 (click generation thumbnail)
  -> P1 Studio loads that generation
```

**Usage & performance:**

```
P20 Header "Settings" -> P13 Settings -> P13.S2.C5 ("Usage & Quotas")
  -> P13-S5: QuotaDashboard (4 tabs: API Quota, System Health, Performance, Errors)
```

---

## TASK 4: Merge Recommendations

### Priority 1: Merge Studio v1 + v2 (CRITICAL)

**Pages:** P1 (Studio) + P2 (StudioOptimized)
**Action:** Delete P2, keep P1 as the single Studio
**Rationale:** P2 is ~95% identical to P1 but lacks Agent Chat, IdeaBankBar, and InspectorPanel. P1 is the actively developed version. P2's unique features (Progress Rail, memoized components) can be selectively back-ported to P1.
**Route change:** Remove `/studio-v2`
**Effort:** Low -- just delete the file and remove the route

### Priority 2: Eliminate Studio Internal Duplication (HIGH)

**Elements:** P1.S6 (ResultView) inline sections vs P1.S7 (InspectorPanel) tabs
**Action:** Remove the inline edit/copy/ask-AI/preview sections from ResultViewEnhanced (S6.6, S6.7, S6.8). Keep only the InspectorPanel tabs (S7.1-S7.4) as the single location for these actions. The 6-button action grid (S6.4) should be replaced with the InspectorPanel automatically becoming visible when a result is generated.
**Rationale:** Currently the same Edit, Copy, Ask AI, and Preview UI appears in BOTH the center panel (behind toggle buttons) AND the right panel (as tabs). This confuses users and doubles maintenance.
**Impact:** Reduces ~25 duplicate interactive elements.

### Priority 3: Consolidate Standalone Settings Pages (HIGH)

**Pages to remove:** P14 (`/brand-profile`), P15 (`/settings/api-keys`), P16 (`/usage`)
**Action:** Make these routes redirect to their Settings equivalents:

- `/brand-profile` -> `/settings?section=brand`
- `/settings/api-keys` -> `/settings?section=api-keys`
- `/usage` -> `/settings?section=usage`
  **Rationale:** These standalone pages render the exact same components as their Settings-embedded versions. The only difference is a back-navigation link that is unnecessary when using Settings sidebar.
  **Effort:** Low -- add 3 redirect rules, delete 0 components (the embedded mode already works)

### Priority 4: Consolidate Library Sub-Page Routes (MEDIUM)

**Routes to redirect:**

- `/products` -> `/library?tab=products`
- `/brand-images` -> `/library?tab=brand-images`
- `/installation-scenarios` -> `/library?tab=scenarios`
- `/templates` -> `/library?tab=scene-templates`
- `/template-library` -> `/library?tab=templates`
- `/learn-from-winners` -> `/library?tab=patterns`

**Action:** Add redirects in App.tsx router. Keep the sub-page components as-is (they already support `embedded` prop).
**Rationale:** The Library hub already consolidates these. Standalone routes create confusion about where to manage assets.
**Effort:** Low -- just add redirect rules

### Priority 5: Merge Template Admin into Library (MEDIUM)

**Pages:** P11 (TemplateAdmin at `/admin/templates`) -> P9 (Templates at `/library?tab=scene-templates`)
**Action:** Add an "Admin Mode" toggle or "Edit" button to the Scenes tab in Library that shows the admin form inline. Remove the separate admin route.
**Rationale:** P11 manages the same AdSceneTemplate data as P9. Having two separate pages for the same data model with different API paths (`/api/templates` vs `/api/ad-templates`) is confusing and error-prone.
**Additional fix:** Unify API paths -- both should use `/api/templates` for reads and `/api/templates` for writes (or standardize on `/api/ad-templates`).
**Effort:** Medium -- requires merging the admin form into the Library Scenes tab

### Priority 6: Fix Dead Buttons (QUICK WINS)

| #   | Fix                                                                       | Effort  |
| --- | ------------------------------------------------------------------------- | ------- |
| F1  | Wire up Gallery Delete button (P3.S3.C2) with DELETE /api/generations/:id | Low     |
| F2  | Implement or remove "Sync from n8n" button (P4-T5.S3.C1)                  | Low     |
| F3  | Implement or remove HistoryPanel "Favorites" tab (P1.S8.C4)               | Low     |
| F4  | Add "Go Home" link to 404 page (P19)                                      | Trivial |

### Priority 7: Component Consolidation (MEDIUM)

**Shared components that should be extracted/reused:**

| Component                                             | Currently In                                                                   | Should Be                                                             |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Product selector (grid with search + category filter) | P1.S4.5 (Studio), P6 (ProductLibrary)                                          | Shared `<ProductPicker>` component                                    |
| Template browser (grid with search + category filter) | P1.S4.6 (Studio), P9 (Templates), P5 Library                                   | Already using `<TemplateLibrary>` component -- good                   |
| Delete confirmation dialog                            | P6, P7, P8, P10, P11                                                           | Shared `<DeleteConfirmDialog>` (each page has its own implementation) |
| Tag input (add/remove tags)                           | P6 (products), P7 (brand images), P8 (scenarios), P10 (templates), P11 (admin) | Shared `<TagInput>` component                                         |
| LinkedInPostPreview                                   | P1 (ResultView, DetailsTab), P2 (right column, mobile sheet)                   | Already a shared component -- good                                    |

### Priority 8: Navigation Simplification (LOW)

**Current header nav:** Studio, Gallery, Pipeline, Library, Settings (5 items)

**Proposed simplification:** Keep as-is. Five items is manageable. The real simplification comes from eliminating redundant sub-routes (Priorities 3-5 above) which reduces the total addressable routes from 20 to ~8 actual destinations:

| #   | Route              | Description                        |
| --- | ------------------ | ---------------------------------- |
| 1   | `/`                | Studio (create)                    |
| 2   | `/gallery`         | Gallery (browse results)           |
| 3   | `/pipeline`        | Pipeline (plan/schedule/approve)   |
| 4   | `/library`         | Library (manage assets)            |
| 5   | `/settings`        | Settings (configure everything)    |
| 6   | `/login`           | Auth                               |
| 7   | `/system-map`      | Dev tool (hidden from nav)         |
| 8   | `/admin/templates` | Admin (if not merged into Library) |

---

## Summary: Impact Matrix

| Priority  | Change                       | Pages Affected         | Elements Removed  | Routes Eliminated | Effort |
| --------- | ---------------------------- | ---------------------- | ----------------- | ----------------- | ------ |
| P1        | Merge Studio v1+v2           | P2 removed             | ~117              | 1                 | Low    |
| P2        | Remove Studio internal dupes | P1 simplified          | ~25               | 0                 | Medium |
| P3        | Redirect standalone settings | P14, P15, P16          | 0 (redirects)     | 3                 | Low    |
| P4        | Redirect library sub-routes  | P6-P12 standalone      | 0 (redirects)     | 6                 | Low    |
| P5        | Merge template admin         | P11 into P5/P9         | ~30               | 1                 | Medium |
| P6        | Fix dead buttons             | P1, P3, P4-T5, P19     | 0 (fixed)         | 0                 | Low    |
| P7        | Extract shared components    | P1, P6-P12             | ~20 (deduped)     | 0                 | Medium |
| P8        | Nav simplification           | -                      | 0                 | 0                 | N/A    |
| **TOTAL** |                              | **8 pages simplified** | **~192 elements** | **11 routes**     |        |

---

## Appendix: Template System Clarification

The app has TWO completely separate template systems that share confusing naming:

### 1. AdSceneTemplate ("Scenes")

- **Purpose:** AI image generation templates with prompt blueprints containing `{{product}}` placeholders
- **Browse:** P9 at `/templates` or Library "Scenes" tab
- **Admin:** P11 at `/admin/templates`
- **Read API:** `GET /api/templates`
- **CRUD API:** `GET/POST/PUT/DELETE /api/ad-templates`
- **Used in Studio:** Exact Insert or Inspiration mode, sets prompt + placement hints

### 2. PerformingAdTemplate ("Templates")

- **Purpose:** High-performing real-world ad references with engagement metrics
- **Browse/CRUD:** P10 at `/template-library` or Library "Templates" tab
- **API:** `GET/POST/DELETE /api/performing-ad-templates`
- **Used in Studio:** Via Template Inspiration dialog, sets style/platform hints

**Recommendation:** Rename in the UI:

- "Scenes" -> "Generation Templates" (they generate images)
- "Templates" -> "Ad References" or "Winning Ads" (they are reference material)

This eliminates the confusion of having two things called "templates" with different purposes.
