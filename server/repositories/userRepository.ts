import {
  type User,
  users,
} from "@shared/schema";
import { db } from "../db";
import { eq } from "drizzle-orm";

export async function createUser(email: string, passwordHash: string): Promise<User> {
  const [user] = await db
    .insert(users)
    .values({ email, password: passwordHash, passwordHash })
    .returning();
  return user;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email));
  return user;
}

export async function getUserById(id: string): Promise<User | undefined> {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, id));
  return user;
}

export async function updateUserBrandVoice(userId: string, brandVoice: any): Promise<User> {
  const [user] = await db
    .update(users)
    .set({ brandVoice })
    .where(eq(users.id, userId))
    .returning();
  return user;
}
