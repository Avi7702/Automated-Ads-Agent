# Factory Research: CLIENTS Folder Analysis

**Date:** February 2026
**Source:** `c:/Users/avibm/AI SEO & LANDING PAGES/CLIENTS/`
**Purpose:** Extract what clients were served, their needs, what was delivered, and how the factory product was used in practice.

---

## Table of Contents

1. [Client Summary](#client-summary)
2. [Client 1: NextDaySteel (NDS)](#client-1-nextdaysteel-nds)
3. [Client 2: Reclaim My Finance (RMF)](#client-2-reclaim-my-finance-rmf)
4. [Cross-Client Patterns](#cross-client-patterns)
5. [How the Factory Product Was Used](#how-the-factory-product-was-used)
6. [Pricing Data](#pricing-data)
7. [Tooling and Platform Stack](#tooling-and-platform-stack)
8. [Lessons and Observations](#lessons-and-observations)

---

## Client Summary

| Dimension           | NextDaySteel (NDS)                        | Reclaim My Finance (RMF)                                                    |
| ------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| **Industry**        | Steel reinforcement / construction supply | Financial claims management (FCA-regulated)                                 |
| **Location**        | UK (mainland delivery)                    | UK                                                                          |
| **Business Model**  | B2B/B2C steel supplier (mesh, rebar)      | Claims firm (No Win No Fee)                                                 |
| **Client Size**     | SME supplier, trade + DIY customers       | Mid-sized claims company, 1800+ customers served                            |
| **Engagement Date** | November-December 2025                    | November 2025                                                               |
| **Engagement Type** | AI SEO Package 1 (execution)              | Multiple proposals (SEO, content factory, automations, marketing blueprint) |
| **Status**          | Active execution (partially delivered)    | Proposal stage (multiple documents prepared)                                |

---

## Client 1: NextDaySteel (NDS)

### Who They Are

NextDaySteel is a UK steel reinforcement supplier offering next-day delivery of mesh, rebar, and accessories across England and Wales. Key characteristics:

- **Customer segments:** Commercial contractors, medium contractors (SME, 10-20 projects), DIY/homeowners, procurement officers, maintenance managers
- **Core promise:** "Treat everyone as a big customer" -- DIY homeowner receives same respect as Kier Group
- **Differentiators:** Next-day delivery, same-day cut & bent fabrication, colour-coded bundles, photo proof of delivery, live tracking, trade prices direct to DIY customers
- **Scale:** 450+ orders/month fulfilled
- **Product range:** Steel mesh (A142, A193, A252, A393), rebar, cut & bent reinforcement, accessories

### What They Needed

NDS purchased **"AI SEO Package 1"** -- a comprehensive content and AI citation strategy with these committed deliverables:

| Category              | Count             | Details                                                                 |
| --------------------- | ----------------- | ----------------------------------------------------------------------- |
| On-Site Pages         | 26                | 15 blog/resource + 7 AI landing + 4 foundation pages                    |
| Off-Site Articles     | 20-25             | 10-12 how-to + 5-8 problem-solution + 3-5 case studies                  |
| AI Platform Artefacts | 10-14             | 5-8 Perplexity pages + 3-4 Claude artifacts + 1 ChatGPT GPT + 1 CodePen |
| Directory Citations   | Up to 30          | Constructionline, CHAS, Building.co.uk, etc.                            |
| Reviews               | 129 to 200+       | Multi-platform expansion                                                |
| GBP                   | Full optimization | Photos, Q&A, posts                                                      |

### What Was Delivered

**Completed artifacts:**

1. **Find a Structural Engineer UK** (Claude Artifact) -- Interactive React guide for UK homeowners/builders with sections on when to hire, where to find, costs (2025 UK prices), what to check, questions to ask, red flags. Includes interactive checklist, expandable accordion sections, dark mode toggle.

2. **Which Mesh for Garage Slab UK** (Claude Artifact) -- Guidance on mesh selection for garage slabs with typical specs (A193, 100-150mm).

**In-progress specs (research completed, not yet built):**

- Which Mesh for Shed Base (Artefact #3)

**Not yet started:** The remaining ~95% of deliverables (on-site pages, off-site articles, Perplexity pages, calculators, directory citations, etc.)

### Production Systems Created

A full production workflow was established:

- **NDS Artifact Build System v2.0** -- 937-line document covering brand identity, component patterns, technical specs, schema.org requirements, SEO requirements, accessibility standards, and an 8-step build process requiring 100/100 score before publication.
- **NDS Image Strategy** -- Comprehensive guide for image placement, density, technical SEO, and AI/LLM citation optimization.
- **NDS Execution Plan** -- Client-specific reference document with safety framework, hot topic page strategy, reusable content components, Claude artifacts list, Perplexity pages plan, and implementation priority order.
- **Project tracking system** -- Live tracker at nds-tracker.pages.dev with API endpoints for task management.
- **React/Vite codebase** -- Full web application in `anthropic-artifacts/` folder with dashboard layout, task detail pages, and component library.

### Key Technical Details

- **Safety framework:** Structural engineering guidance requires careful framing -- "typical specifications include..." not "you should use..." -- to avoid liability
- **Colour scheme:** Navy #1e3a5f, Orange #f97316, Steel grey #64748b
- **Technical standards cited:** BS 4483:2005, BS 4449:2005, BS 8500-1:2023, BS 7973-1:2001, NHBC Standards 2025, ACI 360R
- **Image hosting:** Cloudinary (res.cloudinary.com/djkkvl8sm/)
- **Image generation:** Gemini 3 Pro Image with Nano Banana skill

### Content Strategy: The NDS Formula

Every content piece follows this pattern:

```
HOT TOPIC QUESTION (what people search for)
  -> QUICK ANSWER (40-60 words, answer-first)
  -> WHAT ENGINEERS TYPICALLY SPECIFY (common specs with sources)
  -> INSTALLATION GUIDE (universal, works for ANY mesh type)
  -> DISCLAIMER (safety language, subtle footer style)
  -> FIND ENGINEER SECTION (every page)
  -> ORDER CTA (links to NDS products)
```

### AI Citation Priority (Top 10 Topics)

1. Which mesh for garage slab? (5/5 AI citation score)
2. Which mesh for shed base? (5/5)
3. A142 vs A193 mesh -- which to use? (5/5)
4. Which mesh for driveway? (5/5)
5. How to install mesh in concrete slab (4/5)
6. Do I need mesh in concrete? (4/5)
7. Which mesh for patio? (4/5)
8. How thick should concrete slab be? (3/5)
9. Rebar vs mesh -- when to use each? (3/5)
10. Find a structural engineer UK (3/5)

---

## Client 2: Reclaim My Finance (RMF)

### Who They Are

Reclaim My Finance is a UK financial claims management company handling three verticals:

1. **Investment mis-selling** (scam recovery, typical recovery GBP 10K-200K)
2. **Housing disrepair** (landlord/council claims, typical recovery GBP 1K-30K)
3. **Car finance PCP** (hidden commission claims, typical recovery GBP 2K-15K)

Key characteristics:

- **Positioning:** Speed, accessibility, transparency -- NOT technology
- **Promise:** 24-hour initial assessment, 24/7 chat support, No Win No Fee, average 8-month resolution
- **Social proof:** "1,847 customers have recovered GBP 500M+"
- **Regulatory environment:** FCA-regulated (COBS rules), ASA CAP Code compliance required
- **CRM:** HubSpot (existing)

### What They Needed

RMF received multiple proposal documents across four service categories:

#### Service 1: AI-Powered SEO Work Plan

**Three-pillar strategy:**

1. **AI-Enhanced Content at Scale (AI-SEO)** -- 50+ compliance-safe landing pages with central knowledge base
2. **Geographic and Vertical Expansion (GEOSEO)** -- 92 hyperlocal pages (50 council-specific housing + 30 lender-specific car finance + 12 regional investment)
3. **Answer Engine Optimization (AEO)** -- Visibility in ChatGPT, Perplexity, Google SGE, Reddit community authority

**Total deliverable:** 102+ pages optimized for AI platforms

**Key technical elements:**

- `/llms.txt` and `/llms-full.txt` files for AI platform navigation
- Markdown versions of key pages
- robots.txt optimized for AI crawlers (GPTBot, CCBot, PerplexityBot)
- Platform-specific content optimization (ChatGPT: story-first, Perplexity: data tables, Gemini: video)
- Reddit participation in r/LegalAdviceUK, r/UKPersonalFinance, r/HousingUK, r/CarFinance

#### Service 2: AI Content Factory

**Purpose:** Transform existing content into AI-optimized assets and multiply content 10x.

**5-phase process:**

1. Audit and Learn (brand voice, terminology, compliance requirements)
2. Transform and Structure (convert existing docs to AI-ready markdown)
3. Multiply and Expand (10 FAQs become 200+, voice search optimization, structured data, citation-ready content)
4. Format for Every Use Case (RAG/chatbots, voice search, Google AI/SGE, internal use)
5. Organize and Deliver (complete asset library with implementation guide)

**Deliverables:** 300+ structured files organized by use case

#### Service 3: Communication Automations

**7 automated workflows across Email, SMS, WhatsApp:**

1. Post-call follow-up (instant thank-you + next steps)
2. Document chase sequence (Day 3 SMS, Day 7 email, Day 14 final)
3. Agreement signing reminders (Day 2 SMS, Day 5 email, Day 10 call trigger)
4. Case milestone updates (automatic at each CRM stage change)
5. Win notification (celebration + settlement breakdown)
6. Review request (24hrs post-win, Trustpilot/Google links)
7. Referral request (48hrs post-win, unique referral link)

**Platform options presented:**

- Option A: HubSpot Starter + workarounds (GBP 150-200/mo, 70% capability)
- Option B: HubSpot Pro (GBP 1,000-1,040/mo, 100% capability)
- Option C: GoHighLevel (GBP 150-400/mo, 95% capability)

#### Service 4: AI-Enhanced Marketing Strategy (Full Blueprint)

**Comprehensive 1,895-line marketing blueprint covering:**

- 5-lane swimlane model (Discovery, Qualification, Conversion, Leverage, Support)
- 16 AI use cases across all channels
- Complete infrastructure layer (central knowledge base, AI content engine, conversational layer, SEO/AEO, monitoring, automation)
- 12-month implementation roadmap with monthly cost projections
- Tool recommendations with specific prices

**Expected outcomes (12-month):**

- Lead volume: 200-300/month to 600-800/month
- Content velocity: 2-3 pieces/week to 20-30/week
- Case follow-up time: 15+ hours/week to 2 hours/week
- Customer acquisition cost: GBP 500-1000 to GBP 150-200

### What Was Actually Delivered

RMF appears to have been at the **proposal/pre-sales stage** -- extensive strategy documents were prepared, but no execution/implementation files exist in the folder. The deliverables were:

1. Multiple versions of the strategy document (at least 3 iterations)
2. Multiple pricing/proposal documents (at least 4 versions)
3. Knowledge base versions of each service for voice agent use
4. A quote portal concept (Gemini Builder prompt) with AI chat agent, visitor tracking, and admin dashboard
5. PowerPoint slides for presentation

### Quote Portal Innovation

A notable deliverable was the **Quote Portal** concept -- a web-based proposal delivery system featuring:

- Visitor entry gate (name/email capture)
- Embedded Gamma presentation display
- AI chat agent ("Alex -- Your AI SEO Advisor") with proposal knowledge
- Inline video embeds throughout proposal
- Visitor engagement tracking (sections viewed, time spent, scroll depth, chat messages, CTA clicks)
- Admin dashboard with live visitor monitoring, engagement scoring (0-100), and hot lead alerts
- Return visitor recognition

---

## Cross-Client Patterns

### Common Service Elements

Both clients received services that share these patterns:

1. **AI Platform Optimization** -- Content structured for ChatGPT, Perplexity, and Google SGE citation
2. **Schema.org Markup** -- FAQPage, HowTo, Product/Service, LocalBusiness structured data
3. **Central Knowledge Base** -- Single source of truth for AI-powered content generation
4. **Compliance-First Methodology** -- Industry-specific regulatory compliance (structural engineering liability for NDS, FCA/ASA rules for RMF)
5. **Multi-Format Content** -- Same content transformed for multiple platforms and use cases
6. **Interactive Artifacts** -- React-based tools (calculators, guides, portals) as engagement drivers
7. **Reddit Community Strategy** -- Authentic participation to build AI citations

### Key Differences

| Aspect                  | NDS                                                   | RMF                                           |
| ----------------------- | ----------------------------------------------------- | --------------------------------------------- |
| **Content risk**        | Structural engineering liability                      | FCA regulatory compliance                     |
| **Compliance approach** | "Typical specifications" framing + subtle disclaimers | Prohibited language scanning + FCA COBS rules |
| **Scale of pages**      | 26 on-site + 20-25 off-site                           | 102+ pages (massive local coverage)           |
| **AI artifacts**        | Interactive React calculators/guides                  | Knowledge base files for chatbot/RAG          |
| **Engagement stage**    | Active execution (artifacts being built)              | Proposal stage (multiple strategy docs)       |

---

## How the Factory Product Was Used

### The "AI SEO & Landing Pages" Factory delivers three core products:

#### Product 1: Content at Scale

- **NDS:** Hot topic pages, mesh guides, installation guides, comparison content
- **RMF:** 92 hyperlocal pages (council-specific, lender-specific, regional), 200+ FAQs, educational guides
- **Pattern:** AI generates first drafts grounded in knowledge base, humans review for compliance, published with schema markup

#### Product 2: Interactive Artifacts / Tools

- **NDS:** Claude artifacts (React components) -- calculators, mesh selectors, engineer finders
- **RMF:** Quote portal with AI chat agent, engagement tracking, interactive proposal delivery
- **Pattern:** Self-contained React components with dark mode, schema.org JSON-LD, responsive design, accessibility compliance

#### Product 3: AI Citation Strategy (AEO/GEO)

- **NDS:** Perplexity pages (5-8), Claude artifacts (3-4), ChatGPT GPT (1), CodePen (1), directory citations (30)
- **RMF:** `/llms.txt` infrastructure, platform-specific content optimization, Reddit community authority building
- **Pattern:** Content optimized per AI platform -- ChatGPT (story-first), Perplexity (data tables), Gemini (video), with measurable AI traffic tracking

### Production Workflow

The factory follows a structured workflow:

```
1. Client brief / industry analysis
2. Content audit (what exists)
3. Knowledge base creation (single source of truth)
4. Content strategy (topics, keywords, schema types)
5. Content generation (AI-assisted, human-reviewed)
6. Schema markup + SEO optimization
7. AI platform optimization (AEO/GEO)
8. Quality assurance (100/100 scoring for NDS artifacts)
9. Publication + tracking
10. Performance monitoring + optimization
```

---

## Pricing Data

### NDS Pricing

NDS purchased "Package 1" -- pricing not explicitly stated in available files, but the proposal PDF was included. The package covered all deliverables listed above.

### RMF Pricing (Multiple Options Presented)

#### AI SEO Work Plan

| Option                          | Price                                        | Duration           | Pages                     |
| ------------------------------- | -------------------------------------------- | ------------------ | ------------------------- |
| Managed Monthly                 | GBP 8,000 setup + GBP 2,000/month (9 months) | 9 months           | 65-87                     |
| Milestone 1: Quick Wins         | GBP 12,000                                   | 2-4 weeks          | 15 pages + infrastructure |
| Milestone 2: Local Scale        | GBP 14,000                                   | 4-6 weeks          | 50 council pages          |
| Milestone 3: Vertical Expansion | GBP 12,000                                   | 4-6 weeks          | 30 lender pages           |
| Milestone 4: Advanced           | GBP 10,000                                   | 4-6 weeks          | 12 regional + video + hub |
| **Total Milestone**             | **GBP 48,000**                               | **3.5-5.5 months** | **102+ pages**            |

#### AI Content Factory

| Service                   | Price         |
| ------------------------- | ------------- |
| AI Content Factory        | GBP 2,750     |
| AI Chatbot Setup (add-on) | GBP 1,800     |
| **Total Package**         | **GBP 4,550** |

#### Communication Automations

| Option          | Setup Fee | Monthly Platform Cost |
| --------------- | --------- | --------------------- |
| HubSpot Starter | GBP 2,500 | GBP 150-200/mo        |
| HubSpot Pro     | GBP 2,250 | GBP 1,000-1,040/mo    |
| GoHighLevel     | GBP 2,500 | GBP 150-400/mo        |

#### Strategy + Training (DIY)

| Tier                      | Price                        | Total      |
| ------------------------- | ---------------------------- | ---------- |
| Tier 1: DIY with Guidance | GBP 4,500 one-time           | GBP 4,500  |
| Tier 2: Managed Launch    | GBP 8,000 + GBP 2,000/mo x 9 | GBP 26,000 |
| Tier 3: Full-Service      | GBP 4,000/mo x 12            | GBP 48,000 |

### Revenue Potential Per Client

If RMF purchased all services:

- AI SEO (milestone): GBP 48,000
- Content Factory: GBP 4,550
- Communication Automations: GBP 2,250-2,500 setup
- Marketing Blueprint implementation: Separate engagement

**Total potential per client: GBP 55,000-100,000+**

---

## Tooling and Platform Stack

### Tools Recommended Across Both Clients

| Category              | Tools                                                        | Monthly Cost |
| --------------------- | ------------------------------------------------------------ | ------------ |
| AI Content Generation | ChatGPT Pro (GBP 20), Claude Pro (GBP 18)                    | GBP 38       |
| SEO Analysis          | SEMrush (GBP 139), Clearscope (GBP 99), MarketMuse (GBP 199) | GBP 437      |
| Video Production      | Descript (GBP 24), Synthesia (GBP 40), VidIQ (GBP 20)        | GBP 84       |
| Email/CRM             | ActiveCampaign (GBP 59-99), HubSpot (GBP 50-890)             | Variable     |
| SMS/WhatsApp          | Twilio (GBP 1-5/mo per SMS)                                  | Usage-based  |
| Automation            | Zapier/Make (GBP 15-30)                                      | GBP 15-30    |
| Landing Pages         | Unbounce (GBP 99-299)                                        | GBP 99-299   |
| Image Hosting         | Cloudinary                                                   | Usage-based  |
| Schema                | Schema.org tools (free), Google Rich Results Test (free)     | Free         |
| Monitoring            | Brandwatch (GBP 299), Mention (GBP 30)                       | GBP 30-299   |
| Design                | Canva Pro (GBP 10)                                           | GBP 10       |

### Technology Stack for Artifact Development

- **Frontend:** React (JSX), Vite build system
- **Styling:** Inline styles with theme objects (no Tailwind in artifacts)
- **Icons:** Lucide React
- **Schema:** JSON-LD injected via useEffect
- **Hosting:** Cloudflare Pages (nds-tracker.pages.dev)
- **Image Generation:** Gemini 3 Pro Image
- **Version Control:** Git with structured commit messages

---

## Lessons and Observations

### 1. Proposal Depth as Sales Tool

RMF received extraordinarily detailed proposals -- the marketing blueprint alone was 1,895 lines. This depth serves as a demonstration of expertise and justifies premium pricing. The quote portal concept further innovates on proposal delivery.

### 2. Knowledge Base is the Foundation

Both clients' strategies center on a "Central Knowledge Base" as the single source of truth. For NDS, this is the Artifact Build System document. For RMF, it would be a comprehensive content library. Everything downstream (AI content generation, chatbot responses, compliance checking) depends on this knowledge base being accurate and maintained.

### 3. Compliance Frameworks are Industry-Specific

Each industry requires its own compliance approach:

- **Construction:** Liability avoidance through educational framing ("typical specifications" vs. "recommendations")
- **Financial services:** FCA COBS rules, ASA CAP Code, prohibited language scanning, audit trails

### 4. AI Citation Optimization (AEO) is the Differentiator

The factory's unique value proposition is optimizing content for AI platforms (ChatGPT, Perplexity, Gemini) rather than just traditional Google SEO. Key stat cited: "30-40% of searches now occur on AI platforms."

### 5. Interactive Artifacts Drive Engagement

The Claude artifacts (React components) serve dual purposes:

- **User engagement:** Calculators, selectors, and guides that provide immediate value
- **AI citation magnets:** Schema markup, structured data, and educational content that AI platforms can reference

### 6. Production Process Maturity

NDS has a mature production process (8-step build system, 100/100 scoring, visual validation checklists) while RMF is still at proposal stage. The NDS workflow could be templated for future clients.

### 7. Pricing Psychology

RMF proposals use anchoring strategy: present highest tier first (GBP 48,000), then recommended middle tier (GBP 26,000), then budget option (GBP 4,500). Expected conversion: 60-70% choose middle tier.

### 8. Multi-Document Strategy

Rather than one proposal, RMF received separate documents for each service (SEO, Content Factory, Automations, Blueprint). This allows modular purchasing and reduces sticker shock while maximizing total potential revenue.

---

## File Inventory

### NDS Files (Key)

| File                                        | Purpose                                       |
| ------------------------------------------- | --------------------------------------------- |
| `NDS-Package-1-Proposal.pdf`                | Original client proposal                      |
| `_PROJECT-INDEX.md`                         | Master project index with folder structure    |
| `NDS-EXECUTION-PLAN.md`                     | Detailed execution plan with all deliverables |
| `NDS-ARTIFACT-BUILD-SYSTEM.md`              | 937-line build system (brand, specs, process) |
| `NDS-IMAGE-STRATEGY.md`                     | Image optimization guide for AI citations     |
| `ARTEFACT-01-FIND-STRUCTURAL-ENGINEER.md`   | Spec for Engineer Finder artifact             |
| `ARTEFACT-02-WHICH-MESH-FOR-GARAGE-SLAB.md` | Spec for Garage Slab mesh guide               |
| `ARTEFACT-03-WHICH-MESH-FOR-SHED-BASE.md`   | Spec for Shed Base mesh guide                 |
| `find-structural-engineer-uk.jsx`           | Completed React artifact                      |
| `which-mesh-garage-slab-uk.jsx`             | Completed React artifact                      |
| `steel_specs.yaml`                          | Factory data file with steel specifications   |
| `nds-image-system-tracker.md`               | Image generation tracking                     |

### RMF Files (Key)

| File                                         | Purpose                                         |
| -------------------------------------------- | ----------------------------------------------- |
| `RMF-AI-Enhanced-Strategy-CLIENT-READY.md`   | 810-line integrated marketing strategy          |
| `RMF-AI-ERA-MARKETING-BLUEPRINT.md`          | 1,895-line comprehensive marketing blueprint    |
| `RMF-AI-CONTENT-FACTORY-PROPOSAL.txt`        | Content factory service proposal (GBP 2,750)    |
| `RMF-COMMUNICATION-AUTOMATIONS-PROPOSAL.txt` | 7-workflow automation proposal                  |
| `RMF-AI-SEO-PRICING-STRATEGY.md`             | 3-tier pricing strategy document                |
| `RMF-AI-SEO-2-OPTIONS-MILESTONE.md`          | Milestone vs. managed pricing options           |
| `RMF-AI-OVERLAY-FINAL.md`                    | AI enhancement overlay on traditional marketing |
| `01-AI-SEO-WORK-PLAN-KB.md`                  | Voice agent knowledge base version              |
| `02-AI-CONTENT-FACTORY-KB.md`                | Voice agent knowledge base version              |
| `03-COMMUNICATION-AUTOMATIONS-KB.md`         | Voice agent knowledge base version              |
| `04-INTEGRATED-MARKETING-STRATEGY-KB.md`     | Voice agent knowledge base version              |
| `QUOTE-PORTAL-GEMINI-PROMPT.md`              | AI-powered proposal portal concept              |
| Multiple PDF/PPTX files                      | Client-ready presentation materials             |

---

_End of research document._
