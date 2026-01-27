/**
 * Test Fixtures Index
 *
 * Central export point for all test fixture data.
 * Import from here for consistent test data across the application.
 *
 * @file client/src/fixtures/index.ts
 *
 * @example
 * ```typescript
 * // Import specific fixtures
 * import { mockProducts, singleDrainageProduct } from '@/fixtures';
 *
 * // Import factory functions
 * import { createMockProduct, createMockGeneration } from '@/fixtures';
 *
 * // Import filtered subsets
 * import { completedGenerations, instagramCopy } from '@/fixtures';
 * ```
 */

// ============================================
// PRODUCTS
// ============================================
export {
  // Full arrays
  mockProducts,
  // Filtered subsets by category
  drainageProducts,
  waterproofingProducts,
  flooringProducts,
  concreteProducts,
  toolProducts,
  // Filtered subsets by status
  pendingProducts,
  draftProducts,
  completeProducts,
  verifiedProducts,
  // Other subsets
  recentProducts,
  edgeCaseProducts,
  // Factory functions
  createMockProduct,
  createMockProducts,
  // Single exports
  singleDrainageProduct,
  singleWaterproofingProduct,
  singleFlooringProduct,
  singlePendingProduct,
  singleDraftProduct,
  singleEdgeCaseProduct,
} from './products';

// ============================================
// TEMPLATES
// ============================================
export {
  // Legacy prompt templates
  mockPromptTemplates,
  // Ad scene templates
  mockAdSceneTemplates,
  // Filtered subsets
  productShowcaseTemplates,
  educationalTemplates,
  worksiteTemplates,
  installationTemplates,
  globalTemplates,
  userTemplates,
  instagramTemplates,
  linkedinTemplates,
  drainageTemplates,
  templatesWithReferences,
  // Factory functions
  createMockPromptTemplate,
  createMockAdSceneTemplate,
  // Single exports
  singleShowcaseTemplate,
  singleWorksiteTemplate,
  singleEducationalTemplate,
  templateWithMultipleRefs,
  singleUserTemplate,
} from './templates';

// ============================================
// GENERATIONS
// ============================================
export {
  // Full array
  mockGenerations,
  // Filtered by status
  completedGenerations,
  pendingGenerations,
  processingGenerations,
  failedGenerations,
  // Filtered by relationship
  editGenerations,
  rootGenerations,
  // Filtered by user
  userTest1Generations,
  userTest2Generations,
  // Other subsets
  highResGenerations,
  recentGenerations,
  edgeCaseGenerations,
  // Edit chain helpers
  editChain,
  getEditHistory,
  getChildren,
  getAllDescendants,
  // Factory functions
  createMockGeneration,
  createMockEdit,
  createPendingGeneration,
  createFailedGeneration,
  // Single exports
  singleCompletedGeneration,
  singlePendingGeneration,
  singleProcessingGeneration,
  singleFailedGeneration,
  generationWithEditHistory,
} from './generations';

// ============================================
// USERS & AUTHENTICATION
// ============================================
export {
  // Full arrays
  mockUsers,
  mockSessions,
  mockBrandProfiles,
  // Filtered subsets - users
  activeUsers,
  lockedUsers,
  usersWithBrandVoice,
  usersWithoutBrandVoice,
  recentUsers,
  // Filtered subsets - sessions
  activeSessions,
  expiredSessions,
  expiringSessions,
  // Filtered subsets - brand profiles
  completeBrandProfiles,
  incompleteBrandProfiles,
  // Factory functions
  createMockUser,
  createLockedUser,
  createUserWithBrandVoice,
  createMockSession,
  createExpiredSession,
  createMockBrandProfile,
  // Single exports
  adminUser,
  standardUser,
  userWithoutBrandVoice,
  newUser,
  lockedUser,
  expiredLockUser,
  validSession,
  expiredSession,
  expiringSession,
  completeBrandProfile,
  incompleteBrandProfile,
  // Auth test helpers
  testCredentials,
  testTokens,
} from './users';

// ============================================
// AD COPY
// ============================================
export {
  // Constants
  platformCharLimits,
  copywritingFrameworks,
  campaignObjectives,
  // Full array
  mockAdCopy,
  // Filtered by platform
  instagramCopy,
  linkedinCopy,
  facebookCopy,
  twitterCopy,
  tiktokCopy,
  // Filtered by framework
  aidaCopy,
  pasCopy,
  babCopy,
  fabCopy,
  // Other subsets
  highQualityCopy,
  variationCopy,
  rootCopy,
  copyWithFullMetadata,
  // Factory functions
  createMockAdCopy,
  createPlatformCopy,
  createCopyVariation,
  // Single exports
  singleInstagramCopy,
  singleLinkedinCopy,
  singleFacebookCopy,
  singleTwitterCopy,
  singleTiktokCopy,
  highScoredCopy,
  edgeCaseCopy,
} from './adCopy';

// ============================================
// IDEA BANK
// ============================================
export {
  // Analysis status presets
  fullAnalysisStatus,
  visionOnlyAnalysisStatus,
  kbOnlyAnalysisStatus,
  // Sources used presets
  allSourcesUsed,
  visionOnlySourcesUsed,
  noSourcesUsed,
  // Full arrays
  mockSuggestions,
  mockProductAnalyses,
  mockSlotSuggestions,
  // Mock requests
  singleProductRequest,
  multiProductRequest,
  templateModeRequest,
  webSearchEnabledRequest,
  // Mock responses
  fullSuggestionResponse,
  minimalSuggestionResponse,
  mockTemplateResponse,
  mockTemplateContext,
  // Recipes
  simpleRecipe,
  complexRecipe,
  // Filtered subsets
  highConfidenceSuggestions,
  lowConfidenceSuggestions,
  exactInsertSuggestions,
  inspirationSuggestions,
  standardSuggestions,
  instagramSuggestions,
  // Factory functions
  createMockSuggestion,
  createMockSuggestResponse,
  createMockAnalysis,
  createMockRecipe,
  // Single exports
  singleHighConfidenceSuggestion,
  singleLowConfidenceSuggestion,
  singleExactInsertSuggestion,
  singleInspirationSuggestion,
  singleStandardSuggestion,
  singleProductAnalysis,
} from './ideaBank';

// ============================================
// SOCIAL CONNECTIONS
// ============================================
export {
  // Full arrays
  mockSocialConnections,
  mockScheduledPosts,
  mockPostAnalytics,
  // Filtered - connections
  activeConnections,
  inactiveConnections,
  linkedinConnections,
  instagramConnections,
  expiredConnections,
  errorConnections,
  // Filtered - posts
  scheduledPosts,
  draftPosts,
  publishedPosts,
  failedPosts,
  postsForRetry,
  // Factory functions
  createMockConnection,
  createMockScheduledPost,
  createMockAnalytics,
  // Single exports
  activeLinkedinConnection,
  activeLinkedinPageConnection,
  activeInstagramConnection,
  expiredConnection,
  errorConnection,
  singleScheduledPost,
  singleDraftPost,
  singlePublishedPost,
  singleFailedPost,
  singlePostAnalytics,
} from './socialConnections';

// ============================================
// TYPE RE-EXPORTS
// ============================================

// Re-export types for convenience
export type { CopywritingFramework, CampaignObjective } from './adCopy';
