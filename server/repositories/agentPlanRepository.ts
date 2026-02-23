import {
  type AgentPlan,
  type InsertAgentPlan,
  type AgentExecution,
  type InsertAgentExecution,
  agentPlans,
  agentExecutions,
} from '@shared/schema';
import { db } from '../db';
import { and, eq, desc } from 'drizzle-orm';
import { logger } from '../lib/logger';

// ── Agent Plan CRUD ──────────────────────────────────────

export async function createPlan(data: InsertAgentPlan): Promise<AgentPlan> {
  const [plan] = await db
    .insert(agentPlans)
    .values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  logger.info({ userId: data.userId, planId: plan!.id }, 'Agent plan created');
  return plan!;
}

export async function getPlanById(planId: string): Promise<AgentPlan | undefined> {
  const [plan] = await db.select().from(agentPlans).where(eq(agentPlans.id, planId)).limit(1);

  return plan;
}

export async function getPlansByUserId(userId: string, limit = 20): Promise<AgentPlan[]> {
  return db
    .select()
    .from(agentPlans)
    .where(eq(agentPlans.userId, userId))
    .orderBy(desc(agentPlans.createdAt))
    .limit(limit);
}

export async function updatePlan(planId: string, updates: Partial<InsertAgentPlan>): Promise<AgentPlan> {
  const [plan] = await db
    .update(agentPlans)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(agentPlans.id, planId))
    .returning();

  if (!plan) {
    throw new Error(`Agent plan not found: ${planId}`);
  }

  logger.info({ planId, status: plan.status }, 'Agent plan updated');
  return plan;
}

// ── Agent Execution CRUD ─────────────────────────────────

export async function createExecution(data: InsertAgentExecution): Promise<AgentExecution> {
  const [execution] = await db
    .insert(agentExecutions)
    .values({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  logger.info({ planId: data.planId, executionId: execution!.id }, 'Agent execution created');
  return execution!;
}

export async function getExecutionById(executionId: string): Promise<AgentExecution | undefined> {
  const [execution] = await db.select().from(agentExecutions).where(eq(agentExecutions.id, executionId)).limit(1);

  return execution;
}

export async function getExecutionByIdempotencyKey(planId: string, key: string): Promise<AgentExecution | undefined> {
  const [execution] = await db
    .select()
    .from(agentExecutions)
    .where(and(eq(agentExecutions.planId, planId), eq(agentExecutions.idempotencyKey, key)))
    .limit(1);

  return execution;
}

export async function updateExecution(
  executionId: string,
  updates: Partial<InsertAgentExecution>,
): Promise<AgentExecution> {
  const [execution] = await db
    .update(agentExecutions)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(agentExecutions.id, executionId))
    .returning();

  if (!execution) {
    throw new Error(`Agent execution not found: ${executionId}`);
  }

  logger.info({ executionId, status: execution.status }, 'Agent execution updated');
  return execution;
}

export async function updateExecutionIfCurrentStatus(
  executionId: string,
  expectedStatus: string,
  updates: Partial<InsertAgentExecution>,
): Promise<AgentExecution | null> {
  const [execution] = await db
    .update(agentExecutions)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(and(eq(agentExecutions.id, executionId), eq(agentExecutions.status, expectedStatus)))
    .returning();

  if (!execution) {
    logger.info({ executionId, expectedStatus }, 'Agent execution compare-and-set did not match');
    return null;
  }

  logger.info({ executionId, expectedStatus, status: execution.status }, 'Agent execution compare-and-set updated');
  return execution;
}
