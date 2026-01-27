/**
 * @vitest-environment node
 *
 * Test Fixtures Validation Tests
 *
 * Ensures all fixture data is valid and properly typed.
 * Tests factory functions and filtered subsets.
 *
 * @file client/src/fixtures/__tests__/fixtures.test.ts
 */

import { describe, it, expect } from 'vitest';

// Import all fixtures to validate they compile and export correctly
import {
  // Products
  mockProducts,
  drainageProducts,
  waterproofingProducts,
  flooringProducts,
  concreteProducts,
  toolProducts,
  pendingProducts,
  draftProducts,
  completeProducts,
  verifiedProducts,
  createMockProduct,
  createMockProducts,
  singleDrainageProduct,
  // Templates
  mockPromptTemplates,
  mockAdSceneTemplates,
  productShowcaseTemplates,
  educationalTemplates,
  globalTemplates,
  userTemplates,
  createMockPromptTemplate,
  createMockAdSceneTemplate,
  singleShowcaseTemplate,
  // Generations
  mockGenerations,
  completedGenerations,
  pendingGenerations,
  processingGenerations,
  failedGenerations,
  editGenerations,
  rootGenerations,
  editChain,
  getEditHistory,
  getChildren,
  getAllDescendants,
  createMockGeneration,
  createMockEdit,
  createPendingGeneration,
  createFailedGeneration,
  singleCompletedGeneration,
  // Users
  mockUsers,
  mockSessions,
  mockBrandProfiles,
  activeUsers,
  lockedUsers,
  activeSessions,
  expiredSessions,
  createMockUser,
  createLockedUser,
  createMockSession,
  createExpiredSession,
  testCredentials,
  testTokens,
  adminUser,
  standardUser,
  // Ad Copy
  platformCharLimits,
  copywritingFrameworks,
  campaignObjectives,
  mockAdCopy,
  instagramCopy,
  linkedinCopy,
  facebookCopy,
  twitterCopy,
  tiktokCopy,
  aidaCopy,
  highQualityCopy,
  createMockAdCopy,
  createPlatformCopy,
  singleInstagramCopy,
  // Idea Bank
  fullAnalysisStatus,
  visionOnlyAnalysisStatus,
  allSourcesUsed,
  mockSuggestions,
  mockProductAnalyses,
  simpleRecipe,
  complexRecipe,
  highConfidenceSuggestions,
  exactInsertSuggestions,
  createMockSuggestion,
  createMockAnalysis,
  createMockRecipe,
  singleHighConfidenceSuggestion,
  // Social Connections
  mockSocialConnections,
  mockScheduledPosts,
  mockPostAnalytics,
  activeConnections,
  inactiveConnections,
  scheduledPosts,
  publishedPosts,
  failedPosts,
  createMockConnection,
  createMockScheduledPost,
  createMockAnalytics,
  activeLinkedinConnection,
} from '../index';

describe('Product Fixtures', () => {
  it('has 12 products in the main array', () => {
    expect(mockProducts).toHaveLength(12);
  });

  it('has products in all categories', () => {
    expect(drainageProducts.length).toBeGreaterThan(0);
    expect(waterproofingProducts.length).toBeGreaterThan(0);
    expect(flooringProducts.length).toBeGreaterThan(0);
    expect(concreteProducts.length).toBeGreaterThan(0);
    expect(toolProducts.length).toBeGreaterThan(0);
  });

  it('has products in all enrichment statuses', () => {
    expect(pendingProducts.length).toBeGreaterThan(0);
    expect(draftProducts.length).toBeGreaterThan(0);
    expect(completeProducts.length).toBeGreaterThan(0);
    // Note: verifiedProducts may be empty if no products have this status
  });

  it('creates valid products with factory function', () => {
    const product = createMockProduct({ name: 'Test' });
    expect(product.id).toBeTruthy();
    expect(product.name).toBe('Test');
    expect(product.cloudinaryUrl).toBeTruthy();
  });

  it('creates bulk products', () => {
    const products = createMockProducts(5);
    expect(products).toHaveLength(5);
    expect(products[0].id).toBe('prod-bulk-1');
    expect(products[4].id).toBe('prod-bulk-5');
  });

  it('singleDrainageProduct has all required fields', () => {
    expect(singleDrainageProduct.id).toBeTruthy();
    expect(singleDrainageProduct.name).toBeTruthy();
    expect(singleDrainageProduct.cloudinaryUrl).toBeTruthy();
    expect(singleDrainageProduct.category).toBe('drainage');
  });
});

describe('Template Fixtures', () => {
  it('has prompt templates', () => {
    expect(mockPromptTemplates.length).toBeGreaterThan(5);
  });

  it('has ad scene templates', () => {
    expect(mockAdSceneTemplates.length).toBeGreaterThan(5);
  });

  it('has filtered template subsets', () => {
    expect(productShowcaseTemplates.length).toBeGreaterThan(0);
    expect(educationalTemplates.length).toBeGreaterThan(0);
    expect(globalTemplates.length).toBeGreaterThan(0);
  });

  it('creates valid templates with factory functions', () => {
    const promptTemplate = createMockPromptTemplate({ title: 'Test' });
    expect(promptTemplate.id).toBeTruthy();
    expect(promptTemplate.title).toBe('Test');

    const adSceneTemplate = createMockAdSceneTemplate({ title: 'Ad Test' });
    expect(adSceneTemplate.id).toBeTruthy();
    expect(adSceneTemplate.title).toBe('Ad Test');
    expect(adSceneTemplate.promptBlueprint).toBeTruthy();
  });

  it('singleShowcaseTemplate has all required fields', () => {
    expect(singleShowcaseTemplate.id).toBeTruthy();
    expect(singleShowcaseTemplate.title).toBeTruthy();
    expect(singleShowcaseTemplate.category).toBe('product_showcase');
    expect(singleShowcaseTemplate.promptBlueprint).toBeTruthy();
  });
});

describe('Generation Fixtures', () => {
  it('has 15 generations', () => {
    expect(mockGenerations).toHaveLength(15);
  });

  it('has generations in all statuses', () => {
    expect(completedGenerations.length).toBeGreaterThan(0);
    expect(pendingGenerations.length).toBeGreaterThan(0);
    expect(processingGenerations.length).toBeGreaterThan(0);
    expect(failedGenerations.length).toBeGreaterThan(0);
  });

  it('has edit chain with parent-child relationships', () => {
    expect(editChain.parent).toBeTruthy();
    expect(editChain.child).toBeTruthy();
    expect(editChain.grandchild).toBeTruthy();
    expect(editChain.child.parentGenerationId).toBe(editChain.parent.id);
    expect(editChain.grandchild.parentGenerationId).toBe(editChain.child.id);
  });

  it('getEditHistory returns correct chain', () => {
    const history = getEditHistory('gen-edit-grandchild');
    expect(history).toHaveLength(3);
    expect(history[0].id).toBe('gen-edit-parent');
    expect(history[2].id).toBe('gen-edit-grandchild');
  });

  it('getChildren returns direct children', () => {
    const children = getChildren('gen-edit-parent');
    expect(children).toHaveLength(1);
    expect(children[0].id).toBe('gen-edit-child');
  });

  it('getAllDescendants returns all descendants', () => {
    const descendants = getAllDescendants('gen-edit-parent');
    expect(descendants).toHaveLength(2);
  });

  it('creates valid generations with factory functions', () => {
    const gen = createMockGeneration({ prompt: 'Test prompt' });
    expect(gen.id).toBeTruthy();
    expect(gen.prompt).toBe('Test prompt');
    expect(gen.status).toBe('completed');

    const pendingGen = createPendingGeneration();
    expect(pendingGen.status).toBe('pending');
    expect(pendingGen.imagePath).toBeNull();

    const failedGen = createFailedGeneration('Test error');
    expect(failedGen.status).toBe('failed');
    expect(failedGen.conversationHistory).toBeTruthy();
  });

  it('creates edit generation linked to parent', () => {
    const edit = createMockEdit('gen-001', 'Make it brighter');
    expect(edit.parentGenerationId).toBe('gen-001');
    expect(edit.editPrompt).toBe('Make it brighter');
    expect(edit.editCount).toBe(1);
  });
});

describe('User Fixtures', () => {
  it('has multiple users', () => {
    expect(mockUsers.length).toBeGreaterThan(5);
  });

  it('has active and locked users', () => {
    expect(activeUsers.length).toBeGreaterThan(0);
    expect(lockedUsers.length).toBeGreaterThan(0);
  });

  it('has sessions', () => {
    expect(mockSessions.length).toBeGreaterThan(0);
    expect(activeSessions.length).toBeGreaterThan(0);
    expect(expiredSessions.length).toBeGreaterThan(0);
  });

  it('has brand profiles', () => {
    expect(mockBrandProfiles.length).toBeGreaterThan(0);
  });

  it('creates valid users with factory functions', () => {
    const user = createMockUser({ email: 'test@test.com' });
    expect(user.id).toBeTruthy();
    expect(user.email).toBe('test@test.com');
    expect(user.failedAttempts).toBe(0);

    const locked = createLockedUser(2);
    expect(locked.failedAttempts).toBe(5);
    expect(locked.lockedUntil).toBeTruthy();
  });

  it('creates valid sessions', () => {
    const session = createMockSession('user-123');
    expect(session.id).toBeTruthy();
    expect(session.userId).toBe('user-123');
    expect(session.expiresAt).toBeTruthy();

    const expired = createExpiredSession('user-123', 5);
    expect(expired.expiresAt.getTime()).toBeLessThan(Date.now());
  });

  it('has test credentials', () => {
    expect(testCredentials.valid.email).toBeTruthy();
    expect(testCredentials.invalid.email).toBeTruthy();
    expect(testCredentials.locked.email).toBeTruthy();
  });

  it('has test tokens', () => {
    expect(testTokens.valid).toBeTruthy();
    expect(testTokens.expired).toBeTruthy();
    expect(testTokens.malformed).toBeTruthy();
  });

  it('adminUser has brand voice', () => {
    expect(adminUser.brandVoice).toBeTruthy();
  });
});

describe('Ad Copy Fixtures', () => {
  it('has platform character limits', () => {
    expect(platformCharLimits.instagram.headline).toBe(40);
    expect(platformCharLimits.linkedin.headline).toBe(150);
    expect(platformCharLimits.twitter.body).toBe(280);
  });

  it('has copy for all platforms', () => {
    expect(instagramCopy.length).toBeGreaterThan(0);
    expect(linkedinCopy.length).toBeGreaterThan(0);
    expect(facebookCopy.length).toBeGreaterThan(0);
    expect(twitterCopy.length).toBeGreaterThan(0);
    expect(tiktokCopy.length).toBeGreaterThan(0);
  });

  it('has copy with different frameworks', () => {
    expect(aidaCopy.length).toBeGreaterThan(0);
  });

  it('has high quality copy', () => {
    expect(highQualityCopy.length).toBeGreaterThan(0);
    highQualityCopy.forEach(copy => {
      expect(copy.qualityScore!.overallScore).toBeGreaterThanOrEqual(8);
    });
  });

  it('creates valid ad copy with factory functions', () => {
    const copy = createMockAdCopy({ headline: 'Test Headline' });
    expect(copy.id).toBeTruthy();
    expect(copy.headline).toBe('Test Headline');
    expect(copy.platform).toBe('instagram');

    const platformCopy = createPlatformCopy('linkedin');
    expect(platformCopy.platform).toBe('linkedin');
    expect(platformCopy.tone).toBe('professional');
  });

  it('singleInstagramCopy has all required fields', () => {
    expect(singleInstagramCopy.id).toBeTruthy();
    expect(singleInstagramCopy.headline).toBeTruthy();
    expect(singleInstagramCopy.hook).toBeTruthy();
    expect(singleInstagramCopy.bodyText).toBeTruthy();
    expect(singleInstagramCopy.cta).toBeTruthy();
    expect(singleInstagramCopy.platform).toBe('instagram');
  });
});

describe('Idea Bank Fixtures', () => {
  it('has analysis status presets', () => {
    expect(fullAnalysisStatus.visionComplete).toBe(true);
    expect(fullAnalysisStatus.kbQueried).toBe(true);
    expect(visionOnlyAnalysisStatus.kbQueried).toBe(false);
  });

  it('has sources used presets', () => {
    expect(allSourcesUsed.visionAnalysis).toBe(true);
    expect(allSourcesUsed.webSearch).toBe(true);
  });

  it('has mock suggestions', () => {
    expect(mockSuggestions.length).toBeGreaterThan(5);
  });

  it('has filtered suggestion subsets', () => {
    expect(highConfidenceSuggestions.length).toBeGreaterThan(0);
    expect(exactInsertSuggestions.length).toBeGreaterThan(0);
  });

  it('has recipes', () => {
    expect(simpleRecipe.version).toBe('1.0');
    expect(simpleRecipe.products.length).toBeGreaterThan(0);
    expect(complexRecipe.relationships.length).toBeGreaterThan(0);
    expect(complexRecipe.scenarios.length).toBeGreaterThan(0);
  });

  it('creates valid suggestions', () => {
    const suggestion = createMockSuggestion({ confidence: 90 });
    expect(suggestion.id).toBeTruthy();
    expect(suggestion.confidence).toBe(90);
  });

  it('creates valid analyses', () => {
    const analysis = createMockAnalysis('prod-123');
    expect(analysis.productId).toBe('prod-123');
    expect(analysis.confidence).toBeGreaterThan(0);
  });

  it('creates valid recipes', () => {
    const recipe = createMockRecipe([{ id: 'p1', name: 'Test', imageUrls: [] }]);
    expect(recipe.products).toHaveLength(1);
    expect(recipe.version).toBe('1.0');
  });
});

describe('Social Connection Fixtures', () => {
  it('has social connections', () => {
    expect(mockSocialConnections.length).toBeGreaterThan(0);
  });

  it('has active and inactive connections', () => {
    expect(activeConnections.length).toBeGreaterThan(0);
    expect(inactiveConnections.length).toBeGreaterThan(0);
  });

  it('has scheduled posts in various statuses', () => {
    expect(mockScheduledPosts.length).toBeGreaterThan(0);
    expect(scheduledPosts.length).toBeGreaterThan(0);
    expect(publishedPosts.length).toBeGreaterThan(0);
    expect(failedPosts.length).toBeGreaterThan(0);
  });

  it('has post analytics', () => {
    expect(mockPostAnalytics.length).toBeGreaterThan(0);
  });

  it('creates valid connections', () => {
    const conn = createMockConnection({ platform: 'instagram' });
    expect(conn.id).toBeTruthy();
    expect(conn.platform).toBe('instagram');
    expect(conn.isActive).toBe(true);
  });

  it('creates valid scheduled posts', () => {
    const post = createMockScheduledPost({ caption: 'Test post' });
    expect(post.id).toBeTruthy();
    expect(post.caption).toBe('Test post');
    expect(post.status).toBe('draft');
  });

  it('creates valid analytics', () => {
    const analytics = createMockAnalytics('post-123');
    expect(analytics.scheduledPostId).toBe('post-123');
    expect(analytics.impressions).toBeGreaterThan(0);
  });

  it('activeLinkedinConnection has all required fields', () => {
    expect(activeLinkedinConnection.id).toBeTruthy();
    expect(activeLinkedinConnection.platform).toBe('linkedin');
    expect(activeLinkedinConnection.isActive).toBe(true);
    expect(activeLinkedinConnection.accessToken).toBeTruthy();
  });
});

describe('Fixture Integrity', () => {
  it('all products have unique IDs', () => {
    const ids = mockProducts.map(p => p.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all generations have unique IDs', () => {
    const ids = mockGenerations.map(g => g.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all users have unique IDs and emails', () => {
    const ids = mockUsers.map(u => u.id);
    const emails = mockUsers.map(u => u.email);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(emails).size).toBe(emails.length);
  });

  it('all ad copy has unique IDs', () => {
    const ids = mockAdCopy.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all suggestions have unique IDs', () => {
    const ids = mockSuggestions.map(s => s.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it('all social connections have unique IDs', () => {
    const ids = mockSocialConnections.map(c => c.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});
