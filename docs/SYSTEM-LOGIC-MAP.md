# System Logic Map

> **Purpose**: Comprehensive guide explaining WHY each component exists, HOW they connect, and WHAT data they need.
> **Audience**: AI agents, developers, and anyone needing to understand the system architecture.

---

## Executive Summary

This system generates AI-powered advertisement images for NDS (Next Day Steel), a steel reinforcement supplier. The core philosophy is **context-maximization**: feed the LLM as much verified context as possible so it cannot hallucinate.

**Key Insight**: Every RAG service answers a DIFFERENT question about the product. Together, they build complete context for accurate ad generation.

---

## The Big Picture: Data Flow

```
USER SELECTS PRODUCT(S) + UPLOADS IMAGE(S)
                  ↓
    ┌─────────────────────────────────────────────────────────┐
    │              IdeaBankService (Orchestrator)              │
    │                                                          │
    │  1. visionAnalysisService → "What is in this image?"    │
    │  2. productKnowledgeService → "What do we know about it?"│
    │  3. installationScenarioRAG → "How is this installed?"   │
    │  4. relationshipDiscoveryRAG → "What products go with?"  │
    │  5. brandImageRecommendationRAG → "What brand assets?"   │
    │  6. templatePatternRAG → "What visual layout works?"     │
    │  7. fileSearchService (KB) → "What do docs say?"         │
    │  8. Brand Profile → "What's the brand voice/style?"      │
    │                                                          │
    │         ALL CONTEXT → LLM → SUGGESTION PROMPTS           │
    └─────────────────────────────────────────────────────────┘
                  ↓
    USER PICKS A SUGGESTION (prompt contains "digested" RAG context)
                  ↓
    ┌─────────────────────────────────────────────────────────┐
    │              /api/transform Endpoint                     │
    │                                                          │
    │  Gemini Image Generation API receives:                   │
    │  - User's selected product image(s)                      │
    │  - The suggestion prompt (with embedded RAG context)     │
    │                                                          │
    │  Gemini generates ad image based on complete context     │
    └─────────────────────────────────────────────────────────┘
                  ↓
    GENERATED AD IMAGE (context-aware, accurate, on-brand)
```

---

## Why Each Knowledge Base Exists

### 1. Products Database

| Attribute | Value |
|-----------|-------|
| **Question Answered** | "What is this product?" |
| **Data Stored** | Name, SKU, category, description, features, specifications, benefits, tags |
| **Impact on Output** | Ensures correct product name, accurate specs, appropriate benefits in generated ad |
| **Without This** | LLM would guess product names, make up features, use wrong terminology |

**Example Data**:
```json
{
  "name": "T10 Rebar Bar - 6m Length",
  "sku": "NDS-T10-6M",
  "category": "rebar",
  "description": "10mm diameter high-tensile steel reinforcement bar. CARES-certified to BS4449.",
  "features": { "diameter": "10mm", "length": "6m", "grade": "B500B" },
  "benefits": ["CARES certified", "Next-day delivery", "No minimum order"]
}
```

---

### 2. Installation Scenarios

| Attribute | Value |
|-----------|-------|
| **Question Answered** | "How is this product installed on site?" |
| **Data Stored** | Step-by-step installation guides, required accessories, room types |
| **Impact on Output** | Shows correct installation context - workers, site conditions, proper technique |
| **Without This** | LLM might show rebar being installed wrong, missing spacers, incorrect techniques |

**Example Data**:
```json
{
  "title": "Domestic Ground Floor Slab - A193 Mesh Installation",
  "installationSteps": [
    "Prepare sub-base with compacted hardcore",
    "Install DPM membrane with 150mm overlaps",
    "Position chair spacers at 500-600mm centers",
    "Lay A193 mesh sheets on spacers",
    "Ensure 200mm minimum overlap"
  ],
  "requiredAccessories": ["Chair spacers", "Mesh clips", "Edge protection"]
}
```

---

### 3. Product Relationships

| Attribute | Value |
|-----------|-------|
| **Question Answered** | "What products go together?" |
| **Data Stored** | pairs_with, requires, completes, upgrades relationships |
| **Impact on Output** | Shows correct accessories and related products in the scene |
| **Without This** | LLM might show rebar without spacers, mesh without tie wire |

**Example Data**:
```json
{
  "sourceProduct": "T10 Rebar",
  "targetProduct": "25mm Spacers",
  "relationshipType": "requires",
  "isRequired": true,
  "description": "Spacers essential for correct cover on T10 bars"
}
```

---

### 4. Brand Images

| Attribute | Value |
|-----------|-------|
| **Question Answered** | "What existing brand assets fit this context?" |
| **Data Stored** | Historical ads, product photos, installation shots, lifestyle images |
| **Impact on Output** | Can reference real NDS photography style, site conditions, worker imagery |
| **Without This** | Generated images would be generic, not matching brand's visual identity |

**Example Data**:
```json
{
  "name": "Foundation Reinforcement - Site Photo",
  "category": "installation",
  "description": "Real construction site showing foundation reinforcement. Workers in hi-vis.",
  "tags": ["foundation", "site", "workers", "rebar-cage"],
  "suggestedUse": ["installation", "social_media"]
}
```

---

### 5. Performing Ad Templates

| Attribute | Value |
|-----------|-------|
| **Question Answered** | "What visual layout pattern works for this type of ad?" |
| **Data Stored** | Layout structures, color palettes, typography patterns, content blocks |
| **Impact on Output** | Uses proven ad patterns - headline positions, CTA placement, visual hierarchy |
| **Without This** | AI would create random layouts, potentially ineffective compositions |

**Example Data**:
```json
{
  "name": "Next-Day Promise - Bold CTA",
  "category": "urgency",
  "layouts": [{ "platform": "instagram", "aspectRatio": "1:1", "gridStructure": "text-overlay" }],
  "colorPalette": { "primary": "#FF6B35", "background": "#1A1A1A", "text": "#FFFFFF" },
  "contentBlocks": {
    "headline": { "position": "center", "maxChars": 40, "placeholder": "ORDER BY 1PM" },
    "body": { "position": "center-below", "placeholder": "DELIVERED TOMORROW" }
  }
}
```

---

### 6. Brand Profile

| Attribute | Value |
|-----------|-------|
| **Question Answered** | "What's the brand voice and style?" |
| **Data Stored** | Brand name, values, target audience, voice guidelines, color preferences |
| **Impact on Output** | Consistent brand messaging, appropriate tone, correct terminology |
| **Without This** | AI would use generic corporate language, miss brand personality |

**Example Data**:
```json
{
  "brandName": "Next Day Steel",
  "brandValues": ["Speed & Reliability", "Problem-Solving Attitude", "Inclusivity"],
  "voice": {
    "summary": "Professional, helpful, and knowledgeable steel supplier voice",
    "wordsToUse": ["Next Day", "Guaranteed", "Reliable", "CARES-approved"],
    "wordsToAvoid": ["Maybe", "Try to", "Usually", "Hopefully"]
  }
}
```

---

### 7. KB File Search (Vector Store)

| Attribute | Value |
|-----------|-------|
| **Question Answered** | "What does our documentation say about this?" |
| **Data Stored** | Technical PDFs, spec sheets, BS standards, brand guides |
| **Impact on Output** | Accurate technical specifications, correct terminology, standard compliance |
| **Without This** | AI might use incorrect spec values, wrong BS numbers |

**Example Documents**:
- Product specification sheets
- BS4449/BS4483 standards summaries
- Installation best practices
- Brand style guide

---

## Service Architecture

### Classification Legend

| Symbol | Category | Description |
|--------|----------|-------------|
| `[UI]` | User-Facing | Direct browser interaction |
| `[TOOL]` | AI Agent Tool | Called by AI orchestrators internally |
| `[KB]` | Knowledge Asset | Reference data for AI retrieval |
| `[HYB]` | Hybrid | Both API endpoint AND internal AI caller |
| `[INFRA]` | Infrastructure | Core services (auth, storage, logging) |

### Service Map

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER BROWSER                             │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐   │
│  │ Studio  │ │Products │ │  Brand  │ │Templates│ │ Gallery │   │
│  │  [UI]   │ │  [UI]   │ │  [UI]   │ │  [UI]   │ │  [UI]   │   │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘   │
└───────┼──────────┼──────────┼──────────┼──────────┼────────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                                │
│  /api/transform  /api/products  /api/brand  /api/templates      │
└───────┬──────────────────────────────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATORS [HYB]                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐    │
│  │ IdeaBankService│  │CopywritingServ │  │ ProductEnrich  │    │
│  │   (main hub)   │  │                │  │    Service     │    │
│  └───────┬────────┘  └────────────────┘  └────────────────┘    │
└──────────┼──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AI TOOLS [TOOL]                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │visionAnalysis│  │productKnowl. │  │ webSearch    │          │
│  │   Service    │  │   Service    │  │  Service     │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │installation  │  │relationship  │  │brandImage    │          │
│  │ ScenarioRAG  │  │ DiscoveryRAG │  │Recommend.RAG │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐                                               │
│  │templatePat-  │                                               │
│  │   ternRAG    │                                               │
│  └──────────────┘                                               │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   KNOWLEDGE LAYER [KB]                          │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              fileSearchService (Vector Store)           │    │
│  │         - Product docs, brand guides, templates         │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────┬──────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INFRASTRUCTURE [INFRA]                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │  storage │  │   auth   │  │ telemetry│  │  gemini  │       │
│  │ (Drizzle)│  │ Service  │  │ Service  │  │ Service  │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Endpoints by Purpose

### User-Initiated (Need UI)

| Endpoint | Purpose | UI Component |
|----------|---------|--------------|
| `POST /api/transform` | Generate ad image | Studio - Generate button |
| `GET /api/products` | List products | ProductLibrary |
| `POST /api/products` | Add product | ProductLibrary |
| `GET /api/brand-profile` | Get brand settings | BrandProfile page |
| `POST /api/copywriting/generate` | Generate ad copy | CopywritingPanel |
| `GET /api/generations` | View history | Gallery page |
| `POST /api/idea-bank/suggest` | Get suggestions | IdeaBankPanel |

### AI-Internal (No UI Needed)

| Endpoint | Purpose | Internal Caller |
|----------|---------|-----------------|
| `POST /api/installation/suggest-steps` | Get installation steps | IdeaBankService |
| `POST /api/products/find-similar` | Find similar products | IdeaBankService |
| `POST /api/relationships/analyze` | Analyze product relationships | IdeaBankService |
| `POST /api/brand-images/recommend` | Recommend brand images | IdeaBankService |
| `POST /api/templates/match-context` | Match template patterns | IdeaBankService |

### Admin Seeding

| Endpoint | Purpose |
|----------|---------|
| `POST /api/admin/seed-all` | Run all seeds |
| `POST /api/admin/seed-products` | Seed products |
| `POST /api/admin/seed-installation-scenarios` | Seed scenarios |
| `POST /api/admin/seed-relationships` | Seed relationships |
| `POST /api/admin/seed-brand-images` | Seed brand images |
| `POST /api/admin/seed-templates` | Seed templates |

---

## Database Tables

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | email, password, brandVoice |
| `generations` | Generated ad images | prompt, generatedImagePath, originalImagePaths |
| `products` | Product catalog | name, category, features, specifications |
| `brandProfiles` | Extended brand settings | brandName, voice, colorPreferences |

### Knowledge Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `installationScenarios` | Installation guides | title, installationSteps, requiredAccessories |
| `productRelationships` | Product connections | sourceProductId, targetProductId, relationshipType |
| `brandImages` | Brand image library | cloudinaryUrl, category, suggestedUse |
| `performingAdTemplates` | Ad templates | layouts, colorPalette, contentBlocks |
| `productAnalyses` | Vision analysis cache | category, materials, colors, style |

---

## Data Population

### Seed Files

| File | Populates | Record Count |
|------|-----------|--------------|
| `seedBrandProfile.ts` | Brand Profile | 1 (NDS) |
| `seedProducts.ts` | Products | ~22 products |
| `seedInstallationScenarios.ts` | Installation Scenarios | ~10 scenarios |
| `seedRelationships.ts` | Product Relationships | ~40 relationships |
| `seedBrandImages.ts` | Brand Images | ~20 images |
| `seedTemplates.ts` | Performing Templates | ~12 templates |

### Running Seeds

```bash
# Run all seeds
npx tsx server/seeds/runAllSeeds.ts

# Or via API
curl -X POST http://localhost:3000/api/admin/seed-all

# With options
curl -X POST http://localhost:3000/api/admin/seed-all \
  -H "Content-Type: application/json" \
  -d '{"sampleOnly": true}'
```

---

## Key Principles

### 1. Context-Maximization
- Feed LLM verified context so it cannot hallucinate
- Every RAG service adds different context dimensions
- Complete context = accurate, on-brand output

### 2. RAG Data is "Digested"
- RAG results influence suggestion generation
- Context is embedded INTO the suggestion prompt
- Final image generation receives pre-processed context
- No need to pass RAG data twice

### 3. Single Source of Truth
- Products database is the foundation
- Other tables reference products by ID
- Brand Profile sets global voice/style
- Templates provide proven visual patterns

### 4. Separation of Concerns
- `[UI]` components: User interaction only
- `[TOOL]` services: AI orchestrator tools only
- `[HYB]` services: Both API and internal use
- `[KB]` services: Document retrieval only
- `[INFRA]` services: Core utilities

---

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-01-01 | Initial system logic map created | Claude |
| 2025-01-01 | Added data population plan and seed files | Claude |

---

## References

- [CLAUDE.md](../CLAUDE.md) - Project rules and task status
- [COMPONENT-CLASSIFICATION-SCHEMA.md](./COMPONENT-CLASSIFICATION-SCHEMA.md) - Component categorization
- [NDS-BRAND-PROFILE-COMPLETE.md](./NDS-BRAND-PROFILE-COMPLETE.md) - NDS brand research
