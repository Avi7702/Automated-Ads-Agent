/**
 * Social Connections Test Fixtures
 *
 * Mock data for testing social media account connections and scheduled posts.
 * Covers LinkedIn, Instagram, and various connection states.
 *
 * @file client/src/fixtures/socialConnections.ts
 */

import type { SocialConnection, ScheduledPost, PostAnalytics } from '../../../shared/schema';

// Base date for consistent timestamps in tests
const BASE_DATE = new Date('2026-01-15T12:00:00Z');

function daysAgo(days: number): Date {
  return new Date(BASE_DATE.getTime() - days * 24 * 60 * 60 * 1000);
}

function hoursFromNow(hours: number): Date {
  return new Date(BASE_DATE.getTime() + hours * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return new Date(BASE_DATE.getTime() + days * 24 * 60 * 60 * 1000);
}

// === MOCK SOCIAL CONNECTIONS ===

/**
 * Mock social connections covering various platforms and states
 */
export const mockSocialConnections: SocialConnection[] = [
  // Active LinkedIn connection
  {
    id: 'conn-li-001',
    userId: 'user-test-1',
    platform: 'linkedin',
    accessToken: 'encrypted_access_token_linkedin_1',
    refreshToken: 'encrypted_refresh_token_linkedin_1',
    tokenIv: 'base64_iv_1',
    tokenAuthTag: 'base64_auth_tag_1',
    tokenExpiresAt: daysFromNow(30),
    lastRefreshedAt: daysAgo(1),
    platformUserId: 'li_user_12345',
    platformUsername: 'john-contractor',
    profilePictureUrl: 'https://media.licdn.com/dms/image/example.jpg',
    accountType: 'personal',
    scopes: ['w_member_social', 'r_liteprofile', 'r_emailaddress'],
    isActive: true,
    lastUsedAt: daysAgo(0),
    lastErrorAt: null,
    lastErrorMessage: null,
    connectedAt: daysAgo(90),
    updatedAt: daysAgo(1),
  },
  // Active LinkedIn business page
  {
    id: 'conn-li-002',
    userId: 'user-test-1',
    platform: 'linkedin',
    accessToken: 'encrypted_access_token_linkedin_2',
    refreshToken: 'encrypted_refresh_token_linkedin_2',
    tokenIv: 'base64_iv_2',
    tokenAuthTag: 'base64_auth_tag_2',
    tokenExpiresAt: daysFromNow(25),
    lastRefreshedAt: daysAgo(5),
    platformUserId: 'li_company_67890',
    platformUsername: 'Pro Building Supplies',
    profilePictureUrl: 'https://media.licdn.com/dms/image/company.jpg',
    accountType: 'page',
    scopes: ['w_organization_social', 'r_organization_admin'],
    isActive: true,
    lastUsedAt: daysAgo(2),
    lastErrorAt: null,
    lastErrorMessage: null,
    connectedAt: daysAgo(60),
    updatedAt: daysAgo(5),
  },
  // Active Instagram business account
  {
    id: 'conn-ig-001',
    userId: 'user-test-1',
    platform: 'instagram',
    accessToken: 'encrypted_access_token_instagram_1',
    refreshToken: null, // Instagram doesn't use refresh tokens the same way
    tokenIv: 'base64_iv_3',
    tokenAuthTag: 'base64_auth_tag_3',
    tokenExpiresAt: daysFromNow(60),
    lastRefreshedAt: null,
    platformUserId: 'ig_user_98765',
    platformUsername: 'probuildingsupplies',
    profilePictureUrl: 'https://instagram.com/profile/example.jpg',
    accountType: 'business',
    scopes: ['instagram_basic', 'instagram_content_publish', 'pages_read_engagement'],
    isActive: true,
    lastUsedAt: daysAgo(1),
    lastErrorAt: null,
    lastErrorMessage: null,
    connectedAt: daysAgo(45),
    updatedAt: daysAgo(1),
  },
  // Expired token connection
  {
    id: 'conn-li-expired',
    userId: 'user-test-2',
    platform: 'linkedin',
    accessToken: 'encrypted_expired_token',
    refreshToken: 'encrypted_expired_refresh',
    tokenIv: 'base64_iv_4',
    tokenAuthTag: 'base64_auth_tag_4',
    tokenExpiresAt: daysAgo(5), // Expired 5 days ago
    lastRefreshedAt: daysAgo(35),
    platformUserId: 'li_user_expired',
    platformUsername: 'expired-user',
    profilePictureUrl: null,
    accountType: 'personal',
    scopes: ['w_member_social'],
    isActive: false,
    lastUsedAt: daysAgo(10),
    lastErrorAt: daysAgo(5),
    lastErrorMessage: 'Token expired. Please reconnect your account.',
    connectedAt: daysAgo(120),
    updatedAt: daysAgo(5),
  },
  // Connection with recent error
  {
    id: 'conn-ig-error',
    userId: 'user-test-2',
    platform: 'instagram',
    accessToken: 'encrypted_error_token',
    refreshToken: null,
    tokenIv: 'base64_iv_5',
    tokenAuthTag: 'base64_auth_tag_5',
    tokenExpiresAt: daysFromNow(30),
    lastRefreshedAt: null,
    platformUserId: 'ig_user_error',
    platformUsername: 'erroraccount',
    profilePictureUrl: 'https://instagram.com/profile/error.jpg',
    accountType: 'personal',
    scopes: ['instagram_basic', 'instagram_content_publish'],
    isActive: true,
    lastUsedAt: daysAgo(0),
    lastErrorAt: daysAgo(0),
    lastErrorMessage: 'Rate limit exceeded. Please try again later.',
    connectedAt: daysAgo(30),
    updatedAt: daysAgo(0),
  },
  // Disconnected/inactive connection
  {
    id: 'conn-li-inactive',
    userId: 'user-test-1',
    platform: 'linkedin',
    accessToken: 'encrypted_inactive_token',
    refreshToken: 'encrypted_inactive_refresh',
    tokenIv: 'base64_iv_6',
    tokenAuthTag: 'base64_auth_tag_6',
    tokenExpiresAt: daysFromNow(10),
    lastRefreshedAt: daysAgo(20),
    platformUserId: 'li_user_inactive',
    platformUsername: 'old-account',
    profilePictureUrl: null,
    accountType: 'personal',
    scopes: ['w_member_social'],
    isActive: false,
    lastUsedAt: daysAgo(60),
    lastErrorAt: null,
    lastErrorMessage: null,
    connectedAt: daysAgo(180),
    updatedAt: daysAgo(30),
  },
];

// === MOCK SCHEDULED POSTS ===

/**
 * Mock scheduled posts covering various statuses
 */
export const mockScheduledPosts: ScheduledPost[] = [
  // Scheduled for tomorrow
  {
    id: 'post-sched-001',
    userId: 'user-test-1',
    connectionId: 'conn-li-001',
    caption: 'Check out our new drainage solutions! Perfect for residential and commercial projects.',
    hashtags: ['#drainage', '#construction', '#landscaping'],
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/posts/drainage-hero.jpg',
    imagePublicId: 'posts/drainage-hero',
    scheduledFor: daysFromNow(1),
    timezone: 'America/New_York',
    status: 'scheduled',
    publishedAt: null,
    platformPostId: null,
    platformPostUrl: null,
    errorMessage: null,
    failureReason: null,
    retryCount: 0,
    nextRetryAt: null,
    generationId: 'gen-001',
    templateId: 'content-planner-product-showcase',
    publishIdempotencyKey: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
  // Draft post
  {
    id: 'post-draft-001',
    userId: 'user-test-1',
    connectionId: 'conn-ig-001',
    caption: 'Draft caption for flooring showcase',
    hashtags: ['#flooring', '#homedesign'],
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/posts/flooring-draft.jpg',
    imagePublicId: 'posts/flooring-draft',
    scheduledFor: daysFromNow(7),
    timezone: 'America/Los_Angeles',
    status: 'draft',
    publishedAt: null,
    platformPostId: null,
    platformPostUrl: null,
    errorMessage: null,
    failureReason: null,
    retryCount: 0,
    nextRetryAt: null,
    generationId: 'gen-003',
    templateId: null,
    publishIdempotencyKey: null,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(0),
  },
  // Currently publishing
  {
    id: 'post-publishing-001',
    userId: 'user-test-1',
    connectionId: 'conn-li-002',
    caption: 'Exciting news from Pro Building Supplies!',
    hashtags: ['#construction', '#building'],
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/posts/company-news.jpg',
    imagePublicId: 'posts/company-news',
    scheduledFor: new Date(BASE_DATE.getTime() - 5 * 60 * 1000), // 5 minutes ago
    timezone: 'UTC',
    status: 'publishing',
    publishedAt: null,
    platformPostId: null,
    platformPostUrl: null,
    errorMessage: null,
    failureReason: null,
    retryCount: 0,
    nextRetryAt: null,
    generationId: null,
    templateId: 'content-planner-company-updates',
    publishIdempotencyKey: null,
    createdAt: daysAgo(3),
    updatedAt: new Date(BASE_DATE.getTime() - 5 * 60 * 1000),
  },
  // Successfully published
  {
    id: 'post-published-001',
    userId: 'user-test-1',
    connectionId: 'conn-li-001',
    caption: 'Our waterproofing solutions are trusted by contractors nationwide.',
    hashtags: ['#waterproofing', '#construction', '#quality'],
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/posts/waterproofing.jpg',
    imagePublicId: 'posts/waterproofing',
    scheduledFor: daysAgo(2),
    timezone: 'America/New_York',
    status: 'published',
    publishedAt: daysAgo(2),
    platformPostId: 'urn:li:share:7012345678901234567',
    platformPostUrl: 'https://www.linkedin.com/feed/update/urn:li:share:7012345678901234567',
    errorMessage: null,
    failureReason: null,
    retryCount: 0,
    nextRetryAt: null,
    generationId: 'gen-002',
    templateId: null,
    publishIdempotencyKey: null,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(2),
  },
  // Published Instagram post
  {
    id: 'post-published-002',
    userId: 'user-test-1',
    connectionId: 'conn-ig-001',
    caption: 'Transform your space with our premium flooring!',
    hashtags: ['#flooring', '#interiordesign', '#homedecor', '#renovation'],
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/posts/flooring-lifestyle.jpg',
    imagePublicId: 'posts/flooring-lifestyle',
    scheduledFor: daysAgo(5),
    timezone: 'America/Los_Angeles',
    status: 'published',
    publishedAt: daysAgo(5),
    platformPostId: '17895432109876543',
    platformPostUrl: 'https://www.instagram.com/p/ABC123xyz/',
    errorMessage: null,
    failureReason: null,
    retryCount: 0,
    nextRetryAt: null,
    generationId: 'gen-003',
    templateId: 'content-planner-product-showcase',
    publishIdempotencyKey: null,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(5),
  },
  // Failed post - rate limited
  {
    id: 'post-failed-001',
    userId: 'user-test-1',
    connectionId: 'conn-ig-001',
    caption: 'Special offer this week only!',
    hashtags: ['#sale', '#discount'],
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/posts/sale-banner.jpg',
    imagePublicId: 'posts/sale-banner',
    scheduledFor: daysAgo(1),
    timezone: 'America/New_York',
    status: 'failed',
    publishedAt: null,
    platformPostId: null,
    platformPostUrl: null,
    errorMessage: 'Instagram API error: Too many requests. Please try again later.',
    failureReason: 'rate_limited',
    retryCount: 3,
    nextRetryAt: hoursFromNow(2),
    generationId: null,
    templateId: null,
    publishIdempotencyKey: null,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
  },
  // Failed post - content policy
  {
    id: 'post-failed-002',
    userId: 'user-test-2',
    connectionId: 'conn-li-expired',
    caption: 'Content that was rejected',
    hashtags: [],
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/posts/rejected.jpg',
    imagePublicId: 'posts/rejected',
    scheduledFor: daysAgo(3),
    timezone: 'UTC',
    status: 'failed',
    publishedAt: null,
    platformPostId: null,
    platformPostUrl: null,
    errorMessage: 'Token expired. Account needs to be reconnected.',
    failureReason: 'token_expired',
    retryCount: 1,
    nextRetryAt: null,
    generationId: null,
    templateId: null,
    publishIdempotencyKey: null,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(3),
  },
  // Cancelled post
  {
    id: 'post-cancelled-001',
    userId: 'user-test-1',
    connectionId: 'conn-li-001',
    caption: 'This post was cancelled by the user',
    hashtags: ['#cancelled'],
    imageUrl: null,
    imagePublicId: null,
    scheduledFor: daysFromNow(5),
    timezone: 'America/New_York',
    status: 'cancelled',
    publishedAt: null,
    platformPostId: null,
    platformPostUrl: null,
    errorMessage: null,
    failureReason: null,
    retryCount: 0,
    nextRetryAt: null,
    generationId: null,
    templateId: null,
    publishIdempotencyKey: null,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(0),
  },
];

// === MOCK POST ANALYTICS ===

/**
 * Mock analytics for published posts
 */
export const mockPostAnalytics: PostAnalytics[] = [
  {
    id: 'analytics-001',
    scheduledPostId: 'post-published-001',
    fetchedAt: daysAgo(1),
    impressions: 1250,
    reach: 980,
    likes: 45,
    comments: 8,
    shares: 12,
    clicks: 34,
    saves: null,
    engagementRate: 5.2,
    createdAt: daysAgo(1),
  },
  {
    id: 'analytics-002',
    scheduledPostId: 'post-published-001',
    fetchedAt: daysAgo(0),
    impressions: 2100,
    reach: 1650,
    likes: 78,
    comments: 15,
    shares: 23,
    clicks: 56,
    saves: null,
    engagementRate: 5.5,
    createdAt: daysAgo(0),
  },
  {
    id: 'analytics-003',
    scheduledPostId: 'post-published-002',
    fetchedAt: daysAgo(3),
    impressions: 3500,
    reach: 2800,
    likes: 245,
    comments: 32,
    shares: 18,
    clicks: 89,
    saves: 67,
    engagementRate: 8.4,
    createdAt: daysAgo(3),
  },
  {
    id: 'analytics-004',
    scheduledPostId: 'post-published-002',
    fetchedAt: daysAgo(0),
    impressions: 5200,
    reach: 4100,
    likes: 412,
    comments: 58,
    shares: 34,
    clicks: 156,
    saves: 124,
    engagementRate: 9.7,
    createdAt: daysAgo(0),
  },
];

// === FILTERED SUBSETS ===

/** Active social connections */
export const activeConnections = mockSocialConnections.filter((c) => c.isActive);

/** Inactive/disconnected connections */
export const inactiveConnections = mockSocialConnections.filter((c) => !c.isActive);

/** LinkedIn connections */
export const linkedinConnections = mockSocialConnections.filter((c) => c.platform === 'linkedin');

/** Instagram connections */
export const instagramConnections = mockSocialConnections.filter((c) => c.platform === 'instagram');

/** Connections with expired tokens */
export const expiredConnections = mockSocialConnections.filter((c) => c.tokenExpiresAt < BASE_DATE);

/** Connections with errors */
export const errorConnections = mockSocialConnections.filter((c) => c.lastErrorAt !== null);

/** Scheduled posts (not yet published) */
export const scheduledPosts = mockScheduledPosts.filter((p) => p.status === 'scheduled');

/** Draft posts */
export const draftPosts = mockScheduledPosts.filter((p) => p.status === 'draft');

/** Published posts */
export const publishedPosts = mockScheduledPosts.filter((p) => p.status === 'published');

/** Failed posts */
export const failedPosts = mockScheduledPosts.filter((p) => p.status === 'failed');

/** Posts pending retry */
export const postsForRetry = mockScheduledPosts.filter((p) => p.status === 'failed' && p.nextRetryAt !== null);

// === FACTORY FUNCTIONS ===

/**
 * Creates a mock social connection with custom overrides
 */
export function createMockConnection(overrides: Partial<SocialConnection> = {}): SocialConnection {
  const id = overrides.id || `conn-test-${Date.now()}`;
  const now = new Date();
  return {
    id,
    userId: 'user-test-1',
    platform: 'linkedin',
    accessToken: 'encrypted_test_token',
    refreshToken: 'encrypted_test_refresh',
    tokenIv: 'test_iv',
    tokenAuthTag: 'test_auth_tag',
    tokenExpiresAt: daysFromNow(30),
    lastRefreshedAt: null,
    platformUserId: `platform_${id}`,
    platformUsername: 'test-account',
    profilePictureUrl: null,
    accountType: 'personal',
    scopes: ['w_member_social'],
    isActive: true,
    lastUsedAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
    connectedAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a mock scheduled post with custom overrides
 */
export function createMockScheduledPost(overrides: Partial<ScheduledPost> = {}): ScheduledPost {
  const id = overrides.id || `post-test-${Date.now()}`;
  const now = new Date();
  return {
    id,
    userId: 'user-test-1',
    connectionId: 'conn-li-001',
    caption: 'Test caption',
    hashtags: ['#test'],
    imageUrl: null,
    imagePublicId: null,
    scheduledFor: daysFromNow(1),
    timezone: 'UTC',
    status: 'draft',
    publishedAt: null,
    platformPostId: null,
    platformPostUrl: null,
    errorMessage: null,
    failureReason: null,
    retryCount: 0,
    nextRetryAt: null,
    generationId: null,
    templateId: null,
    publishIdempotencyKey: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a mock post analytics entry
 */
export function createMockAnalytics(scheduledPostId: string, overrides: Partial<PostAnalytics> = {}): PostAnalytics {
  const id = overrides.id || `analytics-test-${Date.now()}`;
  const now = new Date();
  return {
    id,
    scheduledPostId,
    fetchedAt: now,
    impressions: 1000,
    reach: 800,
    likes: 50,
    comments: 10,
    shares: 5,
    clicks: 25,
    saves: null,
    engagementRate: 6.5,
    createdAt: now,
    ...overrides,
  };
}

// === SINGLE ITEM EXPORTS ===

/** An active LinkedIn personal connection */
export const activeLinkedinConnection = mockSocialConnections[0];

/** An active LinkedIn page connection */
export const activeLinkedinPageConnection = mockSocialConnections[1];

/** An active Instagram connection */
export const activeInstagramConnection = mockSocialConnections[2];

/** An expired connection */
export const expiredConnection = mockSocialConnections[3];

/** A connection with recent error */
export const errorConnection = mockSocialConnections[4];

/** A scheduled post */
export const singleScheduledPost = mockScheduledPosts[0];

/** A draft post */
export const singleDraftPost = mockScheduledPosts[1];

/** A published post */
export const singlePublishedPost = mockScheduledPosts[3];

/** A failed post */
export const singleFailedPost = mockScheduledPosts[5];

/** Analytics for a successful post */
export const singlePostAnalytics = mockPostAnalytics[1];
