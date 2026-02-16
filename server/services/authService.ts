import bcrypt from 'bcrypt';
import argon2 from '@node-rs/argon2';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import type { User } from '../../shared/schema';
import { createAuthFailedLoginsMap } from '../utils/memoryManager';
import { logger } from '../lib/logger';
import * as redisLockout from './redisAuthLockout';

const BCRYPT_ROUNDS = 12;
const ARGON2_CONFIG = { memoryCost: 19456, timeCost: 2, parallelism: 1 };
const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// In-memory failed login tracking (fallback when Redis is unavailable)
const failedLogins = createAuthFailedLoginsMap(5000);

/**
 * Check if Redis-backed lockout is available.
 * Returns true when REDIS_URL is set in the environment.
 */
function isRedisLockoutEnabled(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'password' | 'passwordHash'>;
  sessionId?: string;
  error?: string;
  statusCode?: number;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password: string): ValidationResult {
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' };
  }

  // Check password complexity - require at least 3 of 4 character types
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);

  const complexityCount = [hasUpperCase, hasLowerCase, hasNumber, hasSpecial].filter(Boolean).length;

  if (complexityCount < 3) {
    return {
      valid: false,
      error: 'Password must contain at least 3 of: uppercase, lowercase, number, special character',
    };
  }

  // Block common passwords
  const commonPasswords = ['password', '12345678', 'qwertyui', 'abc12345', 'letmein1'];
  if (commonPasswords.includes(password.toLowerCase())) {
    return { valid: false, error: 'Password is too common' };
  }

  return { valid: true };
}

function sanitizeUser(user: User): Omit<User, 'password' | 'passwordHash'> {
  const { password, passwordHash, ...safeUser } = user;
  return safeUser;
}

export async function registerUser(email: string, password: string): Promise<AuthResult> {
  // Validate email
  if (!validateEmail(email)) {
    return { success: false, error: 'Invalid email format', statusCode: 400 };
  }

  // Validate password
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.valid) {
    return { success: false, error: passwordValidation.error, statusCode: 400 };
  }

  // Check if user exists
  const existingUser = await storage.getUserByEmail(email);
  if (existingUser) {
    return { success: false, error: 'User already exists', statusCode: 409 };
  }

  // Hash password (argon2id)
  const hashedPassword = await hashPassword(password);

  // Create user
  const user = await storage.createUser(email, hashedPassword);

  return {
    success: true,
    user: sanitizeUser(user),
  };
}

// Argon2 dummy hash for timing attack prevention (pre-computed)
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$dGltaW5nLWF0dGFjay1wcmV2ZW50aW9u$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  // Find user
  const user = await storage.getUserByEmail(email);

  // ALWAYS run password verification to prevent timing attacks
  // This ensures consistent response time whether user exists or not
  const hashToCompare = user?.password || DUMMY_HASH;
  const isValid = await comparePassword(password, hashToCompare);

  // Check if user exists (after timing-consistent password check)
  if (!user) {
    return { success: false, error: 'Invalid email or password', statusCode: 401 };
  }

  // Check password validity (already computed above)
  if (!isValid) {
    return { success: false, error: 'Invalid email or password', statusCode: 401 };
  }

  // Generate session ID
  const sessionId = uuidv4();

  return {
    success: true,
    user: sanitizeUser(user),
    sessionId,
  };
}

// Note: Session management is now handled by express-session with Redis store
// The validateSession() function has been removed as it's no longer needed
// Session validation is done via req.session.userId in the auth middleware

// Password hashing helper (argon2id -- modern default)
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, ARGON2_CONFIG);
}

// Detects hash format and verifies accordingly. Returns boolean for backward compat.
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (hash.startsWith('$2b$') || hash.startsWith('$2a$')) {
    // Legacy bcrypt hash
    return bcrypt.compare(password, hash);
  }
  // Modern argon2 hash
  return argon2.verify(hash, password);
}

/**
 * Hybrid password verification with optional re-hash.
 * If the stored hash is bcrypt and password is valid, returns a new argon2 hash
 * so the caller can update the DB (transparent migration).
 */
export async function comparePasswordWithRehash(
  password: string,
  hash: string,
): Promise<{ valid: boolean; newHash?: string }> {
  if (hash.startsWith('$2b$') || hash.startsWith('$2a$')) {
    // Legacy bcrypt hash -- verify with bcrypt, then re-hash to argon2
    const valid = await bcrypt.compare(password, hash);
    if (valid) {
      const newHash = await argon2.hash(password, ARGON2_CONFIG);
      return { valid: true, newHash };
    }
    return { valid: false };
  }
  // Modern argon2 hash
  const valid = await argon2.verify(hash, password);
  return { valid, newHash: undefined };
}

// --- In-memory lockout helpers (used as fallback) ---

function isLockedOutInMemory(email: string): boolean {
  const record = failedLogins.get(email);
  if (!record || !record.lockedUntil) return false;
  if (Date.now() > record.lockedUntil) {
    failedLogins.delete(email);
    return false;
  }
  return true;
}

function getLockoutTimeRemainingInMemory(email: string): number {
  const record = failedLogins.get(email);
  if (!record || !record.lockedUntil) return 0;
  return Math.max(0, Math.ceil((record.lockedUntil - Date.now()) / 1000));
}

function recordFailedLoginInMemory(email: string): void {
  const record = failedLogins.get(email) || { count: 0 };
  record.count++;
  if (record.count >= LOCKOUT_THRESHOLD) {
    record.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
  }
  failedLogins.set(email, record);
}

function clearFailedLoginsInMemory(email: string): void {
  failedLogins.delete(email);
}

// --- Public async lockout API (Redis-first with in-memory fallback) ---

/** Check if an email is locked out */
export async function isLockedOut(email: string): Promise<boolean> {
  if (isRedisLockoutEnabled()) {
    try {
      return await redisLockout.isLockedOut(email);
    } catch (_err: unknown) {
      logger.warn({ module: 'AuthService', email }, 'Redis lockout check failed, falling back to in-memory');
    }
  }
  return isLockedOutInMemory(email);
}

/** Get remaining lockout time in seconds */
export async function getLockoutTimeRemaining(email: string): Promise<number> {
  if (isRedisLockoutEnabled()) {
    try {
      return await redisLockout.getLockoutTimeRemaining(email);
    } catch (_err: unknown) {
      logger.warn({ module: 'AuthService', email }, 'Redis lockout TTL check failed, falling back to in-memory');
    }
  }
  return getLockoutTimeRemainingInMemory(email);
}

/** Record a failed login attempt */
export async function recordFailedLogin(email: string): Promise<void> {
  if (isRedisLockoutEnabled()) {
    try {
      await redisLockout.recordFailedLogin(email);
      return;
    } catch (_err: unknown) {
      logger.warn({ module: 'AuthService', email }, 'Redis record failed login failed, falling back to in-memory');
    }
  }
  recordFailedLoginInMemory(email);
}

/** Clear failed login attempts */
export async function clearFailedLogins(email: string): Promise<void> {
  if (isRedisLockoutEnabled()) {
    try {
      await redisLockout.clearFailedLogins(email);
      return;
    } catch (_err: unknown) {
      logger.warn({ module: 'AuthService', email }, 'Redis clear failed logins failed, falling back to in-memory');
    }
  }
  clearFailedLoginsInMemory(email);
}

// Export as an object for routes.ts compatibility
export const authService = {
  registerUser,
  loginUser,
  hashPassword,
  comparePassword,
  comparePasswordWithRehash,
  isLockedOut,
  getLockoutTimeRemaining,
  recordFailedLogin,
  clearFailedLogins,
};
