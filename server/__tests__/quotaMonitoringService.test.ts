import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { GeminiQuotaMetrics, GeminiRateLimitEvent, GeminiQuotaAlert } from '@shared/schema';

// Mock the storage module
vi.mock('../storage', () => ({
  storage: {
    upsertQuotaMetrics: vi.fn(),
    getQuotaMetrics: vi.fn(),
    createRateLimitEvent: vi.fn(),
    getRecentRateLimitEvents: vi.fn(),
    getQuotaAlerts: vi.fn(),
    upsertQuotaAlert: vi.fn(),
    updateQuotaAlertTrigger: vi.fn(),
  },
}));

// Import after mock is set up
import { storage } from '../storage';
import {
  quotaMonitoringService,
  parseRetryDelay,
  parseLimitType,
  GEMINI_FREE_TIER_LIMITS,
} from '../services/quotaMonitoringService';

// Get typed mock functions
const mockStorage = vi.mocked(storage);

describe('Quota Monitoring Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ============================================
  // GEMINI_FREE_TIER_LIMITS Tests
  // ============================================
  describe('GEMINI_FREE_TIER_LIMITS', () => {
    it('should have correct RPM limit', () => {
      expect(GEMINI_FREE_TIER_LIMITS.rpm).toBe(15);
    });

    it('should have correct RPD limit', () => {
      expect(GEMINI_FREE_TIER_LIMITS.rpd).toBe(50);
    });

    it('should have correct TPM limit', () => {
      expect(GEMINI_FREE_TIER_LIMITS.tpm).toBe(1_000_000);
    });

    it('should have correct TPD limit', () => {
      expect(GEMINI_FREE_TIER_LIMITS.tpd).toBe(1_000_000);
    });
  });

  // ============================================
  // trackApiCall Tests
  // ============================================
  describe('trackApiCall', () => {
    it('should track a successful generate operation', async () => {
      mockStorage.upsertQuotaMetrics.mockResolvedValue({} as GeminiQuotaMetrics);

      await quotaMonitoringService.trackApiCall({
        brandId: 'brand-123',
        operation: 'generate',
        model: 'gemini-3-pro-image',
        success: true,
        durationMs: 1500,
        inputTokens: 100,
        outputTokens: 50,
        costMicros: 500,
      });

      // Should call upsertQuotaMetrics 3 times (minute, hour, day)
      expect(mockStorage.upsertQuotaMetrics).toHaveBeenCalledTimes(3);

      // Check minute window call
      const minuteCall = mockStorage.upsertQuotaMetrics.mock.calls[0][0];
      expect(minuteCall.windowType).toBe('minute');
      expect(minuteCall.brandId).toBe('brand-123');
      expect(minuteCall.requestCount).toBe(1);
      expect(minuteCall.successCount).toBe(1);
      expect(minuteCall.errorCount).toBe(0);
      expect(minuteCall.generateCount).toBe(1);
      expect(minuteCall.editCount).toBe(0);
      expect(minuteCall.analyzeCount).toBe(0);
      expect(minuteCall.inputTokensTotal).toBe(100);
      expect(minuteCall.outputTokensTotal).toBe(50);
      expect(minuteCall.estimatedCostMicros).toBe(500);
      expect(minuteCall.modelBreakdown).toEqual({ 'gemini-3-pro-image': 1 });
    });

    it('should track a failed edit operation', async () => {
      mockStorage.upsertQuotaMetrics.mockResolvedValue({} as GeminiQuotaMetrics);

      await quotaMonitoringService.trackApiCall({
        brandId: 'brand-456',
        operation: 'edit',
        model: 'gemini-3-flash',
        success: false,
        durationMs: 500,
        inputTokens: 200,
        outputTokens: 0,
        costMicros: 100,
      });

      const minuteCall = mockStorage.upsertQuotaMetrics.mock.calls[0][0];
      expect(minuteCall.successCount).toBe(0);
      expect(minuteCall.errorCount).toBe(1);
      expect(minuteCall.editCount).toBe(1);
      expect(minuteCall.generateCount).toBe(0);
    });

    it('should track a rate-limited analyze operation', async () => {
      mockStorage.upsertQuotaMetrics.mockResolvedValue({} as GeminiQuotaMetrics);

      await quotaMonitoringService.trackApiCall({
        brandId: 'brand-789',
        operation: 'analyze',
        model: 'gemini-3-pro',
        success: false,
        durationMs: 100,
        costMicros: 0,
        isRateLimited: true,
      });

      const minuteCall = mockStorage.upsertQuotaMetrics.mock.calls[0][0];
      expect(minuteCall.rateLimitCount).toBe(1);
      expect(minuteCall.analyzeCount).toBe(1);
    });

    it('should default inputTokens and outputTokens to 0 when not provided', async () => {
      mockStorage.upsertQuotaMetrics.mockResolvedValue({} as GeminiQuotaMetrics);

      await quotaMonitoringService.trackApiCall({
        brandId: 'brand-123',
        operation: 'generate',
        model: 'gemini-3-pro-image',
        success: true,
        durationMs: 1000,
        costMicros: 100,
      });

      const minuteCall = mockStorage.upsertQuotaMetrics.mock.calls[0][0];
      expect(minuteCall.inputTokensTotal).toBe(0);
      expect(minuteCall.outputTokensTotal).toBe(0);
    });

    it('should update hourly and daily aggregates', async () => {
      mockStorage.upsertQuotaMetrics.mockResolvedValue({} as GeminiQuotaMetrics);

      await quotaMonitoringService.trackApiCall({
        brandId: 'brand-123',
        operation: 'generate',
        model: 'gemini-3-pro-image',
        success: true,
        durationMs: 1000,
        costMicros: 100,
      });

      // Check hour window call
      const hourCall = mockStorage.upsertQuotaMetrics.mock.calls[1][0];
      expect(hourCall.windowType).toBe('hour');

      // Check day window call
      const dayCall = mockStorage.upsertQuotaMetrics.mock.calls[2][0];
      expect(dayCall.windowType).toBe('day');
    });
  });

  // ============================================
  // logRateLimitEvent Tests
  // ============================================
  describe('logRateLimitEvent', () => {
    it('should log a rate limit event and track API call', async () => {
      mockStorage.createRateLimitEvent.mockResolvedValue({} as GeminiRateLimitEvent);
      mockStorage.upsertQuotaMetrics.mockResolvedValue({} as GeminiQuotaMetrics);

      await quotaMonitoringService.logRateLimitEvent({
        brandId: 'brand-123',
        operation: 'generate',
        model: 'gemini-3-pro-image',
        limitType: 'rpm',
        retryAfterSeconds: 60,
        endpoint: '/v1/generate',
        requestMetadata: { resolution: '2K', imageCount: 1 },
      });

      expect(mockStorage.createRateLimitEvent).toHaveBeenCalledWith({
        brandId: 'brand-123',
        operation: 'generate',
        model: 'gemini-3-pro-image',
        limitType: 'rpm',
        retryAfterSeconds: 60,
        endpoint: '/v1/generate',
        requestMetadata: { resolution: '2K', imageCount: 1 },
      });

      // Should also call trackApiCall (which calls upsertQuotaMetrics 3 times)
      expect(mockStorage.upsertQuotaMetrics).toHaveBeenCalledTimes(3);
    });

    it('should handle rate limit without retryAfterSeconds', async () => {
      mockStorage.createRateLimitEvent.mockResolvedValue({} as GeminiRateLimitEvent);
      mockStorage.upsertQuotaMetrics.mockResolvedValue({} as GeminiQuotaMetrics);

      await quotaMonitoringService.logRateLimitEvent({
        brandId: 'brand-123',
        operation: 'edit',
        model: 'gemini-3-flash',
        limitType: 'rpd',
      });

      expect(mockStorage.createRateLimitEvent).toHaveBeenCalledWith({
        brandId: 'brand-123',
        operation: 'edit',
        model: 'gemini-3-flash',
        limitType: 'rpd',
        retryAfterSeconds: undefined,
        endpoint: undefined,
        requestMetadata: undefined,
      });
    });
  });

  // ============================================
  // getQuotaStatus Tests
  // ============================================
  describe('getQuotaStatus', () => {
    it('should return healthy status when usage is low', async () => {
      // Set a fixed time
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 10,
        successCount: 9,
        errorCount: 1,
        rateLimitCount: 0,
        inputTokensTotal: 50000,
        outputTokensTotal: 25000,
        estimatedCostMicros: 1000,
        generateCount: 5,
        editCount: 3,
        analyzeCount: 2,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      const status = await quotaMonitoringService.getQuotaStatus('brand-123');

      expect(status.status).toBe('healthy');
      expect(status.rpd.current).toBe(10);
      expect(status.rpd.limit).toBe(50);
      expect(status.rpd.percentage).toBe(20);
      expect(status.tokens.current).toBe(75000);
      expect(status.tokens.limit).toBe(1_000_000);
      expect(status.warnings).toHaveLength(0);
    });

    it('should return warning status when usage is above 60%', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 35, // 70% of 50
        successCount: 35,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 100000,
        outputTokensTotal: 50000,
        estimatedCostMicros: 1000,
        generateCount: 20,
        editCount: 10,
        analyzeCount: 5,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      const status = await quotaMonitoringService.getQuotaStatus('brand-123');

      expect(status.status).toBe('warning');
      expect(status.rpd.percentage).toBe(70);
    });

    it('should return critical status when usage is above 90%', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 47, // 94% of 50
        successCount: 47,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 100000,
        outputTokensTotal: 50000,
        estimatedCostMicros: 1000,
        generateCount: 30,
        editCount: 10,
        analyzeCount: 7,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      const status = await quotaMonitoringService.getQuotaStatus('brand-123');

      expect(status.status).toBe('critical');
      expect(status.rpd.percentage).toBe(94);
    });

    it('should return rate_limited status when there is an active rate limit', async () => {
      const now = new Date('2024-01-15T10:30:00Z');
      vi.setSystemTime(now);

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 10,
        successCount: 9,
        errorCount: 1,
        rateLimitCount: 1,
        inputTokensTotal: 50000,
        outputTokensTotal: 25000,
        estimatedCostMicros: 1000,
        generateCount: 5,
        editCount: 3,
        analyzeCount: 2,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      // Rate limit event that happened 30 seconds ago with 60 second retry
      mockStorage.getRecentRateLimitEvents.mockResolvedValue([{
        id: 'event-1',
        brandId: 'brand-123',
        operation: 'generate',
        model: 'gemini-3-pro-image',
        limitType: 'rpm',
        retryAfterSeconds: 60,
        endpoint: null,
        requestMetadata: null,
        createdAt: new Date(now.getTime() - 30000), // 30 seconds ago
      }]);

      const status = await quotaMonitoringService.getQuotaStatus('brand-123');

      expect(status.status).toBe('rate_limited');
      expect(status.retryAfter).toBeGreaterThan(0);
      expect(status.retryAfter).toBeLessThanOrEqual(30);
    });

    it('should handle empty metrics gracefully', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([]);
      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      const status = await quotaMonitoringService.getQuotaStatus('brand-123');

      expect(status.status).toBe('healthy');
      expect(status.rpd.current).toBe(0);
      expect(status.tokens.current).toBe(0);
      expect(status.cost.today).toBe(0);
    });

    it('should calculate cost correctly from micros to USD', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 10,
        successCount: 10,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 50000,
        outputTokensTotal: 25000,
        estimatedCostMicros: 1500000, // $1.50 in micros
        generateCount: 10,
        editCount: 0,
        analyzeCount: 0,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      const status = await quotaMonitoringService.getQuotaStatus('brand-123');

      expect(status.cost.today).toBe(1.5);
    });

    it('should include actionable solutions in warnings', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 45, // 90% of 50
        successCount: 45,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 100000,
        outputTokensTotal: 50000,
        estimatedCostMicros: 1000,
        generateCount: 30,
        editCount: 10,
        analyzeCount: 5,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      const status = await quotaMonitoringService.getQuotaStatus('brand-123');

      // Should have warning with solution
      expect(status.warnings.length).toBeGreaterThan(0);
      expect(status.warnings[0]).toContain('Solution');
    });
  });

  // ============================================
  // getUsageHistory Tests
  // ============================================
  describe('getUsageHistory', () => {
    it('should return formatted usage history', async () => {
      mockStorage.getQuotaMetrics.mockResolvedValue([
        {
          id: 'metric-1',
          windowType: 'hour',
          windowStart: new Date('2024-01-15T09:00:00Z'),
          windowEnd: new Date('2024-01-15T10:00:00Z'),
          brandId: 'brand-123',
          requestCount: 5,
          successCount: 5,
          errorCount: 0,
          rateLimitCount: 0,
          inputTokensTotal: 10000,
          outputTokensTotal: 5000,
          estimatedCostMicros: 500000,
          generateCount: 3,
          editCount: 2,
          analyzeCount: 0,
          modelBreakdown: null,
          latencyP50: null,
          latencyP90: null,
          latencyP99: null,
          createdAt: new Date(),
        },
        {
          id: 'metric-2',
          windowType: 'hour',
          windowStart: new Date('2024-01-15T10:00:00Z'),
          windowEnd: new Date('2024-01-15T11:00:00Z'),
          brandId: 'brand-123',
          requestCount: 8,
          successCount: 7,
          errorCount: 1,
          rateLimitCount: 0,
          inputTokensTotal: 20000,
          outputTokensTotal: 10000,
          estimatedCostMicros: 800000,
          generateCount: 5,
          editCount: 3,
          analyzeCount: 0,
          modelBreakdown: null,
          latencyP50: null,
          latencyP90: null,
          latencyP99: null,
          createdAt: new Date(),
        },
      ]);

      const history = await quotaMonitoringService.getUsageHistory({
        brandId: 'brand-123',
        windowType: 'hour',
        startDate: new Date('2024-01-15T00:00:00Z'),
        endDate: new Date('2024-01-15T23:59:59Z'),
      });

      expect(history).toHaveLength(2);
      expect(history[0].requests).toBe(5);
      expect(history[0].tokens).toBe(15000);
      expect(history[0].cost).toBe(0.5);
      expect(history[0].successRate).toBe(100);
      expect(history[1].successRate).toBe(87.5); // 7/8 * 100
    });

    it('should handle empty history', async () => {
      mockStorage.getQuotaMetrics.mockResolvedValue([]);

      const history = await quotaMonitoringService.getUsageHistory({
        brandId: 'brand-123',
        windowType: 'day',
        startDate: new Date('2024-01-01T00:00:00Z'),
        endDate: new Date('2024-01-31T23:59:59Z'),
      });

      expect(history).toHaveLength(0);
    });

    it('should calculate 100% success rate when no requests', async () => {
      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'hour',
        windowStart: new Date('2024-01-15T09:00:00Z'),
        windowEnd: new Date('2024-01-15T10:00:00Z'),
        brandId: 'brand-123',
        requestCount: 0,
        successCount: 0,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 0,
        outputTokensTotal: 0,
        estimatedCostMicros: 0,
        generateCount: 0,
        editCount: 0,
        analyzeCount: 0,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      const history = await quotaMonitoringService.getUsageHistory({
        brandId: 'brand-123',
        windowType: 'hour',
        startDate: new Date('2024-01-15T00:00:00Z'),
        endDate: new Date('2024-01-15T23:59:59Z'),
      });

      expect(history[0].successRate).toBe(100);
    });
  });

  // ============================================
  // getUsageBreakdown Tests
  // ============================================
  describe('getUsageBreakdown', () => {
    it('should aggregate breakdown for today', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 20,
        successCount: 19,
        errorCount: 1,
        rateLimitCount: 0,
        inputTokensTotal: 100000,
        outputTokensTotal: 50000,
        estimatedCostMicros: 2000000,
        generateCount: 10,
        editCount: 7,
        analyzeCount: 3,
        modelBreakdown: { 'gemini-3-pro-image': 15, 'gemini-3-flash': 5 },
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      const breakdown = await quotaMonitoringService.getUsageBreakdown({
        brandId: 'brand-123',
        period: 'today',
      });

      expect(breakdown.byOperation.generate).toBe(10);
      expect(breakdown.byOperation.edit).toBe(7);
      expect(breakdown.byOperation.analyze).toBe(3);
      expect(breakdown.byModel['gemini-3-pro-image']).toBe(15);
      expect(breakdown.byModel['gemini-3-flash']).toBe(5);
      expect(breakdown.totalRequests).toBe(20);
      expect(breakdown.totalTokens).toBe(150000);
      expect(breakdown.totalCost).toBe(2); // $2.00
    });

    it('should aggregate breakdown for week', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([
        {
          id: 'metric-1',
          windowType: 'day',
          windowStart: new Date('2024-01-14T00:00:00Z'),
          windowEnd: new Date('2024-01-15T00:00:00Z'),
          brandId: 'brand-123',
          requestCount: 10,
          successCount: 10,
          errorCount: 0,
          rateLimitCount: 0,
          inputTokensTotal: 50000,
          outputTokensTotal: 25000,
          estimatedCostMicros: 1000000,
          generateCount: 5,
          editCount: 3,
          analyzeCount: 2,
          modelBreakdown: { 'gemini-3-pro-image': 10 },
          latencyP50: null,
          latencyP90: null,
          latencyP99: null,
          createdAt: new Date(),
        },
        {
          id: 'metric-2',
          windowType: 'day',
          windowStart: new Date('2024-01-15T00:00:00Z'),
          windowEnd: new Date('2024-01-16T00:00:00Z'),
          brandId: 'brand-123',
          requestCount: 15,
          successCount: 14,
          errorCount: 1,
          rateLimitCount: 0,
          inputTokensTotal: 75000,
          outputTokensTotal: 30000,
          estimatedCostMicros: 1500000,
          generateCount: 8,
          editCount: 5,
          analyzeCount: 2,
          modelBreakdown: { 'gemini-3-pro-image': 12, 'gemini-3-flash': 3 },
          latencyP50: null,
          latencyP90: null,
          latencyP99: null,
          createdAt: new Date(),
        },
      ]);

      const breakdown = await quotaMonitoringService.getUsageBreakdown({
        brandId: 'brand-123',
        period: 'week',
      });

      expect(breakdown.byOperation.generate).toBe(13);
      expect(breakdown.byOperation.edit).toBe(8);
      expect(breakdown.byOperation.analyze).toBe(4);
      expect(breakdown.totalRequests).toBe(25);
      expect(breakdown.totalTokens).toBe(180000);
      expect(breakdown.totalCost).toBe(2.5);
    });

    it('should handle null modelBreakdown', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 10,
        successCount: 10,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 50000,
        outputTokensTotal: 25000,
        estimatedCostMicros: 1000000,
        generateCount: 5,
        editCount: 3,
        analyzeCount: 2,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      const breakdown = await quotaMonitoringService.getUsageBreakdown({
        brandId: 'brand-123',
        period: 'today',
      });

      expect(breakdown.byModel).toEqual({});
    });

    it('should handle empty metrics for month period', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([]);

      const breakdown = await quotaMonitoringService.getUsageBreakdown({
        brandId: 'brand-123',
        period: 'month',
      });

      expect(breakdown.byOperation.generate).toBe(0);
      expect(breakdown.byOperation.edit).toBe(0);
      expect(breakdown.byOperation.analyze).toBe(0);
      expect(breakdown.totalRequests).toBe(0);
      expect(breakdown.totalTokens).toBe(0);
      expect(breakdown.totalCost).toBe(0);
    });
  });

  // ============================================
  // getRateLimitStatus Tests
  // ============================================
  describe('getRateLimitStatus', () => {
    it('should return not limited when no events', async () => {
      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      const status = await quotaMonitoringService.getRateLimitStatus('brand-123');

      expect(status.isLimited).toBe(false);
      expect(status.limitType).toBeUndefined();
      expect(status.retryAfterSeconds).toBeUndefined();
      expect(status.recentEvents).toHaveLength(0);
    });

    it('should return limited when there is an active rate limit', async () => {
      const now = new Date('2024-01-15T10:30:00Z');
      vi.setSystemTime(now);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([{
        id: 'event-1',
        brandId: 'brand-123',
        operation: 'generate',
        model: 'gemini-3-pro-image',
        limitType: 'rpm',
        retryAfterSeconds: 60,
        endpoint: null,
        requestMetadata: null,
        createdAt: new Date(now.getTime() - 20000), // 20 seconds ago
      }]);

      const status = await quotaMonitoringService.getRateLimitStatus('brand-123');

      expect(status.isLimited).toBe(true);
      expect(status.limitType).toBe('rpm');
      expect(status.retryAfterSeconds).toBeGreaterThan(0);
      expect(status.retryAfterSeconds).toBeLessThanOrEqual(40);
    });

    it('should return not limited when rate limit has expired', async () => {
      const now = new Date('2024-01-15T10:30:00Z');
      vi.setSystemTime(now);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([{
        id: 'event-1',
        brandId: 'brand-123',
        operation: 'generate',
        model: 'gemini-3-pro-image',
        limitType: 'rpm',
        retryAfterSeconds: 30, // 30 second retry
        endpoint: null,
        requestMetadata: null,
        createdAt: new Date(now.getTime() - 60000), // 60 seconds ago (expired)
      }]);

      const status = await quotaMonitoringService.getRateLimitStatus('brand-123');

      expect(status.isLimited).toBe(false);
      expect(status.limitType).toBeUndefined();
    });

    it('should handle event without retryAfterSeconds', async () => {
      const now = new Date('2024-01-15T10:30:00Z');
      vi.setSystemTime(now);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([{
        id: 'event-1',
        brandId: 'brand-123',
        operation: 'generate',
        model: 'gemini-3-pro-image',
        limitType: 'rpd',
        retryAfterSeconds: null,
        endpoint: null,
        requestMetadata: null,
        createdAt: new Date(now.getTime() - 5000),
      }]);

      const status = await quotaMonitoringService.getRateLimitStatus('brand-123');

      // Should not be limited since there's no retryAfterSeconds
      expect(status.isLimited).toBe(false);
      expect(status.recentEvents).toHaveLength(1);
    });
  });

  // ============================================
  // Alert Management Tests
  // ============================================
  describe('getAlerts', () => {
    it('should return alerts from storage', async () => {
      const mockAlerts: GeminiQuotaAlert[] = [
        {
          id: 'alert-1',
          brandId: 'brand-123',
          alertType: 'rpm_threshold',
          thresholdValue: 80,
          isEnabled: true,
          lastTriggeredAt: null,
          triggerCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'alert-2',
          brandId: 'brand-123',
          alertType: 'cost_threshold',
          thresholdValue: 100, // $1.00
          isEnabled: true,
          lastTriggeredAt: null,
          triggerCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockStorage.getQuotaAlerts.mockResolvedValue(mockAlerts);

      const alerts = await quotaMonitoringService.getAlerts('brand-123');

      expect(alerts).toHaveLength(2);
      expect(mockStorage.getQuotaAlerts).toHaveBeenCalledWith('brand-123');
    });
  });

  describe('setAlert', () => {
    it('should upsert alert in storage', async () => {
      const mockAlert: GeminiQuotaAlert = {
        id: 'alert-1',
        brandId: 'brand-123',
        alertType: 'rpm_threshold',
        thresholdValue: 80,
        isEnabled: true,
        lastTriggeredAt: null,
        triggerCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockStorage.upsertQuotaAlert.mockResolvedValue(mockAlert);

      const result = await quotaMonitoringService.setAlert({
        brandId: 'brand-123',
        alertType: 'rpm_threshold',
        thresholdValue: 80,
        isEnabled: true,
      });

      expect(result).toEqual(mockAlert);
      expect(mockStorage.upsertQuotaAlert).toHaveBeenCalledWith({
        brandId: 'brand-123',
        alertType: 'rpm_threshold',
        thresholdValue: 80,
        isEnabled: true,
      });
    });
  });

  describe('checkAlerts', () => {
    it('should trigger alerts when thresholds are exceeded', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaAlerts.mockResolvedValue([
        {
          id: 'alert-1',
          brandId: 'brand-123',
          alertType: 'rpd_threshold',
          thresholdValue: 50, // 50%
          isEnabled: true,
          lastTriggeredAt: null,
          triggerCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 35, // 70% of 50
        successCount: 35,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 100000,
        outputTokensTotal: 50000,
        estimatedCostMicros: 1000,
        generateCount: 20,
        editCount: 10,
        analyzeCount: 5,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);
      mockStorage.updateQuotaAlertTrigger.mockResolvedValue();

      const triggered = await quotaMonitoringService.checkAlerts('brand-123');

      expect(triggered).toHaveLength(1);
      expect(triggered[0].alertType).toBe('rpd_threshold');
      expect(triggered[0].currentValue).toBe(70);
      expect(triggered[0].threshold).toBe(50);
      expect(mockStorage.updateQuotaAlertTrigger).toHaveBeenCalledWith('alert-1');
    });

    it('should not trigger disabled alerts', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaAlerts.mockResolvedValue([
        {
          id: 'alert-1',
          brandId: 'brand-123',
          alertType: 'rpd_threshold',
          thresholdValue: 50,
          isEnabled: false, // Disabled
          lastTriggeredAt: null,
          triggerCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 40, // 80% of 50
        successCount: 40,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 100000,
        outputTokensTotal: 50000,
        estimatedCostMicros: 1000,
        generateCount: 25,
        editCount: 10,
        analyzeCount: 5,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      const triggered = await quotaMonitoringService.checkAlerts('brand-123');

      expect(triggered).toHaveLength(0);
      expect(mockStorage.updateQuotaAlertTrigger).not.toHaveBeenCalled();
    });

    it('should trigger cost threshold alerts', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaAlerts.mockResolvedValue([
        {
          id: 'alert-1',
          brandId: 'brand-123',
          alertType: 'cost_threshold',
          thresholdValue: 1, // $1.00
          isEnabled: true,
          lastTriggeredAt: null,
          triggerCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 10,
        successCount: 10,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 100000,
        outputTokensTotal: 50000,
        estimatedCostMicros: 1500000, // $1.50
        generateCount: 10,
        editCount: 0,
        analyzeCount: 0,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);
      mockStorage.updateQuotaAlertTrigger.mockResolvedValue();

      const triggered = await quotaMonitoringService.checkAlerts('brand-123');

      expect(triggered).toHaveLength(1);
      expect(triggered[0].alertType).toBe('cost_threshold');
      expect(triggered[0].currentValue).toBe(1.5);
      expect(triggered[0].message).toContain('$1.50');
    });
  });

  // ============================================
  // parseRetryDelay Tests
  // ============================================
  describe('parseRetryDelay', () => {
    it('should return undefined for null error', () => {
      expect(parseRetryDelay(null)).toBeUndefined();
    });

    it('should return undefined for undefined error', () => {
      expect(parseRetryDelay(undefined)).toBeUndefined();
    });

    it('should return undefined for non-object error', () => {
      expect(parseRetryDelay('error string')).toBeUndefined();
      expect(parseRetryDelay(123)).toBeUndefined();
    });

    it('should parse retry delay from structured error details', () => {
      const error = {
        response: {
          data: {
            error: {
              details: [
                {
                  '@type': 'type.googleapis.com/google.rpc.RetryInfo',
                  retryDelay: { seconds: 45, nanos: 500000000 },
                },
              ],
            },
          },
        },
      };

      expect(parseRetryDelay(error)).toBe(45.5);
    });

    it('should parse retry delay with only seconds', () => {
      const error = {
        response: {
          data: {
            error: {
              details: [
                {
                  '@type': 'type.googleapis.com/google.rpc.RetryInfo',
                  retryDelay: { seconds: 60 },
                },
              ],
            },
          },
        },
      };

      expect(parseRetryDelay(error)).toBe(60);
    });

    it('should parse retry delay from error message', () => {
      const error = {
        message: 'Rate limit exceeded. Please retry in 30.5 seconds.',
      };

      expect(parseRetryDelay(error)).toBe(30.5);
    });

    it('should parse integer seconds from message', () => {
      const error = {
        message: 'Too many requests. Retry in 45s',
      };

      expect(parseRetryDelay(error)).toBe(45);
    });

    it('should return undefined when no retry info found', () => {
      const error = {
        response: {
          data: {
            error: {
              details: [
                { '@type': 'some.other.type' },
              ],
            },
          },
        },
        message: 'Some other error',
      };

      expect(parseRetryDelay(error)).toBeUndefined();
    });
  });

  // ============================================
  // parseLimitType Tests
  // ============================================
  describe('parseLimitType', () => {
    it('should return rpm for null error', () => {
      expect(parseLimitType(null)).toBe('rpm');
    });

    it('should return rpm for undefined error', () => {
      expect(parseLimitType(undefined)).toBe('rpm');
    });

    it('should return rpm for non-object error', () => {
      expect(parseLimitType('error string')).toBe('rpm');
    });

    it('should return rpd for daily request limit message', () => {
      expect(parseLimitType({ message: 'Too many requests per day' })).toBe('rpd');
    });

    it('should return tpd for daily token limit message', () => {
      expect(parseLimitType({ message: 'Too many tokens per day' })).toBe('tpd');
    });

    it('should return tpm for token limit message', () => {
      expect(parseLimitType({ message: 'Too many tokens per minute' })).toBe('tpm');
    });

    it('should default to rpm for unrecognized message', () => {
      expect(parseLimitType({ message: 'Rate limit exceeded' })).toBe('rpm');
    });

    it('should default to rpm for empty message', () => {
      expect(parseLimitType({ message: '' })).toBe('rpm');
    });

    it('should default to rpm when no message property', () => {
      expect(parseLimitType({ error: 'something' })).toBe('rpm');
    });
  });

  // ============================================
  // In-Memory Metrics Reset Tests
  // ============================================
  describe('In-Memory Metrics Window Reset', () => {
    it('should reset in-memory metrics on new minute window', async () => {
      // Start at a specific time
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));
      mockStorage.upsertQuotaMetrics.mockResolvedValue({} as GeminiQuotaMetrics);
      mockStorage.getQuotaMetrics.mockResolvedValue([]);
      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      // First API call
      await quotaMonitoringService.trackApiCall({
        brandId: 'brand-123',
        operation: 'generate',
        model: 'gemini-3-pro-image',
        success: true,
        durationMs: 1000,
        costMicros: 100,
      });

      // Get status to check RPM
      let status = await quotaMonitoringService.getQuotaStatus('brand-123');
      expect(status.rpm.current).toBe(1);

      // Move to next minute
      vi.setSystemTime(new Date('2024-01-15T10:31:00Z'));

      // RPM should reset
      status = await quotaMonitoringService.getQuotaStatus('brand-123');
      expect(status.rpm.current).toBe(0);
    });

    it('should accumulate requests within same minute window', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));
      mockStorage.upsertQuotaMetrics.mockResolvedValue({} as GeminiQuotaMetrics);
      mockStorage.getQuotaMetrics.mockResolvedValue([]);
      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      // Multiple API calls within same minute
      await quotaMonitoringService.trackApiCall({
        brandId: 'brand-123',
        operation: 'generate',
        model: 'gemini-3-pro-image',
        success: true,
        durationMs: 1000,
        costMicros: 100,
      });

      vi.setSystemTime(new Date('2024-01-15T10:30:30Z')); // Same minute

      await quotaMonitoringService.trackApiCall({
        brandId: 'brand-123',
        operation: 'edit',
        model: 'gemini-3-pro-image',
        success: true,
        durationMs: 800,
        costMicros: 80,
      });

      const status = await quotaMonitoringService.getQuotaStatus('brand-123');
      expect(status.rpm.current).toBe(2);
    });
  });

  // ============================================
  // Boundary Condition Tests
  // ============================================
  describe('Boundary Conditions', () => {
    it('should handle exactly 60% threshold (warning boundary)', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 30, // Exactly 60% of 50
        successCount: 30,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 100000,
        outputTokensTotal: 50000,
        estimatedCostMicros: 1000,
        generateCount: 20,
        editCount: 10,
        analyzeCount: 0,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      const status = await quotaMonitoringService.getQuotaStatus('brand-123');

      expect(status.status).toBe('warning');
      expect(status.rpd.percentage).toBe(60);
    });

    it('should handle exactly 90% threshold (critical boundary)', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 45, // Exactly 90% of 50
        successCount: 45,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 100000,
        outputTokensTotal: 50000,
        estimatedCostMicros: 1000,
        generateCount: 30,
        editCount: 10,
        analyzeCount: 5,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      const status = await quotaMonitoringService.getQuotaStatus('brand-123');

      expect(status.status).toBe('critical');
      expect(status.rpd.percentage).toBe(90);
    });

    it('should handle 100% usage with exceeded warning', async () => {
      vi.setSystemTime(new Date('2024-01-15T10:30:00Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-15T00:00:00Z'),
        windowEnd: new Date('2024-01-16T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 50, // 100% of 50
        successCount: 49,
        errorCount: 1,
        rateLimitCount: 1,
        inputTokensTotal: 100000,
        outputTokensTotal: 50000,
        estimatedCostMicros: 1000,
        generateCount: 35,
        editCount: 10,
        analyzeCount: 5,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      const status = await quotaMonitoringService.getQuotaStatus('brand-123');

      expect(status.rpd.percentage).toBe(100);
      expect(status.warnings.some(w => w.includes('DAILY LIMIT EXCEEDED'))).toBe(true);
    });

    it('should handle zero division in estimated monthly cost', async () => {
      // Set to first day of month at midnight
      vi.setSystemTime(new Date('2024-01-01T00:00:01Z'));

      mockStorage.getQuotaMetrics.mockResolvedValue([{
        id: 'metric-1',
        windowType: 'day',
        windowStart: new Date('2024-01-01T00:00:00Z'),
        windowEnd: new Date('2024-01-02T00:00:00Z'),
        brandId: 'brand-123',
        requestCount: 5,
        successCount: 5,
        errorCount: 0,
        rateLimitCount: 0,
        inputTokensTotal: 10000,
        outputTokensTotal: 5000,
        estimatedCostMicros: 100000,
        generateCount: 3,
        editCount: 2,
        analyzeCount: 0,
        modelBreakdown: null,
        latencyP50: null,
        latencyP90: null,
        latencyP99: null,
        createdAt: new Date(),
      }]);

      mockStorage.getRecentRateLimitEvents.mockResolvedValue([]);

      const status = await quotaMonitoringService.getQuotaStatus('brand-123');

      // Should not throw, estimated monthly should be calculated
      expect(status.cost.estimatedMonthly).toBeGreaterThan(0);
    });
  });
});
