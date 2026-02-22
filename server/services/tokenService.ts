/**
 * Token Service — Encrypt, decrypt, and refresh OAuth tokens
 *
 * Uses the existing encryptionService for AES-256-GCM at rest.
 * Handles platform-specific refresh flows for LinkedIn and Twitter/X.
 */

import { encryptApiKey, decryptApiKey } from './encryptionService';
import type { EncryptedData } from './encryptionService';
import * as socialRepo from '../repositories/socialRepository';
import { db } from '../db';
import { socialConnections } from '@shared/schema';
import { and, eq, lt } from 'drizzle-orm';
import { logger } from '../lib/logger';

// ──────────────────────────────────────────────
// Custom errors
// ──────────────────────────────────────────────

export class TokenExpiredError extends Error {
  constructor(connectionId: string) {
    super(`Token expired and refresh failed for connection ${connectionId}`);
    this.name = 'TokenExpiredError';
  }
}

export class TokenRefreshError extends Error {
  public readonly platform: string;
  constructor(platform: string, message: string) {
    super(message);
    this.name = 'TokenRefreshError';
    this.platform = platform;
  }
}

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

export interface StoreTokensInput {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number; // seconds from now
  scopes: string[];
}

interface RefreshResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

// ──────────────────────────────────────────────
// Store tokens (encrypt + persist)
// ──────────────────────────────────────────────

export async function storeTokens(connectionId: string, input: StoreTokensInput): Promise<void> {
  const encrypted = encryptApiKey(input.accessToken);

  const updates: Record<string, unknown> = {
    accessToken: encrypted.ciphertext,
    tokenIv: encrypted.iv,
    tokenAuthTag: encrypted.authTag,
    tokenExpiresAt: new Date(Date.now() + input.expiresIn * 1000),
    scopes: input.scopes,
    lastRefreshedAt: new Date(),
    isActive: true,
    lastErrorAt: null,
    lastErrorMessage: null,
  };

  if (input.refreshToken) {
    // Store refresh token as a second encrypted blob.
    // We encode {ciphertext}:{iv}:{authTag} in the refreshToken column.
    const encRefresh = encryptApiKey(input.refreshToken);
    updates['refreshToken'] = `${encRefresh.ciphertext}:${encRefresh.iv}:${encRefresh.authTag}`;
  }

  await socialRepo.updateSocialConnection(connectionId, updates);

  logger.info({ connectionId }, 'Tokens stored (encrypted)');
}

// ──────────────────────────────────────────────
// Decrypt helpers
// ──────────────────────────────────────────────

function decryptAccessToken(connection: { accessToken: string; tokenIv: string; tokenAuthTag: string }): string {
  const encrypted: EncryptedData = {
    ciphertext: connection.accessToken,
    iv: connection.tokenIv,
    authTag: connection.tokenAuthTag,
  };
  return decryptApiKey(encrypted);
}

function decryptRefreshToken(refreshTokenBlob: string): string {
  const parts = refreshTokenBlob.split(':');
  if (parts.length !== 3) {
    throw new Error('Malformed refresh token blob');
  }
  const [ciphertext, iv, authTag] = parts as [string, string, string];
  return decryptApiKey({ ciphertext, iv, authTag });
}

// ──────────────────────────────────────────────
// Get access token (auto-refresh if expired)
// ──────────────────────────────────────────────

export async function getAccessToken(connectionId: string): Promise<string> {
  const connection = await socialRepo.getSocialConnectionById(connectionId);
  if (!connection) {
    throw new Error(`Social connection not found: ${connectionId}`);
  }

  const now = new Date();
  const isExpired = connection.tokenExpiresAt <= now;
  // Refresh proactively if expiring within 5 minutes
  const isExpiringSoon = connection.tokenExpiresAt.getTime() - now.getTime() < 5 * 60 * 1000;

  if (isExpired || isExpiringSoon) {
    logger.info({ connectionId, platform: connection.platform }, 'Token expired/expiring — attempting refresh');
    try {
      await refreshToken(connectionId);
      // Re-fetch after refresh
      const refreshed = await socialRepo.getSocialConnectionById(connectionId);
      if (!refreshed) {
        throw new TokenExpiredError(connectionId);
      }
      return decryptAccessToken(refreshed);
    } catch (_err) {
      throw new TokenExpiredError(connectionId);
    }
  }

  return decryptAccessToken(connection);
}

// ──────────────────────────────────────────────
// Platform-specific token refresh
// ──────────────────────────────────────────────

async function refreshLinkedIn(refreshTokenPlain: string): Promise<RefreshResult> {
  const clientId = process.env['LINKEDIN_CLIENT_ID'];
  const clientSecret = process.env['LINKEDIN_CLIENT_SECRET'];
  if (!clientId || !clientSecret) {
    throw new TokenRefreshError('linkedin', 'LinkedIn OAuth credentials not configured');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTokenPlain,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new TokenRefreshError('linkedin', `LinkedIn refresh failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const result: RefreshResult = {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
  if (data.refresh_token !== undefined) {
    result.refreshToken = data.refresh_token;
  }
  return result;
}

async function refreshTwitter(refreshTokenPlain: string): Promise<RefreshResult> {
  const clientId = process.env['TWITTER_CLIENT_ID'];
  const clientSecret = process.env['TWITTER_CLIENT_SECRET'];
  if (!clientId || !clientSecret) {
    throw new TokenRefreshError('twitter', 'Twitter OAuth credentials not configured');
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshTokenPlain,
    client_id: clientId,
  });

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch('https://api.x.com/2/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${basicAuth}`,
    },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new TokenRefreshError('twitter', `Twitter refresh failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  const result: RefreshResult = {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
  if (data.refresh_token !== undefined) {
    result.refreshToken = data.refresh_token;
  }
  return result;
}

// ──────────────────────────────────────────────
// Refresh token (single connection)
// ──────────────────────────────────────────────

export async function refreshToken(connectionId: string): Promise<void> {
  const connection = await socialRepo.getSocialConnectionById(connectionId);
  if (!connection) {
    throw new Error(`Social connection not found: ${connectionId}`);
  }

  if (!connection.refreshToken) {
    throw new TokenRefreshError(connection.platform, `No refresh token stored for connection ${connectionId}`);
  }

  const refreshTokenPlain = decryptRefreshToken(connection.refreshToken);

  let result: RefreshResult;
  switch (connection.platform) {
    case 'linkedin':
      result = await refreshLinkedIn(refreshTokenPlain);
      break;
    case 'twitter':
      result = await refreshTwitter(refreshTokenPlain);
      break;
    default:
      throw new TokenRefreshError(
        connection.platform,
        `Token refresh not supported for platform: ${connection.platform}`,
      );
  }

  await storeTokens(connectionId, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken ?? refreshTokenPlain,
    expiresIn: result.expiresIn,
    scopes: connection.scopes ?? [],
  });

  logger.info({ connectionId, platform: connection.platform }, 'Token refreshed successfully');
}

// ──────────────────────────────────────────────
// Batch refresh for cron
// ──────────────────────────────────────────────

export interface BatchRefreshResult {
  refreshed: number;
  failed: number;
  errors: Array<{ connectionId: string; error: string }>;
}

export async function refreshExpiringTokens(thresholdMinutes: number = 30): Promise<BatchRefreshResult> {
  const threshold = new Date(Date.now() + thresholdMinutes * 60 * 1000);

  const expiring = await db
    .select()
    .from(socialConnections)
    .where(and(eq(socialConnections.isActive, true), lt(socialConnections.tokenExpiresAt, threshold)));

  const result: BatchRefreshResult = {
    refreshed: 0,
    failed: 0,
    errors: [],
  };

  for (const conn of expiring) {
    try {
      await refreshToken(conn.id);
      result.refreshed++;
    } catch (err) {
      result.failed++;
      const message = err instanceof Error ? err.message : String(err);
      result.errors.push({ connectionId: conn.id, error: message });
      logger.error({ connectionId: conn.id, platform: conn.platform, err }, 'Batch token refresh failed');
    }
  }

  logger.info(
    { total: expiring.length, refreshed: result.refreshed, failed: result.failed },
    'Batch token refresh completed',
  );

  return result;
}
