import bcrypt from "bcrypt";

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const loginAttempts = new Map<string, { count: number; lockoutUntil: number | null }>();

export const authService = {
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  },

  isLockedOut(email: string): boolean {
    const record = loginAttempts.get(email);
    if (!record?.lockoutUntil) return false;
    
    if (Date.now() > record.lockoutUntil) {
      loginAttempts.delete(email);
      return false;
    }
    
    return true;
  },

  recordFailedLogin(email: string): void {
    const record = loginAttempts.get(email) || { count: 0, lockoutUntil: null };
    record.count++;
    
    if (record.count >= MAX_LOGIN_ATTEMPTS) {
      record.lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
    }
    
    loginAttempts.set(email, record);
  },

  clearFailedLogins(email: string): void {
    loginAttempts.delete(email);
  },

  getLockoutTimeRemaining(email: string): number {
    const record = loginAttempts.get(email);
    if (!record?.lockoutUntil) return 0;
    
    const remaining = record.lockoutUntil - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  },
};
