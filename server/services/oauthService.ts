/**
 * OAuth Service — Handles OAuth 2.0 authorization flows for LinkedIn and Twitter/X
 *
 * - DB-backed state tokens (no in-memory storage) to prevent CSRF/replay
 * - LinkedIn: standard OAuth 2.0 with client_secret
 * - Twitter/X: OAuth 2.0 with PKCE (code_verifier / code_challenge)
 * - State tokens expire after 10 minutes
 */

import crypto from 'crypto';
import { db } from '../db';
import { oauthStates } from '@shared/schema';
import { and, eq, lt } from 'drizzle-orm';
import * as socialRepo from '../repositories/socialRepository';
import { storeTokens } from './tokenService';
import { logger } from '../lib/logger';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────

const STATE_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

type SupportedPlatform = 'linkedin' | 'twitter';

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function generateStateToken(): string {
  return crypto.randomBytes(32).toString('hex'); // 64 hex chars
}

function generateCodeVerifier(): string {
  // 43-128 chars, URL-safe base64
  return crypto.randomBytes(48).toString('base64url'); // 64 chars
}

function generateCodeChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function getRequiredEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

function getCallbackUrl(platform: SupportedPlatform): string {
  const base = getRequiredEnv('OAUTH_CALLBACK_BASE_URL');
  return `${base}/api/social/oauth/${platform}/callback`;
}

// ──────────────────────────────────────────────
// Clean expired states
// ──────────────────────────────────────────────

async function cleanExpiredStates(): Promise<void> {
  await db.delete(oauthStates).where(lt(oauthStates.expiresAt, new Date()));
}

// ──────────────────────────────────────────────
// Generate authorization URL
// ──────────────────────────────────────────────

export async function getAuthorizationUrl(platform: SupportedPlatform, userId: string): Promise<string> {
  // Housekeeping: clean up expired states
  await cleanExpiredStates();

  const stateToken = generateStateToken();
  const expiresAt = new Date(Date.now() + STATE_EXPIRY_MS);

  let codeVerifier: string | null = null;

  if (platform === 'twitter') {
    codeVerifier = generateCodeVerifier();
  }

  // Persist state to DB
  await db.insert(oauthStates).values({
    userId,
    platform,
    stateToken,
    codeVerifier,
    expiresAt,
  });

  switch (platform) {
    case 'linkedin': {
      const clientId = getRequiredEnv('LINKEDIN_CLIENT_ID');
      const redirectUri = getCallbackUrl('linkedin');
      const scopes = 'openid profile email w_member_social';

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopes,
        state: stateToken,
      });

      return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
    }

    case 'twitter': {
      const clientId = getRequiredEnv('TWITTER_CLIENT_ID');
      const redirectUri = getCallbackUrl('twitter');
      const scopes = 'tweet.read tweet.write users.read media.write offline.access';
      const codeChallenge = generateCodeChallenge(codeVerifier!);

      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: scopes,
        state: stateToken,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });

      return `https://x.com/i/oauth2/authorize?${params.toString()}`;
    }

    default:
      throw new Error(`Unsupported OAuth platform: ${platform as string}`);
  }
}

// ──────────────────────────────────────────────
// Handle OAuth callback
// ──────────────────────────────────────────────

interface OAuthCallbackResult {
  connectionId: string;
  platform: SupportedPlatform;
  platformUsername: string;
}

export async function handleOAuthCallback(
  platform: SupportedPlatform,
  code: string,
  stateToken: string,
): Promise<OAuthCallbackResult> {
  // 1. Validate state token
  const [stateRow] = await db
    .select()
    .from(oauthStates)
    .where(and(eq(oauthStates.stateToken, stateToken), eq(oauthStates.platform, platform)))
    .limit(1);

  if (!stateRow) {
    throw new Error('Invalid or expired OAuth state token');
  }

  if (stateRow.expiresAt < new Date()) {
    // Clean up and reject
    await db.delete(oauthStates).where(eq(oauthStates.id, stateRow.id));
    throw new Error('OAuth state token has expired');
  }

  const userId = stateRow.userId;
  const codeVerifier = stateRow.codeVerifier;

  // Delete the state row (single-use)
  await db.delete(oauthStates).where(eq(oauthStates.id, stateRow.id));

  // 2. Exchange code for tokens
  let tokens: { accessToken: string; refreshToken?: string; expiresIn: number };
  let profile: { platformUserId: string; platformUsername: string; profilePictureUrl?: string };

  switch (platform) {
    case 'linkedin':
      tokens = await exchangeLinkedInCode(code);
      profile = await fetchLinkedInProfile(tokens.accessToken);
      break;
    case 'twitter':
      tokens = await exchangeTwitterCode(code, codeVerifier ?? '');
      profile = await fetchTwitterProfile(tokens.accessToken);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform as string}`);
  }

  // 3. Create or update social connection
  const existing = await socialRepo.getSocialConnectionByPlatform(userId, platform);

  let connectionId: string;

  if (existing) {
    await socialRepo.updateSocialConnection(existing.id, {
      platformUserId: profile.platformUserId,
      platformUsername: profile.platformUsername,
      profilePictureUrl: profile.profilePictureUrl ?? null,
      isActive: true,
      lastErrorAt: null,
      lastErrorMessage: null,
    });
    connectionId = existing.id;
  } else {
    // Need placeholder encrypted values; storeTokens will overwrite immediately
    const connection = await socialRepo.createSocialConnection({
      userId,
      platform,
      platformUserId: profile.platformUserId,
      platformUsername: profile.platformUsername,
      profilePictureUrl: profile.profilePictureUrl,
      accountType: 'personal',
      isActive: true,
      accessToken: 'pending',
      tokenIv: 'pending',
      tokenAuthTag: 'pending',
      tokenExpiresAt: new Date(),
    });
    connectionId = connection.id;
  }

  // 4. Encrypt and store tokens
  const scopes =
    platform === 'linkedin'
      ? ['openid', 'profile', 'email', 'w_member_social']
      : ['tweet.read', 'tweet.write', 'users.read', 'media.write', 'offline.access'];

  const storeInput: Parameters<typeof storeTokens>[1] = {
    accessToken: tokens.accessToken,
    expiresIn: tokens.expiresIn,
    scopes,
  };
  if (tokens.refreshToken !== undefined) {
    storeInput.refreshToken = tokens.refreshToken;
  }
  await storeTokens(connectionId, storeInput);

  logger.info(
    { userId, platform, connectionId, platformUsername: profile.platformUsername },
    'OAuth flow completed successfully',
  );

  return {
    connectionId,
    platform,
    platformUsername: profile.platformUsername,
  };
}

// ──────────────────────────────────────────────
// LinkedIn token exchange & profile
// ──────────────────────────────────────────────

async function exchangeLinkedInCode(
  code: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const clientId = getRequiredEnv('LINKEDIN_CLIENT_ID');
  const clientSecret = getRequiredEnv('LINKEDIN_CLIENT_SECRET');
  const redirectUri = getCallbackUrl('linkedin');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
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
    throw new Error(`LinkedIn token exchange failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    refresh_token_expires_in?: number;
  };

  const result: { accessToken: string; refreshToken?: string; expiresIn: number } = {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
  if (data.refresh_token !== undefined) {
    result.refreshToken = data.refresh_token;
  }
  return result;
}

async function fetchLinkedInProfile(
  accessToken: string,
): Promise<{ platformUserId: string; platformUsername: string; profilePictureUrl?: string }> {
  const res = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LinkedIn profile fetch failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    sub: string;
    name?: string;
    email?: string;
    picture?: string;
  };

  const profile: { platformUserId: string; platformUsername: string; profilePictureUrl?: string } = {
    platformUserId: data.sub,
    platformUsername: data.name ?? data.email ?? data.sub,
  };
  if (data.picture !== undefined) {
    profile.profilePictureUrl = data.picture;
  }
  return profile;
}

// ──────────────────────────────────────────────
// Twitter/X token exchange & profile
// ──────────────────────────────────────────────

async function exchangeTwitterCode(
  code: string,
  codeVerifier: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
  const clientId = getRequiredEnv('TWITTER_CLIENT_ID');
  const clientSecret = getRequiredEnv('TWITTER_CLIENT_SECRET');
  const redirectUri = getCallbackUrl('twitter');

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: clientId,
    code_verifier: codeVerifier,
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
    throw new Error(`Twitter token exchange failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
    token_type: string;
  };

  const result: { accessToken: string; refreshToken?: string; expiresIn: number } = {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
  if (data.refresh_token !== undefined) {
    result.refreshToken = data.refresh_token;
  }
  return result;
}

async function fetchTwitterProfile(
  accessToken: string,
): Promise<{ platformUserId: string; platformUsername: string; profilePictureUrl?: string }> {
  const res = await fetch('https://api.x.com/2/users/me?user.fields=profile_image_url', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twitter profile fetch failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    data: {
      id: string;
      name: string;
      username: string;
      profile_image_url?: string;
    };
  };

  const profile: { platformUserId: string; platformUsername: string; profilePictureUrl?: string } = {
    platformUserId: data.data.id,
    platformUsername: data.data.username,
  };
  if (data.data.profile_image_url !== undefined) {
    profile.profilePictureUrl = data.data.profile_image_url;
  }
  return profile;
}
