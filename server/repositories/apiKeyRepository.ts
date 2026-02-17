import { type UserApiKey, type ApiKeyAuditLog, userApiKeys, apiKeyAuditLog } from '@shared/schema';
import { decryptApiKey } from '../services/encryptionService';
import { db } from '../db';
import { and, eq, desc } from 'drizzle-orm';
import { logger } from '../lib/logger';

// ============================================
// USER API KEY OPERATIONS
// ============================================

export async function getUserApiKey(userId: string, service: string): Promise<UserApiKey | null> {
  const [key] = await db
    .select()
    .from(userApiKeys)
    .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.service, service)))
    .limit(1);
  return key || null;
}

export async function getAllUserApiKeys(userId: string): Promise<UserApiKey[]> {
  return await db.select().from(userApiKeys).where(eq(userApiKeys.userId, userId)).orderBy(userApiKeys.service);
}

export async function saveUserApiKey(data: {
  userId: string;
  service: string;
  encryptedKey: string;
  iv: string;
  authTag: string;
  keyPreview: string;
  isValid?: boolean;
}): Promise<UserApiKey> {
  const now = new Date();
  const insertData = {
    userId: data.userId,
    service: data.service,
    encryptedKey: data.encryptedKey,
    iv: data.iv,
    authTag: data.authTag,
    keyPreview: data.keyPreview,
    isValid: data.isValid ?? true,
    lastValidatedAt: now,
  };

  const [result] = await db
    .insert(userApiKeys)
    .values(insertData)
    .onConflictDoUpdate({
      target: [userApiKeys.userId, userApiKeys.service],
      set: {
        encryptedKey: data.encryptedKey,
        iv: data.iv,
        authTag: data.authTag,
        keyPreview: data.keyPreview,
        isValid: data.isValid ?? true,
        lastValidatedAt: now,
        updatedAt: now,
      },
    })
    .returning();

  return result!;
}

export async function updateUserApiKeyValidity(userId: string, service: string, isValid: boolean): Promise<void> {
  await db
    .update(userApiKeys)
    .set({
      isValid,
      lastValidatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.service, service)));
}

export async function deleteUserApiKey(userId: string, service: string): Promise<void> {
  await db.delete(userApiKeys).where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.service, service)));
}

// ============================================
// AUDIT LOG OPERATIONS
// ============================================

export async function logApiKeyAction(entry: {
  userId: string;
  service: string;
  action: 'create' | 'update' | 'delete' | 'validate' | 'use';
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}): Promise<void> {
  await db.insert(apiKeyAuditLog).values({
    userId: entry.userId,
    service: entry.service,
    action: entry.action,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    success: entry.success,
    errorMessage: entry.errorMessage,
  });
}

export async function getApiKeyAuditLog(
  userId: string,
  service?: string,
  limit: number = 100,
): Promise<ApiKeyAuditLog[]> {
  const conditions = [eq(apiKeyAuditLog.userId, userId)];

  if (service) {
    conditions.push(eq(apiKeyAuditLog.service, service));
  }

  return await db
    .select()
    .from(apiKeyAuditLog)
    .where(and(...conditions))
    .orderBy(desc(apiKeyAuditLog.createdAt))
    .limit(limit);
}

// ============================================
// KEY RESOLUTION WITH FALLBACK
// ============================================

export async function resolveApiKey(
  userId: string,
  service: string,
): Promise<{ key: string | null; source: 'user' | 'environment' | 'none' }> {
  const userKey = await getUserApiKey(userId, service);

  if (userKey && userKey.isValid) {
    try {
      const decryptedKey = decryptApiKey({
        ciphertext: userKey.encryptedKey,
        iv: userKey.iv,
        authTag: userKey.authTag,
      });
      return { key: decryptedKey, source: 'user' };
    } catch {
      // Decryption failed - fall through to environment variable
    }
  }

  const envVarMap: Record<string, string | undefined> = {
    gemini: process.env['GEMINI_API_KEY'] || process.env['GOOGLE_API_KEY'],
    cloudinary: process.env['CLOUDINARY_API_KEY'],
    firecrawl: process.env['FIRECRAWL_API_KEY'],
    redis: process.env['REDIS_URL'],
  };

  const envKey = envVarMap[service];

  if (envKey) {
    return { key: envKey, source: 'environment' };
  }

  return { key: null, source: 'none' };
}

// ============================================
// N8N CONFIGURATION VAULT
// ============================================

export async function saveN8nConfig(userId: string, _baseUrl: string, apiKey?: string): Promise<void> {
  const { encryptApiKey } = await import('../services/encryptionService');

  const encryptedData = apiKey ? await encryptApiKey(apiKey) : null;

  await db
    .insert(userApiKeys)
    .values({
      userId,
      service: 'n8n',
      encryptedKey: encryptedData?.ciphertext ?? '',
      iv: encryptedData?.iv ?? '',
      authTag: encryptedData?.authTag ?? '',
      keyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'Not configured',
      isValid: true,
    })
    .onConflictDoUpdate({
      target: [userApiKeys.userId, userApiKeys.service],
      set: {
        encryptedKey: encryptedData?.ciphertext ?? '',
        iv: encryptedData?.iv ?? '',
        authTag: encryptedData?.authTag ?? '',
        keyPreview: apiKey ? `${apiKey.substring(0, 8)}...` : 'Not configured',
        updatedAt: new Date(),
      },
    });

  logger.info({ userId, service: 'n8n' }, 'n8n configuration saved to encrypted vault');
}

export async function getN8nConfig(userId: string): Promise<{ baseUrl: string; apiKey?: string } | null> {
  const [row] = await db
    .select()
    .from(userApiKeys)
    .where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.service, 'n8n')))
    .limit(1);

  if (!row) return null;

  const apiKeyValue =
    row.encryptedKey && row.iv && row.authTag
      ? await decryptApiKey({
          ciphertext: row.encryptedKey,
          iv: row.iv,
          authTag: row.authTag,
        })
      : undefined;

  const result: { baseUrl: string; apiKey?: string } = {
    baseUrl: row.keyPreview ?? '',
  };
  if (apiKeyValue !== undefined) {
    result.apiKey = apiKeyValue;
  }
  return result;
}

export async function deleteN8nConfig(userId: string): Promise<void> {
  await db.delete(userApiKeys).where(and(eq(userApiKeys.userId, userId), eq(userApiKeys.service, 'n8n')));

  logger.info({ userId }, 'n8n configuration deleted from vault');
}
