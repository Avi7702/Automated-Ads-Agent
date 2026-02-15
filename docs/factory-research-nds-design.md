# NDS Design System & Dashboard — Complete Research Document

**Researched:** February 2026
**Source:** `C:\Users\avibm\AI SEO & LANDING PAGES\NextDaySteelHub-clean\`
**Purpose:** Extract design system architecture, component patterns, UI/UX decisions, dashboard layout, and API design patterns for cross-pollination with the Automated Ads Agent.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Design System Architecture](#2-design-system-architecture)
3. [Component Library (55+ Components)](#3-component-library)
4. [Loveable Design Forge (React/Tailwind UI Kit)](#4-loveable-design-forge)
5. [Dashboard Frontend Architecture](#5-dashboard-frontend-architecture)
6. [API Design Patterns (Cloudflare Pages Functions)](#6-api-design-patterns)
7. [Content Factory Workflow (10-Stage Pipeline)](#7-content-factory-workflow)
8. [AI Citation / LLM Optimization System](#8-ai-citation-system)
9. [Key UI/UX Decisions](#9-key-uiux-decisions)
10. [Reusable Patterns for Automated Ads Agent](#10-reusable-patterns)

---

## 1. Project Overview

**NextDaySteel (NDS)** is a UK steel supplier whose digital presence is built as an AI SEO content factory — a system that generates, validates, deploys, and monitors landing pages optimized for both Google and LLM (ChatGPT, Perplexity, Claude) citation.

### Architecture Stack

| Layer              | Technology                                                          |
| ------------------ | ------------------------------------------------------------------- |
| Frontend Dashboard | React 18 + Tailwind CSS + shadcn/ui + TanStack Query                |
| Routing            | wouter (lightweight React router)                                   |
| API Layer          | Cloudflare Pages Functions (serverless TypeScript)                  |
| Database           | Cloudflare D1 (SQLite-compatible)                                   |
| File Storage       | Cloudflare R2 (S3-compatible)                                       |
| AI Gateway         | Cloudflare AI Gateway (rate limiting + observability for LLM calls) |
| Deployment         | Cloudflare Pages                                                    |
| Content Targets    | Shopify (main site) + Cloudflare Pages (standalone tools)           |

### Scale

- **58 live pages** on Shopify (on-site content, guides, tools, case studies)
- **14 remaining tasks** (Perplexity pages, Claude artifacts, ChatGPT GPT)
- **~120 total tasks** tracked across 4 categories (On-Site, Off-Site, AI Assets, Infrastructure)
- **10-stage content factory workflow** with machine-checkable stage gates

---

## 2. Design System Architecture

The NDS Design System is a **3-layer system** with distinct concerns:

### Layer 1: Design Tokens (`NDS-DESIGN-SYSTEM.md`)

CSS custom properties for all visual primitives:

```css
/* Brand Colors */
--nds-orange: #ff6b35;       /* Primary accent */
--nds-orange-light: #ff8c5a;
--nds-orange-dark: #e55a2b;
--nds-orange-glow: rgba(255, 107, 53, 0.3);
--nds-navy: #1a2744;         /* Secondary */
--nds-navy-light: #2a3a5c;
--nds-navy-dark: #0f1724;

/* Typography */
--font-sans: 'Inter', system-ui, sans-serif;
--font-display: 'Outfit', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;

/* Spacing Scale */
--space-1 through --space-32 (4px to 128px)

/* Shadows (including Brutalist offset shadows) */
--shadow-brutal-sm: 4px 4px 0 var(--nds-black);
--shadow-brutal-md: 6px 6px 0 var(--nds-black);
--shadow-glow: 0 0 40px var(--nds-orange-glow);
```

**Key decision:** Light/dark mode via CSS custom properties with `[data-theme="dark"]` selector.

### Layer 2: Template Styles (4 Variants)

| Style                     | Best For                                | Aesthetic                                        |
| ------------------------- | --------------------------------------- | ------------------------------------------------ |
| **Default (Navy/Orange)** | General landing, location pages         | Professional, warm                               |
| **Brutalist**             | Technical guides, specs, comparisons    | Industrial, bold, monospace headers, 4px borders |
| **Terminal**              | Calculators, tools, dev content         | Hacker green on black, monospace throughout      |
| **Dark Orange**           | Premium landing, high-value conversions | Glass effects, orange glow, animated counters    |

**Template selection is content-driven** — each page type maps to a recommended style (see Section 4 of the design system doc).

### Layer 3: Component Library (4-Tier System)

**52+ components** organized into 4 tiers by modification flexibility:

| Tier              | Rule                                         | Count   | Examples                                                      |
| ----------------- | -------------------------------------------- | ------- | ------------------------------------------------------------- |
| **1 (LOCKED)**    | Copy structure EXACTLY — only change content | 4       | Answer Capsule, FAQ Accordion, Expert Quote, Comparison Table |
| **2 (TEMPLATED)** | Adapt within design token constraints        | 4       | Hero Main, CTA Strip, Navigation, Footer Mega                 |
| **3 (FLEXIBLE)**  | Generate dynamically with design tokens      | Various | Cards, Grids, Stats, Galleries                                |
| **4 (NOVEL)**     | Create with validation guards                | New     | Any new component type                                        |

**Critical insight:** Tier 1 components have **research-backed structures** that maximize LLM citation probability. The Answer Capsule structure, for example, is based on the Princeton GEO study showing +40% citation improvement.

---

## 3. Component Library

### Inspiration Bank (`inspiration_bank/`)

**48+ standalone HTML component files** organized as self-contained examples:

**Navigation & Layout:**

- `component_nav_main.html` — Main navigation
- `component_footer_mega.html` — Multi-column footer
- `component_breadcrumb.html` — Breadcrumb trail

**Hero Sections:**

- `component_hero_main.html` — Default hero
- `component_hero_minimal.html` — Minimal hero
- `component_hero_saas.html` — SaaS-style hero

**Content Blocks:**

- `component_answer_capsule.html` — **LOCKED** — 120-150 char self-contained answer
- `component_expert_quote.html` — **LOCKED** — Attributed expert quote
- `component_faq_accordion.html` — **LOCKED** — `<details>/<summary>` FAQ
- `component_comparison_table.html` — **LOCKED** — Feature comparison

**Data Display:**

- `component_data_table_dense.html` — Dense data tables
- `component_data_terminal.html` — Terminal-style data display
- `component_specs_technical.html` — Technical specifications
- `component_specs_elegant.html` — Elegant spec display
- `component_pricing_table.html` — Pricing comparison
- `component_pricing_toggle.html` — Monthly/yearly toggle

**Interactive:**

- `component_faq_accordion.html` — CSS-only accordion
- `component_tab_panel.html` — Tab navigation
- `component_modal_dialog.html` — Dialog overlay
- `component_search_bar.html` — Search input

**Visual:**

- `component_card_product.html` — Product cards
- `component_hover_cards.html` — Hover effect cards
- `component_testimonial_cards.html` — Testimonial display
- `component_testimonial_slider.html` — Testimonial carousel
- `component_image_gallery.html` — Image grid
- `component_gallery_fullwidth.html` — Full-width gallery
- `component_video_embed.html` — Video player

**Decorative & Animation:**

- `component_scroll_reveal.html` — Scroll-triggered reveal
- `component_marquee.html` — Scrolling text
- `component_animated_counter.html` — Number counter animation
- `component_micro_interactions.html` — Micro-interaction library
- `component_loading_skeleton.html` — Loading placeholder
- `component_grid_bg.html` — Background grid pattern

**Trust & CTA:**

- `component_trust_bar.html` — Trust indicator bar
- `component_cta_premium.html` — Premium CTA section
- `component_cta_strip.html` — CTA strip
- `component_stats_counter.html` — Stats counter grid

### Harvested Components (`harvested/`)

11 additional components extracted from real-world industrial websites using the "Screenshot to Component" pipeline:

- `harvested_industrial_hero.html`
- `harvested_product_card.html`
- `harvested_data_grid.html`
- `harvested_rmc_header.html`
- `harvested_rune_specs.html`
- etc.

### Sourcing Strategy

**Philosophy: "Variety creates better user experiences than rigid systems."**

The design system explicitly supports 5 style palettes:

1. Industrial Brutalism (borders, 900 weight, red/orange)
2. Modern SaaS (subtle borders, 500-600 weight, brand colors)
3. Premium/Luxury (no borders, light weights, generous tracking)
4. Technical/Data (monospace, green/cyan, 1px borders)
5. Playful/Creative (animations, unexpected layouts)

Components are sourced from Awwwards, Godly.website, Mobbin, Dribbble, and direct from brands (Stripe, Linear, Vercel, Apple).

---

## 4. Loveable Design Forge (React/Tailwind UI Kit)

**Path:** `Design System/loveable-design-forge-main/`

A **full React application** serving as the interactive design system playground with 10+ template variants.

### Tech Stack

| Technology       | Version/Details                    |
| ---------------- | ---------------------------------- |
| React            | 18+                                |
| TypeScript       | Strict                             |
| Tailwind CSS     | v3 with tailwindcss-animate        |
| shadcn/ui        | Full component set (47 components) |
| Framer Motion    | Animation library                  |
| Lucide React     | Icon library                       |
| Vite             | Build tool                         |
| React Router DOM | Routing                            |

### shadcn/ui Components (47 total)

Complete set including:
accordion, alert, alert-dialog, aspect-ratio, avatar, badge, breadcrumb, button, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner (toast), switch, table, tabs, textarea, toast, toaster, toggle, toggle-group, tooltip

### Custom Page Components

| Component             | Purpose                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `Header.tsx`          | Main site header with dark mode toggle                                   |
| `HeroSection.tsx`     | Hero with badge, H1, capsule, trust indicators, CTA — uses Framer Motion |
| `ContentSection.tsx`  | Reversible content section with H2/H3 placeholders                       |
| `ComparisonTable.tsx` | Feature comparison table                                                 |
| `FAQSection.tsx`      | FAQ accordion                                                            |
| `ExpertQuote.tsx`     | Expert attribution block                                                 |
| `CTASection.tsx`      | Call-to-action section                                                   |
| `Footer.tsx`          | Multi-column footer                                                      |
| `NavLink.tsx`         | Navigation link component                                                |

### Template Variants (10 unique styles)

| Page                 | File                       | Style                 |
| -------------------- | -------------------------- | --------------------- |
| Index                | `Index.tsx`                | Default (Navy/Orange) |
| Template3D           | `Template3D.tsx`           | 3D Hero effect        |
| TemplateBrutalist    | `TemplateBrutalist.tsx`    | Industrial/Bold       |
| TemplateConcrete     | `TemplateConcrete.tsx`     | Concrete textures     |
| TemplateDarkOrange   | `TemplateDarkOrange.tsx`   | Premium dark          |
| TemplateGradientNavy | `TemplateGradientNavy.tsx` | Gradient backgrounds  |
| TemplateHorizontal   | `TemplateHorizontal.tsx`   | Horizontal layout     |
| TemplateLightSteel   | `TemplateLightSteel.tsx`   | Light/clean           |
| TemplateMemphis      | `TemplateMemphis.tsx`      | Bold geometric        |
| TemplateNeumorphic   | `TemplateNeumorphic.tsx`   | Soft shadows          |
| TemplateTerminal     | `TemplateTerminal.tsx`     | Hacker/code           |

### Tailwind Configuration

Custom theme extensions in `tailwind.config.ts`:

```typescript
fontFamily: {
  sans: ["Inter", "system-ui", "sans-serif"],
  display: ["Outfit", "system-ui", "sans-serif"],
},
colors: {
  navy: { DEFAULT, light, dark },
  orange: { DEFAULT, light, dark },
  steel: { DEFAULT, light },
},
keyframes: {
  "fade-up", "fade-in", "slide-in-right",
  "accordion-down", "accordion-up"
},
```

Custom breakpoints match design tokens: xs(375), sm(640), md(768), lg(1024), xl(1280), 2xl(1536).

---

## 5. Dashboard Frontend Architecture

### Routing Architecture

**Two-tier routing** with client (public) and admin (PIN-protected) views:

```
Client Routes (public):
/                  → ClientDashboard (deliverables view)
/task/:id          → ClientTaskPreview (HTML preview + copy)
/map               → UrlMap
/guide             → Overview

Admin Routes (PIN-gated via AdminPinGate):
/admin             → Home (full task management)
/admin/task/:id    → TaskDetail
/admin/reconciliation → ReconciliationPage
/admin/guide       → Overview
/admin/costs       → CostsPage
```

**Key pattern:** Client and admin share the same API but render different views. Client sees only deployed deliverables; admin sees all tasks with toggle controls.

### Layout System

**Two layout components:**

1. **DashboardLayout** (Admin) — Fixed left sidebar (264px), navy dark theme, 8 nav items:
   - Dashboard, Reconciliation, Guide, API Costs
   - On-Site, Off-Site, AI Assets, Infrastructure (anchor links)
   - Footer: Theme toggle, Client View link, Admin card with logout
   - Mobile: Sheet-based sidebar

2. **ClientLayout** (Public) — Same sidebar pattern, orange accent instead of primary blue:
   - Deliverables, URL Map, Project Guide
   - Footer: Theme toggle, NDS website link, Admin access (subtle)

**Shared patterns:**

- `cn()` utility from `@/lib/utils` for conditional classes
- Sheet (shadcn) for mobile sidebar
- `useTheme()` from next-themes for dark mode
- `useLocation()` from wouter for active nav highlighting

### Dashboard Home Page (Admin)

**3 stat cards** at top:

- Total Tasks (count)
- Overall Progress (percentage with visual bar)
- Pending Actions (count)

**4 sections** organized by category prefix:

- A. On-Site Content (prefix `a`)
- B. Off-Site Content (prefix `b`)
- C. AI Platform Assets (prefix `c`)
- D. Infrastructure (prefix `d`)

Each section has:

- H2 title with count
- Percentage complete with progress bar
- 3-column grid of TaskCards

**TaskCard component:**

- Checkbox for completion toggle (with confirmation dialog)
- Label with hover underline
- Category badge (muted)
- Status badge (color-coded: green=Done, red=Blocked, amber=Needs Review, purple=In Progress)
- Deployed URL indicator
- **HoverCard** for preview — lazy-loads task detail on hover (300ms delay)
- Optimistic mutations via TanStack Query

### Client Dashboard

Simplified view showing only deployed deliverables:

- Summary stats: Ready to Use, Total Project, Progress %
- Deliverable cards grouped by category
- Each card: checkmark icon, label, category badge, "Ready" badge, external link, View button

### Task Preview (Client)

Rich task detail page with:

- Back navigation
- Task label + category/status badges
- "View Live" button linking to deployed URL
- **3 action buttons:**
  - Copy Full HTML (clipboard API)
  - Copy Body Only (regex body extraction)
  - Report Issue (Dialog with type select + textarea)
- **Tabbed content:** Preview (iframe with srcDoc) | HTML Source (syntax-highlighted pre)
- Deployed URL card at bottom

### State Management

**TanStack Query** (React Query v5) for all server state:

```typescript
// Query config
queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,     // Never auto-refetch
      refetchOnWindowFocus: false,
      retry: false,
    }
  }
});

// Per-query overrides
tasks: staleTime: 30000 (30s)
taskDetail (hover): staleTime: 60000 (1min), gcTime: 5min, enabled: isHovering
```

**Optimistic updates** for task completion toggle:

1. Cancel outgoing refetches
2. Snapshot previous value
3. Optimistically update cache
4. Rollback on error
5. Invalidate on settled

### CSS/Theming System

**Akiflow-inspired design system** with oklch color space:

```css
/* Light mode */
--primary: 217 89% 61%;        /* Blue */
--secondary: 287 65% 48%;      /* Purple */
--akiflow-purple: oklch(0.50 0.22 290);
--akiflow-blue:   oklch(0.58 0.20 260);
--akiflow-green:  oklch(0.72 0.15 165);
--akiflow-orange: oklch(0.75 0.18 55);

/* Utility classes */
.transition-smooth { all 200ms ease-out }
.transition-spring { all 200ms cubic-bezier(0.34, 1.56, 0.64, 1) }
.glass-card { backdrop-filter: blur(8px), oklch background }
.hover-lift { translateY(-2px) + shadow on hover }
```

Font stack: Inter (body), JetBrains Mono (code).

### Reconciliation System

**PageDetailPanel** — Side panel showing task history:

- Status badge (not_scanned, pending_review, approved, deployed)
- Last scanned / Duration / Approved by
- Summary stats grid (Scans, Issues Found, Resolved)
- Pending issues list (yellow cards with severity badges)
- Audit history timeline
- Resolved issues with before/after image comparison
- Re-scan button + View Page button

**ReviewPanel** — Fixed overlay panel (400px, bottom-right) injected into deployed pages:

- Stage-by-stage issue grouping (10 stages)
- Issue cards with severity color coding
- 3 action buttons per issue: Correct / Ignore / Fix
- Auto-expands stages with critical issues
- Inline CSS styles (no external dependencies)

---

## 6. API Design Patterns (Cloudflare Pages Functions)

### Architecture

**Cloudflare Pages Functions** using file-based routing:

```
functions/
  _middleware.ts           — CORS headers for /api/ routes
  [[path]].ts              — Catch-all HTML content server
  api/
    tasks/
      index.ts             — GET (list) / POST (create)
      [taskId].ts          — GET / PATCH / DELETE
      [taskId]/
        approve.ts         — POST approval
        validate.ts        — POST validation
        trigger.ts         — POST workflow trigger
        stages/index.ts    — Stage management
        ...20+ more endpoints
    reconciliation/
      tasks.ts             — List reconciliation tasks
      scan-selected.ts     — Trigger scan
      deploy-approved.ts   — Deploy approved content
      ...
    costs/
      index.ts             — API cost tracking
      [taskId].ts          — Per-task costs
    prompts/
      [stageNumber].ts     — Stage prompt management
```

### Env Interface

```typescript
interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  AI: Ai; // Cloudflare AI Gateway binding
  WORKFLOW_WORKER: Fetcher; // Service binding to workflow worker
}
```

### Storage Layer (`lib/storage.ts`)

**Factory function pattern** — `createStorage(db: D1Database)` returns an object with all CRUD methods:

```typescript
export function createStorage(db: D1Database) {
  return {
    getAllTasks(): Promise<Task[]>,
    getTask(id: string): Promise<Task | undefined>,
    getTaskByTaskId(taskId: string): Promise<Task | undefined>,
    createTask(task: {...}): Promise<Task>,
    updateTask(id: string, task: Partial<{...}>): Promise<Task>,
    getFileById(fileId: string): Promise<UploadedFile | undefined>,
    getTaskFiles(taskId: string): Promise<UploadedFile[]>,
    addFile(file: {...}): Promise<UploadedFile>,
    deleteFile(fileId: string): Promise<void>,
    getTaskLogs(taskId: string): Promise<UpdateLog[]>,
    addLog(log: {...}): Promise<UpdateLog>,
    claimTask(taskId: string, sessionId: string): Promise<{...}>,
    releaseTask(taskId: string, sessionId: string): Promise<{...}>,
    getNextAvailableTask(categoryPrefix?: string): Promise<Task | undefined>,
  };
}
```

**Key patterns:**

- UUID generation via `crypto.randomUUID()`
- Snake_case DB columns mapped to camelCase TypeScript
- Dynamic UPDATE query builder (only sets provided fields)
- Atomic claim/release with 30-minute expiry
- Boolean mapping: `Boolean(row.completed)` since D1 stores 0/1

### Task Schema (D1)

```typescript
interface Task {
  id: string; // UUID
  taskId: string; // Human ID like "a1-1"
  label: string;
  category: string;
  completed: boolean;
  status: string; // "To Do", "In Progress", "Done", "Blocked", etc.
  htmlContent: string | null; // Full HTML page
  shopifyContent: string | null; // Body-only HTML for Shopify
  deployedUrl: string | null;
  description: string | null;
  deployTo: string | null;
  subcategory: string | null;
  claimedBy: string | null; // Session-based task locking
  claimedAt: string | null;
  score: number | null; // Validation score 0-120
  currentStage: number | null; // Factory workflow stage 1-10
  workflowInstanceId: string | null;
  lastVerifiedAt: string | null;
  verificationStatus: 'unverified' | 'verified' | 'failed' | null;
  waitingStage: number | null;
  waitingSince: string | null;
  updatedAt: string;
  createdAt: string;
}
```

### Protected Fields Pattern

The PATCH endpoint enforces **field-level access control:**

```typescript
const protectedFields = ['score', 'current_stage', 'approved_at', 'approved_by'];
const protectedStatuses = ['Approved', 'Preview', 'Published'];

// Returns 403 with hints for the correct API:
// score → POST /api/tasks/:id/validate
// current_stage → PATCH /api/tasks/:id/stages
// Approved → POST /api/tasks/:id/approve
```

### Content Serving (`[[path]].ts`)

Catch-all route that serves HTML content from D1:

1. **Slug mapping** — hardcoded map of URL slugs to taskIds
2. **Pages table** — Check `pages` table first (workflow-generated content)
3. **Tasks table** — Fallback to `tasks` table (legacy content)
4. **Dynamic lookup** — Search by `deployed_url` LIKE pattern

Response headers: `Content-Type: text/html`, `Cache-Control: public, max-age=60`.

### Middleware

Simple CORS middleware for all `/api/` routes:

```typescript
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### Auto-Seeding

Database auto-seeds on first request: `seedDatabase(context.env.DB)` runs in the GET `/api/tasks` handler.

---

## 7. Content Factory Workflow (10-Stage Pipeline)

**Stage gates** are machine-checkable criteria defined in `lib/stage-gates.ts`:

| Stage | Name                 | Min Checks | Key Criteria                                                                                                                                          |
| ----- | -------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Research             | 3          | Research doc >500 chars, 5+ sources, 10+ data points                                                                                                  |
| 2     | Solution Design      | 4          | Page type, template, schema types (Article + FAQPage), assets loaded                                                                                  |
| 3     | Content Architecture | 4          | Skill file loaded, answer capsule 100-200 chars link-free, 4+ H2s in question format, component mapping                                               |
| 4     | Content Creation     | 5          | 2900+ words, 5+ FAQs, expert quote with attribution, 10+ statistics, content doc >5000 chars                                                          |
| 5     | Technical Accuracy   | 2          | All claims verified, verification log, zero unverified claims                                                                                         |
| 6     | Visual Strategy      | 2          | Visual brief OR explicit no-images statement, each image has source                                                                                   |
| 7     | Image Generation     | 8          | Brand guidelines read, reference library loaded, images generated, references sent, resolution log, refinement log, quality score 80+, human approval |
| 8     | UX/Interaction       | 3          | UX spec >300 chars, inputs with types, logic documented                                                                                               |
| 9     | Assembly             | 1          | HTML content >5000 chars                                                                                                                              |
| 10    | Validation           | 1          | Score = 100/100                                                                                                                                       |

**Each gate check returns:**

```typescript
interface StageCheckResult {
  passed: boolean;
  found: string | null; // What was actually found
  expected: string; // What was expected
}
```

### Onsite Rebuild Config

Per-page JSON configs in `onsite-rebuild/config/`:

```json
{
  "pageId": "a1-1",
  "topic": "UK Steel Reinforcement Specifications: BS Standards Explained",
  "primaryKeyword": "steel specifications UK BS 4449",
  "secondaryKeyword": "BS 4483 mesh standard explained",
  "heroKicker": "UK SPECIFICATIONS GUIDE",
  "canonicalPath": "/pages/steel-specifications-guide-uk",
  "searchQueries": ["BS 4449 current version...", ...],
  "competitorQuery": "steel reinforcement specifications guide UK",
  "internalLinks": { "a1-6": { "url": "...", "anchor": "..." } }
}
```

### Deployment Output Structure

Per-page file structure:

```
onsite-rebuild/pages/{pageId}/
  content.json              — Source content (JSON)
  {pageId}-master.html      — Full standalone HTML page
  {pageId}-shopify-body.html — Body-only for Shopify injection
  {pageId}-schema.json      — Structured data (JSON-LD)
  {pageId}-meta.json        — SEO meta (title, description, canonical)
```

---

## 8. AI Citation / LLM Optimization System

### Verified LLM Citation Guide (`AI Cite Rules/verified-llm-citation-guide.jsx`)

A complete React component (810 lines) documenting verified citation factors from 3 major 2025 studies:

**Data Sources:**

- SE Ranking (Nov 2025): 129,000 domains, 216,524 pages
- AirOps (2025): 45,000+ citations analyzed
- Relixir (July 2025): FAQPage schema study

### Citation Impact Factors (Priority Order)

| Factor                            | Impact                 | Source        |
| --------------------------------- | ---------------------- | ------------- |
| Content freshness (3 months)      | +67% (6.0 vs 3.6)      | SE Ranking    |
| Statistical data (19+ points)     | +93% (5.4 vs 2.8)      | SE Ranking    |
| Expert quotes included            | +71% (4.1 vs 2.4)      | SE Ranking    |
| Section structure (120-180 words) | +70% (4.6 vs 2.7)      | SE Ranking    |
| Word count (2900+ words)          | +59% (5.1 vs 3.2)      | SE Ranking    |
| Schema (FAQ/HowTo)                | +78% more likely cited | AirOps        |
| Heading hierarchy H1>H2>H3        | +63% citations         | AirOps        |
| FAQPage schema (on FAQ pages)     | +173% (2.7x)           | Relixir       |
| FCP < 0.4 seconds                 | +219% (6.7 vs 2.1)     | SE Ranking    |
| H2 question format                | +40% citation          | Princeton GEO |
| Keyword stuffing                  | -111% to -137%         | SE Ranking    |

### 7-Block Content Structure

Every page follows this structure:

1. Hero Section (H1 + Answer Capsule) — 100-150 words
2. Problem/Solution — 200-250 words
3. Services/Product Overview — 300-400 words
4. Trust & Authority (E-E-A-T) — 250-350 words
5. How It Works / Technical Specs — 300-400 words
6. FAQ Section (5-8 questions) — 500-800 words
7. Final CTA — 100-150 words

### Answer Capsule Rules

- 120-150 characters (20-25 words)
- Self-contained answer after H1
- **Link-free** (91% of cited capsules have no links)
- Makes sense without reading anything else

### Schema Requirements

Pages with 3+ schema types are significantly more likely cited:

- Article (required on all content)
- FAQPage (on dedicated FAQ pages only — +173%)
- HowTo (on guides/tutorials — +78%)
- Person (author bios)
- LocalBusiness / Organization
- Product / Service

### Technical Requirements

- FCP < 0.4 seconds (+219%)
- Total JS < 5KB
- Total CSS < 25KB (inline)
- Works without JS (LLM crawlers see everything)
- robots.txt allows GPTBot, PerplexityBot, Claude-Web, Google-Extended
- Visible "last updated" date (1.8x citations)

### 125-Point Audit Checklist

Each page validated against 28 parameters including:

1. Single H1 with "UK"
2. H2s in question format (5+)
3. Answer capsule present
4. Expert quote with source
5. 10+ statistics with units
6. FAQ section with `<details>` tags
7. FAQPage Schema (JSON-LD)
8. Comparison table (3+ rows)
9. British Standard references
10. Word count >= 1000

---

## 9. Key UI/UX Decisions

### Dashboard Design Language

- **Akiflow-inspired** — Clean, minimal, functional with oklch color system
- **Blue primary + purple secondary** for admin; **orange accent** for client
- **Progress bars** prominent — every section shows completion percentage
- **HoverCards** for task preview — lazy-loaded via TanStack Query
- **Optimistic updates** — UI updates instantly, rolls back on error
- **Confirmation dialogs** for destructive actions (task completion toggle)

### Two-Audience Design

**Client view:**

- Shows only deployed deliverables
- Simplified actions: View, Copy HTML, Report Issue
- Orange accent color (matches NDS brand)
- Subtle admin link in footer

**Admin view:**

- Full task management with checkboxes
- Task status tracking across 4 categories
- Reconciliation tools for content verification
- PIN-gated access via `AdminPinGate` component

### Mobile-First Responsive

- Sidebar collapses to Sheet on `<lg` (1024px)
- Hamburger menu trigger in top-left
- Card grids: 1 col mobile, 2 col tablet, 3 col desktop
- Touch targets 44x44px minimum

### Animation System

```css
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1); /* Bouncy */
--ease-smooth: cubic-bezier(0.4, 0, 0.2, 1); /* Standard */
```

Framer Motion for hero animations (fadeUp sequence with staggered delays).
CSS transitions for interactive elements (200ms default).

---

## 10. Reusable Patterns for Automated Ads Agent

### Patterns to Extract

1. **Factory function storage layer** — `createStorage(db)` returning typed CRUD methods. Clean separation of DB access from route handlers.

2. **Optimistic mutation pattern** — TanStack Query's onMutate/onError/onSettled for instant UI updates with automatic rollback.

3. **Two-audience routing** — Same API, different views. Client sees simplified data; admin gets full control. PIN-gated via localStorage.

4. **Stage gate system** — Machine-checkable criteria for workflow stages. Each check returns `{ passed, found, expected }` — excellent for content pipeline validation.

5. **Component tier system** — 4-level component modification rules (LOCKED > TEMPLATED > FLEXIBLE > NOVEL). Ensures consistency for critical components while allowing creativity elsewhere.

6. **Template-driven content** — JSON configs per content piece with keyword research, canonical paths, internal links, and search queries baked in.

7. **Reconciliation/HITL pattern** — Automated scanning + human review overlay. ReviewPanel injected into deployed pages with approve/ignore/fix actions.

8. **Cloudflare Pages Functions architecture** — File-based routing with D1 + R2 bindings, middleware for CORS, catch-all route for content serving.

9. **CSS design token system** — oklch color space, CSS custom properties for theming, utility classes for common patterns (glass-card, hover-lift, transition-smooth).

10. **Content freshness tracking** — `lastVerifiedAt`, `verificationStatus`, visible "last updated" dates — critical for LLM citation performance.

### Design System Elements Worth Adopting

- **Answer Capsule** component pattern (research-backed +40% citation improvement)
- **Glass card** utility with backdrop-filter blur
- **oklch color system** for perceptually uniform color manipulation
- **Akiflow color utilities** (`.text-akiflow-purple`, `.bg-akiflow-blue-low` with `color-mix()`)
- **Spring easing** for micro-interactions: `cubic-bezier(0.34, 1.56, 0.64, 1)`
- **Scrollbar styling** matching the theme
- **Reduced motion** preference handling

---

## Appendix: File Inventory

### Design System Files Read

| File                                                                      | Lines | Purpose                              |
| ------------------------------------------------------------------------- | ----- | ------------------------------------ |
| `Design System/nds-design-system-v2/.../NDS-DESIGN-SYSTEM.md`             | 525   | Design tokens, templates, components |
| `Design System/nds-design-system-v2/.../TEMPLATE-USAGE-GUIDE.md`          | 245   | Template usage instructions          |
| `Design System/NextDaySteel_Clean_System/.../INDEX.md`                    | 53    | Component library index              |
| `Design System/NextDaySteel_Clean_System/.../SOURCING_STRATEGY.md`        | 137   | Component sourcing strategy          |
| `Design System/NextDaySteel_Clean_System/.../AGENT_EXECUTION_PROTOCOL.md` | 54    | Harvester system protocol            |
| `Design System/loveable-design-forge-main/src/pages/Index.tsx`            | 225   | Main template page                   |
| `Design System/loveable-design-forge-main/src/components/HeroSection.tsx` | 94    | Hero component                       |
| `Design System/loveable-design-forge-main/tailwind.config.ts`             | 115   | Tailwind configuration               |

### Client Files Read

| File                                                       | Lines | Purpose               |
| ---------------------------------------------------------- | ----- | --------------------- |
| `client/src/App.tsx`                                       | 72    | Router configuration  |
| `client/src/pages/home.tsx`                                | 403   | Admin dashboard       |
| `client/src/pages/client/dashboard.tsx`                    | 212   | Client dashboard      |
| `client/src/pages/client/task-preview.tsx`                 | 361   | Task preview page     |
| `client/src/components/layout/DashboardLayout.tsx`         | 175   | Admin layout          |
| `client/src/components/layout/ClientLayout.tsx`            | 149   | Client layout         |
| `client/src/components/reconciliation/PageDetailPanel.tsx` | 450   | Reconciliation detail |
| `client/src/components/ReviewPanel.tsx`                    | 493   | HITL review overlay   |
| `client/src/lib/data.ts`                                   | 158   | Static project data   |
| `client/src/lib/queryClient.ts`                            | 58    | TanStack Query config |
| `client/src/index.css`                                     | 262   | Theme + utilities     |

### Functions/API Files Read

| File                              | Lines | Purpose                   |
| --------------------------------- | ----- | ------------------------- |
| `functions/_middleware.ts`        | 23    | CORS middleware           |
| `functions/[[path]].ts`           | 109   | Content serving catch-all |
| `functions/api/tasks/index.ts`    | 36    | Task list/create          |
| `functions/api/tasks/[taskId].ts` | 115   | Task CRUD                 |
| `functions/lib/storage.ts`        | 441   | D1 storage layer          |
| `functions/lib/stage-gates.ts`    | 644   | Stage gate verification   |

### Other Files Read

| File                                            | Lines | Purpose                 |
| ----------------------------------------------- | ----- | ----------------------- |
| `_HANDOVER.md`                                  | 72    | Project handover notes  |
| `_CLEANUP_PLAN.md`                              | 110   | File consolidation plan |
| `AI Cite Rules/verified-llm-citation-guide.jsx` | 811   | LLM citation guide      |
| `google-engine/NDS-AGENT-HANDOFF-PROMPT.md`     | 264   | Agent handoff context   |
| `wrangler.toml`                                 | 33    | Cloudflare config       |
| `onsite-rebuild/config/a1-1.json`               | 22    | Page config example     |

**Total files analyzed: 30+**
**Total lines read: ~5,000+**
