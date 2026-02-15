# UX Master Map: Complete Page Index

> Generated 2026-02-15 | Consolidated from 4 mapping documents
> Total: 20 pages/views, 400+ interactive elements, 70+ unique API endpoints

---

## Page Index

| #      | Page                          | Route                                    | File                                           | Component Count         | Description                                                    |
| ------ | ----------------------------- | ---------------------------------------- | ---------------------------------------------- | ----------------------- | -------------------------------------------------------------- |
| P1     | Studio                        | `/`                                      | `pages/Studio.tsx`                             | ~125+                   | Main creation workspace (v1), uses `useStudioOrchestrator`     |
| P2     | StudioOptimized               | `/studio-v2`                             | `pages/StudioOptimized.tsx`                    | ~117+                   | Performance-optimized Studio (v2), own state management        |
| P3     | Gallery                       | `/gallery`                               | `pages/GalleryPage.tsx`                        | ~8 + N cards            | Image gallery grid with search/sort                            |
| P4     | Pipeline                      | `/pipeline`                              | `pages/Pipeline.tsx`                           | ~5 tabs (container)     | Tabbed workflow container                                      |
| P4-T1  | Pipeline > Dashboard          | `/pipeline?tab=dashboard`                | `components/planner/WeeklyPlanView.tsx`        | ~15+                    | Weekly plan cards with status actions                          |
| P4-T2  | Pipeline > Content Planner    | `/pipeline?tab=planner`                  | `pages/ContentPlanner.tsx`                     | ~25+                    | Content categories, balance, templates, mark-as-posted         |
| P4-T3  | Pipeline > Calendar           | `/pipeline?tab=calendar`                 | `components/calendar/CalendarView.tsx`         | ~20+                    | Monthly grid calendar with scheduling                          |
| P4-T4  | Pipeline > Approval Queue     | `/pipeline?tab=approval`                 | `pages/ApprovalQueue.tsx`                      | ~25+                    | Review/approve/reject content items                            |
| P4-T5  | Pipeline > Social Accounts    | `/pipeline?tab=accounts`                 | `pages/SocialAccounts.tsx`                     | ~8+                     | Connected social account management                            |
| P5     | Library                       | `/library`                               | `pages/Library.tsx`                            | ~6 tabs (container)     | Tabbed hub for 6 sub-libraries                                 |
| P6     | Product Library               | `/products`                              | `pages/ProductLibrary.tsx`                     | ~35+                    | Product CRUD with enrichment + relationships                   |
| P7     | Brand Image Library           | `/brand-images`                          | `pages/BrandImageLibrary.tsx`                  | ~20+                    | Brand image upload/filter/delete                               |
| P8     | Installation Scenarios        | `/installation-scenarios`                | `pages/InstallationScenarios.tsx`              | ~25+                    | Scenario CRUD (room types, steps, accessories)                 |
| P9     | Templates (Scenes)            | `/templates`                             | `pages/Templates.tsx`                          | ~15+                    | AdSceneTemplate browser + mode selector                        |
| P10    | Template Library              | `/template-library`                      | `pages/TemplateLibrary.tsx`                    | ~30+                    | PerformingAdTemplate CRUD with filters                         |
| P11    | Template Admin                | `/admin/templates`                       | `pages/TemplateAdmin.tsx`                      | ~30+                    | Admin CRUD for AdSceneTemplates (table + form)                 |
| P12    | Learn From Winners            | `/learn-from-winners`                    | `pages/LearnFromWinners.tsx`                   | ~20+                    | Upload ads for AI pattern extraction                           |
| P13    | Settings                      | `/settings`                              | `pages/Settings.tsx`                           | ~5 sections (container) | Settings hub with sidebar navigation                           |
| P13-S1 | Settings > Brand Profile      | `/settings?section=brand`                | `pages/BrandProfile.tsx` (embedded)            | ~25+                    | Brand identity, voice, audience editor                         |
| P13-S2 | Settings > Knowledge Base     | `/settings?section=knowledge-base`       | `components/settings/KnowledgeBaseSection.tsx` | ~7                      | Stat cards + quick links to Library tabs                       |
| P13-S3 | Settings > API Keys           | `/settings?section=api-keys`             | `pages/ApiKeySettings.tsx` (embedded)          | ~20+                    | API key management for 4 services + n8n                        |
| P13-S4 | Settings > Strategy           | `/settings?section=strategy`             | `components/settings/StrategySection.tsx`      | ~25+                    | Posting frequency, category mix, platforms, product priorities |
| P13-S5 | Settings > Usage & Quotas     | `/settings?section=usage`                | `pages/QuotaDashboard.tsx` (embedded)          | ~10+                    | 4-tab monitoring dashboard                                     |
| P14    | Brand Profile (standalone)    | `/brand-profile`                         | `pages/BrandProfile.tsx`                       | ~25+                    | Same as P13-S1 but standalone with nav links                   |
| P15    | API Key Settings (standalone) | `/settings/api-keys`                     | `pages/ApiKeySettings.tsx`                     | ~20+                    | Same as P13-S3 but standalone with back link                   |
| P16    | Quota Dashboard (standalone)  | `/usage`                                 | `pages/QuotaDashboard.tsx`                     | ~10+                    | Same as P13-S5 but standalone                                  |
| P17    | Login                         | `/login`                                 | `pages/Login.tsx`                              | ~5                      | Email/password + Google OAuth                                  |
| P18    | System Map                    | `/system-map`                            | `pages/SystemMap.tsx`                          | ~3 (canvas controls)    | ReactFlow architecture visualization                           |
| P19    | 404 Not Found                 | `*` (unmatched)                          | `pages/not-found.tsx`                          | 0                       | Static error page                                              |
| P20    | Global Header                 | (all pages except Login, SystemMap, 404) | `components/layout/Header.tsx`                 | ~15                     | Sticky nav bar with logo, 5 nav links, theme, logout           |

---

## Detailed Section Breakdown

### P1: Studio (`/`)

| Section                          | ID Range         | Component Count     | Key Components                                                                                                                               |
| -------------------------------- | ---------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: Header (shared)              | P1.S1.C1-C10     | 10                  | Logo, 5 nav links, theme, logout, mobile sheet                                                                                               |
| S2: Agent Chat Panel             | P1.S2.C1-C6      | 6 + 7 agent actions | Chat input, send, stop, clear, voice, agent UI dispatch                                                                                      |
| S3: Hero Section                 | P1.S3.C1         | 1                   | History toggle button                                                                                                                        |
| S4: ComposerView                 | P1.S4.1-S4.11    | ~30+                | Quick start, path selection, upload, products, templates, prompt, output settings, style refs, generate                                      |
| S5: GeneratingView               | P1.S5.C1         | 1                   | Cancel generation button                                                                                                                     |
| S6: ResultViewEnhanced           | P1.S6.1-S6.9     | ~25+                | Plan context, result header, image zoom, 6 action buttons, history timeline, edit/copy/preview/canvas sections                               |
| S7: InspectorPanel               | P1.S7.0-S7.4     | ~15+                | 4 tabs: Edit (presets + apply), Copy (generate + advanced), Ask AI (quick questions + input), Details (prompt copy, download, save, preview) |
| S8: HistoryPanel                 | P1.S8.C1-C6      | 6                   | Collapse toggle, Recent/Favorites/All tabs, generation thumbnails                                                                            |
| S9: IdeaBankBar                  | P1.S9.C1-C5      | 5                   | Refresh, scroll arrows, suggestion chips, get suggestions                                                                                    |
| S10: SaveToCatalogDialog         | P1.S10.C1-C11    | 11                  | Name, category (select/new), tags, save                                                                                                      |
| S11: Template Inspiration Dialog | P1.S11.C1-C2     | 2                   | Template cards, browse library link                                                                                                          |
| S12: Keyboard Shortcuts Panel    | P1.S12.C1-C2     | 2 + 4 shortcuts     | Panel toggle, Ctrl+G/D/R, /, Shift+?                                                                                                         |
| S13: Context Bar                 | - (display only) | 0 interactive       | Product/template/platform summary                                                                                                            |
| S14: Mobile Inspector            | -                | Same as S7          | Shown on mobile when image exists                                                                                                            |

### P2: StudioOptimized (`/studio-v2`)

| Section                      | Key Differences from P1                                            |
| ---------------------------- | ------------------------------------------------------------------ |
| No AgentChatPanel            | Agent chat not included                                            |
| No IdeaBankBar               | Bottom suggestion bar not included                                 |
| S2: Progress Rail            | Vertical dot navigation (unique to v2) with 6 section dots         |
| S12: LinkedIn Preview        | Always visible in right column (not behind tabs)                   |
| S13: Mobile LinkedIn Preview | Collapsible bottom sheet with status badges                        |
| State management             | Inline useState (not useStudioOrchestrator)                        |
| Components                   | Memoized: StudioHeader, StudioSidebar, StudioCanvas, StudioToolbar |

### P3: Gallery (`/gallery`)

| Section             | ID Range    | Component Count                                  |
| ------------------- | ----------- | ------------------------------------------------ |
| S1: Header          | (shared)    | 10                                               |
| S2: Top Bar         | P3.S2.C1    | 1 (back button)                                  |
| S3: Bulk Actions    | P3.S3.C1-C2 | 2 (clear + delete - NOTE: delete has no handler) |
| S4: Filters         | P3.S4.C1-C2 | 2 (search + sort)                                |
| S5: Generation Grid | P3.S5.C1-C2 | 2 per card (navigate + select)                   |
| S6: Empty State     | P3.S6.C1    | 1 (go to studio)                                 |

### P4: Pipeline (`/pipeline`)

**Container tabs:** Dashboard, Content Planner, Calendar, Approval Queue, Social Accounts (P4.S2.C1-C5)

#### P4-T1: Dashboard (WeeklyPlanView)

- S1: Week nav (prev/next/regenerate) - 3 buttons
- S2: Error state - 1 button
- S3: Post cards - 5 status-based action buttons per card
- S4: Strategy balance - display only

#### P4-T2: Content Planner

- S1: Weekly balance - display only
- S2: Suggested post - 2 buttons (view guide, mark as posted)
- S3: Recent posts - 1 delete button per post
- S4: Categories accordion - collapsible headers + template cards + mark complete
- S5: Template detail dialog - copy hooks, mark posted, create in studio
- S6: Mark as posted dialog - subtype select, platform select, notes, submit
- S7: Start fresh warning dialog - cancel, start fresh

#### P4-T3: Calendar

- S1: Header - schedule post button
- S2: Month nav - prev/today/next (3 buttons)
- S3: Day grid - clickable day cells
- S4: Empty state - schedule button
- S5: DayPostsSheet - show more/less, view on platform, retry, cancel
- S6: SchedulePostDialog - date, time, account select, caption, hashtags, image, submit

#### P4-T4: Approval Queue

- S1: Header - refresh button
- S2: Quick stats - display only (4 cards)
- S3: Filters - 3 selects (status, priority, platform)
- S4: Bulk actions - deselect, select all, bulk approve, bulk reject (4 buttons)
- S5: Queue cards - checkbox, quick approve, review, delete per card
- S6: Review modal - notes textarea, reject, needs revision, approve

#### P4-T5: Social Accounts

- S1: Header - refresh button
- S2: Account cards - disconnect with confirmation per card
- S3: n8n setup - sync button (NOT IMPLEMENTED), docs link

### P5: Library (`/library`)

**Container tabs:** Products, Brand Images, Templates (PerformingAd), Scenes (AdScene), Scenarios, Patterns (P5.S2.C1-C6)

### P6: Product Library (`/products`)

| Section                     | Component Count                                                                           |
| --------------------------- | ----------------------------------------------------------------------------------------- |
| S1: Header                  | 2 (title, add button)                                                                     |
| S2: Search                  | 2 (input, clear)                                                                          |
| S3: Product grid            | 3 per card (click, delete, badge)                                                         |
| S4: Empty/error states      | 3 buttons                                                                                 |
| S5: Detail modal            | 5 (3 tabs + use in studio + close)                                                        |
| S6: Add product modal       | 7 (dropzone, preview clear, name, category, description, cancel, submit)                  |
| S7: Delete confirmation     | 2                                                                                         |
| S8: Enrichment form         | 16 (generate draft, URL fetch, description, features, benefits, tags, SKU, approve, save) |
| S9: Relationships           | 2 (add, delete)                                                                           |
| S10: Add relationship modal | 6 (type select, product select, description, checkbox, cancel, submit)                    |

### P7: Brand Image Library (`/brand-images`)

| Section                 | Component Count                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------- |
| S1: Header              | 2                                                                                             |
| S2: Category filter     | 2                                                                                             |
| S3: Image grid          | 3 per card                                                                                    |
| S4: Empty states        | 2                                                                                             |
| S5: Upload modal        | 12 (zone, preview, category, description, tags, uses, aspect ratio, products, cancel, submit) |
| S6: Detail modal        | 2                                                                                             |
| S7: Delete confirmation | 2                                                                                             |

### P8: Installation Scenarios (`/installation-scenarios`)

| Section                 | Component Count                                                                                          |
| ----------------------- | -------------------------------------------------------------------------------------------------------- |
| S1: Header              | 2                                                                                                        |
| S2: Grid                | 3 per card                                                                                               |
| S3: Empty state         | 1                                                                                                        |
| S4: Form modal          | 14 (title, description, type, product, room types x9, style tags x8, steps, accessories, cancel, submit) |
| S5: Delete confirmation | 2                                                                                                        |

### P9: Templates/Scenes (`/templates`)

| Section                       | Component Count                                                             |
| ----------------------------- | --------------------------------------------------------------------------- |
| S1: Navigation                | 1 (back to studio)                                                          |
| S2: Template preview          | 4 (clear, exact insert, inspiration, use template)                          |
| S3: TemplateLibrary component | 7 (refresh, search, 6 category filters, global toggle, cards, clear, retry) |

### P10: Template Library (`/template-library`)

| Section                | Component Count                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: Header             | 2                                                                                                                                                                                           |
| S2: Filters            | 3 (search, category, platform)                                                                                                                                                              |
| S3: Grid               | 3 per card                                                                                                                                                                                  |
| S4: Empty state        | 1                                                                                                                                                                                           |
| S5: Detail modal       | 3 (view original, use template, close)                                                                                                                                                      |
| S6: Add template modal | 23 (image, name, description, category, tier, rate, days, URL, platform, advertiser, mood, style, background, platforms x5, ratios x5, objectives x4, industries, featured, submit, cancel) |

### P11: Template Admin (`/admin/templates`)

| Section        | Component Count                                                                                                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S1: Action bar | 3 (back, refresh, new)                                                                                                                                                                |
| S2: Table      | 5 per row (row, edit, trash, confirm, cancel)                                                                                                                                         |
| S3: Form       | 23 (title, description, category, preview URL, blueprint, platforms x5, ratios x4, lighting, intent, environment, mood, position, scale, tags, product types, global, submit, cancel) |

### P12: Learn From Winners (`/learn-from-winners`)

| Section           | Component Count                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------- |
| S1: Header        | 2 (title, subtitle)                                                                                       |
| S2: Upload zone   | 10 (empty CTA, dropzone, retry, metadata form: name, category, platform, industry, tier, cancel, extract) |
| S3: Filters       | 5 (search, category, platform, grid view, list view)                                                      |
| S4: Pattern grid  | 3 per card (apply, view, delete)                                                                          |
| S5: Error state   | 1                                                                                                         |
| S6: Detail dialog | 2 (close, apply pattern)                                                                                  |

### P13: Settings (`/settings`)

**Sidebar sections:** Brand Profile, Knowledge Base, API Keys, Strategy, Usage & Quotas

#### P13-S1: Brand Profile

- BrandProfileDisplay: 2 buttons (edit/create)
- BrandProfileForm (Sheet): 6 accordion sections, ~20 fields, 2 action buttons

#### P13-S2: Knowledge Base

- 4 stat link cards + 3 quick-action links = 7 interactive elements

#### P13-S3: API Keys

- 4 service cards, each with: add/edit, validate, delete, toggle preview, docs link, get key link
- Delete confirmation dialog per service
- ApiKeyForm dialog: dynamic fields per service + save/cancel
- n8n config: URL input, API key input, save button

#### P13-S4: Strategy

- 3 frequency buttons, 5 category sliders, 5 platform checkboxes, 7 day time selects
- Product table: tier select + weight slider per product
- Save button

#### P13-S5: Usage & Quotas (QuotaDashboard)

- 4 tabs: API Quota, System Health, Performance, Errors
- API Quota: status cards (display), usage chart (2 selects), breakdown (1 select), Google sync (toggle history, sync now)
- System Health: display only
- Performance: display only
- Errors: expand/collapse stack traces

### P14-P16: Standalone Variants

These are standalone-route versions of settings sub-pages. They render the same components as their embedded counterparts (P13-S1, P13-S3, P13-S5) but add their own Header and back-navigation link.

### P17: Login (`/login`)

- Email input, password input (with visibility toggle), sign in button, Google OAuth link = 5 elements

### P18: System Map (`/system-map`)

- ReactFlow canvas with zoom/pan, Controls widget, MiniMap = 3 interactive widgets

### P19: 404 Not Found

- No interactive elements

### P20: Global Header

- Desktop: logo + 5 nav links + theme toggle (3 options) + user email + logout = ~12 elements
- Mobile: hamburger + sheet with 5 nav links = ~6 elements

---

## Complete API Endpoint Registry

### Authentication

| Endpoint           | Method | Pages        |
| ------------------ | ------ | ------------ |
| `/api/auth/me`     | GET    | P1, P2       |
| `/api/auth/logout` | POST   | P20 (Header) |
| `/api/auth/google` | GET    | P17          |

### Products

| Endpoint                              | Method | Pages                              |
| ------------------------------------- | ------ | ---------------------------------- |
| `/api/products`                       | GET    | P1, P2, P6, P7, P8, P13-S2, P13-S4 |
| `/api/products`                       | POST   | P1 (SaveToCatalog), P6             |
| `/api/products/:id`                   | DELETE | P6                                 |
| `/api/products/:id/enrichment`        | GET    | P6                                 |
| `/api/products/:id/enrich`            | POST   | P6                                 |
| `/api/products/:id/enrich-from-url`   | POST   | P6                                 |
| `/api/products/:id/enrichment/verify` | POST   | P6                                 |

### Product Relationships

| Endpoint                          | Method | Pages |
| --------------------------------- | ------ | ----- |
| `/api/products/:id/relationships` | GET    | P6    |
| `/api/product-relationships`      | POST   | P6    |
| `/api/product-relationships/:id`  | DELETE | P6    |

### Generation

| Endpoint                       | Method | Pages                     |
| ------------------------------ | ------ | ------------------------- |
| `/api/transform`               | POST   | P1, P2                    |
| `/api/generations`             | GET    | P1 (HistoryPanel), P3     |
| `/api/generations/:id`         | GET    | P1, P2, P1 (HistoryPanel) |
| `/api/generations/:id/edit`    | POST   | P1 (EditTab, ResultView)  |
| `/api/generations/:id/analyze` | POST   | P1 (AskAITab, ResultView) |
| `/api/generations/video`       | POST   | P1                        |
| `/api/jobs/:jobId`             | GET    | P1 (video polling)        |

### Copywriting

| Endpoint             | Method | Pages                                                     |
| -------------------- | ------ | --------------------------------------------------------- |
| `/api/copy/generate` | POST   | P1 (CopyTab, ResultView, DetailsTab, LinkedInPreview), P2 |

### Idea Bank

| Endpoint                 | Method | Pages                           |
| ------------------------ | ------ | ------------------------------- |
| `/api/idea-bank/suggest` | POST   | P1 (IdeaBankPanel, IdeaBankBar) |

### Templates (AdSceneTemplate)

| Endpoint                | Method | Pages              |
| ----------------------- | ------ | ------------------ |
| `/api/templates`        | GET    | P1, P2, P9, P13-S2 |
| `/api/ad-templates`     | GET    | P11                |
| `/api/ad-templates`     | POST   | P11                |
| `/api/ad-templates/:id` | PUT    | P11                |
| `/api/ad-templates/:id` | DELETE | P11                |

### Templates (PerformingAdTemplate)

| Endpoint                                | Method | Pages                         |
| --------------------------------------- | ------ | ----------------------------- |
| `/api/performing-ad-templates`          | GET    | P10                           |
| `/api/performing-ad-templates`          | POST   | P10                           |
| `/api/performing-ad-templates/:id`      | DELETE | P10                           |
| `/api/performing-ad-templates/featured` | GET    | P1, P2 (Template Inspiration) |

### Brand Images

| Endpoint                | Method | Pages      |
| ----------------------- | ------ | ---------- |
| `/api/brand-images`     | GET    | P7, P13-S2 |
| `/api/brand-images`     | POST   | P7         |
| `/api/brand-images/:id` | DELETE | P7         |

### Installation Scenarios

| Endpoint                          | Method | Pages      |
| --------------------------------- | ------ | ---------- |
| `/api/installation-scenarios`     | GET    | P8, P13-S2 |
| `/api/installation-scenarios`     | POST   | P8         |
| `/api/installation-scenarios/:id` | PUT    | P8         |
| `/api/installation-scenarios/:id` | DELETE | P8         |

### Learned Patterns

| Endpoint                       | Method | Pages |
| ------------------------------ | ------ | ----- |
| `/api/learned-patterns`        | GET    | P12   |
| `/api/learned-patterns/upload` | POST   | P12   |
| `/api/learned-patterns/:id`    | DELETE | P12   |

### Content Planner

| Endpoint                          | Method | Pages |
| --------------------------------- | ------ | ----- |
| `/api/content-planner/templates`  | GET    | P4-T2 |
| `/api/content-planner/balance`    | GET    | P4-T2 |
| `/api/content-planner/suggestion` | GET    | P4-T2 |
| `/api/content-planner/posts`      | GET    | P4-T2 |
| `/api/content-planner/posts`      | POST   | P4-T2 |
| `/api/content-planner/posts/:id`  | DELETE | P4-T2 |

### Weekly Planner

| Endpoint                                       | Method      | Pages                 |
| ---------------------------------------------- | ----------- | --------------------- |
| `useWeeklyPlan(weekStart)`                     | GET (hook)  | P4-T1                 |
| `useRegeneratePlan()`                          | POST (hook) | P4-T1                 |
| `/api/planner/weekly/current`                  | GET         | P1 (plan deep-link)   |
| `/api/planner/weekly/:planId/posts/:postIndex` | PATCH       | P1 (after generation) |

### Calendar & Scheduling

| Endpoint                         | Method              | Pages |
| -------------------------------- | ------------------- | ----- |
| `useCalendarPosts(start, end)`   | GET (hook)          | P4-T3 |
| `useCalendarCounts(year, month)` | GET (hook)          | P4-T3 |
| `useCancelPost()`                | PATCH/DELETE (hook) | P4-T3 |
| `useSchedulePost()`              | POST (hook)         | P4-T3 |

### Approval Queue

| Endpoint                           | Method | Pages |
| ---------------------------------- | ------ | ----- |
| `/api/approval-queue`              | GET    | P4-T4 |
| `/api/approval-queue/:id/approve`  | POST   | P4-T4 |
| `/api/approval-queue/:id/reject`   | POST   | P4-T4 |
| `/api/approval-queue/:id`          | PATCH  | P4-T4 |
| `/api/approval-queue/:id`          | DELETE | P4-T4 |
| `/api/approval-queue/bulk-approve` | POST   | P4-T4 |

### Social Accounts

| Endpoint                   | Method | Pages                             |
| -------------------------- | ------ | --------------------------------- |
| `/api/social/accounts`     | GET    | P4-T5, P4-T3 (SchedulePostDialog) |
| `/api/social/accounts/:id` | DELETE | P4-T5                             |

### Brand Profile

| Endpoint             | Method | Pages       |
| -------------------- | ------ | ----------- |
| `/api/brand-profile` | GET    | P13-S1, P14 |
| `/api/brand-profile` | PUT    | P13-S1, P14 |

### Settings & Config

| Endpoint                                   | Method | Pages       |
| ------------------------------------------ | ------ | ----------- |
| `/api/settings/api-keys`                   | GET    | P13-S3, P15 |
| `/api/settings/api-keys/:service`          | POST   | P13-S3, P15 |
| `/api/settings/api-keys/:service/validate` | POST   | P13-S3, P15 |
| `/api/settings/api-keys/:service`          | DELETE | P13-S3, P15 |
| `/api/settings/n8n`                        | GET    | P13-S3, P15 |
| `/api/settings/n8n`                        | POST   | P13-S3, P15 |

### Monitoring & Quotas

| Endpoint                      | Method | Pages       |
| ----------------------------- | ------ | ----------- |
| `/api/quota/status`           | GET    | P13-S5, P16 |
| `/api/quota/history`          | GET    | P13-S5, P16 |
| `/api/quota/breakdown`        | GET    | P13-S5, P16 |
| `/api/quota/google/status`    | GET    | P13-S5, P16 |
| `/api/quota/google/history`   | GET    | P13-S5, P16 |
| `/api/quota/google/sync`      | POST   | P13-S5, P16 |
| `/api/monitoring/health`      | GET    | P13-S5, P16 |
| `/api/monitoring/performance` | GET    | P13-S5, P16 |
| `/api/monitoring/errors`      | GET    | P13-S5, P16 |

### Pricing

| Endpoint                | Method | Pages  |
| ----------------------- | ------ | ------ |
| `/api/pricing/estimate` | GET    | P1, P2 |

### Style References

| Endpoint                | Method | Pages |
| ----------------------- | ------ | ----- |
| `/api/style-references` | GET    | P1    |

### Agent Chat

| Endpoint          | Method | Pages |
| ----------------- | ------ | ----- |
| `/api/agent/chat` | POST   | P1    |

---

## Cross-Page Navigation Map

| From                      | To                | Trigger                          | Mechanism                                              |
| ------------------------- | ----------------- | -------------------------------- | ------------------------------------------------------ |
| P20 (Header)              | P1 (Studio)       | Logo / "Studio" link             | `navigate('/')`                                        |
| P20 (Header)              | P3 (Gallery)      | "Gallery" link                   | `navigate('/gallery')`                                 |
| P20 (Header)              | P4 (Pipeline)     | "Pipeline" link                  | `navigate('/pipeline')`                                |
| P20 (Header)              | P5 (Library)      | "Library" link                   | `navigate('/library')`                                 |
| P20 (Header)              | P13 (Settings)    | "Settings" link                  | `navigate('/settings')`                                |
| P1 (Studio)               | P3 (Gallery)      | View Details link                | `navigate('/generation/{id}')`                         |
| P1 (Studio)               | P4-T1 (Dashboard) | "Back to Plan" button            | `navigate('/pipeline?tab=dashboard')`                  |
| P1 (Studio)               | P9 (Templates)    | "Browse template library"        | `navigate('/templates')`                               |
| P3 (Gallery)              | P1 (Studio)       | Card click                       | `navigate('/?generation={id}')`                        |
| P3 (Gallery)              | P1 (Studio)       | "Go to Studio" (empty)           | `navigate('/')`                                        |
| P4-T1 (Dashboard)         | P1 (Studio)       | "Create Now" / "Continue" / etc. | `navigate('/?planId=...&postIndex=...&productId=...')` |
| P4-T2 (Planner)           | P1 (Studio)       | "Create in Studio"               | `navigate('/?cpTemplateId=...&fresh=true')`            |
| P4-T3 (Calendar)          | P4-T5 (Social)    | "Connect an account"             | `navigate('/pipeline?tab=social')`                     |
| P6 (Products)             | P1 (Studio)       | "Use in Studio"                  | `navigate('/')`                                        |
| P9 (Templates)            | P1 (Studio)       | "Use Template"                   | `navigate('/?templateId=...&mode=...')` + localStorage |
| P9 (Templates)            | P1 (Studio)       | "Back to Studio"                 | `navigate('/')`                                        |
| P10 (TemplateLib)         | P1 (Studio)       | "Use This Template"              | sessionStorage + `navigate('/?template=:id')`          |
| P11 (Admin)               | P9 (Templates)    | "Back to Templates"              | `navigate('/templates')`                               |
| P12 (Winners)             | P1 (Studio)       | "Apply" / "Apply Pattern"        | `window.location.href = '/?patternId=:id'`             |
| P13-S2 (KB)               | P5 (Library)      | Stat cards / quick actions       | `navigate('/library?tab=...')`                         |
| P14 (Brand standalone)    | P1 (Studio)       | "Back to Studio"                 | `navigate('/')`                                        |
| P14 (Brand standalone)    | P15 (API Keys)    | "API Keys" card                  | `navigate('/settings/api-keys')`                       |
| P15 (API Keys standalone) | P13 (Settings)    | "Back to Settings"               | `navigate('/settings')`                                |
