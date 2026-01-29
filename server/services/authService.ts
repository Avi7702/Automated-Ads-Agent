import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import type { User } from '../../shared/schema';
import { createAuthFailedLoginsMap } from '../utils/memoryManager';
import { logger } from '../lib/logger';
import * as redisLockout from './redisAuthLockout';

const BCRYPT_ROUNDS = 12;
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
      error: 'Password must contain at least 3 of: uppercase, lowercase, number, special character'
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

  // Hash password
  const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user
  const user = await storage.createUser(email, hashedPassword);

  return {
    success: true,
    user: sanitizeUser(user),
  };
}

// Dummy hash for timing attack prevention (pre-computed bcrypt hash)
const DUMMY_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X.wJJPK.abc123xyz';

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  // Find user
  const user = await storage.getUserByEmail(email);

  // ALWAYS run bcrypt.compare() to prevent timing attacks
  // This ensures consistent response time whether user exists or not
  const hashToCompare = user?.password || DUMMY_HASH;
  const isValid = await bcrypt.compare(password, hashToCompare);

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

// Password hashing helper
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

// Password comparison helper
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
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
  isLockedOut,
  getLockoutTimeRemaining,
  recordFailedLogin,
  clearFailedLogins,
};
