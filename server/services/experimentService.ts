/**
 * Experiment Service — A/B Testing for Prompt Variants
 *
 * Provides consistent variant assignment per user using deterministic hashing,
 * so the same user always sees the same variant for a given experiment.
 */

import crypto from 'crypto';
import { db } from '../db';
import { experiments, experimentAssignments, experimentOutcomes } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../lib/logger';

interface VariantDef {
  id: string;
  name: string;
  promptId?: string;
  promptVersion?: string;
  weight: number; // 0-100, weights across variants should sum to 100
}

/**
 * Deterministic hash-based variant assignment.
 * Same userId + experimentId always produces the same bucket.
 */
function hashAssign(userId: string, experimentId: string, variants: VariantDef[]): VariantDef {
  const hash = crypto.createHash('sha256').update(`${experimentId}:${userId}`).digest();

  // Use first 4 bytes as a uint32, mod 100 for bucket
  const bucket = hash.readUInt32BE(0) % 100;

  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (bucket < cumulative) {
      return variant;
    }
  }

  // Fallback to last variant (shouldn't happen if weights sum to 100)
  return variants[variants.length - 1] ?? variants[0]!;
}

/**
 * Assign a user to a variant for an experiment.
 * Returns existing assignment if one exists, otherwise creates a new one.
 */
export async function assignVariant(
  userId: string,
  experimentId: string,
): Promise<{ variant: string; isNew: boolean } | null> {
  try {
    // Check for existing assignment
    const existing = await db
      .select()
      .from(experimentAssignments)
      .where(and(eq(experimentAssignments.experimentId, experimentId), eq(experimentAssignments.userId, userId)))
      .limit(1);

    if (existing.length > 0 && existing[0]) {
      return { variant: existing[0].variant, isNew: false };
    }

    // Get experiment
    const [experiment] = await db.select().from(experiments).where(eq(experiments.id, experimentId)).limit(1);

    if (!experiment || experiment.status !== 'running') {
      return null;
    }

    const variants = experiment.variants as VariantDef[];
    if (!variants || variants.length === 0) {
      return null;
    }

    // Check traffic enrollment
    if (experiment.trafficPercent < 100) {
      const trafficHash =
        crypto.createHash('sha256').update(`traffic:${experimentId}:${userId}`).digest().readUInt32BE(0) % 100;

      if (trafficHash >= experiment.trafficPercent) {
        return null; // User not enrolled in this experiment
      }
    }

    // Assign variant
    const assigned = hashAssign(userId, experimentId, variants);

    await db.insert(experimentAssignments).values({
      experimentId,
      userId,
      variant: assigned.id,
    });

    logger.info({ experimentId, userId, variant: assigned.id }, 'User assigned to experiment variant');

    return { variant: assigned.id, isNew: true };
  } catch (error) {
    logger.error({ experimentId, userId, err: error }, 'Failed to assign variant');
    return null;
  }
}

/**
 * Get all active experiments.
 */
export async function getActiveExperiments() {
  return db.select().from(experiments).where(eq(experiments.status, 'running'));
}

/**
 * Track an outcome metric for an experiment.
 */
export async function trackOutcome(
  experimentId: string,
  userId: string,
  variant: string,
  metric: string,
  value: number = 1,
): Promise<void> {
  try {
    await db.insert(experimentOutcomes).values({
      experimentId,
      userId,
      variant,
      metric,
      value,
    });
  } catch (error) {
    logger.error({ experimentId, userId, metric, err: error }, 'Failed to track outcome');
  }
}

/**
 * Create a new experiment.
 */
export async function createExperiment(data: {
  name: string;
  description?: string;
  variants: VariantDef[];
  trafficPercent?: number;
}): Promise<typeof experiments.$inferSelect> {
  const [experiment] = await db
    .insert(experiments)
    .values({
      name: data.name,
      description: data.description ?? null,
      variants: data.variants,
      trafficPercent: data.trafficPercent ?? 100,
      status: 'draft',
    })
    .returning();

  return experiment!;
}

/**
 * Update experiment status (start, pause, complete).
 */
export async function updateExperimentStatus(
  experimentId: string,
  status: 'running' | 'paused' | 'completed',
): Promise<void> {
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  };

  if (status === 'running') {
    updateData.startedAt = new Date();
  } else if (status === 'completed') {
    updateData.endedAt = new Date();
  }

  await db.update(experiments).set(updateData).where(eq(experiments.id, experimentId));
}

/**
 * Get experiment results with variant-level aggregation.
 */
export async function getExperimentResults(experimentId: string) {
  const [experiment] = await db.select().from(experiments).where(eq(experiments.id, experimentId)).limit(1);

  if (!experiment) return null;

  const assignments = await db
    .select()
    .from(experimentAssignments)
    .where(eq(experimentAssignments.experimentId, experimentId));

  const outcomes = await db.select().from(experimentOutcomes).where(eq(experimentOutcomes.experimentId, experimentId));

  // Aggregate by variant
  const variantStats = new Map<string, { assignments: number; outcomes: Record<string, number> }>();

  for (const a of assignments) {
    if (!variantStats.has(a.variant)) {
      variantStats.set(a.variant, { assignments: 0, outcomes: {} });
    }
    variantStats.get(a.variant)!.assignments++;
  }

  for (const o of outcomes) {
    if (!variantStats.has(o.variant)) {
      variantStats.set(o.variant, { assignments: 0, outcomes: {} });
    }
    const stats = variantStats.get(o.variant)!;
    stats.outcomes[o.metric] = (stats.outcomes[o.metric] ?? 0) + o.value;
  }

  return {
    experiment,
    totalAssignments: assignments.length,
    totalOutcomes: outcomes.length,
    variants: Object.fromEntries(variantStats),
  };
}
