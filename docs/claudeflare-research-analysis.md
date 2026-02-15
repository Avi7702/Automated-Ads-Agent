# ClaudeFLARE Research Analysis — Cloudflare Architecture Patterns Extracted from Factory Research

**Date:** 2026-02-13
**Source:** 13 factory-research documents in `docs/`
**Purpose:** Extract every Cloudflare-related architecture pattern, deployment workflow, code example, and design decision for the Automated Ads Agent migration

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Cloudflare Services Used Across Projects](#2-cloudflare-services-used-across-projects)
3. [D1 Database Patterns](#3-d1-database-patterns)
4. [R2 Storage Patterns](#4-r2-storage-patterns)
5. [KV Namespace Patterns](#5-kv-namespace-patterns)
6. [Workers & Pages Patterns](#6-workers--pages-patterns)
7. [Durable Objects Patterns](#7-durable-objects-patterns)
8. [AI Gateway Patterns](#8-ai-gateway-patterns)
9. [Deployment & Wrangler Patterns](#9-deployment--wrangler-patterns)
10. [Hono / Framework Patterns](#10-hono--framework-patterns)
11. [Authentication & Security on Cloudflare](#11-authentication--security-on-cloudflare)
12. [Cost & Scaling Considerations](#12-cost--scaling-considerations)
13. [Naming Conventions & Methodology](#13-naming-conventions--methodology)
14. [Migration Recommendations for Automated Ads Agent](#14-migration-recommendations-for-automated-ads-agent)

---

## 1. Executive Summary

Across 13 factory-research documents, **three distinct Cloudflare-native projects** were analyzed in detail, plus several partial implementations. The Cloudflare stack appears consistently as the preferred edge deployment target. Here is what was found:

### Projects Using Cloudflare

| Project                         | Stack                                        | Cloudflare Services                                                        | Status                         |
| ------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------ |
| **NextDaySteelHub (NDS)**       | React + Cloudflare Pages Functions + D1 + R2 | Pages, D1, R2, KV, AI Gateway, Workers, Durable Objects, Browser Rendering | Production (archived Jan 2026) |
| **Hebrew Image (manus-deploy)** | Next.js 16 on Cloudflare Pages               | Pages, D1, R2, KV, Workers AI                                              | Active development             |
| **NDS-WEB-BUILD**               | Astro 5 + Tailwind                           | Cloudflare Pages                                                           | Schema components delivered    |
| **LLM Pages Factory**           | Next.js 16 + Supabase + Inngest              | Cloudflare Pages (deployment target only)                                  | Abandoned prototype            |
| **page-factory**                | Node.js CLI                                  | Shopify deployment (not Cloudflare)                                        | Production (58 pages)          |
| **Local_Workflow**              | TypeScript orchestrator                      | Cloudflare Pages (Phase 5 delivery)                                        | Architecture only              |
| **industrial-seo-factory**      | Claude Code plugin                           | Cloudflare deployment scripts                                              | QA tooling only                |

### Key Finding

The **NDS Content Factory** (NextDaySteelHub-archive) is the most comprehensive Cloudflare implementation, using nearly every Cloudflare service: Pages, Workers, D1, R2, KV, Durable Objects, AI Gateway, Workflows, and Browser Rendering. This is the primary source of Cloudflare patterns.

---

## 2. Cloudflare Services Used Across Projects

### Complete Resource Inventory (NDS Production)

| Resource               | Type              | Identifier                             | Purpose                                     |
| ---------------------- | ----------------- | -------------------------------------- | ------------------------------------------- |
| `nds-tracker-9la`      | Cloudflare Pages  | Dashboard frontend                     | Task tracking UI                            |
| `nds-workflow-worker`  | Cloudflare Worker | Content factory backend                | 11-stage pipeline                           |
| `nds-tracker-db`       | D1 Database       | `c8d5cd53-e71c-480c-9352-9601ef0baf22` | All data storage                            |
| `nds-tracker-files`    | R2 Bucket         | File storage                           | Brand context, templates, images            |
| `PRERENDER_CACHE`      | KV Namespace      | `733c09c2251d445b81ba774583ff9b6b`     | AI crawler prerender cache                  |
| `nds-workflow-gateway` | AI Gateway        | LLM routing                            | Rate limiting + observability for API calls |
| `nds-prerender`        | Worker            | AI crawler prerendering                | Headless Chrome via Browser Rendering       |
| `FactoryController`    | Durable Object    | Per-task WebSocket                     | Real-time dashboard updates                 |
| `PageFreshnessManager` | Durable Object    | Per-page freshness loop                | Monthly content refresh                     |
| `GeminiRateLimiter`    | Durable Object    | Global rate limiter                    | 20 RPM Gemini coordination                  |
| `InjectionQueue`       | Durable Object    | Claude Code bypass                     | Async response injection                    |

### Hebrew Image Resources

| Resource               | Type         | Purpose                                      |
| ---------------------- | ------------ | -------------------------------------------- |
| `hebrew-image-db`      | D1 Database  | Users, projects, images, credit transactions |
| `hebrew-image-storage` | R2 Bucket    | Generated image storage                      |
| `CACHE`                | KV Namespace | Caching and rate limiting                    |
| Workers AI             | AI Binding   | Image generation (backup to Gemini)          |

---

## 3. D1 Database Patterns

### 3.1 Environment Binding Pattern

Both projects declare D1 via `wrangler.toml` and type it in a `cloudflare.d.ts` file:

```typescript
// cloudflare.d.ts
interface CloudflareEnv {
  DB: D1Database;
  IMAGES: R2Bucket;
  CACHE: KVNamespace;
  AI: Ai;
  ENVIRONMENT: string;
}
```

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "hebrew-image-db"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 3.2 Raw SQL D1Service Class Pattern (Hebrew Image)

From `factory-research-manus.md` -- a clean class-based pattern for D1 without ORM:

```typescript
// lib/infra/d1-client.ts
class D1Service {
  constructor(private db: D1Database) {}

  // Full CRUD for users, projects, images, credits
  // Batch operations for atomic credit updates (deduct + record transaction)
  // Type-safe interfaces for all entities
  // Boolean mapping: Boolean(row.completed) since D1 stores 0/1
}
```

Key patterns:

- UUID generation via `crypto.randomUUID()`
- Snake_case DB columns mapped to camelCase TypeScript
- Dynamic UPDATE query builder (only sets provided fields)
- Atomic claim/release with 30-minute expiry

### 3.3 Factory Function Storage Pattern (NDS Dashboard)

From `factory-research-nds-design.md`:

```typescript
// lib/storage.ts
export function createStorage(db: D1Database) {
  return {
    getAllTasks(): Promise<Task[]>,
    getTask(id: string): Promise<Task | undefined>,
    getTaskByTaskId(taskId: string): Promise<Task | undefined>,
    createTask(task: {...}): Promise<Task>,
    updateTask(id: string, task: Partial<{...}>): Promise<Task>,
    // ... 12+ more methods
  };
}
```

### 3.4 D1 Schema Design (Hebrew Image)

```sql
-- schema.sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  avatar_url TEXT,
  credits INTEGER DEFAULT 10,
  plan TEXT DEFAULT 'free' CHECK(plan IN ('free','basic','pro','business')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  thumbnail_url TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE images (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  prompt TEXT,
  user_input TEXT,
  style TEXT,
  hebrew_text TEXT,
  image_url TEXT,
  r2_key TEXT,
  model TEXT DEFAULT 'lucid-origin',
  width INTEGER,
  height INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  amount INTEGER NOT NULL,
  type TEXT CHECK(type IN ('purchase','usage','bonus','refund')),
  description TEXT,
  image_id TEXT REFERENCES images(id),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3.5 NDS Content Factory Schema (Referenced Tables)

From `factory-research-nds-workflows.md`:

| Table                | Purpose                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| `tasks`              | Task tracking (status, current_stage, progress, deployed_url, shopify_content) |
| `stage_runs`         | Per-stage execution log (output_json, llm_cost_usd, status)                    |
| `pages`              | Deployed HTML pages                                                            |
| `workflow_issues`    | HITL issues for human review                                                   |
| `workflow_config`    | Runtime config overrides per stage                                             |
| `global_config`      | Global settings (e.g., total_budget_usd)                                       |
| `prompt_versions`    | A/B testing for stage prompts                                                  |
| `injection_payloads` | Large injection payloads (>120KB)                                              |
| `llm_call_log`       | Detailed LLM call logging                                                      |

### 3.6 Dual Database Strategy

Hebrew Image uses a dual approach:

- **Production:** Cloudflare D1 (SQLite on the edge) via raw SQL in `D1Service`
- **Development:** Local `better-sqlite3` via Drizzle ORM with WAL mode
- Both share similar schemas but use different access patterns

### 3.7 Auto-Seeding Pattern

From NDS Dashboard: Database auto-seeds on first request:

```typescript
// In GET /api/tasks handler
await seedDatabase(context.env.DB);
```

---

## 4. R2 Storage Patterns

### 4.1 R2 Bucket Organization

From `factory-research-manus.md` -- Hebrew Image R2 structure:

```
users/{userId}/images/{imageId}.{extension}
```

### 4.2 R2Service Class Pattern

```typescript
// lib/infra/r2-client.ts
class R2Service {
  constructor(private bucket: R2Bucket) {}

  // Upload raw bytes or base64 data URLs
  // 1-year cache headers: public, max-age=31536000
  // Custom metadata: userId, imageId, uploadedAt
  // List user images, calculate storage usage
  // Public URL resolution (custom domain or /api/images/ fallback)
}
```

### 4.3 NDS Content Factory R2 Usage

From `factory-research-nds-workflows.md`:

- **Brand context loaded from R2:** `loadBrandContext(bucket)` loads `NDS-BRAND-VOICE.md` + `NDS-BRAND-GUIDELINES.md` with hardcoded fallback if R2 fails
- **HTML templates stored in R2:** 4 templates (default, brutalist, terminal, guide) selected via `hash(taskId) % 4`
- **Image storage** in R2 bucket `nds-tracker-files`

### 4.4 R2 Binding Pattern

```toml
# wrangler.toml
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "hebrew-image-storage"
```

---

## 5. KV Namespace Patterns

### 5.1 Prerender Cache (NDS)

From `factory-research-nds-evolution.md`:

| Resource          | Type         | ID                                 |
| ----------------- | ------------ | ---------------------------------- |
| `PRERENDER_CACHE` | KV Namespace | `733c09c2251d445b81ba774583ff9b6b` |

Used by `nds-prerender` Worker for caching AI crawler-rendered pages via headless Chrome (Cloudflare Browser Rendering).

### 5.2 Hebrew Image KV

```toml
# wrangler.toml
[[kv_namespaces]]
binding = "CACHE"
id = "placeholder"
```

Used for caching and rate limiting with TTL-based expiration.

### 5.3 KV Usage Pattern

From research: KV is best for:

- Rate limiting counters
- Prerender cache (HTML pages for AI crawlers)
- Session data
- Feature flags
- Configuration that changes infrequently

---

## 6. Workers & Pages Patterns

### 6.1 Cloudflare Pages Functions (File-Based Routing)

From `factory-research-nds-design.md` -- NDS Dashboard uses Cloudflare Pages Functions:

```
functions/
  _middleware.ts           -- CORS headers for /api/ routes
  [[path]].ts              -- Catch-all HTML content server
  api/
    tasks/
      index.ts             -- GET (list) / POST (create)
      [taskId].ts          -- GET / PATCH / DELETE
      [taskId]/
        approve.ts         -- POST approval
        validate.ts        -- POST validation
        trigger.ts         -- POST workflow trigger
        stages/index.ts    -- Stage management
        ...20+ more endpoints
    reconciliation/
      tasks.ts
      scan-selected.ts
      deploy-approved.ts
    costs/
      index.ts
      [taskId].ts
    prompts/
      [stageNumber].ts
```

### 6.2 Pages Functions Env Interface

```typescript
interface Env {
  DB: D1Database;
  BUCKET: R2Bucket;
  AI: Ai;
  WORKFLOW_WORKER: Fetcher; // Service binding to workflow worker
}
```

### 6.3 Catch-All Content Serving

From `factory-research-nds-design.md` -- `[[path]].ts` serves HTML from D1:

1. Slug mapping -- hardcoded map of URL slugs to taskIds
2. Pages table -- check `pages` table first (workflow-generated)
3. Tasks table -- fallback to `tasks` table (legacy)
4. Dynamic lookup -- search by `deployed_url` LIKE pattern

Response: `Content-Type: text/html`, `Cache-Control: public, max-age=60`

### 6.4 CORS Middleware

```typescript
// functions/_middleware.ts
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type
```

### 6.5 Cloudflare Pages Deployment Config

From `factory-research-manus.md`:

```toml
# wrangler.toml
name = "hebrew-image"
compatibility_date = "2026-02-03"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

### 6.6 Content Factory Worker

From `factory-research-nds-workflows.md` -- the workflow worker uses:

```typescript
class ContentFactoryWorkflow extends WorkflowEntrypoint<Env, WorkflowParams> {
  async run(event, step) {
    /* 11-stage pipeline */
  }
}
```

Environment bindings:

- `DB: D1Database`
- `BUCKET: R2Bucket`
- `OPENAI_API_KEY`, `GEMINI_API_KEY`
- `AI_GATEWAY_URL`, `AI_GATEWAY_ID`, `CF_AIG_TOKEN`
- `CONTENT_FACTORY: Workflow` (self-reference)
- `PAGE_FRESHNESS: DurableObjectNamespace`
- `INJECTION_QUEUE: DurableObjectNamespace`
- `GEMINI_RATE_LIMITER: DurableObjectNamespace`
- `FACTORY_CONTROLLER: DurableObjectNamespace`

### 6.7 Worker for AI Crawler Prerendering

`nds-prerender` Worker uses Cloudflare Browser Rendering (headless Chrome) to prerender pages for AI crawlers. Results cached in KV namespace `PRERENDER_CACHE`.

### 6.8 Protected Fields Pattern

From NDS Dashboard PATCH endpoint:

```typescript
const protectedFields = ['score', 'current_stage', 'approved_at', 'approved_by'];
const protectedStatuses = ['Approved', 'Preview', 'Published'];

// Returns 403 with hints for the correct API:
// score -> POST /api/tasks/:id/validate
// current_stage -> PATCH /api/tasks/:id/stages
// Approved -> POST /api/tasks/:id/approve
```

---

## 7. Durable Objects Patterns

### 7.1 FactoryController (Real-Time WebSocket)

From `factory-research-nds-workflows.md`:

One instance per task. Uses Hibernation API for zero-cost idle.

```
Endpoints:
  GET /ws      -- WebSocket upgrade for dashboard clients
  POST /notify -- Stage update from workflow (internal)
  GET /clients -- Debug: count connected clients
```

Pattern: Workflow sends stage updates via POST; DO broadcasts to all connected WebSocket clients.

### 7.2 PageFreshnessManager (Alarm-Based Loop)

Monthly content freshness loop per deployed page:

1. Arms alarm for 30 days after deployment
2. Wakes to update freshness signals (dateModified, year references)
3. Re-deploys updated HTML
4. Re-arms for next 30-day cycle (infinite loop)

Endpoints: `/init`, `/status`, `/pause`, `/resume`, `/trigger`

### 7.3 GeminiRateLimiter (Global Coordination)

Global rate limiter for Gemini API calls across all concurrent workflow sessions:

- 20 RPM limit with 3.5s interval (safety margin)
- Runtime-configurable

Endpoints: `/acquire`, `/backoff`, `/status`, `/config`

### 7.4 InjectionQueue (Async Handoff)

Queue for Claude Code bypass mode:

- Large payloads (>120KB) stored in D1 `injection_payloads` table
- Small payloads stored inline in DO storage
- Operations: enqueue, dequeue, status, remove

---

## 8. AI Gateway Patterns

### 8.1 BYOK (Bring Your Own Keys) Through AI Gateway

From `factory-research-nds-workflows.md`:

```typescript
// All API calls go through Cloudflare AI Gateway
// Authentication via cf-aig-authorization header
const headers = {
  'cf-aig-authorization': env.CF_AIG_TOKEN,
  'Content-Type': 'application/json',
};
```

### 8.2 API Client Architecture

```typescript
// workflows/lib/api-client.ts
callGeminiWithGrounding(); // enables Google Search grounding
callAnthropic(); // standard Anthropic calls
callOpenAI(); // standard OpenAI calls
callGemini(); // standard Gemini calls
callAnthropicWithLogging(); // with LLM call context logging
```

Features:

- AbortController with timeouts: DEFAULT=25s, LONG=90s, CONTENT=180s
- Subrequest tracking (API, D1, R2) for debugging Cloudflare limits

### 8.3 Multi-Model Fallback Chain

Every AI stage has a fallback chain routed through AI Gateway:

- Primary -> Fallback 1 -> Fallback 2
- Research stages: Gemini (grounded) -> GPT-5.2 -> Claude Sonnet
- Design/content stages: Claude -> GPT-5.2

---

## 9. Deployment & Wrangler Patterns

### 9.1 Wrangler Configuration (Hebrew Image)

```toml
name = "hebrew-image"
compatibility_date = "2026-02-03"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"

[[d1_databases]]
binding = "DB"
database_name = "hebrew-image-db"
database_id = "..."

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "hebrew-image-storage"

[[kv_namespaces]]
binding = "CACHE"
id = "..."

[ai]
binding = "AI"
```

### 9.2 Wrangler Configuration (NDS Dashboard)

From `factory-research-nds-design.md`:

```toml
# 33-line wrangler.toml for Cloudflare Pages project
```

Uses Wrangler v4.54.0 with pnpm package manager.

### 9.3 Next.js on Cloudflare Pages

Hebrew Image pattern: Build with Next.js, output to `.vercel/output/static`, deploy to Cloudflare Pages via `wrangler pages deploy`.

### 9.4 Astro on Cloudflare Pages

NDS-WEB-BUILD uses Astro 5 SSG deployed to Cloudflare Pages -- zero-runtime schema injection at build time.

### 9.5 Cloudflare Pages Direct Upload API

From `factory-research-original.md` -- LLM Pages Factory deployment module:

```typescript
// lib/deploy/cloudflare.ts (177 lines)
// - Create project / check project existence
// - Deploy HTML as FormData
// - Poll deployment status (active/building/failed)
// - URL: https://{projectName}.pages.dev/{slug}
// - Single-file deployment (index.html per slug)
```

---

## 10. Hono / Framework Patterns

### 10.1 No Hono Found

**Important finding:** None of the 13 factory-research documents mention Hono. The projects use:

- **NDS Dashboard:** Cloudflare Pages Functions (file-based routing, no framework)
- **Hebrew Image:** Next.js 16 App Router on Cloudflare Pages
- **NDS-WEB-BUILD:** Astro 5 on Cloudflare Pages
- **LLM Pages Factory:** Next.js 16 on Vercel (Cloudflare for deployment target only)
- **NDS Content Factory Worker:** Raw Cloudflare Worker with `WorkflowEntrypoint` class

### 10.2 Framework Choices Observed

| Project                | Framework                      | Reason                                         |
| ---------------------- | ------------------------------ | ---------------------------------------------- |
| NDS Dashboard          | Pages Functions (no framework) | Simple API + static frontend                   |
| Hebrew Image           | Next.js 16                     | Rich React app with SSR                        |
| NDS-WEB-BUILD          | Astro 5                        | Static site with zero-JS output                |
| Content Factory Worker | Raw Worker                     | Workflow orchestration, no HTTP routing needed |

---

## 11. Authentication & Security on Cloudflare

### 11.1 PIN-Gated Access (NDS Dashboard)

From `factory-research-nds-design.md`:

- Client and admin share the same API but render different views
- Admin access gated via `AdminPinGate` component (PIN stored in localStorage)
- No heavy auth framework -- simple PIN check

### 11.2 Header-Based Auth (Hebrew Image)

- `x-user-id` header for user identification in API routes
- No full auth system -- simplified for single-user/development

### 11.3 Credit-Based Billing (Hebrew Image)

- Users start with 10 free credits
- Plans: free, basic, pro, business
- Each generation costs 1 credit (deducted atomically via D1 batch)
- Transaction types: purchase, usage, bonus, refund

### 11.4 Session-Based Task Locking (NDS)

```typescript
// Atomic claim/release with 30-minute expiry
claimTask(taskId: string, sessionId: string): Promise<{...}>
releaseTask(taskId: string, sessionId: string): Promise<{...}>
```

### 11.5 Field-Level Access Control (NDS)

Protected fields on PATCH endpoints with 403 responses and hints for correct API.

### 11.6 Row Level Security (LLM Pages Factory)

From `factory-research-aiseo.md` -- Supabase schema has RLS policies for multi-tenant security (designed but never deployed to Cloudflare).

---

## 12. Cost & Scaling Considerations

### 12.1 Why Cloudflare Was Chosen

From `factory-research-nds-analysis.md`:

> "Cloudflare stack (Pages + Workers + D1 + R2) was chosen for **zero monthly cost** and **global edge deployment**."

### 12.2 Content Factory Cost Budget

From `factory-research-nds-workflows.md`:

- Per-task budget: **$3.00 USD**
- Per-batch budget: **$25.00 USD**
- Budget enforcement via D1 queries in `cost-budget.ts`
- `BudgetExceededError` thrown when limits exceeded
- Runtime override via `global_config` table

### 12.3 Per-Stage Cost Allocation

| Stage                 | Budget            |
| --------------------- | ----------------- |
| 0 (Research Planning) | $0.05             |
| 1 (Research)          | $0.10             |
| 2 (Design)            | $0.00 (injection) |
| 3 (Architecture)      | $0.00 (injection) |
| 4 (Content)           | $0.50             |
| 5 (Verify)            | $0.15             |
| 6 (Visual)            | $0.10             |
| 6.5 (Diagram)         | $0.05             |
| 7 (Images)            | $0.20             |
| 8 (UX)                | $0.00 (injection) |
| 9 (Assembly)          | $0.30             |
| 9.5 (URL Sanitize)    | $0.10             |
| 10 (Validation)       | $0.00 (rules)     |
| 11 (Deploy)           | $0.00 (DB)        |

### 12.4 Subrequest Tracking

API client tracks subrequests (API, D1, R2) for debugging Cloudflare Worker limits (1000 subrequests per invocation on free plan).

### 12.5 AI Model Pricing Referenced

| Model             | Input/M tokens | Output/M tokens |
| ----------------- | -------------- | --------------- |
| Claude Opus 4.5   | $10.00         | $30.00          |
| Claude Sonnet 4.5 | $3.00          | $15.00          |
| GPT-5.2           | $2.50          | $10.00          |
| Gemini 3 Pro      | $1.50          | $5.00           |

---

## 13. Naming Conventions & Methodology

### 13.1 No "ClaudeFLARE" Methodology Found

**Important:** None of the 13 documents use the term "ClaudeFLARE". The naming patterns found are:

### 13.2 Resource Naming Conventions

- **D1 Databases:** `{project}-db` (e.g., `nds-tracker-db`, `hebrew-image-db`)
- **R2 Buckets:** `{project}-{purpose}` (e.g., `nds-tracker-files`, `hebrew-image-storage`)
- **KV Namespaces:** `{PURPOSE}_CACHE` (e.g., `PRERENDER_CACHE`)
- **Workers:** `{project}-{function}` (e.g., `nds-workflow-worker`, `nds-prerender`)
- **Pages Projects:** `{project}-{suffix}` (e.g., `nds-tracker-9la`)
- **Durable Objects:** PascalCase class names (e.g., `FactoryController`, `PageFreshnessManager`)

### 13.3 Code Organization Patterns

```
# Content Factory Worker
workflows/
  content-factory.ts          -- Main WorkflowEntrypoint class
  stages/
    stage-00-research-planning.ts
    stage-01-research.ts
    stage-02-design.ts
    ...
  lib/
    api-client.ts             -- AI Gateway client
    scoring-rules.ts          -- Single source of truth
    prompt-generator.ts       -- Dynamic prompt builder
    brand-context.ts          -- Brand voice + framing
    visual-brand.ts           -- Visual constraints
    stage-runner.ts           -- Stage execution utilities
  durable-objects/
    FactoryController.ts      -- WebSocket dashboard
    PageFreshnessManager.ts   -- Monthly freshness
    GeminiRateLimiter.ts      -- Rate limiting
    InjectionQueue.ts         -- Async injection
```

```
# Pages Functions (Dashboard API)
functions/
  _middleware.ts
  [[path]].ts
  api/
    tasks/
      index.ts
      [taskId].ts
      [taskId]/approve.ts
    reconciliation/
    costs/
    prompts/
  lib/
    storage.ts
    stage-gates.ts
```

---

## 14. Migration Recommendations for Automated Ads Agent

### 14.1 Architecture Pattern to Follow

Based on the research, the recommended Cloudflare architecture mirrors NDS but simplified:

```
Automated Ads Agent on Cloudflare:

┌─────────────────────────────────────────────┐
│  Cloudflare Pages (Frontend)                │
│  - React/Vite SPA (Studio, Gallery, etc.)   │
│  - Static assets on CDN                      │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  Cloudflare Worker (API + Backend)           │
│  - Hono framework (recommended) OR           │
│    Pages Functions (file-based routing)       │
│  - All Express routes migrated here           │
└──────────────┬──────────────────────────────┘
               │
    ┌──────────┼──────────┬───────────┐
    ▼          ▼          ▼           ▼
┌───────┐ ┌───────┐ ┌────────┐ ┌──────────┐
│  D1   │ │  R2   │ │   KV   │ │    AI    │
│       │ │       │ │        │ │ Gateway  │
│ Users │ │Images │ │ Cache  │ │ Gemini,  │
│ Posts │ │Assets │ │ Rate   │ │ OpenAI,  │
│ Copy  │ │ Docs  │ │ Limits │ │ Claude   │
│ etc.  │ │       │ │        │ │          │
└───────┘ └───────┘ └────────┘ └──────────┘
```

### 14.2 Database Migration Strategy

Current: PostgreSQL (Drizzle ORM) on Railway
Target: Cloudflare D1 (SQLite)

Patterns to adopt:

1. **D1Service class** from Hebrew Image for type-safe raw SQL
2. **Factory function pattern** from NDS for clean CRUD separation
3. **Boolean mapping** (`Boolean(row.completed)` since D1 stores 0/1)
4. **UUID via `crypto.randomUUID()`**
5. Keep Drizzle for local dev with `better-sqlite3`, raw SQL for D1 production

### 14.3 Storage Migration

Current: Local filesystem / no dedicated storage
Target: R2 for images and assets

Key structure: `users/{userId}/images/{imageId}.{ext}`
Cache headers: `public, max-age=31536000` (1 year)

### 14.4 API Migration

Current: Express.js on Railway
Target: Cloudflare Worker with Hono (or Pages Functions)

Note: While no project used Hono, it is the recommended framework for Cloudflare Workers in 2026 (per Cloudflare docs). Pages Functions work well for simpler APIs.

### 14.5 AI Service Migration

Current: Direct API calls to OpenAI/Gemini
Target: Cloudflare AI Gateway (BYOK pattern)

Benefits:

- Rate limiting built-in
- Observability (logs, costs, latency)
- Fallback chains (Gemini -> GPT -> Claude)
- Single auth header (`cf-aig-authorization`)

### 14.6 Key Patterns to Adopt

1. **`wrangler.toml` with typed bindings** in `cloudflare.d.ts`
2. **Factory function storage layer** -- `createStorage(db)` returning typed CRUD
3. **R2 organized key structure** for multi-tenant image storage
4. **KV for rate limiting and caching** (not for primary data)
5. **AI Gateway for all LLM calls** with BYOK and fallback chains
6. **fetchWithRetry + RequestQueue** for external API resilience
7. **BYOK pattern** for optional features requiring API keys
8. **Content freshness via Durable Objects** (monthly alarm loops)
9. **WebSocket via Durable Objects** for real-time UI updates
10. **Auto-seeding** on first request for database initialization

### 14.7 What NOT to Copy

1. **No multi-tenant workspace complexity** for MVP
2. **No Inngest** -- use Cloudflare Workflows or simple sequential execution
3. **No Supabase** -- use D1 directly
4. **No Browser Rendering** unless specifically needed for AI crawler prerendering
5. **No 11-stage pipeline** for initial migration -- keep Express routes 1:1

---

## Appendix: Source Document Index

| Document                            | Cloudflare Relevance                            | Key Patterns Extracted                                                      |
| ----------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------- |
| `factory-research-manus.md`         | HIGH -- Hebrew Image full Cloudflare stack      | D1 schema, R2 service, KV caching, wrangler.toml, env types                 |
| `factory-research-nds-design.md`    | HIGH -- NDS Dashboard on Pages Functions        | File-based routing, factory storage, CORS middleware, env interface         |
| `factory-research-nds-workflows.md` | CRITICAL -- Complete content factory on Workers | Workflows, Durable Objects, AI Gateway, D1 schema, stage pipeline           |
| `factory-research-nds-evolution.md` | HIGH -- 3 project versions showing migration    | Replit->Cloudflare migration path, resource inventory, KV prerender         |
| `factory-research-variants.md`      | MEDIUM -- Multiple factory variants             | NDS-WEB-BUILD (Astro on Pages), Local_Workflow (Cloudflare delivery target) |
| `factory-research-plans-3.md`       | LOW -- Business strategy, minimal Cloudflare    | Hosting choice: Vercel or Cloudflare Pages                                  |
| `factory-research-plans-2.md`       | LOW -- Feature inventory, minimal Cloudflare    | Cloudflare mentioned as deployment target                                   |
| `factory-research-clients.md`       | LOW -- Client engagement docs                   | Cloudflare Pages hosting for NDS tracker                                    |
| `factory-research-nds-analysis.md`  | MEDIUM -- NDS client application                | "Zero monthly cost" rationale for Cloudflare                                |
| `factory-research-original.md`      | MEDIUM -- Original LLM Pages Factory            | Cloudflare Pages deployment module (177 lines)                              |
| `factory-research-industrial.md`    | LOW -- Claude Code plugin framework             | MCP configs for Cloudflare Docs/Workers/Observability                       |
| `factory-research-aiseo.md`         | LOW -- AI SEO version of factory                | Cloudflare Pages as deployment target, Supabase primary                     |
| `factory-research-temp.md`          | LOW -- Factory temp analysis                    | Cloudflare Pages deployment planned but not wired                           |

---

_Research analysis complete. 13 documents analyzed, ~25,000+ lines of content reviewed._
