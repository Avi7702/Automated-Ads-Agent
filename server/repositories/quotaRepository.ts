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
} from "@shared/schema";
import { db } from "../db";
import { and, eq, desc, gte, lte, sql } from "drizzle-orm";

// ============================================
// QUOTA METRICS OPERATIONS
// ============================================

export async function upsertQuotaMetrics(metrics: InsertGeminiQuotaMetrics): Promise<GeminiQuotaMetrics> {
  const existing = await db
    .select()
    .from(geminiQuotaMetrics)
    .where(
      and(
        eq(geminiQuotaMetrics.brandId, metrics.brandId),
        eq(geminiQuotaMetrics.windowType, metrics.windowType),
        eq(geminiQuotaMetrics.windowStart, metrics.windowStart)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(geminiQuotaMetrics)
      .set({
        requestCount: sql`${geminiQuotaMetrics.requestCount} + ${metrics.requestCount}`,
        successCount: sql`${geminiQuotaMetrics.successCount} + ${metrics.successCount}`,
        errorCount: sql`${geminiQuotaMetrics.errorCount} + ${metrics.errorCount}`,
        rateLimitCount: sql`${geminiQuotaMetrics.rateLimitCount} + ${metrics.rateLimitCount}`,
        inputTokensTotal: sql`${geminiQuotaMetrics.inputTokensTotal} + ${metrics.inputTokensTotal}`,
        outputTokensTotal: sql`${geminiQuotaMetrics.outputTokensTotal} + ${metrics.outputTokensTotal}`,
        estimatedCostMicros: sql`${geminiQuotaMetrics.estimatedCostMicros} + ${metrics.estimatedCostMicros}`,
        generateCount: sql`${geminiQuotaMetrics.generateCount} + ${metrics.generateCount}`,
        editCount: sql`${geminiQuotaMetrics.editCount} + ${metrics.editCount}`,
        analyzeCount: sql`${geminiQuotaMetrics.analyzeCount} + ${metrics.analyzeCount}`,
      })
      .where(eq(geminiQuotaMetrics.id, existing[0].id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(geminiQuotaMetrics)
    .values(metrics)
    .returning();
  return inserted;
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
        lte(geminiQuotaMetrics.windowStart, params.endDate)
      )
    )
    .orderBy(desc(geminiQuotaMetrics.windowStart));
}

export async function getLatestQuotaMetric(brandId: string, windowType: string): Promise<GeminiQuotaMetrics | undefined> {
  const [metric] = await db
    .select()
    .from(geminiQuotaMetrics)
    .where(
      and(
        eq(geminiQuotaMetrics.brandId, brandId),
        eq(geminiQuotaMetrics.windowType, windowType)
      )
    )
    .orderBy(desc(geminiQuotaMetrics.windowStart))
    .limit(1);
  return metric;
}

// ============================================
// RATE LIMIT EVENT OPERATIONS
// ============================================

export async function createRateLimitEvent(event: InsertGeminiRateLimitEvent): Promise<GeminiRateLimitEvent> {
  const [inserted] = await db
    .insert(geminiRateLimitEvents)
    .values(event)
    .returning();
  return inserted;
}

export async function getRecentRateLimitEvents(brandId: string, minutes: number): Promise<GeminiRateLimitEvent[]> {
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);
  return await db
    .select()
    .from(geminiRateLimitEvents)
    .where(
      and(
        eq(geminiRateLimitEvents.brandId, brandId),
        gte(geminiRateLimitEvents.createdAt, cutoff)
      )
    )
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
    .where(
      and(
        eq(geminiQuotaAlerts.brandId, alert.brandId),
        eq(geminiQuotaAlerts.alertType, alert.alertType)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(geminiQuotaAlerts)
      .set({
        thresholdValue: alert.thresholdValue,
        isEnabled: alert.isEnabled,
        updatedAt: new Date(),
      })
      .where(eq(geminiQuotaAlerts.id, existing[0].id))
      .returning();
    return updated;
  }

  const [inserted] = await db
    .insert(geminiQuotaAlerts)
    .values(alert)
    .returning();
  return inserted;
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
  const [inserted] = await db
    .insert(googleQuotaSnapshots)
    .values(snapshot)
    .returning();
  return inserted;
}

export async function getLatestGoogleQuotaSnapshot(brandId?: string): Promise<GoogleQuotaSnapshot | undefined> {
  const conditions = brandId
    ? [eq(googleQuotaSnapshots.brandId, brandId)]
    : [];

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
  const [inserted] = await db
    .insert(googleQuotaSyncHistory)
    .values(entry)
    .returning();
  return inserted;
}

export async function updateSyncHistoryEntry(id: string, updates: Partial<InsertGoogleQuotaSyncHistory>): Promise<GoogleQuotaSyncHistory> {
  const [updated] = await db
    .update(googleQuotaSyncHistory)
    .set(updates)
    .where(eq(googleQuotaSyncHistory.id, id))
    .returning();
  return updated;
}

export async function getRecentSyncHistory(limit: number = 20): Promise<GoogleQuotaSyncHistory[]> {
  return db
    .select()
    .from(googleQuotaSyncHistory)
    .orderBy(desc(googleQuotaSyncHistory.startedAt))
    .limit(limit);
}
