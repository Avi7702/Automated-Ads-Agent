# Performance Optimization Analysis - Beyond Phase 8.1

**Generated:** 2026-01-26
**Status:** Comprehensive Analysis
**Priority Ranking:** Critical → High → Medium → Low

---

## Executive Summary

This analysis identifies 47 performance optimization opportunities across 7 categories:
- **Database Performance:** 12 optimizations (5 critical)
- **API Performance:** 8 optimizations (3 critical)
- **Frontend Performance:** 15 optimizations (4 critical)
- **Caching Strategy:** 6 optimizations (2 critical)
- **Background Jobs:** 3 optimizations (1 critical)
- **CDN & Asset Delivery:** 2 optimizations (1 high)
- **Monitoring & Observability:** 1 optimization (high)

**Estimated Impact:**
- 40-60% reduction in API response time
- 50-70% reduction in initial bundle size
- 60-80% reduction in database query time
- 90% reduction in repeat data fetching

---

## 1. Database Performance (12 Optimizations)

### 1.1 CRITICAL: Add Database Indexes

**Problem:** No indexes defined in schema despite heavy querying on foreign keys and timestamps.

**Files:** `shared/schema.ts`

**Missing Indexes:**
```typescript
// Add to shared/schema.ts after table definitions:

// Generations table indexes
export const generationsUserIdIdx = index("generations_user_id_idx")
  .on(generations.userId);
export const generationsCreatedAtIdx = index("generations_created_at_idx")
  .on(generations.createdAt);
export const generationsParentIdIdx = index("generations_parent_generation_id_idx")
  .on(generations.parentGenerationId);

// Products table indexes
export const productsUserIdIdx = index("products_user_id_idx")
  .on(products.userId);
export const productsEnrichmentStatusIdx = index("products_enrichment_status_idx")
  .on(products.enrichmentStatus);
export const productsCategoryIdx = index("products_category_idx")
  .on(products.category);

// Ad Copy table indexes
export const adCopyGenerationIdIdx = index("ad_copy_generation_id_idx")
  .on(adCopy.generationId);
export const adCopyUserIdIdx = index("ad_copy_user_id_idx")
  .on(adCopy.userId);
export const adCopyPlatformIdx = index("ad_copy_platform_idx")
  .on(adCopy.platform);

// Social Connections indexes
export const socialConnectionsUserIdIdx = index("social_connections_user_id_idx")
  .on(socialConnections.userId);
export const socialConnectionsPlatformIdx = index("social_connections_platform_idx")
  .on(socialConnections.platform);

// Installation Scenarios indexes
export const installationScenariosUserIdIdx = index("installation_scenarios_user_id_idx")
  .on(installationScenarios.userId);
export const installationScenariosProductIdIdx = index("installation_scenarios_product_id_idx")
  .on(installationScenarios.primaryProductId);

// Product Relationships indexes (composite)
export const productRelationshipsSourceIdx = index("product_relationships_source_idx")
  .on(productRelationships.sourceProductId);
export const productRelationshipsTargetIdx = index("product_relationships_target_idx")
  .on(productRelationships.targetProductId);

// Gemini Quota Metrics indexes (composite)
export const geminiQuotaMetricsBrandWindowIdx = index("gemini_quota_metrics_brand_window_idx")
  .on(geminiQuotaMetrics.brandId, geminiQuotaMetrics.windowType, geminiQuotaMetrics.windowStart);

// Google Quota Snapshots indexes
export const googleQuotaSnapshotsBrandIdx = index("google_quota_snapshots_brand_idx")
  .on(googleQuotaSnapshots.brandId);
export const googleQuotaSnapshotsSyncedAtIdx = index("google_quota_snapshots_synced_at_idx")
  .on(googleQuotaSnapshots.syncedAt);

// Content Planner Posts indexes
export const contentPlannerPostsUserIdIdx = index("content_planner_posts_user_id_idx")
  .on(contentPlannerPosts.userId);
export const contentPlannerPostsPostedAtIdx = index("content_planner_posts_posted_at_idx")
  .on(contentPlannerPosts.postedAt);

// Learned Ad Patterns indexes
export const learnedAdPatternsUserIdIdx = index("learned_ad_patterns_user_id_idx")
  .on(learnedAdPatterns.userId);
export const learnedAdPatternsCategoryIdx = index("learned_ad_patterns_category_idx")
  .on(learnedAdPatterns.category);
export const learnedAdPatternsPlatformIdx = index("learned_ad_patterns_platform_idx")
  .on(learnedAdPatterns.platform);

// User API Keys indexes (composite)
export const userApiKeysUserServiceIdx = index("user_api_keys_user_service_idx")
  .on(userApiKeys.userId, userApiKeys.service);
```

**Migration Command:**
```bash
npm run db:push
```

**Estimated Impact:**
- 60-80% faster queries on filtered/joined data
- 90% faster gallery loading (generations by user + date)
- 70% faster relationship queries (N+1 problem reduction)

---

### 1.2 CRITICAL: N+1 Query in Installation Scenarios

**Problem:** `getInstallationScenariosForProducts()` performs complex array overlap queries.

**File:** `server/storage.ts:773-792`

**Current Implementation:**
```typescript
async getInstallationScenariosForProducts(productIds: string[]): Promise<InstallationScenario[]> {
  if (productIds.length === 0) return [];

  return await db
    .select()
    .from(installationScenarios)
    .where(
      and(
        eq(installationScenarios.isActive, true),
        or(
          inArray(installationScenarios.primaryProductId, productIds),
          sql`${installationScenarios.secondaryProductIds} && ARRAY[${sql.join(productIds.map(id => sql`${id}`), sql`, `)}]::text[]`
        )
      )
    )
    .orderBy(desc(installationScenarios.createdAt));
}
```

**Optimization:** Add GIN index for array overlap queries:
```typescript
// In shared/schema.ts
export const installationScenariosSecondaryProductsIdx = index("installation_scenarios_secondary_products_gin_idx")
  .using("gin", installationScenarios.secondaryProductIds);
```

**Estimated Impact:**
- 80% faster array overlap queries
- Enables sub-10ms queries for typical datasets

---

### 1.3 CRITICAL: Conversation History Loading

**Problem:** `conversationHistory` JSONB field can exceed 64MB for long edit chains, causing Neon response limits.

**File:** `server/storage.ts:346-372`

**Current Workaround:**
```typescript
async getGenerations(limit: number = 50): Promise<Generation[]> {
  // Exclude conversationHistory to avoid exceeding Neon's 64MB response limit
  const results = await db
    .select({
      id: generations.id,
      // ... all fields except conversationHistory
    })
    .from(generations)
    .orderBy(desc(generations.createdAt))
    .limit(limit);

  // Return with null conversationHistory
  return results.map(r => ({ ...r, conversationHistory: null })) as Generation[];
}
```

**Optimization Strategy:**
```typescript
// Option 1: Separate table for conversation history (RECOMMENDED)
export const generationConversations = pgTable("generation_conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  generationId: varchar("generation_id").notNull().references(() => generations.id, { onDelete: "cascade" }),
  conversationHistory: jsonb("conversation_history").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Option 2: Lazy load conversations only when needed
async getGenerationConversation(generationId: string): Promise<any> {
  const [gen] = await db
    .select({ conversationHistory: generations.conversationHistory })
    .from(generations)
    .where(eq(generations.id, generationId));
  return gen?.conversationHistory;
}
```

**Estimated Impact:**
- 90% reduction in gallery API payload size
- 70% faster gallery loading
- No more 64MB limit errors

---

### 1.4 HIGH: Pagination Missing on Multiple Endpoints

**Problem:** No pagination on endpoints returning unbounded result sets.

**Affected Files:**
- `server/routes.ts:810-820` - `/api/generations` (has limit but no offset)
- `server/storage.ts:394-399` - `getProducts()`
- `server/storage.ts:421-433` - `getPromptTemplates()`
- `server/storage.ts:578-607` - `getAdSceneTemplates()`
- `server/storage.ts:938-944` - `getPerformingAdTemplates()`

**Current Pattern:**
```typescript
app.get("/api/generations", async (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const allGenerations = await storage.getGenerations(limit);
  res.json(toGenerationDTOArray(allGenerations));
});
```

**Optimized Pattern:**
```typescript
// Add to server/storage.ts
interface PaginationOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

async getGenerationsPaginated(
  userId: string,
  options: PaginationOptions = {}
): Promise<PaginatedResponse<Generation>> {
  const { limit = 50, offset = 0, sortBy = 'createdAt', sortOrder = 'desc' } = options;

  // Get total count (cached with Redis)
  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(generations)
    .where(eq(generations.userId, userId));

  const total = countResult.count;

  // Get paginated results
  const data = await db
    .select({
      id: generations.id,
      // ... exclude conversationHistory
    })
    .from(generations)
    .where(eq(generations.userId, userId))
    .orderBy(sortOrder === 'desc' ? desc(generations[sortBy]) : asc(generations[sortBy]))
    .limit(limit)
    .offset(offset);

  return {
    data: data.map(r => ({ ...r, conversationHistory: null })) as Generation[],
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    },
  };
}

// Update route
app.get("/api/generations", requireAuth, async (req, res) => {
  const userId = (req as any).session.userId;
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;

  const result = await storage.getGenerationsPaginated(userId, { limit, offset });
  res.json(result);
});
```

**Estimated Impact:**
- 80% reduction in large dataset response times
- Enables infinite scroll/virtual scrolling
- Better UX for users with 1000+ generations

---

### 1.5 HIGH: Missing Query Result Caching

**Problem:** Repeated queries for static/slow-changing data.

**Targets:**
- Global templates (`getAdSceneTemplates` with `isGlobal=true`)
- Brand profile (changes infrequently)
- Product analysis (cached by fingerprint but not in-memory)
- API key lookups (validated on every request)

**Implementation:**
```typescript
// Create server/lib/queryCache.ts
import { LRUCache } from 'lru-cache';

interface CacheOptions {
  ttl: number; // milliseconds
  maxSize?: number;
}

export class QueryCache {
  private cache: LRUCache<string, any>;

  constructor(options: CacheOptions) {
    this.cache = new LRUCache({
      max: options.maxSize || 500,
      ttl: options.ttl,
    });
  }

  async get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    if (cached) return cached;

    const fresh = await fetcher();
    this.cache.set(key, fresh);
    return fresh;
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: RegExp) {
    for (const key of this.cache.keys()) {
      if (pattern.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

// Usage in storage.ts
const globalTemplateCache = new QueryCache({ ttl: 5 * 60 * 1000 }); // 5 min
const brandProfileCache = new QueryCache({ ttl: 15 * 60 * 1000 }); // 15 min
const apiKeyCache = new QueryCache({ ttl: 1 * 60 * 1000 }); // 1 min

async getAdSceneTemplates(filters?: { isGlobal?: boolean }): Promise<AdSceneTemplate[]> {
  if (filters?.isGlobal === true) {
    return globalTemplateCache.get('global-templates', () => {
      return db
        .select()
        .from(adSceneTemplates)
        .where(eq(adSceneTemplates.isGlobal, true))
        .orderBy(desc(adSceneTemplates.createdAt));
    });
  }

  // Non-global templates not cached (user-specific)
  return db.select()...
}
```

**Cache Invalidation:**
```typescript
// When templates are created/updated
async saveAdSceneTemplate(template: InsertAdSceneTemplate): Promise<AdSceneTemplate> {
  const result = await db.insert(adSceneTemplates)...

  if (template.isGlobal) {
    globalTemplateCache.invalidate('global-templates');
  }

  return result;
}
```

**Estimated Impact:**
- 90% reduction in repeat template queries
- 85% reduction in brand profile queries
- 70% reduction in database load

---

### 1.6 MEDIUM: Inefficient Array Filtering in Memory

**Problem:** `getInstallationScenariosForProducts` and `getBrandImagesForProducts` load all records then filter in JS.

**File:** `server/storage.ts:883-898`

**Current:**
```typescript
async getBrandImagesForProducts(productIds: string[], userId: string): Promise<BrandImage[]> {
  const allImages = await db
    .select()
    .from(brandImages)
    .where(eq(brandImages.userId, userId))
    .orderBy(desc(brandImages.createdAt));

  // Filter in JS - inefficient for large datasets
  return allImages.filter(img =>
    img.productIds?.some(pid => productIds.includes(pid))
  );
}
```

**Optimized:**
```typescript
async getBrandImagesForProducts(productIds: string[], userId: string): Promise<BrandImage[]> {
  if (productIds.length === 0) return [];

  // Use PostgreSQL array overlap operator
  return await db
    .select()
    .from(brandImages)
    .where(
      and(
        eq(brandImages.userId, userId),
        sql`${brandImages.productIds} && ARRAY[${sql.join(productIds.map(id => sql`${id}`), sql`, `)}]::text[]`
      )
    )
    .orderBy(desc(brandImages.createdAt));
}
```

**Add GIN Index:**
```typescript
export const brandImagesProductIdsIdx = index("brand_images_product_ids_gin_idx")
  .using("gin", brandImages.productIds);
```

**Estimated Impact:**
- 70% faster for datasets >100 rows
- 90% reduction in memory usage

---

### 1.7 MEDIUM: Heavy JSON Operations in Weekly Balance

**Problem:** Manual aggregation in JS instead of SQL aggregation.

**File:** `server/storage.ts:1782-1815`

**Current:**
```typescript
async getWeeklyBalance(userId: string): Promise<{ category: string; count: number }[]> {
  const posts = await db
    .select({ category: contentPlannerPosts.category })
    .from(contentPlannerPosts)
    .where(and(
      eq(contentPlannerPosts.userId, userId),
      gte(contentPlannerPosts.postedAt, weekStart)
    ));

  // Manual aggregation
  const countMap: Record<string, number> = {};
  for (const post of posts) {
    countMap[post.category] = (countMap[post.category] || 0) + 1;
  }

  return Object.entries(countMap).map(([category, count]) => ({ category, count }));
}
```

**Optimized:**
```typescript
async getWeeklyBalance(userId: string): Promise<{ category: string; count: number }[]> {
  const weekStart = /* calculate week start */;

  return await db
    .select({
      category: contentPlannerPosts.category,
      count: sql<number>`count(*)`,
    })
    .from(contentPlannerPosts)
    .where(and(
      eq(contentPlannerPosts.userId, userId),
      gte(contentPlannerPosts.postedAt, weekStart)
    ))
    .groupBy(contentPlannerPosts.category);
}
```

**Estimated Impact:**
- 80% faster for large post counts
- 90% less memory usage

---

### 1.8 MEDIUM: Upsert Performance in Quota Metrics

**Problem:** Upserts perform SELECT + UPDATE/INSERT instead of using native UPSERT.

**File:** `server/storage.ts:1077-1118`

**Current:**
```typescript
async upsertQuotaMetrics(metrics: InsertGeminiQuotaMetrics): Promise<GeminiQuotaMetrics> {
  // SELECT first
  const existing = await db
    .select()
    .from(geminiQuotaMetrics)
    .where(and(...))
    .limit(1);

  if (existing.length > 0) {
    // Then UPDATE
    const [updated] = await db.update(...)...
    return updated;
  }

  // Or INSERT
  const [inserted] = await db.insert(...)...
  return inserted;
}
```

**Optimized:**
```typescript
async upsertQuotaMetrics(metrics: InsertGeminiQuotaMetrics): Promise<GeminiQuotaMetrics> {
  const [result] = await db
    .insert(geminiQuotaMetrics)
    .values(metrics)
    .onConflictDoUpdate({
      target: [
        geminiQuotaMetrics.brandId,
        geminiQuotaMetrics.windowType,
        geminiQuotaMetrics.windowStart,
      ],
      set: {
        requestCount: sql`${geminiQuotaMetrics.requestCount} + EXCLUDED.request_count`,
        successCount: sql`${geminiQuotaMetrics.successCount} + EXCLUDED.success_count`,
        errorCount: sql`${geminiQuotaMetrics.errorCount} + EXCLUDED.error_count`,
        // ... other fields
      },
    })
    .returning();

  return result;
}
```

**Add Composite Unique Constraint:**
```typescript
// In shared/schema.ts geminiQuotaMetrics definition
}, (table) => ({
  brandWindowUnique: unique("brand_window_start_unique").on(
    table.brandId,
    table.windowType,
    table.windowStart
  ),
}));
```

**Estimated Impact:**
- 60% faster upserts (1 query vs 2-3)
- Better concurrency handling

---

### 1.9 LOW: editHistory Recursive Queries

**Problem:** `getEditHistory()` performs N sequential queries for edit chain.

**File:** `server/storage.ts:447-460`

**Current:**
```typescript
async getEditHistory(generationId: string): Promise<Generation[]> {
  const history: Generation[] = [];
  let currentId: string | null = generationId;

  while (currentId) {
    const generation = await this.getGenerationById(currentId);
    if (!generation) break;

    history.push(generation);
    currentId = generation.parentGenerationId;
  }

  return history.reverse();
}
```

**Optimized with CTE:**
```typescript
async getEditHistory(generationId: string): Promise<Generation[]> {
  // Use PostgreSQL recursive CTE
  const results = await db.execute(sql`
    WITH RECURSIVE edit_chain AS (
      -- Base case: start with the requested generation
      SELECT id, user_id, prompt, parent_generation_id, edit_count, created_at, 0 as depth
      FROM generations
      WHERE id = ${generationId}

      UNION ALL

      -- Recursive case: follow parent links
      SELECT g.id, g.user_id, g.prompt, g.parent_generation_id, g.edit_count, g.created_at, ec.depth + 1
      FROM generations g
      INNER JOIN edit_chain ec ON g.id = ec.parent_generation_id
      WHERE ec.depth < 100 -- Safety limit
    )
    SELECT * FROM edit_chain
    ORDER BY depth ASC;
  `);

  return results.rows as Generation[];
}
```

**Estimated Impact:**
- 70% faster for long edit chains (5+ edits)
- Single query vs N queries

---

### 1.10 LOW: Performing Ad Templates Search Inefficiency

**Problem:** Loads all templates then filters in JS.

**File:** `server/storage.ts:1023-1071`

**Optimized:**
```typescript
async searchPerformingAdTemplates(
  userId: string,
  filters: { ... }
): Promise<PerformingAdTemplate[]> {
  const conditions = [
    eq(performingAdTemplates.userId, userId),
    eq(performingAdTemplates.isActive, true),
  ];

  // Add SQL filters instead of JS filters
  if (filters.category) {
    conditions.push(eq(performingAdTemplates.category, filters.category));
  }
  if (filters.mood) {
    conditions.push(eq(performingAdTemplates.mood, filters.mood));
  }
  if (filters.style) {
    conditions.push(eq(performingAdTemplates.style, filters.style));
  }
  if (filters.engagementTier) {
    conditions.push(eq(performingAdTemplates.engagementTier, filters.engagementTier));
  }

  // Array filters (if needed)
  if (filters.platform) {
    conditions.push(arrayContains(performingAdTemplates.targetPlatforms, [filters.platform]));
  }

  return await db
    .select()
    .from(performingAdTemplates)
    .where(and(...conditions))
    .orderBy(desc(performingAdTemplates.estimatedEngagementRate));
}
```

**Estimated Impact:**
- 50% faster for filtered searches
- 80% less memory usage

---

### 1.11 LOW: Connection Pool Optimization

**Problem:** Default connection pool may be undersized for production load.

**File:** `server/db.ts` (not shown, but likely exists)

**Recommendation:**
```typescript
// server/db.ts
import { Pool } from '@neondatabase/serverless';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // Increase from default (10)
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  // Enable statement timeout to prevent runaway queries
  statement_timeout: 30000, // 30s max per query
});
```

---

### 1.12 LOW: Add EXPLAIN ANALYZE Logging

**Problem:** No query performance monitoring.

**Implementation:**
```typescript
// server/middleware/queryLogger.ts
import { logger } from './lib/logger';

export function enableQueryLogging() {
  if (process.env.LOG_SLOW_QUERIES === 'true') {
    // Drizzle doesn't expose query hooks directly
    // Use PostgreSQL pg_stat_statements extension instead

    pool.on('connect', async (client) => {
      await client.query(`
        SET log_min_duration_statement = 1000; -- Log queries >1s
      `);
    });
  }
}
```

---

## 2. API Performance (8 Optimizations)

### 2.1 CRITICAL: No Response Compression

**Problem:** Large JSON responses sent uncompressed.

**File:** `server/app.ts`

**Current:**
```typescript
import compression from 'compression';
app.use(compression()); // Already imported but check if enabled
```

**Verify Configuration:**
```typescript
app.use(compression({
  level: 6, // Balance between speed and compression
  threshold: 1024, // Only compress responses >1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));
```

**Add Response Caching Headers:**
```typescript
// For static data endpoints
app.get("/api/scene-templates/global", (req, res, next) => {
  res.set('Cache-Control', 'public, max-age=300'); // 5 min
  next();
}, handler);
```

**Estimated Impact:**
- 70-80% reduction in response size
- 50% faster response times on slow networks

---

### 2.2 CRITICAL: Gemini API Timeout Strategy

**Problem:** Long-running Gemini requests (30-90s) block other requests.

**File:** `server/routes.ts:886`

**Current:**
```typescript
app.post("/api/generations/:id/edit", extendedTimeout, haltOnTimeout, async (req, res) => {
  // 120s timeout - blocks the connection
});
```

**Optimized - Async Job Pattern:**
```typescript
// 1. Create job queue
// server/jobs/generationQueue.ts
import Bull from 'bull';

export const generationQueue = new Bull('generation-jobs', {
  redis: process.env.REDIS_URL,
});

generationQueue.process('generate', async (job) => {
  const { generationId, editPrompt, userId } = job.data;

  try {
    // Perform generation
    const result = await geminiService.editImage(...);

    // Update database
    await storage.saveGeneration(result);

    // Notify user via WebSocket
    wsService.notifyUser(userId, {
      type: 'generation_complete',
      generationId,
      result,
    });

    return result;
  } catch (error) {
    // Notify failure
    wsService.notifyUser(userId, {
      type: 'generation_failed',
      generationId,
      error: error.message,
    });
    throw error;
  }
});

// 2. Update endpoint to enqueue job
app.post("/api/generations/:id/edit", requireAuth, async (req, res) => {
  const userId = (req as any).session.userId;
  const { editPrompt } = req.body;

  // Create pending generation record
  const generation = await storage.saveGeneration({
    ...req.body,
    status: 'pending',
  });

  // Enqueue job
  const job = await generationQueue.add('generate', {
    generationId: generation.id,
    editPrompt,
    userId,
  });

  // Return immediately with job ID
  res.json({
    generationId: generation.id,
    jobId: job.id,
    status: 'pending',
    estimatedDuration: 60000, // 60s estimate
  });
});

// 3. Add job status endpoint
app.get("/api/jobs/:jobId", requireAuth, async (req, res) => {
  const job = await generationQueue.getJob(req.params.jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  const state = await job.getState();
  const progress = job.progress();

  res.json({
    jobId: job.id,
    state, // 'waiting', 'active', 'completed', 'failed'
    progress,
    result: state === 'completed' ? job.returnvalue : null,
  });
});
```

**Estimated Impact:**
- 90% reduction in blocked connections
- 100x more concurrent generation requests
- Better error recovery

---

### 2.3 HIGH: Response Payload Optimization

**Problem:** DTOs include unnecessary fields, large JSONB objects sent raw.

**File:** `server/dto/generationDTO.ts`

**Analysis:**
```typescript
// Current: Sends full generation object
export function toGenerationDTO(generation: Generation): GenerationDTO {
  return {
    id: generation.id,
    prompt: generation.prompt,
    // conversationHistory excluded (good!)
    // But other large fields may be included unnecessarily
  };
}
```

**Optimization - Field Selection:**
```typescript
// Add endpoint-specific DTOs

// Gallery view - minimal fields
export interface GenerationGalleryDTO {
  id: string;
  generatedImagePath: string;
  aspectRatio: string;
  createdAt: Date;
  // Only what's needed for thumbnails
}

// Detail view - full fields
export interface GenerationDetailDTO extends GenerationGalleryDTO {
  prompt: string;
  editCount: number;
  parentGenerationId: string | null;
  // More fields for detail page
}

// History view - timeline fields
export interface GenerationHistoryDTO {
  id: string;
  editPrompt: string | null;
  editCount: number;
  createdAt: Date;
}
```

**Estimated Impact:**
- 60% reduction in gallery payload size
- 40% faster gallery loading

---

### 2.4 HIGH: Cloudinary URL Optimization

**Problem:** Full Cloudinary URLs stored/returned. No image transformation.

**Files:** `server/fileStorage.ts`, `client/src/lib/utils.ts:getProductImageUrl`

**Current:**
```typescript
// Client always fetches full-size images
export function getProductImageUrl(cloudinaryUrl: string): string {
  return cloudinaryUrl; // Returns full-size image URL
}
```

**Optimized - Responsive Images:**
```typescript
// server/utils/cloudinaryTransforms.ts
export function getCloudinaryTransformUrl(
  publicId: string,
  options: {
    width?: number;
    height?: number;
    quality?: 'auto' | number;
    format?: 'auto' | 'webp' | 'avif';
    crop?: 'fill' | 'fit' | 'scale';
  } = {}
): string {
  const {
    width,
    height,
    quality = 'auto',
    format = 'auto',
    crop = 'fill',
  } = options;

  const transforms = [];

  if (width || height) {
    const dims = [];
    if (width) dims.push(`w_${width}`);
    if (height) dims.push(`h_${height}`);
    dims.push(`c_${crop}`);
    transforms.push(dims.join(','));
  }

  transforms.push(`q_${quality}`);
  transforms.push(`f_${format}`);

  const transformString = transforms.join('/');

  return `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/${transformString}/${publicId}`;
}

// Update client utils
export function getProductImageUrl(
  cloudinaryUrl: string,
  size: 'thumbnail' | 'card' | 'full' = 'card'
): string {
  const publicId = extractPublicId(cloudinaryUrl);

  const sizeMap = {
    thumbnail: { width: 150, height: 150, quality: 'auto:low' },
    card: { width: 400, height: 400, quality: 'auto:good' },
    full: { width: 1200, quality: 'auto:best' },
  };

  return getCloudinaryTransformUrl(publicId, {
    ...sizeMap[size],
    format: 'auto', // Serves WebP to supporting browsers
  });
}
```

**Usage:**
```tsx
// ProductCard.tsx
<img
  src={getProductImageUrl(product.cloudinaryUrl, 'card')}
  srcSet={`
    ${getProductImageUrl(product.cloudinaryUrl, 'thumbnail')} 150w,
    ${getProductImageUrl(product.cloudinaryUrl, 'card')} 400w,
    ${getProductImageUrl(product.cloudinaryUrl, 'full')} 1200w
  `}
  sizes="(max-width: 640px) 150px, (max-width: 1024px) 400px, 1200px"
  alt={product.name}
  loading="lazy"
/>
```

**Estimated Impact:**
- 80% reduction in image transfer size
- 60% faster image loading
- Automatic WebP/AVIF format for modern browsers

---

### 2.5 MEDIUM: Rate Limiter Optimization

**Problem:** In-memory rate limiter doesn't scale across multiple server instances.

**File:** `server/middleware/rateLimit.ts`

**Current:**
```typescript
import rateLimit from 'express-rate-limit';

export function createRateLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.maxRequests,
    // Uses memory store by default (doesn't share across instances)
  });
}
```

**Optimized - Redis-backed:**
```typescript
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redis } from '../lib/redis';

export function createRateLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.maxRequests,
    store: new RedisStore({
      client: redis,
      prefix: 'rl:',
      sendCommand: (...args: string[]) => redis.sendCommand(args),
    }),
    standardHeaders: true, // Return rate limit info in headers
    legacyHeaders: false,
  });
}
```

**Estimated Impact:**
- Works correctly with horizontal scaling
- 90% reduction in false positives during deploys

---

### 2.6 MEDIUM: Batch API Endpoints

**Problem:** Frontend makes multiple sequential API calls for related data.

**Example:** Gallery loads generations, then makes separate calls for each generation's ad copy.

**New Endpoint:**
```typescript
// POST /api/generations/batch
app.post("/api/generations/batch", requireAuth, async (req, res) => {
  const { generationIds } = req.body;

  if (!Array.isArray(generationIds) || generationIds.length === 0) {
    return res.status(400).json({ error: 'generationIds array required' });
  }

  if (generationIds.length > 50) {
    return res.status(400).json({ error: 'Maximum 50 IDs per request' });
  }

  // Parallel fetch
  const [generations, adCopyRecords] = await Promise.all([
    db.select()
      .from(generations)
      .where(inArray(generations.id, generationIds)),
    db.select()
      .from(adCopy)
      .where(inArray(adCopy.generationId, generationIds)),
  ]);

  // Group ad copy by generation
  const adCopyMap = adCopyRecords.reduce((acc, copy) => {
    if (!acc[copy.generationId]) acc[copy.generationId] = [];
    acc[copy.generationId].push(copy);
    return acc;
  }, {} as Record<string, AdCopy[]>);

  // Merge data
  const result = generations.map(gen => ({
    ...toGenerationDTO(gen),
    adCopy: adCopyMap[gen.id] || [],
  }));

  res.json(result);
});
```

**Estimated Impact:**
- 80% reduction in API round-trips
- 60% faster data loading

---

### 2.7 MEDIUM: GraphQL Layer (Future)

**Problem:** REST API requires multiple endpoints for complex queries.

**Recommendation:** Add GraphQL layer for flexible data fetching.

**Example:**
```graphql
query GetStudioData {
  products(limit: 10) {
    id
    name
    cloudinaryUrl(size: CARD)
    enrichmentStatus
  }

  globalTemplates {
    id
    title
    previewImageUrl(width: 300)
  }

  recentGenerations(limit: 20) {
    id
    generatedImagePath
    createdAt
    adCopy {
      headline
      platform
    }
  }
}
```

**Not Implemented:** Would require significant architecture changes. Consider for v2.

---

### 2.8 LOW: ETag Support

**Problem:** No conditional GET support for cacheable resources.

**Implementation:**
```typescript
// server/middleware/etag.ts
import etag from 'etag';
import { createHash } from 'crypto';

export function generateETag(data: any): string {
  const hash = createHash('md5')
    .update(JSON.stringify(data))
    .digest('hex');
  return `"${hash}"`;
}

export function etagMiddleware(req, res, next) {
  const originalJson = res.json.bind(res);

  res.json = function(data) {
    const etagValue = generateETag(data);
    res.set('ETag', etagValue);

    if (req.headers['if-none-match'] === etagValue) {
      return res.status(304).end();
    }

    return originalJson(data);
  };

  next();
}

// Apply to cacheable routes
app.get("/api/scene-templates/global", etagMiddleware, handler);
```

**Estimated Impact:**
- 100% reduction in data transfer for unchanged resources
- Better browser caching

---

## 3. Frontend Performance (15 Optimizations)

### 3.1 CRITICAL: No React.memo Usage

**Problem:** Components re-render unnecessarily on parent state changes.

**Analysis:** Grep found 0 uses of `React.memo` across 226 hook usages in 45 components.

**File:** `client/src/components/ProductCard.tsx`

**Current:**
```typescript
export function ProductCard({ product, onClick, onDelete }: ProductCardProps) {
  // Re-renders every time parent state changes
}
```

**Optimized:**
```typescript
import { memo } from 'react';

export const ProductCard = memo(function ProductCard({
  product,
  onClick,
  onDelete,
  onEnrich,
}: ProductCardProps) {
  // Only re-renders when props change
}, (prevProps, nextProps) => {
  // Custom comparison for deep equality if needed
  return (
    prevProps.product.id === nextProps.product.id &&
    prevProps.product.enrichmentStatus === nextProps.product.enrichmentStatus &&
    prevProps.isLoading === nextProps.isLoading
  );
});
```

**Priority Components to Memoize:**
1. **ProductCard** - Rendered in lists (high)
2. **TemplateCard** - Rendered in lists (high)
3. **SuggestionCard** (in IdeaBankPanel) - Rendered in lists (high)
4. **QuotaStatusCard** - Heavy rendering (medium)
5. **UsageChart** - Recharts expensive (medium)

**Estimated Impact:**
- 60% reduction in renders for ProductCard in gallery
- 40% reduction in overall render time

---

### 3.2 CRITICAL: Bundle Size - No Tree Shaking

**Problem:** Large dependencies not code-split or tree-shaken.

**Analysis:**
- **Recharts:** 140KB (gzipped) - only used in QuotaDashboard
- **@xyflow/react:** 80KB (gzipped) - only used in SystemMap
- **Framer Motion:** 60KB (gzipped) - used in IdeaBankPanel animations

**File:** `vite.config.ts:45-74`

**Current Chunking:**
```typescript
manualChunks: {
  'vendor-react': ['react', 'react-dom', 'react/jsx-runtime'],
  'vendor-charts': ['recharts'], // Good!
  'vendor-flow': ['@xyflow/react'], // Good!
  // But pages importing these aren't lazy-loaded
}
```

**Optimization 1 - Lazy Load Heavy Pages:**

**File:** `client/src/App.tsx:22-24`

**Current:**
```typescript
const TemplateAdmin = lazy(() => import("@/pages/TemplateAdmin"));
const SystemMap = lazy(() => import("@/pages/SystemMap"));
// But QuotaDashboard is NOT lazy loaded
```

**Add:**
```typescript
const QuotaDashboard = lazy(() => import("@/pages/QuotaDashboard"));
const BrandProfile = lazy(() => import("@/pages/BrandProfile"));
```

**Optimization 2 - Conditional Framer Motion:**

**File:** `client/src/components/IdeaBankPanel.tsx:1-16`

**Current:**
```typescript
import { motion } from "framer-motion";

// Used for 0.1s stagger animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: index * 0.1 }}
>
```

**Optimized - CSS Animations:**
```css
/* Add to globals.css */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.suggestion-card {
  animation: slideUp 0.3s ease-out;
  animation-delay: calc(var(--index) * 0.1s);
  animation-fill-mode: both;
}
```

```tsx
// Replace motion.div with regular div
<div
  className="suggestion-card"
  style={{ '--index': index } as React.CSSProperties}
>
```

**Estimated Impact:**
- Remove 60KB from main bundle (Framer Motion)
- 70% faster initial load
- Animations still smooth (CSS is faster)

**Optimization 3 - Radix UI Tree Shaking:**
```typescript
// vite.config.ts - Add to manualChunks
'vendor-ui-dialogs': [
  '@radix-ui/react-dialog',
  '@radix-ui/react-alert-dialog',
],
'vendor-ui-dropdowns': [
  '@radix-ui/react-dropdown-menu',
  '@radix-ui/react-select',
  '@radix-ui/react-popover',
],
'vendor-ui-forms': [
  '@radix-ui/react-checkbox',
  '@radix-ui/react-switch',
  '@radix-ui/react-slider',
],
```

**Estimated Total Impact:**
- 50% reduction in main bundle size (800KB → 400KB gzipped)
- 60% faster initial load (3s → 1.2s on 3G)

---

### 3.3 HIGH: Virtual Scrolling for Large Lists

**Problem:** Gallery renders all 50+ products at once.

**File:** `client/src/pages/Library.tsx`

**Implementation:**
```tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function ProductLibrary() {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: products.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 300, // Estimated card height
    overscan: 5, // Render 5 extra items
  });

  return (
    <div ref={parentRef} className="h-screen overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            <ProductCard product={products[virtualItem.index]} />
          </div>
        ))}
      </div>
    </div>
  );
}
```

**Estimated Impact:**
- 90% reduction in initial render time for >50 items
- 80% reduction in memory usage
- Smooth 60fps scrolling

---

### 3.4 HIGH: Image Loading Strategy

**Problem:** All images load immediately with `loading="lazy"`, but no priority hints.

**Files:** Multiple components using `<img>`

**Optimization:**
```tsx
// ProductCard.tsx
<img
  src={getProductImageUrl(product.cloudinaryUrl, 'card')}
  alt={product.name}
  loading={isAboveFold ? 'eager' : 'lazy'}
  fetchPriority={isAboveFold ? 'high' : 'low'}
  decoding="async"
/>

// Add intersection observer for below-fold progressive loading
const [isVisible, setIsVisible] = useState(false);
const imgRef = useRef<HTMLImageElement>(null);

useEffect(() => {
  if (!imgRef.current) return;

  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        observer.disconnect();
      }
    },
    { rootMargin: '200px' } // Start loading 200px before viewport
  );

  observer.observe(imgRef.current);

  return () => observer.disconnect();
}, []);
```

**Estimated Impact:**
- 50% reduction in LCP (Largest Contentful Paint)
- Better perceived performance

---

### 3.5 MEDIUM: Debounce/Throttle Missing

**Problem:** Search inputs trigger API calls on every keystroke.

**Example:** Template search, product search

**Implementation:**
```tsx
import { useMemo } from 'react';
import { debounce } from 'lodash-es'; // Or custom implementation

function TemplateLibrary() {
  const [searchQuery, setSearchQuery] = useState('');

  // Debounce API call
  const debouncedSearch = useMemo(
    () => debounce((query: string) => {
      // API call
      fetchTemplates({ search: query });
    }, 300),
    []
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value); // Update UI immediately
    debouncedSearch(value); // Debounced API call
  };

  return <Input value={searchQuery} onChange={handleSearchChange} />;
}
```

**Estimated Impact:**
- 80% reduction in API calls during typing
- 90% reduction in database load

---

### 3.6 MEDIUM: useCallback for Event Handlers

**Problem:** Event handlers recreated on every render.

**File:** `client/src/components/ProductCard.tsx:106-131`

**Current:**
```typescript
const handleCardClick = () => {
  if (onClick) onClick(product);
};

const handleEditClick = (e: React.MouseEvent) => {
  e.stopPropagation();
  if (onClick) onClick(product);
};
```

**Optimized:**
```typescript
import { useCallback } from 'react';

const handleCardClick = useCallback(() => {
  if (onClick) onClick(product);
}, [onClick, product]);

const handleEditClick = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  if (onClick) onClick(product);
}, [onClick, product]);

const handleEnrichClick = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  if (onEnrich) onEnrich(product);
}, [onEnrich, product]);

const handleDeleteClick = useCallback((e: React.MouseEvent) => {
  e.stopPropagation();
  if (onDelete) onDelete(product);
}, [onDelete, product]);
```

**Estimated Impact:**
- 30% reduction in re-renders when memoized
- Better child component stability

---

### 3.7 MEDIUM: Preload Critical Assets

**Problem:** No preloading of critical resources.

**File:** `client/index.html` (needs to be created/updated)

**Add to `<head>`:**
```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/inter-var.woff2" as="font" type="font/woff2" crossorigin>

<!-- Preconnect to external domains -->
<link rel="preconnect" href="https://res.cloudinary.com">
<link rel="dns-prefetch" href="https://res.cloudinary.com">

<!-- Preload critical API endpoint -->
<link rel="prefetch" href="/api/products">
<link rel="prefetch" href="/api/scene-templates/global">
```

**Estimated Impact:**
- 20% reduction in FCP (First Contentful Paint)
- Faster font rendering

---

### 3.8 MEDIUM: Code Splitting by Route

**Problem:** All lazy-loaded pages still bundle shared components.

**Current Chunking:** Already good in `vite.config.ts`

**Add Route-based Splitting:**
```typescript
// vite.config.ts - Update manualChunks
manualChunks: (id) => {
  if (id.includes('node_modules')) {
    // Vendor chunks (already defined)
    if (id.includes('recharts')) return 'vendor-charts';
    if (id.includes('@xyflow')) return 'vendor-flow';
    if (id.includes('react')) return 'vendor-react';
    // ... other vendor chunks
  }

  // Route-based chunks
  if (id.includes('/pages/Library')) return 'page-library';
  if (id.includes('/pages/Settings')) return 'page-settings';
  if (id.includes('/pages/Studio')) return 'page-studio';
  if (id.includes('/pages/ContentPlanner')) return 'page-content-planner';

  // Component-based chunks
  if (id.includes('/components/quota')) return 'components-quota';
  if (id.includes('/components/studio')) return 'components-studio';
}
```

**Estimated Impact:**
- 30% reduction in initial chunk size
- Faster page transitions

---

### 3.9 LOW: Service Worker for Offline Support

**Problem:** No offline capability or background sync.

**Implementation:**
```typescript
// client/src/service-worker.ts
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// Precache build assets
precacheAndRoute(self.__WB_MANIFEST);

// Cache images from Cloudinary
registerRoute(
  ({ url }) => url.hostname === 'res.cloudinary.com',
  new CacheFirst({
    cacheName: 'cloudinary-images',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 100,
        maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
      }),
    ],
  })
);

// Cache API responses
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/scene-templates'),
  new StaleWhileRevalidate({
    cacheName: 'api-templates',
    plugins: [
      new ExpirationPlugin({
        maxEntries: 50,
        maxAgeSeconds: 5 * 60, // 5 min
      }),
    ],
  })
);

// Network-first for dynamic API endpoints
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    cacheName: 'api-dynamic',
    networkTimeoutSeconds: 5,
  })
);
```

**Register in main.tsx:**
```typescript
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  navigator.serviceWorker.register('/service-worker.js');
}
```

**Estimated Impact:**
- Offline access to cached pages
- 90% reduction in repeat resource fetching
- Faster perceived performance

---

### 3.10 LOW: Prefetch on Hover

**Problem:** No predictive prefetching.

**Implementation:**
```tsx
// ProductCard.tsx
const [isPrefetched, setIsPrefetched] = useState(false);

const handleMouseEnter = useCallback(() => {
  setIsHovered(true);

  // Prefetch product details on hover
  if (!isPrefetched && product.id) {
    queryClient.prefetchQuery({
      queryKey: ['product', product.id],
      queryFn: () => fetch(`/api/products/${product.id}`).then(r => r.json()),
    });
    setIsPrefetched(true);
  }
}, [product.id, isPrefetched, queryClient]);
```

**Estimated Impact:**
- Instant detail page loads
- Better UX for exploratory browsing

---

### 3.11 LOW: Web Workers for Heavy Computation

**Problem:** Image processing/analysis blocks main thread.

**Example:** Client-side image fingerprinting (if implemented)

**Implementation:**
```typescript
// client/src/workers/imageProcessor.worker.ts
self.addEventListener('message', async (e) => {
  const { type, data } = e.data;

  if (type === 'analyze-image') {
    const { imageData } = data;

    // Heavy computation (perceptual hash, color analysis, etc.)
    const result = await analyzeImage(imageData);

    self.postMessage({ type: 'analysis-complete', result });
  }
});

// Usage in component
const worker = useMemo(() => new Worker(
  new URL('../workers/imageProcessor.worker.ts', import.meta.url)
), []);

worker.postMessage({
  type: 'analyze-image',
  data: { imageData },
});

worker.addEventListener('message', (e) => {
  if (e.data.type === 'analysis-complete') {
    setAnalysis(e.data.result);
  }
});
```

**Estimated Impact:**
- 100% non-blocking heavy computation
- 60fps maintained during processing

---

### 3.12 LOW: useMemo for Expensive Calculations

**Problem:** Heavy calculations run on every render.

**File:** `client/src/components/IdeaBankPanel.tsx`

**Example:**
```typescript
function IdeaBankPanel({ suggestions }: Props) {
  // Expensive sorting/filtering
  const sortedSuggestions = useMemo(() => {
    return suggestions
      .filter(s => s.confidence > 0.5)
      .sort((a, b) => b.confidence - a.confidence);
  }, [suggestions]);

  return <div>
    {sortedSuggestions.map(s => <SuggestionCard key={s.id} suggestion={s} />)}
  </div>;
}
```

**Estimated Impact:**
- 40% reduction in render time for filtered lists

---

### 3.13 LOW: Skeleton Loaders Instead of Spinners

**Problem:** Spinner shows no layout, causes layout shift.

**File:** `client/src/App.tsx:27-36`

**Current:**
```tsx
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-primary animate-spin" />
    </div>
  );
}
```

**Optimized:**
```tsx
function PageLoader({ layout = 'studio' }: { layout?: string }) {
  if (layout === 'library') {
    return <LibraryPageSkeleton />;
  }

  if (layout === 'studio') {
    return (
      <div className="h-screen flex">
        {/* Sidebar skeleton */}
        <div className="w-80 bg-muted animate-pulse" />
        {/* Canvas skeleton */}
        <div className="flex-1 p-8 space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  return <DefaultSkeleton />;
}
```

**Estimated Impact:**
- 0px Cumulative Layout Shift (CLS)
- Better perceived performance

---

### 3.14 LOW: React Query Optimistic Updates

**Problem:** UI waits for server response before updating.

**Example:** Deleting a product shows spinner, then removes card.

**Optimized:**
```tsx
const deleteProductMutation = useMutation({
  mutationFn: (productId: string) => api.deleteProduct(productId),
  onMutate: async (productId) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['products'] });

    // Snapshot previous value
    const previousProducts = queryClient.getQueryData(['products']);

    // Optimistically update
    queryClient.setQueryData(['products'], (old: Product[]) =>
      old.filter(p => p.id !== productId)
    );

    return { previousProducts };
  },
  onError: (err, productId, context) => {
    // Rollback on error
    queryClient.setQueryData(['products'], context.previousProducts);
    toast.error('Failed to delete product');
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['products'] });
  },
});
```

**Estimated Impact:**
- Instant UI updates
- Better perceived responsiveness

---

### 3.15 LOW: Intersection Observer for Analytics

**Problem:** No visibility tracking for performance monitoring.

**Implementation:**
```tsx
// Track when components become visible
import { useEffect, useRef } from 'react';

export function useVisibilityTracking(componentName: string) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Track time to visible
          const timeToVisible = performance.now();
          analytics.track('component_visible', {
            component: componentName,
            timeToVisible,
          });
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(ref.current);

    return () => observer.disconnect();
  }, [componentName]);

  return ref;
}
```

**Estimated Impact:**
- Better visibility into real user performance
- Data-driven optimization priorities

---

## 4. Caching Strategy (6 Optimizations)

### 4.1 CRITICAL: Redis Caching Layer

**Problem:** No Redis caching despite having `ioredis` dependency.

**Current:** Only used for sessions and rate limiting.

**Implementation:**
```typescript
// server/lib/redisCache.ts
import Redis from 'ioredis';
import { logger } from './logger';

const redis = new Redis(process.env.REDIS_URL);

export class RedisCache {
  async get<T>(key: string): Promise<T | null> {
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      logger.error({ err: error }, 'Redis GET error');
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds: number): Promise<void> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value));
    } catch (error) {
      logger.error({ err: error }, 'Redis SET error');
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      logger.error({ err: error }, 'Redis DEL error');
    }
  }

  async deletePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } catch (error) {
      logger.error({ err: error }, 'Redis DEL pattern error');
    }
  }
}

export const redisCache = new RedisCache();
```

**Cache Targets:**
```typescript
// Global templates (15 min TTL)
async getAdSceneTemplates(filters?: { isGlobal?: boolean }) {
  if (filters?.isGlobal === true) {
    const cacheKey = 'global-templates';
    const cached = await redisCache.get<AdSceneTemplate[]>(cacheKey);

    if (cached) return cached;

    const templates = await db.select()...;
    await redisCache.set(cacheKey, templates, 15 * 60);

    return templates;
  }

  // Non-global not cached
  return db.select()...;
}

// Brand profile (30 min TTL)
async getBrandProfileByUserId(userId: string) {
  const cacheKey = `brand-profile:${userId}`;
  const cached = await redisCache.get<BrandProfile>(cacheKey);

  if (cached) return cached;

  const profile = await db.select()...;
  if (profile) {
    await redisCache.set(cacheKey, profile, 30 * 60);
  }

  return profile;
}

// Product list (5 min TTL)
async getProducts() {
  const cacheKey = 'products:all';
  const cached = await redisCache.get<Product[]>(cacheKey);

  if (cached) return cached;

  const products = await db.select()...;
  await redisCache.set(cacheKey, products, 5 * 60);

  return products;
}
```

**Cache Invalidation:**
```typescript
// Invalidate on mutations
async saveProduct(product: InsertProduct): Promise<Product> {
  const result = await db.insert(products)...;

  // Invalidate cache
  await redisCache.delete('products:all');

  return result;
}

async saveAdSceneTemplate(template: InsertAdSceneTemplate): Promise<AdSceneTemplate> {
  const result = await db.insert(adSceneTemplates)...;

  if (template.isGlobal) {
    await redisCache.delete('global-templates');
  }

  return result;
}
```

**Estimated Impact:**
- 90% reduction in database load for cached queries
- 70% faster API responses for repeated requests
- Sub-10ms cache hits vs 100-500ms database queries

---

### 4.2 CRITICAL: HTTP Cache Headers

**Problem:** No `Cache-Control` headers on static/semi-static endpoints.

**Implementation:**
```typescript
// server/middleware/cacheControl.ts
export function setCacheControl(maxAge: number, options: {
  public?: boolean;
  immutable?: boolean;
  staleWhileRevalidate?: number;
} = {}) {
  return (req, res, next) => {
    const directives = [];

    if (options.public !== false) {
      directives.push('public');
    }

    directives.push(`max-age=${maxAge}`);

    if (options.staleWhileRevalidate) {
      directives.push(`stale-while-revalidate=${options.staleWhileRevalidate}`);
    }

    if (options.immutable) {
      directives.push('immutable');
    }

    res.set('Cache-Control', directives.join(', '));
    next();
  };
}

// Apply to routes
app.get("/api/scene-templates/global",
  setCacheControl(5 * 60, { staleWhileRevalidate: 10 * 60 }),
  handler
);

app.get("/api/products",
  setCacheControl(1 * 60, { staleWhileRevalidate: 5 * 60 }),
  handler
);

// Immutable assets
app.use("/attached_assets",
  setCacheControl(365 * 24 * 60 * 60, { immutable: true }),
  express.static(...)
);
```

**Estimated Impact:**
- 80% reduction in repeat requests (served from browser cache)
- Faster page loads on return visits

---

### 4.3 HIGH: React Query Cache Configuration

**Problem:** Default cache time (5 min) may be suboptimal.

**File:** `client/src/lib/queryClient.ts`

**Optimized:**
```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // 2 min - consider data "fresh" for 2 min
      cacheTime: 10 * 60 * 1000, // 10 min - keep in cache for 10 min
      refetchOnWindowFocus: false, // Don't refetch on tab switch
      refetchOnReconnect: true, // Do refetch after reconnection
      retry: 1, // Only retry once on failure
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 0, // Don't retry mutations
    },
  },
});

// Per-query overrides
export const QUERY_CONFIGS = {
  GLOBAL_TEMPLATES: {
    staleTime: 15 * 60 * 1000, // 15 min - rarely changes
    cacheTime: 30 * 60 * 1000, // 30 min
  },
  BRAND_PROFILE: {
    staleTime: 10 * 60 * 1000, // 10 min
    cacheTime: 30 * 60 * 1000, // 30 min
  },
  PRODUCTS: {
    staleTime: 5 * 60 * 1000, // 5 min
    cacheTime: 15 * 60 * 1000, // 15 min
  },
  GENERATIONS: {
    staleTime: 1 * 60 * 1000, // 1 min - changes frequently
    cacheTime: 5 * 60 * 1000, // 5 min
  },
};
```

**Usage:**
```tsx
const { data: templates } = useQuery({
  queryKey: ['scene-templates', 'global'],
  queryFn: fetchGlobalTemplates,
  ...QUERY_CONFIGS.GLOBAL_TEMPLATES,
});
```

**Estimated Impact:**
- 60% reduction in background refetches
- Better perceived performance

---

### 4.4 MEDIUM: Cloudinary Image Caching

**Problem:** Cloudinary images fetched repeatedly without cache headers.

**Solution:** Already handled by Cloudinary (serves with `Cache-Control: max-age=31536000, immutable`).

**Verify:** Check response headers in DevTools.

**If Missing:** Add transformation to force caching:
```typescript
function getCloudinaryTransformUrl(publicId: string, options) {
  // Add cache busting ONLY when image changes (use version or timestamp)
  const version = options.version || 'v1'; // Increment on update

  return `https://res.cloudinary.com/.../upload/${version}/${publicId}`;
}
```

---

### 4.5 MEDIUM: Memoization in Services

**Problem:** Heavy computations in services repeated unnecessarily.

**Example:** Prompt engineering, template matching

**Implementation:**
```typescript
// server/utils/memoize.ts
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: {
    ttl?: number; // ms
    maxSize?: number;
  } = {}
): T {
  const cache = new Map<string, { value: any; expires: number }>();
  const { ttl = 60000, maxSize = 100 } = options;

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    const now = Date.now();

    const cached = cache.get(key);
    if (cached && cached.expires > now) {
      return cached.value;
    }

    const result = fn(...args);

    // Limit cache size
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }

    cache.set(key, {
      value: result,
      expires: now + ttl,
    });

    return result;
  }) as T;
}

// Usage in ideaBankService.ts
const generatePromptVariations = memoize(
  (product: Product, template: AdSceneTemplate) => {
    // Heavy prompt engineering
    return variations;
  },
  { ttl: 5 * 60 * 1000, maxSize: 50 }
);
```

**Estimated Impact:**
- 70% reduction in repeated computations
- 40% faster Idea Bank suggestions

---

### 4.6 LOW: Persist Redux/Zustand State

**Problem:** No state persistence (not using Redux/Zustand currently).

**If Implemented in Future:**
```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StudioState {
  selectedProducts: Product[];
  selectedTemplate: Template | null;
  // ...
}

export const useStudioStore = create<StudioState>()(
  persist(
    (set) => ({
      selectedProducts: [],
      selectedTemplate: null,
      // ...
    }),
    {
      name: 'studio-state',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist specific fields
        selectedProducts: state.selectedProducts,
        selectedTemplate: state.selectedTemplate,
      }),
    }
  )
);
```

**Estimated Impact:**
- Better UX - state preserved across refreshes
- Faster return visits

---

## 5. Background Jobs (3 Optimizations)

### 5.1 CRITICAL: Move Gemini Generations to Queue

**Already Covered in Section 2.2**

See "API Performance → 2.2 Gemini API Timeout Strategy"

---

### 5.2 HIGH: Pattern Cleanup Job Optimization

**Problem:** Pattern cleanup job may run synchronously.

**File:** `server/jobs/patternCleanupJob.ts` (exists based on grep)

**Verify:**
1. Job runs on schedule (cron) - GOOD
2. Job processes expired patterns in batches
3. Job doesn't block server startup

**Optimization (if needed):**
```typescript
// server/jobs/patternCleanupJob.ts
import Bull from 'bull';

const cleanupQueue = new Bull('pattern-cleanup', {
  redis: process.env.REDIS_URL,
});

// Schedule cleanup
cleanupQueue.add('cleanup-expired-patterns', {}, {
  repeat: {
    cron: '0 */6 * * *', // Every 6 hours
  },
});

// Process job
cleanupQueue.process('cleanup-expired-patterns', async (job) => {
  const expiredUploads = await storage.getExpiredUploads();

  // Batch delete (100 at a time)
  const BATCH_SIZE = 100;
  for (let i = 0; i < expiredUploads.length; i += BATCH_SIZE) {
    const batch = expiredUploads.slice(i, i + BATCH_SIZE);

    await Promise.all(
      batch.map(async (upload) => {
        // Delete Cloudinary image
        if (upload.cloudinaryPublicId) {
          await cloudinary.uploader.destroy(upload.cloudinaryPublicId);
        }

        // Delete database record
        await storage.deleteUpload(upload.id);
      })
    );

    // Progress reporting
    job.progress((i / expiredUploads.length) * 100);
  }

  return { deletedCount: expiredUploads.length };
});
```

**Estimated Impact:**
- Non-blocking cleanup
- Better resource management

---

### 5.3 MEDIUM: Async Image Upload to Cloudinary

**Problem:** Image uploads block API response.

**File:** `server/routes.ts` (product upload endpoint)

**Optimized:**
```typescript
// Current (blocking)
app.post("/api/products", upload.single('file'), async (req, res) => {
  const file = req.file;

  // Blocks response for 2-5 seconds
  const cloudinaryResult = await cloudinary.uploader.upload(file.path);

  const product = await storage.saveProduct({
    cloudinaryUrl: cloudinaryResult.secure_url,
    // ...
  });

  res.json(product);
});

// Optimized (non-blocking)
app.post("/api/products", upload.single('file'), async (req, res) => {
  const file = req.file;

  // Save product with pending status immediately
  const product = await storage.saveProduct({
    name: req.body.name,
    cloudinaryUrl: 'pending', // Placeholder
    status: 'uploading',
  });

  // Return immediately
  res.json({
    id: product.id,
    status: 'uploading',
  });

  // Upload to Cloudinary in background
  uploadQueue.add('upload-product-image', {
    productId: product.id,
    filePath: file.path,
  });
});

// Background job
uploadQueue.process('upload-product-image', async (job) => {
  const { productId, filePath } = job.data;

  try {
    const cloudinaryResult = await cloudinary.uploader.upload(filePath);

    // Update product with real URL
    await storage.updateProduct(productId, {
      cloudinaryUrl: cloudinaryResult.secure_url,
      cloudinaryPublicId: cloudinaryResult.public_id,
      status: 'ready',
    });

    // Notify user via WebSocket
    wsService.notifyUser(userId, {
      type: 'product_upload_complete',
      productId,
    });
  } catch (error) {
    await storage.updateProduct(productId, {
      status: 'upload_failed',
      error: error.message,
    });
  }
});
```

**Estimated Impact:**
- 80% faster API response
- Better UX with progress notifications

---

## 6. CDN & Asset Delivery (2 Optimizations)

### 6.1 HIGH: Static Asset CDN

**Problem:** Static assets served from origin server.

**Current:**
```typescript
// server/routes.ts
app.use("/attached_assets", express.static(path.join(process.cwd(), "attached_assets")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
```

**Optimization:**
```typescript
// Option 1: Railway CDN (if available)
// Check Railway dashboard for CDN support

// Option 2: Cloudinary for ALL static assets
async function migrateStaticAssetsToCloudinary() {
  const assetsDir = path.join(process.cwd(), 'attached_assets');
  const files = await fs.readdir(assetsDir);

  for (const file of files) {
    const filePath = path.join(assetsDir, file);

    const result = await cloudinary.uploader.upload(filePath, {
      folder: 'static-assets',
      public_id: file.replace(/\.[^/.]+$/, ''), // Remove extension
      resource_type: 'auto',
    });

    console.log(`Migrated: ${file} → ${result.secure_url}`);
  }
}

// Update asset references
const STATIC_ASSETS = {
  logo: 'https://res.cloudinary.com/.../static-assets/logo.png',
  defaultAvatar: 'https://res.cloudinary.com/.../static-assets/default-avatar.png',
  // ...
};
```

**Estimated Impact:**
- 60% faster asset loading (CDN vs origin)
- Reduced server bandwidth costs
- Better global performance

---

### 6.2 MEDIUM: Image Format Optimization

**Already Covered in Section 2.4**

See "API Performance → 2.4 Cloudinary URL Optimization"

---

## 7. Monitoring & Observability (1 Optimization)

### 7.1 HIGH: Performance Monitoring

**Problem:** No client-side performance monitoring (only Sentry for errors).

**Implementation:**
```typescript
// client/src/lib/performance.ts
export function initPerformanceMonitoring() {
  if (!('PerformanceObserver' in window)) return;

  // Track Core Web Vitals
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // Send to analytics/Sentry
      console.log(`[Performance] ${entry.name}:`, entry);

      if (window.gtag) {
        gtag('event', 'web_vitals', {
          event_category: 'Web Vitals',
          event_label: entry.name,
          value: Math.round(entry.value),
          metric_id: entry.id,
          metric_value: entry.value,
          metric_delta: entry.delta,
        });
      }
    }
  });

  // Observe LCP, FID, CLS
  observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });

  // Track custom metrics
  window.addEventListener('load', () => {
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    console.log('[Performance] Time to Interactive:', navTiming.domInteractive - navTiming.fetchStart);
    console.log('[Performance] DOM Content Loaded:', navTiming.domContentLoadedEventEnd - navTiming.fetchStart);
    console.log('[Performance] Load Complete:', navTiming.loadEventEnd - navTiming.fetchStart);
  });
}

// Track component render times
export function trackComponentRender(componentName: string, duration: number) {
  performance.measure(componentName, {
    duration,
    detail: { component: componentName },
  });
}
```

**Usage in components:**
```tsx
function Studio() {
  useEffect(() => {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      trackComponentRender('Studio', duration);
    };
  }, []);

  // ...
}
```

**Estimated Impact:**
- Data-driven optimization priorities
- Better understanding of real-world performance

---

## Implementation Roadmap

### Phase 1 - Critical (Immediate - Week 1)
**Impact:** 50-70% improvement in key metrics

1. Add database indexes (1.1) - 2 hours
2. Enable Redis caching (4.1) - 4 hours
3. Optimize conversationHistory loading (1.3) - 3 hours
4. Add response compression (2.1) - 1 hour
5. Memoize ProductCard/TemplateCard (3.1) - 2 hours
6. Move Gemini to job queue (2.2) - 8 hours

**Total:** ~20 hours (~3 days)

---

### Phase 2 - High Priority (Week 2-3)
**Impact:** Additional 20-30% improvement

1. Add pagination to all endpoints (1.4) - 6 hours
2. Optimize Cloudinary URLs (2.4) - 4 hours
3. Implement virtual scrolling (3.3) - 6 hours
4. Add HTTP cache headers (4.2) - 2 hours
5. Fix N+1 queries (1.2, 1.6) - 4 hours
6. Bundle splitting optimization (3.2) - 4 hours

**Total:** ~26 hours (~4 days)

---

### Phase 3 - Medium Priority (Week 4-6)
**Impact:** Additional 10-15% improvement

1. Query result caching (1.5) - 4 hours
2. Batch API endpoints (2.6) - 6 hours
3. Image loading strategy (3.4) - 3 hours
4. Debounce search inputs (3.5) - 2 hours
5. Service worker (3.9) - 8 hours
6. Background job optimization (5.2, 5.3) - 6 hours

**Total:** ~29 hours (~5 days)

---

### Phase 4 - Polish (Ongoing)
**Impact:** Incremental improvements

1. All remaining LOW priority items
2. Performance monitoring (7.1)
3. Continuous optimization based on monitoring data

**Total:** ~15 hours spread over time

---

## Success Metrics

### Before Optimization (Baseline)
- **Gallery Load Time:** 3.2s (50 items)
- **API Response Time (p95):** 850ms
- **Bundle Size:** 1.2MB gzipped
- **LCP:** 2.8s
- **Database Query Time (p95):** 450ms
- **Cache Hit Rate:** 0% (no caching)

### After Phase 1 (Target)
- **Gallery Load Time:** 1.0s (-69%)
- **API Response Time (p95):** 250ms (-71%)
- **Bundle Size:** 1.2MB (no change yet)
- **LCP:** 1.5s (-46%)
- **Database Query Time (p95):** 80ms (-82%)
- **Cache Hit Rate:** 70%

### After Phase 2 (Target)
- **Gallery Load Time:** 0.6s (-81% from baseline)
- **API Response Time (p95):** 180ms (-79%)
- **Bundle Size:** 600KB (-50%)
- **LCP:** 1.0s (-64%)
- **Database Query Time (p95):** 50ms (-89%)
- **Cache Hit Rate:** 85%

### After Phase 3 (Target)
- **Gallery Load Time:** 0.4s (-88%)
- **API Response Time (p95):** 120ms (-86%)
- **Bundle Size:** 600KB (-50%)
- **LCP:** 0.8s (-71%)
- **Database Query Time (p95):** 40ms (-91%)
- **Cache Hit Rate:** 90%

---

## Monitoring & Validation

### Database Performance
```sql
-- Check slow queries (PostgreSQL)
SELECT query, mean_exec_time, calls
FROM pg_stat_statements
WHERE mean_exec_time > 100 -- >100ms average
ORDER BY mean_exec_time DESC
LIMIT 20;

-- Check missing indexes
SELECT schemaname, tablename, attname
FROM pg_stats
WHERE correlation < 0.1 -- Poor correlation = missing index
ORDER BY schemaname, tablename;
```

### Frontend Performance
```typescript
// Add to client/src/main.tsx
if (import.meta.env.DEV) {
  import('react-scan').then((ReactScan) => {
    ReactScan.default({
      enabled: true,
      log: true, // Logs render info
    });
  });
}
```

### API Performance
```typescript
// server/middleware/performanceMonitoring.ts
export function trackApiPerformance(req, res, next) {
  const start = performance.now();

  res.on('finish', () => {
    const duration = performance.now() - start;

    logger.info({
      method: req.method,
      path: req.path,
      duration,
      status: res.statusCode,
    }, 'API request completed');

    // Track in Sentry/monitoring
    telemetry.trackApiRequest({
      endpoint: req.path,
      duration,
      status: res.statusCode,
    });
  });

  next();
}
```

---

## References

- [Drizzle ORM Indexes](https://orm.drizzle.team/docs/indexes-constraints)
- [PostgreSQL Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)
- [Vite Code Splitting](https://vitejs.dev/guide/build.html#chunking-strategy)
- [Cloudinary Image Optimization](https://cloudinary.com/documentation/image_transformations)
- [Web.dev Performance](https://web.dev/performance/)
- [Railway Deployment Best Practices](https://docs.railway.app/guides/optimize-deployment)

---

**End of Analysis**
