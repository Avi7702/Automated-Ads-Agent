# NDS-WEB-BUILD Project Research

## Executive Summary

NDS-WEB-BUILD is a **web-based SEO and content management build system** for NextDaySteel (NDS), a UK-based steel reinforcement supplier. Built with **Astro 5.16.0 + Tailwind CSS 3.4**, it serves as both a **production-ready landing page generator** and an **internal dashboard** for managing the company's SEO content pipeline. The project has two distinct layers: public-facing SEO-optimized landing pages and an internal dark-themed dashboard for tracking content production progress.

---

## 1. What Was Being Built

### 1.1 Dual-Purpose Architecture

The project serves two roles simultaneously:

**A) Public-Facing SEO Landing Pages** -- Fully designed, conversion-optimized pages targeting local search queries (e.g., "steel reinforcement mesh in Manchester"). These are production-ready pages with:

- Rich Schema.org JSON-LD structured data
- FAQ sections with detailed answers
- Local delivery proof sections
- Regional problem/solution content
- Specialist profile sections with avatars
- CTAs (phone calls + quote requests)

**B) Internal Content Production Dashboard** -- A dark-themed (slate-950 background) admin-style UI for the NDS content team to track:

- Total tasks (115 in Phase 1 scope, 8 completed / 107 pending)
- On-site content (26 core pages, 6 live + 9 in production queue)
- Off-site content (editorial calendar for external publications)
- AI platform assets (JSON feeds for Perplexity, Markdown for ChatGPT)
- Infrastructure management (Google Business Profile, citations, analytics)
- AI Visibility Score (17/100 at time of project)

### 1.2 Business Context

NextDaySteel (NDS) is a UK steel reinforcement supplier based in Birmingham, West Midlands. The project targets UK contractors who need:

- Steel reinforcement mesh (A142, A193, A252, A393)
- Cut & bend rebar to BS 8666:2020 standards
- Next-day delivery across the UK
- Urban site delivery with 7.5t rigid trucks

The company claims 2,000+ active trade accounts, 15 years in business, and 98.7% on-time delivery rate.

---

## 2. Technology Stack

| Technology            | Version     | Purpose                                        |
| --------------------- | ----------- | ---------------------------------------------- |
| **Astro**             | 5.16.0      | Static site generator + SSR framework          |
| **@astrojs/node**     | 9.5.1       | Node.js SSR adapter (standalone mode)          |
| **@astrojs/tailwind** | 6.0.2       | Tailwind CSS integration                       |
| **Tailwind CSS**      | 3.4.18      | Utility-first CSS framework                    |
| **TypeScript**        | strict mode | Type safety (extends `astro/tsconfigs/strict`) |

### Key Technical Decisions

- **SSR mode** (`output: 'server'`) with Node.js standalone adapter -- enables dynamic routing for `[region]/[service]` pages
- **Zero additional dependencies** -- only Astro, Tailwind, and the Node adapter; no React, no Vue, no other frameworks
- **Build-time rendering** for schema components (zero runtime overhead)
- **No client-side JavaScript** -- fully server-rendered, no interactivity framework

---

## 3. Project Structure

```
NDS-WEB-BUILD/
+-- astro.config.mjs              # SSR + Tailwind config
+-- tailwind.config.mjs           # Standard Tailwind content paths
+-- tsconfig.json                 # Strict TypeScript
+-- package.json                  # Minimal dependencies
+-- SCHEMA-DELIVERY-REPORT.md     # Comprehensive schema delivery docs
+-- SCHEMA-INSTALLATION-GUIDE.md  # Step-by-step setup guide
+-- public/
|   +-- favicon.svg
|   +-- ai-assets/               # Referenced but not yet populated
+-- src/
    +-- layouts/
    |   +-- Layout.astro          # Basic public page layout (white bg)
    |   +-- BaseLayout.astro      # SEO layout with SchemaGenerator integration
    |   +-- DashboardLayout.astro # Internal admin layout (dark theme)
    +-- pages/
    |   +-- index.astro           # Dashboard overview page
    |   +-- infrastructure.astro  # GBP/Citations/Analytics tracker
    |   +-- find-steel-products.astro  # Full landing page (Birmingham)
    |   +-- content/
    |   |   +-- on-site.astro     # On-site content tracker
    |   |   +-- off-site.astro    # Off-site editorial calendar
    |   |   +-- ai-platforms.astro # AI platform asset manager
    |   +-- [region]/
    |   |   +-- [service].astro   # Dynamic regional service pages (SSR)
    |   +-- examples/
    |       +-- homepage-example.astro
    |       +-- product-example.astro
    |       +-- blog-example.astro
    +-- components/
    |   +-- SchemaGenerator.astro # Main schema generator (LocalBusiness, Service, FAQ)
    |   +-- blocks/
    |   |   +-- ComparisonTable.astro     # Us vs. competitors table
    |   |   +-- QuickAnswer.astro         # Highlighted Q&A block
    |   |   +-- OriginalStats.astro       # Dark stat card with source citation
    |   |   +-- LocalDeliveryProof.astro  # Recent jobs + map placeholder
    |   |   +-- RegionalProblemsSolutions.astro  # Local expertise content
    |   +-- schema/               # 8 reusable Schema.org components
    |       +-- SchemaFAQ.astro
    |       +-- SchemaLocalBusiness.astro
    |       +-- SchemaOrganization.astro
    |       +-- SchemaBreadcrumb.astro
    |       +-- SchemaWrapper.astro
    |       +-- SchemaProduct.astro
    |       +-- SchemaArticle.astro
    |       +-- SchemaWebSite.astro
    |       +-- types.ts          # Full TypeScript interfaces
    |       +-- index.ts          # Re-exports
    |       +-- README.md         # Component documentation
    |       +-- QUICK-REFERENCE.md
    |       +-- COMPONENT-SUMMARY.md
    +-- data/
        +-- regions.ts            # Region + service data (Manchester, London)
```

---

## 4. UX/UI Approach

### 4.1 Dashboard (Internal)

- **Color scheme**: Dark mode (slate-950 bg, slate-800 borders, slate-100 text)
- **Layout**: Full-width responsive grid, no sidebar navigation
- **Stats cards**: 4-column grid with colored accents (white, green, orange, blue)
- **Activity feed**: Chronological list with green/blue status dots
- **Quick actions**: Card-based links to content management sections
- **System status**: Right sidebar showing build engine, Tailwind, Astro versions
- **Milestone tracker**: Gradient card with progress bar

### 4.2 Landing Pages (Public)

- **Design system**: Premium aesthetic with glassmorphism effects (`glass-card` class)
- **Typography**: Outfit font for headings (900 weight), Inter for body
- **Gradient text**: Blue gradient on key headings (`gradient-text` class)
- **Steel pattern**: Subtle diagonal background pattern (`steel-pattern` class)
- **Colors**: Blue primary (#1e40af to #60a5fa), slate neutrals, green for trust signals
- **Hero sections**: Large text (6xl-7xl), dual CTA buttons, trust badges
- **Problem/solution layout**: Color-coded cards (red/orange/yellow for problems, green for solution)
- **Trust section**: Dark premium background with animated gradient blobs
- **FAQ**: Clean card-based layout with hover shadow effects
- **Final CTA**: Full-width blue gradient section with urgency messaging

### 4.3 Regional Pages

- **Dynamic routing**: `[region]/[service].astro` generates pages for any region+service combo
- **Local proof**: Shows recent deliveries in that region with dates and postcodes
- **Specialist profiles**: Named local expert with avatar (DiceBear generated), phone, bio
- **Regional context**: Environment-specific issues and solutions (e.g., ULEZ for London, rainfall for Manchester)
- **Data-driven**: All content from `regions.ts` data file (currently Manchester + London)

---

## 5. Schema.org / SEO Strategy

### 5.1 Dual Schema System

The project has **two independent schema systems**:

**System 1 -- SchemaGenerator.astro (inline, older)**

- Used by `BaseLayout.astro` and the landing pages
- Supports: LocalBusiness, Service, FAQ
- Simple prop-based approach: pass `schemaType` and `schemaData`
- Hardcoded to UK (`addressCountry: "GB"`)

**System 2 -- Schema component library (newer, more comprehensive)**

- 8 dedicated Astro components in `src/components/schema/`
- Full TypeScript types with validation warnings
- Supports: FAQ, LocalBusiness, Organization, Breadcrumb, Wrapper, Product, Article, WebSite
- Includes auto-generation (breadcrumbs from URL)
- Delivered November 24, 2025 as a separate deliverable
- Not yet integrated into the actual pages (examples only)

### 5.2 AI Platform Strategy

The project includes an "AI Platforms" section managing:

- `perplexity-guide.json` -- structured JSON feed for Perplexity AI
- `gpt-knowledge.md` -- Markdown knowledge base for ChatGPT
- These are meant to be hosted at `/ai-assets/` for LLM crawling

This represents a forward-thinking "AI SEO" strategy -- making company data easily consumable by AI systems, not just traditional search engines.

---

## 6. How It Differs From Other NDS Versions

Based on context from the broader "AI SEO & LANDING PAGES" project folder:

| Aspect          | NDS-WEB-BUILD                                 | Other Versions (likely)                   |
| --------------- | --------------------------------------------- | ----------------------------------------- |
| Framework       | Astro 5 (SSG/SSR)                             | Unknown (possibly WordPress, static HTML) |
| Purpose         | SEO content factory + dashboard               | Individual landing pages or CMS           |
| Schema approach | Component-based, reusable                     | Likely manual or plugin-based             |
| Rendering       | Server-side (Node.js adapter)                 | Varies                                    |
| AI integration  | AI platform asset management                  | Likely none                               |
| Design system   | Custom Tailwind with glassmorphism            | Unknown                                   |
| Content model   | Data-driven (regions.ts) with dynamic routing | Likely hardcoded                          |

### Key Differentiators

1. **AI-First SEO** -- Manages content for both search engines AND AI platforms (Perplexity, ChatGPT, Claude)
2. **Content Factory Pattern** -- Dashboard tracks 115 content tasks across multiple categories
3. **Dynamic Regional Pages** -- SSR generates pages per region/service combo from data files
4. **Schema Component Library** -- 8 reusable, typed, validated schema components (separate deliverable)
5. **Zero-dependency philosophy** -- Only Astro + Tailwind, no React or other frameworks
6. **Internal tooling** -- Built as both the website AND the content management interface

---

## 7. Current State & Completion

### Completed

- Dashboard with all management sections (overview, on-site, off-site, AI platforms, infrastructure)
- `find-steel-products.astro` -- Full production-ready landing page for Birmingham
- Dynamic `[region]/[service]` routing with Manchester and London data
- 8 Schema.org components with full TypeScript types and documentation
- 5 reusable block components (ComparisonTable, QuickAnswer, OriginalStats, LocalDeliveryProof, RegionalProblemsSolutions)
- 3 layout variants (basic, SEO-enabled, dashboard)

### Not Yet Completed

- Schema component library not integrated into actual pages (only in examples)
- AI assets directory (`public/ai-assets/`) referenced but empty
- Only 2 of 115 planned content tasks completed (7%)
- No actual CMS or database -- all content is hardcoded in Astro files
- Off-site editorial calendar is empty (placeholder UI only)
- Google Business Profile, Citations, Analytics sections are placeholder UIs
- Map component in LocalDeliveryProof is a placeholder
- Only 2 regions defined (Manchester, London) out of potential nationwide coverage
- No authentication or real backend -- purely a static/SSR build

---

## 8. Architectural Patterns

### 8.1 Layout Hierarchy

```
Layout.astro (basic, white bg, optional schema prop)
BaseLayout.astro (SEO-focused, SchemaGenerator integration, slate-50 bg)
DashboardLayout.astro (dark admin, minimal, slate-950 bg)
```

### 8.2 Component Patterns

- **Props interfaces**: Every component has explicit TypeScript `Props` interface
- **Conditional rendering**: Schema fields use spread syntax for optional fields (`...(email && { email })`)
- **Data files**: Region/service data separated into `src/data/regions.ts`
- **Block components**: Reusable content blocks accept typed props, render standalone sections
- **SSR toggle**: `export const prerender = false` on dynamic pages only

### 8.3 Styling Patterns

- **Tailwind-first**: All styling via utility classes
- **Custom CSS classes**: `glass-card`, `gradient-text`, `steel-pattern`, `heading-display`
- **External fonts**: Google Fonts (Inter + Outfit) loaded via CSS @import
- **Color system**: Blue primary for public pages, red accents for dashboard actions
- **Animation**: CSS blobs for background effects, pulse animations for live indicators

---

## 9. Key Files Reference

| File                                             | Lines | Purpose                       |
| ------------------------------------------------ | ----- | ----------------------------- |
| `src/pages/find-steel-products.astro`            | 443   | Main production landing page  |
| `src/pages/index.astro`                          | 121   | Dashboard overview            |
| `src/pages/[region]/[service].astro`             | 100   | Dynamic regional pages        |
| `src/data/regions.ts`                            | 60    | Region + service data         |
| `src/components/SchemaGenerator.astro`           | 82    | Schema JSON-LD generator      |
| `src/components/schema/types.ts`                 | 209   | TypeScript schema interfaces  |
| `src/components/schema/SchemaOrganization.astro` | 170   | Organization schema component |
| `SCHEMA-DELIVERY-REPORT.md`                      | 597   | Comprehensive delivery report |
| `SCHEMA-INSTALLATION-GUIDE.md`                   | 402   | Setup instructions            |

---

## 10. Delivery Dates

- **Project initialized**: November 2025 (inferred from package versions and delivery report)
- **Schema components delivered**: November 24, 2025
- **Astro version**: 5.16.0 (latest at time of build)
- **Status**: Partially complete (7% of content pipeline, all infrastructure built)
