import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';
import type { User } from '../../shared/schema';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
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
    failedAttempts: user.failedAttempts,
    lockedUntil: user.lockedUntil,
    createdAt: user.createdAt,
  };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.session?.userId;

  if (!userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const user = await storage.getUserById(userId);
  if (!user) {
    // Session refers to non-existent user, destroy it
    req.session.destroy(() => {});
    res.status(401).json({ error: 'Session expired' });
    return;
  }

  req.user = sanitizeUser(user);
  next();
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = req.session?.userId;

  if (userId) {
    const user = await storage.getUserById(userId);
    if (user) {
      req.user = sanitizeUser(user);
    }
  }

  next();
}
