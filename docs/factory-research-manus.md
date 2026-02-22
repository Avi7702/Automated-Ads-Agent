# Reference Image App (external-reference) -- Factory Research Report

**Date:** 2026-02-13
**Source:** `c:/Users/avibm/external-reference/`
**Project Name:** `reference-image-app` (v3.0.0)
**Note:** This document was sanitized to keep external-project identifiers out of this repository.

---

## 1. What This Project Does

**Reference Image App** is an AI-powered localized text image generation platform. Users type localized words/phrases (with optional Nikud/vowel marks), select a visual style, and the app generates a beautiful image with that localized text rendered as the focal element.

**Core Value Proposition:** AI models historically fail at rendering localized text correctly. This app solves it by using **Gemini 3 Pro Image** (`gemini-3-pro-image-preview`), which can natively render localized text correctly in generated images.

**Tagline (localized):** "Create images with perfect localized" (in localized: "yitzira temunot im ivrit mushlemet")

### Key Features

1. **localized text image generation** -- Type localized text, pick a style, generate an image with that text
2. **Prompt Engine** -- Auto-detects intent from user input (occasion, emotion, style), maps to optimized prompts
3. **22+ localized word library** with nikud, transliteration, categories (greeting/blessing/emotion/spiritual/celebration/family/nature)
4. **10 visual style templates** -- calligraphy, neon, gold luxury, watercolor, minimalist, vintage, nature, festive, spiritual, ocean
5. **Advanced editing** -- Outpainting, background removal, background replacement (via Gemini API)
6. **Image editor with SAM2** -- Click-to-select objects using SAM2 AI segmentation (currently brush fallback)
7. **PixiJS canvas** -- WebGPU-first canvas with RTL origin support
8. **Voice input** -- Record localized speech, transcribe via OpenAI gpt-4o-mini-transcribe, generate image from voice command
9. **Video generation** -- Text-to-video and image-to-video via Google Veo 3.1 API
10. **3D text generation** -- Generate 3D localized text models via Meshy API (GLB/USDZ/FBX/OBJ export)
11. **Real-time collaboration** -- Multi-user editing via Liveblocks (BYOK pattern)
12. **Project management** -- Users have projects, images are stored per project, credit-based billing

---

## 2. Architecture on Cloudflare

### Deployment Target: Cloudflare Pages (Workers-backed)

The `wrangler.toml` defines the project as a Cloudflare Pages project:

```toml
name = "reference-image-app"
compatibility_date = "2026-02-03"
compatibility_flags = ["nodejs_compat"]
pages_build_output_dir = ".vercel/output/static"
```

**Key:** The output dir is `.vercel/output/static`, which means the project builds via **Next.js** (v16.1.0) and uses its static export, then deploys to Cloudflare Pages.

### Cloudflare Bindings (from `wrangler.toml`)

| Binding  | Type         | Name/ID                       | Purpose                                                      |
| -------- | ------------ | ----------------------------- | ------------------------------------------------------------ |
| `DB`     | D1 Database  | `reference-image-app-db`      | Users, projects, images, credit transactions                 |
| `IMAGES` | R2 Bucket    | `reference-image-app-storage` | Store generated images                                       |
| `CACHE`  | KV Namespace | (placeholder)                 | Caching and rate limiting                                    |
| `AI`     | Workers AI   | (built-in)                    | Image generation (though currently uses Gemini API directly) |

### Environment Type (from `cloudflare.d.ts`)

```typescript
interface CloudflareEnv {
  AI: Ai; // Workers AI
  DB: D1Database; // D1 SQLite
  IMAGES: R2Bucket; // R2 Object Storage
  CACHE: KVNamespace; // KV Caching
  ENVIRONMENT: string;
}
```

---

## 3. How It Uses D1/R2/KV/AI

### D1 Database (`DB` binding)

**Schema** (`schema.sql`):

- `users` -- id, email, name, avatar_url, credits (integer, default 10), plan (free/basic/pro/business)
- `projects` -- id, user_id, name, description, thumbnail_url
- `images` -- id, project_id, user_id, prompt, user_input, style, localized_text, image_url, r2_key, model (default 'lucid-origin'), width, height
- `credit_transactions` -- id, user_id, amount, type (purchase/usage/bonus/refund), description, image_id

**D1 Client** (`lib/infra/d1-client.ts`):

- Full `D1Service` class with CRUD operations for users, projects, images, credits
- Batch operations for atomic credit updates (deduct credits + record transaction)
- Type-safe interfaces for all entities

**Drizzle ORM Schema** (`lib/db/schema.ts`):

- Separate Drizzle schema with `users`, `projects`, `assets` tables
- Uses `better-sqlite3` locally for development (`lib/db/client.ts`)
- WAL mode enabled for performance
- Auto-creates demo user on initialization

### R2 Bucket (`IMAGES` binding)

**R2 Client** (`lib/infra/r2-client.ts`):

- `R2Service` class with full image lifecycle management
- **Key structure:** `users/{userId}/images/{imageId}.{extension}`
- Upload raw bytes or base64 data URLs
- 1-year cache headers (`public, max-age=31536000`)
- Custom metadata: userId, imageId, uploadedAt
- List user images, calculate storage usage
- Public URL resolution (custom domain or `/api/images/` fallback)

### KV Namespace (`CACHE` binding)

- Declared in `wrangler.toml` for caching and rate limiting
- Full type definitions in `cloudflare.d.ts` (get/put/delete/list operations)
- TTL-based expiration support for cache entries
- Not heavily used in the current codebase -- placeholder for rate limiting

### Workers AI (`AI` binding)

- Declared in `wrangler.toml` with `[ai]` binding
- Type definition: `Ai.run(model: string, inputs: Record<string, unknown>)`
- **Currently NOT the primary generation engine** -- the app primarily uses:
  - **Gemini 3 Pro Image API** (`gemini-3-pro-image-preview`) for localized text image generation
  - **Gemini 2.0 Flash** for editing operations (outpaint, background removal, replacement)
  - **OpenAI gpt-image-1** as fallback image generation
  - **OpenAI gpt-4o-mini-transcribe** for voice-to-text
  - **Google Veo 3.1** for video generation
  - **Meshy API** for 3D model generation

---

## 4. Tech Stack

| Layer               | Technology          | Version              |
| ------------------- | ------------------- | -------------------- |
| **Framework**       | Next.js             | 16.1.0               |
| **React**           | React               | 19.1.0               |
| **Build**           | Turbopack           | (built into Next 16) |
| **Styling**         | Tailwind CSS        | 4.1.18               |
| **ORM**             | Drizzle ORM         | 0.38.0               |
| **Local DB**        | better-sqlite3      | 11.8.0               |
| **Canvas**          | PixiJS              | 8.6.0                |
| **Collaboration**   | Liveblocks          | 2.15.0               |
| **AI/ML (browser)** | ONNX Runtime Web    | 1.21.0               |
| **AI (server)**     | OpenAI SDK          | 4.80.0               |
| **Validation**      | Zod                 | 3.24.0               |
| **Testing**         | Vitest + Playwright | 3.0.0 / 1.50.0       |
| **Deploy**          | Cloudflare Pages    | (wrangler.toml)      |
| **Language**        | TypeScript          | 5.7.0+ (strict mode) |

---

## 5. Patterns and Conventions

### 5.1 Prompt Engine Architecture

The prompt engine is a standalone library (`lib/prompt-engine/`) with:

1. **localized Library** (`localized-library.ts`) -- 22+ localized words with full metadata (nikud, transliteration, English, category, occasions, emotions)
2. **Style Library** (`style-library.ts`) -- 10 style templates each with: AI background prompt, text style config (font, color, effects), tags, occasions, emotions
3. **Scenes & Colors Library** (`scenes-colors-library.ts`) -- Additional scene/color suggestions
4. **Prompt Builder** (`prompt-builder.ts`) -- Intent detection pipeline:
   - Extract localized text from mixed input (regex: `[\u0590-\u05FF\uFB1D-\uFB4F]+`)
   - Detect occasion (wedding, birthday, bar mitzvah, shabbat, etc.)
   - Detect emotion (joyful, romantic, peaceful, hopeful, elegant)
   - Detect/suggest style based on context
   - Compose Gemini-optimized prompt

### 5.2 RTL-First Design

- `<html lang="he" dir="rtl">` globally
- PixiCanvas has `rtlOrigin` prop that flips the canvas origin to the right edge
- CSS `direction: rtl` on body
- All UI text in localized with localized-first layout

### 5.3 BYOK (Bring Your Own Key) Pattern

Used for Liveblocks collaboration:

- Check `isCollaborationConfigured()` before enabling features
- Show friendly "not configured" UI if API key missing
- Never crash or error -- gracefully degrade

### 5.4 API Architecture

- **Next.js API Routes** (`app/api/`) for server-side operations
- Image generation route: `POST /api/generate-image` -- takes prompt, calls Gemini 3 Pro, returns base64 data URL
- Projects route: `GET/POST /api/projects` -- CRUD with `x-user-id` header for auth
- All API calls use Zod validation schemas

### 5.5 Resilience Utilities

- **`fetchWithRetry`** -- Exponential backoff with jitter, rate limit detection (429), configurable retries, timeout handling
- **`RequestQueue`** -- Priority queue with RPM limiting, automatic throttling, singleton per API name
- Used by video generation polling and 3D model generation polling

### 5.6 Dual Database Strategy

- **Production:** Cloudflare D1 (SQLite on the edge) via raw SQL in `D1Service` class
- **Development:** local `better-sqlite3` via Drizzle ORM
- Both share similar schemas but use different access patterns (raw SQL vs Drizzle)

### 5.7 Component Organization

```
components/
  3d/           -- Text3DGeneratorPanel, Model3DViewer, Text3DForm
  canvas/       -- PixiCanvas (WebGPU-first), SelectionBox
  collaboration/ -- CollaborationPanel, CollaboratorCursors, PresenceIndicator, ShareDialog
  common/       -- ErrorBoundary, ProgressLoader, RateLimitWarning
  editor/       -- ImageEditor (SAM2), AdvancedEditingPanel, OutpaintControls, ReplaceBgDialog
  generation/   -- ImageGenerator
  localized/       -- localizedTextInput (with Nikud insertion), localizedCanvasText, NikudKeyboard
  video/        -- VideoGeneratorPanel, VideoGenerationForm, VideoPreviewPlayer
  voice/        -- VoiceInputButton, RecordingIndicator
```

### 5.8 Testing Strategy

- **Unit tests:** Vitest with JSDOM (`vitest.config.ts`)
- **E2E tests:** Playwright (`playwright.config.ts`)
- **Test files:** Co-located with source files (`.test.tsx` / `.test.ts`)
- E2E specs: dashboard, error-handling, localized-text, image-generation, studio

### 5.9 Workspace Structure

```
external-reference/
  pnpm-workspace.yaml    -- pnpm workspaces
  package.json           -- root (v3.0.0), delegates to apps/web
  wrangler.toml          -- Cloudflare deployment config
  schema.sql             -- D1 database schema
  apps/
    web/                 -- Next.js 16 application
      src/
        app/             -- Next.js App Router pages
        components/      -- React components (by domain)
        contexts/        -- React contexts (auth)
        hooks/           -- Custom hooks (useProjects, useSAM2, useVoiceInput)
        lib/             -- Business logic libraries
        types/           -- TypeScript type definitions
        workers/         -- Web Workers (SAM2 ONNX inference)
```

---

## 6. External API Dependencies

| Service           | API/Model                                    | Purpose                                             |
| ----------------- | -------------------------------------------- | --------------------------------------------------- |
| **Google Gemini** | `gemini-3-pro-image-preview`                 | Primary image generation (localized text rendering) |
| **Google Gemini** | `gemini-2.0-flash-exp`                       | Image editing (outpaint, background ops)            |
| **Google Veo**    | `veo-3.1-generate-preview`                   | Video generation (text-to-video, image-to-video)    |
| **OpenAI**        | `gpt-image-1` / `gpt-image-1.5` / `dall-e-3` | Alternative image generation                        |
| **OpenAI**        | `gpt-4o-mini-transcribe`                     | Voice-to-text (localized speech recognition)        |
| **Meshy**         | Text-to-3D / Image-to-3D                     | 3D model generation                                 |
| **Liveblocks**    | Real-time SDK                                | Multi-user collaboration (BYOK)                     |

---

## 7. Credit/Billing System

- Users start with **10 free credits**
- Plans: `free`, `basic`, `pro`, `business`
- Each image generation costs 1 credit (deducted atomically via D1 batch)
- Credit transaction types: `purchase`, `usage`, `bonus`, `refund`
- Full transaction history per user

---

## 8. Key Takeaways for Automated Ads Agent

### Patterns Worth Adopting

1. **D1 raw SQL `D1Service` class** -- Clean pattern for type-safe D1 operations without heavy ORM overhead
2. **R2 organized key structure** (`users/{id}/images/{id}.ext`) -- Good for multi-tenant image storage
3. **Prompt Engine as standalone library** -- Separates AI prompt logic from UI, reusable across features
4. **fetchWithRetry + RequestQueue** -- Production-grade resilience for external API calls
5. **BYOK pattern** -- Graceful degradation for optional features requiring API keys
6. **Cloudflare bindings typed in `cloudflare.d.ts`** -- Clean way to extend environment types

### Architecture Differences from Automated Ads Agent

- Reference Image App: Next.js 16 on Cloudflare Pages (edge-rendered)
- Automated Ads Agent: Express/Vite on Railway (Node.js server)
- Reference Image App: D1 (SQLite edge) + R2 + KV
- Automated Ads Agent: PostgreSQL (Drizzle ORM) on Railway

### Potential Reuse

- The R2 image storage pattern could be used if migrating image hosting to Cloudflare
- The fetchWithRetry utility is framework-agnostic and could be used in any project
- The prompt engine architecture (library + builder + intent detection) is a good model for any AI prompt system
