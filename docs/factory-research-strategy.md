# Factory Research: Strategy & Concept Documents Analysis

**Source**: `c:/Users/avibm/AI SEO & LANDING PAGES/` directory
**Analyzed by**: Research teammate
**Date**: 2026-02-13

---

## 1. THE CORE CONCEPT (from "chat with GPT on the concept")

### User's Vision in Their Own Words

The user wants to build **"the AI-native local web"** -- a platform that makes SMBs discoverable by LLMs and AI agents. The raw vision, distilled:

> "I am skipping the user's current website (for now) and building for my users... we build for them an army of landing pages, by local, meaning if they serve 50 miles, we will scan and build as many local pages in the 50 miles cities, local areas... and list them on all the sources needed for an LLM to know about them."

> "ANY LANDING page our system will build will have a max standard needed for AI/LLMs to discover... fully equipped and designed to be discoverable by LLMs and cited as a source."

> "The cherry -- I NEED TO MAKE SURE WE HAVE THE MCP/REST API CORNER for any agent like AI browsers to actually communicate with our sites/landing pages."

### The Three-Layer Architecture

1. **Layer 1 -- AI-Discoverable Landing Pages**: Mass-generate location-specific pages with Schema.org JSON-LD (`LocalBusiness`, `Service`, `areaServed`, `GeoCircle`, `Offer`, `FAQPage`), structured for LLM retrieval, not just traditional SEO. Each page must be 60%+ unique content (not city-swap clones).

2. **Layer 2 -- MCP/REST API Action Layer**: Every landing page optionally upgradeable with public API endpoints (`/v1/quote`, `/v1/inventory`, `/v1/availability`, `/v1/contact`) so AI browsers (Comet, Dia, Arc) and agents can transact programmatically. Discovery via `/.well-known/mcp.json`, `/.well-known/api-catalog` (RFC 9727), and `<meta name="ai-agent-api">` tags.

3. **Layer 3 -- Public Directory / Index**: A crawlable registry of all onboarded businesses, their local pages, and API endpoints. Becomes the "search layer for AI agents" -- LLMs query the directory to find trusted commerce APIs. This is the real moat.

### Critical Insight: Business-Intent = Live Search

The conversation established a crucial finding: for business-intent queries (buying, hiring, booking), **70-90% of the AI's answer comes from live/fresh search**, not pre-trained data. This means:

- "Flooding the web with pages for training data" has limited value
- **Real-time discoverability** via structured HTML, sitemaps, and public APIs is what actually wins
- Pages must feed the retrieval layer, not just exist on the web

### How LLMs "Rank" Businesses (Three Layers)

| Layer                  | Who Controls It                      | User's Lever                                              |
| ---------------------- | ------------------------------------ | --------------------------------------------------------- |
| Training corpus        | OpenAI, Anthropic, Google            | Public, structured, crawlable pages                       |
| Retrieval/search layer | Bing, Perplexity, Claude Web, Gemini | SEO-style optimization + JSON-LD + local data             |
| Agent/action layer     | AI browsers, MCP registries          | `/.well-known/api-catalog`, MCP manifests, fast responses |

### The "Honest Localization" Model

The user and GPT established that not every client will have photos, testimonials, and deep local assets. The solution is **truthful variability** across three tiers:

- **Bronze (minimum)**: Zone-based coverage tables (ZIPs, lead times, fees), pricing logic with tiers, localized FAQs, Schema.org JSON-LD, agent API hints. No fabricated content.
- **Silver**: Lead-time tables by ZIP band, real case types served, delivery windows that genuinely vary by area, local add-ons (disposal, elevator, permits).
- **Gold**: Local photos, real testimonials, micro-inventory by depot, calendar/availability via API, Wikidata/directory links.

---

## 2. DEEP RESEARCH FINDINGS (from "GPT Deep Research on One Topic")

This document contains a 15-minute GPT-5 Pro deep research session on localized landing pages for AI discoverability. Key findings:

### Experiment Design

- **3 test cohorts**: National page only (control) vs. ~10 local pages vs. ~50-60 local pages
- **KPIs defined**: Agent Citation Rate (ACR) -- % of prompts where page is cited; Agent Action Rate (AAR) -- % of prompts that trigger API tool call
- **Measurement**: Staggered rollouts with difference-in-differences analysis to separate page-count effects from seasonality

### Technical Signals That Matter

- `areaServed` with `GeoCircle` or `AdministrativeArea` -- mandatory
- `Offer`/`AggregateOffer` with pricing fields, bulk tiers, `priceValidUntil`
- `FAQPage` and `HowTo` JSON-LD
- `IndexNow` submission for fast Bing/Copilot indexing
- `/.well-known/api-catalog` (IETF RFC 9727) pointing to OpenAPI spec
- Robots.txt allowing GPTBot, PerplexityBot, CCBot, Claude-Web

### Content Guardrails

- **60%+ uniqueness per page** -- avoid "doorway" patterns (Google's March 2024 + June 2025 penalties)
- E-E-A-T signals mandatory: named author, real credentials, verifiable experience
- 1,500-2,000 words per page
- Unique local content modules: local staff, neighborhoods, lead times by zone, localized reviews

### 12-Month Research Roadmap

- Months 0-1: Baseline, bots/validation, prompt battery
- Months 2-3: Build pilot (0/10/60 pages), ship schema + OpenAPI
- Months 4-6: Tune signals (area shapes, offers), measure ACR/AAR
- Months 7-9: Automate page generation + dashboards
- Months 10-12: Analyze, case studies, pricing tiers

---

## 3. STRATEGY TO SAFE PRODUCT (directory: 18 documents, ~200K+ words)

### Executive Summary

Research across 4 phases (3,981+ sources) concluded:

| Phase   | Topic                             | Sources | Key Finding                                          |
| ------- | --------------------------------- | ------- | ---------------------------------------------------- |
| Phase 1 | Landing Page Architecture         | 1,311+  | 60% uniqueness threshold, E-E-A-T mandatory          |
| Phase 2 | MCP Integration & Agent Discovery | 1,050+  | Multi-protocol (MCP + REST), security hardened       |
| Phase 7 | Vertical Market Research          | 870+    | **PLUMBING selected** (89/100 score, 91% confidence) |
| Phase 5 | Monetization & Business Model     | 750+    | 18% commission + tiered subscriptions                |

### Why Plumbing

- Market size: $169.8B US, 5.2% CAGR
- Unit economics: 44:1 LTV:CAC ratio
- AI opportunity: 36% emergency jobs = instant voice routing advantage
- Weak competition: HomeAdvisor 2.5/5 stars, 85% fake leads, $7.2M FTC settlement
- Margins: 45-80% gross margins

### Three Business Model Options

**Option 1 -- $100/Page Service** (original plan):

- Bootstrap ($2-5K), Week 1 revenue, $180-360K Year 3
- LOW risk, but ceiling at ~$500K/year
- 60% research reuse

**Option 2 -- Two-Sided Marketplace** (Uber for plumbing):

- Requires $1.5M seed, Month 12-18 first revenue, $6.2M Year 3
- HIGH risk, $75-140M exit potential
- 100% research reuse

**Option 3 -- Hybrid** (RECOMMENDED):

- Service first (Month 1-12), then marketplace (Month 13+)
- $2K start, Week 1 revenue, $3M Year 3
- MEDIUM risk, $10-30M exit
- 100% research reuse

### Google Safety Framework (v2.0)

- **60% content uniqueness** (up from 40% in v1.0)
- **12 unique content blocks** per page (expanded from 7)
- **E-E-A-T mandatory** -- named expert, credentials, experience quantified
- **Scoring system**: 115 points total, 69+ to deploy (60% threshold)
- **Critical auto-blocks**: No E-E-A-T signals, <40% uniqueness
- Pages validated against June 2025 Google penalty data (837 sites deindexed)

### v2.0 AI Agent Routing System

- Multi-protocol: MCP + REST/OpenAPI mandatory, GraphQL optional
- Discovery via Foursquare (ChatGPT uses 70%+ local data from Foursquare), Google Business Profile, Yelp
- Security: CVE-2025-49596 mitigation, OAuth 2.1, EU AI Act compliance
- Production timeline: Pilot Q4 2025, Production Q2 2026
- Real-world case studies: Bloomberg, Block, PayPal, Stripe (10+ production MCP deployments)

---

## 4. MARKETING BUBBLE MAPS (two HTML files)

Both maps are D3.js interactive visualizations for **"Reclaim My Finance"** (a different business -- investment scam & housing disrepair claims recovery). They analyze 68 marketing channels scored by relevance, budget, CAC, and ROI.

**Relevance to the factory concept**: These maps show the user's analytical approach to marketing strategy. They are NOT directly related to the landing page factory concept, but demonstrate the user's preference for:

- Data-driven channel scoring
- Visual interactive decision tools
- Detailed per-channel ROI analysis

---

## 5. STRATEGIC DECISIONS MADE

### Confirmed Decisions

1. **Target vertical**: Plumbing services (89/100 score)
2. **Target market**: Austin, TX first, then 5-city expansion
3. **Business model**: Hybrid (service first, marketplace later)
4. **Pricing**: $100/page service initially; 18% commission for marketplace
5. **Content standard**: 60%+ uniqueness, E-E-A-T mandatory, 1,500-2,000 words
6. **Multi-protocol API**: MCP + REST/OpenAPI, public read endpoints, rate-limited
7. **Discovery**: `/.well-known/api-catalog` (RFC 9727), `/.well-known/mcp.json`, `<meta>` hints

### Open Questions / Not Yet Decided

1. Whether to build the "Public Directory" first or the page generator first
2. Exact tech stack for the landing page generator (Next.js mentioned but not committed)
3. How to handle the "cold start" problem for the marketplace phase
4. Whether to pursue the "Agent-Ready Commerce" (ARC) standard/badge program
5. Specific instrumentation for measuring AI traffic (bot detection, ACR/AAR metrics)

---

## 6. COMPLETE LANDING PAGE SPEC (from chat)

The chat produced a full generator specification:

### Required Data Model

- `Business`: id, name, legal_name, website, logo, phone, email, address, social, certifications
- `Service`: id, name, vertical, description, sku_catalog, base_price, bulk_tiers, surcharges
- `Coverage`: radius_miles, center coordinates, cities[], zips[], zones[] (with lead times & fees)
- `LocalPage`: slug_city, canonical_url, hero_photo, testimonials, lead_times_override, price_overrides

### Required Page Elements

1. `<title>` with service + city + brand
2. `<meta description>` with service area mention
3. `<link rel="canonical">`
4. `<link rel="api-catalog">` pointing to `/.well-known/api-catalog`
5. `<link rel="mcp-server">` pointing to `/.well-known/mcp.json`
6. `<meta name="ai-agent-api">` with API base URL
7. Full JSON-LD block: `LocalBusiness` + `Service` + `AggregateOffer` + `FAQPage` + `areaServed` (GeoCircle)
8. Hidden `<div data-ai-readable="true">` with agent instructions
9. Coverage & lead-time table (unique per city via zone calculation)
10. Pricing logic block with tiers and surcharges
11. 3-5 localized FAQ Q&As
12. Sitemap entry with `<lastmod>`

### CI/Linter Rules (build gate)

- Title includes service + city + brand
- JSON-LD parses with LocalBusiness + Service + areaServed
- At least 3 FAQ Q&As
- Coverage table with 2+ zones
- Pricing block present
- `dateModified` present
- H1 differs across cities
- `<link rel="api-catalog">` present
- Page indexable (no noindex)
- URL in sitemap
- TTFB < 800ms
- HTML < 200KB

### REST API Spec (OpenAPI 3.1.0)

- `POST /v1/quote` -- items[], delivery_zip, delivery_by, urgency, access_constraints
- `GET /v1/availability?zip=` -- lead_time_days_min/max, next_day_cutoff
- `GET /v1/inventory/{sku}` -- in_stock, region, last_updated

### Tiered Offering

- **Bronze**: Local pages + JSON-LD + sitemap + linter compliance + api-catalog link
- **Silver**: + per-zone lead-time table, surcharge logic, localized FAQs, live OpenAPI (read)
- **Gold**: + live quotes, availability by ZIP, inventory endpoint, MCP wrapper, analytics dashboard

---

## 7. KEY QUOTES (User's Own Words)

> "I want to be the place to go to for GETTING traffic from LLMs"

> "We are in the business of intent -- someone who needs something, not knowledge"

> "The vision: every page designed to be seen, parsed, and cited by LLMs, every business optionally callable by agents via MCP/REST, and you own the index + schema + gateway that connect the two"

> "Not all my users will have ALL local content... but they might be better on price, and the buyer might be ok with the lead time -- think hard here"

> "I still believe it's not good to just copy paste and change the city name -- that is the challenge"

---

_End of research output. All source documents read in full._
