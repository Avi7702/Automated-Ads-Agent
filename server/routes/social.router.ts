/**
 * Social Router
 * Social media account management + OAuth connect endpoints
 *
 * Endpoints:
 * - GET /api/social/accounts - List connected social accounts
 * - DELETE /api/social/accounts/:id - Disconnect social account
 * - POST /api/social/sync-accounts - Sync account from n8n (legacy)
 * - GET /api/social/oauth/:platform/authorize - Start OAuth flow
 * - GET /api/social/oauth/:platform/callback - Handle OAuth redirect
 * - POST /api/social/accounts/:id/refresh - Manual token refresh
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';
import { getAuthorizationUrl, handleOAuthCallback } from '../services/oauthService';
import { refreshToken } from '../services/tokenService';

export const socialRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth, validate } = ctx.middleware;
  const { syncAccount } = ctx.schemas;

  /**
   * GET /accounts - List connected social accounts
   */
  router.get(
    '/accounts',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const connections = await storage.getSocialConnections(req.user!.id);

        // Sanitize: Remove sensitive OAuth token data
        const safeConnections = connections.map((conn: any) => ({
          id: conn.id,
          userId: conn.userId,
          platform: conn.platform,
          platformUserId: conn.platformUserId,
          platformUsername: conn.platformUsername,
          profilePictureUrl: conn.profilePictureUrl,
          accountType: conn.accountType,
          scopes: conn.scopes,
          isActive: conn.isActive,
          tokenExpiresAt: conn.tokenExpiresAt,
          lastUsedAt: conn.lastUsedAt,
          lastErrorAt: conn.lastErrorAt,
          lastErrorMessage: conn.lastErrorMessage,
          connectedAt: conn.connectedAt,
          updatedAt: conn.updatedAt,
        }));

        res.json({ accounts: safeConnections });
      } catch (error) {
        logger.error({ module: 'SocialAccounts', err: error }, 'Failed to fetch accounts');
        res.status(500).json({
          success: false,
          error: 'Failed to fetch social accounts',
        });
      }
    }),
  );

  /**
   * DELETE /accounts/:id - Disconnect a social account
   */
  router.delete(
    '/accounts/:id',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const id = String(req.params['id']);

        // Verify ownership
        const connection = await storage.getSocialConnectionById(id);

        if (!connection) {
          return res.status(404).json({
            success: false,
            error: 'Account not found',
          });
        }

        if (connection.userId !== req.user!.id) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized: You do not own this account',
          });
        }

        await storage.deleteSocialConnection(id);

        logger.info(
          {
            userId: req.user!.id,
            platform: connection.platform,
          },
          'Social account disconnected',
        );

        res.json({
          success: true,
          message: `${connection.platform} account disconnected`,
        });
      } catch (error) {
        logger.error(
          {
            module: 'SocialAccounts',
            err: error,
            connectionId: req.params['id'],
          },
          'Failed to disconnect account',
        );

        res.status(500).json({
          success: false,
          error: 'Failed to disconnect account',
        });
      }
    }),
  );

  /**
   * POST /sync-accounts - Sync account from n8n to local database
   * Called after user configures OAuth in n8n
   */
  router.post(
    '/sync-accounts',
    requireAuth,
    validate(syncAccount),
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const { platform, n8nCredentialId: _n8nCredentialId, platformUserId, platformUsername, accountType } = req.body;

        // Check if connection already exists
        const existing = await storage.getSocialConnectionByPlatform(req.user!.id, platform);

        if (existing) {
          // Update existing connection
          const updated = await storage.updateSocialConnection(existing.id, {
            platformUserId,
            platformUsername,
            accountType: accountType || 'personal',
            isActive: true,
            lastErrorAt: null,
            lastErrorMessage: null,
          });

          return res.json({
            success: true,
            data: updated,
            message: `${platform} account synced (updated)`,
          });
        }

        // Create new connection
        const connection = await storage.createSocialConnection({
          userId: req.user!.id,
          platform,
          platformUserId,
          platformUsername,
          accountType: accountType || 'personal',
          isActive: true,
          // OAuth fields (managed by n8n, placeholder values)
          accessToken: 'managed_by_n8n',
          tokenIv: 'n8n',
          tokenAuthTag: 'n8n',
          tokenExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        });

        res.json({
          success: true,
          data: connection,
          message: `${platform} account synced (new)`,
        });
      } catch (error) {
        logger.error(
          {
            module: 'SocialAccounts',
            err: error,
            platform: req.body.platform,
          },
          'Failed to sync account from n8n',
        );

        res.status(500).json({
          success: false,
          error: 'Failed to sync account from n8n',
        });
      }
    }),
  );

  // ──────────────────────────────────────────────
  // OAuth Endpoints
  // ──────────────────────────────────────────────

  /**
   * GET /oauth/:platform/authorize - Start OAuth flow
   * Returns the authorization URL for the given platform.
   */
  router.get(
    '/oauth/:platform/authorize',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const platform = String(req.params['platform']);

        if (platform !== 'linkedin' && platform !== 'twitter') {
          return res.status(400).json({
            success: false,
            error: `Unsupported OAuth platform: ${platform}. Supported: linkedin, twitter`,
          });
        }

        const authUrl = await getAuthorizationUrl(platform, req.user!.id);

        res.json({ success: true, authUrl });
      } catch (error) {
        logger.error(
          { module: 'OAuth', err: error, platform: req.params['platform'] },
          'Failed to generate authorization URL',
        );
        res.status(500).json({
          success: false,
          error: 'Failed to start OAuth flow',
        });
      }
    }),
  );

  /**
   * GET /oauth/:platform/callback - Handle OAuth redirect from provider
   * Validates state, exchanges code, stores encrypted tokens, redirects to UI.
   */
  router.get(
    '/oauth/:platform/callback',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const platform = String(req.params['platform']);

        if (platform !== 'linkedin' && platform !== 'twitter') {
          return res.redirect('/pipeline?tab=social-accounts&error=unsupported_platform');
        }

        const code = String(req.query['code'] ?? '');
        const state = String(req.query['state'] ?? '');
        const errorParam = req.query['error'];

        // Provider returned an error (user denied access, etc.)
        if (errorParam) {
          logger.warn(
            { platform, error: errorParam, errorDescription: req.query['error_description'] },
            'OAuth provider returned error',
          );
          return res.redirect(`/pipeline?tab=social-accounts&error=${encodeURIComponent(String(errorParam))}`);
        }

        if (!code || !state) {
          return res.redirect('/pipeline?tab=social-accounts&error=missing_params');
        }

        const result = await handleOAuthCallback(platform, code, state);

        logger.info(
          { userId: req.user!.id, platform, connectionId: result.connectionId },
          'OAuth callback processed successfully',
        );

        res.redirect(`/pipeline?tab=social-accounts&connected=${platform}`);
      } catch (error) {
        logger.error({ module: 'OAuth', err: error, platform: req.params['platform'] }, 'OAuth callback failed');
        res.redirect('/pipeline?tab=social-accounts&error=oauth_failed');
      }
    }),
  );

  /**
   * POST /accounts/:id/refresh - Manual token refresh
   * Allows the UI to trigger a token refresh on demand.
   */
  router.post(
    '/accounts/:id/refresh',
    requireAuth,
    asyncHandler(async (req: Request, res: Response) => {
      try {
        const id = String(req.params['id']);

        // Verify ownership
        const connection = await storage.getSocialConnectionById(id);

        if (!connection) {
          return res.status(404).json({
            success: false,
            error: 'Account not found',
          });
        }

        if (connection.userId !== req.user!.id) {
          return res.status(403).json({
            success: false,
            error: 'Unauthorized: You do not own this account',
          });
        }

        await refreshToken(id);

        // Re-fetch to get updated expiry
        const updated = await storage.getSocialConnectionById(id);

        res.json({
          success: true,
          message: `${connection.platform} token refreshed`,
          tokenExpiresAt: updated?.tokenExpiresAt,
        });
      } catch (error) {
        logger.error({ module: 'OAuth', err: error, connectionId: req.params['id'] }, 'Manual token refresh failed');
        res.status(500).json({
          success: false,
          error: 'Failed to refresh token',
        });
      }
    }),
  );

  return router;
};

export const socialRouterModule: RouterModule = {
  prefix: '/api/social',
  factory: socialRouter,
  description: 'Social media account management and OAuth',
  endpointCount: 6,
  requiresAuth: true,
  tags: ['social', 'accounts', 'oauth'],
};
