import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that checks the authenticated user has one of the specified roles.
 * Must be used AFTER requireAuth (req.user must be populated).
 *
 * @param roles - Allowed roles (e.g. 'admin', 'editor')
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const userRole = req.user?.role;

    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
}
