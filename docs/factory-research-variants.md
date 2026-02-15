# Factory Research Variants — Complete Findings

**Date:** 2026-02-13
**Researcher:** Claude Code (teammate agent)
**Scope:** All factory/workflow variants in `c:/Users/avibm/AI SEO & LANDING PAGES/`

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Project 1: page-factory (CLI-Driven Content Factory)](#project-1-page-factory)
3. [Project 2: LLM PAGES FACTORY - UI (Next.js Scaffold)](#project-2-llm-pages-factory-ui)
4. [Project 3: Local_Workflow (TypeScript Phase Orchestrator)](#project-3-local_workflow)
5. [Project 4: NDS-WEB-BUILD (Astro SSG Site)](#project-4-nds-web-build)
6. [Project 5: GENERAL-BEST-PRACTICES (Knowledge Base Docs)](#project-5-general-best-practices)
7. [Project 6: AI Cite Rules (React Artifact Guide)](#project-6-ai-cite-rules)
8. [Comparison Matrix](#comparison-matrix)
9. [Architecture Differences](#architecture-differences)
10. [Unique Features Per Variant](#unique-features-per-variant)

---

## Executive Summary

There are **6 distinct project variants** across the `AI SEO & LANDING PAGES` folder, each representing a different approach to the same core mission: **generating AI-citation-optimized landing pages at scale for industrial/construction clients (primarily NextDaySteel)**. They evolved sequentially, each addressing limitations of the prior:

| #   | Project                    | Tech Stack                            | Status                                  | Approach                                                                     |
| --- | -------------------------- | ------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------- |
| 1   | **page-factory**           | Node.js CLI + Claude Code commands    | **Production (58 pages deployed)**      | 6-stage pipeline: Research -> Generate -> Verify -> Assemble -> QA -> Deploy |
| 2   | **LLM PAGES FACTORY - UI** | Next.js 16 + React 19 + Tailwind 4    | **Scaffold only (boilerplate)**         | Planned web UI for the factory — never built                                 |
| 3   | **Local_Workflow**         | TypeScript orchestrator               | **Complete architecture, not deployed** | 10-phase workflow with playbook-first rule engine                            |
| 4   | **NDS-WEB-BUILD**          | Astro 5 + Tailwind + Cloudflare Pages | **Schema components delivered**         | SSG approach with regional/service page routing                              |
| 5   | **GENERAL-BEST-PRACTICES** | Markdown knowledge base               | **Complete reference docs**             | Universal AI SEO rules, design patterns, safety frameworks                   |
| 6   | **AI Cite Rules**          | React JSX (Claude Artifact)           | **Published artifact**                  | Interactive LLM citation guide as a Claude artifact                          |

---

## Project 1: page-factory

**Path:** `c:/Users/avibm/AI SEO & LANDING PAGES/page-factory/`
**Status:** PRODUCTION — most mature, 58 pages live on Shopify

### Architecture

```
page-factory/
├── factory/                  # Universal code (client-agnostic)
│   ├── run.js                # CLI orchestrator (stages 3-6)
│   ├── stages/
│   │   ├── 03-verify.js      # Fact-check + slop detection (no LLM)
│   │   ├── 04-assemble.js    # Template assembly (no LLM)
│   │   ├── 05-qa.js          # Schema/content/HTML validation (no LLM)
│   │   └── 06-deploy.js      # Tracker API + Shopify Playwright push
│   ├── lib/
│   │   ├── html-builders.js  # Template component builders
│   │   ├── json-parser.js    # Robust JSON with BOM handling
│   │   └── text-utils.js     # Word counting, sentence splitting, data density
│   ├── quality/
│   │   ├── verify-facts.js   # 20+ claim extraction regexes, cross-reference
│   │   ├── slop-check.js     # 6-check AI filler detection (30+ banned phrases)
│   │   ├── qa-validate.js    # Schema, content, meta, HTML validation
│   │   └── audit-llm.js      # LLM citation optimization audit
│   └── prompts/
│       ├── research.md       # Research prompt template
│       └── write.md          # Content generation prompt template
├── .claude/commands/         # Claude Code slash commands
│   ├── /research             # Stage 1: Web search + fact gathering
│   ├── /generate             # Stage 2: Content generation from research
│   └── /build-page           # Full 6-stage pipeline
└── clients/nds/              # Client data (NDS = NextDaySteel)
    ├── client.json           # Company data, products, standards, pricing, competitors
    ├── brand-context.md      # Voice, terminology, customer personas
    ├── template.html         # HTML design system template
    ├── review-pool.json      # 22 real Google reviews
    └── pages/                # 58 page directories (a1-1 through a1-58)
        └── <pageId>/
            ├── config.json        # Topic, keywords, search queries
            ├── research.json      # Stage 1 output: verified facts
            ├── content.json       # Stage 2 output: structured content
            ├── verification.json  # Stage 3 output: fact-check results
            ├── <pageId>-master.html     # Stage 4: Full standalone HTML
            ├── <pageId>-shopify-body.html # Stage 4: Shopify-ready body
            ├── <pageId>-schema.json     # Stage 4: Article + FAQ + Breadcrumb schemas
            ├── <pageId>-meta.json       # Stage 4: OG/meta tags
            ├── qa-report.json     # Stage 5: QA pass/fail report
            └── deployed.json      # Stage 6: Deployment record
```

### Key Design Decisions

1. **Hybrid LLM/Deterministic Pipeline**: Stages 1-2 use LLM (Claude Code commands), stages 3-6 are purely deterministic Node.js — no LLM needed for verification, assembly, QA, or deployment.

2. **Client Parameterization**: All client-specific data lives in `clients/<name>/`. Factory code is 100% reusable. Adding a new client requires only data files, no code changes.

3. **Fact Verification Engine** (`verify-facts.js`): 20+ regex extractors for claims (currencies, BS standards, product codes, measurements, ratings, etc.). Cross-references every claim against `client.json` (known facts) and `research.json` (web-sourced facts). Known technical constants (yield strengths, standard weights) are pre-approved.

4. **AI Slop Detection** (`slop-check.js`): 6 heuristic checks:
   - Banned phrases (30+ AI filler phrases)
   - Sentence length variance (stddev > 8 words)
   - Data density (> 3 data points per 100 words)
   - Filler ratio (< 15% sentences with zero technical content)
   - Paragraph length variance (stddev > 15 words)
   - Repeated sentence starters (< 15% repeated 3-word openings)

5. **Shopify Deployment via Playwright**: Uses persistent browser context to log in to Shopify admin, navigate to pages, inject HTML via TinyMCE API, and click Save. Handles pagination of page listings, search fallback, and batch deployment.

6. **Quality Thresholds** (configurable per client):
   - Min word count: 2,900
   - Min data points: 100
   - Min tables: 3
   - Min FAQs: 5
   - Min question H2 percentage: 50%
   - Min slop score: 80/100

7. **Content Schema** (content.json):
   - `heroCapsule`: 40-60 word direct answer
   - `sections[]`: Each with `id`, `h2`, `content` (HTML), `wordCount`
   - `tables[]`: With columns, rows, highlight column, caption
   - `statistics[]`: Value + label + source
   - `formulaBlocks[]`: Formula + worked examples
   - `comparison[]`: Multi-column comparison data
   - `faqAnswers[]`: Question + 2-3 sentence answer
   - `meta`: Title (50-60 chars) + description (120-160 chars)
   - `internalLinks[]`: Slug + anchor text

### Unique Features

- Deterministic review rotation using MD5 hash of pageId
- Schema types: Article + FAQPage + BreadcrumbList (NO LocalBusiness on guide pages)
- Tracker API integration for external task management
- Batch operations: can reassemble/QA/deploy all 58 pages in one command
- Brand context enforces specific terminology rules (e.g., "steel reinforcement" not "structural steel")

---

## Project 2: LLM PAGES FACTORY - UI

**Path:** `c:/Users/avibm/AI SEO & LANDING PAGES/LLM PAGES FACTORY - UI/llm-pages-factory/`
**Status:** SCAFFOLD ONLY — freshly initialized, no custom code

### What It Is

A `create-next-app` boilerplate with no custom implementation. The plan was to build a web UI for the factory workflow, but development never progressed beyond the initial scaffold.

### Tech Stack

- Next.js 16.0.7
- React 19.2.0
- Tailwind CSS v4
- TypeScript 5
- Geist font family

### What Was Planned vs Built

| Planned                            | Built                     |
| ---------------------------------- | ------------------------- |
| Web dashboard for factory workflow | Default Next.js home page |
| Client management UI               | None                      |
| Page generation UI                 | None                      |
| QA review interface                | None                      |
| Deployment controls                | None                      |

### Analysis

This appears to have been abandoned early in favor of the CLI-based `page-factory` approach, which proved more practical for the AI-assisted workflow (Claude Code commands are natural for LLM interaction, whereas a web UI adds unnecessary overhead for a single-operator workflow).

---

## Project 3: Local_Workflow

**Path:** `c:/Users/avibm/AI SEO & LANDING PAGES/Local_Workflow/`
**Status:** COMPLETE ARCHITECTURE — TypeScript code written, not deployed

### Architecture

```
Local_Workflow/
├── config.ts                    # Paths to external resources
├── workflow/
│   ├── cli.ts                   # CLI entry point
│   ├── index.ts                 # Main orchestrator (ContentFactoryWorkflow class)
│   ├── RULE-PHASE-MAP.ts        # Central rule-to-phase relationship map
│   ├── phases/
│   │   ├── 1-research.ts        # Understand + Gather (structured prompts)
│   │   ├── 2-plan.ts            # Map data TO playbook requirements
│   │   ├── 3a-build-content.ts  # C1-C9 rules (43 pts)
│   │   ├── 3b-build-structure.ts # S1-S7 rules (25 pts)
│   │   ├── 3c-build-signals.ts  # T1-T7 rules (15 pts)
│   │   ├── 3d-technical-review.ts # Verify claims against standards
│   │   ├── 3e-visual-design.ts  # Image planning (Nano Banana generation)
│   │   ├── 3f-ux-design.ts      # Inputs, presets, logic, tooltips
│   │   ├── 4-validate.ts        # All 29 rules scored /100
│   │   ├── 4.5-remediate.ts     # Route failures back to correct phase
│   │   └── 5-deliver.ts         # D1-D6 rules, deploy to Cloudflare
│   └── utils/
│       ├── playbook-loader.ts   # Reads LLM-CITEABILITY-RULES-v2.md
│       ├── phase-router.ts      # Context management + validation routing
│       ├── rule-update-handler.ts # Detect playbook changes via hash comparison
│       └── rule-addition-handler.ts # Add new rules with proper integration
├── output/                      # Generated pages (isolated)
└── logs/                        # Execution logs
```

### Key Design Decisions

1. **Playbook-First Architecture**: The playbook (`LLM-CITEABILITY-RULES-v2.md`) is the single source of truth. The workflow REFERENCES it, never copies. Rules drive creation, not just validation.

2. **10-Phase Pipeline** (vs page-factory's 6):
   - Phase 1: Research (understand + gather)
   - Phase 2: Plan (map data to playbook requirements)
   - Phase 3a: Build Content (C1-C9 rules, 43 points)
   - Phase 3b: Build Structure (S1-S7 rules, 25 points)
   - Phase 3c: Build Signals (T1-T7 rules, 15 points)
   - Phase 3d: Technical Review (verify claims against BS/NHBC standards)
   - Phase 3e: Visual Design (image planning + AI generation)
   - Phase 3f: UX Design (inputs, presets, logic, tooltips)
   - Phase 4: Validate (all 29 rules checked, score /100)
   - Phase 4.5: Remediate (route failures back to correct phase)
   - Phase 5: Deliver (D1-D6 rules, deploy to Cloudflare)

3. **Remediation Loop**: If validation fails, the system routes failures back to the correct creation phase:
   - C rules fail -> re-run Phase 3a (Content)
   - S rules fail -> re-run Phase 3b (Structure)
   - T rules fail -> re-run Phase 3c (Signals)
   - D rules fail -> re-run Phase 5 (Deliver)
   - Max remediation loops configurable, with escalation to human

4. **Rule Lifecycle Management**: CLI commands for:
   - `detect`: Find playbook changes since last snapshot
   - `apply`: Save new snapshot after changes
   - `status <ruleId>`: Check rule status
   - `next <category>`: Get next available rule ID
   - `phases <ruleId>`: Show which phases a rule affects

5. **Hard Gates**: Three rules must pass to deploy:
   - D5: Content pre-rendered in HTML
   - T6: All images have alt text
   - T7: No "click here" links

6. **Scoring System**: 100-point total across 29 rules in 4 categories:
   - Structure (S): 25 points (7 rules)
   - Content (C): 43 points (9 rules)
   - Signals (T): 15 points (7 rules)
   - Delivery (D): 17 points (6 rules)

7. **External Resource References**: References (never copies) from:
   - Playbook: `llm-pages-factory/playbook/LLM-CITEABILITY-RULES-v2.md`
   - Skills: `NextDaySteelHub-fresh/PRODUCTION/skills/` (content type patterns)
   - Components: `NextDaySteelHub-fresh/Design System/.../inspiration_bank/`
   - Brand: `NextDaySteelHub-fresh/PRODUCTION/knowledge/`

### How It Differs from page-factory

| Aspect            | page-factory                     | Local_Workflow                                   |
| ----------------- | -------------------------------- | ------------------------------------------------ |
| Language          | JavaScript (CommonJS)            | TypeScript                                       |
| Phases            | 6 (2 LLM + 4 deterministic)      | 10 (all prompt-driven)                           |
| Quality system    | Ad-hoc thresholds                | 29 scored rules, 100-point scale                 |
| Remediation       | Manual (user fixes, re-runs)     | Automated routing back to correct phase          |
| Rule management   | Hardcoded in verify/slop scripts | Playbook-driven, with change detection           |
| Deployment target | Shopify via Playwright           | Cloudflare Pages                                 |
| Visual design     | Not addressed                    | Dedicated phase (3e) with AI image generation    |
| UX design         | Not addressed                    | Dedicated phase (3f) with interactivity planning |
| Output            | Static HTML pages                | Could produce any format (prompt-driven)         |

---

## Project 4: NDS-WEB-BUILD

**Path:** `c:/Users/avibm/AI SEO & LANDING PAGES/NDS-WEB-BUILD/`
**Status:** Schema components delivered, limited page content

### Architecture

An Astro 5 static site generator (SSG) project with Tailwind CSS, deployed to Cloudflare Pages.

```
NDS-WEB-BUILD/
├── src/
│   ├── components/
│   │   ├── blocks/              # Content components
│   │   │   ├── ComparisonTable.astro
│   │   │   ├── LocalDeliveryProof.astro
│   │   │   ├── OriginalStats.astro
│   │   │   ├── QuickAnswer.astro
│   │   │   └── RegionalProblemsSolutions.astro
│   │   ├── schema/              # 8 Schema.org components
│   │   │   ├── SchemaArticle.astro
│   │   │   ├── SchemaBreadcrumb.astro
│   │   │   ├── SchemaFAQ.astro
│   │   │   ├── SchemaLocalBusiness.astro
│   │   │   ├── SchemaOrganization.astro
│   │   │   ├── SchemaProduct.astro
│   │   │   ├── SchemaWebSite.astro
│   │   │   ├── SchemaWrapper.astro
│   │   │   ├── types.ts
│   │   │   └── index.ts
│   │   └── SchemaGenerator.astro
│   ├── data/
│   │   └── regions.ts           # Regional data
│   ├── layouts/
│   │   ├── BaseLayout.astro
│   │   ├── DashboardLayout.astro
│   │   └── Layout.astro
│   └── pages/
│       ├── index.astro          # Home page
│       ├── infrastructure.astro
│       ├── find-steel-products.astro
│       ├── content/             # Content management pages
│       │   ├── ai-platforms.astro
│       │   ├── off-site.astro
│       │   └── on-site.astro
│       ├── examples/            # Schema implementation examples
│       │   ├── blog-example.astro
│       │   ├── homepage-example.astro
│       │   └── product-example.astro
│       └── [region]/[service].astro  # Dynamic regional pages
```

### Key Features

1. **Schema.org Component Library**: 8 production-ready Astro components for structured data:
   - SchemaFAQ, SchemaLocalBusiness, SchemaOrganization, SchemaBreadcrumb
   - SchemaProduct, SchemaArticle, SchemaWebSite, SchemaWrapper
   - Full TypeScript type definitions
   - Zero runtime overhead (build-time rendering)

2. **Regional Page Routing**: Dynamic `[region]/[service].astro` routes for location-based SEO (e.g., `/london/rebar-delivery`)

3. **Content Block Components**: Reusable Astro components for AI-citation-optimized content patterns:
   - QuickAnswer: Highlighted answer box at top of page
   - ComparisonTable: Side-by-side product comparisons
   - OriginalStats: Proprietary data display
   - LocalDeliveryProof: Regional delivery evidence
   - RegionalProblemsSolutions: Location-specific content

### How It Differs from page-factory

| Aspect           | page-factory                        | NDS-WEB-BUILD                           |
| ---------------- | ----------------------------------- | --------------------------------------- |
| Approach         | Generate HTML from JSON data        | Build pages with Astro components       |
| Hosting          | Shopify pages                       | Cloudflare Pages                        |
| Schema           | JSON files assembled at build time  | Astro components with TypeScript types  |
| Content creation | LLM generates content.json          | Manual/LLM writes Astro pages           |
| Regional SEO     | Not addressed                       | Dynamic `[region]/[service]` routing    |
| Local business   | Explicitly forbidden on guide pages | SchemaLocalBusiness component available |
| Scalability      | 58 pages via batch CLI              | One-at-a-time page authoring            |

---

## Project 5: GENERAL-BEST-PRACTICES

**Path:** `c:/Users/avibm/AI SEO & LANDING PAGES/GENERAL-BEST-PRACTICES/`
**Status:** Complete reference documentation

### Documents (7 files)

| Document                             | Purpose                                                        | Size                                                                               |
| ------------------------------------ | -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **AI-SEO-REQUIREMENTS-CHECKLIST.md** | 14 validated requirements for AI citation optimization         | Research-backed from Semrush, Neil Patel, Yext, Goodie, SE Ranking                 |
| **CLAUDE-ARTEFACT-STANDARDS.md**     | Technical standards for building Claude artifacts              | Schema.org requirements, content structure, accessibility                          |
| **DESIGN-PRINCIPLES-2025-2030.md**   | Cutting-edge UI/UX trends and standards                        | Visual styles (dark mode, glassmorphism), layout patterns, typography, motion      |
| **PAGE-TYPE-DESIGN-PATTERNS.md**     | 9 page type design patterns + 16 advanced interactive patterns | Calculator, Comparison, Wizard, Guide, Reference, Directory, Pricing, FAQ, Landing |
| **SAFETY-FRAMEWORK-TEMPLATE.md**     | Liability-safe content for regulated industries                | Language rules ("typically specified" vs "you should"), disclaimer templates       |
| **SMART-MONITORING-SYSTEM-PLAN.md**  | Architecture plan for artifact monitoring system               | Knowledge base, rule engine, approval workflow, per-artifact monitoring pages      |
| **README.md**                        | Index and usage guide                                          | How to apply best practices to client projects                                     |

### Key Insights from These Docs

1. **AI Citation Rules (14 validated)**:
   - Answer-first format
   - Data-rich content (specific numbers with units)
   - Statistics with sources
   - Tables and structured data
   - Short paragraphs (3-4 sentences)
   - Mobile-first (81% of AI citations from mobile-friendly pages)
   - Query fan-out (standalone sections)
   - 95% educational / 5% soft CTA at end only

2. **9 Page Type Patterns**: Each with specific layout structure, key UI elements, interaction details, and mobile adaptation. The document includes ASCII wireframes for each pattern.

3. **16 Advanced Interactive Patterns** (from artifact analysis):
   - Dark mode toggle with theme object
   - Custom tooltips component
   - Progress indicator
   - Interactive checklist
   - Professional SVG diagrams with gradients/patterns
   - Print button
   - Inline validation with helper text
   - Preset buttons (quick fill)
   - Cost breakdown chart (Recharts)
   - Selectable card pattern
   - Quick answer box
   - Common mistakes (wrong/right pattern)
   - Expandable accordion sections
   - Find professional/directory section
   - CTA section
   - Technical footer with source citations

4. **Smart Monitoring System Plan**: Proposed architecture for autonomous artifact monitoring:
   - Knowledge base with 50+ rules in JSON format
   - Per-artifact compliance scoring
   - Change detection engine (hash comparison + external source monitoring)
   - Approval workflow UI
   - Refresh schedules (quarterly content, monthly links, biannual full review)

---

## Project 6: AI Cite Rules

**Path:** `c:/Users/avibm/AI SEO & LANDING PAGES/NextDaySteelHub-clean/AI Cite Rules/verified-llm-citation-guide.jsx`
**Status:** Published Claude artifact

### What It Is

A single React JSX file (~500+ lines) that renders an interactive LLM citation guide as a Claude artifact. Features dark/light mode toggle, expandable sections with accordions, and verified data citations.

### Verified Data Sources

- AI_SEO_RULEBOOK_v2.md (synthesized from 7 major 2025 studies, 2.5M+ data points)
- RESEARCH-SYNTHESIS-REPORT.md
- David Quaid Podcast: "AI & LLM Visibility: A Practical Guide"
- Relixir Study (July 2025): 50-site analysis of FAQPage schema impact (+173% citation improvement)
- Backlinko, Go Fish Digital, Authority Solutions, Search Engine Land (2025)

### Key Feature

FAQPage schema guidance was CORRECTED based on 2025 research showing +173% citation improvement (contradicting earlier SE Ranking data that suggested pages WITHOUT FAQ got more citations).

---

## Comparison Matrix

| Feature                     | page-factory                   | LLM PAGES UI         | Local_Workflow         | NDS-WEB-BUILD            |
| --------------------------- | ------------------------------ | -------------------- | ---------------------- | ------------------------ |
| **Language**                | JavaScript (CJS)               | TypeScript (Next.js) | TypeScript             | Astro + TS               |
| **Status**                  | Production (58 pages)          | Scaffold only        | Architecture complete  | Schema components done   |
| **LLM integration**         | Claude Code commands           | Planned              | Prompt generator class | None (manual)            |
| **Pipeline stages**         | 6                              | N/A                  | 10                     | N/A                      |
| **Quality scoring**         | Pass/fail thresholds           | N/A                  | 100-point system       | N/A                      |
| **Fact verification**       | 20+ regex extractors           | N/A                  | Prompt-driven          | N/A                      |
| **Slop detection**          | 6 heuristic checks             | N/A                  | Playbook-driven        | N/A                      |
| **Remediation**             | Manual                         | N/A                  | Automated routing      | N/A                      |
| **Schema generation**       | Template assembly              | N/A                  | Prompt-driven          | Astro components         |
| **Deployment target**       | Shopify + Tracker API          | Vercel               | Cloudflare             | Cloudflare Pages         |
| **Client parameterization** | client.json + brand-context.md | N/A                  | External references    | Hardcoded                |
| **Batch operations**        | Yes (all 58 pages)             | N/A                  | Per-page               | Per-page                 |
| **Rule management**         | Hardcoded                      | N/A                  | Playbook + CLI         | N/A                      |
| **Regional SEO**            | No                             | No                   | No                     | Yes ([region]/[service]) |
| **Design system**           | HTML template                  | Tailwind v4          | Referenced externally  | Astro components         |

---

## Architecture Differences

### page-factory (Production Winner)

```
User runs /build-page nds a1-1
    │
    ├── Stage 1: /research (LLM + WebSearch)
    │   └── Writes research.json
    │
    ├── Stage 2: /generate (LLM)
    │   └── Writes content.json
    │
    └── node factory/run.js (deterministic)
        ├── Stage 3: verify (regex fact-check + slop detection)
        ├── Stage 4: assemble (template + content -> HTML)
        ├── Stage 5: qa (schema/content/meta validation)
        └── Stage 6: deploy (tracker API + Shopify Playwright)
```

### Local_Workflow (Most Sophisticated)

```
ContentFactoryWorkflow.run()
    │
    ├── Phase 1: Research (Understand + Gather)
    ├── Phase 2: Plan (Map data to 29 playbook rules)
    ├── Phase 3a-3f: Build (Content, Structure, Signals, Technical, Visual, UX)
    ├── Phase 4: Validate (score /100)
    │   ├── Pass (>= threshold) -> Phase 5
    │   └── Fail -> Phase 4.5 (Remediate)
    │       └── Routes back to failing phase (3a/3b/3c/3d/3e/3f/5)
    │           └── Re-validate (max N loops, then escalate)
    └── Phase 5: Deliver (D1-D6 rules, deploy)
```

### NDS-WEB-BUILD (Component-Based)

```
Astro build
    │
    ├── Static pages from .astro files
    │   ├── Content blocks (QuickAnswer, ComparisonTable, etc.)
    │   └── Schema components (Article, FAQ, Breadcrumb, etc.)
    │
    ├── Dynamic routes: [region]/[service].astro
    │   └── Regional data from regions.ts
    │
    └── Deploy to Cloudflare Pages
```

---

## Unique Features Per Variant

### page-factory Only

- Playwright-based Shopify deployment (automated browser login + TinyMCE injection)
- MD5-based deterministic review rotation (3 reviews per page from pool of 22)
- Tracker API integration for external task management
- Content.json schema with formulaBlocks, comparison tables, statistics cards
- Competitor data in client.json (Travis Perkins, Wickes, Jewson with branch counts, delivery cutoffs)

### Local_Workflow Only

- Playbook-first design (LLM-CITEABILITY-RULES-v2.md as single source of truth)
- Automated remediation routing (failures go back to correct creation phase)
- Rule lifecycle management CLI (detect changes, add rules, check status)
- Hard gates system (3 non-negotiable rules that block deployment)
- Separate Visual Design phase (3e) with AI image generation ("Nano Banana")
- Separate UX Design phase (3f) for interactivity planning
- Phase output chaining (each phase receives previous phases' outputs)

### NDS-WEB-BUILD Only

- Dynamic regional routing (`[region]/[service].astro`)
- Astro schema components with TypeScript type safety
- SchemaLocalBusiness component (forbidden in page-factory's guide pages)
- Content dashboard pages (ai-platforms, off-site, on-site content management)
- Zero-runtime schema injection (build-time only)

### GENERAL-BEST-PRACTICES Only

- Smart Monitoring System Plan (proposed but not built)
- 16 advanced interactive patterns with full code examples
- Safety framework template for regulated industries
- Design brief template (5-step pre-design checklist)
- Artifact workflow guide (4-phase: Design Brief -> Content Spec -> Prompt -> Review)

### AI Cite Rules Only

- Published Claude artifact (live on claude.ai)
- FAQPage schema correction based on Relixir 2025 study (+173% citation improvement)
- Self-contained React component with dark/light mode
- Verified data citations from 7+ studies totaling 2.5M+ data points

---

## Recommendations for Consolidation

If building a unified "LLM Pages Factory" system, the ideal approach combines:

1. **From page-factory**: The proven 6-stage pipeline, fact verification engine, slop detection, Shopify deployment, client parameterization pattern
2. **From Local_Workflow**: The 29-rule scoring system, automated remediation routing, playbook-first architecture, rule lifecycle management
3. **From NDS-WEB-BUILD**: Astro schema components, regional routing, content block library
4. **From GENERAL-BEST-PRACTICES**: The 14 AI SEO requirements, 9 page type patterns, 16 interactive patterns, safety framework
5. **From AI Cite Rules**: The corrected FAQPage schema guidance (+173% improvement), verified citation methodology

The `page-factory` is the only variant that has actually been deployed to production at scale (58 pages on Shopify), making it the most battle-tested foundation.
