import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import type { User } from '../../shared/schema';
import { logger } from '../lib/logger';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        failedAttempts: number | null;
        lockedUntil: Date | null;
        createdAt: Date;
      };
    }
  }
}

// Sanitize user object to remove sensitive fields
function sanitizeUser(user: User): Express.Request['user'] {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    failedAttempts: user.failedAttempts,
    lockedUntil: user.lockedUntil,
    createdAt: user.createdAt,
  };
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const userId = req.session?.userId;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const user = await storage.getUserById(userId);
  if (!user) {
    // Session refers to non-existent user, destroy it
    // Use promisified destroy to avoid race conditions
    await new Promise<void>((resolve) => {
      req.session.destroy((err) => {
        if (err) {
          logger.error({ module: 'Auth', err }, 'Failed to destroy session');
        }
        resolve();
      });
    });
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  const sanitized = sanitizeUser(user);
  if (sanitized !== undefined) {
    req.user = sanitized;
  }
  next();
}

export async function optionalAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const userId = req.session?.userId;

  if (userId) {
    const user = await storage.getUserById(userId);
    if (user) {
      const sanitized = sanitizeUser(user);
      if (sanitized !== undefined) {
        req.user = sanitized;
      }
    }
  }

  next();
}
