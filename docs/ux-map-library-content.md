# UX Map: Library & Content Pages

> Generated: 2026-02-15
> Agent: UX Mapping Agent
> Scope: Library hub + 6 sub-library pages + TemplateAdmin + LearnFromWinners

---

## P1: Library (route: /library)

File: `client/src/pages/Library.tsx`

**Purpose:** Consolidated tabbed hub that lazy-loads 6 sub-library pages. Uses `useLibraryTabUrl` hook for URL state (`/library?tab=products&item=:id`). Sub-pages receive `embedded` + `selectedId` props so they hide their own Header.

### S1: Page Header

| ID       | Type   | Label/Text                                             | Action | API Endpoint | Data Sent | Notes      |
| -------- | ------ | ------------------------------------------------------ | ------ | ------------ | --------- | ---------- |
| P1.S1.C1 | Static | "Library" (h1)                                         | None   | None         | -         | Page title |
| P1.S1.C2 | Static | "Manage your products, templates, and creative assets" | None   | None         | -         | Subtitle   |

### S2: Tab Navigation (TabsList)

URL state: `?tab=<id>` via `useLibraryTabUrl().setTab`

| ID       | Type        | Label/Text                 | Action                      | API Endpoint | Data Sent | Notes                                        |
| -------- | ----------- | -------------------------- | --------------------------- | ------------ | --------- | -------------------------------------------- |
| P1.S2.C1 | TabsTrigger | "Products" (Package icon)  | Sets `?tab=products`        | None         | -         | Default active tab                           |
| P1.S2.C2 | TabsTrigger | "Brand Images" (ImageIcon) | Sets `?tab=brand-images`    | None         | -         |                                              |
| P1.S2.C3 | TabsTrigger | "Templates" (Layout icon)  | Sets `?tab=templates`       | None         | -         | Loads TemplateLibrary (PerformingAdTemplate) |
| P1.S2.C4 | TabsTrigger | "Scenes" (Grid3X3 icon)    | Sets `?tab=scene-templates` | None         | -         | Loads Templates page (AdSceneTemplate)       |
| P1.S2.C5 | TabsTrigger | "Scenarios" (Layers icon)  | Sets `?tab=scenarios`       | None         | -         | Loads InstallationScenarios                  |
| P1.S2.C6 | TabsTrigger | "Patterns" (Sparkles icon) | Sets `?tab=patterns`        | None         | -         | Loads LearnFromWinners                       |

### S3: Tab Content Panels

Each tab renders its sub-page via Suspense with `<TabLoading />` fallback (Loader2 spinner). Content components pass `embedded` and `selectedId` to sub-pages.

| ID       | Type        | Label/Text      | Action                                                        | API Endpoint | Data Sent | Notes                                  |
| -------- | ----------- | --------------- | ------------------------------------------------------------- | ------------ | --------- | -------------------------------------- |
| P1.S3.C1 | TabsContent | products        | Renders `<ProductLibrary embedded selectedId={...} />`        | None         | -         | Lazy loaded                            |
| P1.S3.C2 | TabsContent | brand-images    | Renders `<BrandImageLibrary embedded selectedId={...} />`     | None         | -         | Lazy loaded                            |
| P1.S3.C3 | TabsContent | templates       | Renders `<TemplateLibrary embedded selectedId={...} />`       | None         | -         | Lazy loaded, PerformingAdTemplate page |
| P1.S3.C4 | TabsContent | scene-templates | Renders `<Templates embedded selectedId={...} />`             | None         | -         | Lazy loaded, AdSceneTemplate page      |
| P1.S3.C5 | TabsContent | scenarios       | Renders `<InstallationScenarios embedded selectedId={...} />` | None         | -         | Lazy loaded                            |
| P1.S3.C6 | TabsContent | patterns        | Renders `<LearnFromWinners embedded selectedId={...} />`      | None         | -         | Lazy loaded                            |

---

## P2: ProductLibrary (route: /products)

File: `client/src/pages/ProductLibrary.tsx`

**Purpose:** CRUD product catalog. Grid display of products with search, detail modal (3 tabs: Details/Relationships/Enrich), add modal, delete confirmation. API: `GET /api/products`, `POST /api/products`, `DELETE /api/products/:id`.

### S1: Page Header (standalone mode only, hidden when `embedded`)

| ID       | Type   | Label/Text                | Action                | API Endpoint | Data Sent | Notes                                       |
| -------- | ------ | ------------------------- | --------------------- | ------------ | --------- | ------------------------------------------- |
| P2.S1.C1 | Static | "Product Library" (h1)    | None                  | None         | -         | Title                                       |
| P2.S1.C2 | Button | "Add Product" (Plus icon) | Opens AddProductModal | None         | -         | Also shown in embedded mode (right-aligned) |

### S2: Search Bar

| ID       | Type          | Label/Text                                      | Action                                | API Endpoint | Data Sent | Notes                                      |
| -------- | ------------- | ----------------------------------------------- | ------------------------------------- | ------------ | --------- | ------------------------------------------ |
| P2.S2.C1 | Input         | "Search products by name, category, or tags..." | Client-side filter `filteredProducts` | None         | -         | Search icon prefix                         |
| P2.S2.C2 | Button (icon) | X icon                                          | Clears search query                   | None         | -         | Only visible when searchQuery is non-empty |

### S3: Product Grid

| ID       | Type                 | Label/Text        | Action                                       | API Endpoint | Data Sent | Notes                                                      |
| -------- | -------------------- | ----------------- | -------------------------------------------- | ------------ | --------- | ---------------------------------------------------------- |
| P2.S3.C1 | Card (clickable)     | Product card      | Opens ProductDetailModal                     | None         | -         | Shows image, name, category, tags, enrichment status badge |
| P2.S3.C2 | Button (icon, hover) | Trash2 icon       | Sets `productToDelete` (opens delete dialog) | None         | -         | Appears on hover, top-left of card                         |
| P2.S3.C3 | Badge                | Enrichment status | None (display only)                          | None         | -         | "Complete", "Verified", "Draft", or "Pending"              |

### S4: Empty/Error States

| ID       | Type   | Label/Text                           | Action                 | API Endpoint        | Data Sent | Notes            |
| -------- | ------ | ------------------------------------ | ---------------------- | ------------------- | --------- | ---------------- |
| P2.S4.C1 | Button | "Try Again"                          | Calls `refetch()`      | `GET /api/products` | -         | Error state      |
| P2.S4.C2 | Button | "Add Your First Product" (Plus icon) | Opens AddProductModal  | None                | -         | Empty state      |
| P2.S4.C3 | Button | "Clear Search"                       | Sets searchQuery to "" | None                | -         | No-results state |

### S5: ProductDetailModal (Dialog)

3-tab dialog: Details, Relationships, Enrich

| ID       | Type        | Label/Text      | Action                        | API Endpoint | Data Sent | Notes                         |
| -------- | ----------- | --------------- | ----------------------------- | ------------ | --------- | ----------------------------- |
| P2.S5.C1 | TabsTrigger | "Details"       | Switches to details tab       | None         | -         | Default                       |
| P2.S5.C2 | TabsTrigger | "Relationships" | Switches to relationships tab | None         | -         | Renders ProductRelationships  |
| P2.S5.C3 | TabsTrigger | "Enrich"        | Switches to enrich tab        | None         | -         | Renders ProductEnrichmentForm |
| P2.S5.C4 | Link+Button | "Use in Studio" | Navigates to `/` (Studio)     | None         | -         | Details tab action            |
| P2.S5.C5 | Button      | "Close"         | Closes modal                  | None         | -         | Details tab action            |

### S6: AddProductModal (Dialog)

Component: `client/src/components/AddProductModal.tsx`

| ID       | Type            | Label/Text                                     | Action                        | API Endpoint         | Data Sent                                      | Notes                                  |
| -------- | --------------- | ---------------------------------------------- | ----------------------------- | -------------------- | ---------------------------------------------- | -------------------------------------- |
| P2.S6.C1 | Dropzone        | "Drag & drop an image" / "Drop the image here" | Selects file, creates preview | None                 | -                                              | Accepts JPG, PNG, WebP, GIF up to 10MB |
| P2.S6.C2 | Button (icon)   | X icon on preview                              | Clears selected file          | None                 | -                                              |                                        |
| P2.S6.C3 | Input           | "Product Name \*"                              | Sets name state               | None                 | -                                              | Required, auto-filled from filename    |
| P2.S6.C4 | Input           | "Category"                                     | Sets category state           | None                 | -                                              | Optional                               |
| P2.S6.C5 | Textarea        | "Description"                                  | Sets description state        | None                 | -                                              | Optional                               |
| P2.S6.C6 | Button          | "Cancel"                                       | Closes modal, resets form     | None                 | -                                              |                                        |
| P2.S6.C7 | Button (submit) | "Add Product" / "Uploading..."                 | Submits form                  | `POST /api/products` | FormData: image, name, category?, description? | Disabled when uploading or no file     |

### S7: Delete Confirmation (AlertDialog)

| ID       | Type              | Label/Text               | Action          | API Endpoint               | Data Sent | Notes                                     |
| -------- | ----------------- | ------------------------ | --------------- | -------------------------- | --------- | ----------------------------------------- |
| P2.S7.C1 | AlertDialogCancel | "Cancel"                 | Closes dialog   | None                       | -         |                                           |
| P2.S7.C2 | AlertDialogAction | "Delete" / "Deleting..." | Deletes product | `DELETE /api/products/:id` | -         | Invalidates "products" query, shows toast |

### S8: ProductEnrichmentForm (within Detail Modal > Enrich tab)

Component: `client/src/components/ProductEnrichmentForm.tsx`

| ID        | Type             | Label/Text                       | Action                        | API Endpoint                               | Data Sent                                             | Notes                                          |
| --------- | ---------------- | -------------------------------- | ----------------------------- | ------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------- |
| P2.S8.C1  | Clickable header | Product name + status            | Toggles expanded/collapsed    | None                                       | -                                                     | Shows enrichment status badge + completeness % |
| P2.S8.C2  | Button           | "Generate Draft" (Sparkles icon) | AI-generates enrichment draft | `POST /api/products/:id/enrich`            | -                                                     | Only shown when status is "pending"            |
| P2.S8.C3  | Input            | "Enrich from Product URL"        | Sets productUrl state         | None                                       | -                                                     | URL input field                                |
| P2.S8.C4  | Button           | "Fetch" (ExternalLink icon)      | Fetches product data from URL | `POST /api/products/:id/enrich-from-url`   | `{ productUrl }`                                      | Validates URL format                           |
| P2.S8.C5  | Textarea         | "Description"                    | Edits description             | None                                       | -                                                     |                                                |
| P2.S8.C6  | Input pairs      | Feature name + value             | Edits features                | None                                       | -                                                     | Key-value pairs                                |
| P2.S8.C7  | Button           | "+ Add Feature"                  | Adds empty feature row        | None                                       | -                                                     |                                                |
| P2.S8.C8  | Input            | "Add a benefit..."               | Adds benefit                  | None                                       | -                                                     | Enter key or Add button                        |
| P2.S8.C9  | Button           | "Add" (benefit)                  | Adds benefit to list          | None                                       | -                                                     |                                                |
| P2.S8.C10 | Button (x)       | Remove benefit                   | Removes benefit from list     | None                                       | -                                                     | Inline x button                                |
| P2.S8.C11 | Input            | "Add a tag..."                   | Adds tag                      | None                                       | -                                                     | Enter key or Add button                        |
| P2.S8.C12 | Button           | "Add" (tag)                      | Adds tag to list              | None                                       | -                                                     |                                                |
| P2.S8.C13 | Button (x)       | Remove tag                       | Removes tag from list         | None                                       | -                                                     | Inline x button                                |
| P2.S8.C14 | Input            | "SKU (optional)"                 | Sets SKU                      | None                                       | -                                                     |                                                |
| P2.S8.C15 | Button           | "Approve As-Is" (Check icon)     | Saves draft as-is             | `POST /api/products/:id/enrichment/verify` | `{ approvedAsIs: true }`                              | Only shown when status is "draft"              |
| P2.S8.C16 | Button           | "Save & Verify" (Check icon)     | Saves edited enrichment       | `POST /api/products/:id/enrichment/verify` | formData (description, features, benefits, tags, sku) |                                                |

### S9: ProductRelationships (within Detail Modal > Relationships tab)

Component: `client/src/components/ProductRelationships.tsx`

| ID       | Type                 | Label/Text        | Action                     | API Endpoint                            | Data Sent | Notes            |
| -------- | -------------------- | ----------------- | -------------------------- | --------------------------------------- | --------- | ---------------- |
| P2.S9.C1 | Button               | "Add" (Plus icon) | Opens AddRelationshipModal | None                                    | -         |                  |
| P2.S9.C2 | Button (icon, hover) | Trash2 icon       | Deletes relationship       | `DELETE /api/product-relationships/:id` | -         | Appears on hover |

### S10: AddRelationshipModal (within Relationships)

| ID        | Type     | Label/Text                                  | Action                | API Endpoint                      | Data Sent                                                                           | Notes                                                                 |
| --------- | -------- | ------------------------------------------- | --------------------- | --------------------------------- | ----------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| P2.S10.C1 | Select   | "Relationship Type"                         | Sets relationshipType | None                              | -                                                                                   | Options: pairs_with, requires, replaces, matches, completes, upgrades |
| P2.S10.C2 | Select   | "Related Product"                           | Sets targetProductId  | None                              | -                                                                                   | Filtered to exclude existing relationships                            |
| P2.S10.C3 | Textarea | "Description (Optional)"                    | Sets description      | None                              | -                                                                                   |                                                                       |
| P2.S10.C4 | Checkbox | "This product is required for installation" | Sets isRequired       | None                              | -                                                                                   | Only shown when type is "requires"                                    |
| P2.S10.C5 | Button   | "Cancel"                                    | Closes modal          | None                              | -                                                                                   |                                                                       |
| P2.S10.C6 | Button   | "Add Relationship" (Plus icon)              | Creates relationship  | `POST /api/product-relationships` | `{ sourceProductId, targetProductId, relationshipType, description?, isRequired? }` |                                                                       |

---

## P3: BrandImageLibrary (route: /brand-images)

File: `client/src/pages/BrandImageLibrary.tsx`

**Purpose:** Upload, view, filter, and delete brand images. Grid layout with category filter. API: `GET /api/brand-images`, `POST /api/brand-images`, `DELETE /api/brand-images/:id`.

### S1: Page Header

| ID       | Type   | Label/Text                   | Action            | API Endpoint | Data Sent | Notes                       |
| -------- | ------ | ---------------------------- | ----------------- | ------------ | --------- | --------------------------- |
| P3.S1.C1 | Static | "Brand Image Library" (h1)   | None              | None         | -         | Title (shown in both modes) |
| P3.S1.C2 | Button | "Upload Image" (Upload icon) | Opens UploadModal | None         | -         |                             |

### S2: Category Filter

| ID       | Type   | Label/Text               | Action                         | API Endpoint | Data Sent | Notes                                                                                                                    |
| -------- | ------ | ------------------------ | ------------------------------ | ------------ | --------- | ------------------------------------------------------------------------------------------------------------------------ |
| P3.S2.C1 | Select | Category filter dropdown | Sets `categoryFilter` state    | None         | -         | Options: All Categories + used categories from: historical_ad, product_hero, installation, detail, lifestyle, comparison |
| P3.S2.C2 | Button | "Clear" (X icon)         | Resets categoryFilter to "all" | None         | -         | Only visible when filter is active                                                                                       |

### S3: Image Grid

| ID       | Type                        | Label/Text  | Action                    | API Endpoint | Data Sent | Notes                |
| -------- | --------------------------- | ----------- | ------------------------- | ------------ | --------- | -------------------- |
| P3.S3.C1 | Card image area (clickable) | Brand image | Opens ImageDetailModal    | None         | -         | Shows category badge |
| P3.S3.C2 | Button (hover overlay)      | Eye icon    | Opens ImageDetailModal    | None         | -         |                      |
| P3.S3.C3 | Button (hover overlay)      | Trash2 icon | Opens delete confirmation | None         | -         |                      |

### S4: Empty/No Results States

| ID       | Type   | Label/Text                         | Action                         | API Endpoint | Data Sent | Notes            |
| -------- | ------ | ---------------------------------- | ------------------------------ | ------------ | --------- | ---------------- |
| P3.S4.C1 | Button | "Upload First Image" (Upload icon) | Opens UploadModal              | None         | -         | Empty state      |
| P3.S4.C2 | Button | "Show All Images"                  | Resets categoryFilter to "all" | None         | -         | No-results state |

### S5: UploadModal (Dialog)

| ID        | Type               | Label/Text                         | Action                        | API Endpoint             | Data Sent                                                                                                 | Notes                                                                                                    |
| --------- | ------------------ | ---------------------------------- | ----------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P3.S5.C1  | Clickable zone     | "Click to upload or drag and drop" | Opens file picker             | None                     | -                                                                                                         | Accepts image/\*                                                                                         |
| P3.S5.C2  | Button (icon)      | X icon on preview                  | Removes selected file/preview | None                     | -                                                                                                         |                                                                                                          |
| P3.S5.C3  | Select             | "Category"                         | Sets category                 | None                     | -                                                                                                         | Default: product_hero. Options: historical_ad, product_hero, installation, detail, lifestyle, comparison |
| P3.S5.C4  | Textarea           | "Description (Optional)"           | Sets description              | None                     | -                                                                                                         |                                                                                                          |
| P3.S5.C5  | Input              | "Add tag..."                       | Adds tag                      | None                     | -                                                                                                         | Enter key or Plus button                                                                                 |
| P3.S5.C6  | Button             | Plus icon (add tag)                | Adds tag to list              | None                     | -                                                                                                         |                                                                                                          |
| P3.S5.C7  | Button (x)         | Remove tag                         | Removes tag                   | None                     | -                                                                                                         | Inline on Badge                                                                                          |
| P3.S5.C8  | Badge (toggleable) | Suggested uses                     | Toggles use in suggestedUses  | None                     | -                                                                                                         | Options: hero, detail, comparison, installation, social_media, banner, thumbnail                         |
| P3.S5.C9  | Select             | "Aspect Ratio (Optional)"          | Sets aspectRatio              | None                     | -                                                                                                         | Options: Not specified, 1:1, 16:9, 4:5, 9:16, 4:3                                                        |
| P3.S5.C10 | Checkbox list      | Associated Products                | Toggles product association   | None                     | -                                                                                                         | Shows all products from `GET /api/products`                                                              |
| P3.S5.C11 | Button             | "Cancel"                           | Closes modal, resets form     | None                     | -                                                                                                         |                                                                                                          |
| P3.S5.C12 | Button (submit)    | "Upload Image" / spinner           | Uploads image                 | `POST /api/brand-images` | FormData: image, category, description, tags (JSON), productIds (JSON), suggestedUse (JSON), aspectRatio? |                                                                                                          |

### S6: ImageDetailModal (Dialog)

| ID       | Type   | Label/Text                   | Action                    | API Endpoint | Data Sent | Notes |
| -------- | ------ | ---------------------------- | ------------------------- | ------------ | --------- | ----- |
| P3.S6.C1 | Button | "Close"                      | Closes modal              | None         | -         |       |
| P3.S6.C2 | Button | "Delete Image" (Trash2 icon) | Opens delete confirmation | None         | -         |       |

### S7: Delete Confirmation (Dialog)

| ID       | Type   | Label/Text         | Action        | API Endpoint                   | Data Sent | Notes                            |
| -------- | ------ | ------------------ | ------------- | ------------------------------ | --------- | -------------------------------- |
| P3.S7.C1 | Button | "Cancel"           | Closes dialog | None                           | -         |                                  |
| P3.S7.C2 | Button | "Delete" / spinner | Deletes image | `DELETE /api/brand-images/:id` | -         | Invalidates "brand-images" query |

---

## P4: InstallationScenarios (route: /installation-scenarios)

File: `client/src/pages/InstallationScenarios.tsx`

**Purpose:** CRUD for installation scenarios (room type, application, before/after). Grid of cards with create/edit/delete. API: `GET /api/installation-scenarios`, `POST /api/installation-scenarios`, `PUT /api/installation-scenarios/:id`, `DELETE /api/installation-scenarios/:id`.

### S1: Page Header

| ID       | Type   | Label/Text                    | Action                                | API Endpoint | Data Sent | Notes |
| -------- | ------ | ----------------------------- | ------------------------------------- | ------------ | --------- | ----- |
| P4.S1.C1 | Static | "Installation Scenarios" (h1) | None                                  | None         | -         | Title |
| P4.S1.C2 | Button | "New Scenario" (Plus icon)    | Opens ScenarioFormModal (create mode) | None         | -         |       |

### S2: Scenario Grid

| ID       | Type                 | Label/Text    | Action                              | API Endpoint | Data Sent | Notes                                                                    |
| -------- | -------------------- | ------------- | ----------------------------------- | ------------ | --------- | ------------------------------------------------------------------------ |
| P4.S2.C1 | Card                 | Scenario card | Display only                        | None         | -         | Shows title, type badge, description, room types, style tags, step count |
| P4.S2.C2 | Button (icon, hover) | Edit2 icon    | Opens ScenarioFormModal (edit mode) | None         | -         |                                                                          |
| P4.S2.C3 | Button (icon, hover) | Trash2 icon   | Opens delete confirmation           | None         | -         |                                                                          |

### S3: Empty State

| ID       | Type   | Label/Text                          | Action                                | API Endpoint | Data Sent | Notes |
| -------- | ------ | ----------------------------------- | ------------------------------------- | ------------ | --------- | ----- |
| P4.S3.C1 | Button | "Create First Scenario" (Plus icon) | Opens ScenarioFormModal (create mode) | None         | -         |       |

### S4: ScenarioFormModal (Dialog) -- Create/Edit

| ID        | Type                  | Label/Text                              | Action                      | API Endpoint                                                                | Data Sent                                                                                                              | Notes                                                                                           |
| --------- | --------------------- | --------------------------------------- | --------------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| P4.S4.C1  | Input                 | "Title"                                 | Sets title                  | None                                                                        | -                                                                                                                      | Required                                                                                        |
| P4.S4.C2  | Textarea              | "Description"                           | Sets description            | None                                                                        | -                                                                                                                      | Required                                                                                        |
| P4.S4.C3  | Select                | "Scenario Type"                         | Sets scenarioType           | None                                                                        | -                                                                                                                      | Options: room_type, application, before_after                                                   |
| P4.S4.C4  | Select                | "Primary Product (Optional)"            | Sets primaryProductId       | None                                                                        | -                                                                                                                      | Products from `GET /api/products`                                                               |
| P4.S4.C5  | Badge (toggleable) x9 | Room type badges                        | Toggles room type           | None                                                                        | -                                                                                                                      | Options: living_room, bedroom, kitchen, bathroom, office, commercial, outdoor, basement, garage |
| P4.S4.C6  | Badge (toggleable) x8 | Style tag badges                        | Toggles style tag           | None                                                                        | -                                                                                                                      | Options: modern, rustic, traditional, industrial, minimalist, contemporary, farmhouse, coastal  |
| P4.S4.C7  | Input                 | "Add installation step..."              | Adds step                   | None                                                                        | -                                                                                                                      | Enter key or Plus button                                                                        |
| P4.S4.C8  | Button                | Plus icon (add step)                    | Adds step to list           | None                                                                        | -                                                                                                                      |                                                                                                 |
| P4.S4.C9  | Button (icon)         | X icon per step                         | Removes step                | None                                                                        | -                                                                                                                      |                                                                                                 |
| P4.S4.C10 | Input                 | "e.g., underlayment, trim, adhesive..." | Adds accessory              | None                                                                        | -                                                                                                                      | Enter key or Plus button                                                                        |
| P4.S4.C11 | Button                | Plus icon (add accessory)               | Adds accessory to list      | None                                                                        | -                                                                                                                      |                                                                                                 |
| P4.S4.C12 | Button (x)            | Remove accessory badge                  | Removes accessory           | None                                                                        | -                                                                                                                      |                                                                                                 |
| P4.S4.C13 | Button                | "Cancel"                                | Closes modal                | None                                                                        | -                                                                                                                      |                                                                                                 |
| P4.S4.C14 | Button (submit)       | "Create Scenario" / "Update Scenario"   | Creates or updates scenario | `POST /api/installation-scenarios` or `PUT /api/installation-scenarios/:id` | `{ title, description, scenarioType, primaryProductId, roomTypes, styleTags, installationSteps, requiredAccessories }` |                                                                                                 |

### S5: Delete Confirmation (Dialog)

| ID       | Type   | Label/Text         | Action           | API Endpoint                             | Data Sent | Notes |
| -------- | ------ | ------------------ | ---------------- | ---------------------------------------- | --------- | ----- |
| P4.S5.C1 | Button | "Cancel"           | Closes dialog    | None                                     | -         |       |
| P4.S5.C2 | Button | "Delete" / spinner | Deletes scenario | `DELETE /api/installation-scenarios/:id` | -         |       |

---

## P5: Templates (route: /templates) -- "Scenes" tab in Library

File: `client/src/pages/Templates.tsx`

**Purpose:** Scene template browser (AdSceneTemplate). Lets user select a template, choose a generation mode (Exact Insert / Inspiration), then navigate to Studio to use it. Embeds the `<TemplateLibrary>` component for browsing.

### S1: Navigation (standalone mode only)

| ID       | Type        | Label/Text                        | Action           | API Endpoint | Data Sent | Notes |
| -------- | ----------- | --------------------------------- | ---------------- | ------------ | --------- | ----- |
| P5.S1.C1 | Link+Button | "Back to Studio" (ArrowLeft icon) | Navigates to `/` | None         | -         |       |

### S2: Selected Template Preview (shown when a template is selected)

| ID       | Type            | Label/Text                     | Action                                                                   | API Endpoint | Data Sent | Notes                             |
| -------- | --------------- | ------------------------------ | ------------------------------------------------------------------------ | ------------ | --------- | --------------------------------- |
| P5.S2.C1 | Button          | "Clear Selection"              | Sets selectedTemplate to null                                            | None         | -         |                                   |
| P5.S2.C2 | Button (toggle) | "Exact Insert" (Wand2 icon)    | Sets selectedMode to "exact_insert"                                      | None         | -         | data-testid="mode-exact-insert"   |
| P5.S2.C3 | Button (toggle) | "Inspiration" (Sparkles icon)  | Sets selectedMode to "inspiration"                                       | None         | -         | data-testid="mode-inspiration"    |
| P5.S2.C4 | Button          | "Use Template" (Sparkles icon) | Saves template to localStorage, navigates to `/?templateId=...&mode=...` | None         | -         | data-testid="button-use-template" |

### S3: TemplateLibrary Component (embedded)

Component: `client/src/components/TemplateLibrary.tsx`

Fetches from `GET /api/templates?category=...&isGlobal=...`

| ID       | Type                     | Label/Text                                          | Action                                | API Endpoint         | Data Sent | Notes                                                                                                                              |
| -------- | ------------------------ | --------------------------------------------------- | ------------------------------------- | -------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| P5.S3.C1 | Button                   | "Refresh" (RefreshCw icon)                          | Calls refetch()                       | `GET /api/templates` | -         | data-testid="button-refresh-templates"                                                                                             |
| P5.S3.C2 | Input                    | "Search templates by name, description, or tags..." | Client-side filter                    | None                 | -         | data-testid="input-search-templates"                                                                                               |
| P5.S3.C3 | Button x6                | Category filter buttons                             | Sets selectedCategory                 | None                 | -         | Options: All Templates, Product Showcase, Installation, Worksite, Professional, Educational. data-testid="button-category-<value>" |
| P5.S3.C4 | Button (toggle)          | "Show Global Only" / "Global Templates Only"        | Toggles isGlobalOnly                  | None                 | -         | data-testid="button-toggle-global"                                                                                                 |
| P5.S3.C5 | TemplateCard (clickable) | Template card                                       | Calls onSelectTemplate callback       | None                 | -         | Via `<TemplateCard>` component                                                                                                     |
| P5.S3.C6 | Button                   | "Clear Filters"                                     | Resets search, category, isGlobalOnly | None                 | -         | Empty state with active filters                                                                                                    |
| P5.S3.C7 | Button                   | "Try Again"                                         | Calls refetch()                       | `GET /api/templates` | -         | Error state                                                                                                                        |

---

## P6: TemplateLibrary (route: /template-library) -- "Templates" tab in Library

File: `client/src/pages/TemplateLibrary.tsx`

**Purpose:** Browse and manage PerformingAdTemplate records. Features search, category/platform filters, detail modal, add modal, and delete. API: `GET /api/performing-ad-templates`, `POST /api/performing-ad-templates`, `DELETE /api/performing-ad-templates/:id`.

### S1: Page Header

| ID       | Type   | Label/Text                 | Action                 | API Endpoint | Data Sent | Notes |
| -------- | ------ | -------------------------- | ---------------------- | ------------ | --------- | ----- |
| P6.S1.C1 | Static | "Template Library" (h1)    | None                   | None         | -         | Title |
| P6.S1.C2 | Button | "Add Template" (Plus icon) | Opens AddTemplateModal | None         | -         |       |

### S2: Filters

| ID       | Type   | Label/Text            | Action                                 | API Endpoint | Data Sent | Notes                                                                                        |
| -------- | ------ | --------------------- | -------------------------------------- | ------------ | --------- | -------------------------------------------------------------------------------------------- |
| P6.S2.C1 | Input  | "Search templates..." | Client-side filter by name/description | None         | -         | Search icon prefix                                                                           |
| P6.S2.C2 | Select | Category filter       | Sets selectedCategory                  | None         | -         | Options: All Categories, product_showcase, installation, worksite, professional, educational |
| P6.S2.C3 | Select | Platform filter       | Sets selectedPlatform                  | None         | -         | Options: All Platforms, instagram, facebook, linkedin, twitter, tiktok                       |

### S3: Template Grid

| ID       | Type             | Label/Text     | Action                       | API Endpoint                              | Data Sent | Notes                                                                                         |
| -------- | ---------------- | -------------- | ---------------------------- | ----------------------------------------- | --------- | --------------------------------------------------------------------------------------------- |
| P6.S3.C1 | Card (clickable) | TemplateCard   | Opens TemplateDetailModal    | None                                      | -         | Shows name, description, category badge, platform icons, engagement tier badge, featured star |
| P6.S3.C2 | Button (hover)   | "Use Template" | Opens TemplateDetailModal    | None                                      | -         |                                                                                               |
| P6.S3.C3 | Button (hover)   | Trash2 icon    | Calls confirm() then deletes | `DELETE /api/performing-ad-templates/:id` | -         | Uses `window.confirm()`                                                                       |

### S4: Empty State

| ID       | Type   | Label/Text                       | Action                 | API Endpoint | Data Sent | Notes                                              |
| -------- | ------ | -------------------------------- | ---------------------- | ------------ | --------- | -------------------------------------------------- |
| P6.S4.C1 | Button | "Add First Template" (Plus icon) | Opens AddTemplateModal | None         | -         | Only shown when no filters active and no templates |

### S5: TemplateDetailModal (Dialog)

| ID       | Type   | Label/Text                          | Action                                                           | API Endpoint | Data Sent | Notes                          |
| -------- | ------ | ----------------------------------- | ---------------------------------------------------------------- | ------------ | --------- | ------------------------------ |
| P6.S5.C1 | Link   | "View Original" (ExternalLink icon) | Opens sourceUrl in new tab                                       | None         | -         | Only shown if sourceUrl exists |
| P6.S5.C2 | Button | "Use This Template" (Sparkles icon) | Stores template in sessionStorage, navigates to `/?template=:id` | None         | -         |                                |
| P6.S5.C3 | Button | "Close"                             | Closes modal                                                     | None         | -         |                                |

### S6: AddTemplateModal (Dialog)

Component: `client/src/components/AddTemplateModal.tsx`

| ID        | Type                  | Label/Text                     | Action                       | API Endpoint                        | Data Sent                                                                                                                                                                                                                                                                                                      | Notes                                                                        |
| --------- | --------------------- | ------------------------------ | ---------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| P6.S6.C1  | Clickable zone        | Preview image upload           | Opens file picker            | None                                | -                                                                                                                                                                                                                                                                                                              | Click to upload                                                              |
| P6.S6.C2  | Button (icon)         | X icon on preview              | Removes preview file         | None                                | -                                                                                                                                                                                                                                                                                                              |                                                                              |
| P6.S6.C3  | Input                 | "Name \*"                      | Sets name                    | None                                | -                                                                                                                                                                                                                                                                                                              | Required                                                                     |
| P6.S6.C4  | Textarea              | "Description"                  | Sets description             | None                                | -                                                                                                                                                                                                                                                                                                              |                                                                              |
| P6.S6.C5  | Select                | "Category"                     | Sets category                | None                                | -                                                                                                                                                                                                                                                                                                              | Options: product_showcase, installation, worksite, professional, educational |
| P6.S6.C6  | Select                | "Engagement Tier"              | Sets engagementTier          | None                                | -                                                                                                                                                                                                                                                                                                              | Options: top-5, top-10, top-25, unranked                                     |
| P6.S6.C7  | Input                 | "Est. Engagement Rate (%)"     | Sets estimatedEngagementRate | None                                | -                                                                                                                                                                                                                                                                                                              | Number input                                                                 |
| P6.S6.C8  | Input                 | "Running Days"                 | Sets runningDays             | None                                | -                                                                                                                                                                                                                                                                                                              | Number input                                                                 |
| P6.S6.C9  | Input                 | "Source URL"                   | Sets sourceUrl               | None                                | -                                                                                                                                                                                                                                                                                                              | URL type                                                                     |
| P6.S6.C10 | Input                 | "Source Platform"              | Sets sourcePlatform          | None                                | -                                                                                                                                                                                                                                                                                                              |                                                                              |
| P6.S6.C11 | Input                 | "Advertiser Name"              | Sets advertiserName          | None                                | -                                                                                                                                                                                                                                                                                                              |                                                                              |
| P6.S6.C12 | Select                | "Mood"                         | Sets mood                    | None                                | -                                                                                                                                                                                                                                                                                                              | Options: professional, playful, bold, minimal, luxurious, energetic          |
| P6.S6.C13 | Select                | "Style"                        | Sets style                   | None                                | -                                                                                                                                                                                                                                                                                                              | Options: modern, classic, retro, corporate, creative, elegant                |
| P6.S6.C14 | Select                | "Background"                   | Sets backgroundType          | None                                | -                                                                                                                                                                                                                                                                                                              | Options: solid, gradient, image, video                                       |
| P6.S6.C15 | Badge (toggleable) x5 | Target Platforms               | Toggles platform             | None                                | -                                                                                                                                                                                                                                                                                                              | Options: instagram, facebook, linkedin, twitter, tiktok                      |
| P6.S6.C16 | Badge (toggleable) x5 | Target Aspect Ratios           | Toggles aspect ratio         | None                                | -                                                                                                                                                                                                                                                                                                              | Options: 1:1, 4:5, 9:16, 16:9, 4:3                                           |
| P6.S6.C17 | Badge (toggleable) x4 | Best For Objectives            | Toggles objective            | None                                | -                                                                                                                                                                                                                                                                                                              | Options: awareness, consideration, conversion, engagement                    |
| P6.S6.C18 | Input                 | "Add industry and press Enter" | Adds industry tag            | None                                | -                                                                                                                                                                                                                                                                                                              | Enter key or Add button                                                      |
| P6.S6.C19 | Button                | "Add" (industry)               | Adds industry to list        | None                                | -                                                                                                                                                                                                                                                                                                              |                                                                              |
| P6.S6.C20 | Badge (x)             | Remove industry                | Removes industry from list   | None                                | -                                                                                                                                                                                                                                                                                                              |                                                                              |
| P6.S6.C21 | Checkbox              | "Mark as Featured" (Star icon) | Toggles isFeatured           | None                                | -                                                                                                                                                                                                                                                                                                              |                                                                              |
| P6.S6.C22 | Button (submit)       | "Add Template" / "Creating..." | Creates template             | `POST /api/performing-ad-templates` | FormData: name, description, category, engagementTier, isFeatured, sourceUrl?, sourcePlatform?, advertiserName?, estimatedEngagementRate?, runningDays?, mood?, style?, backgroundType?, targetPlatforms (JSON), targetAspectRatios (JSON), bestForObjectives (JSON), bestForIndustries (JSON), preview (file) |                                                                              |
| P6.S6.C23 | Button                | "Cancel"                       | Closes modal                 | None                                | -                                                                                                                                                                                                                                                                                                              |                                                                              |

---

## P7: TemplateAdmin (route: /admin/templates)

File: `client/src/pages/TemplateAdmin.tsx`

**Purpose:** Admin CRUD for AdSceneTemplate (different from PerformingAdTemplate). Table view + full form for create/edit. API: `GET /api/ad-templates`, `POST /api/ad-templates`, `PUT /api/ad-templates/:id`, `DELETE /api/ad-templates/:id`.

### S1: Action Bar

| ID       | Type        | Label/Text                           | Action                    | API Endpoint            | Data Sent | Notes |
| -------- | ----------- | ------------------------------------ | ------------------------- | ----------------------- | --------- | ----- |
| P7.S1.C1 | Link+Button | "Back to Templates" (ArrowLeft icon) | Navigates to `/templates` | None                    | -         |       |
| P7.S1.C2 | Button      | "Refresh" (RefreshCw icon)           | Calls refetch()           | `GET /api/ad-templates` | -         |       |
| P7.S1.C3 | Button      | "New Template" (Plus icon)           | Opens form in create mode | None                    | -         |       |

### S2: Templates Table (hidden when form is shown)

| ID       | Type                  | Label/Text         | Action                      | API Endpoint                   | Data Sent | Notes                                                    |
| -------- | --------------------- | ------------------ | --------------------------- | ------------------------------ | --------- | -------------------------------------------------------- |
| P7.S2.C1 | Table row (clickable) | Template row       | None (display only)         | None                           | -         | Shows preview, title, category, platforms, global status |
| P7.S2.C2 | Button (icon)         | Edit2 icon         | Opens form in edit mode     | None                           | -         | Populates form with template data                        |
| P7.S2.C3 | Button (icon)         | Trash2 icon        | Shows inline confirm/cancel | None                           | -         | First click shows confirm buttons                        |
| P7.S2.C4 | Button                | "Confirm" (delete) | Deletes template            | `DELETE /api/ad-templates/:id` | -         | Inline confirmation                                      |
| P7.S2.C5 | Button                | "Cancel" (delete)  | Cancels delete              | None                           | -         | Hides confirm buttons                                    |

### S3: Template Form (shown when creating/editing)

| ID        | Type                   | Label/Text                                          | Action                            | API Endpoint                                            | Data Sent                                                                                                                                                                                                                   | Notes                                                                                   |
| --------- | ---------------------- | --------------------------------------------------- | --------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| P7.S3.C1  | Button                 | "Cancel" (X icon)                                   | Hides form                        | None                                                    | -                                                                                                                                                                                                                           | Top-right of form header                                                                |
| P7.S3.C2  | Input                  | "Title \*"                                          | Sets title                        | None                                                    | -                                                                                                                                                                                                                           | Required                                                                                |
| P7.S3.C3  | textarea               | "Description"                                       | Sets description                  | None                                                    | -                                                                                                                                                                                                                           | Native textarea element                                                                 |
| P7.S3.C4  | select                 | "Category \*"                                       | Sets category                     | None                                                    | -                                                                                                                                                                                                                           | Native select. Options: product_showcase, installation, worksite, professional, outdoor |
| P7.S3.C5  | Input                  | "Preview Image URL"                                 | Sets previewImageUrl              | None                                                    | -                                                                                                                                                                                                                           |                                                                                         |
| P7.S3.C6  | textarea               | "Blueprint \*"                                      | Sets promptBlueprint              | None                                                    | -                                                                                                                                                                                                                           | Must contain `{{product}}`. Font-mono, validation warning shown if missing              |
| P7.S3.C7  | Button (toggleable) x5 | Platform buttons                                    | Toggles platform in platformHints | None                                                    | -                                                                                                                                                                                                                           | Options: instagram, linkedin, facebook, pinterest, tiktok                               |
| P7.S3.C8  | Button (toggleable) x4 | Aspect ratio buttons                                | Toggles ratio in aspectRatioHints | None                                                    | -                                                                                                                                                                                                                           | Options: 1:1, 4:5, 9:16, 16:9                                                           |
| P7.S3.C9  | select                 | "Lighting Style"                                    | Sets lightingStyle                | None                                                    | -                                                                                                                                                                                                                           | Options: natural, studio, dramatic, soft, golden-hour, warm                             |
| P7.S3.C10 | select                 | "Intent"                                            | Sets intent                       | None                                                    | -                                                                                                                                                                                                                           | Options: showcase, installation, before-after, scale-demo, product-focus, worksite      |
| P7.S3.C11 | select                 | "Environment"                                       | Sets environment                  | None                                                    | -                                                                                                                                                                                                                           | Options: indoor, outdoor, studio, worksite                                              |
| P7.S3.C12 | select                 | "Mood"                                              | Sets mood                         | None                                                    | -                                                                                                                                                                                                                           | Options: industrial, professional, bold, minimal, urgent, technical, reliable           |
| P7.S3.C13 | select                 | "Position"                                          | Sets placementHints.position      | None                                                    | -                                                                                                                                                                                                                           | Options: center, center-left, center-right, foreground, top, bottom                     |
| P7.S3.C14 | select                 | "Scale"                                             | Sets placementHints.scale         | None                                                    | -                                                                                                                                                                                                                           | Options: small, medium, large, fill                                                     |
| P7.S3.C15 | Input                  | "Add tag..."                                        | Adds tag                          | None                                                    | -                                                                                                                                                                                                                           | Enter key or Add button                                                                 |
| P7.S3.C16 | Button                 | "Add" (tag)                                         | Adds tag to list                  | None                                                    | -                                                                                                                                                                                                                           |                                                                                         |
| P7.S3.C17 | Button (x)             | Remove tag                                          | Removes tag                       | None                                                    | -                                                                                                                                                                                                                           |                                                                                         |
| P7.S3.C18 | Input                  | "Add product type..."                               | Adds product type                 | None                                                    | -                                                                                                                                                                                                                           | Enter key or Add button                                                                 |
| P7.S3.C19 | Button                 | "Add" (product type)                                | Adds product type to list         | None                                                    | -                                                                                                                                                                                                                           |                                                                                         |
| P7.S3.C20 | Button (x)             | Remove product type                                 | Removes product type              | None                                                    | -                                                                                                                                                                                                                           |                                                                                         |
| P7.S3.C21 | Checkbox               | "Make Global"                                       | Toggles isGlobal                  | None                                                    | -                                                                                                                                                                                                                           | "Available to all users"                                                                |
| P7.S3.C22 | Button (submit)        | "Create Template" / "Update Template" / "Saving..." | Creates or updates template       | `POST /api/ad-templates` or `PUT /api/ad-templates/:id` | JSON: `{ title, description, category, promptBlueprint, tags, platformHints, aspectRatioHints, placementHints, lightingStyle, intent, environment, mood, bestForProductTypes, isGlobal, previewImageUrl, previewPublicId }` |                                                                                         |
| P7.S3.C23 | Button                 | "Cancel" (form footer)                              | Hides form                        | None                                                    | -                                                                                                                                                                                                                           |                                                                                         |

---

## P8: LearnFromWinners (route: /learn-from-winners) -- "Patterns" tab in Library

File: `client/src/pages/LearnFromWinners.tsx`

**Purpose:** Upload winning ad images for AI pattern extraction. Browse, filter, view, and apply extracted patterns. API: `GET /api/learned-patterns`, `POST /api/learned-patterns/upload`, `DELETE /api/learned-patterns/:id`.

### S1: Page Header

| ID       | Type   | Label/Text                                          | Action | API Endpoint | Data Sent | Notes    |
| -------- | ------ | --------------------------------------------------- | ------ | ------------ | --------- | -------- |
| P8.S1.C1 | Static | "Learn from Winners" (h1, Brain icon)               | None   | None         | -         | Title    |
| P8.S1.C2 | Static | "Extract success patterns from high-performing ads" | None   | None         | -         | Subtitle |

### S2: AdaptiveUploadZone

Component: `client/src/components/AdaptiveUploadZone.tsx`

Has two modes: Empty (full onboarding) and Compact (existing patterns).

#### Empty state:

| ID       | Type   | Label/Text                           | Action            | API Endpoint | Data Sent | Notes              |
| -------- | ------ | ------------------------------------ | ----------------- | ------------ | --------- | ------------------ |
| P8.S2.C1 | Button | "Upload Your First Ad" (Upload icon) | Opens file picker | None         | -         | CTA in empty state |

#### Compact state:

| ID       | Type                 | Label/Text                                  | Action                            | API Endpoint | Data Sent | Notes                                                  |
| -------- | -------------------- | ------------------------------------------- | --------------------------------- | ------------ | --------- | ------------------------------------------------------ |
| P8.S2.C2 | Dropzone (clickable) | "Upload a winning ad" / "Drop your ad here" | Opens file picker or accepts drop | None         | -         | Drag & drop zone, accepts JPG, PNG, WebP, GIF, max 5MB |
| P8.S2.C3 | Button               | "Try Again"                                 | Re-opens file picker              | None         | -         | Error state overlay                                    |

#### MetadataFormDialog (after file selected):

| ID        | Type   | Label/Text                         | Action                       | API Endpoint                        | Data Sent                                                             | Notes                                                                                         |
| --------- | ------ | ---------------------------------- | ---------------------------- | ----------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| P8.S2.C4  | Input  | "Pattern Name \*"                  | Sets metadata.name           | None                                | -                                                                     | Max 100 chars, auto-filled from filename                                                      |
| P8.S2.C5  | Select | "Category \*"                      | Sets metadata.category       | None                                | -                                                                     | Options: Product Showcase, Testimonial, Comparison, Educational, Promotional, Brand Awareness |
| P8.S2.C6  | Select | "Platform \*"                      | Sets metadata.platform       | None                                | -                                                                     | Options: LinkedIn, Facebook, Instagram, Twitter/X, TikTok, YouTube, Pinterest, General        |
| P8.S2.C7  | Input  | "Industry"                         | Sets metadata.industry       | None                                | -                                                                     | Optional, max 100 chars                                                                       |
| P8.S2.C8  | Select | "Performance Tier"                 | Sets metadata.engagementTier | None                                | -                                                                     | Options: Top 1%, Top 5%, Top 10%, Top 25%, Unverified. Has tooltip info                       |
| P8.S2.C9  | Button | "Cancel"                           | Cancels upload, resets form  | None                                | -                                                                     |                                                                                               |
| P8.S2.C10 | Button | "Extract Patterns" (Sparkles icon) | Triggers upload + extraction | `POST /api/learned-patterns/upload` | FormData: image, name, category, platform, industry?, engagementTier? | Disabled if no name. Starts polling via useUploadStatus                                       |

### S3: Filters & Search (only shown when patterns exist)

| ID       | Type   | Label/Text           | Action                                                | API Endpoint                             | Data Sent | Notes                                          |
| -------- | ------ | -------------------- | ----------------------------------------------------- | ---------------------------------------- | --------- | ---------------------------------------------- |
| P8.S3.C1 | Input  | "Search patterns..." | Client-side filter by name/category/platform/industry | None                                     | -         | Search icon prefix                             |
| P8.S3.C2 | Select | Category filter      | Sets categoryFilter, refetches                        | `GET /api/learned-patterns?category=...` | -         | Options: All Categories + 6 pattern categories |
| P8.S3.C3 | Select | Platform filter      | Sets platformFilter, refetches                        | `GET /api/learned-patterns?platform=...` | -         | Options: All Platforms + 8 platforms           |
| P8.S3.C4 | Button | Grid3X3 icon         | Sets viewMode to "grid"                               | None                                     | -         |                                                |
| P8.S3.C5 | Button | List icon            | Sets viewMode to "list"                               | None                                     | -         |                                                |

### S4: Pattern Grid/List

| ID       | Type           | Label/Text              | Action                                | API Endpoint                       | Data Sent | Notes                     |
| -------- | -------------- | ----------------------- | ------------------------------------- | ---------------------------------- | --------- | ------------------------- |
| P8.S4.C1 | Button (hover) | "Apply" (Sparkles icon) | Navigates to `/?patternId=:id`        | None                               | -         | Applies pattern in Studio |
| P8.S4.C2 | Button (hover) | Eye icon                | Opens Pattern Detail Dialog           | None                               | -         |                           |
| P8.S4.C3 | Button (hover) | Trash2 icon             | Calls `window.confirm()` then deletes | `DELETE /api/learned-patterns/:id` | -         |                           |

### S5: Error State

| ID       | Type   | Label/Text               | Action                          | API Endpoint                | Data Sent | Notes |
| -------- | ------ | ------------------------ | ------------------------------- | --------------------------- | --------- | ----- |
| P8.S5.C1 | Button | "Retry" (RefreshCw icon) | Invalidates query and refetches | `GET /api/learned-patterns` | -         |       |

### S6: Pattern Detail Dialog

| ID       | Type   | Label/Text                      | Action                                        | API Endpoint | Data Sent | Notes |
| -------- | ------ | ------------------------------- | --------------------------------------------- | ------------ | --------- | ----- |
| P8.S6.C1 | Button | "Close"                         | Closes dialog                                 | None         | -         |       |
| P8.S6.C2 | Button | "Apply Pattern" (Sparkles icon) | Navigates to `/?patternId=:id`, closes dialog | None         | -         |       |

---

## API Endpoint Summary

| Endpoint                              | Method | Used By                        | Purpose                                         |
| ------------------------------------- | ------ | ------------------------------ | ----------------------------------------------- |
| `/api/products`                       | GET    | P2, P3, P4                     | Fetch all products                              |
| `/api/products`                       | POST   | P2 (AddProductModal)           | Create product (FormData)                       |
| `/api/products/:id`                   | DELETE | P2                             | Delete product                                  |
| `/api/products/:id/enrichment`        | GET    | P2 (EnrichmentForm)            | Get enrichment status                           |
| `/api/products/:id/enrich`            | POST   | P2 (EnrichmentForm)            | AI-generate enrichment draft                    |
| `/api/products/:id/enrich-from-url`   | POST   | P2 (EnrichmentForm)            | Enrich from product page URL                    |
| `/api/products/:id/enrichment/verify` | POST   | P2 (EnrichmentForm)            | Save/verify enrichment                          |
| `/api/products/:id/relationships`     | GET    | P2 (Relationships)             | Fetch product relationships                     |
| `/api/product-relationships`          | POST   | P2 (Relationships)             | Create relationship                             |
| `/api/product-relationships/:id`      | DELETE | P2 (Relationships)             | Delete relationship                             |
| `/api/brand-images`                   | GET    | P3                             | Fetch all brand images                          |
| `/api/brand-images`                   | POST   | P3 (UploadModal)               | Upload brand image (FormData)                   |
| `/api/brand-images/:id`               | DELETE | P3                             | Delete brand image                              |
| `/api/installation-scenarios`         | GET    | P4                             | Fetch all scenarios                             |
| `/api/installation-scenarios`         | POST   | P4                             | Create scenario                                 |
| `/api/installation-scenarios/:id`     | PUT    | P4                             | Update scenario                                 |
| `/api/installation-scenarios/:id`     | DELETE | P4                             | Delete scenario                                 |
| `/api/templates`                      | GET    | P5 (TemplateLibrary component) | Fetch AdSceneTemplates                          |
| `/api/ad-templates`                   | GET    | P7                             | Fetch AdSceneTemplates (admin)                  |
| `/api/ad-templates`                   | POST   | P7                             | Create AdSceneTemplate                          |
| `/api/ad-templates/:id`               | PUT    | P7                             | Update AdSceneTemplate                          |
| `/api/ad-templates/:id`               | DELETE | P7                             | Delete AdSceneTemplate                          |
| `/api/performing-ad-templates`        | GET    | P6                             | Fetch PerformingAdTemplates                     |
| `/api/performing-ad-templates`        | POST   | P6 (AddTemplateModal)          | Create PerformingAdTemplate (FormData)          |
| `/api/performing-ad-templates/:id`    | DELETE | P6                             | Delete PerformingAdTemplate                     |
| `/api/learned-patterns`               | GET    | P8                             | Fetch patterns (with category/platform filters) |
| `/api/learned-patterns/upload`        | POST   | P8 (AdaptiveUploadZone)        | Upload ad for pattern extraction (FormData)     |
| `/api/learned-patterns/:id`           | DELETE | P8                             | Delete pattern                                  |

---

## Cross-Page Navigation Summary

| From                  | To           | Trigger                          | Mechanism                                               |
| --------------------- | ------------ | -------------------------------- | ------------------------------------------------------- |
| P2 (ProductLibrary)   | `/` (Studio) | "Use in Studio" button           | Link navigation                                         |
| P5 (Templates)        | `/` (Studio) | "Use Template" button            | `setLocation(/?templateId=...&mode=...)` + localStorage |
| P5 (Templates)        | `/` (Studio) | "Back to Studio" link            | Link navigation                                         |
| P6 (TemplateLibrary)  | `/` (Studio) | "Use This Template" button       | sessionStorage + `setLocation(/?template=:id)`          |
| P7 (TemplateAdmin)    | `/templates` | "Back to Templates" link         | Link navigation                                         |
| P8 (LearnFromWinners) | `/` (Studio) | "Apply" / "Apply Pattern" button | `window.location.href = /?patternId=:id`                |

---

## Template Type Clarification

There are TWO distinct template systems in the app:

1. **AdSceneTemplate** (Scene templates):
   - Pages: P5 (Templates), P7 (TemplateAdmin)
   - API: `/api/templates` (read), `/api/ad-templates` (CRUD)
   - Has: promptBlueprint with `{{product}}` placeholder, placementHints, lightingStyle, intent, environment, mood
   - Used for: AI image generation with exact insert or inspiration mode

2. **PerformingAdTemplate** (High-performing ad templates):
   - Pages: P6 (TemplateLibrary)
   - API: `/api/performing-ad-templates`
   - Has: engagementTier, estimatedEngagementRate, runningDays, estimatedBudget, sourceUrl, targetPlatforms, bestForObjectives
   - Used for: Inspiration and performance benchmarking, applied to Studio via sessionStorage

---

## Duplicate/Overlap Analysis

- **P5 (Templates) and P7 (TemplateAdmin)** share the same data model (AdSceneTemplate) but use different API paths (`/api/templates` vs `/api/ad-templates`). P5 is the user-facing browser; P7 is the admin CRUD.
- **P5 and P6** are different template systems entirely (AdSceneTemplate vs PerformingAdTemplate). They appear as separate tabs in the Library ("Scenes" vs "Templates").
- **P1 (Library)** is purely a tab container; all functionality lives in the embedded sub-pages.
