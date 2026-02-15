# Factory Research: NDS (NextDaySteel) Analysis Work

**Date Compiled:** 2026-02-13
**Sources:** 8 documents from `AI SEO & LANDING PAGES/NDS-ANALYSIS-WORK/`, `NDS_PROJECT_PLAN.md`, `NDS-INTEGRATED-PROPOSAL-SUMMARY.md`, and `CONTENT_FACTORY_ARCHITECTURE.md`
**Purpose:** Extract how the content factory was applied to a real client (NextDaySteel), what analysis was done, what content strategy was developed, and lessons learned.

---

## 1. EXECUTIVE SUMMARY

NextDaySteel (NDS) is a UK steel supplier that became the first real-world client application of the AI SEO Content Factory concept. The work spans from November 2025 through early 2026 and covers:

1. **AI SEO Research & Rule Validation** -- Extensive data-backed research into what makes content get cited by LLMs (ChatGPT, Perplexity, Claude, Gemini)
2. **Content Factory Architecture** -- A production system that transforms a task tracker into an automated content factory with 120-rule validation
3. **6-Stage Smart Pipeline** -- A multi-agent content generation pipeline with specialized "brains" (Strategist, Architect, Visual Director, Networker, Builder, Auditor)
4. **Client Proposal & Sprint Planning** -- A complete go-to-market proposal with 42 action items, 9-month roadmap, and 3-tier pricing (GBP 7.5K-35K)

The NDS work represents the **proof-of-concept** for turning AI SEO research into a repeatable, productized service.

---

## 2. WHAT ANALYSIS WAS DONE FOR NEXTDAYSTEEL

### 2.1 Chat History Analysis (3 Deep-Dive Sessions)

Three separate chat histories were systematically analyzed using a structured methodology:

**Chat 1 -- System Architecture Discovery:**

- Mapped the existing NDS Content Engine v2.0 system
- Identified the 6-stage Smart Pipeline (Strategist -> Architect -> Visual Director -> Networker -> Builder -> Auditor)
- Documented the technology stack: React 19 + Vite 7, Cloudflare Pages/Workers, D1, R2, Drizzle ORM
- Catalogued existing tracker at `nds-tracker.pages.dev` with 122 tasks and 3 completed JSX artifacts
- Identified critical gaps: deployment process, how artifacts become live pages, UI dashboard design

**Chat 2 -- AI SEO Rule Validation (The Core Research):**

- Started from `AI_SEO_RULEBOOK_v2.md` -- user asked "how can we verify all this rules?"
- Pivotal moment: User said "i need to know if its real and the info there is not old"
- Led to comprehensive validation against 10+ authoritative sources
- Created `nds-verification-rules-v3.4.md` through 4 iterations (v3.0 -> v3.4)
- Resolved major debates (question headings, FAQPage schema)
- Built 100-point scoring system with 90/100 minimum to publish

**Chat 3 -- Document Evolution & Restructuring:**

- Tracked document evolution through all 4 versions
- Performed gap analysis against 6 old project files
- Planned 3-document split: Reference, Build Checklist, QA Checklist
- Final document: 12 sections, ~105 checkboxes, 100-point weighted scoring

### 2.2 Primary Research Source: SE Ranking Study (Nov 2025)

The single most important data source -- the only large-scale empirical study found:

- **Scale:** 129,000 domains, 216,524 pages, 20 niches
- **Date:** November 2025

**Hard Data Extracted:**

| Factor                | Optimal                 | Citation Impact                 |
| --------------------- | ----------------------- | ------------------------------- |
| Word count            | 2,900+ words            | 5.1 citations (vs 3.2 for <800) |
| Data points           | 19+ stats/specs         | 5.4 citations (vs 2.8)          |
| Expert quotes         | Include at least 1      | 4.1 citations (vs 2.4)          |
| Section length        | 120-180 words           | 4.6 citations                   |
| Content freshness     | Updated within 3 months | 6.0 citations (vs 3.6)          |
| Page speed (FCP)      | Under 0.4 seconds       | 6.7 citations (vs 2.1)          |
| Reddit/Quora presence | Active                  | 7.0 citations (vs 1.7)          |

**What to AVOID (Verified Negatives):**

| Bad Practice                  | Citation Penalty |
| ----------------------------- | ---------------- |
| Question-style H1/H2 headings | -21%             |
| Keyword-stuffed URLs          | -58%             |
| Keyword-stuffed titles        | -52%             |

### 2.3 Additional Sources Consulted (10+)

1. SE Ranking Study (via Search Engine Journal) -- Nov 2025
2. Search Engine Land -- "Good GEO is Good SEO" (Nov 26, 2025)
3. Backlinko -- "GEO: How to Win in AI Search" (Nov 12, 2025)
4. Semrush -- GEO vs SEO Comparative Guide (Sept 2025)
5. Neil Patel -- "LLM Seeding" blog post
6. David Quaid Podcast -- "AI & LLM Visibility" (Episode 859)
7. SurferSEO
8. StoryChief
9. TechMagnate
10. Studio 36 Digital

### 2.4 Claim Verification Results

| Claim from Original Rulebook         | Status     | Evidence                                  |
| ------------------------------------ | ---------- | ----------------------------------------- |
| 2,900+ words = 5.1 citations         | VERIFIED   | SE Ranking study                          |
| 19+ data points = 5.4 citations      | VERIFIED   | SE Ranking study                          |
| Expert quotes = 4.1 vs 2.4 citations | VERIFIED   | SE Ranking study                          |
| Question headings underperform       | VERIFIED   | SE Ranking: 3.4 vs 4.3 citations          |
| FAQPage schema "hurts by 17%"        | FALSE      | No source found, contradicted by evidence |
| FCP < 0.4s = +219% citations         | UNVERIFIED | No source found for percentage            |

---

## 3. CONTENT STRATEGY DEVELOPED

### 3.1 The 100-Point Scoring System

A weighted validation scoring system with 90/100 minimum to publish:

| Element                           | Points  | Check Method            |
| --------------------------------- | ------- | ----------------------- |
| Schema markup (FAQPage + WebPage) | 15      | JSON-LD parser          |
| H1 contains "UK"                  | 10      | Regex match             |
| Expert quote with source          | 10      | Text search             |
| Comparison table (3+ rows)        | 15      | DOM `<tr>` count        |
| Statistics (5+ data points)       | 10      | Regex number counter    |
| Quick Answer Box                  | 10      | Search for H2           |
| Subtle footer (no warnings)       | 10      | Negative search         |
| UK sources cited                  | 10      | Link check              |
| Core Web Vitals (FCP < 0.4s)      | 5       | Lighthouse CI           |
| Visual validation                 | 5       | Font size checks        |
| **TOTAL**                         | **100** | **Minimum 90 required** |

**Instant Fail Conditions:** Warning boxes, Yellow backgrounds, "IMPORTANT NOTICE" headings, Broken links, Missing schema

### 3.2 The 3-Document Workflow Structure

The strategy evolved from a single encyclopedia-style rulebook to a 3-document workflow:

**Document 1: NDS-REFERENCE.md** (Read before starting)

- Brand identity (logo, colours, typography)
- Technical specifications
- Content guidance (personas, phrasing)
- Proof points and stories
- Best practice quick reference
- No checkboxes -- pure reference material

**Document 2: NDS-BUILD-CHECKLIST.md** (Step-by-step during build)

- Step 1: Content Structure (LLM Optimization)
- Step 2: Schema Implementation
- Step 3: UI/UX Build
- Step 4: Performance
- Step 5: SEO & Crawlers
- All checkboxes -- sequential workflow

**Document 3: NDS-QA-CHECKLIST.md** (Final gate before publish)

- Technical Accuracy Verification
- Content Compliance
- Pre-Publish Checks
- 100-Point Scoring
- Export & Publication
- Approval Sign-off

### 3.3 Question Headings Resolution (Key Decision)

A major debate resolved through extensive research:

- **SE Ranking Data:** Question H1/H2 = 3.4 citations vs Direct = 4.3 citations (-21%)
- **20+ Other Sources:** Recommend question headings (but no data to back it)
- **SE Ranking's own blog contradicts their own study** -- recommends questions but data shows direct is better

**Final Rule:**

```
H1 (Title): DIRECT -- "UK Garage Slab Mesh Calculator 2025"
H2 (Sections): DIRECT -- "Mesh Specifications" not "What Mesh Specs?"
H3/H4 (Subsections): QUESTIONS OK -- "How much does A193 weigh?"
FAQ Section: QUESTIONS -- Full Q&A format at bottom
```

### 3.4 Client Content Plan (Phase 1: 110+ Tasks)

**On-Site Content (26 new pages):**

- 15 Blog/Resource Articles (Steel Specifications Guide, BS EN Compliance, Regional Pricing Guides, Product Comparisons, Installation Guides)
- 7 AI Landing Pages (AI search landing, Voice Search, Competitor comparisons, Calculators)
- 4 Foundation Pages (Team & Expertise, Testimonials, Case Studies Hub, FAQ Hub)

**Off-Site Content (20-25 articles):**

- 10-12 How-To Guides
- 5-8 Problem-Solution Articles
- 3-5 Case Studies

**AI Platform Assets (10-14 items):**

- 5-8 Perplexity Pages
- 3-4 Claude Artifacts (calculators, selectors)
- 1 Custom ChatGPT (UK Steel Specification Assistant)
- 1 CodePen Interactive Tool

**Infrastructure (~50 tasks):**

- Analytics (Semrush monitoring, citation tracking, dashboards)
- Google Business Profile (6 optimization tasks)
- Review Management (129 -> 200+ reviews target)
- Citations (up to 30 directory listings)
- Community presence (Reddit, Wikipedia, Medium, Quora, Stack Exchange)

---

## 4. HOW THE FACTORY WAS APPLIED TO NDS

### 4.1 The Content Factory Architecture

The factory concept transforms a static task tracker into an automated content production system:

**Before (Task Tracker):**

- Static "To Do" lists
- Manual check-off
- "Did I do this?" uncertainty
- Just links to files

**After (Content Factory):**

- Live Content Cards with visual status (Draft -> Review -> Verified -> Published)
- Automated 120-rule validation
- "System verified 120 rules" certainty
- Visual Editor & Verification Station

### 4.2 The 6-Stage Smart Pipeline

Each stage has a specialized "brain":

| Stage | Brain               | Purpose                | Input      | Output               |
| ----- | ------------------- | ---------------------- | ---------- | -------------------- |
| 1     | The Strategist      | Content angle analysis | Keyword    | Content_Spec.json    |
| 2     | The Architect       | Structure design       | Spec       | Structure.jsx        |
| 3     | The Visual Director | Image planning         | Draft      | Image_Manifest.json  |
| 4     | The Networker       | Link mapping           | Draft      | Interlinked_Draft.md |
| 5     | The Builder         | Code generation        | All inputs | Artifact_Final.jsx   |
| 6     | The Auditor         | Validation             | Code       | Validation_Report    |

**Key Pipeline Features:**

- Image Brain scans content for visual opportunities, categorizes (Hero, Explanatory, Comparison, Product, Trust), generates prompts
- Link Brain loads sitemap.xml, matches product mentions to actual URLs via store MCP, ensures 1 link per 100 words, no dead links
- Double-Lock validation: DOER implements rule, CHECKER validates rule

### 4.3 The Verification Station (3-Panel Workspace)

When clicking any content card:

1. **Left Panel (Content):** The actual landing page preview
2. **Middle Panel (Validator):** Real-time checklist of 120 AI SEO rules with pass/fail indicators
3. **Right Panel (Fixer):** AI suggestions to fix errors

### 4.4 Technical Stack

- Frontend: Astro + TailwindCSS (existing NDS-WEB-BUILD)
- Database: Local JSON files (Option A) or Supabase PostgreSQL (Option B)
- Logic Layer: Python scripts -- `validator.py` (120 checks), `schema_gen.py` (JSON-LD), `content_gen.py` (LLM drafts)
- Deployment: Cloudflare Pages + Workers
- Output: React JSX artifacts (standalone components)

### 4.5 Completed Artifacts

Three JSX artifacts were produced:

1. `find-structural-engineer-uk.jsx`
2. `which-mesh-garage-slab-uk.jsx`
3. `which-mesh-shed-base-uk.jsx`

---

## 5. THE INTEGRATED PROPOSAL (Client-Facing)

### 5.1 Key Market Findings (2025)

| Finding                        | Data Point                                        | Source                   |
| ------------------------------ | ------------------------------------------------- | ------------------------ |
| ChatGPT dominates AI referrals | 77.97% vs Perplexity 6.4%                         | AI Traffic Research 2025 |
| Reddit = major citation source | 40% of AI citations                               | Multiple sources         |
| E-E-A-T matters for AI         | 86% of AI citations from brand-controlled sources | Research                 |
| AI traffic converts better     | 5X-14X better than Google (certain segments)      | Research                 |
| LLM accessibility (/llms.txt)  | 3-5X better discoverability                       | Research                 |
| Desktop dominates AI traffic   | 86% of AI traffic is desktop                      | Research                 |

### 5.2 Critical Gaps in Original Proposal

1. **No platform-specific strategy** (25-30% lower performance impact)
2. **Reddit strategy completely missing** (40% of citations left on table)
3. **E-E-A-T documentation incomplete** (86% of citations from brand sources)
4. **No /llms.txt or markdown strategy** (50% less AI crawler activity)
5. **No conversion targets or success metrics** (flying blind)

### 5.3 Three Pricing Tiers

| Tier      | Original | Enhanced     | Key Additions                                           |
| --------- | -------- | ------------ | ------------------------------------------------------- |
| Quick Win | GBP 7.5K | GBP 7.5-8.5K | Reddit, /llms.txt, trust docs, tracking                 |
| Balanced  | GBP 11K  | GBP 13-14K   | + Platform-specific, E-E-A-T, schema                    |
| Complete  | GBP 25K  | GBP 28-35K   | + Video, press, educational hub, competitive monitoring |

### 5.4 9-Month Roadmap

**Sprint 1 (Weeks 1-6):** Foundation & Quick Wins

- /llms.txt, markdown, robots.txt
- E-E-A-T signals (company story, team bios, testimonials)
- Reddit presence
- ChatGPT content optimization
- Tracking infrastructure
- Expected: 0.05-0.2% AI traffic

**Sprint 2 (Weeks 7-12):** Growth & Expansion

- Perplexity-specific content
- Gemini optimization
- Video testimonials
- Educational content hub (25-30 guides)
- Expected: 0.3-1.5% AI traffic

**Sprint 3 (Weeks 13-18):** Domination & Optimization

- Competitive analysis & gap exploitation
- Advanced Perplexity optimization
- Authority site expansion (100-180 pages)
- Conversion optimization
- Expected: 2-4% AI traffic

### 5.5 42 Action Items (Organized by Category)

1. **Platform-Specific Strategies** -- ChatGPT (77.97%), Perplexity (6.4%), Gemini (<5%)
2. **Reddit & Community Authority** -- 15+ target communities, 40% citation share target
3. **E-E-A-T Documentation** -- Company story, team bios, 8-10 case studies, video testimonials
4. **Technical LLM Accessibility** -- /llms.txt, markdown versions, Schema.org, robots.txt
5. **Tracking & Optimization** -- AI traffic monitoring, conversion targets, competitive analysis
6. **Content Hub & Video** -- Educational center, video testimonials, product demos

---

## 6. LESSONS LEARNED

### 6.1 Research & Validation Lessons

1. **Always verify claims against data** -- The original AI SEO Rulebook had unverified claims (FAQPage schema "hurts by 17%" was false). Never trust rulebooks without sources.
2. **Follow the data, not opinions** -- SE Ranking's 129K domain study > 20+ expert opinions without data backing.
3. **SE Ranking's own blog contradicts their own study** -- They recommend question headings but their data shows direct headings perform 21% better. Primary research > blog posts, even from the same source.
4. **One authoritative study > many opinions** -- The SE Ranking study was the ONLY large-scale empirical data found across 10+ sources.

### 6.2 Document Structure Lessons

5. **Workflow-based docs > encyclopedia-style** -- The original verification rules were organized by topic (encyclopedia-style) but couldn't be followed as a workflow. Splitting into Reference/Build/QA dramatically improved usability.
6. **Track document evolution carefully** -- Through v3.0 -> v3.4, each version was tracked with explicit change logs. This prevented regression and made review possible.
7. **Positive framing matters** -- "Common Mistakes" was renamed to "Best Practice Reference" to align with brand guidelines (positive, not alarming).

### 6.3 Content Factory Lessons

8. **The gap between "tracker" and "factory" is the automation layer** -- A task list is passive; a factory actively validates, scores, and gates publishing.
9. **The 90/100 scoring gate prevents bad content from going live** -- Binary pass/fail is too rigid; a weighted scoring system with a threshold (90/100) allows flexibility while maintaining quality.
10. **Double-Lock validation catches what single checks miss** -- Having both the DOER and CHECKER responsible for each rule creates redundancy that catches errors.

### 6.4 Client Engagement Lessons

11. **AI traffic is nascent but high-converting** -- At 0.05-4% of total traffic over 9 months, it is still small but converts 5-14X better than Google traffic.
12. **Reddit is massively undervalued** -- 40% of AI citations come from Reddit, yet most SEO proposals completely ignore it.
13. **Quick wins build trust** -- Starting with zero-cost items (/llms.txt, Reddit presence, About page rewrite) delivers early results that justify larger investments.
14. **Platform-specific strategies matter** -- ChatGPT (stories + customer proof) needs different content than Perplexity (data + sources + specifications). One-size-fits-all fails.

### 6.5 Technical Lessons

15. **JSX artifacts as standalone components** -- React JSX files that can be independently deployed make the factory output modular and composable.
16. **Cloudflare stack (Pages + Workers + D1 + R2)** was chosen for zero monthly cost and global edge deployment.
17. **Deployment process was the biggest unresolved question** -- Despite extensive analysis, how JSX artifacts become live pages was never fully documented. This is a critical gap for any factory system.

### 6.6 What Was Still Unresolved

- How JSX artifacts get deployed to become live pages
- Where artifacts are hosted and the URL structure
- The UI dashboard design specifics
- Whether the system scope is documentation-only, code-only, or both

---

## 7. KEY TAKEAWAYS FOR THE ADS AGENT FACTORY

### What Transfers Directly

1. **The 6-stage pipeline pattern** -- Strategist -> Architect -> Visual Director -> Networker -> Builder -> Auditor maps well to any content factory
2. **The 100-point scoring system** -- Weighted validation with a threshold gate is a proven pattern
3. **The 3-document workflow** -- Reference + Build Checklist + QA Checklist is a universal structure
4. **Data-backed rules** -- Every rule must cite its source and data; unverified rules get flagged
5. **The Verification Station UI** -- 3-panel workspace (Content + Validator + Fixer) is an effective review interface

### What Needs Adaptation

1. **NDS rules are steel-industry specific** -- H1 containing "UK", BS EN compliance, etc. need industry-generic equivalents
2. **The JSX artifact format** -- Other industries may need different output formats
3. **The pricing model** -- GBP 7.5K-35K is for a manual-heavy first implementation; automation should reduce costs
4. **Reddit strategy** -- 40% citation share may not hold across all industries
5. **The SE Ranking data** -- While the patterns are universal, the specific numbers may vary by niche

### The Core Factory Formula (Abstracted from NDS)

```
INPUT: Keyword/Topic + Industry Rules + Brand Guidelines
  |
  v
STAGE 1: Strategy (analyze angle, competition, search intent)
  |
  v
STAGE 2: Structure (design page architecture, heading hierarchy)
  |
  v
STAGE 3: Visual (plan images, generate prompts, create manifests)
  |
  v
STAGE 4: Linking (map internal links, verify URLs, ensure density)
  |
  v
STAGE 5: Build (generate content, apply rules, create artifact)
  |
  v
STAGE 6: Validate (100-point scoring, double-lock check, gate at 90+)
  |
  v
OUTPUT: Production-ready content artifact (JSX, HTML, Markdown, etc.)
```

---

## 8. FILE INDEX

| File                               | Location                | Contents                                                                                                |
| ---------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------- |
| CHAT-ANALYSIS.md                   | NDS-ANALYSIS-WORK/      | System architecture discovery, 6-stage pipeline, rules/validation                                       |
| CHAT-ANALYSIS-PLAN.md              | NDS-ANALYSIS-WORK/      | Analysis methodology template (8 extraction categories)                                                 |
| CHAT2-ANALYSIS-PLAN.md             | NDS-ANALYSIS-WORK/      | Second chat analysis plan (document evolution tracking)                                                 |
| CHAT2-COMPLETE-ANALYSIS.md         | NDS-ANALYSIS-WORK/      | Full research extraction, v3.0-v3.4 evolution, question headings debate                                 |
| CHAT3-COMPLETE-ANALYSIS.md         | NDS-ANALYSIS-WORK/      | Comprehensive duplicate/extension of Chat 2 analysis with additional context                            |
| README.md                          | NDS-ANALYSIS-WORK/      | Folder purpose and file index                                                                           |
| NDS_PROJECT_PLAN.md                | AI SEO & LANDING PAGES/ | Phase 1 task list: 26 on-site pages, 20-25 off-site articles, 10-14 AI assets, ~50 infrastructure tasks |
| NDS-INTEGRATED-PROPOSAL-SUMMARY.md | AI SEO & LANDING PAGES/ | Client-facing proposal: gap analysis, 42 action items, 9-month roadmap, 3-tier pricing                  |
| CONTENT_FACTORY_ARCHITECTURE.md    | AI SEO & LANDING PAGES/ | Factory system design: Task Doer concept, Verification Station, Rule Engine                             |

---

**End of Research Compilation**
