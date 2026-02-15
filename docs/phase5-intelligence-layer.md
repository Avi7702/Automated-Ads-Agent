# Phase 5: Intelligence Layer Enhancement

## Overview

Phase 5 adds intelligence features that make the system learn and improve over time. Three deliverables were implemented:

1. **Brand DNA Engine** - Persistent brand understanding that enriches every generation
2. **Performance Feedback Schema** - Database schema for tracking generation performance on social media
3. **Multi-Platform Content Adaptation** - Platform-aware prompt assembly with per-platform image guidelines

## Build Status

**Vite Build:** PASSED (no errors)

---

## 5.1: Brand DNA Engine

### Database Schema

**Table:** `brand_dna` (in `shared/schema.ts`)

| Column          | Type      | Description                                        |
| --------------- | --------- | -------------------------------------------------- |
| id              | serial    | Primary key                                        |
| userId          | text      | Foreign key to users (unique per user)             |
| visualSignature | jsonb     | Dominant colors, composition, typography, lighting |
| toneAnalysis    | jsonb     | Formality, humor, technical depth, emotions        |
| audienceProfile | jsonb     | Engagement patterns, preferences                   |
| competitorDiff  | jsonb     | How brand differs from learned patterns            |
| contentRules    | jsonb     | Auto-learned do's and don'ts                       |
| version         | integer   | Version counter (auto-increments on upsert)        |
| analyzedAt      | timestamp | When analysis was last run                         |
| createdAt       | timestamp | Row creation time                                  |

### Storage Methods

Added to `IStorage` interface and `DbStorage` class:

- `getBrandDNA(userId: string): Promise<BrandDNA | null>`
- `upsertBrandDNA(userId: string, data: Partial<InsertBrandDNA>): Promise<BrandDNA>`

Repository: `server/repositories/intelligenceRepository.ts` (extended)

### Service

**File:** `server/services/brandDNAService.ts`

Two exported functions:

1. **`analyzeBrandDNA(userId, storage)`** - Full analysis pipeline:
   - Fetches brand profile, recent successful generations, brand images
   - Calls Gemini Flash (`gemini-3-flash`) for pattern analysis
   - Falls back to basic extraction if AI fails
   - Upserts results to `brand_dna` table
   - Returns the `BrandDNA` record

2. **`getBrandDNAContext(userId, storage)`** - Prompt injection:
   - Returns a formatted text block for prompt injection
   - Includes visual signature, tone guidance, and content rules
   - Returns empty string if no Brand DNA exists
   - Used by pipeline Stage 3 (Brand Context)

### Pipeline Integration

**File:** `server/services/generation/generationPipelineService.ts`

- Stage 3 (`stageBrandContext`) now also calls `getBrandDNAContext()`
- Brand DNA context is stored in `ctx.brandDNA` on the `GenerationContext`
- Fault-tolerant: if Brand DNA fetch fails, pipeline continues normally

**File:** `server/types/generationPipeline.ts`

- Added `BrandDNAContext` interface
- Added `brandDNA?: BrandDNAContext` to `GenerationContext`

**File:** `server/services/generation/promptBuilder.ts`

- Added `appendBrandDNAContext()` function
- Appends Brand DNA insights after brand context in prompt assembly

---

## 5.2: Performance Feedback Schema

### Database Schema

**Table:** `generation_performance` (in `shared/schema.ts`)

| Column         | Type        | Description                                 |
| -------------- | ----------- | ------------------------------------------- |
| id             | serial      | Primary key                                 |
| generationId   | varchar     | Foreign key to generations (cascade delete) |
| platform       | varchar(50) | Social platform (linkedin, instagram, etc.) |
| impressions    | integer     | Number of impressions (default 0)           |
| engagementRate | real        | Engagement rate percentage (default 0)      |
| clicks         | integer     | Number of clicks (default 0)                |
| conversions    | integer     | Number of conversions (default 0)           |
| fetchedAt      | timestamp   | When the data was fetched                   |

### Storage Methods

- `getGenerationPerformance(generationId: string): Promise<GenerationPerformance[]>`
- `saveGenerationPerformance(data: InsertGenerationPerformance): Promise<GenerationPerformance>`

### Webhook Endpoint

**Route:** `POST /api/webhooks/performance`

- Validates webhook signature via `validateN8nWebhook` middleware
- Validates request body via `performanceWebhookSchema` (Zod)
- Verifies the generation exists before saving
- Returns the saved performance record ID

**Validation Schema** (in `server/validation/schemas.ts`):

```typescript
performanceWebhookSchema = z.object({
  generationId: z.string().min(1),
  platform: z.enum(['linkedin', 'instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'pinterest']),
  impressions: z.number().int().min(0).optional().default(0),
  engagementRate: z.number().min(0).max(100).optional().default(0),
  clicks: z.number().int().min(0).optional().default(0),
  conversions: z.number().int().min(0).optional().default(0),
});
```

---

## 5.3: Multi-Platform Content Adaptation

### Platform Guidelines

**File:** `server/services/generation/promptBuilder.ts`

New exported function `getPlatformGuidelines(platform)` returns platform-specific image guidelines:

| Platform  | Guidelines                                                                           |
| --------- | ------------------------------------------------------------------------------------ |
| Instagram | Square (1:1) or vertical (4:5), vibrant colors, lifestyle-focused, clean composition |
| LinkedIn  | Horizontal (1.91:1), professional tone, data-driven visuals, minimal text overlay    |
| TikTok    | Vertical (9:16), bold text, high contrast, dynamic composition                       |
| Facebook  | Flexible (1.91:1 for ads), engaging, storytelling-focused                            |
| Twitter/X | Horizontal (16:9), clean composition, minimal text                                   |

### Pipeline Integration

- Added `platform?: string` field to `GenerationInput` in `server/types/generationPipeline.ts`
- `appendPlatformGuidelines()` in promptBuilder checks `input.platform` or `recipe.platform`
- Platform guidelines are appended to the final prompt when a platform is specified

---

## Files Created

| File                                 | Lines     | Description                               |
| ------------------------------------ | --------- | ----------------------------------------- |
| `server/services/brandDNAService.ts` | ~250      | Brand DNA analysis and context generation |
| `docs/phase5-intelligence-layer.md`  | this file | Implementation summary                    |

## Files Modified

| File                                                      | Changes                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `shared/schema.ts`                                        | Added `brandDNA` and `generationPerformance` tables + insert schemas + types          |
| `server/types/generationPipeline.ts`                      | Added `BrandDNAContext` interface, `brandDNA` to context, `platform` to input         |
| `server/repositories/intelligenceRepository.ts`           | Added Brand DNA and Generation Performance CRUD operations                            |
| `server/storage.ts`                                       | Added `intelligenceRepo` import, 4 new interface methods, 4 DbStorage implementations |
| `server/services/generation/generationPipelineService.ts` | Imported Brand DNA service, enriched Stage 3 with Brand DNA context                   |
| `server/services/generation/promptBuilder.ts`             | Added `appendBrandDNAContext`, `getPlatformGuidelines`, `appendPlatformGuidelines`    |
| `server/validation/schemas.ts`                            | Added `performanceWebhookSchema`                                                      |
| `server/routes.ts`                                        | Added `performanceWebhookSchema` import, `POST /api/webhooks/performance` endpoint    |

## Next Steps

1. Run `npm run db:push` to create the new database tables
2. Optionally trigger Brand DNA analysis via a new API endpoint or background job
3. Connect n8n workflows to POST performance data to `/api/webhooks/performance`
4. Consider adding a Brand DNA UI panel in Settings
