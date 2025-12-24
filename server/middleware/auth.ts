import { Request, Response, NextFunction } from 'express';
import { validateSession } from '../services/authService';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        failedLoginAttempts: number;
        lockedUntil: Date | null;
        createdAt: Date;
        updatedAt: Date;
      };
      sessionId?: string;
    }
  }
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.sessionId;

  if (!sessionId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  const result = await validateSession(sessionId);

  if (!result.success) {
    res.status(result.statusCode || 401).json({ error: result.error });
    return;
  }

  req.user = result.user as Express.Request['user'];
  req.sessionId = sessionId;
  next();
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const sessionId = req.cookies?.sessionId;

  if (sessionId) {
    const result = await validateSession(sessionId);
    if (result.success) {
      req.user = result.user as Express.Request['user'];
      req.sessionId = sessionId;
    }
  }

  next();
}
