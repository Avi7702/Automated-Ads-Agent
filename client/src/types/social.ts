/**
 * Social Media Account Types
 *
 * Defines TypeScript interfaces for OAuth-connected social media accounts
 * (LinkedIn, Instagram) managed via Phase 8.1 backend.
 */

export interface SocialConnection {
  id: string;
  userId: string;
  platform: 'linkedin' | 'instagram';
  platformUserId: string | null;
  platformUsername: string | null;
  profilePictureUrl: string | null;
  accountType: 'personal' | 'business' | 'page' | null;
  scopes: string[] | null;
  isActive: boolean;
  tokenExpiresAt: string;
  lastUsedAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  connectedAt: string;
  updatedAt: string;
}

export interface SocialAccountsResponse {
  accounts: SocialConnection[];
}

export interface ConnectResponse {
  authUrl: string;
}

export interface RefreshResponse {
  success: boolean;
  expiresAt: string;
}
