/**
 * User Test Fixtures
 *
 * Mock user data for testing authentication, authorization, and user-specific features.
 * Covers various roles, permissions, and account states.
 *
 * @file client/src/fixtures/users.ts
 */

import type { User, Session, BrandProfile } from '../../../shared/schema';
import type { BrandVoice } from '../../../shared/types/ideaBank';

// Base date for consistent timestamps in tests
const BASE_DATE = new Date('2026-01-15T12:00:00Z');

function daysAgo(days: number): Date {
  return new Date(BASE_DATE.getTime() - days * 24 * 60 * 60 * 1000);
}

function hoursFromNow(hours: number): Date {
  return new Date(BASE_DATE.getTime() + hours * 60 * 60 * 1000);
}

// === MOCK USERS ===

/**
 * Full mock users array with various account states
 */
export const mockUsers: User[] = [
  // === ACTIVE USERS ===
  {
    id: 'user-admin-001',
    email: 'admin@company.com',
    password: 'hashed_admin_password_123',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv.hashedadminpassword123',
    role: 'user',
    failedAttempts: 0,
    lockedUntil: null,
    brandVoice: {
      principles: ['Professional', 'Authoritative', 'Helpful'],
      wordsToAvoid: ['cheap', 'basic'],
      wordsToUse: ['premium', 'quality', 'professional'],
    },
    createdAt: daysAgo(365),
  },
  {
    id: 'user-test-1',
    email: 'user1@example.com',
    password: 'hashed_password_123',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv.hashedpassword123',
    role: 'user',
    failedAttempts: 0,
    lockedUntil: null,
    brandVoice: {
      principles: ['Friendly', 'Technical', 'Trustworthy'],
      wordsToAvoid: ['expensive', 'complicated'],
      wordsToUse: ['reliable', 'durable', 'easy'],
    },
    createdAt: daysAgo(90),
  },
  {
    id: 'user-test-2',
    email: 'user2@example.com',
    password: 'hashed_password_456',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv.hashedpassword456',
    role: 'user',
    failedAttempts: 0,
    lockedUntil: null,
    brandVoice: null,
    createdAt: daysAgo(60),
  },
  {
    id: 'user-test-3',
    email: 'newuser@example.com',
    password: 'hashed_password_789',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv.hashedpassword789',
    role: 'user',
    failedAttempts: 0,
    lockedUntil: null,
    brandVoice: null,
    createdAt: daysAgo(1),
  },

  // === LOCKED USERS ===
  {
    id: 'user-locked-001',
    email: 'locked@example.com',
    password: 'hashed_password_locked',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv.hashedlockedpw',
    role: 'user',
    failedAttempts: 5,
    lockedUntil: hoursFromNow(1), // Locked for 1 more hour
    brandVoice: null,
    createdAt: daysAgo(30),
  },
  {
    id: 'user-locked-002',
    email: 'temporarily-locked@example.com',
    password: 'hashed_password_temp',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv.hashedtemppw',
    role: 'user',
    failedAttempts: 3,
    lockedUntil: new Date(BASE_DATE.getTime() - 60 * 60 * 1000), // Lock expired 1 hour ago
    brandVoice: null,
    createdAt: daysAgo(45),
  },

  // === EDGE CASES ===
  {
    id: 'user-edge-001',
    email: 'edge+special@example.com', // Email with special characters
    password: 'hashed_edge_pw',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv.hashededgepw',
    role: 'user',
    failedAttempts: 0,
    lockedUntil: null,
    brandVoice: {
      principles: [],
      wordsToAvoid: [],
      wordsToUse: [],
    },
    createdAt: daysAgo(15),
  },
  {
    id: 'user-edge-002',
    email: 'unicode.user@example.com',
    password: 'hashed_unicode_pw',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv.hashedunicodepw',
    role: 'user',
    failedAttempts: 0,
    lockedUntil: null,
    brandVoice: {
      principles: ['Quality'],
      wordsToAvoid: null as unknown as string[], // Testing null handling
      wordsToUse: null as unknown as string[],
    },
    createdAt: daysAgo(10),
  },
];

// === MOCK SESSIONS ===

/**
 * Mock sessions for authentication testing
 */
export const mockSessions: Session[] = [
  // Active sessions
  {
    id: 'session-active-001',
    userId: 'user-test-1',
    expiresAt: hoursFromNow(24),
    createdAt: daysAgo(0),
  },
  {
    id: 'session-active-002',
    userId: 'user-admin-001',
    expiresAt: hoursFromNow(48),
    createdAt: daysAgo(1),
  },
  {
    id: 'session-active-003',
    userId: 'user-test-2',
    expiresAt: hoursFromNow(12),
    createdAt: new Date(BASE_DATE.getTime() - 12 * 60 * 60 * 1000),
  },

  // Expired sessions
  {
    id: 'session-expired-001',
    userId: 'user-test-1',
    expiresAt: new Date(BASE_DATE.getTime() - 60 * 60 * 1000), // Expired 1 hour ago
    createdAt: daysAgo(2),
  },
  {
    id: 'session-expired-002',
    userId: 'user-test-3',
    expiresAt: daysAgo(7),
    createdAt: daysAgo(8),
  },

  // Session about to expire
  {
    id: 'session-expiring-001',
    userId: 'user-test-2',
    expiresAt: new Date(BASE_DATE.getTime() + 5 * 60 * 1000), // Expires in 5 minutes
    createdAt: daysAgo(0),
  },
];

// === MOCK BRAND PROFILES ===

/**
 * Mock brand profiles for enhanced user context
 */
export const mockBrandProfiles: BrandProfile[] = [
  {
    id: 'bp-001',
    userId: 'user-admin-001',
    brandName: 'Pro Building Supplies',
    industry: 'Construction Materials',
    brandValues: ['Quality', 'Reliability', 'Professional Service', 'Fast Shipping'],
    targetAudience: {
      demographics: 'Professional contractors, 30-55, Male-dominated',
      psychographics: 'Value-driven, time-conscious, quality-focused',
      painPoints: ['Long delivery times', 'Inconsistent quality', 'Poor technical support'],
    },
    preferredStyles: ['industrial', 'professional', 'bold'],
    colorPreferences: ['blue', 'orange', 'gray'],
    voice: {
      principles: ['Professional', 'Authoritative', 'Helpful'],
      wordsToUse: ['premium', 'professional-grade', 'trusted'],
      wordsToAvoid: ['cheap', 'basic', 'amateur'],
    },
    kbTags: ['construction', 'drainage', 'waterproofing'],
    createdAt: daysAgo(300),
    updatedAt: daysAgo(30),
  },
  {
    id: 'bp-002',
    userId: 'user-test-1',
    brandName: 'HomeStyle Flooring',
    industry: 'Flooring & Tile',
    brandValues: ['Beautiful Spaces', 'Easy Installation', 'Affordable Luxury'],
    targetAudience: {
      demographics: 'Homeowners, 25-50, DIY enthusiasts',
      psychographics: 'Design-conscious, budget-aware, project-oriented',
      painPoints: ['Complex installation', 'Limited selection', 'High prices'],
    },
    preferredStyles: ['modern', 'minimal', 'warm'],
    colorPreferences: ['neutral', 'earth-tones', 'white'],
    voice: {
      principles: ['Friendly', 'Inspiring', 'Helpful'],
      wordsToUse: ['beautiful', 'easy', 'transform'],
      wordsToAvoid: ['complicated', 'expensive'],
    },
    kbTags: ['flooring', 'tile', 'residential'],
    createdAt: daysAgo(90),
    updatedAt: daysAgo(7),
  },
  {
    id: 'bp-003',
    userId: 'user-test-2',
    brandName: null, // Incomplete profile
    industry: 'General Construction',
    brandValues: null,
    targetAudience: null,
    preferredStyles: null,
    colorPreferences: null,
    voice: null,
    kbTags: null,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(60),
  },
];

// === FILTERED SUBSETS ===

/** Active (unlocked) users */
export const activeUsers = mockUsers.filter((u) => u.lockedUntil === null || u.lockedUntil < BASE_DATE);

/** Currently locked users */
export const lockedUsers = mockUsers.filter((u) => u.lockedUntil !== null && u.lockedUntil > BASE_DATE);

/** Users with brand voice configured */
export const usersWithBrandVoice = mockUsers.filter((u) => u.brandVoice !== null);

/** Users without brand voice */
export const usersWithoutBrandVoice = mockUsers.filter((u) => u.brandVoice === null);

/** Recently created users (last 7 days) */
export const recentUsers = mockUsers.filter((u) => u.createdAt >= daysAgo(7));

/** Active sessions (not expired) */
export const activeSessions = mockSessions.filter((s) => s.expiresAt > BASE_DATE);

/** Expired sessions */
export const expiredSessions = mockSessions.filter((s) => s.expiresAt <= BASE_DATE);

/** Sessions expiring within 1 hour */
export const expiringSessions = mockSessions.filter((s) => {
  const oneHourFromNow = new Date(BASE_DATE.getTime() + 60 * 60 * 1000);
  return s.expiresAt > BASE_DATE && s.expiresAt <= oneHourFromNow;
});

/** Complete brand profiles */
export const completeBrandProfiles = mockBrandProfiles.filter((bp) => bp.brandName !== null && bp.voice !== null);

/** Incomplete brand profiles */
export const incompleteBrandProfiles = mockBrandProfiles.filter((bp) => bp.brandName === null || bp.voice === null);

// === FACTORY FUNCTIONS ===

/**
 * Creates a new mock user with custom overrides
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const id = overrides.id || `user-test-${Date.now()}`;
  return {
    id,
    email: `${id}@example.com`,
    password: 'hashed_test_password',
    passwordHash: '$2b$10$abcdefghijklmnopqrstuv.hashedtestpw',
    role: 'user',
    failedAttempts: 0,
    lockedUntil: null,
    brandVoice: null,
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a locked user
 */
export function createLockedUser(lockDurationHours: number = 1, overrides: Partial<User> = {}): User {
  return createMockUser({
    failedAttempts: 5,
    lockedUntil: hoursFromNow(lockDurationHours),
    ...overrides,
  });
}

/**
 * Creates a user with brand voice configured
 */
export function createUserWithBrandVoice(brandVoice: BrandVoice, overrides: Partial<User> = {}): User {
  return createMockUser({
    brandVoice: brandVoice as unknown as typeof overrides.brandVoice,
    ...overrides,
  });
}

/**
 * Creates a new mock session
 */
export function createMockSession(userId: string, overrides: Partial<Session> = {}): Session {
  const id = overrides.id || `session-test-${Date.now()}`;
  return {
    id,
    userId,
    expiresAt: hoursFromNow(24),
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates an expired session
 */
export function createExpiredSession(
  userId: string,
  hoursExpiredAgo: number = 1,
  overrides: Partial<Session> = {},
): Session {
  return createMockSession(userId, {
    expiresAt: new Date(BASE_DATE.getTime() - hoursExpiredAgo * 60 * 60 * 1000),
    ...overrides,
  });
}

/**
 * Creates a new mock brand profile
 */
export function createMockBrandProfile(userId: string, overrides: Partial<BrandProfile> = {}): BrandProfile {
  const id = overrides.id || `bp-test-${Date.now()}`;
  const now = new Date();
  return {
    id,
    userId,
    brandName: 'Test Brand',
    industry: 'Test Industry',
    brandValues: ['Quality', 'Service'],
    targetAudience: {
      demographics: 'Test demographics',
      psychographics: 'Test psychographics',
      painPoints: ['Pain point 1', 'Pain point 2'],
    },
    preferredStyles: ['professional'],
    colorPreferences: ['blue'],
    voice: {
      principles: ['Professional'],
      wordsToUse: ['quality'],
      wordsToAvoid: ['cheap'],
    },
    kbTags: ['test'],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

// === SINGLE USER EXPORTS ===

/** Admin user with full permissions */
export const adminUser = mockUsers[0];

/** Standard active user */
export const standardUser = mockUsers[1];

/** User without brand voice */
export const userWithoutBrandVoice = mockUsers[2];

/** Newly created user */
export const newUser = mockUsers[3];

/** Currently locked user */
export const lockedUser = mockUsers[4];

/** User with expired lock */
export const expiredLockUser = mockUsers[5];

// === SESSION EXPORTS ===

/** An active valid session */
export const validSession = mockSessions[0];

/** An expired session */
export const expiredSession = mockSessions[3];

/** A session about to expire */
export const expiringSession = mockSessions[5];

// === BRAND PROFILE EXPORTS ===

/** A complete brand profile */
export const completeBrandProfile = mockBrandProfiles[0];

/** An incomplete brand profile */
export const incompleteBrandProfile = mockBrandProfiles[2];

// === AUTHENTICATION TEST HELPERS ===

/**
 * Credentials for testing login
 */
export const testCredentials = {
  valid: {
    email: 'user1@example.com',
    password: 'correct_password_123',
  },
  invalid: {
    email: 'user1@example.com',
    password: 'wrong_password',
  },
  nonexistent: {
    email: 'nobody@example.com',
    password: 'any_password',
  },
  locked: {
    email: 'locked@example.com',
    password: 'locked_password',
  },
};

/**
 * JWT-like tokens for testing (not real JWTs)
 */
export const testTokens = {
  valid:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLXRlc3QtMSIsImV4cCI6OTk5OTk5OTk5OX0.mock_valid_signature',
  expired:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyLXRlc3QtMSIsImV4cCI6MTAwMDAwMDAwMH0.mock_expired_signature',
  malformed: 'not.a.valid.jwt',
  missingUserId: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjk5OTk5OTk5OTl9.mock_no_user_signature',
};
