# Admin & Infrastructure API Reference

Endpoints with no user-facing UI. For internal tooling, CI/CD, and admin operations only.

**Base URL:** `https://automated-ads-agent-production.up.railway.app`

---

## Admin Router (`/api/admin`)

All endpoints require **authentication + admin role**.

### POST /api/admin/seed-brand

**Auth:** Admin only
**Description:** Seed the brand profile from predefined data.
**Request:** No body required.
**Response:**

```json
{ "success": true, "message": "Brand Profile seeded successfully" }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/admin/seed-brand \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json"
```

### POST /api/admin/seed-products

**Auth:** Admin only
**Description:** Seed product catalog. Optionally filter to sample data or Cloudinary-only uploads.
**Request:**

```json
{
  "sampleOnly": false,
  "cloudinaryOnly": false,
  "cloudinaryFolder": "nds-products"
}
```

All fields optional.
**Response:**

```json
{ "success": true, "message": "Products seeded successfully", "results": { ... } }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/admin/seed-products \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{"sampleOnly": true}'
```

### POST /api/admin/seed-installation-scenarios

**Auth:** Admin only
**Description:** Seed installation scenarios (room types, tips, accessories).
**Request:** No body required.
**Response:**

```json
{ "success": true, "message": "Installation scenarios seeded successfully", "results": { ... } }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/admin/seed-installation-scenarios \
  -H "Cookie: connect.sid=<session>"
```

### POST /api/admin/seed-relationships

**Auth:** Admin only
**Description:** Seed product relationships (pairs_with, requires, replaces, etc.).
**Request:** No body required.
**Response:**

```json
{ "success": true, "message": "Product relationships seeded successfully", "results": { ... } }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/admin/seed-relationships \
  -H "Cookie: connect.sid=<session>"
```

### POST /api/admin/seed-brand-images

**Auth:** Admin only
**Description:** Seed brand image library. Optionally filter to sample data or Cloudinary.
**Request:**

```json
{
  "sampleOnly": false,
  "cloudinaryOnly": false,
  "cloudinaryFolder": "nds-brand"
}
```

All fields optional.
**Response:**

```json
{ "success": true, "message": "Brand images seeded successfully", "results": { ... } }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/admin/seed-brand-images \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{"sampleOnly": true}'
```

### POST /api/admin/seed-templates

**Auth:** Admin only
**Description:** Seed performing ad templates.
**Request:** No body required.
**Response:**

```json
{ "success": true, "message": "Performing templates seeded successfully", "results": { ... } }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/admin/seed-templates \
  -H "Cookie: connect.sid=<session>"
```

### POST /api/admin/seed-all

**Auth:** Admin only
**Description:** Run all seed operations in sequence.
**Request:** Same options as individual seeds (all optional).
**Response:**

```json
{ "success": true, "message": "All seeds completed", "results": { ... } }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/admin/seed-all \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### GET /api/admin/dead-letter-queue

**Auth:** Admin only
**Description:** List failed generation jobs in the Dead Letter Queue.
**Request:** Query params: `start` (default 0), `limit` (default 20).
**Response:**

```json
{
  "success": true,
  "data": [ { "id": "...", "data": { ... }, "failedReason": "..." } ],
  "pagination": { "start": 0, "limit": 20, "total": 5, "hasMore": false }
}
```

**Example:**

```bash
curl "https://automated-ads-agent-production.up.railway.app/api/admin/dead-letter-queue?start=0&limit=10" \
  -H "Cookie: connect.sid=<session>"
```

### POST /api/admin/dead-letter-queue/:jobId/retry

**Auth:** Admin only
**Description:** Re-queue a failed DLQ job back to the generation queue.
**Request:** No body. `:jobId` in URL path.
**Response:**

```json
{ "success": true, "message": "Job re-queued successfully", "newJobId": "..." }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/admin/dead-letter-queue/job-123/retry \
  -H "Cookie: connect.sid=<session>"
```

### GET /api/admin/scraper/categories

**Auth:** Admin only
**Description:** List available NDS website scraping categories.
**Response:**

```json
{ "success": true, "categories": ["rebar", "mesh", "structural-steel", ...] }
```

**Example:**

```bash
curl "https://automated-ads-agent-production.up.railway.app/api/admin/scraper/categories" \
  -H "Cookie: connect.sid=<session>"
```

### POST /api/admin/scraper/scrape-all

**Auth:** Admin only
**Description:** Scrape all products from the NDS website.
**Request:**

```json
{
  "categories": ["rebar", "mesh"],
  "dryRun": false,
  "limit": 50
}
```

All fields optional.
**Response:**

```json
{ "success": true, "message": "Scraping completed", "results": { ... } }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/admin/scraper/scrape-all \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{"dryRun": true}'
```

### POST /api/admin/scraper/scrape-category/:category

**Auth:** Admin only
**Description:** Scrape a single product category.
**Request:** No body. `:category` in URL path.
**Response:**

```json
{ "success": true, "message": "Category rebar scraped", "results": { ... } }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/admin/scraper/scrape-category/rebar \
  -H "Cookie: connect.sid=<session>"
```

### GET /api/admin/experiments

**Auth:** Admin only
**Description:** List all A/B testing experiments.
**Response:**

```json
{ "success": true, "experiments": [{ "id": "...", "name": "...", "status": "running" }] }
```

**Example:**

```bash
curl "https://automated-ads-agent-production.up.railway.app/api/admin/experiments" \
  -H "Cookie: connect.sid=<session>"
```

### POST /api/admin/experiments

**Auth:** Admin only
**Description:** Create a new A/B experiment.
**Request:** Body matches the experiment schema (name, variants, etc.).
**Response:**

```json
{ "success": true, "experiment": { ... } }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/admin/experiments \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{"name": "hook-test-v1", "variants": [...]}'
```

### POST /api/admin/experiments/:id/status

**Auth:** Admin only
**Description:** Update experiment status.
**Request:**

```json
{ "status": "running" | "paused" | "completed" }
```

**Response:**

```json
{ "success": true, "message": "Experiment exp-1 status updated to running" }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/admin/experiments/exp-1/status \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{"status": "paused"}'
```

### GET /api/admin/experiments/:id/results

**Auth:** Admin only
**Description:** Get experiment results with aggregation.
**Response:**

```json
{ "success": true, "experiment": { ... }, "results": { ... } }
```

**Example:**

```bash
curl "https://automated-ads-agent-production.up.railway.app/api/admin/experiments/exp-1/results" \
  -H "Cookie: connect.sid=<session>"
```

### GET /api/admin/prompts

**Auth:** Admin only
**Description:** List all registered prompts with versions from the prompt registry.
**Response:**

```json
{ "success": true, "count": 12, "prompts": [{ "name": "...", "version": "..." }] }
```

**Example:**

```bash
curl "https://automated-ads-agent-production.up.railway.app/api/admin/prompts" \
  -H "Cookie: connect.sid=<session>"
```

---

## N8N Router (`/api/n8n`) — @deprecated

> **Deprecated.** Posting is now handled in-process via `publishingService.ts`. Kept for rollout compatibility.

Auth uses **webhook HMAC signature** (not session cookie).

### GET /api/n8n/due-posts

**Auth:** Webhook HMAC signature
**Description:** n8n polls this for posts that are due for publishing. Posts are atomically claimed.
**Response:**

```json
{
  "success": true,
  "posts": [{ "id": "...", "content": "...", "platform": "linkedin" }],
  "claimedAt": "2026-03-04T12:00:00.000Z"
}
```

**Example:**

```bash
curl "https://automated-ads-agent-production.up.railway.app/api/n8n/due-posts" \
  -H "X-Webhook-Signature: <hmac>"
```

### POST /api/n8n/callback

**Auth:** Webhook HMAC signature
**Description:** n8n reports publish result back.
**Request:**

```json
{
  "scheduledPostId": "sp-1",
  "platform": "linkedin",
  "success": true,
  "platformPostId": "urn:li:share:123",
  "platformPostUrl": "https://linkedin.com/feed/...",
  "error": null,
  "errorCode": null,
  "postedAt": "2026-03-04T12:00:00.000Z",
  "executionId": "exec-abc"
}
```

**Response:**

```json
{ "success": true, "message": "Callback processed — post status updated" }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/n8n/callback \
  -H "X-Webhook-Signature: <hmac>" \
  -H "Content-Type: application/json" \
  -d '{"scheduledPostId":"sp-1","platform":"linkedin","success":true}'
```

---

## Webhooks Router (`/api/webhooks`)

### POST /api/webhooks/performance

**Auth:** Webhook HMAC signature
**Description:** n8n posts social media engagement/performance data for a generation.
**Request:**

```json
{
  "generationId": "gen-1",
  "platform": "linkedin",
  "impressions": 1500,
  "engagementRate": 4.2,
  "clicks": 63,
  "conversions": 5
}
```

**Response:**

```json
{ "success": true, "data": { "id": "perf-1" }, "message": "Performance data saved" }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/webhooks/performance \
  -H "X-Webhook-Signature: <hmac>" \
  -H "Content-Type: application/json" \
  -d '{"generationId":"gen-1","platform":"linkedin","impressions":1500,"engagementRate":4.2,"clicks":63,"conversions":5}'
```

---

## File Search Admin Endpoints (`/api/file-search`)

These endpoints are admin-only operations for initial setup and bulk management.

### POST /api/file-search/initialize

**Auth:** Required
**Description:** One-time initialization of the OpenAI vector store for RAG file search.
**Request:** No body required.
**Response:**

```json
{ "success": true, "store": { "name": "...", "displayName": "..." } }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/file-search/initialize \
  -H "Cookie: connect.sid=<session>"
```

### POST /api/file-search/upload-directory

**Auth:** Required
**Description:** Server-side bulk upload of a directory of reference files. Path must be within the `uploads/` directory (path traversal protection).
**Request:**

```json
{
  "directoryPath": "uploads/product-catalogs",
  "category": "product-catalog",
  "description": "NDS product catalog PDFs"
}
```

**Response:**

```json
{ "success": true, "files": [ ... ], "count": 12 }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/file-search/upload-directory \
  -H "Cookie: connect.sid=<session>" \
  -H "Content-Type: application/json" \
  -d '{"directoryPath":"uploads/product-catalogs","category":"product-catalog","description":"NDS catalogs"}'
```

### POST /api/file-search/seed

**Auth:** Required
**Description:** Seed the file search store with initial structure and categories.
**Request:** No body required.
**Response:**

```json
{ "success": true, ... }
```

**Example:**

```bash
curl -X POST https://automated-ads-agent-production.up.railway.app/api/file-search/seed \
  -H "Cookie: connect.sid=<session>"
```

---

## Training Admin Endpoint (`/api/training`)

### DELETE /api/training/models/:name

**Auth:** Required
**Description:** **Destructive** — permanently deletes a fine-tuned model. Cannot be undone.
**Request:** No body. `:name` is the tuned model name/ID.
**Response:**

```json
{ "success": true }
```

**Example:**

```bash
curl -X DELETE https://automated-ads-agent-production.up.railway.app/api/training/models/tunedModels%2Fmy-model-v1 \
  -H "Cookie: connect.sid=<session>"
```

---

## Monitoring Router (`/api/monitoring`)

These endpoints are authenticated but accessible to any logged-in user. Documented here because they have no dedicated UI.

### GET /api/monitoring/health

**Auth:** Required
**Description:** System health check across all services (DB, Redis, Gemini, etc.).
**Response:** Health object with `overall` status and per-service breakdown.
**Example:**

```bash
curl "https://automated-ads-agent-production.up.railway.app/api/monitoring/health" \
  -H "Cookie: connect.sid=<session>"
```

### GET /api/monitoring/performance

**Auth:** Required
**Description:** Per-endpoint performance metrics (request count, latency, error rate).
**Response:** Array of metric objects.
**Example:**

```bash
curl "https://automated-ads-agent-production.up.railway.app/api/monitoring/performance" \
  -H "Cookie: connect.sid=<session>"
```

### GET /api/monitoring/errors

**Auth:** Required
**Description:** Recent error log with stats. Query param: `limit` (default 50).
**Response:**

```json
{ "errors": [ ... ], "stats": { "total": 42, "last5min": 3 } }
```

**Example:**

```bash
curl "https://automated-ads-agent-production.up.railway.app/api/monitoring/errors?limit=20" \
  -H "Cookie: connect.sid=<session>"
```

### GET /api/monitoring/system

**Auth:** Required
**Description:** Full system health aggregation (health + performance + errors).
**Response:**

```json
{
  "status": "healthy",
  "timestamp": "...",
  "services": { ... },
  "performance": { "totalRequests": 5000, "totalErrors": 12, "avgResponseTime": 45, "topEndpoints": [...] },
  "errors": { "total": 42, "recent": 3 }
}
```

**Example:**

```bash
curl "https://automated-ads-agent-production.up.railway.app/api/monitoring/system" \
  -H "Cookie: connect.sid=<session>"
```

### GET /api/monitoring/endpoints

**Auth:** Required
**Description:** API endpoint health summary with status badges.
**Response:** Array of endpoint objects with `status: "healthy" | "degraded" | "unhealthy"`.
**Example:**

```bash
curl "https://automated-ads-agent-production.up.railway.app/api/monitoring/endpoints" \
  -H "Cookie: connect.sid=<session>"
```
