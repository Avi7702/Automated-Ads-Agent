/**
 * Secret Manager — Supports key rotation with backward compatibility.
 *
 * Secrets can be provided as comma-separated values:
 *   SESSION_SECRET=newkey,oldkey
 *   CSRF_SECRET=newkey,oldkey
 *   API_KEY_ENCRYPTION_KEY=newkey,oldkey
 *
 * The first value is the "current" key (used for new encryptions/signatures).
 * All values are tried during decryption/verification (supports graceful rotation).
 *
 * Rotation procedure:
 * 1. Generate new secret: openssl rand -base64 32
 * 2. Prepend to env var: NEW_SECRET,OLD_SECRET
 * 3. Deploy — new data uses new key, old data still decrypts
 * 4. Re-encrypt existing data (optional, via admin endpoint)
 * 5. Remove old key from env var
 */

import { logger } from './logger';

export interface SecretSet {
  current: string;
  all: string[];
}

/**
 * Parse a comma-separated secret string into current + all keys.
 * Returns null if the env var is not set.
 */
export function parseSecrets(envVar: string): SecretSet | null {
  const raw = process.env[envVar];
  if (!raw) {
    return null;
  }

  const keys = raw
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (keys.length === 0) {
    return null;
  }

  const first = keys[0];
  if (first === undefined) {
    return null;
  }

  return {
    current: first,
    all: keys,
  };
}

/**
 * Get session secrets as an array (express-session supports this natively).
 * Returns array where first element is used for signing, rest for verification.
 */
export function getSessionSecrets(): string[] {
  const secrets = parseSecrets('SESSION_SECRET');
  if (secrets) {
    if (secrets.all.length > 1) {
      logger.info({ count: secrets.all.length }, 'Session secret rotation: multiple keys active');
    }
    return secrets.all;
  }
  return [];
}

/**
 * Get CSRF secrets as an array.
 */
export function getCsrfSecrets(): string[] {
  const secrets = parseSecrets('CSRF_SECRET');
  if (secrets) {
    if (secrets.all.length > 1) {
      logger.info({ count: secrets.all.length }, 'CSRF secret rotation: multiple keys active');
    }
    return secrets.all;
  }
  return [];
}

/**
 * Get encryption keys for API key storage.
 * Returns { current, all } where current is used for new encryptions.
 */
export function getEncryptionKeys(): SecretSet | null {
  return parseSecrets('API_KEY_ENCRYPTION_KEY');
}
