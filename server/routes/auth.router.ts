/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
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
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { validate } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validation/schemas';

export const authRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger, telemetry } = ctx.services;
  const { authService } = ctx.domainServices;
  // requireAuth not needed in auth router (auth endpoints are public)

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

        (req as any).session.userId = user.id;

        telemetry.trackAuth({
          action: 'register',
          success: true,
          userId: user.id,
        });

        res.json({ id: user.id, email: user.email });
      } catch (error: any) {
        logger.error({ module: 'Auth', action: 'register', err: error }, 'Registration error');

        telemetry.trackAuth({
          action: 'register',
          success: false,
          reason: error.message,
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

        // Transparent bcrypt→argon2 migration: update hash if re-hashed
        if (newHash) {
          await storage.updatePasswordHash(user.id, newHash);
        }

        await authService.clearFailedLogins(email);
        (req as any).session.userId = user.id;

        telemetry.trackAuth({
          action: 'login',
          success: true,
          userId: user.id,
        });

        res.json({ id: user.id, email: user.email });
      } catch (error: any) {
        logger.error({ module: 'Auth', action: 'login', err: error }, 'Login error');

        telemetry.trackAuth({
          action: 'login',
          success: false,
          reason: error.message,
        });

        res.status(500).json({ error: 'Login failed' });
      }
    }),
  );

  /**
   * POST /logout - Logout current user
   */
  router.post('/logout', (req: Request, res: Response) => {
    (req as any).session.destroy((err: any) => {
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
        const userId = (req as any).session?.userId;

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
      } catch (error: any) {
        logger.error({ module: 'Auth', action: 'me', err: error }, 'Get user error');
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

        (req as any).session.userId = user.id;
        res.json({ id: user.id, email: user.email, isDemo: true });
      } catch (error: any) {
        logger.error({ module: 'Auth', action: 'demo', err: error }, 'Demo login error');
        res.status(500).json({ error: 'Demo login failed' });
      }
    }),
  );

  return router;
};

export const authRouterModule: RouterModule = {
  prefix: '/api/auth',
  factory: authRouter,
  description: 'User authentication and session management',
  endpointCount: 5,
  requiresAuth: false,
  tags: ['authentication', 'users'],
};
