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

export async function loginUser(email: string, password: string): Promise<AuthResult> {
  // Find user
  const user = await storage.getUserByEmail(email);
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

  // Verify password
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    await storage.incrementFailedAttempts(user.id);
    return { success: false, error: 'Invalid email or password', statusCode: 401 };
  }

  // Reset failed attempts on successful login
  await storage.resetFailedAttempts(user.id);

  // Create session
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
