// @vitest-environment jsdom
/**
 * Tests for factory functions
 * TDD: These tests verify factory functions generate correct mock data
 */
import { describe, it, expect } from 'vitest';
import {
  createMockProduct,
  createMockGeneration,
  createMockTemplate,
  createMockUser,
  createMockAdCopy,
  createMockSocialConnection,
  createMockScheduledPost,
} from '../factories';

describe('Factory Functions', () => {
  describe('createMockProduct', () => {
    it('creates a product with all required fields', () => {
      const product = createMockProduct();

      expect(product.id).toBeDefined();
      expect(product.name).toBeDefined();
      expect(product.cloudinaryUrl).toBeDefined();
      expect(product.cloudinaryPublicId).toBeDefined();
      expect(product.createdAt).toBeInstanceOf(Date);
    });

    it('generates unique IDs for each call', () => {
      const product1 = createMockProduct();
      const product2 = createMockProduct();

      expect(product1.id).not.toBe(product2.id);
    });

    it('allows partial overrides', () => {
      const product = createMockProduct({
        name: 'Custom Product Name',
        category: 'custom-category',
      });

      expect(product.name).toBe('Custom Product Name');
      expect(product.category).toBe('custom-category');
      // Other fields should still have defaults
      expect(product.cloudinaryUrl).toBeDefined();
    });

    it('includes optional enrichment fields', () => {
      const product = createMockProduct();

      expect(product.enrichmentStatus).toBeDefined();
      expect(product.tags).toBeInstanceOf(Array);
      expect(product.description).toBeDefined();
    });

    it('allows overriding enrichmentStatus', () => {
      const product = createMockProduct({ enrichmentStatus: 'draft' });
      expect(product.enrichmentStatus).toBe('draft');
    });

    it('allows overriding benefits array', () => {
      const customBenefits = ['Custom Benefit 1', 'Custom Benefit 2'];
      const product = createMockProduct({ benefits: customBenefits });

      expect(product.benefits).toEqual(customBenefits);
    });

    it('allows overriding features object', () => {
      const customFeatures = { size: 'large', weight: '10kg' };
      const product = createMockProduct({ features: customFeatures });

      expect(product.features).toEqual(customFeatures);
    });
  });

  describe('createMockGeneration', () => {
    it('creates a generation with all required fields', () => {
      const generation = createMockGeneration();

      expect(generation.id).toBeDefined();
      expect(generation.prompt).toBeDefined();
      expect(generation.originalImagePaths).toBeInstanceOf(Array);
      expect(generation.generatedImagePath).toBeDefined();
      expect(generation.createdAt).toBeInstanceOf(Date);
      expect(generation.updatedAt).toBeInstanceOf(Date);
    });

    it('generates unique IDs for each call', () => {
      const gen1 = createMockGeneration();
      const gen2 = createMockGeneration();

      expect(gen1.id).not.toBe(gen2.id);
    });

    it('allows partial overrides', () => {
      const generation = createMockGeneration({
        prompt: 'Custom prompt text',
        status: 'pending',
      });

      expect(generation.prompt).toBe('Custom prompt text');
      expect(generation.status).toBe('pending');
    });

    it('includes edit-related fields', () => {
      const generation = createMockGeneration();

      expect(generation.parentGenerationId).toBeDefined();
      expect(generation.editPrompt).toBeDefined();
      expect(generation.editCount).toBeDefined();
    });

    it('allows overriding resolution', () => {
      const generation = createMockGeneration({ resolution: '4K' });
      expect(generation.resolution).toBe('4K');
    });

    it('allows overriding aspectRatio', () => {
      const generation = createMockGeneration({ aspectRatio: '16:9' });
      expect(generation.aspectRatio).toBe('16:9');
    });

    it('allows overriding userId', () => {
      const generation = createMockGeneration({ userId: 'custom-user-id' });
      expect(generation.userId).toBe('custom-user-id');
    });
  });

  describe('createMockTemplate', () => {
    it('creates a template with all required fields', () => {
      const template = createMockTemplate();

      expect(template.id).toBeDefined();
      expect(template.title).toBeDefined();
      expect(template.prompt).toBeDefined();
      expect(template.createdAt).toBeInstanceOf(Date);
    });

    it('generates unique IDs for each call', () => {
      const template1 = createMockTemplate();
      const template2 = createMockTemplate();

      expect(template1.id).not.toBe(template2.id);
    });

    it('allows partial overrides', () => {
      const template = createMockTemplate({
        title: 'Custom Template Title',
        category: 'promotional',
      });

      expect(template.title).toBe('Custom Template Title');
      expect(template.category).toBe('promotional');
    });

    it('includes optional fields', () => {
      const template = createMockTemplate();

      expect(template.category).toBeDefined();
      expect(template.tags).toBeInstanceOf(Array);
    });

    it('allows overriding tags array', () => {
      const customTags = ['tag1', 'tag2', 'tag3'];
      const template = createMockTemplate({ tags: customTags });

      expect(template.tags).toEqual(customTags);
    });
  });

  describe('createMockUser', () => {
    it('creates a user with all required fields', () => {
      const user = createMockUser();

      expect(user.id).toBeDefined();
      expect(user.email).toBeDefined();
      expect(user.password).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    it('generates unique IDs for each call', () => {
      const user1 = createMockUser();
      const user2 = createMockUser();

      expect(user1.id).not.toBe(user2.id);
    });

    it('generates unique emails for each call', () => {
      const user1 = createMockUser();
      const user2 = createMockUser();

      expect(user1.email).not.toBe(user2.email);
    });

    it('allows partial overrides', () => {
      const user = createMockUser({
        email: 'custom@example.com',
      });

      expect(user.email).toBe('custom@example.com');
    });

    it('includes security-related fields', () => {
      const user = createMockUser();

      expect(user.failedAttempts).toBeDefined();
      expect(user.lockedUntil).toBeDefined();
    });

    it('includes brand voice field', () => {
      const user = createMockUser();
      expect(user.brandVoice).toBeDefined();
    });

    it('allows overriding brandVoice', () => {
      const customVoice = {
        principles: ['Be bold'],
        wordsToAvoid: ['maybe'],
        wordsToUse: ['definitely'],
      };
      const user = createMockUser({ brandVoice: customVoice });

      expect(user.brandVoice).toEqual(customVoice);
    });
  });

  describe('createMockAdCopy', () => {
    it('creates ad copy with all required fields', () => {
      const adCopy = createMockAdCopy();

      expect(adCopy.id).toBeDefined();
      expect(adCopy.generationId).toBeDefined();
      expect(adCopy.userId).toBeDefined();
      expect(adCopy.headline).toBeDefined();
      expect(adCopy.hook).toBeDefined();
      expect(adCopy.bodyText).toBeDefined();
      expect(adCopy.cta).toBeDefined();
      expect(adCopy.caption).toBeDefined();
      expect(adCopy.hashtags).toBeInstanceOf(Array);
      expect(adCopy.platform).toBeDefined();
      expect(adCopy.tone).toBeDefined();
      expect(adCopy.createdAt).toBeInstanceOf(Date);
    });

    it('generates unique IDs for each call', () => {
      const copy1 = createMockAdCopy();
      const copy2 = createMockAdCopy();

      expect(copy1.id).not.toBe(copy2.id);
    });

    it('allows partial overrides', () => {
      const adCopy = createMockAdCopy({
        headline: 'Custom Headline',
        platform: 'linkedin',
      });

      expect(adCopy.headline).toBe('Custom Headline');
      expect(adCopy.platform).toBe('linkedin');
    });

    it('includes product context fields', () => {
      const adCopy = createMockAdCopy();

      expect(adCopy.productName).toBeDefined();
      expect(adCopy.productDescription).toBeDefined();
      expect(adCopy.industry).toBeDefined();
    });

    it('includes quality metrics', () => {
      const adCopy = createMockAdCopy();

      expect(adCopy.qualityScore).toBeDefined();
      expect(adCopy.characterCounts).toBeDefined();
    });
  });

  describe('createMockSocialConnection', () => {
    it('creates a social connection with all required fields', () => {
      const connection = createMockSocialConnection();

      expect(connection.id).toBeDefined();
      expect(connection.userId).toBeDefined();
      expect(connection.platform).toBeDefined();
      expect(connection.accessToken).toBeDefined();
      expect(connection.tokenIv).toBeDefined();
      expect(connection.tokenAuthTag).toBeDefined();
      expect(connection.tokenExpiresAt).toBeInstanceOf(Date);
      expect(connection.isActive).toBeDefined();
      expect(connection.connectedAt).toBeInstanceOf(Date);
      expect(connection.updatedAt).toBeInstanceOf(Date);
    });

    it('generates unique IDs for each call', () => {
      const conn1 = createMockSocialConnection();
      const conn2 = createMockSocialConnection();

      expect(conn1.id).not.toBe(conn2.id);
    });

    it('allows partial overrides', () => {
      const connection = createMockSocialConnection({
        platform: 'instagram',
        platformUsername: '@testuser',
      });

      expect(connection.platform).toBe('instagram');
      expect(connection.platformUsername).toBe('@testuser');
    });

    it('defaults to linkedin platform', () => {
      const connection = createMockSocialConnection();
      expect(connection.platform).toBe('linkedin');
    });

    it('allows overriding isActive', () => {
      const connection = createMockSocialConnection({ isActive: false });
      expect(connection.isActive).toBe(false);
    });
  });

  describe('createMockScheduledPost', () => {
    it('creates a scheduled post with all required fields', () => {
      const post = createMockScheduledPost();

      expect(post.id).toBeDefined();
      expect(post.userId).toBeDefined();
      expect(post.connectionId).toBeDefined();
      expect(post.caption).toBeDefined();
      expect(post.scheduledFor).toBeInstanceOf(Date);
      expect(post.timezone).toBeDefined();
      expect(post.status).toBeDefined();
      expect(post.createdAt).toBeInstanceOf(Date);
      expect(post.updatedAt).toBeInstanceOf(Date);
    });

    it('generates unique IDs for each call', () => {
      const post1 = createMockScheduledPost();
      const post2 = createMockScheduledPost();

      expect(post1.id).not.toBe(post2.id);
    });

    it('allows partial overrides', () => {
      const post = createMockScheduledPost({
        caption: 'Custom caption text',
        status: 'published',
      });

      expect(post.caption).toBe('Custom caption text');
      expect(post.status).toBe('published');
    });

    it('defaults to draft status', () => {
      const post = createMockScheduledPost();
      expect(post.status).toBe('draft');
    });

    it('allows overriding hashtags', () => {
      const customHashtags = ['#test', '#mock'];
      const post = createMockScheduledPost({ hashtags: customHashtags });

      expect(post.hashtags).toEqual(customHashtags);
    });

    it('schedules for future by default', () => {
      const post = createMockScheduledPost();
      const now = new Date();

      expect(post.scheduledFor.getTime()).toBeGreaterThan(now.getTime());
    });
  });

  describe('Factory Type Safety', () => {
    it('createMockProduct returns correct type structure', () => {
      const product = createMockProduct();

      // TypeScript should enforce these exist
      const _id: string = product.id;
      const _name: string = product.name;
      const _url: string = product.cloudinaryUrl;
      const _publicId: string = product.cloudinaryPublicId;
      const _createdAt: Date = product.createdAt;

      expect(_id).toBeTruthy();
      expect(_name).toBeTruthy();
      expect(_url).toBeTruthy();
      expect(_publicId).toBeTruthy();
      expect(_createdAt).toBeInstanceOf(Date);
    });

    it('createMockGeneration returns correct type structure', () => {
      const generation = createMockGeneration();

      const _id: string = generation.id;
      const _prompt: string = generation.prompt;
      const _paths: string[] = generation.originalImagePaths;
      const _genPath: string = generation.generatedImagePath;
      const _createdAt: Date = generation.createdAt;
      const _updatedAt: Date = generation.updatedAt;

      expect(_id).toBeTruthy();
      expect(_prompt).toBeTruthy();
      expect(_paths).toBeInstanceOf(Array);
      expect(_genPath).toBeTruthy();
      expect(_createdAt).toBeInstanceOf(Date);
      expect(_updatedAt).toBeInstanceOf(Date);
    });
  });
});
