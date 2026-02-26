/**
 * ApprovalQueueService Tests
 *
 * Tests the HITL approval workflow:
 * - calculatePriority (pure function, exported)
 * - evaluateContent (AI evaluation orchestrator)
 * - addToQueue (queue insertion with auto-approve logic)
 * - approveContent / rejectContent / requestRevision (status transitions)
 * - bulkApprove (batch operations)
 * - scheduleApprovedContent (approval -> scheduling bridge)
 * - getQueueForUser, getAuditLog, getApprovalSettings, updateApprovalSettings
 *
 * Mocking strategy:
 * - storage: all DB read operations (accessed via vi.mocked after import)
 * - db: transaction-based writes
 * - confidenceScoringService: AI confidence scoring
 * - schedulingRepository: post scheduling
 */

// ============================================
// MOCK SETUP (no top-level variable references in factories)
// ============================================

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../db', () => {
  const tx = {
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn(),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
  };
  return {
    db: {
      transaction: vi.fn(async (fn: (t: typeof tx) => Promise<unknown>) => fn(tx)),
      __tx: tx, // expose for test access
    },
    pool: { end: vi.fn() },
  };
});

vi.mock('drizzle-orm', () => ({
  eq: vi.fn((_col: unknown, _val: unknown) => ({ column: _col, value: _val })),
}));

vi.mock('@shared/schema', () => ({
  approvalQueue: { id: 'approval_queue.id' },
  approvalAuditLog: {},
}));

vi.mock('../storage', () => ({
  storage: {
    getApprovalSettings: vi.fn(),
    getApprovalQueueForUser: vi.fn(),
    getApprovalQueue: vi.fn(),
    getApprovalAuditLog: vi.fn(),
    updateApprovalSettings: vi.fn(),
    getAdCopyById: vi.fn(),
    getGenerationById: vi.fn(),
  },
}));

vi.mock('../services/confidenceScoringService', () => ({
  evaluateContent: vi.fn(),
}));

vi.mock('../services/schedulingRepository', () => ({
  schedulePost: vi.fn(),
}));

// Import AFTER mocks
import {
  calculatePriority,
  evaluateContent,
  addToQueue,
  approveContent,
  rejectContent,
  bulkApprove,
  requestRevision,
  getQueueForUser,
  getAuditLog,
  getApprovalSettings,
  updateApprovalSettings,
  scheduleApprovedContent,
  type GeneratedContent,
  type SafetyCheckResults,
} from '../services/approvalQueueService';
import { storage } from '../storage';
import { db } from '../db';
import { evaluateContent as evaluateConfidence } from '../services/confidenceScoringService';
import * as schedulingRepository from '../services/schedulingRepository';

// Typed mock references
const mockStorage = vi.mocked(storage);
const mockDb = db as unknown as {
  transaction: ReturnType<typeof vi.fn>;
  __tx: Record<string, ReturnType<typeof vi.fn>>;
};
const mockTx = mockDb.__tx;
const mockEvaluateConfidence = vi.mocked(evaluateConfidence);
const mockSchedulePost = vi.mocked(schedulingRepository.schedulePost);

// ============================================
// TEST HELPERS
// ============================================

function makeSafetyChecks(overrides?: Partial<SafetyCheckResults>): SafetyCheckResults {
  return {
    hateSpeech: false,
    violence: false,
    sexualContent: false,
    dangerousContent: false,
    harassmentBullying: false,
    legalClaims: false,
    pricingInfo: false,
    allPassed: true,
    flaggedReasons: [],
    ...overrides,
  };
}

function makeContent(overrides?: Partial<GeneratedContent>): GeneratedContent {
  return {
    caption: 'Check out our latest update today.',
    platform: 'instagram',
    userId: 'user-123',
    ...overrides,
  };
}

function makeConfidenceScore(
  overall = 90,
  recommendation: 'auto_approve' | 'manual_review' | 'auto_reject' = 'auto_approve',
) {
  return {
    overall,
    breakdown: {
      characterLimitValid: true,
      brandVoiceAlignment: 85,
      hookQuality: 80,
      ctaPresence: true,
      hashtagAppropriate: true,
    },
    reasoning: 'Good quality content',
    recommendation,
  };
}

function resetTxMocks(): void {
  for (const key of Object.keys(mockTx)) {
    const fn = mockTx[key];
    if (fn && typeof fn.mockReset === 'function') {
      fn.mockReset();
    }
  }
  mockTx.insert.mockReturnThis();
  mockTx.values.mockReturnThis();
  mockTx.update.mockReturnThis();
  mockTx.set.mockReturnThis();
  mockTx.where.mockReturnThis();
}

// ============================================
// TESTS: calculatePriority (pure function)
// ============================================

describe('calculatePriority', () => {
  it('should return low priority for safe, high-confidence content', () => {
    const content = makeContent();
    const safety = makeSafetyChecks();
    const result = calculatePriority(content, 95, safety);

    expect(result.level).toBe('low');
    expect(result.score).toBeLessThan(20);
  });

  it('should return urgent when scheduled within 4 hours', () => {
    const soon = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const content = makeContent({ scheduledFor: soon });
    const safety = makeSafetyChecks();
    const result = calculatePriority(content, 95, safety);

    expect(result.score).toBeGreaterThanOrEqual(50);
  });

  it('should return high when scheduled within 24 hours', () => {
    const in12Hours = new Date(Date.now() + 12 * 60 * 60 * 1000);
    const content = makeContent({ scheduledFor: in12Hours });
    const safety = makeSafetyChecks();
    const result = calculatePriority(content, 95, safety);

    expect(result.score).toBeGreaterThanOrEqual(30);
  });

  it('should increase priority for low confidence (<70)', () => {
    const content = makeContent();
    const safety = makeSafetyChecks();
    const result = calculatePriority(content, 50, safety);

    expect(result.score).toBeGreaterThanOrEqual(40);
    expect(['high', 'urgent']).toContain(result.level);
  });

  it('should increase priority for medium confidence (<85)', () => {
    const content = makeContent();
    const safety = makeSafetyChecks();
    const result = calculatePriority(content, 80, safety);

    expect(result.score).toBeGreaterThanOrEqual(20);
  });

  it('should increase priority for legal claims', () => {
    const content = makeContent();
    const safety = makeSafetyChecks({ legalClaims: true });
    const result = calculatePriority(content, 95, safety);

    expect(result.score).toBeGreaterThanOrEqual(30);
  });

  it('should increase priority for pricing info', () => {
    const content = makeContent();
    const safety = makeSafetyChecks({ pricingInfo: true });
    const result = calculatePriority(content, 95, safety);

    expect(result.score).toBeGreaterThanOrEqual(20);
  });

  it('should increase priority for failed safety checks', () => {
    const content = makeContent();
    const safety = makeSafetyChecks({ allPassed: false });
    const result = calculatePriority(content, 95, safety);

    expect(result.score).toBeGreaterThanOrEqual(25);
  });

  it('should increase priority for product launch content', () => {
    const content = makeContent({ caption: 'Introducing our new product line!' });
    const safety = makeSafetyChecks();
    const result = calculatePriority(content, 95, safety);

    expect(result.score).toBeGreaterThanOrEqual(35);
  });

  it('should return urgent for combined risk factors', () => {
    const soon = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour
    const content = makeContent({
      caption: 'Introducing our new launch!',
      scheduledFor: soon,
    });
    const safety = makeSafetyChecks({
      legalClaims: true,
      allPassed: false,
      flaggedReasons: ['legal_claims'],
    });
    const result = calculatePriority(content, 50, safety);

    expect(result.level).toBe('urgent');
    expect(result.score).toBeGreaterThanOrEqual(80);
  });
});

// ============================================
// TESTS: evaluateContent
// ============================================

describe('evaluateContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should combine confidence scoring and safety checks', async () => {
    const confidenceScore = makeConfidenceScore(92, 'auto_approve');
    mockEvaluateConfidence.mockResolvedValueOnce(confidenceScore);

    const content = makeContent();
    const result = await evaluateContent(content);

    expect(result.confidenceScore).toEqual(confidenceScore);
    expect(result.safetyChecks.allPassed).toBe(true);
    expect(result.priority).toBeDefined();
    expect(result.shouldAutoApprove).toBe(true);
    expect(result.complianceFlags).toEqual([]);
  });

  it('should not auto-approve if confidence recommendation is manual_review', async () => {
    const confidenceScore = makeConfidenceScore(75, 'manual_review');
    mockEvaluateConfidence.mockResolvedValueOnce(confidenceScore);

    const content = makeContent();
    const result = await evaluateContent(content);

    expect(result.shouldAutoApprove).toBe(false);
  });

  it('should flag legal claims in compliance flags', async () => {
    const confidenceScore = makeConfidenceScore(90, 'auto_approve');
    mockEvaluateConfidence.mockResolvedValueOnce(confidenceScore);

    const content = makeContent({ caption: 'FDA approved product guaranteed results' });
    const result = await evaluateContent(content);

    expect(result.complianceFlags).toContain('legal_claim');
    expect(result.safetyChecks.legalClaims).toBe(true);
  });

  it('should flag pricing info in compliance flags', async () => {
    const confidenceScore = makeConfidenceScore(90, 'auto_approve');
    mockEvaluateConfidence.mockResolvedValueOnce(confidenceScore);

    const content = makeContent({ caption: 'Buy now for just $29.99 - 50% discount!' });
    const result = await evaluateContent(content);

    expect(result.complianceFlags).toContain('pricing_info');
    expect(result.safetyChecks.pricingInfo).toBe(true);
  });

  it('should detect hate speech safety flag', async () => {
    const confidenceScore = makeConfidenceScore(80, 'manual_review');
    mockEvaluateConfidence.mockResolvedValueOnce(confidenceScore);

    const content = makeContent({ caption: 'This content has hate speech references' });
    const result = await evaluateContent(content);

    expect(result.safetyChecks.hateSpeech).toBe(true);
    expect(result.safetyChecks.allPassed).toBe(false);
    expect(result.shouldAutoApprove).toBe(false);
  });

  it('should not auto-approve when safety checks fail', async () => {
    const confidenceScore = makeConfidenceScore(98, 'auto_approve');
    mockEvaluateConfidence.mockResolvedValueOnce(confidenceScore);

    const content = makeContent({ caption: 'Contains violence and threats' });
    const result = await evaluateContent(content);

    expect(result.safetyChecks.allPassed).toBe(false);
    expect(result.shouldAutoApprove).toBe(false);
  });
});

// ============================================
// TESTS: addToQueue
// ============================================

describe('addToQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTxMocks();
    mockTx.returning.mockResolvedValue([{ id: 'queue-1', status: 'pending_review', userId: 'user-123' }]);
  });

  it('should add content to queue with pending_review when auto-approve is disabled', async () => {
    const confidenceScore = makeConfidenceScore(98, 'auto_approve');
    mockEvaluateConfidence.mockResolvedValueOnce(confidenceScore);
    mockStorage.getApprovalSettings.mockResolvedValueOnce({ autoApproveEnabled: false });

    const content = makeContent();
    const result = await addToQueue(content);

    expect(result).toBeDefined();
    expect(result.id).toBe('queue-1');
    expect(mockTx.insert).toHaveBeenCalled();
  });

  it('should auto-approve when settings enabled and conditions met', async () => {
    const confidenceScore = makeConfidenceScore(98, 'auto_approve');
    mockEvaluateConfidence.mockResolvedValueOnce(confidenceScore);
    mockStorage.getApprovalSettings.mockResolvedValueOnce({
      autoApproveEnabled: true,
      minConfidenceForAutoApprove: 95,
    });
    mockTx.returning.mockResolvedValueOnce([{ id: 'queue-2', status: 'approved', userId: 'user-123' }]);

    const content = makeContent();
    const result = await addToQueue(content);

    expect(result).toBeDefined();
  });

  it('should not auto-approve when confidence below threshold', async () => {
    const confidenceScore = makeConfidenceScore(80, 'manual_review');
    mockEvaluateConfidence.mockResolvedValueOnce(confidenceScore);
    mockStorage.getApprovalSettings.mockResolvedValueOnce({
      autoApproveEnabled: true,
      minConfidenceForAutoApprove: 95,
    });

    const content = makeContent();
    const result = await addToQueue(content);

    expect(result).toBeDefined();
  });

  it('should use default settings when no settings found', async () => {
    const confidenceScore = makeConfidenceScore(90, 'auto_approve');
    mockEvaluateConfidence.mockResolvedValueOnce(confidenceScore);
    mockStorage.getApprovalSettings.mockResolvedValueOnce(null);

    const content = makeContent();
    const result = await addToQueue(content);

    expect(result).toBeDefined();
  });

  it('should throw when transaction returns undefined', async () => {
    const confidenceScore = makeConfidenceScore(90, 'auto_approve');
    mockEvaluateConfidence.mockResolvedValueOnce(confidenceScore);
    mockStorage.getApprovalSettings.mockResolvedValueOnce(null);
    mockTx.returning.mockResolvedValueOnce([undefined]);

    const content = makeContent();

    await expect(addToQueue(content)).rejects.toThrow('Failed to insert');
  });
});

// ============================================
// TESTS: approveContent
// ============================================

describe('approveContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTxMocks();
  });

  it('should approve content and create audit log', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce({
      id: 'queue-1',
      status: 'pending_review',
      userId: 'user-123',
    });

    await approveContent('queue-1', 'user-123', 'Looks good');

    expect(mockTx.update).toHaveBeenCalled();
    expect(mockTx.insert).toHaveBeenCalled();
  });

  it('should throw when queue item not found', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce(null);

    await expect(approveContent('nonexistent', 'user-123')).rejects.toThrow('not found');
  });

  it('should approve without notes', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce({
      id: 'queue-1',
      status: 'pending_review',
      userId: 'user-123',
    });

    await expect(approveContent('queue-1', 'user-123')).resolves.toBeUndefined();
  });
});

// ============================================
// TESTS: rejectContent
// ============================================

describe('rejectContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTxMocks();
  });

  it('should reject content with reason and create audit log', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce({
      id: 'queue-1',
      status: 'pending_review',
      userId: 'user-123',
    });

    await rejectContent('queue-1', 'user-123', 'Content off-brand');

    expect(mockTx.update).toHaveBeenCalled();
    expect(mockTx.insert).toHaveBeenCalled();
  });

  it('should throw when queue item not found', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce(null);

    await expect(rejectContent('nonexistent', 'user-123', 'reason')).rejects.toThrow('not found');
  });
});

// ============================================
// TESTS: requestRevision
// ============================================

describe('requestRevision', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTxMocks();
  });

  it('should request revision and create audit log', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce({
      id: 'queue-1',
      status: 'pending_review',
      userId: 'user-123',
    });

    await requestRevision('queue-1', 'user-123', 'Please update the CTA');

    expect(mockTx.update).toHaveBeenCalled();
    expect(mockTx.insert).toHaveBeenCalled();
  });

  it('should throw when queue item not found', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce(null);

    await expect(requestRevision('nonexistent', 'user-123', 'notes')).rejects.toThrow('not found');
  });
});

// ============================================
// TESTS: bulkApprove
// ============================================

describe('bulkApprove', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTxMocks();
  });

  it('should approve all items successfully', async () => {
    mockStorage.getApprovalQueue
      .mockResolvedValueOnce({ id: 'q-1', status: 'pending_review' })
      .mockResolvedValueOnce({ id: 'q-2', status: 'pending_review' });

    const result = await bulkApprove(['q-1', 'q-2'], 'user-123');

    expect(result.succeeded).toEqual(['q-1', 'q-2']);
    expect(result.failed).toHaveLength(0);
  });

  it('should handle mixed success and failure', async () => {
    mockStorage.getApprovalQueue
      .mockResolvedValueOnce({ id: 'q-1', status: 'pending_review' })
      .mockResolvedValueOnce(null); // Second item not found

    const result = await bulkApprove(['q-1', 'q-2'], 'user-123');

    expect(result.succeeded).toEqual(['q-1']);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0]?.id).toBe('q-2');
    expect(result.failed[0]?.error).toContain('not found');
  });

  it('should handle empty array', async () => {
    const result = await bulkApprove([], 'user-123');

    expect(result.succeeded).toHaveLength(0);
    expect(result.failed).toHaveLength(0);
  });
});

// ============================================
// TESTS: scheduleApprovedContent
// ============================================

describe('scheduleApprovedContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetTxMocks();
  });

  it('should schedule approved content and update queue status', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce({
      id: 'queue-1',
      userId: 'user-123',
      status: 'approved',
      adCopyId: 'ad-1',
      generationId: 'gen-1',
    });
    mockStorage.getAdCopyById.mockResolvedValueOnce({
      caption: 'Product caption',
      hashtags: ['#product'],
    });
    mockStorage.getGenerationById.mockResolvedValueOnce({
      id: 'gen-1',
      generatedImagePath: 'https://example.com/image.jpg',
    });
    mockSchedulePost.mockResolvedValueOnce({ id: 'scheduled-1' });

    const result = await scheduleApprovedContent('queue-1', 'user-123', {
      connectionId: 'conn-1',
      scheduledFor: '2026-03-01T10:00:00Z',
      timezone: 'UTC',
    });

    expect(result.id).toBe('scheduled-1');
    expect(mockSchedulePost).toHaveBeenCalled();
  });

  it('should throw when queue item not found', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce(null);

    await expect(
      scheduleApprovedContent('nonexistent', 'user-123', {
        connectionId: 'conn-1',
        scheduledFor: '2026-03-01T10:00:00Z',
      }),
    ).rejects.toThrow('not found');
  });

  it('should throw when user does not own the item', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce({
      id: 'queue-1',
      userId: 'other-user',
      status: 'approved',
    });

    await expect(
      scheduleApprovedContent('queue-1', 'user-123', {
        connectionId: 'conn-1',
        scheduledFor: '2026-03-01T10:00:00Z',
      }),
    ).rejects.toThrow('Unauthorized');
  });

  it('should throw when item is not in approved status', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce({
      id: 'queue-1',
      userId: 'user-123',
      status: 'pending_review',
    });

    await expect(
      scheduleApprovedContent('queue-1', 'user-123', {
        connectionId: 'conn-1',
        scheduledFor: '2026-03-01T10:00:00Z',
      }),
    ).rejects.toThrow('must be approved');
  });

  it('should throw when no caption found (no adCopy)', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce({
      id: 'queue-1',
      userId: 'user-123',
      status: 'approved',
      adCopyId: null,
      generationId: null,
    });

    await expect(
      scheduleApprovedContent('queue-1', 'user-123', {
        connectionId: 'conn-1',
        scheduledFor: '2026-03-01T10:00:00Z',
      }),
    ).rejects.toThrow('No caption found');
  });

  it('should throw when adCopy not found in storage', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce({
      id: 'queue-1',
      userId: 'user-123',
      status: 'approved',
      adCopyId: 'missing-ad',
      generationId: null,
    });
    mockStorage.getAdCopyById.mockResolvedValueOnce(null);

    await expect(
      scheduleApprovedContent('queue-1', 'user-123', {
        connectionId: 'conn-1',
        scheduledFor: '2026-03-01T10:00:00Z',
      }),
    ).rejects.toThrow('AdCopy');
  });

  it('should throw when generation not found', async () => {
    mockStorage.getApprovalQueue.mockResolvedValueOnce({
      id: 'queue-1',
      userId: 'user-123',
      status: 'approved',
      adCopyId: 'ad-1',
      generationId: 'missing-gen',
    });
    mockStorage.getAdCopyById.mockResolvedValueOnce({
      caption: 'Caption',
      hashtags: [],
    });
    mockStorage.getGenerationById.mockResolvedValueOnce(null);

    await expect(
      scheduleApprovedContent('queue-1', 'user-123', {
        connectionId: 'conn-1',
        scheduledFor: '2026-03-01T10:00:00Z',
      }),
    ).rejects.toThrow('Generation');
  });
});

// ============================================
// TESTS: Delegated functions
// ============================================

describe('getQueueForUser', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return queue items for user', async () => {
    const mockItems = [{ id: 'q-1', userId: 'user-123', status: 'pending_review' }];
    mockStorage.getApprovalQueueForUser.mockResolvedValueOnce(mockItems);

    const result = await getQueueForUser('user-123');

    expect(result).toEqual(mockItems);
    expect(mockStorage.getApprovalQueueForUser).toHaveBeenCalledWith('user-123', undefined);
  });

  it('should pass filters to storage', async () => {
    mockStorage.getApprovalQueueForUser.mockResolvedValueOnce([]);

    const filters = { status: 'pending_review' as const, platform: 'instagram' };
    await getQueueForUser('user-123', filters);

    expect(mockStorage.getApprovalQueueForUser).toHaveBeenCalledWith('user-123', filters);
  });
});

describe('getAuditLog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return audit log for queue item', async () => {
    const mockLog = [{ id: 'log-1', eventType: 'created' }];
    mockStorage.getApprovalAuditLog.mockResolvedValueOnce(mockLog);

    const result = await getAuditLog('queue-1');

    expect(result).toEqual(mockLog);
    expect(mockStorage.getApprovalAuditLog).toHaveBeenCalledWith('queue-1');
  });
});

describe('getApprovalSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should return settings for user', async () => {
    const mockSettings = { autoApproveEnabled: true, minConfidenceForAutoApprove: 90 };
    mockStorage.getApprovalSettings.mockResolvedValueOnce(mockSettings);

    const result = await getApprovalSettings('user-123');

    expect(result).toEqual(mockSettings);
  });

  it('should return null when no settings exist', async () => {
    mockStorage.getApprovalSettings.mockResolvedValueOnce(null);

    const result = await getApprovalSettings('user-123');

    expect(result).toBeNull();
  });
});

describe('updateApprovalSettings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('should update and return settings', async () => {
    const updated = { autoApproveEnabled: false, minConfidenceForAutoApprove: 95 };
    mockStorage.updateApprovalSettings.mockResolvedValueOnce(updated);

    const result = await updateApprovalSettings('user-123', { autoApproveEnabled: false });

    expect(result).toEqual(updated);
    expect(mockStorage.updateApprovalSettings).toHaveBeenCalledWith('user-123', { autoApproveEnabled: false });
  });
});
