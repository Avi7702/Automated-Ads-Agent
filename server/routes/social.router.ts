/**
 * Social Router
 * Social media account management endpoints
 *
 * Endpoints:
 * - GET /api/social/accounts - List connected social accounts
 * - DELETE /api/social/accounts/:id - Disconnect social account
 * - POST /api/social/sync-accounts - Sync account from n8n
 */

import type { Router, Request, Response } from 'express';
import type { RouterContext, RouterFactory, RouterModule } from '../types/router';
import { createRouter, asyncHandler } from './utils/createRouter';

export const socialRouter: RouterFactory = (ctx: RouterContext): Router => {
  const router = createRouter();
  const { storage, logger } = ctx.services;
  const { requireAuth, validate } = ctx.middleware;
  const { syncAccount } = ctx.schemas;

  /**
   * GET /accounts - List connected social accounts
   */
  router.get('/accounts', requireAuth, asyncHandler(async (req: Request, res: Response) => {
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
        error: 'Failed to fetch social accounts'
      });
    }
  }));

  /**
   * DELETE /accounts/:id - Disconnect a social account
   */
  router.delete('/accounts/:id', requireAuth, asyncHandler(async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      // Verify ownership
      const connection = await storage.getSocialConnectionById(id);

      if (!connection) {
        return res.status(404).json({
          success: false,
          error: 'Account not found'
        });
      }

      if (connection.userId !== req.user!.id) {
        return res.status(403).json({
          success: false,
          error: 'Unauthorized: You do not own this account'
        });
      }

      await storage.deleteSocialConnection(id);

      logger.info({
        userId: req.user!.id,
        platform: connection.platform
      }, 'Social account disconnected');

      res.json({
        success: true,
        message: `${connection.platform} account disconnected`
      });
    } catch (error) {
      logger.error({
        module: 'SocialAccounts',
        err: error,
        connectionId: req.params.id
      }, 'Failed to disconnect account');

      res.status(500).json({
        success: false,
        error: 'Failed to disconnect account'
      });
    }
  }));

  /**
   * POST /sync-accounts - Sync account from n8n to local database
   * Called after user configures OAuth in n8n
   */
  router.post('/sync-accounts', requireAuth, validate(syncAccount), asyncHandler(async (req: Request, res: Response) => {
    try {
      const {
        platform,
        n8nCredentialId,
        platformUserId,
        platformUsername,
        accountType
      } = req.body;

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
      logger.error({
        module: 'SocialAccounts',
        err: error,
        platform: req.body.platform
      }, 'Failed to sync account from n8n');

      res.status(500).json({
        success: false,
        error: 'Failed to sync account from n8n'
      });
    }
  }));

  return router;
};

export const socialRouterModule: RouterModule = {
  prefix: '/api/social',
  factory: socialRouter,
  description: 'Social media account management',
  endpointCount: 3,
  requiresAuth: true,
  tags: ['social', 'accounts', 'n8n']
};
