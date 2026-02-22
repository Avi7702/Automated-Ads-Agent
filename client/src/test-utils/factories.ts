/**
 * Factory functions for generating test data
 *
 * These factories create mock data objects that match the database schemas.
 * All factories:
 * - Generate unique IDs for each call
 * - Provide sensible defaults
 * - Accept partial overrides for customization
 *
 * Usage:
 * ```ts
 * import { createMockProduct, createMockUser } from '@/test-utils/factories';
 *
 * const product = createMockProduct({ name: 'Custom Name' });
 * const user = createMockUser({ email: 'test@example.com' });
 * ```
 */
import type {
  Product,
  Generation,
  PromptTemplate,
  User,
  AdCopy,
  SocialConnection,
  ScheduledPost,
} from '@shared/schema';

/**
 * Counter for generating unique IDs across all factories
 */
let idCounter = 0;

/**
 * Generates a unique ID with optional prefix
 */
function generateId(prefix: string = 'mock'): string {
  idCounter++;
  return `${prefix}-${idCounter}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Creates a mock Product with sensible defaults
 *
 * @param overrides - Partial product data to override defaults
 * @returns Complete Product object
 *
 * @example
 * ```ts
 * // With defaults
 * const product = createMockProduct();
 *
 * // With overrides
 * const product = createMockProduct({
 *   name: 'Premium Oak Flooring',
 *   category: 'hardwood',
 *   enrichmentStatus: 'complete'
 * });
 * ```
 */
export function createMockProduct(overrides: Partial<Product> = {}): Product {
  const id = overrides.id || generateId('product');

  return {
    id,
    name: `Test Product ${id.substring(0, 8)}`,
    cloudinaryUrl: `https://res.cloudinary.com/test/image/upload/v1234567890/${id}.jpg`,
    cloudinaryPublicId: `products/${id}`,
    category: 'flooring',
    description: 'A high-quality test product for unit testing purposes.',
    features: {
      width: '5 inches',
      thickness: '3/4 inch',
      installation: ['glue', 'nail', 'float'],
    },
    benefits: ['Durable', 'Easy to maintain', 'Eco-friendly'],
    specifications: {
      boxCoverage: '20 sq ft',
      planksPerBox: 8,
    },
    tags: ['test', 'mock', 'hardwood'],
    sku: `SKU-${id.substring(0, 8).toUpperCase()}`,
    enrichmentStatus: 'complete',
    enrichmentDraft: null,
    enrichmentVerifiedAt: null,
    enrichmentSource: 'ai_vision',
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock Generation with sensible defaults
 *
 * @param overrides - Partial generation data to override defaults
 * @returns Complete Generation object
 *
 * @example
 * ```ts
 * // With defaults
 * const generation = createMockGeneration();
 *
 * // With overrides
 * const generation = createMockGeneration({
 *   prompt: 'Create a professional product photo',
 *   status: 'completed',
 *   resolution: '4K'
 * });
 * ```
 */
export function createMockGeneration(overrides: Partial<Generation> = {}): Generation {
  const id = overrides.id || generateId('gen');
  const now = new Date();

  return {
    id,
    userId: overrides.userId || generateId('user'),
    prompt: 'Generate a professional product advertisement with modern styling.',
    originalImagePaths: [
      `https://res.cloudinary.com/test/image/upload/original-1-${id}.jpg`,
      `https://res.cloudinary.com/test/image/upload/original-2-${id}.jpg`,
    ],
    generatedImagePath: `https://res.cloudinary.com/test/image/upload/generated-${id}.jpg`,
    imagePath: `/images/generations/${id}.jpg`,
    resolution: '2K',
    model: 'gemini-3-pro-image',
    aspectRatio: '1:1',
    status: 'completed',
    conversationHistory: null,
    parentGenerationId: null,
    editPrompt: null,
    editCount: 0,
    mediaType: null,
    videoDurationSec: null,
    productIds: null,
    templateId: null,
    generationMode: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

/**
 * Creates a mock PromptTemplate with sensible defaults
 *
 * @param overrides - Partial template data to override defaults
 * @returns Complete PromptTemplate object
 *
 * @example
 * ```ts
 * // With defaults
 * const template = createMockTemplate();
 *
 * // With overrides
 * const template = createMockTemplate({
 *   title: 'Product Showcase',
 *   category: 'marketing'
 * });
 * ```
 */
export function createMockTemplate(overrides: Partial<PromptTemplate> = {}): PromptTemplate {
  const id = overrides.id || generateId('template');

  return {
    id,
    title: `Test Template ${id.substring(0, 8)}`,
    prompt: 'Create a {{style}} advertisement featuring {{product}} with {{background}} background.',
    category: 'product_showcase',
    tags: ['marketing', 'product', 'professional'],
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock User with sensible defaults
 *
 * @param overrides - Partial user data to override defaults
 * @returns Complete User object
 *
 * @example
 * ```ts
 * // With defaults
 * const user = createMockUser();
 *
 * // With overrides
 * const user = createMockUser({
 *   email: 'admin@company.com',
 *   brandVoice: { principles: ['Professional'] }
 * });
 * ```
 */
export function createMockUser(overrides: Partial<User> = {}): User {
  const id = overrides.id || generateId('user');
  const uniqueEmail = `test-${id.substring(0, 12)}@example.com`;

  return {
    id,
    email: overrides.email || uniqueEmail,
    password: 'hashed-password-placeholder',
    passwordHash: '$2b$10$mockhashedpasswordfortesting123456789',
    failedAttempts: 0,
    lockedUntil: null,
    role: 'user',
    brandVoice: {
      principles: ['Professional', 'Trustworthy', 'Innovative'],
      wordsToAvoid: ['cheap', 'discount'],
      wordsToUse: ['premium', 'quality', 'expert'],
    },
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock AdCopy with sensible defaults
 *
 * @param overrides - Partial ad copy data to override defaults
 * @returns Complete AdCopy object
 *
 * @example
 * ```ts
 * // With defaults
 * const adCopy = createMockAdCopy();
 *
 * // With overrides
 * const adCopy = createMockAdCopy({
 *   headline: 'Transform Your Space',
 *   platform: 'linkedin',
 *   tone: 'professional'
 * });
 * ```
 */
export function createMockAdCopy(overrides: Partial<AdCopy> = {}): AdCopy {
  const id = overrides.id || generateId('adcopy');

  return {
    id,
    generationId: overrides.generationId || generateId('gen'),
    userId: overrides.userId || generateId('user'),

    // Core copy components
    headline: 'Transform Your Space Today',
    hook: 'Tired of outdated floors that embarrass you when guests visit?',
    bodyText:
      'Discover premium flooring solutions that combine durability with stunning aesthetics. Our expert installation ensures a perfect fit every time.',
    cta: 'Get Your Free Quote',
    caption: 'Elevate your home with premium flooring. Professional installation, lifetime warranty.',
    hashtags: ['#flooring', '#homeimprovement', '#interiordesign', '#renovation'],

    // Platform and tone
    platform: 'instagram',
    tone: 'professional',
    framework: 'aida',
    campaignObjective: 'conversion',

    // Product context
    productName: 'Premium Oak Hardwood Flooring',
    productDescription: 'High-quality engineered hardwood with natural oak finish.',
    productBenefits: ['Scratch-resistant', 'Easy installation', '25-year warranty'],
    uniqueValueProp: 'The only flooring with a lifetime installation guarantee.',
    industry: 'home improvement',

    // Advanced context
    targetAudience: {
      demographics: 'Homeowners 30-55',
      psychographics: 'Quality-conscious, value durability',
      painPoints: ['Worn floors', 'Difficult maintenance'],
    },
    brandVoice: {
      principles: ['Professional', 'Trustworthy'],
      wordsToAvoid: ['cheap'],
      wordsToUse: ['premium', 'expert'],
    },
    socialProof: {
      testimonial: '5-star rating from 500+ customers',
      stats: '10,000+ successful installations',
    },

    // Quality metrics
    qualityScore: {
      clarity: 85,
      persuasiveness: 90,
      platformFit: 88,
      brandAlignment: 92,
      overallScore: 89,
      reasoning: 'Strong emotional appeal with clear CTA.',
    },
    characterCounts: {
      headline: 25,
      body: 150,
      caption: 80,
      total: 255,
    },

    // Variation tracking
    variationNumber: 1,
    parentCopyId: null,

    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a mock SocialConnection with sensible defaults
 *
 * @param overrides - Partial connection data to override defaults
 * @returns Complete SocialConnection object
 *
 * @example
 * ```ts
 * // With defaults (LinkedIn)
 * const connection = createMockSocialConnection();
 *
 * // Instagram connection
 * const connection = createMockSocialConnection({
 *   platform: 'instagram',
 *   accountType: 'business'
 * });
 * ```
 */
export function createMockSocialConnection(overrides: Partial<SocialConnection> = {}): SocialConnection {
  const id = overrides.id || generateId('social');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

  return {
    id,
    userId: overrides.userId || generateId('user'),
    platform: 'linkedin',
    accessToken: 'encrypted-access-token-placeholder',
    refreshToken: 'encrypted-refresh-token-placeholder',
    tokenIv: 'base64-encoded-iv',
    tokenAuthTag: 'base64-encoded-auth-tag',
    tokenExpiresAt: expiresAt,
    lastRefreshedAt: now,
    platformUserId: `platform-user-${id.substring(0, 8)}`,
    platformUsername: `testuser_${id.substring(0, 8)}`,
    profilePictureUrl: `https://example.com/avatars/${id}.jpg`,
    accountType: 'personal',
    scopes: ['w_member_social', 'r_liteprofile'],
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
 * Creates a mock ScheduledPost with sensible defaults
 *
 * @param overrides - Partial post data to override defaults
 * @returns Complete ScheduledPost object
 *
 * @example
 * ```ts
 * // With defaults
 * const post = createMockScheduledPost();
 *
 * // Scheduled for specific time
 * const post = createMockScheduledPost({
 *   scheduledFor: new Date('2025-02-01T10:00:00Z'),
 *   status: 'scheduled'
 * });
 * ```
 */
export function createMockScheduledPost(overrides: Partial<ScheduledPost> = {}): ScheduledPost {
  const id = overrides.id || generateId('post');
  const now = new Date();
  const scheduledFor = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

  return {
    id,
    userId: overrides.userId || generateId('user'),
    connectionId: overrides.connectionId || generateId('social'),
    caption: 'Discover the beauty of premium flooring. Transform your space with our expert installation services.',
    hashtags: ['#flooring', '#homedesign', '#renovation'],
    imageUrl: `https://res.cloudinary.com/test/image/upload/post-${id}.jpg`,
    imagePublicId: `posts/${id}`,
    scheduledFor,
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
 * Resets the ID counter (useful for deterministic testing)
 *
 * @example
 * ```ts
 * beforeEach(() => {
 *   resetIdCounter();
 * });
 * ```
 */
export function resetIdCounter(): void {
  idCounter = 0;
}
