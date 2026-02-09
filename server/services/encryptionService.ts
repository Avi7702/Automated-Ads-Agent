import crypto from 'crypto';

/**
 * Encryption Service for API Key Management
 *
 * Uses AES-256-GCM authenticated encryption for secure storage of API keys.
 * Master key must be set via API_KEY_ENCRYPTION_KEY environment variable.
 *
 * Security properties:
 * - 256-bit encryption key
 * - Unique 12-byte IV per encryption (cryptographically random)
 * - 16-byte authentication tag for integrity verification
 * - Authenticated encryption prevents tampering
 */

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 12 bytes for GCM mode (recommended by NIST)
const AUTH_TAG_LENGTH = 16; // 16 bytes (128 bits)
const KEY_LENGTH = 32; // 32 bytes for AES-256

/**
 * Encrypted data structure containing all components needed for decryption
 */
export interface EncryptedData {
  ciphertext: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  authTag: string; // Base64 encoded authentication tag
}

/**
 * Error thrown when encryption configuration is invalid
 */
export class EncryptionConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionConfigError';
  }
}

/**
 * Error thrown when decryption fails (invalid data or tampering detected)
 */
export class DecryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DecryptionError';
  }
}

/**
 * Parse a key string into a 32-byte Buffer.
 */
function parseKeyToBuffer(keyString: string): Buffer {
  let keyBuffer: Buffer;
  try {
    keyBuffer = Buffer.from(keyString, 'base64');
    if (keyBuffer.length !== KEY_LENGTH) {
      keyBuffer = Buffer.from(keyString, 'utf-8');
    }
  } catch {
    keyBuffer = Buffer.from(keyString, 'utf-8');
  }

  if (keyBuffer.length < KEY_LENGTH) {
    throw new EncryptionConfigError(
      `Encryption key must be at least ${KEY_LENGTH} bytes. ` +
        `Current length: ${keyBuffer.length} bytes. ` +
        'Generate one with: openssl rand -base64 32',
    );
  }

  return keyBuffer.subarray(0, KEY_LENGTH);
}

/**
 * Get the master encryption key from environment variable.
 * Supports comma-separated keys for rotation (first = current, rest = legacy).
 * Throws EncryptionConfigError if not configured or invalid.
 */
function getMasterKey(): Buffer {
  const keyString = process.env.API_KEY_ENCRYPTION_KEY;

  if (!keyString) {
    throw new EncryptionConfigError(
      'API_KEY_ENCRYPTION_KEY environment variable is not configured. ' + 'Generate one with: openssl rand -base64 32',
    );
  }

  // Support comma-separated keys — use first (current) for encryption
  const firstKey = keyString.split(',')[0]?.trim();
  if (!firstKey) {
    throw new EncryptionConfigError('API_KEY_ENCRYPTION_KEY is empty');
  }

  return parseKeyToBuffer(firstKey);
}

/**
 * Get all encryption keys (current + legacy) for decryption.
 * First key is current, rest are legacy (for rotation support).
 */
function getAllKeys(): Buffer[] {
  const keyString = process.env.API_KEY_ENCRYPTION_KEY;

  if (!keyString) {
    throw new EncryptionConfigError('API_KEY_ENCRYPTION_KEY environment variable is not configured.');
  }

  return keyString
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
    .map(parseKeyToBuffer);
}

/**
 * Encrypt a plaintext API key using AES-256-GCM.
 *
 * @param plaintext - The API key to encrypt
 * @returns EncryptedData containing ciphertext, IV, and auth tag (all base64 encoded)
 * @throws EncryptionConfigError if master key is not configured
 */
export function encryptApiKey(plaintext: string): EncryptedData {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('Plaintext must be a non-empty string');
  }

  const masterKey = getMasterKey();

  // Generate cryptographically secure random IV
  const iv = crypto.randomBytes(IV_LENGTH);

  // Create cipher with AES-256-GCM
  const cipher = crypto.createCipheriv(ALGORITHM, masterKey, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  // Encrypt the plaintext
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);

  // Get the authentication tag
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

/**
 * Attempt decryption with a specific key.
 */
function tryDecryptWithKey(encrypted: EncryptedData, key: Buffer): string | null {
  try {
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');

    if (iv.length !== IV_LENGTH || authTag.length !== AUTH_TAG_LENGTH) {
      return null;
    }

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, {
      authTagLength: AUTH_TAG_LENGTH,
    });
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Decrypt an encrypted API key using AES-256-GCM.
 * Supports key rotation: tries all configured keys (current + legacy).
 *
 * @param encrypted - The encrypted data containing ciphertext, IV, and auth tag
 * @returns The decrypted plaintext API key
 * @throws EncryptionConfigError if master key is not configured
 * @throws DecryptionError if decryption fails with all keys
 */
export function decryptApiKey(encrypted: EncryptedData): string {
  if (!encrypted || !encrypted.ciphertext || !encrypted.iv || !encrypted.authTag) {
    throw new DecryptionError('Invalid encrypted data: missing required fields');
  }

  const keys = getAllKeys();

  // Try each key in order (current first, then legacy)
  for (const key of keys) {
    const result = tryDecryptWithKey(encrypted, key);
    if (result !== null) {
      return result;
    }
  }

  throw new DecryptionError('Decryption failed: data may be corrupted or encrypted with an unknown key');
}

/**
 * Generate a masked preview of an API key for display.
 * Shows first 4 characters + "..." + last 6 characters.
 *
 * Examples:
 * - "AIzaSyC9XYZ...abc789" for a 39-char Gemini key
 * - "sk-proj...xyz123" for an OpenAI key
 *
 * @param key - The full API key
 * @returns Masked preview string like "AIza...xyz789"
 */
export function generateKeyPreview(key: string): string {
  if (!key || typeof key !== 'string') {
    return '';
  }

  const trimmedKey = key.trim();

  // For very short keys, mask everything except first and last char
  if (trimmedKey.length <= 10) {
    if (trimmedKey.length <= 2) {
      return '***';
    }
    return `${trimmedKey[0]}...${trimmedKey[trimmedKey.length - 1]}`;
  }

  // Standard preview: first 4 + ... + last 6
  const prefix = trimmedKey.substring(0, 4);
  const suffix = trimmedKey.substring(trimmedKey.length - 6);

  return `${prefix}...${suffix}`;
}

/**
 * Validate that the master encryption key is properly configured.
 * Does not throw - returns true/false.
 *
 * @returns true if master key is configured and valid, false otherwise
 */
export function validateMasterKeyConfigured(): boolean {
  try {
    getMasterKey();
    return true;
  } catch {
    return false;
  }
}

/**
 * Encryption service object for routes.ts compatibility
 */
export const encryptionService = {
  encryptApiKey,
  decryptApiKey,
  generateKeyPreview,
  validateMasterKeyConfigured,
  EncryptionConfigError,
  DecryptionError,
};
