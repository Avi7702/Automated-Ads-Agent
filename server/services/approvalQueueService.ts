/**
 * Approval Queue Service - Phase 8.0 HITL Approval System
 *
 * Manages the complete approval workflow for AI-generated content:
 * 1. AI Quality Gate - Confidence scoring and safety checks
 * 2. Human Review - Priority-based queue management
 * 3. Audit Trail - Complete compliance tracking
 *
 * Flow:
 * Content → AI Evaluation → Priority Calculation → Queue → Human Decision → Audit Log
 */

import { logger } from '../lib/logger';
import { storage } from '../storage';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { approvalQueue, approvalAuditLog } from '@shared/schema';
import { evaluateContent as evaluateConfidence, type ConfidenceScore } from './confidenceScoringService';
import * as schedulingRepository from './schedulingRepository';
// NOTE: contentSafetyService will be created next, using interface for now
import type { ApprovalQueue, InsertApprovalQueue, ApprovalSettings, ScheduledPost } from '@shared/schema';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Generated content ready for approval workflow
 */
export interface GeneratedContent {
  caption: string;
  platform: 'instagram' | 'linkedin' | 'facebook' | 'twitter' | 'tiktok';
  imageUrl?: string;
  hashtags?: string[];
  userId: string;
  adCopyId?: string;
  generationId?: string;
  scheduledFor?: Date;
}

/**
 * Queue filters for fetching approval items
 */
export interface QueueFilters {
  status?: 'pending_review' | 'approved' | 'rejected' | 'needs_revision' | 'scheduled' | 'published' | 'failed';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  platform?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Safety check results from contentSafetyService
 */
export interface SafetyCheckResults {
  hateSpeech: boolean;
  violence: boolean;
  sexualContent: boolean;
  dangerousContent: boolean;
  harassmentBullying: boolean;
  legalClaims: boolean;
  pricingInfo: boolean;
  allPassed: boolean;
  flaggedReasons: string[];
}

/**
 * Combined AI evaluation result
 */
export interface AIEvaluation {
  confidenceScore: ConfidenceScore;
  safetyChecks: SafetyCheckResults;
  shouldAutoApprove: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  complianceFlags: string[];
}

/**
 * Approval queue item (extended with metadata)
 */
export interface ApprovalQueueItem extends ApprovalQueue {
  // Metadata for display
  platform?: string;
  imageUrl?: string;
  caption?: string;
}

/**
 * Bulk operation result
 */
export interface BulkResult {
  succeeded: string[];
  failed: { id: string; error: string }[];
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate priority score and level based on urgency, confidence, and risk factors
 *
 * Priority Algorithm:
 * - Urgency (scheduling): +50 if <4h, +30 if <24h
 * - Low confidence: +40 if <70%, +20 if <85%
 * - Risk factors: +30 legal claims, +20 pricing, +25 high-risk campaign
 * - Business importance: +35 product launch
 *
 * Thresholds:
 * - ≥80: urgent
 * - ≥40: high
 * - <40: medium/standard
 */
export function calculatePriority(
  content: GeneratedContent,
  confidenceScore: number,
  safetyChecks: SafetyCheckResults,
): { score: number; level: 'low' | 'medium' | 'high' | 'urgent' } {
  let score = 0;

  // URGENCY FACTORS (time-sensitive scheduling)
  if (content.scheduledFor) {
    const now = new Date();
    const hoursUntilScheduled = (content.scheduledFor.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilScheduled < 4) {
      score += 50; // Very urgent - scheduled in next 4 hours
    } else if (hoursUntilScheduled < 24) {
      score += 30; // Urgent - scheduled in next 24 hours
    }
  }

  // CONFIDENCE FACTORS (AI quality assessment)
  if (confidenceScore < 70) {
    score += 40; // Low confidence - needs careful review
  } else if (confidenceScore < 85) {
    score += 20; // Medium confidence - needs review
  }

  // RISK FACTORS (compliance and safety)
  if (safetyChecks.legalClaims) {
    score += 30; // Contains legal claims - high risk
  }
  if (safetyChecks.pricingInfo) {
    score += 20; // Contains pricing - needs verification
  }
  if (!safetyChecks.allPassed) {
    score += 25; // Failed safety checks - high priority review
  }

  // BUSINESS IMPORTANCE (campaign context)
  // Note: This would require additional metadata about campaign type
  // For now, we use caption keywords as heuristic
  const isProductLaunch = /launch|new product|introducing/i.test(content.caption);
  if (isProductLaunch) {
    score += 35;
  }

  // Determine priority level from score
  let level: 'low' | 'medium' | 'high' | 'urgent';
  if (score >= 80) {
    level = 'urgent';
  } else if (score >= 40) {
    level = 'high';
  } else if (score >= 20) {
    level = 'medium';
  } else {
    level = 'low';
  }

  logger.info({ module: 'ApprovalQueue', score, level, confidenceScore }, 'Priority calculated');

  return { score, level };
}

/**
 * Check if content contains legal claims (for compliance flagging)
 */
function checkLegalClaims(caption: string): boolean {
  const legalPatterns = [
    /guaranteed|warranty|certified|proven|clinical(ly)?\s+proven/i,
    /\d+%\s+(guaranteed|effective|success)/i,
    /scientifically\s+proven|dermatologist\s+tested/i,
    /FDA\s+approved|doctor\s+recommended/i,
    /money\s+back\s+guarantee/i,
  ];

  return legalPatterns.some((pattern) => pattern.test(caption));
}

/**
 * Check if content contains pricing information (for compliance flagging)
 */
function checkPricingInfo(caption: string): boolean {
  const pricingPatterns = [
    /\$\d+|\d+\s*USD|€\d+|£\d+/i,
    /price|pricing|cost|discount|sale|off|save/i,
    /\d+%\s+off|\d+%\s+discount/i,
    /buy\s+now|order\s+now|purchase/i,
  ];

  return pricingPatterns.some((pattern) => pattern.test(caption));
}

/**
 * Run safety checks on content
 * NOTE: This is a placeholder implementation until contentSafetyService is created
 * The actual implementation will use Gemini's safety API
 */
async function runSafetyChecks(content: GeneratedContent): Promise<SafetyCheckResults> {
  // For now, use simple keyword-based checks
  // TODO: Replace with contentSafetyService.evaluateSafety() when implemented

  const caption = content.caption.toLowerCase();

  const hateSpeech = /hate|racist|sexist|discriminat/i.test(caption);
  const violence = /violence|weapon|attack|kill/i.test(caption);
  const sexualContent = /explicit|sexual|adult/i.test(caption);
  const dangerousContent = /dangerous|harmful|illegal/i.test(caption);
  const harassmentBullying = /harass|bully|threaten/i.test(caption);
  const legalClaims = checkLegalClaims(content.caption);
  const pricingInfo = checkPricingInfo(content.caption);

  const allPassed = !(hateSpeech || violence || sexualContent || dangerousContent || harassmentBullying);

  const flaggedReasons: string[] = [];
  if (hateSpeech) flaggedReasons.push('hate_speech');
  if (violence) flaggedReasons.push('violence');
  if (sexualContent) flaggedReasons.push('sexual_content');
  if (dangerousContent) flaggedReasons.push('dangerous_content');
  if (harassmentBullying) flaggedReasons.push('harassment_bullying');
  if (legalClaims) flaggedReasons.push('legal_claims');
  if (pricingInfo) flaggedReasons.push('pricing_info');

  return {
    hateSpeech,
    violence,
    sexualContent,
    dangerousContent,
    harassmentBullying,
    legalClaims,
    pricingInfo,
    allPassed,
    flaggedReasons,
  };
}

// ============================================================================
// CORE SERVICE FUNCTIONS
// ============================================================================

/**
 * Evaluate content with AI (confidence scoring + safety checks)
 * Returns combined AIEvaluation with auto-approve recommendation
 */
export async function evaluateContent(content: GeneratedContent): Promise<AIEvaluation> {
  logger.info(
    { module: 'ApprovalQueue', userId: content.userId, platform: content.platform },
    'Starting AI content evaluation',
  );

  // Step 1: Run confidence scoring
  const confidenceScore = await evaluateConfidence({
    caption: content.caption,
    platform: content.platform,
    ...(content.imageUrl !== undefined && { imageUrl: content.imageUrl }),
    ...(content.hashtags !== undefined && { hashtags: content.hashtags }),
    userId: content.userId,
  });

  // Step 2: Run safety checks
  const safetyChecks = await runSafetyChecks(content);

  // Step 3: Calculate priority
  const priority = calculatePriority(content, confidenceScore.overall, safetyChecks);

  // Step 4: Determine auto-approve eligibility
  const shouldAutoApprove =
    confidenceScore.recommendation === 'auto_approve' && safetyChecks.allPassed && priority.level !== 'urgent';

  // Step 5: Build compliance flags
  const complianceFlags: string[] = [];
  if (safetyChecks.legalClaims) complianceFlags.push('legal_claim');
  if (safetyChecks.pricingInfo) complianceFlags.push('pricing_info');
  if (!safetyChecks.allPassed) complianceFlags.push(...safetyChecks.flaggedReasons);

  logger.info(
    {
      module: 'ApprovalQueue',
      confidenceScore: confidenceScore.overall,
      safetyPassed: safetyChecks.allPassed,
      priority: priority.level,
      shouldAutoApprove,
    },
    'AI evaluation complete',
  );

  return {
    confidenceScore,
    safetyChecks,
    shouldAutoApprove,
    priority: priority.level,
    complianceFlags,
  };
}

/**
 * Add content to approval queue
 * Runs AI evaluation, calculates priority, and optionally auto-approves
 */
export async function addToQueue(content: GeneratedContent): Promise<ApprovalQueueItem> {
  logger.info({ module: 'ApprovalQueue', userId: content.userId }, 'Adding content to approval queue');

  // Step 1: Run AI evaluation
  const evaluation = await evaluateContent(content);

  // Step 2: Check auto-approve settings
  const settings = await storage.getApprovalSettings(content.userId);
  const autoApproveEnabled = settings?.autoApproveEnabled ?? false;
  const minConfidenceForAutoApprove = settings?.minConfidenceForAutoApprove ?? 95;

  // Step 3: Determine if auto-approve should be applied
  const shouldAutoApprove =
    autoApproveEnabled &&
    evaluation.shouldAutoApprove &&
    evaluation.confidenceScore.overall >= minConfidenceForAutoApprove;

  // Step 4: Create approval queue record
  const queueData: InsertApprovalQueue = {
    userId: content.userId,
    adCopyId: content.adCopyId ?? null,
    generationId: content.generationId ?? null,
    status: shouldAutoApprove ? 'approved' : 'pending_review',
    priority: evaluation.priority,
    aiConfidenceScore: evaluation.confidenceScore.overall,
    aiRecommendation:
      evaluation.confidenceScore.recommendation === 'manual_review'
        ? 'human_review'
        : evaluation.confidenceScore.recommendation === 'auto_reject'
          ? 'reject'
          : evaluation.confidenceScore.recommendation,
    aiReasoning: evaluation.confidenceScore.reasoning,
    safetyChecksPassed: {
      hateSpeech: evaluation.safetyChecks.hateSpeech,
      violence: evaluation.safetyChecks.violence,
      sexualContent: evaluation.safetyChecks.sexualContent,
      dangerousContent: evaluation.safetyChecks.dangerousContent,
      harassmentBullying: evaluation.safetyChecks.harassmentBullying,
    },
    complianceFlags: evaluation.complianceFlags,
    scheduledFor: content.scheduledFor ?? null,
    reviewedBy: shouldAutoApprove ? null : null,
    reviewedAt: shouldAutoApprove ? new Date() : null,
  };

  // Step 5: Create queue item + audit log atomically
  const queueItem = await db.transaction(async (tx) => {
    const items = await tx
      .insert(approvalQueue)
      .values({ ...queueData, createdAt: new Date(), updatedAt: new Date() } as typeof approvalQueue.$inferInsert)
      .returning();
    const item = items[0];
    if (!item) throw new Error('Failed to insert approval queue item');

    await tx.insert(approvalAuditLog).values({
      approvalQueueId: item.id,
      eventType: shouldAutoApprove ? 'auto_approved' : 'created',
      userId: content.userId,
      userName: null,
      userRole: null,
      isSystemAction: shouldAutoApprove,
      previousStatus: null,
      newStatus: item.status,
      decision: shouldAutoApprove ? 'approve' : null,
      decisionReason: shouldAutoApprove ? 'Auto-approved based on high confidence and safety checks' : null,
      decisionNotes: null,
      snapshot: {
        caption: content.caption,
        platform: content.platform,
        ...(content.imageUrl !== undefined && { imageUrl: content.imageUrl }),
        ...(content.hashtags !== undefined && { hashtags: content.hashtags }),
      },
      createdAt: new Date(),
    });

    return item;
  });

  if (!queueItem) throw new Error('Transaction returned undefined');

  logger.info(
    {
      module: 'ApprovalQueue',
      queueItemId: queueItem.id,
      status: queueItem.status,
      autoApproved: shouldAutoApprove,
    },
    'Content added to approval queue',
  );

  return queueItem as ApprovalQueueItem;
}

/**
 * Get approval queue items for a user with optional filters
 */
export async function getQueueForUser(userId: string, filters?: QueueFilters): Promise<ApprovalQueueItem[]> {
  logger.info({ module: 'ApprovalQueue', userId, filters }, 'Fetching approval queue items');

  const items = await storage.getApprovalQueueForUser(userId, filters);

  return items as ApprovalQueueItem[];
}

// ============================================================================
// APPROVAL → SCHEDULE BRIDGE
// ============================================================================

export interface ScheduleParams {
  connectionId: string;
  scheduledFor: string; // ISO 8601
  timezone?: string;
}

/**
 * Schedule an already-approved queue item.
 * Fetches content from adCopy or generation, creates a scheduled post,
 * updates queue status to 'scheduled', and logs an audit entry.
 */
export async function scheduleApprovedContent(
  queueItemId: string,
  userId: string,
  scheduleParams: ScheduleParams,
): Promise<ScheduledPost> {
  logger.info({ module: 'ApprovalQueue', queueItemId, userId }, 'Scheduling approved content');

  // Step 1: Fetch the queue item
  const queueItem = await storage.getApprovalQueue(queueItemId);
  if (!queueItem) {
    throw new Error(`Approval queue item ${queueItemId} not found`);
  }

  // Step 2: Verify ownership and status
  if (queueItem.userId !== userId) {
    const err = new Error('Unauthorized: You do not own this item');
    (err as NodeJS.ErrnoException).code = '403';
    throw err;
  }
  if (queueItem.status !== 'approved') {
    throw new Error(`Cannot schedule item with status '${queueItem.status}'. Item must be approved first.`);
  }

  // Step 3: Prevent double-scheduling (queue item already moved to 'scheduled')
  // The status check above covers this: once scheduled, status = 'scheduled', not 'approved'

  // Step 4: Resolve caption, hashtags, imageUrl from linked content
  let caption = '';
  let hashtags: string[] = [];
  let imageUrl: string | undefined;
  let generationId: string | undefined;

  if (queueItem.adCopyId) {
    const adCopy = await storage.getAdCopyById(queueItem.adCopyId);
    if (!adCopy) {
      throw new Error(`AdCopy ${queueItem.adCopyId} not found`);
    }
    caption = adCopy.caption;
    hashtags = adCopy.hashtags ?? [];
  }

  if (queueItem.generationId) {
    const generation = await storage.getGenerationById(queueItem.generationId);
    if (!generation) {
      throw new Error(`Generation ${queueItem.generationId} not found`);
    }
    imageUrl = generation.generatedImagePath;
    generationId = generation.id;
  }

  if (!caption) {
    throw new Error('No caption found: queue item must have an associated adCopy');
  }

  // Step 5: Create the scheduled post
  const scheduleInput: Parameters<typeof schedulingRepository.schedulePost>[0] = {
    userId,
    connectionId: scheduleParams.connectionId,
    caption,
    hashtags,
    scheduledFor: new Date(scheduleParams.scheduledFor),
    timezone: scheduleParams.timezone ?? 'UTC',
  };
  if (imageUrl !== undefined) {
    scheduleInput.imageUrl = imageUrl;
  }
  if (generationId !== undefined) {
    scheduleInput.generationId = generationId;
  }
  const scheduledPost = await schedulingRepository.schedulePost(scheduleInput);

  // Step 6: Update queue status to 'scheduled' + audit log
  const previousStatus = queueItem.status;
  await db.transaction(async (tx) => {
    await tx
      .update(approvalQueue)
      .set({ status: 'scheduled', updatedAt: new Date() })
      .where(eq(approvalQueue.id, queueItemId));

    await tx.insert(approvalAuditLog).values({
      approvalQueueId: queueItemId,
      eventType: 'scheduled',
      userId,
      userName: null,
      userRole: null,
      isSystemAction: false,
      previousStatus,
      newStatus: 'scheduled',
      decision: null,
      decisionReason: null,
      decisionNotes: `Scheduled for ${scheduleParams.scheduledFor}`,
      snapshot: null,
      createdAt: new Date(),
    });
  });

  logger.info({ module: 'ApprovalQueue', queueItemId, scheduledPostId: scheduledPost.id }, 'Content scheduled');

  return scheduledPost;
}

/**
 * Approve content
 * Updates status, records reviewer, and creates audit log
 */
export async function approveContent(queueItemId: string, userId: string, notes?: string): Promise<void> {
  logger.info({ module: 'ApprovalQueue', queueItemId, userId }, 'Approving content');

  // Step 1: Get queue item
  const queueItem = await storage.getApprovalQueue(queueItemId);
  if (!queueItem) {
    throw new Error(`Approval queue item ${queueItemId} not found`);
  }

  // Step 2+3: Update status + create audit log atomically
  const previousStatus = queueItem.status;
  await db.transaction(async (tx) => {
    await tx
      .update(approvalQueue)
      .set({
        status: 'approved',
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: notes ?? null,
        updatedAt: new Date(),
      })
      .where(eq(approvalQueue.id, queueItemId));

    await tx.insert(approvalAuditLog).values({
      approvalQueueId: queueItemId,
      eventType: 'approved',
      userId,
      userName: null,
      userRole: null,
      isSystemAction: false,
      previousStatus,
      newStatus: 'approved',
      decision: 'approve',
      decisionReason: null,
      decisionNotes: notes ?? null,
      snapshot: null,
      createdAt: new Date(),
    });
  });

  logger.info({ module: 'ApprovalQueue', queueItemId, previousStatus }, 'Content approved');
}

/**
 * Reject content
 * Updates status, records rejection reason, and creates audit log
 */
export async function rejectContent(queueItemId: string, userId: string, reason: string): Promise<void> {
  logger.info({ module: 'ApprovalQueue', queueItemId, userId }, 'Rejecting content');

  // Step 1: Get queue item
  const queueItem = await storage.getApprovalQueue(queueItemId);
  if (!queueItem) {
    throw new Error(`Approval queue item ${queueItemId} not found`);
  }

  // Step 2+3: Update status + create audit log atomically
  const previousStatus = queueItem.status;
  await db.transaction(async (tx) => {
    await tx
      .update(approvalQueue)
      .set({
        status: 'rejected',
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: reason,
        updatedAt: new Date(),
      })
      .where(eq(approvalQueue.id, queueItemId));

    await tx.insert(approvalAuditLog).values({
      approvalQueueId: queueItemId,
      eventType: 'rejected',
      userId,
      userName: null,
      userRole: null,
      isSystemAction: false,
      previousStatus,
      newStatus: 'rejected',
      decision: 'reject',
      decisionReason: reason,
      decisionNotes: null,
      snapshot: null,
      createdAt: new Date(),
    });
  });

  logger.info({ module: 'ApprovalQueue', queueItemId, previousStatus }, 'Content rejected');
}

/**
 * Bulk approve multiple items
 * Returns success/failure for each item
 */
export async function bulkApprove(queueItemIds: string[], userId: string): Promise<BulkResult> {
  logger.info({ module: 'ApprovalQueue', count: queueItemIds.length, userId }, 'Starting bulk approve');

  const succeeded: string[] = [];
  const failed: { id: string; error: string }[] = [];

  for (const itemId of queueItemIds) {
    try {
      await approveContent(itemId, userId, 'Bulk approved');
      succeeded.push(itemId);
    } catch (error) {
      failed.push({
        id: itemId,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  logger.info(
    {
      module: 'ApprovalQueue',
      succeeded: succeeded.length,
      failed: failed.length,
    },
    'Bulk approve complete',
  );

  return { succeeded, failed };
}

/**
 * Request revision for content
 * Updates status and creates audit log with revision notes
 */
export async function requestRevision(queueItemId: string, userId: string, revisionNotes: string): Promise<void> {
  logger.info({ module: 'ApprovalQueue', queueItemId, userId }, 'Requesting revision');

  const queueItem = await storage.getApprovalQueue(queueItemId);
  if (!queueItem) {
    throw new Error(`Approval queue item ${queueItemId} not found`);
  }

  const previousStatus = queueItem.status;
  await db.transaction(async (tx) => {
    await tx
      .update(approvalQueue)
      .set({
        status: 'needs_revision',
        reviewedBy: userId,
        reviewedAt: new Date(),
        reviewNotes: revisionNotes,
        updatedAt: new Date(),
      })
      .where(eq(approvalQueue.id, queueItemId));

    await tx.insert(approvalAuditLog).values({
      approvalQueueId: queueItemId,
      eventType: 'needs_revision',
      userId,
      userName: null,
      userRole: null,
      isSystemAction: false,
      previousStatus,
      newStatus: 'needs_revision',
      decision: 'request_revision',
      decisionReason: revisionNotes,
      decisionNotes: null,
      snapshot: null,
      createdAt: new Date(),
    });
  });

  logger.info({ module: 'ApprovalQueue', queueItemId }, 'Revision requested');
}

/**
 * Get approval audit log for a queue item
 * Returns complete history of all decisions and state changes
 */
export async function getAuditLog(queueItemId: string) {
  return await storage.getApprovalAuditLog(queueItemId);
}

/**
 * Get approval settings for a user
 */
export async function getApprovalSettings(userId: string): Promise<ApprovalSettings | null> {
  return await storage.getApprovalSettings(userId);
}

/**
 * Update approval settings for a user
 */
export async function updateApprovalSettings(
  userId: string,
  settings: Partial<ApprovalSettings>,
): Promise<ApprovalSettings> {
  return await storage.updateApprovalSettings(userId, settings);
}
