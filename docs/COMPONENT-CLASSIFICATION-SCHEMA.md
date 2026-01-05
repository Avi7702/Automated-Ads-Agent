# Component Classification Schema

> **Purpose**: Define how each component should be treated - as UI, AI tool, knowledge asset, or internal service.
> **When to update**: Every new feature must be classified here before implementation.

---

## Classification Categories

| Category | Symbol | Description | Has UI Route? | Called By |
|----------|--------|-------------|---------------|-----------|
| **USER-FACING** | `[UI]` | Direct user interaction via browser | Yes | User clicks/navigation |
| **AI-AGENT-TOOL** | `[TOOL]` | Called by AI orchestrators internally | No | IdeaBankService, RAG pipelines |
| **KNOWLEDGE-ASSET** | `[KB]` | Reference data/documents for AI retrieval | No | fileSearchService queries |
| **HYBRID** | `[HYB]` | Exposed via API AND used internally by AI | Sometimes | Both users and AI agents |
| **INFRASTRUCTURE** | `[INFRA]` | Core services (auth, storage, logging) | No | Everything |

---

## Frontend Components

### Pages (USER-FACING)

| Component | Classification | Route | Purpose |
|-----------|----------------|-------|---------|
| `Studio.tsx` | `[UI]` | `/` | Main content generation workspace |
| `ProductLibrary.tsx` | `[UI]` | `/products` | Product catalog management |
| `BrandProfile.tsx` | `[UI]` | `/brand` | Brand settings and voice config |
| `BrandImageLibrary.tsx` | `[UI]` | `/brand-images` | Brand asset management |
| `TemplateLibrary.tsx` | `[UI]` | `/templates` | Template browsing and selection |
| `Settings.tsx` | `[UI]` | `/settings` | User preferences |
| `Gallery.tsx` | `[UI]` | `/gallery` | Generation history viewing |
| `Login.tsx` | `[UI]` | `/login` | Authentication |

### UI Components (USER-FACING)

| Component | Classification | Used In | Purpose |
|-----------|----------------|---------|---------|
| `IdeaBankPanel.tsx` | `[UI]` | Studio | Displays AI suggestions to user |
| `CopywritingPanel.tsx` | `[UI]` | Studio | Ad copy generation interface |
| `ProductRelationships.tsx` | `[UI]` | ProductLibrary | Relationship visualization |
| `BrandProfileForm.tsx` | `[UI]` | BrandProfile | Brand data input |
| `ProductEnrichmentForm.tsx` | `[UI]` | ProductLibrary | Product data enrichment |
| `TemplateCard.tsx` | `[UI]` | TemplateLibrary | Template display card |
| `UploadZone.tsx` | `[UI]` | Studio | File upload interface |
| `SaveToCatalogDialog.tsx` | `[UI]` | Studio | Save generation modal |

---

## Backend Services

### AI Agent Tools (Internal)

These services are called by AI orchestrators (IdeaBankService) and should NOT have direct UI.

| Service | Classification | Called By | Purpose |
|---------|----------------|-----------|---------|
| `visionAnalysisService.ts` | `[TOOL]` | IdeaBankService | Analyzes uploaded images for content |
| `productKnowledgeService.ts` | `[TOOL]` | IdeaBankService | Builds product context for AI |
| `geminiService.ts` | `[TOOL]` | Multiple services | LLM API wrapper |
| `webSearchService.ts` | `[TOOL]` | IdeaBankService | External information retrieval |

### RAG Services (Hybrid)

These have API endpoints for potential UI AND are called internally by AI pipelines.

| Service | Classification | API Endpoints | Internal Callers |
|---------|----------------|---------------|------------------|
| `installationScenarioRAG.ts` | `[HYB]` | `/api/installation/*` | IdeaBankService |
| `relationshipDiscoveryRAG.ts` | `[HYB]` | `/api/relationships/*` | IdeaBankService |
| `brandImageRecommendationRAG.ts` | `[HYB]` | `/api/brand-images/*` | IdeaBankService |
| `templatePatternRAG.ts` | `[HYB]` | `/api/templates/*` | IdeaBankService |

### Knowledge Services

| Service | Classification | Purpose |
|---------|----------------|---------|
| `fileSearchService.ts` | `[KB]` | Central RAG query hub - queries vector store |

### Orchestrators

| Service | Classification | Purpose |
|---------|----------------|---------|
| `ideaBankService.ts` | `[HYB]` | Main AI orchestrator - coordinates all TOOL services |
| `copywritingService.ts` | `[HYB]` | Ad copy generation with PTCF framework |
| `productEnrichmentService.ts` | `[HYB]` | Product data enrichment pipeline |

### Infrastructure Services

| Service | Classification | Purpose |
|---------|----------------|---------|
| `authService.ts` | `[INFRA]` | Authentication logic |
| `storage.ts` | `[INFRA]` | Database access layer |
| `telemetryService.ts` | `[INFRA]` | Usage tracking and analytics |

---

## Decision Tree: Where Does New Code Go?

```
Is this triggered by user action in the browser?
├── YES → Is it a full page?
│   ├── YES → [UI] Create in client/src/pages/
│   └── NO → [UI] Create in client/src/components/
│
└── NO → Is it called by IdeaBankService or other AI orchestrator?
    ├── YES → Does it also need an API endpoint for future UI?
    │   ├── YES → [HYB] Create service + API routes
    │   └── NO → [TOOL] Create in server/services/ (no routes)
    │
    └── NO → Is it reference data for AI retrieval?
        ├── YES → [KB] Add to fileSearchService or knowledge base
        └── NO → [INFRA] Core infrastructure service
```

---

## API Endpoint Classification

### User-Initiated Endpoints (Need UI)

| Endpoint | Classification | UI Component |
|----------|----------------|--------------|
| `POST /api/transform` | `[UI]` | Studio - Generate button |
| `GET /api/products` | `[UI]` | ProductLibrary |
| `POST /api/products` | `[UI]` | ProductLibrary - Add product |
| `GET /api/brand-profile` | `[UI]` | BrandProfile page |
| `POST /api/copywriting/generate` | `[UI]` | CopywritingPanel |
| `GET /api/generations` | `[UI]` | Gallery page |
| `POST /api/idea-bank/suggest` | `[UI]` | IdeaBankPanel |

### AI-Internal Endpoints (No UI Needed)

| Endpoint | Classification | Internal Caller |
|----------|----------------|-----------------|
| `POST /api/installation/suggest-steps` | `[TOOL]` | IdeaBankService |
| `POST /api/installation/suggest-accessories` | `[TOOL]` | IdeaBankService |
| `POST /api/products/find-similar` | `[TOOL]` | IdeaBankService |
| `POST /api/relationships/analyze` | `[TOOL]` | IdeaBankService |
| `POST /api/brand-images/recommend` | `[TOOL]` | IdeaBankService |
| `POST /api/templates/match-context` | `[TOOL]` | IdeaBankService |

---

## Validation Checklist for New Features

Before implementing any new feature, answer these questions:

### 1. Consumer Identification
- [ ] Who calls this? (User / AI Agent / Both)
- [ ] If AI Agent: Which orchestrator? (IdeaBankService / CopywritingService / etc.)

### 2. Classification Assignment
- [ ] Assigned classification: `[UI]` / `[TOOL]` / `[KB]` / `[HYB]` / `[INFRA]`
- [ ] Added to appropriate section in this document

### 3. Dependency Mapping
- [ ] Listed all services this depends on
- [ ] Listed all services that will depend on this

### 4. API Design (if applicable)
- [ ] If `[UI]`: Route connected to frontend component
- [ ] If `[TOOL]`: No public route OR route marked as internal
- [ ] If `[HYB]`: Both route AND internal caller documented

---

## Architecture Diagram

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

## Changelog

| Date | Change | Author |
|------|--------|--------|
| 2025-01-01 | Initial schema created after zombie cleanup | Claude |

---

## References

- CLAUDE.md - Project rules and task status
- docs/IMPLEMENTATION-TASKS.md - Feature specifications
- docs/PHASE-4-IMPLEMENTATION-SUMMARY.md - Copywriting implementation details
