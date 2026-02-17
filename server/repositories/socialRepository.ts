import { type SocialConnection, type InsertSocialConnection, socialConnections } from '@shared/schema';
import { db } from '../db';
import { and, eq, desc } from 'drizzle-orm';
import { logger } from '../lib/logger';

export async function getSocialConnections(userId: string): Promise<SocialConnection[]> {
  return db
    .select()
    .from(socialConnections)
    .where(eq(socialConnections.userId, userId))
    .orderBy(desc(socialConnections.connectedAt));
}

export async function getSocialConnectionById(id: string): Promise<SocialConnection | null> {
  const [connection] = await db.select().from(socialConnections).where(eq(socialConnections.id, id)).limit(1);

  return connection || null;
}

export async function getSocialConnectionByPlatform(
  userId: string,
  platform: string,
): Promise<SocialConnection | null> {
  const [connection] = await db
    .select()
    .from(socialConnections)
    .where(and(eq(socialConnections.userId, userId), eq(socialConnections.platform, platform)))
    .limit(1);

  return connection || null;
}

export async function createSocialConnection(data: InsertSocialConnection): Promise<SocialConnection> {
  const [connection] = await db
    .insert(socialConnections)
    .values({
      ...data,
      connectedAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  logger.info({ userId: data.userId, platform: data.platform }, 'Social connection created');
  return connection!;
}

export async function updateSocialConnection(
  id: string,
  updates: Partial<SocialConnection>,
): Promise<SocialConnection> {
  const [connection] = await db
    .update(socialConnections)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(eq(socialConnections.id, id))
    .returning();

  if (!connection) {
    throw new Error(`Social connection not found: ${id}`);
  }

  logger.info({ connectionId: id }, 'Social connection updated');
  return connection;
}

export async function deleteSocialConnection(id: string): Promise<void> {
  await db.delete(socialConnections).where(eq(socialConnections.id, id));

  logger.info({ connectionId: id }, 'Social connection deleted');
}
