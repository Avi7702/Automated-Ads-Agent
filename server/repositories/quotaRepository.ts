import {
  type GeminiQuotaMetrics,
  type InsertGeminiQuotaMetrics,
  type GeminiRateLimitEvent,
  type InsertGeminiRateLimitEvent,
  type GeminiQuotaAlert,
  type InsertGeminiQuotaAlert,
  type GoogleQuotaSnapshot,
  type InsertGoogleQuotaSnapshot,
  type GoogleQuotaSyncHistory,
  type InsertGoogleQuotaSyncHistory,
  geminiQuotaMetrics,
  geminiRateLimitEvents,
  geminiQuotaAlerts,
  googleQuotaSnapshots,
  googleQuotaSyncHistory,
} from '@shared/schema';
import { db } from '../db';
import { and, eq, desc, gte, lte, sql } from 'drizzle-orm';

// ============================================
// QUOTA METRICS OPERATIONS
// ============================================

export async function upsertQuotaMetrics(metrics: InsertGeminiQuotaMetrics): Promise<GeminiQuotaMetrics> {
  // Optimized: Use single atomic PostgreSQL UPSERT instead of SELECT-then-UPDATE
  // This reduces database roundtrips from 2-3 queries down to 1
  const [result] = await db
    .insert(geminiQuotaMetrics)
    .values(metrics)
    .onConflictDoUpdate({
      target: [geminiQuotaMetrics.windowType, geminiQuotaMetrics.windowStart, geminiQuotaMetrics.brandId],
      set: {
        requestCount: sql`${geminiQuotaMetrics.requestCount} + EXCLUDED.request_count`,
        successCount: sql`${geminiQuotaMetrics.successCount} + EXCLUDED.success_count`,
        errorCount: sql`${geminiQuotaMetrics.errorCount} + EXCLUDED.error_count`,
        rateLimitCount: sql`${geminiQuotaMetrics.rateLimitCount} + EXCLUDED.rate_limit_count`,
        inputTokensTotal: sql`${geminiQuotaMetrics.inputTokensTotal} + EXCLUDED.input_tokens_total`,
        outputTokensTotal: sql`${geminiQuotaMetrics.outputTokensTotal} + EXCLUDED.output_tokens_total`,
        estimatedCostMicros: sql`${geminiQuotaMetrics.estimatedCostMicros} + EXCLUDED.estimated_cost_micros`,
        generateCount: sql`${geminiQuotaMetrics.generateCount} + EXCLUDED.generate_count`,
        editCount: sql`${geminiQuotaMetrics.editCount} + EXCLUDED.edit_count`,
        analyzeCount: sql`${geminiQuotaMetrics.analyzeCount} + EXCLUDED.analyze_count`,
        // Bug fix: Ensure modelBreakdown is merged during updates
        // Note: || operator in JSONB performs a shallow merge
        modelBreakdown: sql`COALESCE(${geminiQuotaMetrics.modelBreakdown}, '{}'::jsonb) || EXCLUDED.model_breakdown`,
      },
    })
    .returning();

  return result!;
}

export async function getQuotaMetrics(params: {
  brandId: string;
  windowType: string;
  startDate: Date;
  endDate: Date;
}): Promise<GeminiQuotaMetrics[]> {
  return await db
    .select()
    .from(geminiQuotaMetrics)
    .where(
      and(
        eq(geminiQuotaMetrics.brandId, params.brandId),
        eq(geminiQuotaMetrics.windowType, params.windowType),
        gte(geminiQuotaMetrics.windowStart, params.startDate),
        lte(geminiQuotaMetrics.windowStart, params.endDate),
      ),
    )
    .orderBy(desc(geminiQuotaMetrics.windowStart));
}

export async function getLatestQuotaMetric(
  brandId: string,
  windowType: string,
): Promise<GeminiQuotaMetrics | undefined> {
  const [metric] = await db
    .select()
    .from(geminiQuotaMetrics)
    .where(and(eq(geminiQuotaMetrics.brandId, brandId), eq(geminiQuotaMetrics.windowType, windowType)))
    .orderBy(desc(geminiQuotaMetrics.windowStart))
    .limit(1);
  return metric;
}

// ============================================
// RATE LIMIT EVENT OPERATIONS
// ============================================

export async function createRateLimitEvent(event: InsertGeminiRateLimitEvent): Promise<GeminiRateLimitEvent> {
  const [inserted] = await db.insert(geminiRateLimitEvents).values(event).returning();
  return inserted!;
}

export async function getRecentRateLimitEvents(brandId: string, minutes: number): Promise<GeminiRateLimitEvent[]> {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  return await db
    .select()
    .from(geminiRateLimitEvents)
    .where(and(eq(geminiRateLimitEvents.brandId, brandId), gte(geminiRateLimitEvents.createdAt, cutoff)))
    .orderBy(desc(geminiRateLimitEvents.createdAt));
}

// ============================================
// QUOTA ALERT OPERATIONS
// ============================================

export async function getQuotaAlerts(brandId: string): Promise<GeminiQuotaAlert[]> {
  return await db
    .select()
    .from(geminiQuotaAlerts)
    .where(eq(geminiQuotaAlerts.brandId, brandId))
    .orderBy(geminiQuotaAlerts.alertType);
}

export async function upsertQuotaAlert(alert: InsertGeminiQuotaAlert): Promise<GeminiQuotaAlert> {
  const existing = await db
    .select()
    .from(geminiQuotaAlerts)
    .where(and(eq(geminiQuotaAlerts.brandId, alert.brandId), eq(geminiQuotaAlerts.alertType, alert.alertType)))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(geminiQuotaAlerts)
      .set({
        thresholdValue: alert.thresholdValue,
        isEnabled: alert.isEnabled,
        updatedAt: new Date(),
      })
      .where(eq(geminiQuotaAlerts.id, existing[0]!.id))
      .returning();
    return updated!;
  }

  const [inserted] = await db.insert(geminiQuotaAlerts).values(alert).returning();
  return inserted!;
}

export async function updateQuotaAlertTrigger(id: string): Promise<void> {
  await db
    .update(geminiQuotaAlerts)
    .set({
      lastTriggeredAt: new Date(),
      triggerCount: sql`${geminiQuotaAlerts.triggerCount} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(geminiQuotaAlerts.id, id));
}

// ============================================
// GOOGLE CLOUD MONITORING SYNC OPERATIONS
// ============================================

export async function saveGoogleQuotaSnapshot(snapshot: InsertGoogleQuotaSnapshot): Promise<GoogleQuotaSnapshot> {
  const [inserted] = await db.insert(googleQuotaSnapshots).values(snapshot).returning();
  return inserted!;
}

export async function getLatestGoogleQuotaSnapshot(brandId?: string): Promise<GoogleQuotaSnapshot | undefined> {
  const conditions = brandId ? [eq(googleQuotaSnapshots.brandId, brandId)] : [];

  const [latest] = await db
    .select()
    .from(googleQuotaSnapshots)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(googleQuotaSnapshots.syncedAt))
    .limit(1);

  return latest;
}

export async function getGoogleQuotaSnapshotHistory(params: {
  brandId?: string;
  startDate: Date;
  endDate: Date;
  limit?: number;
}): Promise<GoogleQuotaSnapshot[]> {
  const conditions = [
    gte(googleQuotaSnapshots.syncedAt, params.startDate),
    lte(googleQuotaSnapshots.syncedAt, params.endDate),
  ];

  if (params.brandId) {
    conditions.push(eq(googleQuotaSnapshots.brandId, params.brandId));
  }

  return db
    .select()
    .from(googleQuotaSnapshots)
    .where(and(...conditions))
    .orderBy(desc(googleQuotaSnapshots.syncedAt))
    .limit(params.limit || 100);
}

export async function createSyncHistoryEntry(entry: InsertGoogleQuotaSyncHistory): Promise<GoogleQuotaSyncHistory> {
  const [inserted] = await db.insert(googleQuotaSyncHistory).values(entry).returning();
  return inserted!;
}

export async function updateSyncHistoryEntry(
  id: string,
  updates: Partial<InsertGoogleQuotaSyncHistory>,
): Promise<GoogleQuotaSyncHistory> {
  const [updated] = await db
    .update(googleQuotaSyncHistory)
    .set(updates)
    .where(eq(googleQuotaSyncHistory.id, id))
    .returning();
  return updated!;
}

export async function getRecentSyncHistory(limit: number = 20): Promise<GoogleQuotaSyncHistory[]> {
  return db.select().from(googleQuotaSyncHistory).orderBy(desc(googleQuotaSyncHistory.startedAt)).limit(limit);
}
