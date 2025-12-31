import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest';
import { storage } from '../storage';
import type { GenerateCopyInput } from '../validation/schemas';

// Counter for generating unique variations
let callCount = 0;

// Helper to create mock response
function createMockResponse(framework: string = 'AIDA', variationNum: number = 1) {
  return {
    candidates: [{
      content: {
        parts: [{
          text: JSON.stringify({
            headline: `Test Headline V${variationNum}`,
            hook: `Test Hook for Your Product V${variationNum}`,
            bodyText: `This is test body text that describes the product benefits. Variation ${variationNum}.`,
            primaryText: `Primary text for TikTok V${variationNum}`, // For TikTok tests
            cta: 'Shop Now',
            caption: `Check out our amazing product! V${variationNum} #test #product`,
            hashtags: ['#test', '#product', '#quality', '#deal'],
            framework: framework,
            qualityScore: {
              clarity: 8,
              persuasiveness: 7,
              platformFit: 9,
              brandAlignment: 8,
              overallScore: 8,
              reasoning: `Well-structured ${framework} copy with clear value proposition`
            }
          })
        }]
      }
    }]
  };
}

// Mock the genAI module with dynamic responses
vi.mock('../lib/gemini', () => ({
  genAI: {
    models: {
      generateContent: vi.fn().mockImplementation((opts: any) => {
        callCount++;
        // Extract framework from prompt if specified
        const promptText = opts.contents?.[0]?.parts?.[0]?.text || '';
        let framework = 'AIDA';
        if (promptText.includes('PAS')) framework = 'PAS';
        else if (promptText.includes('BAB')) framework = 'BAB';
        else if (promptText.includes('FAB')) framework = 'FAB';

        return Promise.resolve(createMockResponse(framework, callCount));
      })
    }
  }
}));

// Get mock for assertions
const mockGenerateContent = vi.mocked((await import('../lib/gemini')).genAI.models.generateContent);

describe('Copywriting Service', () => {
  let testGenerationId: string;
  let testUserId: string;

  beforeEach(() => {
    // Reset call count before each test
    callCount = 0;
    vi.clearAllMocks();
  });

  beforeAll(async () => {
    // Create test user with hashed password
    const testEmail = `copytest-${Date.now()}@test.com`;
    const testPasswordHash = 'hashedpassword123'; // In real code, use bcrypt
    const testUser = await storage.createUser(testEmail, testPasswordHash);
    testUserId = testUser.id;

    // Create test generation
    const testGeneration = await storage.saveGeneration({
      prompt: 'Test product image',
      originalImagePaths: ['test.jpg'],
      generatedImagePath: 'generated.jpg',
      resolution: '2K',
      conversationHistory: null,
      parentGenerationId: null,
      editPrompt: null,
    });
    testGenerationId = testGeneration.id;
  });

  afterAll(async () => {
    // Cleanup would go here
  });

  describe('Platform Character Limits', () => {
    it('should enforce Instagram headline limit (40 chars)', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'instagram',
        tone: 'casual',
        productName: 'EcoDry Towels',
        productDescription: 'Ultra-absorbent, eco-friendly bamboo towels that dry 3x faster',
        industry: 'Home Goods',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations).toHaveLength(1);
      expect(variations[0].headline.length).toBeLessThanOrEqual(40);
      expect(variations[0].hook.length).toBeLessThanOrEqual(60);
    });

    it('should enforce LinkedIn headline limit (150 chars)', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'linkedin',
        tone: 'professional',
        productName: 'ProductivityAI',
        productDescription: 'AI-powered productivity tool that automates repetitive tasks',
        industry: 'SaaS',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].headline.length).toBeLessThanOrEqual(150);
    });

    it('should enforce Facebook headline limit (27 chars)', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'facebook',
        tone: 'fun',
        productName: 'SnackBox',
        productDescription: 'Healthy snack subscription delivered monthly',
        industry: 'Food & Beverage',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].headline.length).toBeLessThanOrEqual(27);
    });

    it('should enforce Twitter headline limit (23 chars)', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'twitter',
        tone: 'casual',
        productName: 'QuickNote',
        productDescription: 'Lightning-fast note-taking app',
        industry: 'Productivity',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].headline.length).toBeLessThanOrEqual(23);
    });

    it('should enforce TikTok limits', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'tiktok',
        tone: 'fun',
        productName: 'DanceShoes',
        productDescription: 'Professional dance shoes for all styles',
        industry: 'Apparel',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].headline.length).toBeLessThanOrEqual(40);
      expect(variations[0].primaryText.length).toBeLessThanOrEqual(150);
    });
  });

  describe('Copywriting Frameworks', () => {
    it('should use AIDA framework when specified', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'instagram',
        tone: 'professional',
        productName: 'FitTracker Pro',
        productDescription: 'Advanced fitness tracking with AI coaching',
        industry: 'Health & Fitness',
        framework: 'aida',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].framework).toBe('AIDA');
      expect(variations[0].qualityScore).toBeDefined();
      expect(variations[0].qualityScore.reasoning).toContain('AIDA');
    });

    it('should use PAS framework when specified', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'linkedin',
        tone: 'professional',
        productName: 'SecureVault',
        productDescription: 'Enterprise-grade data security solution',
        industry: 'Cybersecurity',
        framework: 'pas',
        campaignObjective: 'conversion',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].framework).toBe('PAS');
    });

    it('should use BAB framework when specified', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'facebook',
        tone: 'casual',
        productName: 'MealPrep Kit',
        productDescription: 'Complete meal prep solution for busy professionals',
        industry: 'Food & Beverage',
        framework: 'bab',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].framework).toBe('BAB');
    });

    it('should use FAB framework when specified', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'linkedin',
        tone: 'professional',
        productName: 'CloudSync Pro',
        productDescription: 'Real-time cloud synchronization for teams',
        industry: 'SaaS',
        framework: 'fab',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].framework).toBe('FAB');
    });

    it('should auto-select framework based on campaign objective', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'instagram',
        tone: 'casual',
        productName: 'TravelPack',
        productDescription: 'All-in-one travel backpack with smart organization',
        industry: 'Travel & Luggage',
        framework: 'auto',
        campaignObjective: 'awareness',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(['AIDA', 'PAS', 'BAB', 'FAB']).toContain(variations[0].framework);
      expect(variations[0].qualityScore.reasoning).toBeTruthy();
    });
  });

  describe('Multi-Variation Generation', () => {
    it('should generate 3 variations by default', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'instagram',
        tone: 'casual',
        productName: 'SolarCharger',
        productDescription: 'Portable solar charger for outdoor adventures',
        industry: 'Electronics',
        variations: 3,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations).toHaveLength(3);

      // Each variation should be unique
      const headlines = variations.map(v => v.headline);
      const uniqueHeadlines = new Set(headlines);
      expect(uniqueHeadlines.size).toBe(3);
    });

    it('should generate correct number of variations (1-5)', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      for (let count = 1; count <= 5; count++) {
        const request: GenerateCopyInput = {
          generationId: testGenerationId,
          platform: 'instagram',
          tone: 'casual',
          productName: 'TestProduct',
          productDescription: 'Test product description',
          industry: 'Test',
          variations: count,
        };

        const variations = await copywritingService.generateCopy(request);
        expect(variations).toHaveLength(count);
      }
    });
  });

  describe('Quality Scoring', () => {
    it('should include quality scores for all variations', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'linkedin',
        tone: 'professional',
        productName: 'AnalyticsHub',
        productDescription: 'Advanced analytics platform for data-driven decisions',
        industry: 'Analytics',
        variations: 2,
      };

      const variations = await copywritingService.generateCopy(request);

      variations.forEach(variation => {
        expect(variation.qualityScore).toBeDefined();
        expect(variation.qualityScore.clarity).toBeGreaterThanOrEqual(1);
        expect(variation.qualityScore.clarity).toBeLessThanOrEqual(10);
        expect(variation.qualityScore.persuasiveness).toBeGreaterThanOrEqual(1);
        expect(variation.qualityScore.platformFit).toBeGreaterThanOrEqual(1);
        expect(variation.qualityScore.brandAlignment).toBeGreaterThanOrEqual(1);
        expect(variation.qualityScore.overallScore).toBeGreaterThanOrEqual(1);
        expect(variation.qualityScore.reasoning).toBeTruthy();
      });
    });
  });

  describe('Advanced Features', () => {
    it('should incorporate target audience in copy', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'facebook',
        tone: 'casual',
        productName: 'BabyMonitor Pro',
        productDescription: 'Smart baby monitor with AI alerts',
        industry: 'Parenting',
        targetAudience: {
          demographics: 'New parents, ages 25-40',
          psychographics: 'Safety-conscious, tech-savvy',
          painPoints: ['Sleep deprivation', 'Anxiety about baby safety'],
        },
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].bodyText.length).toBeGreaterThan(0);
      expect(variations[0].hook.length).toBeGreaterThan(0);
    });

    it('should incorporate brand voice', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'linkedin',
        tone: 'professional',
        productName: 'EnterpriseSuite',
        productDescription: 'Comprehensive enterprise management platform',
        industry: 'Enterprise Software',
        brandVoice: {
          principles: ['Innovative', 'Trustworthy', 'Results-driven'],
          wordsToAvoid: ['cheap', 'easy', 'simple'],
          wordsToUse: ['premium', 'powerful', 'enterprise-grade'],
        },
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      const fullCopy = `${variations[0].headline} ${variations[0].bodyText} ${variations[0].caption}`.toLowerCase();

      // Should avoid banned words
      expect(fullCopy).not.toContain('cheap');

      expect(variations[0].qualityScore.brandAlignment).toBeGreaterThan(5);
    });

    it('should incorporate social proof', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'instagram',
        tone: 'professional',
        productName: 'FitnessCoach AI',
        productDescription: 'AI-powered personal fitness coaching',
        industry: 'Health & Fitness',
        socialProof: {
          testimonial: 'Lost 30 pounds in 3 months! - Sarah M.',
          stats: '100K+ users, 4.9/5 stars',
        },
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].bodyText.length).toBeGreaterThan(0);
    });

    it('should include product benefits when provided', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'facebook',
        tone: 'professional',
        productName: 'TaskMaster Pro',
        productDescription: 'Advanced project management tool',
        industry: 'Productivity',
        productBenefits: [
          'Increase team productivity by 40%',
          'Automated workflow management',
          'Real-time collaboration',
        ],
        uniqueValueProp: 'The only PM tool with built-in AI assistant',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].bodyText.length).toBeGreaterThan(0);
    });
  });

  describe('Character Counts', () => {
    it('should include accurate character counts', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'instagram',
        tone: 'casual',
        productName: 'SmartWallet',
        productDescription: 'RFID-blocking smart wallet with tracking',
        industry: 'Accessories',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      const counts = variations[0].characterCounts;

      expect(counts.headline).toBe(variations[0].headline.length);
      expect(counts.hook).toBe(variations[0].hook.length);
      expect(counts.body).toBe(variations[0].bodyText.length);
      expect(counts.caption).toBe(variations[0].caption.length);
      expect(counts.total).toBe(
        variations[0].headline.length +
        variations[0].hook.length +
        variations[0].bodyText.length +
        variations[0].caption.length
      );
    });
  });

  describe('Hashtags', () => {
    it('should generate 3-5 hashtags for ads', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'instagram',
        tone: 'fun',
        productName: 'YogaMat Plus',
        productDescription: 'Premium eco-friendly yoga mat',
        industry: 'Fitness',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].hashtags.length).toBeGreaterThanOrEqual(3);
      expect(variations[0].hashtags.length).toBeLessThanOrEqual(5);

      // Each hashtag should start with #
      variations[0].hashtags.forEach(tag => {
        expect(tag).toMatch(/^#/);
      });
    });
  });

  describe('Campaign Objectives', () => {
    it('should tailor copy for awareness campaigns', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'instagram',
        tone: 'casual',
        productName: 'GreenBottle',
        productDescription: 'Sustainable water bottle made from recycled materials',
        industry: 'Sustainability',
        campaignObjective: 'awareness',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].bodyText.length).toBeGreaterThan(0);
      expect(['AIDA', 'PAS']).toContain(variations[0].framework);
    });

    it('should tailor copy for conversion campaigns', async () => {
      const { copywritingService } = await import('../services/copywritingService');

      const request: GenerateCopyInput = {
        generationId: testGenerationId,
        platform: 'facebook',
        tone: 'professional',
        productName: 'SalesPro CRM',
        productDescription: 'CRM that increases sales by 50%',
        industry: 'SaaS',
        campaignObjective: 'conversion',
        variations: 1,
      };

      const variations = await copywritingService.generateCopy(request);

      expect(variations[0].cta.length).toBeGreaterThan(0);
      expect(variations[0].cta.length).toBeLessThanOrEqual(30);
    });
  });
});

describe('Storage Layer - AdCopy', () => {
  let testUserId: string;
  let testGenerationId: string;

  beforeAll(async () => {
    const testEmail = `storage-${Date.now()}@test.com`;
    const testPasswordHash = 'hashedpassword123';
    const testUser = await storage.createUser(testEmail, testPasswordHash);
    testUserId = testUser.id;

    const testGen = await storage.saveGeneration({
      prompt: 'Test',
      originalImagePaths: ['test.jpg'],
      generatedImagePath: 'gen.jpg',
      resolution: '2K',
      conversationHistory: null,
      parentGenerationId: null,
      editPrompt: null,
    });
    testGenerationId = testGen.id;
  });

  it('should save ad copy to database', async () => {
    const copy = await storage.saveAdCopy({
      generationId: testGenerationId,
      userId: testUserId,
      headline: 'Test Headline',
      hook: 'Test Hook',
      bodyText: 'Test body text',
      cta: 'Buy Now',
      caption: 'Test caption',
      hashtags: ['#test', '#ad'],
      platform: 'instagram',
      tone: 'casual',
      framework: 'aida',
      campaignObjective: 'awareness',
      productName: 'Test Product',
      productDescription: 'Test description',
      productBenefits: null,
      uniqueValueProp: null,
      industry: 'Test',
      targetAudience: null,
      brandVoice: null,
      socialProof: null,
      qualityScore: { clarity: 8, persuasiveness: 7, platformFit: 9, brandAlignment: 8, overallScore: 8, reasoning: 'Test' },
      characterCounts: { headline: 13, hook: 9, body: 14, caption: 12, total: 48 },
      variationNumber: 1,
      parentCopyId: null,
    });

    expect(copy.id).toBeDefined();
    expect(copy.headline).toBe('Test Headline');
    expect(copy.platform).toBe('instagram');
  });

  it('should retrieve copy by generation ID', async () => {
    const copies = await storage.getAdCopyByGenerationId(testGenerationId);
    expect(Array.isArray(copies)).toBe(true);
    expect(copies.length).toBeGreaterThan(0);
  });

  it('should retrieve copy by ID', async () => {
    const savedCopy = await storage.saveAdCopy({
      generationId: testGenerationId,
      userId: testUserId,
      headline: 'Unique Test',
      hook: 'Hook',
      bodyText: 'Body',
      cta: 'CTA',
      caption: 'Caption',
      hashtags: ['#test'],
      platform: 'facebook',
      tone: 'professional',
      framework: 'pas',
      campaignObjective: null,
      productName: 'Test',
      productDescription: 'Desc',
      productBenefits: null,
      uniqueValueProp: null,
      industry: 'Test',
      targetAudience: null,
      brandVoice: null,
      socialProof: null,
      qualityScore: null,
      characterCounts: null,
      variationNumber: 1,
      parentCopyId: null,
    });

    const retrieved = await storage.getAdCopyById(savedCopy.id);
    expect(retrieved).toBeDefined();
    expect(retrieved!.headline).toBe('Unique Test');
  });

  it('should delete copy', async () => {
    const copy = await storage.saveAdCopy({
      generationId: testGenerationId,
      userId: testUserId,
      headline: 'To Delete',
      hook: 'Hook',
      bodyText: 'Body',
      cta: 'CTA',
      caption: 'Caption',
      hashtags: ['#test'],
      platform: 'instagram',
      tone: 'casual',
      framework: 'aida',
      campaignObjective: null,
      productName: 'Test',
      productDescription: 'Desc',
      productBenefits: null,
      uniqueValueProp: null,
      industry: 'Test',
      targetAudience: null,
      brandVoice: null,
      socialProof: null,
      qualityScore: null,
      characterCounts: null,
      variationNumber: 1,
      parentCopyId: null,
    });

    await storage.deleteAdCopy(copy.id);

    const retrieved = await storage.getAdCopyById(copy.id);
    expect(retrieved).toBeUndefined();
  });

  it('should update user brand voice', async () => {
    const brandVoice = {
      principles: ['Bold', 'Innovative'],
      wordsToUse: ['transform', 'empower'],
      wordsToAvoid: ['cheap', 'easy'],
    };

    const updated = await storage.updateUserBrandVoice(testUserId, brandVoice);
    expect(updated.brandVoice).toEqual(brandVoice);

    const retrieved = await storage.getUserById(testUserId);
    expect(retrieved!.brandVoice).toEqual(brandVoice);
  });
});
