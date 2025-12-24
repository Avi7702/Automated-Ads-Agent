import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import type { User } from '../../shared/schema';

const BCRYPT_ROUNDS = 12;
const MAX_FAILED_ATTEMPTS = 5;
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface AuthResult {
  success: boolean;
  user?: Omit<User, 'passwordHash'>;
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

function sanitizeUser(user: User): Omit<User, 'passwordHash'> {
  const { passwordHash, ...safeUser } = user;
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
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // Create user
  const user = await storage.createUser(email, passwordHash);

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
  const hashToCompare = user?.passwordHash || DUMMY_HASH;
  const isValid = await bcrypt.compare(password, hashToCompare);

  // Check if user exists (after timing-consistent password check)
  if (!user) {
    return { success: false, error: 'Invalid email or password', statusCode: 401 };
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    const remainingMinutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
    return {
      success: false,
      error: `Account is locked. Try again in ${remainingMinutes} minutes`,
      statusCode: 423
    };
  }

  // Check password validity (already computed above)
  if (!isValid) {
    await storage.incrementFailedAttempts(user.id);
    return { success: false, error: 'Invalid email or password', statusCode: 401 };
  }

  // Reset failed attempts on successful login
  await storage.resetFailedAttempts(user.id);

  // Invalidate all existing sessions (prevents session fixation attacks)
  await storage.deleteAllUserSessions(user.id);

  // Create new session
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);
  await storage.createSession(user.id, sessionId, expiresAt);

  return {
    success: true,
    user: sanitizeUser(user),
    sessionId,
  };
}

export async function logoutUser(sessionId: string): Promise<void> {
  await storage.deleteSession(sessionId);
}

export async function validateSession(sessionId: string): Promise<AuthResult> {
  if (!sessionId) {
    return { success: false, error: 'Authentication required', statusCode: 401 };
  }

  const session = await storage.getSession(sessionId);
  if (!session) {
    return { success: false, error: 'Authentication required', statusCode: 401 };
  }

  const user = await storage.getUserById(session.userId);
  if (!user) {
    return { success: false, error: 'Authentication required', statusCode: 401 };
  }

  return {
    success: true,
    user: sanitizeUser(user),
  };
}

export async function getCurrentUser(sessionId: string): Promise<AuthResult> {
  return validateSession(sessionId);
}

const failedLoginAttempts: Map<string, { count: number; lockUntil: number | null }> = new Map();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export const authService = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  isLockedOut(email: string): boolean {
    const record = failedLoginAttempts.get(email);
    if (!record || !record.lockUntil) return false;
    if (Date.now() > record.lockUntil) {
      failedLoginAttempts.delete(email);
      return false;
    }
    return true;
  },

  getLockoutTimeRemaining(email: string): number {
    const record = failedLoginAttempts.get(email);
    if (!record || !record.lockUntil) return 0;
    const remaining = record.lockUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  },

  recordFailedLogin(email: string): void {
    const record = failedLoginAttempts.get(email) || { count: 0, lockUntil: null };
    record.count++;
    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      record.lockUntil = Date.now() + LOCKOUT_DURATION_MS;
    }
    failedLoginAttempts.set(email, record);
  },

  clearFailedLogins(email: string): void {
    failedLoginAttempts.delete(email);
  }
};
