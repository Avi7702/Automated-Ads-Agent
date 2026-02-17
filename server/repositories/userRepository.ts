import { type User, sessions, users } from '@shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

export async function createUser(email: string, passwordHash: string): Promise<User> {
  const [user] = await db.insert(users).values({ email, password: passwordHash, passwordHash }).returning();
  if (!user) {
    throw new Error('Failed to create user');
  }
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.email, email));
  return user;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db.select().from(users).where(eq(users.id, id));
  return user;
}

export async function deleteUser(id: string): Promise<void> {
  // Sessions do not have ON DELETE CASCADE, so remove them first.
  await db.delete(sessions).where(eq(sessions.userId, id));
  await db.delete(users).where(eq(users.id, id));
}

export async function updateUserBrandVoice(userId: string, brandVoice: any): Promise<User> {
  const [user] = await db.update(users).set({ brandVoice }).where(eq(users.id, userId)).returning();
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }
  return user;
}

export async function updatePasswordHash(userId: string, newHash: string): Promise<void> {
  await db.update(users).set({ password: newHash, passwordHash: newHash }).where(eq(users.id, userId));
}
