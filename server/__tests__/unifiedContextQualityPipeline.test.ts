import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Hoisted mocks ──────────────────────────────────────────────────
const {
  mockStorage,
  mockBuildEnhancedContext,
  mockGetBrandDNAContext,
  mockGetRelevantPatterns,
  mockFormatPatternsForPrompt,
  mockAnalyzeProductImage,
  mockQueryFileSearchStore,
  mockGetPlatformGuidelines,
  mockEvaluatePreGenGate,
  mockCheckContentSafety,
  mockEvaluateContent,
} = vi.hoisted(() => ({
  mockStorage: {
    getBrandProfileByUserId: vi.fn(),
    getProductById: vi.fn(),
    getStyleReferenceById: vi.fn(),
  },
  mockBuildEnhancedContext: vi.fn(),
  mockGetBrandDNAContext: vi.fn(),
  mockGetRelevantPatterns: vi.fn(),
  mockFormatPatternsForPrompt: vi.fn(),
  mockAnalyzeProductImage: vi.fn(),
  mockQueryFileSearchStore: vi.fn(),
  mockGetPlatformGuidelines: vi.fn(),
  mockEvaluatePreGenGate: vi.fn(),
  mockCheckContentSafety: vi.fn(),
  mockEvaluateContent: vi.fn(),
}));

// ── Mock modules ───────────────────────────────────────────────────
vi.mock('../storage', () => ({ storage: mockStorage }));
vi.mock('../services/productKnowledgeService', () => ({
  productKnowledgeService: {},
  buildEnhancedContext: mockBuildEnhancedContext,
}));
vi.mock('../services/brandDNAService', () => ({
  getBrandDNAContext: mockGetBrandDNAContext,
}));
vi.mock('../services/patternExtractionService', () => ({
  getRelevantPatterns: mockGetRelevantPatterns,
  formatPatternsForPrompt: mockFormatPatternsForPrompt,
}));
vi.mock('../services/visionAnalysisService', () => ({
  analyzeProductImage: mockAnalyzeProductImage,
}));
vi.mock('../services/fileSearchService', () => ({
  queryFileSearchStore: mockQueryFileSearchStore,
}));
vi.mock('../services/platformSpecsService', () => ({
  getPlatformSpecs: vi.fn(),
}));
vi.mock('../services/generation/promptBuilder', () => ({
  buildPrompt: vi.fn(() => 'assembled prompt'),
  getPlatformGuidelines: mockGetPlatformGuidelines,
}));
vi.mock('../services/generation/preGenGate', () => ({
  evaluatePreGenGate: mockEvaluatePreGenGate,
}));
vi.mock('../services/generation/criticStage', () => ({
  runCriticLoop: vi.fn(),
}));
vi.mock('../services/contentSafetyService', () => ({
  checkContentSafety: mockCheckContentSafety,
}));
vi.mock('../services/confidenceScoringService', () => ({
  evaluateContent: mockEvaluateContent,
}));

// ── Import after mocks ─────────────────────────────────────────────
import {
  assembleContext,
  runPreGenGate,
  runQualityAssessment,
  executePipeline,
  toGenerationContext,
  type UnifiedPipelineInput,
} from '../services/unifiedContextQualityPipeline';

// ── Test Data ──────────────────────────────────────────────────────
const baseImageInput: UnifiedPipelineInput = {
  outputType: 'image',
  generationInput: {
    prompt: 'Professional photo of steel rebar on construction site',
    mode: 'standard',
    images: [],
    resolution: '2K',
    userId: 'user-123',
    productIds: ['prod-1'],
    platform: 'instagram',
  },
};

const baseCopyInput: UnifiedPipelineInput = {
  outputType: 'copy',
  copyInput: {
    productIds: ['prod-1'],
    platform: 'linkedin',
    tone: 'professional',
    goal: 'drive traffic',
    userId: 'user-123',
  },
};

// ── Tests ──────────────────────────────────────────────────────────
describe('UnifiedContextQualityPipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: all context sources return nothing (empty/null)
    mockBuildEnhancedContext.mockResolvedValue(null);
    mockStorage.getBrandProfileByUserId.mockResolvedValue(null);
    mockGetBrandDNAContext.mockResolvedValue(null);
    mockGetRelevantPatterns.mockResolvedValue([]);
    mockStorage.getProductById.mockResolvedValue(null);
    mockAnalyzeProductImage.mockResolvedValue({ success: false });
    mockQueryFileSearchStore.mockResolvedValue(null);
    mockGetPlatformGuidelines.mockReturnValue(null);
    mockStorage.getStyleReferenceById.mockResolvedValue(null);
  });

  // ── assembleContext ────────────────────────────────────────────
  describe('assembleContext', () => {
    it('should return empty context when no sources are available', async () => {
      const result = await assembleContext(baseImageInput);

      expect(result.sourcesLoaded).toEqual([]);
      expect(result.product).toBeUndefined();
      expect(result.brand).toBeUndefined();
      expect(result.brandDNA).toBeUndefined();
      expect(result.patterns).toBeUndefined();
      expect(result.vision).toBeUndefined();
      expect(result.kb).toBeUndefined();
      expect(result.style).toBeUndefined();
    });

    it('should load product context when available', async () => {
      mockBuildEnhancedContext.mockResolvedValue({
        product: { name: 'Steel Rebar 12mm', category: 'rebar', description: 'High-quality rebar' },
        relatedProducts: [],
        installationScenarios: [],
        brandImages: [],
        formattedContext: 'Steel Rebar 12mm: High-quality rebar',
      });

      const result = await assembleContext(baseImageInput);

      expect(result.product).toBeDefined();
      expect(result.product!.primaryName).toBe('Steel Rebar 12mm');
      expect(result.sourcesLoaded).toContain('product');
    });

    it('should load brand context when available', async () => {
      mockStorage.getBrandProfileByUserId.mockResolvedValue({
        brandName: 'NDS',
        preferredStyles: ['professional', 'industrial'],
        brandValues: ['quality', 'reliability'],
        brandColors: ['#1a1a1a', '#ff6600'],
      });

      const result = await assembleContext(baseImageInput);

      expect(result.brand).toBeDefined();
      expect(result.brand!.name).toBe('NDS');
      expect(result.sourcesLoaded).toContain('brand');
    });

    it('should load brand DNA when available', async () => {
      mockGetBrandDNAContext.mockResolvedValue('Always use professional tone. Avoid slang.');

      const result = await assembleContext(baseImageInput);

      expect(result.brandDNA).toBeDefined();
      expect(result.brandDNA!.contentRules).toContain('professional tone');
      expect(result.sourcesLoaded).toContain('brandDNA');
    });

    it('should load learned patterns when available', async () => {
      const mockPatterns = [
        { id: '1', hookType: 'question', engagement: 0.85 },
        { id: '2', hookType: 'stat', engagement: 0.92 },
      ];
      mockGetRelevantPatterns.mockResolvedValue(mockPatterns);
      mockFormatPatternsForPrompt.mockReturnValue('Use question hooks and stat hooks');

      const result = await assembleContext(baseImageInput);

      expect(result.patterns).toBeDefined();
      expect(result.patterns!.patternCount).toBe(2);
      expect(result.sourcesLoaded).toContain('patterns');
    });

    it('should load platform guidelines when platform is specified', async () => {
      mockGetPlatformGuidelines.mockReturnValue('Instagram: Use square images, max 2200 chars');

      const result = await assembleContext(baseImageInput);

      expect(result.platformGuidelines).toBeDefined();
      expect(result.sourcesLoaded).toContain('platform');
    });

    it('should handle individual source failures gracefully', async () => {
      // Product context throws
      mockBuildEnhancedContext.mockRejectedValue(new Error('DB connection failed'));
      // Brand context works
      mockStorage.getBrandProfileByUserId.mockResolvedValue({
        brandName: 'NDS',
        preferredStyles: [],
        brandValues: [],
        brandColors: [],
      });

      const result = await assembleContext(baseImageInput);

      // Brand should still load even though product failed
      expect(result.brand).toBeDefined();
      expect(result.sourcesLoaded).toContain('brand');
      expect(result.sourcesFailed).toContain('product');
    });

    it('should extract userId from copyInput when generationInput is absent', async () => {
      await assembleContext(baseCopyInput);

      // Should have called storage with the correct userId
      expect(mockStorage.getBrandProfileByUserId).toHaveBeenCalledWith('user-123');
    });
  });

  // ── runPreGenGate ──────────────────────────────────────────────
  describe('runPreGenGate', () => {
    it('should pass when gate score is above threshold', async () => {
      mockEvaluatePreGenGate.mockResolvedValue({
        score: 75,
        pass: true,
        suggestions: [],
        breakdown: { promptSpecificity: 20, contextCompleteness: 20, imageQuality: 15, consistency: 20 },
      });

      const context = { sourcesLoaded: ['brand'], sourcesFailed: [] };
      const result = await runPreGenGate(baseImageInput, context);

      expect(result.passed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.score).toBe(75);
    });

    it('should block when gate score is below 40', async () => {
      mockEvaluatePreGenGate.mockResolvedValue({
        score: 25,
        pass: false,
        suggestions: ['Add more detail to your prompt', 'Select a product'],
        breakdown: { promptSpecificity: 5, contextCompleteness: 5, imageQuality: 10, consistency: 5 },
      });

      const context = { sourcesLoaded: [], sourcesFailed: [] };
      const result = await runPreGenGate(baseImageInput, context);

      expect(result.blocked).toBe(true);
      expect(result.passed).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should skip gate when skipGates.preGen is true', async () => {
      const input: UnifiedPipelineInput = {
        ...baseImageInput,
        skipGates: { preGen: true },
      };

      const context = { sourcesLoaded: [], sourcesFailed: [] };
      const result = await runPreGenGate(input, context);

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
      expect(mockEvaluatePreGenGate).not.toHaveBeenCalled();
    });

    it('should allow generation when gate evaluation fails', async () => {
      mockEvaluatePreGenGate.mockRejectedValue(new Error('LLM timeout'));

      const context = { sourcesLoaded: [], sourcesFailed: [] };
      const result = await runPreGenGate(baseImageInput, context);

      expect(result.passed).toBe(true);
      expect(result.blocked).toBe(false);
      expect(result.score).toBe(-1);
    });
  });

  // ── runQualityAssessment ───────────────────────────────────────
  describe('runQualityAssessment', () => {
    it('should run both safety and confidence checks on caption', async () => {
      mockCheckContentSafety.mockResolvedValue({
        hateSpeech: true,
        violence: true,
        sexualContent: true,
        piiDetection: true,
        prohibitedWords: [],
        competitorMentions: [],
        brandSafetyScore: 95,
      });
      mockEvaluateContent.mockResolvedValue({
        overall: 82,
        breakdown: {
          characterLimitValid: true,
          brandVoiceAlignment: 85,
          hookQuality: 80,
          ctaPresence: true,
          hashtagAppropriate: true,
        },
        reasoning: 'Strong brand alignment',
        recommendation: 'auto_approve',
      });

      const result = await runQualityAssessment(
        baseImageInput,
        'Check out our premium steel rebar! Visit nextdaysteel.co.uk',
        'https://example.com/image.jpg',
      );

      expect(result.safety).toBeDefined();
      expect(result.confidence).toBeDefined();
      expect(result.overallRecommendation).toBe('auto_approve');
    });

    it('should auto-reject when brand safety score is very low', async () => {
      mockCheckContentSafety.mockResolvedValue({
        hateSpeech: false,
        violence: true,
        sexualContent: true,
        piiDetection: true,
        prohibitedWords: ['competitor-name'],
        competitorMentions: ['CompetitorSteel'],
        brandSafetyScore: 15,
      });
      mockEvaluateContent.mockResolvedValue({
        overall: 50,
        breakdown: {
          characterLimitValid: true,
          brandVoiceAlignment: 40,
          hookQuality: 50,
          ctaPresence: true,
          hashtagAppropriate: true,
        },
        reasoning: 'Contains competitor mentions',
        recommendation: 'manual_review',
      });

      const result = await runQualityAssessment(baseImageInput, 'CompetitorSteel is worse than us!');

      expect(result.overallRecommendation).toBe('auto_reject');
    });

    it('should skip gates when requested', async () => {
      const input: UnifiedPipelineInput = {
        ...baseImageInput,
        skipGates: { safety: true, confidence: true },
      };

      const result = await runQualityAssessment(input, 'Some caption');

      expect(mockCheckContentSafety).not.toHaveBeenCalled();
      expect(mockEvaluateContent).not.toHaveBeenCalled();
      expect(result.overallRecommendation).toBe('manual_review');
    });

    it('should handle safety check failure gracefully', async () => {
      mockCheckContentSafety.mockRejectedValue(new Error('API timeout'));
      mockEvaluateContent.mockResolvedValue({
        overall: 70,
        breakdown: {
          characterLimitValid: true,
          brandVoiceAlignment: 70,
          hookQuality: 65,
          ctaPresence: true,
          hashtagAppropriate: true,
        },
        reasoning: 'Decent content',
        recommendation: 'manual_review',
      });

      const result = await runQualityAssessment(baseImageInput, 'Some caption');

      expect(result.safety).toBeUndefined();
      expect(result.confidence).toBeDefined();
      expect(result.overallRecommendation).toBe('manual_review');
    });
  });

  // ── executePipeline ────────────────────────────────────────────
  describe('executePipeline', () => {
    it('should execute the full pipeline and return context + gate result', async () => {
      mockEvaluatePreGenGate.mockResolvedValue({
        score: 80,
        pass: true,
        suggestions: [],
        breakdown: { promptSpecificity: 20, contextCompleteness: 20, imageQuality: 20, consistency: 20 },
      });

      const result = await executePipeline(baseImageInput);

      expect(result.stagesCompleted).toContain('contextAssembly');
      expect(result.stagesCompleted).toContain('preGenGate');
      expect(result.gate.passed).toBe(true);
      expect(result.gate.blocked).toBe(false);
    });

    it('should stop early when pre-gen gate blocks', async () => {
      mockEvaluatePreGenGate.mockResolvedValue({
        score: 20,
        pass: false,
        suggestions: ['Prompt is too vague'],
        breakdown: { promptSpecificity: 5, contextCompleteness: 5, imageQuality: 5, consistency: 5 },
      });

      const result = await executePipeline(baseImageInput);

      expect(result.gate.blocked).toBe(true);
      expect(result.stagesCompleted).toContain('contextAssembly');
      expect(result.stagesCompleted).toContain('preGenGate');
    });
  });

  // ── toGenerationContext ────────────────────────────────────────
  describe('toGenerationContext', () => {
    it('should correctly map AssembledContext to GenerationContext', () => {
      const assembled = {
        product: {
          primaryId: 'prod-1',
          primaryName: 'Steel Rebar',
          relationships: [],
          scenarios: [],
          brandImages: [],
          formattedContext: 'Steel Rebar context',
        },
        brand: {
          name: 'NDS',
          styles: ['professional'],
          values: ['quality'],
          colors: ['#1a1a1a'],
          voicePrinciples: [],
        },
        sourcesLoaded: ['product', 'brand'],
        sourcesFailed: [],
      };

      const genCtx = toGenerationContext(baseImageInput.generationInput!, assembled);

      expect(genCtx.input).toBe(baseImageInput.generationInput);
      expect(genCtx.product?.primaryName).toBe('Steel Rebar');
      expect(genCtx.brand?.name).toBe('NDS');
    });
  });
});
