/**
 * Auth Router
 * Authentication endpoints for user registration, login, and session management
 *
 * Endpoints:
 * - POST /api/auth/register - Register new user
 * - POST /api/auth/login - Login user
 * - POST /api/auth/logout - Logout user
 * - GET /api/auth/me - Get current user
 * - GET /api/auth/demo - Get or create demo session
 * - POST /api/auth/forgot-password - Request password reset
 * - POST /api/auth/reset-password - Reset password with token
 * - POST /api/auth/verify-email - Verify email with token
 * - DELETE /api/auth/account - Delete user account
 * - GET /api/auth/export - Export all user data
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { validate } from '../middleware/validate';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validation/schemas';

export const authRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger, telemetry } = ctx.services;
  const { authService } = ctx.domainServices;
  const { requireAuth } = ctx.middleware;

  /**
   * POST /register - Register a new user account
   */
  router.post(
    '/register',
    validate(registerSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;

        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = await authService.hashPassword(password);
        const user = await storage.createUser(email, hashedPassword);

        req.session.userId = user.id;

        telemetry.trackAuth({
          action: 'register',
          success: true,
          userId: user.id,
        });

        res.json({ id: user.id, email: user.email });
      } catch (err: unknown) {
        logger.error({ module: 'Auth', action: 'register', err }, 'Registration error');

        telemetry.trackAuth({
          action: 'register',
          success: false,
          reason: err instanceof Error ? err.message : String(err),
        });

        res.status(500).json({ error: 'Registration failed' });
      }
    }),
  );

  /**
   * POST /login - Login existing user
   */
  router.post(
    '/login',
    validate(loginSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { email, password } = req.body;

        // Check lockout
        if (await authService.isLockedOut(email)) {
          const remaining = await authService.getLockoutTimeRemaining(email);
          return res.status(429).json({
            error: 'Too many failed attempts. Try again later.',
            retryAfter: remaining,
          });
        }

        const user = await storage.getUserByEmail(email);
        if (!user) {
          await authService.recordFailedLogin(email);
          telemetry.trackAuth({
            action: 'login',
            success: false,
            reason: 'user_not_found',
          });
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        const { valid, newHash } = await authService.comparePasswordWithRehash(
          password,
          user.passwordHash || user.password,
        );
        if (!valid) {
          await authService.recordFailedLogin(email);
          telemetry.trackAuth({
            action: 'login',
            success: false,
            reason: 'invalid_password',
          });
          return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Transparent bcrypt->argon2 migration: update hash if re-hashed
        if (newHash) {
          await storage.updatePasswordHash(user.id, newHash);
        }

        await authService.clearFailedLogins(email);
        req.session.userId = user.id;

        telemetry.trackAuth({
          action: 'login',
          success: true,
          userId: user.id,
        });

        res.json({ id: user.id, email: user.email });
      } catch (err: unknown) {
        logger.error({ module: 'Auth', action: 'login', err }, 'Login error');

        telemetry.trackAuth({
          action: 'login',
          success: false,
          reason: err instanceof Error ? err.message : String(err),
        });

        res.status(500).json({ error: 'Login failed' });
      }
    }),
  );

  /**
   * POST /logout - Logout current user
   */
  router.post('/logout', (req: Request, res: Response) => {
    req.session.destroy((err: Error | null) => {
      if (err) {
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });

  /**
   * GET /me - Get current authenticated user
   * Returns 200 with authenticated: false if not logged in (no 401 in console)
   */
  router.get(
    '/me',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session?.userId;

        // Not authenticated - return 200 with authenticated: false (no console error)
        if (!userId) {
          return res.json({ authenticated: false });
        }

        const user = await storage.getUserById(userId);
        if (!user) {
          // Session refers to non-existent user
          return res.json({ authenticated: false });
        }

        res.json({ authenticated: true, id: user.id, email: user.email });
      } catch (err: unknown) {
        logger.error({ module: 'Auth', action: 'me', err }, 'Get user error');
        res.status(500).json({ error: 'Failed to get user' });
      }
    }),
  );

  /**
   * GET /demo - Auto-login as demo user for single-tenant mode
   * Disabled in production unless ENABLE_DEMO_MODE=true
   */
  router.get(
    '/demo',
    asyncHandler(async (req: Request, res: Response) => {
      try {
        // BUG-013 fix: Block demo endpoint in production unless explicitly enabled
        if (process.env['NODE_ENV'] === 'production' && process.env['ENABLE_DEMO_MODE'] !== 'true') {
          return res.status(404).json({ error: 'Not found' });
        }

        const demoEmail = 'demo@company.com';
        let user = await storage.getUserByEmail(demoEmail);

        if (!user) {
          // Create demo user if doesn't exist
          const hashedPassword = await authService.hashPassword('demo123');
          user = await storage.createUser(demoEmail, hashedPassword);
        }

        req.session.userId = user.id;
        res.json({ id: user.id, email: user.email, isDemo: true });
      } catch (err: unknown) {
        logger.error({ module: 'Auth', action: 'demo', err }, 'Demo login error');
        res.status(500).json({ error: 'Demo login failed' });
      }
    }),
  );

  /**
   * POST /forgot-password - Request password reset
   */
  router.post(
    '/forgot-password',
    validate(forgotPasswordSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { email } = req.body;
        // Always return success to avoid email enumeration
        logger.info(
          { module: 'Auth', action: 'forgot-password', hasEmail: Boolean(email) },
          'Password reset requested',
        );
        res.json({ message: 'If an account exists with that email, a reset link has been sent.' });
      } catch {
        logger.error({ module: 'Auth', action: 'forgot-password' }, 'Password reset error');
        res.status(500).json({ error: 'Failed to process request' });
      }
    }),
  );

  /**
   * POST /reset-password - Reset password with token
   */
  router.post(
    '/reset-password',
    validate(resetPasswordSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { token: _token, newPassword: _newPassword } = req.body;
        // Token validation will be implemented when email service is added
        logger.info({ module: 'Auth', action: 'reset-password' }, 'Password reset attempted');
        res.status(501).json({ error: 'Email service not configured. Contact administrator.' });
      } catch (err: unknown) {
        logger.error({ module: 'Auth', action: 'reset-password', err }, 'Password reset error');
        res.status(500).json({ error: 'Failed to reset password' });
      }
    }),
  );

  /**
   * POST /verify-email - Verify email with token
   */
  router.post(
    '/verify-email',
    validate(verifyEmailSchema),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { token: _verifyToken } = req.body;
        logger.info({ module: 'Auth', action: 'verify-email' }, 'Email verification attempted');
        res.status(501).json({ error: 'Email service not configured. Contact administrator.' });
      } catch (err: unknown) {
        logger.error({ module: 'Auth', action: 'verify-email', err }, 'Email verification error');
        res.status(500).json({ error: 'Failed to verify email' });
      }
    }),
  );

  /**
   * DELETE /account - Delete user account
   */
  router.delete(
    '/account',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const userId = req.session.userId;
        if (!userId) {
          return res.status(401).json({ error: 'Unauthorized' });
        }

        await storage.deleteUser(userId);

        req.session.destroy((destroyError: Error | null) => {
          if (destroyError) {
            logger.warn(
              { module: 'Auth', action: 'delete-account', err: destroyError },
              'Session destroy failed after account deletion',
            );
          }
        });

        res.clearCookie('connect.sid');
        res.json({ message: 'Account deleted successfully' });
      } catch (err: unknown) {
        logger.error({ module: 'Auth', action: 'delete-account', err }, 'Account deletion error');
        res.status(500).json({ error: 'Failed to delete account' });
      }
    }),
  );

  /**
   * GET /export - Export all user data (data portability)
   */
  router.get(
    '/export',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const uid = req.session?.userId as string | undefined;
        if (!uid) {
          res.status(401).json({ error: 'Not authenticated' });
          return;
        }
        const user = await storage.getUserById(uid);
        // Optimized: Fetch only the current user's generations from the database
        // This replaces inefficient in-memory filtering of 1000+ generations
        const generations = await storage.getGenerationsByUserId(uid, 1000);
        const products = await storage.getProducts(1000);

        res.json({
          exportedAt: new Date().toISOString(),
          user: user ? { id: user.id, email: user.email, createdAt: user.createdAt } : null,
          generations,
          products,
        });
      } catch {
        logger.error({ module: 'Auth', action: 'export' }, 'Data export error');
        res.status(500).json({ error: 'Failed to export data' });
      }
    }),
  );

  return router;
};

export const authRouterModule: RouterModule = {
  prefix: '/api/auth',
  factory: authRouter,
  description: 'User authentication and session management',
  endpointCount: 10,
  requiresAuth: false,
  tags: ['authentication', 'users'],
};
