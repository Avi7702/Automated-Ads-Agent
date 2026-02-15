# NDS Content Factory — Complete Workflow Architecture Research

**Researched:** February 2026
**Source:** `c:/Users/avibm/AI SEO & LANDING PAGES/NextDaySteelHub-clean/`

---

## 1. Executive Summary

The NDS Content Factory is an **11-stage durable content pipeline** built on **Cloudflare Workflows**. It takes a topic string as input and produces a fully validated, LLM-citation-optimized HTML landing page for the NextDaySteel UK steel/construction business.

**Goal:** "Topic in -> LLM-optimized landing page out (HTML, deployed)"
**Success Metric:** LLMs cite the generated pages.
**Max Score:** 145 points (28 validation rules across 8 categories).
**Total Task Budget:** $3.00 USD per page.

---

## 2. High-Level Pipeline Flow

```
Topic String
    |
    v
Stage 0: Research Planning (Gemini 3 Pro + Google Search grounding)
    |
    v
Stage 1: Research (Gemini 3 Pro + Google Search grounding)
    |  [GATE: Topic Sanity Check — blocks if invalid]
    v
Stage 2: Design (Claude Sonnet 4.5)
    |
    v
Stage 3: Architecture (Claude Sonnet 4.5)
    |
    v
Stage 4: Content Creation (Claude Sonnet 4.5, target: Opus for highest quality)
    |
    v
Stage 5: Technical Verification (Gemini 3 Pro + Google Search grounding)
    |  [GATE: Score >= 80/100 AND scenarios realistic]
    |  [RETRY: Up to 6 attempts (2 injections x 3 verify cycles)]
    v
Stage 6: Visual Strategy (Gemini 3 Pro)
    |
    v
Stage 6.5: Diagram Designer (Gemini 3 Pro subagent)
    |
    v
Stage 7: Image Generation (Placeholder URLs currently)
    |
    v
Stage 8: UX/Interaction Design (Claude Sonnet 4.5)
    |
    v
Stage 9: Assembly (Template-based, NO LLM — direct mapping)
    |
    v
Stage 9.5: URL Sanitization (GPT-5.2)
    |
    v
Stage 10: Validation (Rule-based, NO LLM — scoring-rules.ts)
    |  [GATE: Score >= 80% AND no critical failures]
    v
Stage 11: Deploy (D1 database save, NO LLM)
```

---

## 3. Stage-by-Stage Detailed Architecture

### Stage 0: Research Planning (Meta-Research)

**File:** `workflows/stages/stage-00-research-planning.ts`
**Model:** Gemini 3 Pro with Google Search grounding
**Fallbacks:** GPT-5.2 -> Claude Sonnet 4.5
**Budget:** $0.05
**Retries:** 2

**Purpose:** Plans WHAT to research and validates the topic premise before investing in full research.

**Input:** `taskLabel` (topic string, e.g., "A142 Mesh for Garage Slabs")

**Output (`ResearchPlanOutput`):**

- `topicCategory` — free-form label ("technical guide", "calculator")
- `topicSanity` — validates NDS scope (mesh/rebar supplier, no projects)
- `includeSections.specifications` — whether BS/EN standards section needed
- `researchAreas[]` — dynamic research plan with stale-after-years
- `searchQueries[]` — suggested search queries for Stage 1
- `preliminaryFacts[]` — initial facts to verify
- `dateContext` — research date + current year
- `groundingCitations[]` — web search citation audit trail

**Key Logic:**

- NDS scope check: sells mesh/rebar, does NOT build structures
- Topic sanity: if invalid, sets `topicSanity.valid=false` with `suggestedPivot`
- Uses Google Search grounding for real-time web verification

---

### Stage 1: Research (First-Line Truth Check)

**File:** `workflows/stages/stage-01-research.ts`
**Model:** Gemini 3 Pro with Google Search grounding
**Fallbacks:** GPT-5.2 -> Claude Sonnet 4.5
**Budget:** $0.10
**Retries:** 2

**Purpose:** Gather accurate, citable facts for the landing page. Verify everything via web search.

**Input:** `taskLabel` + `researchPlan` (Stage 0 output)

**Output (`ResearchOutput`):**

- `topicSanity` — re-check after full research
- `topic`, `summary` — 2-3 sentence factual summary
- `keyFacts[]` — 5-10 specific, verifiable facts with numbers
- `specifications[]` — BS/EN standards with reference and details
- `competitorInsights[]`, `commonQuestions[]`, `sources[]`
- `groundingUsed`, `groundingCitations[]`

**Post-Stage Gate:**

- **Topic Sanity Check**: If `topicSanity.valid === false`, workflow is BLOCKED. Task status set to 'blocked' with reason.

**Key Rules:**

- ALWAYS verify latest edition years via search
- Flag sources older than 3 years as potentially outdated
- Prioritize 2024-2026 sources
- Include specific numbers (dimensions, weights, prices)

---

### Stage 2: Solution Design

**File:** `workflows/stages/stage-02-design.ts`
**Model:** Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
**Budget:** $0.00 (injection/direct call)
**Retries:** 1
**HITL Gate:** Yes ("Design approved before architecture")

**Purpose:** Decide page type, structure, interactive elements.

**Input:** `taskLabel` + `research` (Stage 1 output)

**Output (`DesignOutput`):**

- `pageType` — one of: 'guide' | 'calculator' | 'comparison' | 'product' | 'hybrid'
- `primaryIntent` — what the page serves
- `sections[]` — section plan (id, type, purpose)
- `interactiveElements[]` — calculators, toggles, tabs, etc.
- `targetKeywords[]` — SEO keywords
- `estimatedWordCount` — target word count for the page

**Key Decision:** `pageType` drives template selection in Stage 9 and content strategy in Stage 4.

---

### Stage 3: Content Architecture

**File:** `workflows/stages/stage-03-architecture.ts`
**Model:** Claude Sonnet 4.5
**Budget:** $0.00
**Retries:** 1
**HITL Gate:** Yes ("Architecture approved before content")

**Purpose:** Define H1/H2 heading structure, answer capsule, schema markup plan.

**Input:** `taskLabel` + `design` (Stage 2) + `brandContext`

**Output (`ArchitectureOutput`):**

- `h1` — main heading (MUST contain "UK")
- `metaTitle` — 50-60 chars, keyword-first
- `metaDescription` — 150-160 chars with CTA
- `answerCapsule` — 2-3 sentence direct answer for LLM citation
- `sections[]` — detailed section plan with h2, h3s, contentType, wordCount
- `faqQuestions[]` — FAQ with answer previews
- `schemaTypes[]` — "Article", "FAQPage", "HowTo", etc.

---

### Stage 4: Content Creation (MOST IMPORTANT STAGE)

**File:** `workflows/stages/stage-04-content.ts` (~1,300 lines)
**Model:** Claude Sonnet 4.5 (target: Opus for highest quality)
**Budget:** $0.50
**Retries:** 3 (via circuit breaker)
**HITL Gate:** Yes ("Content approved before verification")

**Purpose:** Generate the actual page content. Content quality determines whether LLMs cite the page.

**Input:** `taskLabel` + `architecture` (Stage 3) + `research` (Stage 1, REQUIRED) + `brandContext` + `design` (Stage 2, optional) + `corrections` (Stage 5, optional)

**Output (`ContentOutput`):**

- `sections[]` — content sections with id, h2, HTML content, wordCount
- `faqAnswers[]` — 7+ FAQ Q&A pairs (75-100 words each)
- `statistics[]` — 10+ statistics with value, label, source
- `expertQuote` — real quote from BS/NHBC/CARES (NOT invented)
- `comparison[]` — NDS vs competitors table rows
- `meta` — title + description
- `heroCapsule` — 2-3 sentence answer snippet for LLM citation
- `totalWordCount` — across all sections + FAQs

**Smart Content System (`smartStage4Content`):**
Three-way decision logic:

1. **KEEP** — existing content is good (no issues)
2. **PATCH** — fix specific missing parts (FAQs, stats, sections, meta, hero capsule)
3. **REGENERATE** — too many critical issues, full rewrite needed

**Patching System (mini-prompts):**

- `FAQ_PATCH_PROMPT` — generates additional FAQ Q&A pairs
- `STATS_PATCH_PROMPT` — generates statistics with sources
- `SECTION_PATCH_PROMPT` — generates individual missing sections
- `META_PATCH_PROMPT` — generates meta title/description
- `HERO_CAPSULE_PATCH_PROMPT` — generates answer capsule
- `CORRECTIONS_PATCH_PROMPT` — applies Stage 5 corrections to specific sections

**Data Provenance Rules:**

- Injected into every content prompt BEFORE generation instructions
- Primary defense against LLM fabrication/hallucination
- Loaded from D1 at runtime with hardcoded fallback (`DEFAULT_DATA_PROVENANCE_RULES`)

**Content Inspection (`inspectContent`):**
Checks required fields, section count, word count (70% threshold), FAQ count (7+), statistics (10+ with sources), and determines keep/patch/regenerate recommendation.

---

### Stage 5: Technical Verification

**File:** `workflows/stages/stage-05-verify.ts`
**Model:** Gemini 3 Pro with Google Search grounding
**Fallbacks:** GPT-5.2 -> Claude Sonnet 4.5
**Budget:** $0.15
**Retries:** 3

**Purpose:** Fact-check content using live web search. Verify BS references, flag errors.

**Input:** `content` (Stage 4 output)

**Output (`VerifyOutput`):**

- `verified` — boolean pass/fail
- `score` — 0-100
- `corrections[]` — specific fixes (location, issue, suggestion, severity)
- `bsReferencesChecked[]` — each BS standard verified via search
- `factualClaims[]` — each claim verified with source
- `groundingCitations[]` — citation audit trail
- `scenarioRealism` — validates scenarios are realistic in UK construction

**Verification Rules:**

1. External references MUST be searched (BS/EN standards, HSE guidance, regulations)
2. Mark unverified claims explicitly
3. Brand voice checks (active voice, sentence length, vague language)
4. List structure checks (3-7 items, intro sentence, parallel structure)
5. Scenario realism check (industry realism, business scope match, specificity without source)

**Scoring Deductions:**

- Unverified claims: -10 each
- Factual errors: -20 each
- Brand voice issues: -5 each
- List structure issues: -5 each
- Unrealistic scenarios: -20 each

**Structural Checks:** Also runs `PRE_ASSEMBLY_CHECKS` from scoring-rules.ts (question H2s, answer capsule, expert quote, statistics count, FAQ count, lists count).

**Post-Stage Gate (in content-factory.ts):**

- Score < 80 AND all 3 attempts failed -> re-inject Stage 4 with corrections
- Up to 6 total attempts (2 injections x 3 verify cycles)
- If all 6 fail -> task BLOCKED
- Scenario realism fail -> task BLOCKED

---

### Stage 6: Visual Strategy

**File:** `workflows/stages/stage-06-visual.ts`
**Model:** Gemini 3 Pro
**Fallback:** Claude Sonnet 4.5
**Budget:** $0.10
**Retries:** 1

**Purpose:** Create image briefs with NDS brand specifications.

**Input:** `taskLabel` + `content` (Stage 4 — section headings as content summary)

**Output (`VisualOutput`):**

- `image_briefs[]` — each with id, type, purpose, prompt, alt_text, placement, requirements, branding_required, has_vehicle
- `total_images`

**Image Types:** hero, product, diagram, infographic, process, delivery, vehicle

**Brand Specifications Injected:**

- Vehicle: Rigid-body lorry (NOT articulated), white cab, grey body, orange NextDaySteel livery, HIAB crane
- PPE: Orange hi-vis with NDS logo, white hard hat with NDS logo, rigger gloves, steel-toe boots
- Brand Colors: Orange #f97316, Navy #1e3a5f, White #ffffff
- Setting: UK construction site, overcast/bright overcast, photorealistic
- Forbidden: Sunny blue skies, stock photo poses, generic warehouse interiors

**Steel Mesh Terminology:** Injected into prompts to prevent hallucination:

- Flying end, lap length, concrete cover, wire snake spacers, HIAB crane

**Can be SKIPPED** via `SKIP_VISUAL_STRATEGY=true` env var.

---

### Stage 6.5: Diagram Designer (Subagent)

**File:** Part of `workflows/stages/stage-06-visual.ts` (`enhanceDiagramBriefs`)
**Model:** Gemini 3 Pro
**Budget:** $0.05
**Retries:** 1

**Purpose:** Transforms vague diagram descriptions into precise layout specifications.

Processes only `diagram`, `infographic`, and `comparison` type briefs. Non-diagram briefs pass through unchanged. Enhanced briefs get detailed layout specs with canvas dimensions, grid zones, element positions, labels, annotations, and style specifications.

---

### Stage 7: Image Generation

**File:** `workflows/stages/stage-07-images.ts`
**Model:** None (currently placeholder mode)
**Budget:** $0.20
**Retries:** 2

**Current Implementation:** Generates placeholder URLs using placehold.co with NDS brand colors (navy/orange). No actual AI image generation.

**Dimensions by type:**

- hero: 1200x600, product: 800x600, process: 800x500
- delivery: 900x500, infographic: 800x800, diagram: 800x600, vehicle: 900x500

**Partial Success Handling:**

- > = 50% images pass -> continue workflow
- < 50% pass -> block for review
- Failed images logged to `workflow_issues` table

**Can be SKIPPED** via `SKIP_IMAGE_GENERATION=true` env var.

---

### Stage 8: UX/Interaction Design

**File:** `workflows/stages/stage-08-ux.ts`
**Model:** Claude Sonnet 4.5
**Fallback:** GPT-5.2
**Budget:** $0.00
**Retries:** 1
**HITL Gate:** Yes ("UX spec approved before assembly")

**Purpose:** Define interactive elements, CTAs, accessibility requirements.

**Input:** `taskLabel` + `design` (Stage 2 — pageType determines UX approach) + `brandContext`

**Output (`UXOutput`):**

- `interactions[]` — calculators, toggles, accordions, tabs, forms, comparisons with inputs/outputs/formula
- `ctas[]` — location, text, style (primary/secondary), action
- `accessibility[]` — requirement + implementation pairs

**Brand colors injected:** Orange #f97316, Navy #1e3a5f, Dark Slate #0f172a, White #ffffff

---

### Stage 9: Assembly (Template-Based)

**File:** `workflows/stages/stage-09-assembly.ts`
**Model:** None (direct template mapping, NO LLM)
**Budget:** $0.30
**Retries:** 2

**Purpose:** Combine all upstream outputs into a final HTML page using templates.

**4 HTML Templates (stored in R2, hash-based rotation):**

1. `default` — Modern corporate (orange accent)
2. `brutalist` — Industrial style (black borders)
3. `terminal` — Hacker aesthetic (green on black)
4. `guide` — Space Grotesk brutalist cards

**Template Selection:** `hash(taskId) % 4`

**Input:** ALL upstream outputs — content, images, uxSpec, architecture, design, brandContext

**Smart Assembly System (`smartStage9Assembly`):**

1. Inspect existing HTML for quality issues
2. Keep, patch, or regenerate based on inspection
3. Checks: correct phone number, placeholder URLs, image placeholders, schema, meta tags, HTML structure

**Assembly Inspection (`inspectAssembly`):** Validates HTML structure, correct phone number (020 8079 7719), no placeholder URLs, no image placeholders, schema.org presence, meta tags, minimum HTML length.

---

### Stage 9.5: URL Sanitization

**File:** `workflows/stages/stage-09-5-url-sanitization.ts`
**Model:** GPT-5.2
**Budget:** $0.10
**Retries:** 2

**Purpose:** Scan and fix ALL wrong URLs, phone numbers, and email addresses.

**100% Reliable Approach:**

1. LLM scans HTML and finds ALL issues
2. LLM proposes fixes for each issue
3. Apply fixes to HTML
4. VERIFY: Check each issue is actually fixed
5. If issues remain, loop back (max 3 iterations)
6. Only complete when 100% verified clean

**Known Wrong Patterns:**

- `/collections/steel-mesh` -> `/collections/reinforcement-mesh`
- `/collections/rebar` -> `/collections/steel-reinforcement-bars`
- `nextdaysteel.co.uk` (no www) -> `www.nextdaysteel.co.uk`
- Phone: 0114 399 0378 (old Sheffield) -> 020 8079 7719 (London)

---

### Stage 10: Validation (Rule-Based)

**File:** `workflows/stages/stage-10-validation.ts`
**Model:** None (rule-based checks from `scoring-rules.ts`)
**Budget:** $0.00
**Retries:** 0

**Purpose:** Validate final HTML against quality rules. Determines if page can deploy.

Uses `SCORING_RULES` from `scoring-rules.ts` as the **single source of truth** (same rules used by Stage 4 for generation).

**28 Rules, 145 Max Points, 8 Categories:**

| Category             | Points                                                                              | Key Rules |
| -------------------- | ----------------------------------------------------------------------------------- | --------- |
| Structure (15)       | H1 single + contains "UK", valid HTML5                                              |
| SEO Metadata (10)    | Meta title, description, lang, viewport                                             |
| Content Quality (45) | Question H2s (3+), answer capsule, expert quote, 10+ statistics with sources        |
| FAQ & Schema (25)    | FAQ section (7+ questions), FAQPage schema (5+ Q&A), dateModified, no empty content |
| Lists & Tables (25)  | 2+ content lists, comparison table (3+ rows)                                        |
| Technical (10)       | Alt text, valid HTML, CTA, valid internal links                                     |
| Brand & UK (10)      | No warning boxes, BS references (2+), disclosure, correct phone (020 8079 7719)     |
| Mobile (5)           | Responsive CSS, no horizontal scroll                                                |

**Gate:** `passed` = score >= 80% AND no critical failures.

**Supports:** Runtime rule overrides (add, remove, modify rules dynamically).

---

### Stage 11: Deploy

**File:** `workflows/stages/stage-11-deploy.ts`
**Model:** None (database operations)
**Budget:** $0.00
**Retries:** 1

**Purpose:** Save HTML to database and mark task complete.

**Actions:**

1. Extract Shopify-ready content (strips DOCTYPE, html, head, body, header, footer)
2. Save full HTML to `pages` table
3. Update `tasks` table: status='completed', progress=100%, deployed_url, shopify_content, html_content
4. Return deploy metadata (url, htmlSize, shopifyContentSize)

---

## 4. AI Model Strategy

### Model Selection Per Stage

| Stage                 | Primary Model                    | Fallback 1        | Fallback 2        | Why                                |
| --------------------- | -------------------------------- | ----------------- | ----------------- | ---------------------------------- |
| 0 (Research Planning) | Gemini 3 Pro + Grounding         | GPT-5.2           | Claude Sonnet 4.5 | Needs web search for validation    |
| 1 (Research)          | Gemini 3 Pro + Grounding         | GPT-5.2           | Claude Sonnet 4.5 | Needs web search for fact-finding  |
| 2 (Design)            | Claude Sonnet 4.5                | —                 | —                 | Structured decision-making         |
| 3 (Architecture)      | Claude Sonnet 4.5                | —                 | —                 | Heading structure planning         |
| 4 (Content)           | Claude Sonnet 4.5 (target: Opus) | —                 | —                 | Highest quality writing            |
| 5 (Verify)            | Gemini 3 Pro + Grounding         | GPT-5.2           | Claude Sonnet 4.5 | Needs web search for fact-checking |
| 6 (Visual)            | Gemini 3 Pro                     | Claude Sonnet 4.5 | —                 | Creative/visual thinking           |
| 6.5 (Diagram)         | Gemini 3 Pro                     | —                 | —                 | Technical diagram layout           |
| 7 (Images)            | Placeholder (no AI)              | —                 | —                 | Future: Gemini Imagen              |
| 8 (UX)                | Claude Sonnet 4.5                | GPT-5.2           | —                 | Interaction design                 |
| 9 (Assembly)          | None (templates)                 | —                 | —                 | Direct HTML mapping                |
| 9.5 (URL Sanitize)    | GPT-5.2                          | —                 | —                 | Pattern matching                   |
| 10 (Validation)       | None (rules)                     | —                 | —                 | Code-based scoring                 |
| 11 (Deploy)           | None (DB)                        | —                 | —                 | Database operations                |

### Model Pricing (per million tokens)

| Model             | Input  | Output |
| ----------------- | ------ | ------ |
| Claude Opus 4.5   | $10.00 | $30.00 |
| Claude Sonnet 4.5 | $3.00  | $15.00 |
| GPT-5.2           | $2.50  | $10.00 |
| Gemini 3 Pro      | $1.50  | $5.00  |

### API Client Architecture

**File:** `workflows/lib/api-client.ts`

- All API calls go through **Cloudflare AI Gateway** with BYOK (Bring Your Own Keys)
- Authentication via `cf-aig-authorization` header
- AbortController with timeouts: DEFAULT=25s, LONG=90s, CONTENT=180s
- Subrequest tracking (API, D1, R2) for debugging Cloudflare limits
- `callGeminiWithGrounding()` — enables Google Search grounding
- `callAnthropic()`, `callOpenAI()`, `callGemini()` — standard providers
- `callAnthropicWithLogging()` — with LLM call context logging

---

## 5. Infrastructure & Supporting Systems

### Dependency Graph

**File:** `workflows/dependency-graph.ts`

The full DAG with dependencies, HITL gates, circuit breakers, and cost budgets:

```
Stage 0  -> []                     (Research Planning)
Stage 1  -> [0]                    (Research)
Stage 2  -> [1]     HITL           (Design)
Stage 3  -> [2]     HITL           (Architecture)
Stage 4  -> [1, 3]  HITL           (Content)
Stage 5  -> [4]                    (Verify)
Stage 6  -> [4]                    (Visual)
Stage 6.5 -> [6]                   (Diagram Designer)
Stage 7  -> [6.5]                  (Images)
Stage 8  -> [2]     HITL           (UX)
Stage 9  -> [4, 7, 8, 3, 2]       (Assembly)
Stage 9.5 -> [9]                   (URL Sanitization)
Stage 10 -> [9.5]                  (Validation)
Stage 11 -> [10]                   (Deploy)
```

**Budget Constants:**

- Per-task budget: $3.00 USD
- Per-batch budget: $25.00 USD

### Cost Budget Enforcement

**File:** `workflows/cost-budget.ts`

- Checks per-stage and total cost budgets by querying `stage_runs` D1 table
- Throws `BudgetExceededError` with scope (stage/task/batch)
- Records LLM cost to `stage_runs.llm_cost_usd`
- Runtime override via `global_config` table

### Agent Guardrails (Anti-Hallucination)

**File:** `workflows/agent-guardrails.ts`

Post-generation provenance checks. Every factual claim must be traceable to input data.

**Stage 4 Provenance Check:**

- Extracts all prices (£XX.XX, pence, per-unit, VAT qualifiers, ranges)
- Extracts all specifications (mm, kg, m, kN, MPa, mesh designations A142/SL62/B500)
- Extracts numeric claims (X times, X years, up to X, percentages)
- Compares each against research data corpus
- Safe phrases excluded (e.g., "contact for pricing", "prices vary")
- Pass threshold: >= 80% coverage (20% unattributed allowed)

**Stage 9 Assembly Check:**

- Verifies H1 exists in HTML
- Verifies section headings appear in HTML
- Verifies content fragments present (first 60 chars probe)
- Verifies expert quote present
- Verifies FAQ questions present
- Pass threshold: >= 70% coverage (more lenient due to reformatting)

### Scoring Rules (Single Source of Truth)

**File:** `workflows/lib/scoring-rules.ts`

Defines ALL scoring requirements. Both Stage 4 (content generation) and Stage 10 (validation) read from this single source.

**Content Targets:**

- `statsMin: 10` (statistics with sources)
- `faqMinQuestions: 7`, `faqSchemaMinQuestions: 5`
- `faqAnswerWordCount: { min: 75, max: 100 }`
- `listMin: 2` (content lists)
- `comparisonRowsMin: 3` (comparison table)
- `metaTitleChars: { min: 50, max: 60 }`
- `metaDescriptionChars: { min: 150, max: 160 }`

**Pre-Assembly Checks (run in Stage 5):**

- H2 question format (3+ question H2s)
- Has answer capsule / heroCapsule
- Has expert quote with source
- Statistics with sources (10+)
- FAQ count (7+)
- Content lists (2+)

### Prompt Generator (Dynamic)

**File:** `workflows/lib/prompt-generator.ts`

Generates prompts from `SCORING_RULES` dynamically. When scoring rules change, prompts auto-update. Supports runtime config overrides from D1. Also supports `prompt_versions` table for A/B testing active prompt overrides per stage.

### Brand Context

**File:** `workflows/lib/brand-context.ts`

Two versions:

1. **BRAND_CONTEXT** (full) — 76 lines of voice, writing rules, content structure, framing, CTA phrasing, disclosure style
2. **BRAND_CONTEXT_SHORT** — 5-line summary

**Runtime Loading:** `loadBrandContext(bucket)` loads from R2 bucket (`NDS-BRAND-VOICE.md` + `NDS-BRAND-GUIDELINES.md`). Falls back to hardcoded if R2 fails.

Key voice rules:

- Professional, direct, helpful, confident
- Active voice, answer-first, cite BS standards
- UK English, 80%+ sentences under 20 words
- Frame as education: "Your engineer will specify..."
- NEVER: warning boxes, vague language, sales waffle
- Use HTML lists for 3+ data points (critical for LLM citation)

### Visual Brand

**File:** `workflows/lib/visual-brand.ts`

NDS vehicle specifications, PPE requirements, brand colors, setting rules, worker style, scene mood — all injected into Stage 6 prompts.

### Stage Runner

**File:** `workflows/lib/stage-runner.ts`

Flexible stage execution utilities for partial/dynamic workflow execution. Supports:

- Run specific stages on demand
- Load state from database
- Validate dependencies before execution
- Track progress and costs
- Modes: explicit, smart, repair

### Contract Validation

**File:** `workflows/validate-contracts.ts`

Validates stage inputs against typed contracts before execution. Fails fast if required inputs are missing.

### Idempotent Steps

**File:** `workflows/idempotent-step.ts`

Hashes stage inputs and saves to DB for idempotency detection.

### Stage Logger

**File:** `workflows/stage-logger.ts`

Observability logging with input/output summaries, cost tracking, contract validation status, guardrail results, provenance coverage.

---

## 6. Durable Objects

### FactoryController

**File:** `workflows/durable-objects/FactoryController.ts`

Real-time workflow monitoring via WebSocket. One instance per task. Receives stage updates from the workflow, broadcasts to connected dashboard clients. Uses Hibernation API for zero-cost idle periods.

**Endpoints:**

- `GET /ws` — WebSocket upgrade for dashboard clients
- `POST /notify` — Stage update from workflow (internal)
- `GET /clients` — Debug: count connected clients

### PageFreshnessManager

**File:** `workflows/durable-objects/PageFreshnessManager.ts`

Stage 12: Monthly Freshness Loop. Each deployed page gets its own DO instance that:

1. Arms an alarm for 30 days after deployment
2. Wakes up to update freshness signals (dateModified, year references)
3. Re-deploys the updated HTML
4. Re-arms for the next 30-day cycle (infinite loop)

**Endpoints:** `/init`, `/status`, `/pause`, `/resume`, `/trigger`

### GeminiRateLimiter

**File:** `workflows/durable-objects/GeminiRateLimiter.ts`

Global rate limiter for Gemini API calls. Coordinates all concurrent workflow sessions to stay under 20 RPM. Uses 3.5s interval (safety margin). Runtime-configurable.

**Endpoints:** `/acquire`, `/backoff`, `/status`, `/config`

### InjectionQueue

**File:** `workflows/durable-objects/InjectionQueue.ts`

Queue for Claude Code bypass mode. When workflow needs injected responses:

1. Large payloads (>120KB) stored in D1 `injection_payloads` table
2. Small payloads stored inline in DO storage
3. Supports enqueue, dequeue, status, remove operations

---

## 7. Cross-Instance Resumption

The workflow supports durable resumption across Cloudflare Worker instances:

1. **On Start:** Loads existing state from `stage_runs` table in D1
2. **Per Stage:** Checks if stage already completed — skips if so
3. **State Persistence:** Each stage result saved to DB immediately after execution
4. **Budget Continuity:** Cost tracking persists via `stage_runs.llm_cost_usd`
5. **Input Hashing:** For idempotency detection on re-runs

---

## 8. Content Factory Workflow Class

**File:** `workflows/content-factory.ts` (~1,000+ lines)
**Class:** `ContentFactoryWorkflow extends WorkflowEntrypoint<Env, WorkflowParams>`

**Key Methods:**

- `run(event, step)` — Main workflow execution
- `preStageChecks(stage, state, taskId)` — Contract validation + budget check + input logging
- `postStageChecks(stage, state, ...)` — Guardrails + observability logging + input hashing
- `buildStageInput(stage, state)` — Construct stage input for contract validation
- `waitForInjection(step, taskId, stage, ...)` — Wait for Claude Code to inject response
- `saveStageResult(taskId, stage, result)` — Persist to D1
- `checkBudget(step, state, budget, stage)` — Budget enforcement
- `updateTaskStatus(taskId, status, stage)` — Update task in D1

**Workflow Params:**

```typescript
interface WorkflowParams {
  taskId: string;
  taskLabel: string;
  costBudgetUsd?: number; // default: $10.00
}
```

**Environment Bindings:**

- `DB: D1Database` — Primary data store
- `BUCKET: R2Bucket` — Image and brand context storage
- `OPENAI_API_KEY`, `GEMINI_API_KEY` — AI provider keys
- `AI_GATEWAY_URL`, `AI_GATEWAY_ID`, `CF_AIG_TOKEN` — Cloudflare AI Gateway
- `CONTENT_FACTORY: Workflow` — Self-reference for workflow creation
- `PAGE_FRESHNESS: DurableObjectNamespace` — Monthly freshness loop
- `INJECTION_QUEUE: DurableObjectNamespace` — Claude Code injection queue
- `GEMINI_RATE_LIMITER: DurableObjectNamespace` — Global rate limiter
- `FACTORY_CONTROLLER: DurableObjectNamespace` — Real-time dashboard
- `SKIP_IMAGE_GENERATION`, `SKIP_VISUAL_STRATEGY` — Feature flags

---

## 9. PRODUCTION Knowledge Base

### Key Knowledge Files

| File                           | Purpose                                                                 |
| ------------------------------ | ----------------------------------------------------------------------- |
| `NDS-BRAND-VOICE.md`           | Tone, language guidelines, keyword emphasis, content structure examples |
| `NDS-BRAND-GUIDELINES.md`      | Logo, colors, personas, product scope                                   |
| `NDS-SMART-FACTORY.md`         | v2.8 — Complete workflow system documentation, self-approval system     |
| `NDS-ASSETS.md`                | Asset references                                                        |
| `NDS-IMAGE-STRATEGY.md`        | Image generation strategy                                               |
| `NDS-IMAGE-BASE-CRITERIA.md`   | Image quality criteria                                                  |
| `NDS-IMAGE-GENERATION-PLAN.md` | Image generation plan                                                   |
| `IMAGE-GENERATION-RULES.md`    | Image generation rules                                                  |
| `NDS-MODEL-BEST-PRACTICES.md`  | AI model best practices                                                 |
| `NDS-WORKFLOW-MAP.md`          | Workflow map                                                            |
| `NDS-VALID-URLS.md`            | Valid NDS URLs (source of truth for Stage 9.5)                          |
| `ASSESSMENT-CRITERIA.md`       | Assessment criteria                                                     |
| `STAGE-4-PREFLIGHT.md`         | Pre-flight checks for content generation                                |
| `LESSONS-LEARNED-COMPLETE.md`  | Historical lessons from production issues                               |

### Skill Files

| Skill                               | Purpose                                                                       |
| ----------------------------------- | ----------------------------------------------------------------------------- |
| `design-system.md`                  | Color tokens, theme object (light/dark), typography, spacing system           |
| `guide-skill.md`                    | Guide page template with 4-tier component system (Tier 1 = citation-critical) |
| `calculator-skill.md`               | Calculator page template                                                      |
| `comparison-skill.md`               | Comparison page template                                                      |
| `tool-skill.md`                     | Tool page template                                                            |
| `image-prompt-engineering-v3.skill` | Image prompt engineering skill                                                |
| `nano-banana-imagegen.skill`        | Image generation skill                                                        |

### Skill System: 4-Tier Component Architecture

From `guide-skill.md`:

| Tier              | Rule                              | Components                                                    |
| ----------------- | --------------------------------- | ------------------------------------------------------------- |
| **1 (LOCKED)**    | Copy structure EXACTLY            | Answer Capsule, FAQ Accordion, Expert Quote, Comparison Table |
| **2 (TEMPLATED)** | Adapt within design tokens        | Hero, CTA Strip, Footer                                       |
| **3 (FLEXIBLE)**  | Creative freedom with constraints | Custom sections                                               |
| **4 (FREE)**      | Full creative freedom             | Decorative elements                                           |

Tier 1 components are citation-critical — their HTML structure directly impacts whether LLMs can extract and cite the content.

---

## 10. Forbidden Patterns

From SCORING_SPEC.md and brand guidelines:

1. Warning symbols (no "Warning:", "IMPORTANT NOTICE", "Alert", "Caution")
2. class="warning" or class="alert" (no alarming UI patterns)
3. Empty sections (every heading needs content)
4. Wrong phone number (ONLY 020 8079 7719, NEVER 0114)
5. Placeholder links (no /example, /placeholder, {URL})
6. Invented experts (only real sources: BS, CARES, NHBC)
7. Thin content (each section needs substance)
8. Passive voice (not "is used", "were specified")
9. Vague language (no "probably", "may", "might")
10. Sales waffle (no "quality service", "best supplier")

---

## 11. Key Architectural Patterns

### 1. Single Source of Truth

- `SCORING_RULES` in `scoring-rules.ts` drives both Stage 4 prompts and Stage 10 validation
- `SCORING_SPEC.md` is human-readable documentation of the same rules
- Brand context loaded from R2 at runtime (updatable without redeploy)

### 2. Smart Keep/Patch/Regenerate

Both Stage 4 (content) and Stage 9 (assembly) use inspection -> decision -> action pattern:

- Inspect existing output for quality
- Decision: keep (good), patch (fixable), regenerate (too broken)
- Saves LLM cost by only regenerating what's needed

### 3. Multi-Model Fallback Chain

Every AI stage has a fallback chain: Primary -> Fallback 1 -> Fallback 2

- Gemini (grounded) -> GPT-5.2 -> Claude Sonnet (for research/verify stages)
- Claude -> GPT-5.2 (for design/content stages)

### 4. Contract-First Design

`contracts.ts` defines typed input/output contracts for every stage boundary. Validated before each stage execution. Prevents silent data corruption across stages.

### 5. Budget Enforcement

Per-stage and per-task cost budgets enforced via D1 queries. `BudgetExceededError` thrown when limits exceeded.

### 6. Anti-Hallucination Pipeline

Three layers:

1. **Data Provenance Rules** — injected into content prompts
2. **Agent Guardrails** — post-generation provenance checks (prices, specs, numeric claims)
3. **Stage 5 Verification** — live web search fact-checking with grounding

### 7. Injection/Bypass Mode

Claude Code can inject pre-computed responses into stages (for stages 2, 3, 4, 8). Uses `InjectionQueue` Durable Object for async handoff.

### 8. HITL (Human-In-The-Loop) Gates

Stages 2, 3, 4, 8 have HITL gates. If all retries fail, task is blocked for human review with `workflow_issues` entries.

---

## 12. Database Schema (Referenced)

Key tables used by the workflow:

- `tasks` — task tracking (status, current_stage, progress, deployed_url, shopify_content)
- `stage_runs` — per-stage execution log (output_json, llm_cost_usd, status)
- `pages` — deployed HTML pages
- `workflow_issues` — HITL issues for human review
- `workflow_config` — runtime config overrides per stage
- `global_config` — global settings (e.g., total_budget_usd)
- `prompt_versions` — A/B testing for stage prompts
- `injection_payloads` — large injection payloads (>120KB)
- `llm_call_log` — detailed LLM call logging
