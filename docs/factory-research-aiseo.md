# LLM Pages Factory (AI SEO Version) -- Deep Research Report

**Project Path:** `C:\Users\avibm\AI SEO & LANDING PAGES\llm-pages-factory\`
**Researcher:** Claude Agent
**Date:** 2026-02-12

---

## Table of Contents

1. [Product Vision & Mission](#1-product-vision--mission)
2. [Business Model](#2-business-model)
3. [Tech Stack & Architecture](#3-tech-stack--architecture)
4. [The Citeability Playbook (Rules System)](#4-the-citeability-playbook-rules-system)
5. [Workflow Pipeline (11 Phases)](#5-workflow-pipeline-11-phases)
6. [Database Schema](#6-database-schema)
7. [Frontend Implementation](#7-frontend-implementation)
8. [Rule Lifecycle System](#8-rule-lifecycle-system)
9. [What Was Planned vs. Implemented](#9-what-was-planned-vs-implemented)
10. [Key Design Decisions](#10-key-design-decisions)
11. [Dependencies & Versions](#11-dependencies--versions)

---

## 1. Product Vision & Mission

**Name:** LLM Pages Factory

**Mission:** Help businesses get their content CITED by AI assistants (ChatGPT, Perplexity, Claude, Gemini).

**Target Market:**

- Primary: Businesses wanting LLM visibility
- Secondary: SEO agencies, content creators, marketers

**Core Insight:** AI assistants crawl pages and decide whether to cite them. Pages optimized for AI citation get referenced in AI answers. This product automates building pages that maximize citation probability.

---

## 2. Business Model

### Free Tier: Page Analyzer

- User submits a URL
- System crawls and scores the page against LLM citation factors (0-100 score)
- Returns detailed breakdown with per-rule results
- Suggests fixes with priority ranking
- Limited scans/month (5 without signup planned)

### Paid Tier: Factory Builder

- Full 5-stage workflow (11 sub-steps) with AI-assisted content generation
- Real-time streaming output (Vercel AI SDK)
- Rule customization (add/remove/edit)
- Deployment: hosted subdomain OR export code
- Team collaboration

### Pricing (not finalized):

- Starter: $X/month (Y workflows)
- Pro: $X/month (unlimited)
- Enterprise: custom

---

## 3. Tech Stack & Architecture

| Layer           | Technology                                                                               | Purpose                                                   |
| --------------- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Framework       | **Next.js 16** (App Router) + TypeScript                                                 | SSR/SSG, AI crawler visibility                            |
| Styling         | **Tailwind CSS v4**                                                                      | Utility-first                                             |
| UI Components   | **shadcn/ui** (Radix primitives)                                                         | Card, Button, Badge, Dialog, Select, Tabs, Progress, etc. |
| Database        | **Supabase** (PostgreSQL)                                                                | Auth, real-time subscriptions, storage, RLS               |
| Auth            | **Supabase Auth** (not Clerk -- PLAN.md mentions Clerk but implementation uses Supabase) | User auth with middleware                                 |
| AI Engine       | **Claude API** via `@ai-sdk/anthropic` + Vercel AI SDK (`ai` package)                    | Streaming content generation                              |
| Background Jobs | **Inngest**                                                                              | Workflow orchestration, stage execution, event-driven     |
| Form Handling   | **react-hook-form** + **zod**                                                            | Validation                                                |
| Payments        | **Stripe** (planned)                                                                     | Not yet implemented                                       |
| Hosting         | **Vercel** (app) + **Cloudflare Pages** (deployed pages)                                 | CDN                                                       |

### Architecture Flow:

```
Frontend (Next.js 16 + shadcn/ui)
    |
    v
API Layer (Next.js API Routes + Server Actions)
    |
    +---> Supabase (PostgreSQL) -- workspaces, projects, workflows, rules
    +---> Claude API (streaming) -- stage execution, content gen
    +---> Inngest (background) -- workflow orchestration
    +---> Cloudflare (deploy) -- hosted pages output
```

---

## 4. The Citeability Playbook (Rules System)

The playbook is the intellectual core of the product. It contains **29 rules** organized into **5 parts** (4 scoring + 1 anti-patterns), backed by research citations.

### Playbook Versions

- **v2.3** (`playbook/LLM-CITEABILITY-RULES-v2.3.md`) -- Tier-based validation (Gates/Critical/Important/Enhance)
- **v2.4** (`playbook/LLM-CITEABILITY-RULES-v2.4.md`) -- Adds Impact Reference table, Data Density (C3), Source Hierarchy (C5), Quotable Fragments (C8), Anti-Patterns section (Part 4), hard gates G7/G8

### Rule Categories & Points (100 total)

| Part             | Category | Rules         | Points      | Phase |
| ---------------- | -------- | ------------- | ----------- | ----- |
| 1: Structure     | S        | S1-S7         | 25 pts      | 3b    |
| 2: Content       | C        | C1-C11 (v2.4) | 43 pts      | 3a    |
| 3: Signals       | T        | T1-T7         | 15 pts      | 3c    |
| 4: Anti-Patterns | A        | A1-A3         | N/A (gates) | N/A   |
| 5: Delivery      | D        | D1-D6         | 17 pts      | 5     |

### Complete Rule List

**STRUCTURE (S) -- 25 pts:**
| Rule | Name | Points | Impact |
|------|------|--------|--------|
| S1 | Clean Content Zone (`<main>/<article>` isolation) | 10 | -- |
| S2 | Heading Hierarchy (one H1, no skips, question-based) | 8 | +63% (AirOps), +40% question H2s |
| S3 | Semantic Containers (article, section, figure, table, blockquote, time) | 4 | -- |
| S4 | Section Sizing (120-180 words per section) | 3 | +70% (SE Ranking) |
| S5 | Content Depth (2,900+ words pillar, 800+ tool) | conditional | +60% (SE Ranking) |
| S6 | Crawler-Accessible Summary (sr-only block) | recommended | -- |
| S7 | Table of Contents (for 1,500+ words) | conditional | -- |

**CONTENT (C) -- 43 pts:**
| Rule | Name | Points | Impact |
|------|------|--------|--------|
| C1 | Answer Capsule (100-200 chars after H2) | 15 (CRITICAL) | #1 predictor (Search Engine Land) |
| C2 | Data Tables (3+ rows, "Best For" column) | 8 | 4.1x citations (Superprompt) |
| C3 | Data Density (10-20 specific data points) | 7 | +93% (SE Ranking) |
| C4 | Expert Quotes (named, credentialed) | 5 | +71% (SE Ranking) |
| C5 | Source Hierarchy (Tier 1-4 authority levels) | 3 | -- |
| C6 | Proprietary Data (unique = must cite you) | 3 | +30-40% (Averi.ai) |
| C7 | Direct Answer First (answer in first 150 words) | 2 | +67% (Superprompt) |
| C8 | Quotable Fragments (40-60 words, self-contained) | v2.4 enhance | -- |
| C9 | Topic Anchoring (name topic in every section) | 3 | -- |
| C10 | Tool Methodology (for interactive tools) | conditional | -- |
| C11 | Quick Answer Box (40-60 word visible answer) | conditional | -- |

**SIGNALS (T) -- 15 pts:**
| Rule | Name | Points | Impact |
|------|------|--------|--------|
| T1 | Freshness Date (visible `<time>` element) | 5 | 3.2x for <30 days (Seer Interactive) |
| T2 | Structured Data (JSON-LD, @graph, FAQPage/HowTo/Product) | 5 | +28% (Superprompt) |
| T3 | Authority Markers (standards, certs, credentials) | 3 | -- |
| T4 | External Authority Links (standards bodies, govt) | 2 | -- |
| T5 | Author Byline (named, credentialed, bio link) | conditional | -- |
| T6 | Image Alt Text (descriptive, <125 chars) | HARD GATE | -- |
| T7 | Descriptive Link Text (no "click here") | HARD GATE | -- |

**ANTI-PATTERNS (A) -- v2.4 only:**
| Rule | Name | Impact |
|------|------|--------|
| A1 | Warning/Disclaimer Boxes (kills trust signal) | HARD GATE (G8) |
| A2 | Placeholder Images (signals incomplete content) | HARD GATE (G7) |
| A3 | Keyword Stuffing (unnatural repetition) | -111% to -137% (SE Ranking) |

**DELIVERY (D) -- 17 pts:**
| Rule | Name | Points | Impact |
|------|------|--------|--------|
| D1 | AI Bot Detection (GPTBot, ClaudeBot, etc.) | 3 | -- |
| D2 | AI-Native Payload (Markdown + YAML to bots) | 7 | 99% token reduction |
| D3 | Content Source Architecture (markdown-first) | 4 | -- |
| D4 | Speed (FCP <0.4s optimal) | 3 | +219% (SE Ranking) |
| D5 | Pre-rendered Content (SSR/SSG, no JS-only) | HARD GATE | -- |
| D6 | Crawler Access (robots.txt, llms.txt) | recommended | -- |

### Validation Tiers (v2.3+)

```
GATES (binary pass/fail) -> CRITICAL (all 4 must be present) -> IMPORTANT (3/5 minimum) -> ENHANCE (optional)
```

- **Gates** (G1-G8): No fabrication, pre-rendered, main content zone, FCP <3s, alt text, descriptive links, no placeholders, no warning boxes
- **Critical** (C1-C4): Answer capsule, data table, data density, expert quote
- **Important** (I1-I5): FAQPage schema, freshness date, topic anchoring, authority links, question headings
- **Enhance** (E1-E7): sr-only summary, FCP <0.4s, proprietary data, TOC, llms.txt, author byline, quotable fragments

**Decision Logic:**

```
IF any gate fails -> REJECT
ELSE IF critical < 4 -> REJECT
ELSE IF important < 3 -> REVIEW
ELSE -> DEPLOY
```

### Dual-Serving Architecture (D1-D2)

Pages serve DIFFERENT content to humans vs AI bots:

- **Humans**: Full HTML with nav, footer, CSS, JS (~200KB)
- **AI bots**: Clean Markdown + YAML frontmatter (~5KB = 99% token reduction)

Bot detection via User-Agent matching: GPTBot, ChatGPT-User, PerplexityBot, ClaudeBot, Claude-Web, anthropic-ai, Google-Extended, Amazonbot, meta-externalagent.

---

## 5. Workflow Pipeline (11 Phases)

The workflow system is implemented as a **TypeScript prompt orchestrator** in `workflow/`. Each phase generates a prompt to send to Claude, processes the output, and feeds it to the next phase.

### Phase Architecture

```
Phase 1: Research       -> Understand topic, gather data, stats, quotes, sources
Phase 2: Plan           -> Map gathered data TO playbook requirements
Phase 3a: Build Content -> Apply C1-C9 (43 pts) -- write sections, capsules, tables
Phase 3b: Build Structure -> Apply S1-S7 (25 pts) -- semantic HTML, heading hierarchy
Phase 3c: Build Signals  -> Apply T1-T7 (15 pts) -- JSON-LD, freshness, authority
Phase 3d: Technical Review -> Verify claims against BS/NHBC/CARES standards
Phase 3e: Visual Design  -> Plan + generate images via Nano Banana (Gemini)
Phase 3f: UX Design      -> Define inputs, logic, outputs for interactivity
Phase 4: Validate        -> Check all 29 rules, score /100
Phase 4.5: Remediate     -> Fix failures, route to correct phase (up to 3 loops)
Phase 5: Deliver         -> Apply D1-D6, deploy to Cloudflare
```

### Key Phase Details

**Phase 1 (Research):** Two parts:

1. UNDERSTAND -- topic definition, audience segments, primary question, 8+ secondary questions
2. GATHER -- native data points, common information, 5+ authoritative sources, 10+ statistics, expert statements, gap identification

**Phase 2 (Plan):** Maps gathered data to every playbook rule. Output includes:

- Content mapping (what fills C1-C9)
- Structure mapping (H1, sections, word targets)
- Signals mapping (schema types, author byline, external links)
- Gaps summary (what's missing, impact, can we proceed?)

**Phase 3a (Build Content):** Writes all content using ONLY gathered data. Non-negotiable accuracy rules: every stat must come from Phase 1 gather, gaps marked as `[GAP: reason]`, never fabricate.

**Phase 3b (Build Structure):** Wraps content in semantic HTML: `<main>`, `<article>`, `<section>`, `<figure>`, `<table>`, `<blockquote>`, `<time>`. Generates sr-only summary and TOC.

**Phase 3c (Build Signals):** Adds JSON-LD schema (@graph with FAQPage, WebPage, Organization), freshness dates, authority markers, external links. Checks hard gates: image alt text and descriptive link text.

**Phase 3d (Technical Review):** Verifies ALL technical claims against authoritative sources (BS standards, NHBC, CARES). 100% verification required. Pricing compliance checks (ex VAT, "from" format).

**Phase 3e (Visual Design):** Uses Nano Banana MCP tool (Gemini) for image generation. Multi-turn iteration until images match intent. Brand color compliance (#1e3a5f navy, #f97316 orange). Can skip images if page type doesn't need them.

**Phase 3f (UX Design):** Defines interactive features (calculators, selectors, wizards, filters). Includes inputs, presets, logic (JS), outputs, validation rules, tooltips, responsive behavior, accessibility (ARIA labels, keyboard nav).

**Phase 4 (Validate):** Scores against all 29 rules. Checks hard gates first, then calculates points breakdown: Structure/Content/Signals/Delivery. Thresholds: 90+ Excellent, 75-89 Good, 60-74 Fair, <60 Poor.

**Phase 4.5 (Remediate):** Routes failures back to correct phase:

- C rules -> Phase 3a
- S rules -> Phase 3b
- T rules -> Phase 3c
- D rules -> Phase 5
- Max 3 remediation loops before escalating to user

**Phase 5 (Deliver):** Implements bot detection, AI-native payload (Markdown+YAML), content source architecture, speed optimizations, pre-rendering, crawler access. Generates 3 deliverables: index.html, content.md, schema.json. Deploys to Cloudflare Pages.

### Workflow Orchestrator (`workflow/index.ts`)

```typescript
class ContentFactoryWorkflow {
  // Runs all phases sequentially
  // Phase 4 + 4.5 loop for validation/remediation
  // Max 3 remediation attempts before escalation
  // Returns WorkflowResult with score, phases, deployment URL
}
```

Key interfaces:

- `WorkflowConfig`: topic, pageType, targetAudience, maxRemediationLoops
- `WorkflowResult`: success, finalScore, deploymentUrl, phases[], remediationAttempts, escalated
- `WorkflowContext`: topic, pageType, phaseOutputs (Record<string, unknown>), validationAttempts

---

## 6. Database Schema

**Location:** `supabase/migrations/001_initial_schema.sql`

### Tables

| Table               | Purpose                    | Key Fields                                                                                                     |
| ------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `workspaces`        | Organizations              | id, name, slug, plan (free/starter/pro/enterprise), stripe_customer_id                                         |
| `workspace_members` | User-workspace mapping     | workspace_id, user_id (Supabase auth), role (owner/admin/member)                                               |
| `projects`          | Websites/campaigns         | workspace_id, name, domain                                                                                     |
| `analyses`          | Free tier URL scans        | project_id, user_id, url, score (0-100), checks (JSONB)                                                        |
| `workflows`         | Factory runs               | project_id, name, topic, page_type, status, current_stage (decimal), deployed_url                              |
| `workflow_stages`   | Individual stage results   | workflow_id, stage_number (decimal 1.1-5.2), stage_name, status, output (JSONB), gate_passed, gate_mode        |
| `validation_rules`  | Customizable per workspace | workspace_id, rule_id, name, points, enabled, is_platform_rule, check_type (regex/llm/custom), fix_instruction |
| `stage_definitions` | Customizable per workspace | workspace_id, stage_number, stage_name, ai_prompt, gate_mode_default                                           |
| `audit_logs`        | Activity tracking          | workspace_id, workflow_id, user_id, action, details (JSONB)                                                    |

### Security

- Row Level Security (RLS) enabled on ALL tables
- Policies enforce workspace membership checks
- New user signup trigger automatically creates default workspace
- Platform validation rules (10 default rules) seeded with workspace_id=NULL

### Gate Modes

- **manual**: AI pauses, shows output, waits for user approval
- **auto**: AI checks gate criteria, proceeds if pass
- **hybrid**: Auto for technical gates, manual for content gates

---

## 7. Frontend Implementation

### Route Structure

**Public (no auth):**

- `/` -- Landing page with hero, features, validation rules preview, CTA
- `/analyze` -- Free URL analyzer (client-side, mock results currently)
- `/login`, `/signup` -- Supabase auth

**Dashboard (auth required):**

- `/dashboard` -- Workspace overview (projects count, active workflows, deployed pages, plan info)
- Route group layout with sidebar (`app-sidebar.tsx`)

### Component Library

Full shadcn/ui setup with components: Badge, Button, Card, Checkbox, Dialog, Dropdown Menu, Form, Input, Label, Progress, Select, Separator, Sheet, Sidebar, Skeleton, Slider, Tabs, Tooltip

### Current State

- Landing page: Fully built with hero, features, validation rules preview, CTA
- Analyzer page: UI built, uses mock data (no actual crawling API yet)
- Dashboard: Basic stats cards and quick start guide, no real data
- Workflow execution UI: NOT built yet (planned with real-time streaming)

---

## 8. Rule Lifecycle System

### Files

- `workflow/RULE-PHASE-MAP.ts` -- Central source of truth for rule->phase relationships
- `workflow/utils/rule-update-handler.ts` -- Detects changes between playbook versions via snapshots
- `workflow/utils/rule-addition-handler.ts` -- Handles adding new rules with routing/integration
- `workflow/cli.ts` -- CLI for rule management

### CLI Commands

```bash
npx ts-node workflow/cli.ts detect   # Detect playbook changes
npx ts-node workflow/cli.ts apply    # Save new snapshot
npx ts-node workflow/cli.ts status C3  # Check rule status
npx ts-node workflow/cli.ts next C     # Get next available ID
npx ts-node workflow/cli.ts phases S2  # Show affected phases
```

### Rule Change Detection

- Snapshots stored in `.snapshots/` directory
- Compares current playbook content hash vs last snapshot
- Generates impact report showing which phases need re-running
- Supports: add, modify, remove, points change

### Rule Addition Flow

```typescript
addRule('C', 'Video Embed', 4, 'Include relevant video', [...requirements]);
// Returns: ruleId (auto-assigned), targetPhase, playbookPatch (markdown to copy)
```

---

## 9. What Was Planned vs. Implemented

### IMPLEMENTED:

| Component                          | Status   | Notes                                                                    |
| ---------------------------------- | -------- | ------------------------------------------------------------------------ |
| Playbook rules (v2.3 + v2.4)       | COMPLETE | 29+ rules with research citations                                        |
| Workflow orchestrator (TypeScript) | COMPLETE | All 11 phases with prompt generators                                     |
| Phase prompt generators (1-5)      | COMPLETE | Full prompts with rule injection                                         |
| Validation + remediation loop      | COMPLETE | Tier-based scoring, 3 remediation attempts                               |
| Rule lifecycle system              | COMPLETE | CLI, update detection, addition handler                                  |
| Rule-Phase relationship map        | COMPLETE | Central source of truth                                                  |
| Supabase schema + migrations       | COMPLETE | 9 tables with RLS                                                        |
| Landing page UI                    | COMPLETE | Hero, features, rules preview                                            |
| Analyzer page UI                   | PARTIAL  | UI built, mock data only                                                 |
| Dashboard UI                       | PARTIAL  | Stats cards, no real data                                                |
| Supabase auth integration          | COMPLETE | Login/signup, middleware, server/client clients                          |
| Inngest workflow function          | PARTIAL  | Orchestrator with stage execution skeleton, placeholder `executeStage()` |
| TypeScript types                   | COMPLETE | All stage output types, database types                                   |

### NOT YET IMPLEMENTED:

| Component                        | Status      | Notes                                            |
| -------------------------------- | ----------- | ------------------------------------------------ |
| Actual URL crawling/scoring API  | NOT STARTED | Analyzer page uses mock data                     |
| Claude API integration in stages | NOT STARTED | `executeStage()` returns placeholder data        |
| Real-time streaming UI           | NOT STARTED | Planned with Vercel AI SDK                       |
| Workflow execution UI            | NOT STARTED | The 5-stage visual stepper with streaming output |
| Stripe billing                   | NOT STARTED | Planned for paid tier                            |
| Cloudflare deployment            | NOT STARTED | Deployment commands defined but not wired        |
| Image generation (Nano Banana)   | NOT STARTED | Prompts designed, MCP tool not connected         |
| Export code option               | NOT STARTED | Deferred to Phase 2                              |
| Custom rules UI                  | NOT STARTED | Deferred to Phase 2                              |
| Team/multi-user                  | NOT STARTED | Deferred to Phase 2                              |
| Analytics dashboard              | NOT STARTED | Deferred to Phase 2                              |

### Gap Analysis

The project has a **complete prompt engineering system** (the workflow orchestrator with all 11 phase prompts) and a **comprehensive rule system** (playbook + lifecycle management), but the **actual AI execution** (calling Claude API, processing streaming responses, rendering results) is all stubbed out. The Inngest workflow function has the structure but uses placeholder `executeStage()` that returns empty objects.

---

## 10. Key Design Decisions

### 1. Playbook-First Design

Rules drive creation, not just validation. The playbook is the "single source of truth" -- the workflow reads it, generates prompts from it, and validates against it.

### 2. UNDERSTAND-then-GATHER Research Pattern

Phase 1 splits into understanding the topic BEFORE gathering data. This prevents research from being unfocused.

### 3. Accuracy-First Content Generation

Every fact must trace back to a gathered source. Gaps are explicitly marked as `[GAP: reason]` rather than fabricated. "Write ONLY what you can source. Gaps are better than fabrication."

### 4. Tier-Based Validation (not Point-Based)

v2.3+ replaced arbitrary 100-point scoring with clear tiers: Gates (binary) -> Critical (must have) -> Important (aim for all) -> Enhance (nice to have). Simpler logic, no arbitrary math.

### 5. Dual-Serving Architecture

Same page serves different content to humans (full HTML) vs AI bots (clean Markdown). 99% token reduction for AI crawlers.

### 6. Remediation Loop

Failed validation routes back to the correct build phase (C->3a, S->3b, T->3c, D->5) for up to 3 attempts before escalating to the user.

### 7. Inngest for Orchestration

Background job processing allows long-running workflows with manual gate approval (up to 7 days timeout). Event-driven: workflow/started, workflow/stage.approved, workflow/stage.regenerate.

### 8. Supabase Auth (not Clerk)

PLAN.md mentioned Clerk, but implementation uses Supabase Auth directly with middleware session management.

---

## 11. Dependencies & Versions

### Production Dependencies

```json
{
  "@ai-sdk/anthropic": "^2.0.53", // Claude API integration
  "@supabase/ssr": "^0.8.0", // Supabase SSR helpers
  "@supabase/supabase-js": "^2.87.0", // Supabase client
  "ai": "^5.0.108", // Vercel AI SDK
  "inngest": "^3.47.0", // Background job orchestration
  "next": "16.0.7", // Next.js framework
  "react": "19.2.0", // React
  "react-dom": "19.2.0", // React DOM
  "react-hook-form": "^7.68.0", // Form handling
  "zod": "^4.1.13", // Schema validation
  "lucide-react": "^0.556.0", // Icons
  "class-variance-authority": "^0.7.1", // CVA for component variants
  "clsx": "^2.1.1", // Class utilities
  "tailwind-merge": "^3.4.0" // Tailwind class merging
}
```

### Dev Dependencies

```json
{
  "@tailwindcss/postcss": "^4", // Tailwind CSS v4
  "tailwindcss": "^4", // Tailwind CSS v4
  "typescript": "^5", // TypeScript
  "eslint": "^9", // ESLint
  "eslint-config-next": "16.0.7", // Next.js ESLint config
  "tw-animate-css": "^1.4.0" // Tailwind animations
}
```

### Key Version Notes

- **Next.js 16** (latest -- uses App Router exclusively)
- **React 19.2** (latest)
- **Tailwind CSS v4** (latest -- PostCSS-based)
- **Zod v4** (latest)
- **Vercel AI SDK v5** (latest)

---

## Summary

The LLM Pages Factory (AI SEO version) is a **comprehensive but partially-built SaaS product** for creating AI-citation-optimized web pages. Its strongest completed assets are:

1. **The Citeability Playbook** (v2.3/v2.4) -- a research-backed rule system with 29+ rules across Structure, Content, Signals, Anti-Patterns, and Delivery categories
2. **The Workflow Orchestrator** -- an 11-phase TypeScript prompt generation pipeline that reads the playbook and produces structured prompts for each build phase
3. **The Rule Lifecycle System** -- CLI tooling for adding/updating/removing rules with automatic phase impact detection
4. **The Database Schema** -- a complete Supabase schema with 9 tables, RLS policies, and auto-workspace creation

What remains to build is the **execution layer** -- actually calling Claude API with these prompts, streaming results to the UI, and deploying generated pages. The Inngest-based orchestration skeleton exists but uses placeholder data.
