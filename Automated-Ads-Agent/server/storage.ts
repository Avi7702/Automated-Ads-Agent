import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, lt } from 'drizzle-orm';
import { users, sessions, products, generations } from '../shared/schema';
import type { User, NewUser, Session, NewSession } from '../shared/schema';

// In-memory storage for testing (when DATABASE_URL is not set)
interface InMemoryData {
  users: Map<string, User>;
  sessions: Map<string, Session>;
  products: Map<string, any>;
  generations: Map<string, any>;
}

class Storage {
  private pool: Pool | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private inMemory: InMemoryData | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
      this.pool = new Pool({ connectionString: databaseUrl });
      this.db = drizzle(this.pool);
    } else {
      // Use in-memory storage for testing
      this.inMemory = {
        users: new Map(),
        sessions: new Map(),
        products: new Map(),
        generations: new Map(),
      };
    }

    this.isInitialized = true;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
    }
    this.isInitialized = false;
  }

  async clearAllData(): Promise<void> {
    if (this.inMemory) {
      this.inMemory.users.clear();
      this.inMemory.sessions.clear();
      this.inMemory.products.clear();
      this.inMemory.generations.clear();
    } else if (this.db) {
      await this.db.delete(sessions);
      await this.db.delete(generations);
      await this.db.delete(products);
      await this.db.delete(users);
    }
  }

  // User operations
  async createUser(email: string, passwordHash: string): Promise<User> {
    if (this.inMemory) {
      const id = crypto.randomUUID();
      const now = new Date();
      const user: User = {
        id,
        email,
        passwordHash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        createdAt: now,
        updatedAt: now,
      };
      this.inMemory.users.set(id, user);
      return user;
    }

    const [user] = await this.db!.insert(users)
      .values({ email, passwordHash })
      .returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (this.inMemory) {
      return Array.from(this.inMemory.users.values()).find(u => u.email === email);
    }

    const [user] = await this.db!.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserById(id: string): Promise<User | undefined> {
    if (this.inMemory) {
      return this.inMemory.users.get(id);
    }

    const [user] = await this.db!.select().from(users).where(eq(users.id, id));
    return user;
  }

  async incrementFailedAttempts(userId: string): Promise<void> {
    if (this.inMemory) {
      const user = this.inMemory.users.get(userId);
      if (user) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= 5) {
          user.lockedUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
        }
      }
      return;
    }

    const [user] = await this.db!.select().from(users).where(eq(users.id, userId));
    if (user) {
      const newAttempts = user.failedLoginAttempts + 1;
      const lockedUntil = newAttempts >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;
      await this.db!.update(users)
        .set({
          failedLoginAttempts: newAttempts,
          lockedUntil,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    }
  }

  async resetFailedAttempts(userId: string): Promise<void> {
    if (this.inMemory) {
      const user = this.inMemory.users.get(userId);
      if (user) {
        user.failedLoginAttempts = 0;
        user.lockedUntil = null;
      }
      return;
    }

    await this.db!.update(users)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));
  }

  // Session operations
  async createSession(userId: string, sessionId: string, expiresAt: Date): Promise<Session> {
    if (this.inMemory) {
      const session: Session = {
        id: sessionId,
        userId,
        expiresAt,
        createdAt: new Date(),
      };
      this.inMemory.sessions.set(sessionId, session);
      return session;
    }

    const [session] = await this.db!.insert(sessions)
      .values({ id: sessionId, userId, expiresAt })
      .returning();
    return session;
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    if (this.inMemory) {
      const session = this.inMemory.sessions.get(sessionId);
      if (session && session.expiresAt > new Date()) {
        return session;
      }
      return undefined;
    }

    const [session] = await this.db!.select()
      .from(sessions)
      .where(eq(sessions.id, sessionId));

    if (session && session.expiresAt > new Date()) {
      return session;
    }
    return undefined;
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (this.inMemory) {
      this.inMemory.sessions.delete(sessionId);
      return;
    }

    await this.db!.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async expireSession(sessionId: string): Promise<void> {
    if (this.inMemory) {
      const session = this.inMemory.sessions.get(sessionId);
      if (session) {
        session.expiresAt = new Date(0); // Set to past date
      }
      return;
    }

    await this.db!.update(sessions)
      .set({ expiresAt: new Date(0) })
      .where(eq(sessions.id, sessionId));
  }

  async deleteExpiredSessions(): Promise<void> {
    if (this.inMemory) {
      const now = new Date();
      for (const [id, session] of this.inMemory.sessions) {
        if (session.expiresAt <= now) {
          this.inMemory.sessions.delete(id);
        }
      }
      return;
    }

    await this.db!.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  }

  // Product operations (placeholder for protected route testing)
  async createProduct(userId: string, name: string, description?: string): Promise<any> {
    if (this.inMemory) {
      const id = crypto.randomUUID();
      const product = {
        id,
        userId,
        name,
        description: description || null,
        imageUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.inMemory.products.set(id, product);
      return product;
    }

    const [product] = await this.db!.insert(products)
      .values({ userId, name, description })
      .returning();
    return product;
  }

  async deleteAllProducts(userId: string): Promise<void> {
    if (this.inMemory) {
      for (const [id, product] of this.inMemory.products) {
        if (product.userId === userId) {
          this.inMemory.products.delete(id);
        }
      }
      return;
    }

    await this.db!.delete(products).where(eq(products.userId, userId));
  }
}

export const storage = new Storage();
