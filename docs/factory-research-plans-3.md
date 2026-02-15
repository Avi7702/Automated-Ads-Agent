# Factory Research Plans - Complete Analysis of AI SEO & Landing Pages Research

**Compiled:** February 13, 2026
**Source Directory:** `c:\Users\avibm\AI SEO & LANDING PAGES\`
**Scope:** All build plans, platform research, LLM discovery research, AI traffic data, and strategic documents

---

## Table of Contents

1. [Executive Overview](#1-executive-overview)
2. [LANDING-PAGE-BUILD-PLAN](#2-landing-page-build-plan)
3. [PLATFORM-BUILD-PLAN](#3-platform-build-plan)
4. [PHASE-9-LLM-DISCOVERY-RESEARCH](#4-phase-9-llm-discovery-research)
5. [AI-TRAFFIC-RESEARCH](#5-ai-traffic-research)
6. [Individual Strategy Documents](#6-individual-strategy-documents)
7. [Synthesis: The User's Vision](#7-synthesis-the-users-vision)

---

## 1. Executive Overview

The user conducted a massive, multi-phase research project (9+ phases, 3,981+ sources, 680M+ citations analyzed) to identify and build a business at the intersection of **AI-optimized landing pages** and **AI search engine optimization (GEO)**. The core thesis:

> **AI search engines (ChatGPT, Perplexity, Gemini, Copilot) are becoming primary discovery channels for services and products. Businesses optimized for AI citations convert 23x better than traditional search. There is a massive market gap: 0/30 landing page builders offer AI optimization, and the mid-market ($100-500/month) is completely underserved.**

### Business Models Explored (Chronological Evolution)

1. **$100/page landing page service** (earliest, simplest) -- generate AI-optimized landing pages for SMBs using OpenAI + deploy to Webflow/Vercel
2. **SaaS platform** ($49-299/month) -- AI-optimized landing page builder with GEO tracking dashboard
3. **AIO Service for Construction** ($5K-20K/month) -- high-touch AI optimization consulting leveraging user's construction industry expertise
4. **Hybrid Model** (recommended final strategy) -- bootstrap AIO service, use profits to fund a construction materials marketplace

### Chosen Vertical

**Plumbing** scored 89/100 as optimal first vertical (high intent, low digital sophistication, $130B+ US market), with expansion planned to HVAC, electricians, locksmiths, roofers, landscapers, and eventually B2B/SaaS.

---

## 2. LANDING-PAGE-BUILD-PLAN

**Status:** APPROVED & SEALED (November 4, 2025)
**Purpose:** Everything needed to build AI-optimized landing pages for the plumbing vertical. Isolated from platform infrastructure.

### 2.1 Technical Specifications (01-TECHNICAL-SPECS)

**Architecture:**

- Server-Side Rendering (SSR) or Static Site Generation (SSG) MANDATORY -- 90% of AI crawlers do NOT execute JavaScript
- Semantic HTML5 structure required (header, main, article, section, aside, footer)
- JSON-LD schema markup ONLY (100% parsing rate vs <40% for Microdata)

**Framework Recommendation:** Next.js (recommended) or Astro (lightweight alternative)

**Performance Targets:**

- LCP < 2.5s, INP < 200ms, CLS < 0.1
- Mobile-first mandatory (59.45% mobile traffic)
- Total page size < 500KB, images < 200KB each (WebP/AVIF)

**AI Crawler Support:**

- ChatGPT-User, PerplexityBot, Google-Extended, Bingbot all allowed
- Content freshness critical: ChatGPT cites content 393 days newer than Google on average
- Update content every 30-60 days

### 2.2 Content Templates (02-CONTENT-TEMPLATES)

**Validated 7-Block Structure (1,550-2,200 words total):**

| Block                      | Words   | Purpose                          |
| -------------------------- | ------- | -------------------------------- |
| 1. Hero Section            | 100-150 | H1 + value prop + CTA            |
| 2. Problem/Solution        | 200-250 | Customer pain points             |
| 3. Services Overview       | 300-400 | 4-6 services with H3 headings    |
| 4. Trust Signals           | 150-200 | Credentials, reviews, guarantees |
| 5. How It Works            | 200-250 | 3-4 step process                 |
| 6. FAQ Section (MANDATORY) | 500-800 | 5-8 Q&As, 30-40% citation boost  |
| 7. Final CTA               | 100-150 | Phone + secondary action         |

**Writing Style:** Conversational, question-based (not keyword-stuffed), Flesch 60-70, 8th-9th grade level, active voice.

**GEO Techniques (2025 validated):**

- Statistics integration: +33.9% citation improvement
- Expert quotations: +32% improvement
- Authoritative citations: +30.3% improvement
- Clear/fluent writing: +30% improvement

### 2.3 Schema Markup (03-SCHEMA-MARKUP)

All JSON-LD, placed in `<head>`. Priority order:

1. **FAQPage** (CRITICAL -- 30-40% citation boost)
2. **LocalBusiness** (with GeoCoordinates, aggregateRating, areaServed)
3. **Organization** (brand entity recognition)
4. **Service** (service-specific pages)
5. **BreadcrumbList** (site structure)

Complete ready-to-use code examples provided for all schema types, including a full-page example combining all schemas.

### 2.4 Platform Optimization Playbooks (04-OPTIMIZATION-PLAYBOOKS)

**Per-platform strategies with checklists:**

| Platform   | Primary Data Source                                | Key Optimization                                | Traffic Quality                                         |
| ---------- | -------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------- |
| ChatGPT    | 48.73% third-party (Foursquare, Yelp, TripAdvisor) | Complete third-party profiles, NAP consistency  | 15.9% conversion rate (803% > Google)                   |
| Perplexity | Reddit 6.3%, Forums 16.9%, News 14.2%              | In-depth content 2,000+ words, comparison data  | 10.5% conversion (497% > Google), 20-30% on high-intent |
| Gemini     | Google Business Profile PRIMARY, Blogs 39%         | GBP 100% complete, E-E-A-T signals              | 30% improvement with E-E-A-T                            |
| Copilot    | Bing Search Index, IndexNow API                    | Bing Webmaster Tools, IndexNow instant indexing | Semantic clarity preferred                              |

**Additional strategies covered:**

- Alternative AI search engines (Brave, Kagi, Yep) -- "AIO-First" Google-bypass strategy
- Local landing pages optimized for AI agents (1,000+ unique words per city, local schema)
- Fast backlink strategy focused on AI citation value (not Google PageRank)
- GA4 AI traffic tracking setup (custom channel groups, regex patterns)
- Reddit/UGC strategy (21.74% of all AI citations, Reddit cited 2x more than Wikipedia)
- Vendor Discovery advantage: AI traffic converts 23x better, 80% higher revenue per visit

### 2.5 Design Patterns (05-DESIGN-PATTERNS)

Mobile-first responsive design specifications including:

- Typography scales (mobile vs desktop)
- Color palette (Trust Blue #1A73E8, Safety Red #DC3545, Success Green #28A745)
- Button/CTA hierarchy (primary, secondary, tertiary)
- Trust signal components (star ratings, badges, testimonial cards)
- Form design with accessibility (WCAG 2.1 AA)
- Video/multi-format content strategy (Perplexity favors video + text)
- Recommended UI: Tailwind CSS

### 2.6 Implementation Checklist (06-IMPLEMENTATION-CHECKLIST)

**8-week build plan with 120+ validation items:**

- Week 1: Foundation & Setup (framework, design system)
- Week 2: Core page structure (header, hero, content sections)
- Week 3: Content & schema implementation
- Week 4: GEO optimization & trust signals
- Week 5: Forms & interactivity
- Week 6: Performance & mobile optimization
- Week 7: Platform-specific optimization
- Week 8: Testing, launch & monitoring

Post-launch: weekly/monthly/quarterly/annual maintenance schedules.

---

## 3. PLATFORM-BUILD-PLAN

**Status:** Directories created but EMPTY (as of November 16, 2025)

Six subdirectories were created but contain no files:

- `01-ARCHITECTURE-SPECS/`
- `02-TECH-STACK-ANALYSIS/`
- `03-DEPLOYMENT-STRATEGY/`
- `04-MULTI-VERTICAL-SCALING/`
- `05-INTEGRATION-POINTS/`
- `06-IMPLEMENTATION-CHECKLIST/`

**Interpretation:** The user planned to create platform infrastructure docs after sealing the landing page build plan, but pivoted strategy before completing this. The landing page build plan README explicitly states: "Those will be in a separate PLATFORM-BUILD-PLAN folder after this is sealed."

---

## 4. PHASE-9-LLM-DISCOVERY-RESEARCH

**Completed:** November 3, 2025
**Focus:** Understanding the real competitive landscape for LLM-optimized landing page services

### 4.1 LLM Query Test Results

Tested 48+ queries across 8 service verticals and 5 US cities (LA, Chicago, Houston, Phoenix, Dallas).

**Key findings (later corrected -- see 4.5):**

- Yelp appeared in 94% of queries (later revised downward)
- Business websites appeared in 90% of queries
- Angi 58%, HomeAdvisor 39%, BBB 35%

**Quality gaps identified:**

- Transparent pricing: only 40% of queries show it
- Real-time availability: 0% of platforms provide it
- Visual content: minimal in results
- Personalization: none

### 4.2 Directory/Platform Competitive Analysis

Analyzed 10 major directories (Yelp, Angi, Thumbtack, HomeAdvisor, etc.):

- Only 20-30% actively optimize for LLMs
- 70% show NO evidence of LLM optimization
- No platform offers "LLM optimization as a service"

### 4.3 Local SEO Platform Analysis

Analyzed 17 platforms (Yext, BrightLocal, Synup, Birdeye, etc.):

- Only 4/17 (24%) do BOTH landing pages + LLM optimization
- Yext ($500-1000/location/year) -- enterprise only
- **Mid-market gap:** 10-100 location businesses have NO affordable option
- User's opportunity: position at $99-149/month per location

### 4.4 Landing Page Service Providers Analysis

- Agency pricing: $1,400-$28,000 per page
- Freelancer pricing: $200-$3,000 (design only, no optimization)
- Only 30% mention AI/LLM -- mostly for lead management, not SEO
- GEO (Generative Engine Optimization) nearly absent

### 4.5 Research Correction

The user caught statistical bias in the original research. A correction document was created:

- Original claim "Yelp 94%" was based on only 31 queries (statistically meaningless)
- Real data from 10 studies (680M+ citations) shows:
  - Foursquare: 60-70% of ChatGPT local citations
  - Business websites: 58% citation rate
  - Yelp: 33% across all LLMs (important but NOT dominant)
  - Strategy should be multi-platform, not Yelp-centric

### 4.6 Market Opportunity Summary

- **70%** of platforms have NO LLM optimization
- **76%** don't create landing pages + optimize for AI
- **Mid-market** ($100-500/mo budget) has ZERO options
- Service providers charge $1,400-$28,000/page with limited AI optimization
- Recommended position: $99-199/month per location, 50-75% cheaper than enterprise

---

## 5. AI-TRAFFIC-RESEARCH

### 5.1 Comprehensive AI Traffic Report (November 2025)

**Growth metrics:**

- AI traffic growing 527-1,200%+ YoY across industries
- Shopify AI traffic up 7X (Jan-Nov 2025), AI-driven orders up 11X
- Adobe retail traffic from AI: +4,700% YoY (July 2025)
- Monthly growth slowing: 25.1% (2024) to 10.4% (Nov 2025) -- still growing but peaked

**Conversion data:**

- ChatGPT conversion rate: 15.9% vs Google's 1.76% (803% improvement)
- AI search traffic converts 23x better than traditional organic (Ahrefs)
- Revenue per visit from AI: +84% (Jan-Jul 2025)
- AI traffic now 9% MORE likely to convert than generic traffic (vs -43% penalty in July 2024)

**Platform economics:**

- Google deliberately limits AI Overviews for commercial queries (e-commerce AIO dropped from 29% to 4%)
- AI cannot complete transactions -- must send users to vendor sites
- B2B: 90% of buyers use GenAI in purchasing, 50% start buying journey in AI chatbot

### 5.2 AI Traffic Percentage Data

Detailed ecommerce and services data showing AI traffic as percentage of total, with conversion rate comparisons across sectors.

---

## 6. Individual Strategy Documents

### 6.1 AI Landing Page Service Strategy

A chat transcript documenting the user's journey from concept to MVP planning:

**Evolution of approach:**

1. Started with $100/page concept using Framer
2. Evaluated Framer vs Webflow vs custom Next.js
3. Chose Webflow initially, then explored SuperDev.build for implementation
4. Built 3 MVP options: frontend demo, full Next.js system, CLI script
5. Engaged SuperDev.build to build the UI (completed frontend, missing backend integrations)

**Final architecture planned:**

- Next.js + TypeScript + Tailwind CSS
- OpenAI API for content generation
- Stripe for $100 payments
- Webflow API for CMS deployment
- Multi-step form: Discovery -> AI Generation -> Review -> Deploy

### 6.2 AI SEO vs Traditional SEO

Educational document covering:

- Traditional SEO targets Google/Bing; AI SEO targets ChatGPT/Perplexity/Claude
- Key differences: keyword optimization vs being cited as authoritative source
- Implementation: semantic HTML5, JSON-LD schema, llms.txt file, comprehensive content (3,000+ words), E-E-A-T signals
- Tool gap identified: no tool exists that takes a URL and rebuilds it as AI-SEO optimized

### 6.3 API-First Landing Page Platforms Research (December 2025)

Comprehensive evaluation of headless CMS and programmatic builders:

| Platform   | Type            | API                   | Pricing                  | CLI Deploy |
| ---------- | --------------- | --------------------- | ------------------------ | ---------- |
| Sanity.io  | Headless CMS    | REST + GraphQL + GROQ | Free/$199/$949/mo        | Yes        |
| Contentful | Headless CMS    | REST + GraphQL        | Free/$300-489/mo         | Yes        |
| Strapi     | Open-source CMS | REST + GraphQL        | Free (self-hosted)       | Yes        |
| Storyblok  | Headless CMS    | REST + GraphQL        | Free/Business/Enterprise | Yes        |
| Prismic    | Headless CMS    | REST + GraphQL        | Various tiers            | Yes        |

Also evaluated: Static site generators (Astro, Next.js, Hugo, Gatsby, Eleventy) and programmatic builders.

### 6.4 FUTURE_IDEAS.md

Deferred feature: **MCP (Model Context Protocol) API Integration**

- Meta tags to make site directly queryable by AI agents
- `<link rel="mcp-server">` pointing to MCP endpoint
- Hidden HTML block with AI agent instructions
- Deferred because no actual API/MCP server exists yet
- Planned for Phase 2 or 3, estimated 2-3 weeks effort
- Target domain: nextdaysteel.co.uk (construction/steel supplier)

### 6.5 Competitive Intelligence Executive Summary

Analyzed 60 competitors (30 landing page + 30 AI SEO services):

**Critical finding: $5B+ market gap**

- 0/30 landing page builders optimize for ChatGPT/Perplexity
- 0/30 offer AI visibility tracking or GEO
- 60% of AI SEO providers prove demand exists
- First-mover window: 12-18 months

**Recommended pricing tiers:**

- Free ($0) -- 1 page, lead gen
- Starter ($49/mo) -- 5 pages, basic AI SEO
- Pro ($99/mo) -- Unlimited, full optimization, 4 AI platforms
- Elite ($199/mo) -- GEO dashboard, white-label
- Agency ($299/mo) -- 50 client accounts, full white-label, API

**Go-to-market:** Phase 1 plumbing (100 customers), Phase 2 agency expansion (25 agencies), Phase 3 multi-vertical (500 customers), Phase 4 B2B/SaaS.

### 6.6 Updated Recommendation with Construction Expertise

The user has construction industry expertise. This changed the calculus:

**Hybrid Model (rated 9.2/10 with expertise):**

1. **Phase 1 (Months 1-6):** AIO Service for construction suppliers at $5K-20K/month, leveraging existing relationships (50+ contacts), targeting $120K MRR by Month 6
2. **Phase 2 (Months 7-18):** Build construction marketplace using service profits ($150-300K development capital)
3. **Phase 3 (Months 19-36):** Integrated platform with dual revenue streams, targeting $3.5-5M ARR, $25-40M exit valuation

**Key advantages over typical marketplace founders:**

- Deep domain expertise (70% of construction marketplace failures lack this)
- Existing industry relationships (solves chicken-and-egg problem)
- Capital efficiency (bootstrap from service profits, no VC needed)
- Revenue from Day 1 (not 12-18 months wait)

---

## 7. Synthesis: The User's Vision

### What Was Being Planned

A multi-layered business combining:

1. **AI-optimized landing page generation** -- automated creation of pages that rank in ChatGPT, Perplexity, Gemini, and Copilot
2. **GEO (Generative Engine Optimization)** -- a new discipline the user researched extensively, applying statistics, quotations, citations, and clear writing to boost AI citation rates by 30-40%
3. **Multi-platform AI visibility tracking** -- monitoring brand citations across all major AI platforms
4. **Vertical specialization** -- starting with plumbing/home services, expanding to construction (leveraging expertise)

### Architecture/Platform Chosen

- **Framework:** Next.js with SSR/SSG (mandatory for AI crawler compatibility)
- **Styling:** Tailwind CSS
- **Content:** AI-generated via OpenAI, structured in 7-block format
- **Schema:** JSON-LD (FAQPage, LocalBusiness, Organization, Service)
- **CMS Options Evaluated:** Webflow API, Sanity.io, Strapi, custom Next.js
- **Hosting:** Vercel or Cloudflare Pages
- **Deployment:** API-first, programmatic, CI/CD via GitHub Actions

### Business Strategy

The user went through several iterations:

1. **Initial concept:** $100/page one-time service for SMBs
2. **SaaS evolution:** $49-299/month subscription platform
3. **Service-first pivot:** $5K-20K/month AIO service for construction (leveraging expertise)
4. **Final recommendation:** Hybrid bootstrap model -- service profits fund marketplace, targeting $25-40M exit in 36 months

### The User's Product Vision

> Build the **first AI-optimized landing page platform** that helps businesses get discovered by AI search engines. Position at the intersection of landing page builders ($715M market) and AI SEO services ($4.5B market). Start with high-touch service for construction vertical, bootstrap into a scalable platform, and become the category-defining product before competitors notice the gap (12-18 month window).

### Key Data Points Supporting the Vision

- AI search traffic converts 23x better than traditional organic
- ChatGPT conversion rate: 15.9% vs Google's 1.76%
- 0/30 landing page builders have AI optimization
- Mid-market ($100-500/month) completely underserved
- AI traffic growing 527-1,200%+ YoY
- Reddit cited 2x more than Wikipedia across AI platforms
- 90% of B2B buyers use GenAI in purchasing decisions
- FAQ schema provides 30-40% citation boost
- GEO techniques validated by Princeton/Georgia Tech research

### Construction-Specific Angle

The user has construction industry expertise (steel/materials), with:

- 50+ industry contacts for warm introductions
- Deep understanding of B2B procurement pain points
- Knowledge of construction going digital (68% using/planning AI)
- Plan to build "NextDaySteel" style MCP-enabled supplier site
- Hybrid model leverages this for $3.5-5M ARR in 3 years

---

_End of research compilation. All files in LANDING-PAGE-BUILD-PLAN, PHASE-9-LLM-DISCOVERY-RESEARCH, AI-TRAFFIC-RESEARCH, and individual strategy documents have been read and synthesized._
