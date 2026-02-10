/**
 * Training Repository
 * CRUD operations for custom model training datasets and examples
 */

import { db } from '../db';
import {
  trainingDatasets,
  trainingExamples,
  type TrainingDataset,
  type InsertTrainingDataset,
  type TrainingExample,
  type InsertTrainingExample,
} from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

// ─── Dataset CRUD ────────────────────────────────────────────

export async function createTrainingDataset(data: InsertTrainingDataset): Promise<TrainingDataset> {
  const [dataset] = await db.insert(trainingDatasets).values(data).returning();
  if (!dataset) throw new Error('Failed to create training dataset');
  return dataset;
}

export async function getTrainingDatasetById(id: string): Promise<TrainingDataset | undefined> {
  const [dataset] = await db.select().from(trainingDatasets).where(eq(trainingDatasets.id, id));
  return dataset;
}

export async function getTrainingDatasetsByUser(userId: string): Promise<TrainingDataset[]> {
  return db
    .select()
    .from(trainingDatasets)
    .where(eq(trainingDatasets.userId, userId))
    .orderBy(desc(trainingDatasets.createdAt));
}

export async function updateTrainingDataset(
  id: string,
  updates: Partial<InsertTrainingDataset>,
): Promise<TrainingDataset> {
  const [dataset] = await db
    .update(trainingDatasets)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(trainingDatasets.id, id))
    .returning();
  if (!dataset) throw new Error('Training dataset not found');
  return dataset;
}

export async function deleteTrainingDataset(id: string): Promise<void> {
  await db.delete(trainingDatasets).where(eq(trainingDatasets.id, id));
}

// ─── Example CRUD ────────────────────────────────────────────

export async function createTrainingExample(data: InsertTrainingExample): Promise<TrainingExample> {
  const [example] = await db.insert(trainingExamples).values(data).returning();
  if (!example) throw new Error('Failed to create training example');
  return example;
}

export async function getTrainingExamples(datasetId: string): Promise<TrainingExample[]> {
  return db
    .select()
    .from(trainingExamples)
    .where(eq(trainingExamples.datasetId, datasetId))
    .orderBy(desc(trainingExamples.createdAt));
}

export async function getTrainingExampleById(id: string): Promise<TrainingExample | undefined> {
  const [example] = await db.select().from(trainingExamples).where(eq(trainingExamples.id, id));
  return example;
}

export async function getTrainingExamplesByCategory(datasetId: string, category: string): Promise<TrainingExample[]> {
  return db
    .select()
    .from(trainingExamples)
    .where(and(eq(trainingExamples.datasetId, datasetId), eq(trainingExamples.category, category)))
    .orderBy(desc(trainingExamples.createdAt));
}

export async function deleteTrainingExample(id: string): Promise<void> {
  await db.delete(trainingExamples).where(eq(trainingExamples.id, id));
}
