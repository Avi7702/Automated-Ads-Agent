/**
 * Shared types for platform publishers.
 *
 * These types are used by linkedinPublisher, twitterPublisher, and publishingService.
 */

export type PublishErrorCode =
  | 'token_expired'
  | 'rate_limited'
  | 'content_policy_violation'
  | 'account_disconnected'
  | 'invalid_credentials'
  | 'insufficient_permissions'
  | 'platform_error'
  | 'media_upload_failed'
  | 'unknown';

export interface PublishResult {
  success: boolean;
  platformPostId?: string;
  platformPostUrl?: string;
  error?: string;
  errorCode?: PublishErrorCode;
  isRetryable: boolean;
}

export interface PublishParams {
  accessToken: string;
  platformUserId: string;
  accountType: string;
  caption: string;
  imageUrl?: string;
  hashtags?: string[];
}
