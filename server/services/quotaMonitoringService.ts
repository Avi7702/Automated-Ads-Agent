/**
 * Quota Monitoring Service
 * Tracks Gemini API usage, provides real-time quota status, and manages alerts
 */

import { storage } from "../storage";
import type { InsertGeminiQuotaMetrics, InsertGeminiRateLimitEvent, GeminiQuotaAlert } from "@shared/schema";
import { createQuotaMetricsMap } from "../utils/memoryManager";

// Gemini Free Tier Limits (December 2025)
export const GEMINI_FREE_TIER_LIMITS = {
  rpm: 15,          // Requests per minute
  rpd: 50,          // Requests per day (for image generation)
  tpm: 1_000_000,   // Tokens per minute
  tpd: 1_000_000,   // Tokens per day
};

export interface QuotaStatus {
  rpm: { current: number; limit: number; percentage: number; resetAt: Date };
  rpd: { current: number; limit: number; percentage: number; resetAt: Date };
  tokens: { current: number; limit: number; percentage: number; resetAt: Date };
  cost: { today: number; thisMonth: number; estimatedMonthly: number };
  status: 'healthy' | 'warning' | 'critical' | 'rate_limited';
  warnings: string[];
  retryAfter?: number;
}

export interface UsageBreakdown {
  byOperation: { generate: number; edit: number; analyze: number };
  byModel: Record<string, number>;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
}

export interface TrackApiCallParams {
  brandId: string;
  operation: 'generate' | 'edit' | 'analyze';
  model: string;
  success: boolean;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  costMicros: number;
  errorType?: string;
  isRateLimited?: boolean;
}

// In-memory tracking for minute-level metrics (faster than DB queries)
// Now bounded with automatic cleanup of expired entries (max 5000 brands)
const inMemoryMetrics = createQuotaMetricsMap<{
  requestsThisMinute: number;
  tokensThisMinute: number;
  windowStart: number;
}>('QuotaMetrics', 5000);

/**
 * Get the start of the current minute window
 */
function getMinuteWindowStart(): Date {
  const now = new Date();
  now.setSeconds(0, 0);
  return now;
}

/**
 * Get the start of the current hour window
 */
function getHourWindowStart(): Date {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  return now;
}

/**
 * Get the start of the current day window (UTC)
 */
function getDayWindowStart(): Date {
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return now;
}

/**
 * Get or create in-memory metrics for a brand
 */
function getInMemoryMetrics(brandId: string): { requestsThisMinute: number; tokensThisMinute: number; windowStart: number } {
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000) * 60000;

  let metrics = inMemoryMetrics.get(brandId);

  // Reset if we're in a new minute
  if (!metrics || metrics.windowStart !== currentMinute) {
    metrics = {
      requestsThisMinute: 0,
      tokensThisMinute: 0,
      windowStart: currentMinute,
    };
    inMemoryMetrics.set(brandId, metrics);
  }

  return metrics;
}

export const quotaMonitoringService = {
  /**
   * Track an API call - called after every Gemini API request
   */
  async trackApiCall(params: TrackApiCallParams): Promise<void> {
    const {
      brandId,
      operation,
      model,
      success,
      durationMs: _durationMs,
      inputTokens = 0,
      outputTokens = 0,
      costMicros,
      isRateLimited = false,
    } = params;

    // Update in-memory metrics for instant quota checks
    const memMetrics = getInMemoryMetrics(brandId);
    memMetrics.requestsThisMinute++;
    memMetrics.tokensThisMinute += inputTokens + outputTokens;

    // Persist to database for minute window
    const minuteStart = getMinuteWindowStart();
    const minuteEnd = new Date(minuteStart.getTime() + 60000);

    const metricsInsert: InsertGeminiQuotaMetrics = {
      windowType: 'minute',
      windowStart: minuteStart,
      windowEnd: minuteEnd,
      brandId,
      requestCount: 1,
      successCount: success ? 1 : 0,
      errorCount: success ? 0 : 1,
      rateLimitCount: isRateLimited ? 1 : 0,
      inputTokensTotal: inputTokens,
      outputTokensTotal: outputTokens,
      estimatedCostMicros: costMicros,
      generateCount: operation === 'generate' ? 1 : 0,
      editCount: operation === 'edit' ? 1 : 0,
      analyzeCount: operation === 'analyze' ? 1 : 0,
      modelBreakdown: { [model]: 1 },
    };

    await storage.upsertQuotaMetrics(metricsInsert);

    // Also update hourly and daily aggregates
    const hourStart = getHourWindowStart();
    const hourEnd = new Date(hourStart.getTime() + 3600000);
    await storage.upsertQuotaMetrics({
      ...metricsInsert,
      windowType: 'hour',
      windowStart: hourStart,
      windowEnd: hourEnd,
    });

    const dayStart = getDayWindowStart();
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    await storage.upsertQuotaMetrics({
      ...metricsInsert,
      windowType: 'day',
      windowStart: dayStart,
      windowEnd: dayEnd,
    });
  },

  /**
   * Log a rate limit event
   */
  async logRateLimitEvent(params: {
    brandId: string;
    operation: string;
    model: string;
    limitType: 'rpm' | 'rpd' | 'tpm' | 'tpd';
    retryAfterSeconds?: number;
    endpoint?: string;
    requestMetadata?: Record<string, unknown>;
  }): Promise<void> {
    const event: InsertGeminiRateLimitEvent = {
      brandId: params.brandId,
      operation: params.operation,
      model: params.model,
      limitType: params.limitType,
      retryAfterSeconds: params.retryAfterSeconds,
      endpoint: params.endpoint,
      requestMetadata: params.requestMetadata,
    };

    await storage.createRateLimitEvent(event);

    // Also track in the metrics
    await this.trackApiCall({
      brandId: params.brandId,
      operation: params.operation as 'generate' | 'edit' | 'analyze',
      model: params.model,
      success: false,
      durationMs: 0,
      costMicros: 0,
      isRateLimited: true,
    });
  },

  /**
   * Get current quota status for a brand
   */
  async getQuotaStatus(brandId: string): Promise<QuotaStatus> {
    const now = new Date();
    const warnings: string[] = [];

    // Get in-memory metrics for instant RPM check
    const memMetrics = getInMemoryMetrics(brandId);

    // Get today's metrics from DB
    const dayStart = getDayWindowStart();
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    const todayMetrics = await storage.getQuotaMetrics({
      brandId,
      windowType: 'day',
      startDate: dayStart,
      endDate: dayEnd,
    });

    const todayAggregate = todayMetrics[0] || {
      requestCount: 0,
      inputTokensTotal: 0,
      outputTokensTotal: 0,
      estimatedCostMicros: 0,
    };

    // Get this month's metrics
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    const monthMetrics = await storage.getQuotaMetrics({
      brandId,
      windowType: 'day',
      startDate: monthStart,
      endDate: monthEnd,
    });

    const monthAggregate = monthMetrics.reduce((acc, m) => ({
      requestCount: acc.requestCount + m.requestCount,
      estimatedCostMicros: acc.estimatedCostMicros + m.estimatedCostMicros,
    }), { requestCount: 0, estimatedCostMicros: 0 });

    // Check for recent rate limit events
    const recentRateLimits = await storage.getRecentRateLimitEvents(brandId, 5);
    const isRateLimited = recentRateLimits.length > 0 &&
      recentRateLimits[0].retryAfterSeconds &&
      (new Date(recentRateLimits[0].createdAt).getTime() + recentRateLimits[0].retryAfterSeconds * 1000) > Date.now();

    const retryAfter = isRateLimited && recentRateLimits[0].retryAfterSeconds
      ? Math.max(0, Math.ceil((new Date(recentRateLimits[0].createdAt).getTime() + recentRateLimits[0].retryAfterSeconds * 1000 - Date.now()) / 1000))
      : undefined;

    // Calculate percentages
    const rpmPercentage = (memMetrics.requestsThisMinute / GEMINI_FREE_TIER_LIMITS.rpm) * 100;
    const rpdPercentage = (todayAggregate.requestCount / GEMINI_FREE_TIER_LIMITS.rpd) * 100;
    const tokensPercentage = ((todayAggregate.inputTokensTotal + todayAggregate.outputTokensTotal) / GEMINI_FREE_TIER_LIMITS.tpd) * 100;

    // Calculate reset times
    const minuteReset = new Date(Math.ceil(Date.now() / 60000) * 60000);
    const dayReset = new Date(dayStart.getTime() + 86400000);

    // Generate warnings with issue + solution
    if (rpmPercentage >= 100) {
      warnings.push(`⛔ RATE LIMITED: Minute limit exceeded (${Math.round(rpmPercentage)}%) | Solution: Wait ${60 - new Date().getSeconds()}s for reset, or upgrade to paid tier at https://aistudio.google.com`);
    } else if (rpmPercentage >= 80) {
      warnings.push(`⚠️ Approaching minute rate limit (${Math.round(rpmPercentage)}%) | Solution: Slow down requests or wait for reset in ${60 - new Date().getSeconds()}s`);
    }

    if (rpdPercentage >= 100) {
      warnings.push(`⛔ DAILY LIMIT EXCEEDED: ${todayAggregate.requestCount}/${GEMINI_FREE_TIER_LIMITS.rpd} requests | Solution: Wait until midnight UTC for reset, or upgrade to paid tier`);
    } else if (rpdPercentage >= 80) {
      warnings.push(`⚠️ Approaching daily request limit (${Math.round(rpdPercentage)}%) | Solution: ${GEMINI_FREE_TIER_LIMITS.rpd - todayAggregate.requestCount} requests remaining today. Resets at midnight UTC`);
    }

    if (tokensPercentage >= 100) {
      warnings.push(`⛔ TOKEN LIMIT EXCEEDED | Solution: Wait until midnight UTC for reset, or upgrade to paid tier`);
    } else if (tokensPercentage >= 80) {
      warnings.push(`⚠️ Approaching daily token limit (${Math.round(tokensPercentage)}%) | Solution: Reduce prompt sizes or wait until midnight UTC`);
    }

    // Determine overall status
    let status: QuotaStatus['status'] = 'healthy';
    if (isRateLimited) {
      status = 'rate_limited';
    } else if (rpmPercentage >= 90 || rpdPercentage >= 90 || tokensPercentage >= 90) {
      status = 'critical';
    } else if (rpmPercentage >= 60 || rpdPercentage >= 60 || tokensPercentage >= 60) {
      status = 'warning';
    }

    // Calculate cost estimates
    const todayCost = todayAggregate.estimatedCostMicros / 1_000_000;
    const monthCost = monthAggregate.estimatedCostMicros / 1_000_000;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const dayOfMonth = now.getDate();
    const estimatedMonthly = dayOfMonth > 0 ? (monthCost / dayOfMonth) * daysInMonth : 0;

    return {
      rpm: {
        current: memMetrics.requestsThisMinute,
        limit: GEMINI_FREE_TIER_LIMITS.rpm,
        percentage: rpmPercentage,
        resetAt: minuteReset,
      },
      rpd: {
        current: todayAggregate.requestCount,
        limit: GEMINI_FREE_TIER_LIMITS.rpd,
        percentage: rpdPercentage,
        resetAt: dayReset,
      },
      tokens: {
        current: todayAggregate.inputTokensTotal + todayAggregate.outputTokensTotal,
        limit: GEMINI_FREE_TIER_LIMITS.tpd,
        percentage: tokensPercentage,
        resetAt: dayReset,
      },
      cost: {
        today: todayCost,
        thisMonth: monthCost,
        estimatedMonthly,
      },
      status,
      warnings,
      retryAfter,
    };
  },

  /**
   * Get usage history for charts
   */
  async getUsageHistory(params: {
    brandId: string;
    windowType: 'minute' | 'hour' | 'day';
    startDate: Date;
    endDate: Date;
  }): Promise<Array<{
    timestamp: string;
    requests: number;
    tokens: number;
    cost: number;
    successRate: number;
  }>> {
    const metrics = await storage.getQuotaMetrics(params);

    return metrics.map(m => ({
      timestamp: m.windowStart.toISOString(),
      requests: m.requestCount,
      tokens: m.inputTokensTotal + m.outputTokensTotal,
      cost: m.estimatedCostMicros / 1_000_000,
      successRate: m.requestCount > 0 ? (m.successCount / m.requestCount) * 100 : 100,
    }));
  },

  /**
   * Get usage breakdown for the dashboard
   */
  async getUsageBreakdown(params: {
    brandId: string;
    period: 'today' | 'week' | 'month';
  }): Promise<UsageBreakdown> {
    const now = new Date();
    let startDate: Date;

    switch (params.period) {
      case 'today':
        startDate = getDayWindowStart();
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const metrics = await storage.getQuotaMetrics({
      brandId: params.brandId,
      windowType: 'day',
      startDate,
      endDate: now,
    });

    // Aggregate all metrics
    const aggregate = metrics.reduce((acc, m) => ({
      generate: acc.generate + m.generateCount,
      edit: acc.edit + m.editCount,
      analyze: acc.analyze + m.analyzeCount,
      totalRequests: acc.totalRequests + m.requestCount,
      totalTokens: acc.totalTokens + m.inputTokensTotal + m.outputTokensTotal,
      totalCost: acc.totalCost + m.estimatedCostMicros,
      modelBreakdown: mergeModelBreakdown(acc.modelBreakdown, m.modelBreakdown as Record<string, number> | null),
    }), {
      generate: 0,
      edit: 0,
      analyze: 0,
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      modelBreakdown: {} as Record<string, number>,
    });

    return {
      byOperation: {
        generate: aggregate.generate,
        edit: aggregate.edit,
        analyze: aggregate.analyze,
      },
      byModel: aggregate.modelBreakdown,
      totalRequests: aggregate.totalRequests,
      totalTokens: aggregate.totalTokens,
      totalCost: aggregate.totalCost / 1_000_000,
    };
  },

  /**
   * Get rate limit status
   */
  async getRateLimitStatus(brandId: string): Promise<{
    isLimited: boolean;
    limitType?: string;
    retryAfterSeconds?: number;
    recentEvents: Array<{
      limitType: string;
      createdAt: Date;
      retryAfterSeconds?: number;
    }>;
  }> {
    const recentEvents = await storage.getRecentRateLimitEvents(brandId, 5);

    if (recentEvents.length === 0) {
      return { isLimited: false, recentEvents: [] };
    }

    const latest = recentEvents[0];
    const expiresAt = latest.retryAfterSeconds
      ? new Date(latest.createdAt).getTime() + latest.retryAfterSeconds * 1000
      : 0;
    const isLimited = expiresAt > Date.now();

    return {
      isLimited,
      limitType: isLimited ? latest.limitType : undefined,
      retryAfterSeconds: isLimited ? Math.ceil((expiresAt - Date.now()) / 1000) : undefined,
      recentEvents: recentEvents.map(e => ({
        limitType: e.limitType,
        createdAt: e.createdAt,
        retryAfterSeconds: e.retryAfterSeconds || undefined,
      })),
    };
  },

  /**
   * Get and manage quota alerts
   */
  async getAlerts(brandId: string): Promise<GeminiQuotaAlert[]> {
    return storage.getQuotaAlerts(brandId);
  },

  async setAlert(params: {
    brandId: string;
    alertType: 'rpm_threshold' | 'rpd_threshold' | 'token_threshold' | 'cost_threshold';
    thresholdValue: number;
    isEnabled: boolean;
  }): Promise<GeminiQuotaAlert> {
    return storage.upsertQuotaAlert({
      brandId: params.brandId,
      alertType: params.alertType,
      thresholdValue: params.thresholdValue,
      isEnabled: params.isEnabled,
    });
  },

  /**
   * Check alert thresholds and return triggered alerts
   */
  async checkAlerts(brandId: string): Promise<Array<{
    alertType: string;
    currentValue: number;
    threshold: number;
    message: string;
  }>> {
    const alerts = await storage.getQuotaAlerts(brandId);
    const status = await this.getQuotaStatus(brandId);
    const triggered: Array<{
      alertType: string;
      currentValue: number;
      threshold: number;
      message: string;
    }> = [];

    for (const alert of alerts) {
      if (!alert.isEnabled) continue;

      let currentValue = 0;
      let message = '';

      switch (alert.alertType) {
        case 'rpm_threshold':
          currentValue = status.rpm.percentage;
          message = `Requests per minute at ${Math.round(currentValue)}% of limit`;
          break;
        case 'rpd_threshold':
          currentValue = status.rpd.percentage;
          message = `Daily requests at ${Math.round(currentValue)}% of limit`;
          break;
        case 'token_threshold':
          currentValue = status.tokens.percentage;
          message = `Daily tokens at ${Math.round(currentValue)}% of limit`;
          break;
        case 'cost_threshold':
          currentValue = status.cost.today;
          message = `Today's cost: $${currentValue.toFixed(2)}`;
          break;
      }

      if (currentValue >= alert.thresholdValue) {
        triggered.push({
          alertType: alert.alertType,
          currentValue,
          threshold: alert.thresholdValue,
          message,
        });

        // Update trigger count
        await storage.updateQuotaAlertTrigger(alert.id);
      }
    }

    return triggered;
  },
};

/**
 * Helper to merge model breakdown objects
 */
function mergeModelBreakdown(
  acc: Record<string, number>,
  breakdown: Record<string, number> | null
): Record<string, number> {
  if (!breakdown) return acc;

  for (const [model, count] of Object.entries(breakdown)) {
    acc[model] = (acc[model] || 0) + count;
  }

  return acc;
}

/**
 * Parse retry delay from Gemini 429 error response
 */
export function parseRetryDelay(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const err = error as Record<string, unknown>;

  // Check structured error details
  const details = (err.response as Record<string, unknown>)?.data as Record<string, unknown>;
  const errorDetails = (details?.error as Record<string, unknown>)?.details as Array<Record<string, unknown>>;

  if (Array.isArray(errorDetails)) {
    for (const detail of errorDetails) {
      if (detail['@type'] === 'type.googleapis.com/google.rpc.RetryInfo') {
        const retryDelay = detail.retryDelay as Record<string, number> | undefined;
        if (retryDelay) {
          const seconds = retryDelay.seconds || 0;
          const nanos = retryDelay.nanos || 0;
          return seconds + nanos / 1_000_000_000;
        }
      }
    }
  }

  // Check error message for retry timing
  const message = (err.message as string) || (details?.error as Record<string, unknown>)?.message as string;
  if (message) {
    const match = message.match(/retry in (\d+\.?\d*)\s*s/i);
    if (match) {
      return parseFloat(match[1]);
    }
  }

  return undefined;
}

/**
 * Determine limit type from Gemini 429 error
 */
export function parseLimitType(error: unknown): 'rpm' | 'rpd' | 'tpm' | 'tpd' {
  if (!error || typeof error !== 'object') return 'rpm';

  const err = error as Record<string, unknown>;
  const message = (err.message as string) || '';

  if (message.includes('requests') && message.includes('day')) return 'rpd';
  if (message.includes('tokens') && message.includes('day')) return 'tpd';
  if (message.includes('tokens')) return 'tpm';

  return 'rpm';
}
