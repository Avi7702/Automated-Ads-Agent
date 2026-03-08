# Smart Ingest Pipeline — Design Document

## The Problem

The current system requires **6 manual steps** to get a product ad-ready: upload image, add metadata, trigger vision analysis, trigger enrichment, review draft, verify. These steps are spread across 4 different services and 3 different UI screens. The result is that most products sit at "pending" enrichment status and never become ad-ready.

## The New Approach: "Drop It In, Get Ads Out"

One unified pipeline. Three input methods. Zero manual enrichment steps.

The user provides the **minimum viable input**, and the system automatically fills in everything else using AI. The user only intervenes to **approve** the final result — not to orchestrate the process.

## Input Methods

| Method         | User Provides                       | System Does                                                                   |
| -------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| **URL Drop**   | A product page URL                  | Scrapes page, extracts image + all data, creates complete product             |
| **Image Drop** | A product photo (+ optional name)   | Vision AI identifies product, web search fills data, creates complete product |
| **Bulk CSV**   | A CSV/spreadsheet with product rows | Parses rows, fetches images from URLs, enriches each product in parallel      |

## Pipeline Architecture

```
INPUT (any method)
    │
    ▼
┌─────────────────────┐
│  1. NORMALIZE        │  Convert any input into a standard ProductSeed
│     (< 1 second)     │  { name?, imageUrl?, pageUrl?, rawData? }
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  2. EXTRACT          │  Pull structured data from available sources
│     (2-5 seconds)    │  - If URL: scrape page with Gemini grounding
│                      │  - If image: vision analysis with Gemini
│                      │  - If CSV row: parse columns directly
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  3. ENRICH           │  Fill gaps using AI
│     (3-8 seconds)    │  - Generate missing description, features, benefits
│                      │  - Infer category, tags, specifications
│                      │  - Single LLM call with structured output
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  4. VALIDATE         │  Quality gate
│     (< 1 second)     │  - Check all required fields present
│                      │  - Confidence score (0-100)
│                      │  - Flag low-confidence fields for review
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  5. STORE            │  Write to database
│     (< 1 second)     │  - Upload image to Cloudinary (if needed)
│                      │  - Insert/update product record
│                      │  - Set enrichmentStatus based on confidence
└─────────┬───────────┘
          │
          ▼
    AD-READY PRODUCT
```

## Key Design Decisions

### 1. Single LLM Call for Enrichment

Instead of the current approach (separate calls for vision, then search, then features, then benefits, then tags), we make **one structured call** to Gemini that returns everything at once. This is faster, cheaper, and more coherent.

The prompt includes all available context (image analysis, scraped page content, existing data) and asks for a complete product profile in one shot.

### 2. Confidence-Based Auto-Approval

Products with confidence >= 80 are automatically marked as "complete" (ad-ready). Products with confidence 50-79 are marked as "draft" (needs review). Products below 50 are marked as "pending" (needs manual data). This eliminates the manual verify step for most products.

### 3. Streaming Progress

The pipeline emits progress events via Server-Sent Events (SSE) so the UI can show real-time status: "Scraping page...", "Analyzing image...", "Generating profile...", "Done!"

### 4. Idempotent by SKU/URL

If a product with the same SKU or source URL already exists, the pipeline updates it instead of creating a duplicate. This makes bulk re-imports safe.

## API Design

### POST /api/ingest/url

```json
{ "url": "https://www.nextdaysteel.co.uk/products/t12-rebar-6m" }
```

Returns: SSE stream of progress events, final event is the complete product.

### POST /api/ingest/image

```
multipart/form-data: image file + optional { name, category }
```

Returns: SSE stream of progress events, final event is the complete product.

### POST /api/ingest/bulk

```
multipart/form-data: CSV file
```

Returns: SSE stream of per-product progress events.

### GET /api/ingest/status/:jobId

```json
{ "jobId": "...", "status": "processing", "progress": 3, "total": 15, "products": [...] }
```

## CSV Format

```csv
name,image_url,page_url,category,sku,description
T12 Rebar 6m,https://cdn.example.com/t12.jpg,,rebar,NDS-T12-6M,
A393 Mesh Sheet,,https://www.nextdaysteel.co.uk/products/a393,,NDS-A393,
```

Any column can be empty — the pipeline fills gaps. Only `name` OR `page_url` is required (one or the other).

## File Structure

```
server/services/ingest/
  index.ts          — Main pipeline orchestrator
  normalize.ts      — Input normalization (URL/image/CSV → ProductSeed)
  extract.ts        — Data extraction (scraping, vision, CSV parsing)
  enrich.ts         — AI enrichment (single structured LLM call)
  validate.ts       — Quality validation and confidence scoring
  store.ts          — Database write + Cloudinary upload
  types.ts          — All type definitions
  csvParser.ts      — CSV parsing utilities

server/routes/ingest.router.ts  — API endpoints with SSE streaming

client/src/pages/Ingest.tsx     — Single-page ingest UI
client/src/components/ingest/
  UrlDropZone.tsx   — URL paste input
  ImageDropZone.tsx — Image drag-and-drop
  CsvUpload.tsx     — CSV file upload
  IngestProgress.tsx — Real-time progress display
  ProductPreview.tsx — Preview of ingested product before confirmation
```

## What We Reuse from Existing Code

| Existing Service               | What We Take                                            |
| ------------------------------ | ------------------------------------------------------- |
| `visionAnalysisService.ts`     | Vision analysis prompt structure and Gemini integration |
| `enrichmentServiceWithUrl.ts`  | URL content fetching approach                           |
| `enrichment/dataExtraction.ts` | Feature/benefit/tag extraction patterns                 |
| `ndsWebsiteScraper.ts`         | Cloudinary upload logic                                 |
| `productEnrichmentService.ts`  | Enrichment draft type structure                         |

## What We Replace

The new `server/services/ingest/` directory replaces the need to manually chain together `visionAnalysisService` → `productEnrichmentService` → `enrichmentServiceWithUrl` → `enrichment/pipeline.ts`. All four are unified into one pipeline.
