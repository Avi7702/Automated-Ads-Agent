import type { Request, Response, NextFunction } from "express";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = (req as any).session;
  if (!session?.userId) {
    return res.status(401).json({ error: "Authentication required" });
  }
  next();
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  next();
}

export function getSessionUserId(req: Request): string | null {
  const session = (req as any).session;
  return session?.userId || null;
}
