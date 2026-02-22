/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any vi.mock() calls
// ---------------------------------------------------------------------------

const { mockStorage, mockDb, mockSchedulePost } = vi.hoisted(() => {
  const mockStorage = {
    getApprovalQueue: vi.fn(),
    getAdCopyById: vi.fn(),
    getGenerationById: vi.fn(),
  };

  // Minimal drizzle-like db mock: update/insert chains that resolve immediately
  const txMock = {
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    where: vi.fn().mockResolvedValue([]),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockResolvedValue([]),
  };
  const mockDb = {
    transaction: vi.fn((fn: (tx: any) => Promise<any>) => fn(txMock)),
  };

  const mockSchedulePost = vi.fn();

  return { mockStorage, mockDb, mockSchedulePost };
});

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock('../storage', () => ({ storage: mockStorage }));
vi.mock('../db', () => ({ db: mockDb }));
vi.mock('../services/schedulingRepository', () => ({ schedulePost: mockSchedulePost }));
vi.mock('@shared/schema', async (importOriginal) => {
  // Only mock the table refs used in the service; re-export everything else
  const original = await importOriginal<typeof import('@shared/schema')>();
  return {
    ...original,
    approvalQueue: { id: 'id' },
    approvalAuditLog: {},
  };
});

// We also need to silence the confidenceScoringService import inside approvalQueueService
vi.mock('../services/confidenceScoringService', () => ({
  evaluateContent: vi.fn().mockResolvedValue({ overall: 90, recommendation: 'auto_approve', reasoning: 'ok' }),
}));

// ---------------------------------------------------------------------------
// Import the service AFTER mocks are in place
// ---------------------------------------------------------------------------

import { scheduleApprovedContent, approveContent } from '../services/approvalQueueService';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const BASE_QUEUE_ITEM = {
  id: 'queue-1',
  userId: 'user-1',
  status: 'approved' as const,
  adCopyId: 'adcopy-1',
  generationId: 'gen-1',
  priority: 'medium' as const,
  aiConfidenceScore: 90,
  aiRecommendation: 'auto_approve' as const,
  aiReasoning: null,
  safetyChecksPassed: null,
  complianceFlags: [],
  reviewedBy: null,
  reviewedAt: null,
  reviewNotes: null,
  scheduledFor: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const BASE_AD_COPY = {
  id: 'adcopy-1',
  caption: 'Check out our new steel range!',
  hashtags: ['steel', 'quality'],
  platform: 'instagram',
  generationId: 'gen-1',
  userId: 'user-1',
};

const BASE_GENERATION = {
  id: 'gen-1',
  generatedImagePath: 'https://res.cloudinary.com/test/image/upload/sample.jpg',
  imagePath: null,
};

const BASE_SCHEDULED_POST = {
  id: 'sched-1',
  userId: 'user-1',
  connectionId: 'conn-1',
  caption: 'Check out our new steel range!',
  hashtags: ['steel', 'quality'],
  imageUrl: 'https://res.cloudinary.com/test/image/upload/sample.jpg',
  scheduledFor: new Date('2026-03-01T10:00:00Z'),
  timezone: 'UTC',
  status: 'scheduled',
  retryCount: 0,
  generationId: 'gen-1',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const SCHEDULE_PARAMS = {
  connectionId: 'conn-1',
  scheduledFor: '2026-03-01T10:00:00.000Z',
  timezone: 'UTC',
};

// ---------------------------------------------------------------------------
// Tests: scheduleApprovedContent
// ---------------------------------------------------------------------------

describe('scheduleApprovedContent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStorage.getApprovalQueue.mockResolvedValue(BASE_QUEUE_ITEM);
    mockStorage.getAdCopyById.mockResolvedValue(BASE_AD_COPY);
    mockStorage.getGenerationById.mockResolvedValue(BASE_GENERATION);
    mockSchedulePost.mockResolvedValue(BASE_SCHEDULED_POST);
  });

  it('creates a scheduled post and updates queue status to scheduled', async () => {
    const result = await scheduleApprovedContent('queue-1', 'user-1', SCHEDULE_PARAMS);

    // schedulePost was called with the right args
    expect(mockSchedulePost).toHaveBeenCalledOnce();
    expect(mockSchedulePost).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        connectionId: 'conn-1',
        caption: 'Check out our new steel range!',
        hashtags: ['steel', 'quality'],
        imageUrl: 'https://res.cloudinary.com/test/image/upload/sample.jpg',
        generationId: 'gen-1',
      }),
    );

    // Audit transaction was run
    expect(mockDb.transaction).toHaveBeenCalledOnce();

    // Returns the scheduled post
    expect(result.id).toBe('sched-1');
  });

  it('is backward compatible: approveContent without schedule does NOT create a scheduled post', async () => {
    // approveContent uses its own db.transaction; just verify schedulePost is not called
    await approveContent('queue-1', 'user-1', 'Looks good');
    expect(mockSchedulePost).not.toHaveBeenCalled();
  });

  it('throws 403 when a different user tries to schedule', async () => {
    await expect(scheduleApprovedContent('queue-1', 'other-user', SCHEDULE_PARAMS)).rejects.toThrow('Unauthorized');
    expect(mockSchedulePost).not.toHaveBeenCalled();
  });

  it('throws when queue item is not in approved status', async () => {
    mockStorage.getApprovalQueue.mockResolvedValue({ ...BASE_QUEUE_ITEM, status: 'pending_review' });

    await expect(scheduleApprovedContent('queue-1', 'user-1', SCHEDULE_PARAMS)).rejects.toThrow(
      "Cannot schedule item with status 'pending_review'",
    );
    expect(mockSchedulePost).not.toHaveBeenCalled();
  });

  it('throws when queue item is not found', async () => {
    mockStorage.getApprovalQueue.mockResolvedValue(null);

    await expect(scheduleApprovedContent('queue-1', 'user-1', SCHEDULE_PARAMS)).rejects.toThrow('not found');
    expect(mockSchedulePost).not.toHaveBeenCalled();
  });

  it('throws when adCopy is missing caption', async () => {
    // No adCopyId, no caption fallback
    mockStorage.getApprovalQueue.mockResolvedValue({ ...BASE_QUEUE_ITEM, adCopyId: null });

    await expect(scheduleApprovedContent('queue-1', 'user-1', SCHEDULE_PARAMS)).rejects.toThrow('No caption found');
    expect(mockSchedulePost).not.toHaveBeenCalled();
  });

  it('works without a generationId (no image attached)', async () => {
    mockStorage.getApprovalQueue.mockResolvedValue({ ...BASE_QUEUE_ITEM, generationId: null });

    const result = await scheduleApprovedContent('queue-1', 'user-1', SCHEDULE_PARAMS);

    expect(mockSchedulePost).toHaveBeenCalledTimes(1);
    const callArg = mockSchedulePost.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(callArg).not.toHaveProperty('imageUrl');
    expect(callArg).not.toHaveProperty('generationId');
    expect(result.id).toBe('sched-1');
  });

  it('defaults timezone to UTC when not provided', async () => {
    await scheduleApprovedContent('queue-1', 'user-1', {
      connectionId: 'conn-1',
      scheduledFor: '2026-03-01T10:00:00.000Z',
    });

    expect(mockSchedulePost).toHaveBeenCalledWith(expect.objectContaining({ timezone: 'UTC' }));
  });
});
