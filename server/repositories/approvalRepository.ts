import {
  type ApprovalQueue,
  type InsertApprovalQueue,
  type ApprovalAuditLog,
  type InsertApprovalAuditLog,
  type ApprovalSettings,
  type InsertApprovalSettings,
  approvalQueue,
  approvalAuditLog,
  approvalSettings,
} from '@shared/schema';
import { db } from '../db';
import { and, eq, desc, gte, lte, inArray } from 'drizzle-orm';
import { logger } from '../lib/logger';

export async function createApprovalQueue(data: InsertApprovalQueue): Promise<ApprovalQueue> {
  const [item] = await db
    .insert(approvalQueue)
    .values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as typeof approvalQueue.$inferInsert)
    .returning();

  logger.info({ userId: data.userId, queueItemId: item!.id }, 'Approval queue item created');
  return item!;
}

export async function getApprovalQueue(id: string): Promise<ApprovalQueue | null> {
  const [item] = await db.select().from(approvalQueue).where(eq(approvalQueue.id, id)).limit(1);

  return item || null;
}

export async function getApprovalQueueByIds(ids: string[]): Promise<ApprovalQueue[]> {
  if (ids.length === 0) return [];
  return db.select().from(approvalQueue).where(inArray(approvalQueue.id, ids));
}

export async function getApprovalQueueForUser(
  userId: string,
  filters?: {
    status?: string;
    priority?: string;
    platform?: string;
    dateFrom?: Date;
    dateTo?: Date;
  },
): Promise<ApprovalQueue[]> {
  try {
    const conditions = [eq(approvalQueue.userId, userId)];

    if (filters?.status) {
      conditions.push(eq(approvalQueue.status, filters.status));
    }
    if (filters?.priority) {
      conditions.push(eq(approvalQueue.priority, filters.priority));
    }
    if (filters?.dateFrom) {
      conditions.push(gte(approvalQueue.createdAt, filters.dateFrom));
    }
    if (filters?.dateTo) {
      conditions.push(lte(approvalQueue.createdAt, filters.dateTo));
    }

    return await db
      .select()
      .from(approvalQueue)
      .where(and(...conditions))
      .orderBy(desc(approvalQueue.createdAt));
  } catch (error: unknown) {
    const errorCode = (error as any)?.code;
    if (errorCode === '42P01') {
      logger.warn({ module: 'Storage' }, 'approval_queue table does not exist - returning empty array');
      return [];
    }
    throw error;
  }
}

export async function updateApprovalQueue(id: string, updates: Partial<ApprovalQueue>): Promise<ApprovalQueue> {
  const [item] = await db
    .update(approvalQueue)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(approvalQueue.id, id))
    .returning();

  if (!item) {
    throw new Error(`Approval queue item not found: ${id}`);
  }

  logger.info({ queueItemId: id, status: item.status }, 'Approval queue item updated');
  return item;
}

export async function deleteApprovalQueue(id: string): Promise<void> {
  await db.delete(approvalQueue).where(eq(approvalQueue.id, id));

  logger.info({ queueItemId: id }, 'Approval queue item deleted');
}

export async function createApprovalAuditLog(data: InsertApprovalAuditLog): Promise<ApprovalAuditLog> {
  const [log] = await db
    .insert(approvalAuditLog)
    .values({
      ...data,
      createdAt: new Date(),
    } as typeof approvalAuditLog.$inferInsert)
    .returning();

  logger.info({ approvalQueueId: data.approvalQueueId, eventType: data.eventType }, 'Audit log created');
  return log!;
}

export async function getApprovalAuditLog(approvalQueueId: string): Promise<ApprovalAuditLog[]> {
  return db
    .select()
    .from(approvalAuditLog)
    .where(eq(approvalAuditLog.approvalQueueId, approvalQueueId))
    .orderBy(desc(approvalAuditLog.createdAt));
}

export async function getApprovalSettings(userId: string): Promise<ApprovalSettings | null> {
  const [settingsRow] = await db.select().from(approvalSettings).where(eq(approvalSettings.userId, userId)).limit(1);

  return settingsRow || null;
}

export async function updateApprovalSettings(
  userId: string,
  settingsUpdates: Partial<ApprovalSettings>,
): Promise<ApprovalSettings> {
  const existing = await getApprovalSettings(userId);

  if (existing) {
    const [updated] = await db
      .update(approvalSettings)
      .set({
        ...settingsUpdates,
        updatedAt: new Date(),
      })
      .where(eq(approvalSettings.userId, userId))
      .returning();

    return updated!;
  }

  const [created] = await db
    .insert(approvalSettings)
    .values({
      userId,
      ...settingsUpdates,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as InsertApprovalSettings)
    .returning();

  logger.info({ userId }, 'Approval settings created');
  return created!;
}
