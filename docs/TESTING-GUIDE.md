# Automated Ads Agent — Comprehensive Testing Guide

> Last updated: 2026-02-15
>
> Production URL: `https://automated-ads-agent-production.up.railway.app`
> Local dev URL: `http://localhost:5000`

---

## Table of Contents

- [A. Quick Health Checks](#a-quick-health-checks)
- [B. Authentication and Onboarding](#b-authentication-and-onboarding)
- [C. Studio (Main Creation Hub)](#c-studio-main-creation-hub)
- [D. Agent Chat](#d-agent-chat)
- [E. Gallery](#e-gallery)
- [F. Pipeline](#f-pipeline)
- [G. Library](#g-library)
- [H. Settings](#h-settings)
- [I. Generation Pipeline (Backend)](#i-generation-pipeline-backend)
- [J. API Endpoints Checklist](#j-api-endpoints-checklist)
- [K. Automated Tests](#k-automated-tests)
- [L. Production Deployment Verification](#l-production-deployment-verification)

---

## A. Quick Health Checks

### 1. Server Liveness

```bash
curl https://automated-ads-agent-production.up.railway.app/api/health/live
```

Expected: `{"status":"ok","timestamp":"..."}`

### 2. Server Readiness (includes DB and Redis)

```bash
curl https://automated-ads-agent-production.up.railway.app/api/health/ready
```

Expected: `{"status":"ready","checks":{"database":"ok","redis":{"connected":true,...}}}`

### 3. General Health (includes Gemini status)

```bash
curl https://automated-ads-agent-production.up.railway.app/api/health
```

Expected: JSON with `status`, `redis`, and `gemini` fields.

### 4. Build Verification

```bash
# Local
npm run build
# Verify no TS errors
npm run check
```

### 5. API Key Validation

```bash
curl -X GET https://automated-ads-agent-production.up.railway.app/api/settings/api-keys \
  -H "Cookie: <session-cookie>"
```

Expected: List of configured API keys with masked previews.

---

## B. Authentication and Onboarding

### 1. Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

Expected: `{"id":"<uuid>","email":"test@example.com"}`

**Validation checks:**

- Missing email/password returns 400
- Password < 8 chars returns 400
- Duplicate email returns 409

### 2. Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass123"}'
```

Expected: `{"id":"<uuid>","email":"test@example.com"}` with session cookie.

**Security checks:**

- Invalid credentials return 401
- Account lockout after too many failed attempts returns 429 with `retryAfter`

### 3. Session Check

```bash
curl http://localhost:5000/api/auth/me \
  -H "Cookie: <session-cookie>"
```

Expected: `{"authenticated":true,"id":"...","email":"..."}` when logged in, or `{"authenticated":false}` when not.

### 4. Demo Mode (dev only)

```bash
curl http://localhost:5000/api/auth/demo
```

Expected: Auto-creates/logs in as `demo@company.com`. Returns 404 in production unless `ENABLE_DEMO_MODE=true`.

### 5. Logout

```bash
curl -X POST http://localhost:5000/api/auth/logout \
  -H "Cookie: <session-cookie>"
```

Expected: `{"success":true}` and session destroyed.

### 6. Onboarding Gate

- After login, the `<OnboardingGate>` component in `App.tsx` wraps all routes
- If the user has not completed business onboarding, they should be redirected to the onboarding flow
- Test: Log in with a fresh account and verify the onboarding screen appears before accessing Studio

### 7. Data Export

```bash
curl http://localhost:5000/api/auth/export \
  -H "Cookie: <session-cookie>"
```

Expected: JSON with `exportedAt`, `user`, `generations`, `products`.

### 8. Account Deletion

```bash
curl -X DELETE http://localhost:5000/api/auth/account \
  -H "Cookie: <session-cookie>"
```

Expected: Account and associated data removed.

---

## C. Studio (Main Creation Hub)

The Studio is the main page at `/`. It uses the `useStudioOrchestrator` hook (~580 lines in `client/src/hooks/useStudioOrchestrator.ts`) for all state management.

### 1. Composer View

**Test steps:**

1. Navigate to `/`
2. Verify the 3-panel layout renders (left sidebar, center canvas, right inspector)
3. Enter a prompt in the composer text area
4. Upload product images (drag-and-drop or file picker, up to 6 files)
5. Select resolution: 1K, 2K, 4K
6. Select generation mode: Standard, Exact Insert, Inspiration
7. Verify mode-specific requirements:
   - `exact_insert` and `inspiration` require a template selection
   - `standard` works without a template

### 2. Product Selection

**Test steps:**

1. Open the product selector in the left panel
2. Verify products load from `/api/products`
3. Select 1-6 products (multi-select)
4. Verify selected products show in the composer area
5. Deselect products and verify UI updates

### 3. Image Generation

**Test steps:**

1. With products selected and a prompt written, click "Generate"
2. Verify POST to `/api/transform` with FormData (images, prompt, mode, resolution)
3. Verify the UI transitions to the "generating" state (spinner/animation)
4. On success: verify the result image displays in the center canvas
5. On failure: verify error message displays

**Pre-gen quality gate behavior:**

- Score < 40: Generation is BLOCKED, error returned with suggestions
- Score 40-60: Generation proceeds with WARNING suggestions
- Score > 60: Generation proceeds normally

### 4. Result View

**Test steps:**

1. After generation, verify the result image displays correctly
2. Test zoom (if available)
3. Test download functionality
4. Verify the generation is saved and appears in Gallery

### 5. InspectorPanel Tabs

The right panel has 4 tabs:

**Edit tab:**

- Enter an edit prompt (e.g., "make the background darker")
- Click Edit to submit POST `/api/generations/:id/edit`
- Returns a jobId; polls `/api/jobs/:jobId` for progress
- Verify SSE streaming at `/api/jobs/:jobId/stream`

**Copy tab:**

- After a generation, generate ad copy
- Test different platforms (Instagram, LinkedIn, Facebook, Twitter/X, TikTok)
- Test different tones and frameworks
- Verify copy variations display with quality scores

**Ask AI tab:**

- Submit a question about the generation via POST `/api/generations/:id/analyze`
- Verify AI response about the image transformation

**Details tab:**

- Verify generation metadata displays: prompt, mode, resolution, timestamps
- Verify edit history if the generation has been edited

### 6. Idea Bank Bar

**Test steps:**

1. Verify the horizontal chip bar at the bottom of the Studio loads suggestions
2. Click a suggestion chip to apply it to the composer
3. Verify suggestions come from POST `/api/idea-bank/suggest`

### 7. Style References

**Test steps:**

1. Upload a style reference image via the style reference section
2. Verify it appears in the style reference list
3. Select style references for generation
4. Verify they are included in the generation pipeline

### 8. Video Generation

```bash
curl -X POST http://localhost:5000/api/generations/video \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{
    "prompt": "Product showcase video with dynamic lighting",
    "duration": "8",
    "aspectRatio": "16:9",
    "videoResolution": "720p"
  }'
```

Expected: `{"success":true,"generationId":"...","jobId":"...","status":"pending","mediaType":"video"}`

---

## D. Agent Chat

The agent chat is a conversational AI assistant accessible via the `<GlobalChatButton>` floating button on every page. It uses Google ADK v0.3.0 with `gemini-3-pro-preview`.

### 1. How It Works

- User sends a message via POST `/api/agent/chat` with `{ message, sessionId }`
- Server streams SSE events back (`text/event-stream`)
- Each event is `data: {"type":"...","content":"..."}\n\n`
- The agent has 14 tools it can call to interact with the system

### 2. Testing the Chat

Open the floating chat button and try these prompts:

| Prompt                                     | Expected Tool Calls      | Expected Behavior                                       |
| ------------------------------------------ | ------------------------ | ------------------------------------------------------- |
| "Show me my products"                      | `list_products`          | Returns product list                                    |
| "Tell me about product X"                  | `get_product_details`    | Returns product details                                 |
| "Select product X for generation"          | `select_products`        | Updates Studio UI                                       |
| "Write a prompt for a modern kitchen ad"   | `set_prompt`             | Sets prompt in composer                                 |
| "Set platform to Instagram, square format" | `set_output_settings`    | Updates platform/aspect ratio                           |
| "Generate the image"                       | `generate_image`         | Triggers image generation (asks for confirmation first) |
| "Write ad copy for LinkedIn"               | `generate_ad_copy`       | Generates copy variations                               |
| "Give me creative ideas"                   | `get_idea_suggestions`   | Returns idea bank suggestions                           |
| "Search knowledge base for brand colors"   | `search_knowledge_base`  | Searches uploaded docs via RAG                          |
| "Show me available templates"              | `get_templates`          | Lists ad scene templates                                |
| "What are the related products for X?"     | `get_product_knowledge`  | Returns enhanced product context                        |
| "Show my social accounts"                  | `get_social_connections` | Lists connected accounts                                |
| "What's on my calendar this month?"        | `get_calendar`           | Returns scheduled posts                                 |
| "Schedule a post for next Monday"          | `schedule_post`          | Creates scheduled post                                  |

### 3. Agent Tools (Complete List)

| #   | Tool Name                | Category   | Description                                            |
| --- | ------------------------ | ---------- | ------------------------------------------------------ |
| 1   | `list_products`          | Product    | Search/list products from library                      |
| 2   | `get_product_details`    | Product    | Get detailed product info                              |
| 3   | `select_products`        | Product    | Select 1-6 products for generation                     |
| 4   | `set_prompt`             | Generation | Set the generation prompt in UI                        |
| 5   | `set_output_settings`    | Generation | Set platform, aspect ratio, resolution                 |
| 6   | `generate_image`         | Generation | Generate an ad image (costs credits)                   |
| 7   | `generate_ad_copy`       | Copy       | Generate ad copy (headline, hook, body, CTA, hashtags) |
| 8   | `get_idea_suggestions`   | Copy       | Get AI-powered creative suggestions                    |
| 9   | `search_knowledge_base`  | Knowledge  | Search uploaded docs via RAG                           |
| 10  | `get_templates`          | Knowledge  | List ad scene templates                                |
| 11  | `get_product_knowledge`  | Knowledge  | Enhanced product context (relationships, scenarios)    |
| 12  | `schedule_post`          | Scheduling | Schedule a post for publishing                         |
| 13  | `get_calendar`           | Scheduling | View scheduled/published posts                         |
| 14  | `get_social_connections` | Scheduling | List connected social accounts                         |

### 4. Session Management

```bash
# Delete a session
curl -X DELETE http://localhost:5000/api/agent/session/<sessionId> \
  -H "Cookie: <session-cookie>"
```

### 5. Rate Limiting

The agent is rate-limited to 60 requests per 15-minute window per user. Test by sending many rapid requests and verifying 429 responses.

---

## E. Gallery

Route: `/gallery`

### 1. Grid View

**Test steps:**

1. Navigate to `/gallery`
2. Verify generation grid loads from GET `/api/generations`
3. Test search by prompt text
4. Test sort: newest / oldest

### 2. Delete Functionality

**Test steps:**

1. Select one or more generations using checkboxes
2. Click delete button
3. Verify confirmation dialog appears
4. Confirm deletion
5. Verify DELETE `/api/generations/:id` is called for each selected item
6. Verify items disappear from the grid

### 3. Navigation to Studio

- Click on a generation card to navigate to `/?generation=:id`
- Verify the Studio loads with that generation's details

---

## F. Pipeline

Route: `/pipeline` with tab query parameter.

### 1. Dashboard (Weekly Plan)

Route: `/pipeline?tab=dashboard`

**Test steps:**

1. Verify the `WeeklyPlanView` component loads
2. Check GET `/api/planner/weekly/current` for the current week plan
3. Verify posts display with status indicators
4. Test plan regeneration via POST `/api/planner/weekly/:planId/regenerate`

### 2. Content Planner

Route: `/pipeline?tab=planner`

**Test steps:**

1. Verify content templates load from GET `/api/content-planner/templates`
2. Test weekly balance via GET `/api/content-planner/balance`
3. Test suggested next post via GET `/api/content-planner/suggestion`
4. Create a post via POST `/api/content-planner/posts`
5. Delete a post via DELETE `/api/content-planner/posts/:id`
6. Test carousel outline generation via POST `/api/content-planner/carousel-outline`
7. Test complete post generation via POST `/api/content-planner/generate-post`

### 3. Calendar

Route: `/pipeline?tab=calendar`

**Test steps:**

1. Verify calendar grid renders
2. Test date navigation (month forward/back)
3. Verify posts display on correct dates from GET `/api/calendar/posts?start=&end=`
4. Verify dot indicators from GET `/api/calendar/counts`
5. Test scheduling a new post via POST `/api/calendar/schedule`
6. Test rescheduling via PATCH `/api/calendar/posts/:id/reschedule`
7. Test cancellation via PATCH `/api/calendar/posts/:id/cancel`

### 4. Approval Queue

Route: `/pipeline?tab=approval`

**Test steps:**

1. Verify queue loads from GET `/api/approval-queue`
2. Test filtering by status and priority
3. Approve an item via POST `/api/approval-queue/:id/approve`
4. Reject an item via POST `/api/approval-queue/:id/reject`
5. Request revision via POST `/api/approval-queue/:id/revision`
6. Test bulk approve via POST `/api/approval-queue/bulk-approve`
7. View audit log via GET `/api/approval-queue/:id/audit`
8. Manage settings via GET/PUT `/api/approval-queue/settings`

### 5. Social Accounts

Route: `/pipeline?tab=accounts`

**Test steps:**

1. Verify connected accounts load from GET `/api/social/accounts`
2. Test syncing an account via POST `/api/social/sync-accounts`
3. Test disconnecting an account via DELETE `/api/social/accounts/:id`

---

## G. Library

Route: `/library` with tab query parameter.

### 1. Products Tab

Route: `/library?tab=products`

**Test steps:**

1. Verify product grid loads from GET `/api/products`
2. Add a product with image upload via POST `/api/products` (multipart form)
3. Sync from Cloudinary via POST `/api/products/sync`
4. Delete a product via DELETE `/api/products/:id`
5. Verify product analysis: POST `/api/products/:productId/analyze`
6. Verify cached analysis: GET `/api/products/:productId/analysis`
7. Test enrichment flow:
   - Generate draft: POST `/api/products/:productId/enrich`
   - Enrich from URL: POST `/api/products/:productId/enrich-from-url`
   - View enrichment: GET `/api/products/:productId/enrichment`
   - Verify enrichment: POST `/api/products/:productId/enrichment/verify`
   - Pending list: GET `/api/products/enrichment/pending`
8. Test relationship features:
   - View relationships: GET `/api/products/:productId/relationships`
   - Suggest relationships: POST `/api/products/:productId/suggest-relationships`
   - Find similar: POST `/api/products/find-similar`

### 2. Brand Images Tab

Route: `/library?tab=brand-images`

**Test steps:**

1. Verify brand images load from GET `/api/brand-images`
2. Upload a brand image via POST `/api/brand-images` (multipart form)
3. Filter by category via GET `/api/brand-images/category/:category`
4. Get images for products via POST `/api/brand-images/for-products`
5. Update metadata via PUT `/api/brand-images/:id`
6. Delete via DELETE `/api/brand-images/:id`

### 3. Ad References Tab (formerly "Templates")

Route: `/library?tab=templates`

**Test steps:**

1. Verify performing ad templates load from GET `/api/performing-ad-templates`
2. Test featured templates: GET `/api/performing-ad-templates/featured`
3. Test top templates: GET `/api/performing-ad-templates/top`
4. Test search: POST `/api/performing-ad-templates/search`
5. Filter by category: GET `/api/performing-ad-templates/category/:category`
6. Filter by platform: GET `/api/performing-ad-templates/platform/:platform`
7. CRUD operations (admin): POST, PUT, DELETE

### 4. Gen Templates Tab (formerly "Scenes")

Route: `/library?tab=scene-templates`

**Test steps:**

1. Verify ad scene templates load from GET `/api/templates`
2. Test search: GET `/api/templates/search?q=...`
3. View single template: GET `/api/templates/:id`
4. Admin mode toggle: shows admin controls for create/edit/delete
5. Create template (admin): POST `/api/templates`
6. Update template: PATCH `/api/templates/:id`
7. Delete template: DELETE `/api/templates/:id`

### 5. Scenarios Tab

Route: `/library?tab=scenarios`

**Test steps:**

1. Verify scenarios load from GET `/api/installation-scenarios`
2. Create scenario: POST `/api/installation-scenarios`
3. Filter by room type: GET `/api/installation-scenarios/room-type/:roomType`
4. Get for products: POST `/api/installation-scenarios/for-products`
5. Update: PUT `/api/installation-scenarios/:id`
6. Delete: DELETE `/api/installation-scenarios/:id`

### 6. Patterns Tab (Learn from Winners)

Route: `/library?tab=patterns`

**Test steps:**

1. Verify patterns load from GET `/api/learned-patterns`
2. Upload a pattern for analysis: POST `/api/learned-patterns/upload` (multipart, rate-limited)
3. Check upload status: GET `/api/learned-patterns/upload/:uploadId`
4. Filter by category: GET `/api/learned-patterns/category/:category`
5. View single pattern: GET `/api/learned-patterns/:patternId`
6. Update: PUT `/api/learned-patterns/:patternId`
7. Delete: DELETE `/api/learned-patterns/:patternId`
8. Apply to generation: POST `/api/learned-patterns/:patternId/apply`
9. Rate effectiveness: POST `/api/learned-patterns/:patternId/rate`

---

## H. Settings

Route: `/settings` with section query parameter.

### 1. Brand Profile

Route: `/settings?section=brand`

**Test steps:**

1. Load brand profile: GET `/api/brand-profile`
2. Update brand profile: PUT `/api/brand-profile`
3. Delete brand profile: DELETE `/api/brand-profile`
4. Update brand voice: PUT `/api/user/brand-voice`

```bash
curl -X PUT http://localhost:5000/api/brand-profile \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{
    "brandName": "Test Brand",
    "industry": "Technology",
    "brandValues": ["innovation", "quality"]
  }'
```

### 2. Knowledge Base

Route: `/settings?section=knowledge-base`

**Test steps:**

1. Initialize file search store: POST `/api/file-search/initialize`
2. Upload a reference file: POST `/api/file-search/upload` (multipart)
3. Upload a directory: POST `/api/file-search/upload-directory`
4. List files: GET `/api/file-search/files`
5. Filter by category: GET `/api/file-search/files?category=...`
6. Delete file: DELETE `/api/file-search/files/:fileId`
7. Seed: POST `/api/file-search/seed`

### 3. API Keys

Route: `/settings?section=api-keys`

**Test steps:**

1. List configured keys: GET `/api/settings/api-keys`
2. Save a Gemini API key:

```bash
curl -X POST http://localhost:5000/api/settings/api-keys/gemini \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"apiKey": "AIzaSy..."}'
```

3. Save Cloudinary keys (requires `cloudName`, `apiKey`, `apiSecret`)
4. Validate a key: POST `/api/settings/api-keys/:service/validate`
5. Delete a key: DELETE `/api/settings/api-keys/:service`
6. Verify supported services: gemini, cloudinary, etc.

**N8N Configuration:**

- Save: POST `/api/settings/n8n`
- Get: GET `/api/settings/n8n`
- Delete: DELETE `/api/settings/n8n`

### 4. Strategy

Route: `/settings?section=strategy`

**Test steps (Intelligence API):**

1. Get product priorities: GET `/api/intelligence/priorities`
2. Set priority for one product: PUT `/api/intelligence/priorities/:productId`
3. Bulk set priorities: POST `/api/intelligence/priorities/bulk`
4. Get business intelligence: GET `/api/intelligence/business`
5. Save business intelligence: PUT `/api/intelligence/business`
6. Check onboarding status: GET `/api/intelligence/onboarding-status`
7. Get posting stats: GET `/api/intelligence/stats`
8. Select products for weekly plan: POST `/api/intelligence/select`

### 5. Usage and Quotas

Route: `/settings?section=usage`

**Test steps:**

1. Quota status: GET `/api/quota/status`
2. Quota history: GET `/api/quota/history`
3. Quota breakdown: GET `/api/quota/breakdown`
4. Rate limit status: GET `/api/quota/rate-limit-status`
5. Alerts: GET/PUT `/api/quota/alerts`
6. Check alerts: GET `/api/quota/check-alerts`
7. Google Cloud status: GET `/api/quota/google/status`
8. Google Cloud snapshot: GET `/api/quota/google/snapshot`
9. Sync from Google: POST `/api/quota/google/sync`
10. Google history: GET `/api/quota/google/history`
11. Google snapshots: GET `/api/quota/google/snapshots`

---

## I. Generation Pipeline (Backend)

The generation pipeline is defined in `server/services/generation/generationPipelineService.ts` and runs through these stages:

### Pipeline Stages

| #    | Stage                    | Service                           | Description                                        |
| ---- | ------------------------ | --------------------------------- | -------------------------------------------------- |
| 1    | Input                    | (parsed from request)             | Prompt, images, mode, resolution                   |
| 2    | Product Context          | `productKnowledgeService`         | Enhanced product details, relationships, scenarios |
| 3    | Brand Context            | `storage.getBrandProfileByUserId` | Brand name, industry, values, colors               |
| 4    | Style References         | `styleAnalysisService`            | Character/style consistency analysis               |
| 5    | Vision Analysis          | `visionAnalysisService`           | AI analysis of uploaded product images             |
| 6    | KB/RAG Enrichment        | `fileSearchService`               | Knowledge base document retrieval                  |
| 7    | Learned Patterns         | `patternExtractionService`        | Patterns from uploaded winning ads                 |
| 8    | Template Resolution      | `storage.getAdSceneTemplateById`  | Selected scene template details                    |
| 9    | Prompt Assembly          | `promptBuilder`                   | Combines all context into final prompt             |
| 9.5  | **Pre-Gen Quality Gate** | `preGenGate`                      | Evaluates readiness before generation              |
| 10   | Generation               | Gemini API                        | Actual image generation call                       |
| 10.5 | **Critic Loop**          | `criticStage`                     | Auto-quality evaluation + silent retry             |
| 11   | Persistence              | `storage.saveGeneration`          | Saves result to database                           |

### Pre-Generation Quality Gate (Stage 9.5)

The gate uses a two-tier approach:

1. **Heuristic pre-check** (free, instant) — catches obvious issues
2. **LLM evaluation** (cheap via `gemini-3-flash`) — catches subtle issues

Score is blended: 40% heuristic + 60% LLM.

| Score Range | Action                                         |
| ----------- | ---------------------------------------------- |
| 0-39        | **BLOCKED** — returns 400 with suggestions     |
| 40-59       | **WARNED** — proceeds but includes suggestions |
| 60-100      | **PASSED** — full speed ahead                  |

Breakdown categories (0-25 each):

- `promptSpecificity`: Clarity and detail of the prompt
- `contextCompleteness`: Brand context, recipe, template availability
- `imageQuality`: Product images provided and sufficient
- `consistency`: Mode + template + prompt alignment

### Critic Loop (Stage 10.5)

After generation, the critic evaluates the result using a VLM:

- **Quality threshold**: 60/100
- **Max retries**: 2
- If below threshold, regenerates with a revised prompt
- Runs silently — user only sees the final (better) image

### Testing the Pipeline

```bash
# Standard mode (text + images)
curl -X POST http://localhost:5000/api/transform \
  -H "Cookie: <session-cookie>" \
  -F "prompt=Modern kitchen with stainless steel appliances, warm lighting" \
  -F "images=@product1.jpg" \
  -F "resolution=2K" \
  -F "mode=standard"
```

```bash
# Exact insert mode (requires template)
curl -X POST http://localhost:5000/api/transform \
  -H "Cookie: <session-cookie>" \
  -F "prompt=Product placed in modern setting" \
  -F "images=@product1.jpg" \
  -F "resolution=2K" \
  -F "mode=exact_insert" \
  -F "templateId=<template-uuid>"
```

Expected response:

```json
{
  "success": true,
  "imageUrl": "https://res.cloudinary.com/.../generated.png",
  "generationId": "<uuid>",
  "prompt": "...",
  "canEdit": true,
  "mode": "standard",
  "stagesCompleted": [
    "product",
    "brand",
    "style",
    "vision",
    "kb",
    "patterns",
    "template",
    "prompt",
    "pregen",
    "generate",
    "critic",
    "persist"
  ]
}
```

### Brand DNA Integration (Phase 5)

The pipeline calls `getBrandDNAContext` to inject brand personality into prompts. Verify by:

1. Setting a brand profile with distinct personality traits
2. Generating an image
3. Checking if the final prompt (in generation record) includes brand DNA elements

---

## J. API Endpoints Checklist

### Health and Infrastructure

| Method | Path                | Auth | Description                      |
| ------ | ------------------- | ---- | -------------------------------- |
| GET    | `/api/health/live`  | No   | Liveness probe                   |
| GET    | `/api/health/ready` | No   | Readiness probe (DB + Redis)     |
| GET    | `/api/health`       | No   | General health (+ Gemini status) |

### Authentication

| Method | Path                        | Auth | Description                                          |
| ------ | --------------------------- | ---- | ---------------------------------------------------- |
| POST   | `/api/auth/register`        | No   | Register new user                                    |
| POST   | `/api/auth/login`           | No   | Login                                                |
| POST   | `/api/auth/logout`          | No   | Logout                                               |
| GET    | `/api/auth/me`              | No   | Current user (returns `authenticated: false` if not) |
| GET    | `/api/auth/demo`            | No   | Demo login (dev only)                                |
| POST   | `/api/auth/forgot-password` | No   | Forgot password                                      |
| POST   | `/api/auth/reset-password`  | No   | Reset password                                       |
| POST   | `/api/auth/verify-email`    | No   | Verify email                                         |
| DELETE | `/api/auth/account`         | Yes  | Delete account                                       |
| GET    | `/api/auth/export`          | Yes  | Export user data                                     |

### Generation

| Method | Path                           | Auth | Description                          |
| ------ | ------------------------------ | ---- | ------------------------------------ |
| POST   | `/api/transform`               | Yes  | Main generation endpoint (multipart) |
| GET    | `/api/generations`             | Yes  | List generations                     |
| GET    | `/api/generations/:id`         | Yes  | Get single generation                |
| GET    | `/api/generations/:id/history` | Yes  | Get edit history chain               |
| DELETE | `/api/generations/:id`         | Yes  | Delete generation                    |
| POST   | `/api/generations/:id/edit`    | Yes  | Edit generation (async BullMQ)       |
| POST   | `/api/generations/:id/analyze` | Yes  | Analyze with AI                      |
| POST   | `/api/generations/video`       | Yes  | Generate video (async BullMQ + Veo)  |

### Jobs (Async Operations)

| Method | Path                      | Auth | Description              |
| ------ | ------------------------- | ---- | ------------------------ |
| GET    | `/api/jobs/:jobId`        | No   | Get job status           |
| GET    | `/api/jobs/:jobId/stream` | Yes  | SSE real-time job status |

### Products

| Method | Path                                             | Auth | Description                      |
| ------ | ------------------------------------------------ | ---- | -------------------------------- |
| POST   | `/api/products`                                  | Yes  | Create product (multipart image) |
| GET    | `/api/products`                                  | Yes  | List all products                |
| GET    | `/api/products/:id`                              | Yes  | Get single product               |
| DELETE | `/api/products/:id`                              | Yes  | Delete product                   |
| DELETE | `/api/products`                                  | Yes  | Clear all products               |
| POST   | `/api/products/sync`                             | Yes  | Sync from Cloudinary             |
| POST   | `/api/products/:productId/analyze`               | Yes  | Vision analysis                  |
| GET    | `/api/products/:productId/analysis`              | Yes  | Get cached analysis              |
| POST   | `/api/products/:productId/enrich`                | Yes  | Generate enrichment draft        |
| POST   | `/api/products/:productId/enrich-from-url`       | Yes  | Enrich from product URL          |
| GET    | `/api/products/:productId/enrichment`            | Yes  | Get enrichment data              |
| POST   | `/api/products/:productId/enrichment/verify`     | Yes  | Verify enrichment                |
| GET    | `/api/products/enrichment/pending`               | No   | Products needing enrichment      |
| GET    | `/api/products/:productId/relationships`         | Yes  | Get product relationships        |
| GET    | `/api/products/:productId/relationships/:type`   | Yes  | Get by relationship type         |
| POST   | `/api/products/:productId/suggest-relationships` | Yes  | AI suggestions                   |
| POST   | `/api/products/find-similar`                     | Yes  | Find similar products            |

### Templates (Ad Scene)

| Method | Path                    | Auth        | Description         |
| ------ | ----------------------- | ----------- | ------------------- |
| GET    | `/api/templates`        | No          | List all templates  |
| GET    | `/api/templates/search` | No          | Search templates    |
| GET    | `/api/templates/:id`    | No          | Get single template |
| POST   | `/api/templates`        | Yes (admin) | Create template     |
| PATCH  | `/api/templates/:id`    | Yes         | Update template     |
| DELETE | `/api/templates/:id`    | Yes         | Delete template     |

### Performing Ad Templates (Ad References)

| Method | Path                                          | Auth | Description        |
| ------ | --------------------------------------------- | ---- | ------------------ |
| GET    | `/api/performing-ad-templates`                | Yes  | List all           |
| GET    | `/api/performing-ad-templates/featured`       | Yes  | Featured templates |
| GET    | `/api/performing-ad-templates/top`            | Yes  | Top performing     |
| POST   | `/api/performing-ad-templates/search`         | Yes  | Search             |
| GET    | `/api/performing-ad-templates/category/:cat`  | Yes  | By category        |
| GET    | `/api/performing-ad-templates/platform/:plat` | Yes  | By platform        |
| GET    | `/api/performing-ad-templates/:id`            | Yes  | Get single         |
| POST   | `/api/performing-ad-templates`                | Yes  | Create             |
| PUT    | `/api/performing-ad-templates/:id`            | Yes  | Update             |
| DELETE | `/api/performing-ad-templates/:id`            | Yes  | Delete             |

### Brand Images

| Method | Path                                   | Auth | Description                    |
| ------ | -------------------------------------- | ---- | ------------------------------ |
| POST   | `/api/brand-images`                    | Yes  | Upload brand image (multipart) |
| GET    | `/api/brand-images`                    | Yes  | List all                       |
| GET    | `/api/brand-images/category/:category` | Yes  | Filter by category             |
| POST   | `/api/brand-images/for-products`       | Yes  | Get images for products        |
| PUT    | `/api/brand-images/:id`                | Yes  | Update metadata                |
| DELETE | `/api/brand-images/:id`                | Yes  | Delete                         |
| POST   | `/api/brand-images/recommend`          | Yes  | AI recommendations             |
| POST   | `/api/brand-images/match-product/:id`  | Yes  | Match to product               |
| POST   | `/api/brand-images/suggest-category`   | Yes  | Suggest category               |

### Idea Bank

| Method | Path                                  | Auth | Description             |
| ------ | ------------------------------------- | ---- | ----------------------- |
| POST   | `/api/idea-bank/suggest`              | No\* | Generate AI suggestions |
| GET    | `/api/idea-bank/templates/:productId` | Yes  | Matched templates       |

### Copywriting

| Method | Path                                 | Auth | Description                    |
| ------ | ------------------------------------ | ---- | ------------------------------ |
| POST   | `/api/copy/generate`                 | Yes  | Generate copy for a generation |
| GET    | `/api/copy/generation/:generationId` | Yes  | Get copy for generation        |
| GET    | `/api/copy/:id`                      | Yes  | Get single copy                |
| DELETE | `/api/copy/:id`                      | Yes  | Delete copy                    |
| POST   | `/api/copywriting/standalone`        | Yes  | Standalone copy generation     |

### Relationships

| Method | Path                               | Auth | Description            |
| ------ | ---------------------------------- | ---- | ---------------------- |
| POST   | `/api/product-relationships`       | Yes  | Create relationship    |
| DELETE | `/api/product-relationships/:id`   | Yes  | Delete relationship    |
| POST   | `/api/product-relationships/bulk`  | Yes  | Bulk get relationships |
| POST   | `/api/relationships/analyze`       | Yes  | Analyze relationship   |
| POST   | `/api/relationships/batch-suggest` | Yes  | Batch suggest          |
| POST   | `/api/relationships/auto-create`   | Yes  | Auto-create            |

### Installation Scenarios

| Method | Path                                          | Auth | Description     |
| ------ | --------------------------------------------- | ---- | --------------- |
| POST   | `/api/installation-scenarios`                 | Yes  | Create scenario |
| GET    | `/api/installation-scenarios`                 | Yes  | List all        |
| GET    | `/api/installation-scenarios/room-type/:type` | Yes  | By room type    |
| POST   | `/api/installation-scenarios/for-products`    | Yes  | For products    |
| GET    | `/api/installation-scenarios/:id`             | Yes  | Get single      |
| PUT    | `/api/installation-scenarios/:id`             | Yes  | Update          |
| DELETE | `/api/installation-scenarios/:id`             | Yes  | Delete          |

### Learned Patterns

| Method | Path                                     | Auth | Description                   |
| ------ | ---------------------------------------- | ---- | ----------------------------- |
| POST   | `/api/learned-patterns/upload`           | Yes  | Upload pattern (rate-limited) |
| GET    | `/api/learned-patterns/upload/:uploadId` | Yes  | Check upload status           |
| GET    | `/api/learned-patterns`                  | Yes  | List with filters             |
| GET    | `/api/learned-patterns/category/:cat`    | Yes  | By category                   |
| GET    | `/api/learned-patterns/:patternId`       | Yes  | Get single                    |
| PUT    | `/api/learned-patterns/:patternId`       | Yes  | Update                        |
| DELETE | `/api/learned-patterns/:patternId`       | Yes  | Delete                        |
| POST   | `/api/learned-patterns/:patternId/apply` | Yes  | Apply to generation           |
| POST   | `/api/learned-patterns/:patternId/rate`  | Yes  | Rate effectiveness            |

### Social

| Method | Path                        | Auth | Description             |
| ------ | --------------------------- | ---- | ----------------------- |
| GET    | `/api/social/accounts`      | Yes  | List connected accounts |
| DELETE | `/api/social/accounts/:id`  | Yes  | Disconnect account      |
| POST   | `/api/social/sync-accounts` | Yes  | Sync from n8n           |

### Calendar

| Method | Path                                 | Auth | Description         |
| ------ | ------------------------------------ | ---- | ------------------- |
| GET    | `/api/calendar/posts`                | Yes  | Posts in date range |
| GET    | `/api/calendar/counts`               | Yes  | Post counts per day |
| GET    | `/api/calendar/posts/:id`            | Yes  | Single post         |
| POST   | `/api/calendar/schedule`             | Yes  | Schedule new post   |
| PATCH  | `/api/calendar/posts/:id/reschedule` | Yes  | Reschedule          |
| PATCH  | `/api/calendar/posts/:id/cancel`     | Yes  | Cancel              |

### Content Planning

| Method | Path                                    | Auth | Description            |
| ------ | --------------------------------------- | ---- | ---------------------- |
| GET    | `/api/content-planner/templates`        | No   | Content templates      |
| GET    | `/api/content-planner/balance`          | Yes  | Weekly balance         |
| GET    | `/api/content-planner/suggestion`       | Yes  | Next post suggestion   |
| POST   | `/api/content-planner/posts`            | Yes  | Create post            |
| GET    | `/api/content-planner/posts`            | Yes  | Get posts by date      |
| DELETE | `/api/content-planner/posts/:id`        | Yes  | Delete post            |
| POST   | `/api/content-planner/carousel-outline` | Yes  | Generate carousel      |
| POST   | `/api/content-planner/generate-post`    | Yes  | Generate complete post |

### Weekly Planner

| Method | Path                                       | Auth | Description                  |
| ------ | ------------------------------------------ | ---- | ---------------------------- |
| GET    | `/api/planner/weekly`                      | Yes  | Get/generate plan for a week |
| GET    | `/api/planner/weekly/current`              | Yes  | Current week plan            |
| PATCH  | `/api/planner/weekly/:planId/posts/:index` | Yes  | Update post status           |
| POST   | `/api/planner/weekly/:planId/regenerate`   | Yes  | Regenerate plan              |

### Approval Queue

| Method | Path                               | Auth | Description      |
| ------ | ---------------------------------- | ---- | ---------------- |
| GET    | `/api/approval-queue`              | Yes  | List items       |
| GET    | `/api/approval-queue/:id`          | Yes  | Get single item  |
| POST   | `/api/approval-queue/:id/approve`  | Yes  | Approve          |
| POST   | `/api/approval-queue/:id/reject`   | Yes  | Reject           |
| POST   | `/api/approval-queue/:id/revision` | Yes  | Request revision |
| POST   | `/api/approval-queue/bulk-approve` | Yes  | Bulk approve     |
| GET    | `/api/approval-queue/:id/audit`    | Yes  | Audit log        |
| GET    | `/api/approval-queue/settings`     | Yes  | Get settings     |
| PUT    | `/api/approval-queue/settings`     | Yes  | Update settings  |

### Agent Chat

| Method | Path                            | Auth | Description                 |
| ------ | ------------------------------- | ---- | --------------------------- |
| POST   | `/api/agent/chat`               | Yes  | Stream agent response (SSE) |
| DELETE | `/api/agent/session/:sessionId` | Yes  | Delete session              |

### Style References

| Method | Path                                  | Auth | Description            |
| ------ | ------------------------------------- | ---- | ---------------------- |
| POST   | `/api/style-references`               | Yes  | Upload reference image |
| GET    | `/api/style-references`               | Yes  | List references        |
| GET    | `/api/style-references/:id`           | Yes  | Get single             |
| PUT    | `/api/style-references/:id`           | Yes  | Update metadata        |
| DELETE | `/api/style-references/:id`           | Yes  | Soft-delete            |
| POST   | `/api/style-references/:id/reanalyze` | Yes  | Re-run analysis        |

### Model Training

| Method | Path                                        | Auth | Description       |
| ------ | ------------------------------------------- | ---- | ----------------- |
| GET    | `/api/training/datasets`                    | Yes  | List datasets     |
| POST   | `/api/training/datasets`                    | Yes  | Create dataset    |
| GET    | `/api/training/datasets/:id`                | Yes  | Get dataset       |
| POST   | `/api/training/datasets/:id/examples`       | Yes  | Add examples      |
| DELETE | `/api/training/datasets/:id/examples/:exId` | Yes  | Remove example    |
| POST   | `/api/training/datasets/:id/start`          | Yes  | Start tuning job  |
| GET    | `/api/training/datasets/:id/status`         | Yes  | Check status      |
| GET    | `/api/training/models`                      | Yes  | List tuned models |
| DELETE | `/api/training/models/:name`                | Yes  | Delete model      |

### Intelligence (Product Priorities)

| Method | Path                                      | Auth | Description                |
| ------ | ----------------------------------------- | ---- | -------------------------- |
| GET    | `/api/intelligence/priorities`            | Yes  | Get priorities             |
| PUT    | `/api/intelligence/priorities/:productId` | Yes  | Set priority               |
| POST   | `/api/intelligence/priorities/bulk`       | Yes  | Batch set                  |
| GET    | `/api/intelligence/business`              | Yes  | Get business intelligence  |
| PUT    | `/api/intelligence/business`              | Yes  | Save business intelligence |
| GET    | `/api/intelligence/onboarding-status`     | Yes  | Check onboarding           |
| GET    | `/api/intelligence/stats`                 | Yes  | Posting stats              |
| POST   | `/api/intelligence/select`                | Yes  | Select for weekly plan     |

### File Search (Knowledge Base)

| Method | Path                                | Auth | Description             |
| ------ | ----------------------------------- | ---- | ----------------------- |
| POST   | `/api/file-search/initialize`       | Yes  | Initialize store        |
| POST   | `/api/file-search/upload`           | Yes  | Upload file (multipart) |
| POST   | `/api/file-search/upload-directory` | Yes  | Upload directory        |
| GET    | `/api/file-search/files`            | Yes  | List files              |
| DELETE | `/api/file-search/files/:fileId`    | Yes  | Delete file             |
| POST   | `/api/file-search/seed`             | Yes  | Seed store              |

### Image Analysis (Standalone)

| Method | Path                 | Auth | Description            |
| ------ | -------------------- | ---- | ---------------------- |
| POST   | `/api/analyze-image` | Yes  | Analyze uploaded image |

### N8N Webhooks

| Method | Path                 | Auth         | Description             |
| ------ | -------------------- | ------------ | ----------------------- |
| GET    | `/api/n8n/due-posts` | Webhook HMAC | Posts ready to publish  |
| POST   | `/api/n8n/callback`  | Webhook HMAC | Publish result callback |

### Settings

| Method | Path                                       | Auth | Description          |
| ------ | ------------------------------------------ | ---- | -------------------- |
| GET    | `/api/settings/api-keys`                   | Yes  | List configured keys |
| POST   | `/api/settings/api-keys/:service`          | Yes  | Save API key         |
| DELETE | `/api/settings/api-keys/:service`          | Yes  | Delete API key       |
| POST   | `/api/settings/api-keys/:service/validate` | Yes  | Validate key         |
| POST   | `/api/settings/n8n`                        | Yes  | Save n8n config      |
| GET    | `/api/settings/n8n`                        | Yes  | Get n8n config       |
| DELETE | `/api/settings/n8n`                        | Yes  | Delete n8n config    |

### Brand Profile

| Method | Path                    | Auth | Description          |
| ------ | ----------------------- | ---- | -------------------- |
| GET    | `/api/brand-profile`    | Yes  | Get brand profile    |
| PUT    | `/api/brand-profile`    | Yes  | Update brand profile |
| DELETE | `/api/brand-profile`    | Yes  | Delete brand profile |
| PUT    | `/api/user/brand-voice` | Yes  | Update brand voice   |

### Pricing

| Method | Path                    | Auth | Description              |
| ------ | ----------------------- | ---- | ------------------------ |
| GET    | `/api/pricing/estimate` | No   | Estimate generation cost |

### Monitoring

| Method | Path                          | Auth | Description             |
| ------ | ----------------------------- | ---- | ----------------------- |
| GET    | `/api/monitoring/health`      | Yes  | System health           |
| GET    | `/api/monitoring/performance` | Yes  | Performance metrics     |
| GET    | `/api/monitoring/errors`      | Yes  | Error tracking          |
| GET    | `/api/monitoring/system`      | Yes  | Full system aggregation |
| GET    | `/api/monitoring/endpoints`   | Yes  | API endpoints summary   |

### Admin

| Method | Path                                        | Auth        | Description          |
| ------ | ------------------------------------------- | ----------- | -------------------- |
| POST   | `/api/admin/seed-brand`                     | Yes (admin) | Seed brand profile   |
| POST   | `/api/admin/seed-products`                  | Yes (admin) | Seed products        |
| POST   | `/api/admin/seed-installation-scenarios`    | Yes (admin) | Seed scenarios       |
| POST   | `/api/admin/seed-relationships`             | Yes (admin) | Seed relationships   |
| POST   | `/api/admin/seed-brand-images`              | Yes (admin) | Seed brand images    |
| POST   | `/api/admin/seed-templates`                 | Yes (admin) | Seed templates       |
| POST   | `/api/admin/seed-ad-scene-templates`        | Yes (admin) | Seed scene templates |
| POST   | `/api/admin/seed-all`                       | Yes (admin) | Run all seeds        |
| GET    | `/api/admin/dead-letter-queue`              | Yes (admin) | List DLQ jobs        |
| POST   | `/api/admin/dead-letter-queue/:jobId/retry` | Yes (admin) | Retry DLQ job        |
| GET    | `/api/admin/scraper/categories`             | Yes (admin) | Scraper categories   |
| POST   | `/api/admin/scraper/scrape-all`             | Yes (admin) | Scrape all products  |
| POST   | `/api/admin/scraper/scrape-category/:cat`   | Yes (admin) | Scrape category      |

---

## K. Automated Tests

### Test Files

Located in `server/__tests__/`:

| Test File                        | Covers                          |
| -------------------------------- | ------------------------------- |
| `auth.test.ts`                   | Authentication flows            |
| `rateLimit.test.ts`              | Rate limiting middleware        |
| `validation.test.ts`             | Input validation schemas        |
| `copywriting.test.ts`            | Copywriting service (24 suites) |
| `apiKeyValidation.test.ts`       | API key validation              |
| `encryptionService.test.ts`      | Encryption service              |
| `enrichment.test.ts`             | Product enrichment pipeline     |
| `urlEnrichment.test.ts`          | URL-based enrichment            |
| `fileSearch.test.ts`             | File search/RAG                 |
| `geminiService.test.ts`          | Gemini integration              |
| `ideaBankService.test.ts`        | Idea bank AI                    |
| `patternExtraction.test.ts`      | Pattern extraction              |
| `productKnowledge.test.ts`       | Product knowledge service       |
| `visionAnalysisService.test.ts`  | Vision analysis                 |
| `pricingEstimator.test.ts`       | Pricing estimation              |
| `quotaMonitoringService.test.ts` | Quota monitoring                |
| `contentPlannerService.test.ts`  | Content planner                 |
| `contentSafetyService.test.ts`   | Content safety                  |
| `generationDTO.test.ts`          | Generation DTOs                 |
| `generationWorker.test.ts`       | BullMQ worker                   |
| `jobQueueIntegration.test.ts`    | Queue integration               |
| `monitoring.test.ts`             | System monitoring               |
| `dbHealth.test.ts`               | Database health                 |
| `errorTracking.test.ts`          | Error tracking                  |
| `performanceMetrics.test.ts`     | Performance metrics             |
| `cacheService.test.ts`           | Cache service                   |
| `memoryManager.test.ts`          | Memory management               |
| `attack-scenarios.test.ts`       | Security attack scenarios       |
| `ragEndpoints.test.ts`           | RAG endpoint integration        |

### Running Tests

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client

# Run E2E tests
npm run test:e2e

# Run E2E tests with interactive UI
npm run test:e2e:ui

# CI mode (JUnit output)
npm run test:ci
```

### Coverage Requirements

The project enforces minimum 80% coverage:

- Statements: >= 80%
- Branches: >= 75%
- Functions: >= 80%
- Lines: >= 80%

---

## L. Production Deployment Verification

### 1. Check Deployment Status

```bash
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Project-Access-Token: 4615359f-6328-413f-b418-4f0c6979161a" \
  -d '{"query": "query { deployments(first: 3, input: { serviceId: \"28ce02bc-f4ad-4ea7-aab6-bffc98a47e2f\" }) { edges { node { id status createdAt } } } }"}'
```

### 2. Health Endpoint Verification

```bash
curl -s https://automated-ads-agent-production.up.railway.app/api/health
```

Expected: `{"status":"ok","timestamp":"...","redis":{...},"gemini":{...}}`

### 3. JS Bundle Hash Check

Verify a deployment updated the frontend by checking the bundle hash:

```bash
curl -s "https://automated-ads-agent-production.up.railway.app/" | grep -o 'assets/index-[^"]*\.js'
```

Compare with the previous hash to confirm the bundle changed.

### 4. Trigger Redeploy

```bash
curl -s -X POST https://backboard.railway.app/graphql/v2 \
  -H "Content-Type: application/json" \
  -H "Project-Access-Token: 4615359f-6328-413f-b418-4f0c6979161a" \
  -d '{"query": "mutation { serviceInstanceRedeploy(serviceId: \"28ce02bc-f4ad-4ea7-aab6-bffc98a47e2f\", environmentId: \"14f7ad84-cb42-4ec6-a9e5-29826e2f9882\") }"}'
```

### 5. Deployment Status Values

| Status         | Meaning                     |
| -------------- | --------------------------- |
| `INITIALIZING` | Starting build              |
| `BUILDING`     | Build in progress           |
| `DEPLOYING`    | Deploying to infrastructure |
| `SUCCESS`      | Deployment complete         |
| `FAILED`       | Build/deploy failed         |
| `REMOVED`      | Old deployment removed      |

### 6. Smoke Test Checklist

After every deployment, verify:

1. Health endpoint returns `ok`
2. Login page renders at `/login`
3. Demo login works (if `ENABLE_DEMO_MODE=true`)
4. Studio page loads at `/`
5. Gallery loads at `/gallery`
6. Products API returns data at `/api/products`
7. Agent chat responds to "hello"
8. Image generation works end-to-end (one full generation)

---

## Appendix: Legacy Routes

The following endpoints exist in both `server/routes.ts` (legacy) and their respective router modules. During the migration period, both versions are active. The modular router versions take precedence:

- Health: `/api/health/*` (migrated to `health.router.ts`)
- Auth: `/api/auth/*` (migrated to `auth.router.ts`)
- Monitoring: `/api/monitoring/*` (migrated to `monitoring.router.ts`)
- Products: `/api/products/*` (migrated to `products.router.ts`)
- Generations: `/api/generations/*` (migrated to `generations.router.ts`)
- Templates: `/api/templates/*` (migrated to `templates.router.ts`)
- Brand Images: `/api/brand-images/*` (migrated to `brandImages.router.ts`)
- Scenarios: `/api/installation-scenarios/*` (migrated to `scenarios.router.ts`)
- Patterns: `/api/learned-patterns/*` (migrated to `patterns.router.ts`)
- Social: `/api/social/*` (migrated to `social.router.ts`)
- Planning: `/api/content-planner/*` (migrated to `planning.router.ts`)
- Copywriting: `/api/copywriting/*` (migrated to `copywriting.router.ts`)
- Image: `/api/analyze-image` (migrated to `image.router.ts`)
- N8N: `/api/n8n/*` (migrated to `n8n.router.ts`)

The legacy `POST /api/transform` endpoint remains in `routes.ts` and is the primary generation entry point used by the frontend.
