/**
 * Generation Worker Tests
 *
 * TDD Test Suite for the BullMQ Generation Worker
 * Tests job processing for generate, edit, and variation job types.
 *
 * Following TDD methodology:
 * 1. Write tests FIRST (RED)
 * 2. Implement to make tests pass (GREEN)
 * 3. Refactor (IMPROVE)
 */

import { Job } from 'bullmq';
import {
  GenerationJobData,
  GenerationJobResult,
  JobType,
  JobStatus,
  GenerateJobData,
  EditJobData,
  VariationJobData,
  JobProgress,
} from '../jobs/types';

// Use vi.hoisted to define mocks that will be available to vi.mock factories
const { mockStorage, mockGeminiService, mockCloudinary } = vi.hoisted(() => ({
  mockStorage: {
    getGenerationById: vi.fn(),
    updateGeneration: vi.fn(),
    saveGeneration: vi.fn(),
  },
  mockGeminiService: {
    generateImage: vi.fn(),
    continueConversation: vi.fn(),
  },
  mockCloudinary: {
    uploader: {
      upload: vi.fn(),
    },
  },
}));

vi.mock('../storage', () => ({
  storage: mockStorage,
}));

vi.mock('../services/geminiService', () => ({
  geminiService: mockGeminiService,
}));

vi.mock('cloudinary', () => ({
  v2: mockCloudinary,
}));

// Mock gemini.ts to prevent GoogleGenAI instantiation (requires API key)
vi.mock('../lib/gemini', () => ({
  genAI: { models: { generateContent: vi.fn() } },
  createGeminiClient: vi.fn(),
  getEnvApiKey: vi.fn(),
}));

// Mock geminiClient.ts to prevent transitive import of gemini.ts
vi.mock('../lib/geminiClient', () => ({
  generateContentWithRetry: vi.fn(),
  getGlobalGeminiClient: vi.fn(),
  setGlobalGeminiClient: vi.fn(),
}));

// Mock geminiVideoService to prevent transitive import of geminiClient
vi.mock('../services/geminiVideoService', () => ({
  generateVideo: vi.fn(),
}));

vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  createModuleLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}));

// Import the worker after mocks
import { processGenerationJob } from '../jobs/generationWorker';

describe('Generation Worker', () => {
  // Helper to create mock Job objects
  function createMockJob<T extends GenerationJobData>(
    data: T,
    options: Partial<{
      id: string;
      attemptsMade: number;
      opts: { timeout?: number };
    }> = {},
  ): Job<T, GenerationJobResult> {
    return {
      id: options.id || 'test-job-123',
      data,
      attemptsMade: options.attemptsMade || 0,
      opts: options.opts || {},
      updateProgress: vi.fn().mockResolvedValue(undefined),
      log: vi.fn().mockResolvedValue(undefined),
    } as unknown as Job<T, GenerationJobResult>;
  }

  // Test fixtures
  const baseGenerateJobData: GenerateJobData = {
    jobType: JobType.GENERATE,
    userId: 'user-123',
    generationId: 456,
    createdAt: new Date().toISOString(),
    prompt: 'A beautiful sunset over mountains',
    aspectRatio: '16:9',
  };

  const baseEditJobData: EditJobData = {
    jobType: JobType.EDIT,
    userId: 'user-123',
    generationId: 457,
    createdAt: new Date().toISOString(),
    editPrompt: 'Make the sky more orange',
    originalImageUrl: 'https://cloudinary.com/original-image.png',
  };

  const baseVariationJobData: VariationJobData = {
    jobType: JobType.VARIATION,
    userId: 'user-123',
    generationId: 458,
    createdAt: new Date().toISOString(),
    originalImageUrl: 'https://cloudinary.com/original-image.png',
    variationStrength: 0.7,
  };

  const mockGenerateResult = {
    imageBase64: 'base64encodedimagedata',
    conversationHistory: [
      { role: 'user' as const, parts: [{ text: 'A beautiful sunset' }] },
      { role: 'model' as const, parts: [{ inlineData: { mimeType: 'image/png', data: 'base64' } }] },
    ],
    model: 'gemini-3-pro-image-preview',
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
  };

  const mockCloudinaryUploadResult = {
    secure_url: 'https://cloudinary.com/generated-image.png',
    public_id: 'generated-image-123',
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default mock implementations
    mockStorage.getGenerationById.mockResolvedValue({
      id: '456',
      userId: 'user-123',
      prompt: 'A beautiful sunset over mountains',
      status: 'pending',
      originalImagePaths: [],
      generatedImagePath: '',
      conversationHistory: null,
    });

    mockStorage.updateGeneration.mockResolvedValue({
      id: '456',
      userId: 'user-123',
      status: 'processing',
    });

    mockGeminiService.generateImage.mockResolvedValue(mockGenerateResult);
    mockGeminiService.continueConversation.mockResolvedValue(mockGenerateResult);
    mockCloudinary.uploader.upload.mockResolvedValue(mockCloudinaryUploadResult);
  });

  describe('processGenerationJob - Generate Jobs', () => {
    it('successfully processes a generate job', async () => {
      const job = createMockJob(baseGenerateJobData);

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(result.generationId).toBe(456);
      expect(result.imageUrl).toBe(mockCloudinaryUploadResult.secure_url);
      expect(result.cloudinaryPublicId).toBe(mockCloudinaryUploadResult.public_id);
      expect(result.processingTimeMs).toBeDefined();
      expect(result.completedAt).toBeDefined();

      // Verify Gemini was called with correct parameters
      expect(mockGeminiService.generateImage).toHaveBeenCalledWith(
        baseGenerateJobData.prompt,
        expect.objectContaining({
          aspectRatio: baseGenerateJobData.aspectRatio,
        }),
        baseGenerateJobData.userId,
      );

      // Verify Cloudinary upload was called
      expect(mockCloudinary.uploader.upload).toHaveBeenCalledWith(
        expect.stringContaining('data:image/png;base64,'),
        expect.objectContaining({
          folder: expect.any(String),
        }),
      );
    });

    it('updates generation status to processing when job starts', async () => {
      const job = createMockJob(baseGenerateJobData);

      await processGenerationJob(job);

      // First call should be to update status to 'processing'
      expect(mockStorage.updateGeneration).toHaveBeenCalledWith(
        456,
        expect.objectContaining({
          status: 'processing',
        }),
      );
    });

    it('updates generation status to completed when job succeeds', async () => {
      const job = createMockJob(baseGenerateJobData);

      await processGenerationJob(job);

      // Last call should be to update with completed status and image path
      expect(mockStorage.updateGeneration).toHaveBeenLastCalledWith(
        456,
        expect.objectContaining({
          status: 'completed',
          generatedImagePath: mockCloudinaryUploadResult.secure_url,
        }),
      );
    });

    it('reports progress during processing', async () => {
      const job = createMockJob(baseGenerateJobData);

      await processGenerationJob(job);

      // Should have called updateProgress multiple times
      expect(job.updateProgress).toHaveBeenCalled();

      // Verify progress stages
      const progressCalls = (job.updateProgress as ReturnType<typeof vi.fn>).mock.calls;
      expect(progressCalls.length).toBeGreaterThanOrEqual(3); // At least: starting, processing, finalizing

      // First progress should be 'starting' stage
      const firstProgress = progressCalls[0][0] as JobProgress;
      expect(firstProgress.stage).toBe('starting');
      expect(firstProgress.percentage).toBe(0);

      // Last progress before completion should be high percentage
      const lastProgress = progressCalls[progressCalls.length - 1][0] as JobProgress;
      expect(lastProgress.percentage).toBeGreaterThanOrEqual(90);
    });
  });

  describe('processGenerationJob - Edit Jobs', () => {
    it('successfully processes an edit job', async () => {
      // Setup: Need to get original generation with conversation history
      mockStorage.getGenerationById.mockResolvedValue({
        id: '457',
        userId: 'user-123',
        prompt: 'Original prompt',
        status: 'completed',
        originalImagePaths: [],
        generatedImagePath: 'https://cloudinary.com/original-image.png',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'Original prompt' }] },
          { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'originalbase64' } }] },
        ],
      });

      const job = createMockJob(baseEditJobData);

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(result.generationId).toBe(457);
      expect(result.imageUrl).toBeDefined();

      // Verify continueConversation was called for edit
      expect(mockGeminiService.continueConversation).toHaveBeenCalledWith(
        expect.any(Array), // conversation history
        baseEditJobData.editPrompt,
        baseEditJobData.userId,
      );
    });
  });

  describe('processGenerationJob - Variation Jobs', () => {
    it('successfully processes a variation job', async () => {
      // Setup: Variation creates new image based on original
      mockStorage.getGenerationById.mockResolvedValue({
        id: '458',
        userId: 'user-123',
        prompt: 'Original image prompt',
        status: 'completed',
        originalImagePaths: ['https://cloudinary.com/original-image.png'],
        generatedImagePath: 'https://cloudinary.com/original-image.png',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'Original prompt' }] },
          { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'originalbase64' } }] },
        ],
      });

      const job = createMockJob(baseVariationJobData);

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(result.generationId).toBe(458);
      expect(result.imageUrl).toBeDefined();

      // Variation should use generateImage with reference images
      expect(mockGeminiService.generateImage).toHaveBeenCalledWith(
        expect.any(String), // variation prompt
        expect.objectContaining({
          referenceImages: expect.any(Array),
        }),
        baseVariationJobData.userId,
      );
    });
  });

  describe('Error Handling', () => {
    it('handles Gemini API failures gracefully and updates status to failed', async () => {
      const apiError = new Error('Gemini API rate limit exceeded');
      mockGeminiService.generateImage.mockRejectedValue(apiError);

      const job = createMockJob(baseGenerateJobData);

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toContain('Gemini API rate limit exceeded');
      expect(result.generationId).toBe(456);

      // Verify database was updated with failed status
      expect(mockStorage.updateGeneration).toHaveBeenLastCalledWith(
        456,
        expect.objectContaining({
          status: 'failed',
        }),
      );
    });

    it('handles missing generation ID error', async () => {
      mockStorage.getGenerationById.mockResolvedValue(undefined);

      const job = createMockJob(baseGenerateJobData);

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toContain('Generation not found');
    });

    it('handles invalid job data error', async () => {
      const invalidJobData = {
        jobType: 'invalid_type' as JobType,
        userId: 'user-123',
        generationId: 456,
        createdAt: new Date().toISOString(),
      } as unknown as GenerationJobData;

      const job = createMockJob(invalidJobData);

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toContain('Unknown job type');
    });

    it('handles job timeout correctly', async () => {
      // Simulate a long-running operation
      mockGeminiService.generateImage.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Job timed out'));
          }, 100);
        });
      });

      const job = createMockJob(baseGenerateJobData, {
        opts: { timeout: 50 }, // Very short timeout
      });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toBeDefined();
    });

    it('handles Cloudinary upload failures', async () => {
      mockCloudinary.uploader.upload.mockRejectedValue(new Error('Cloudinary upload failed: insufficient credits'));

      const job = createMockJob(baseGenerateJobData);

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toContain('Cloudinary');
    });
  });

  describe('Job Progress Updates', () => {
    it('emits progress at each stage', async () => {
      const job = createMockJob(baseGenerateJobData);

      await processGenerationJob(job);

      const progressCalls = (job.updateProgress as ReturnType<typeof vi.fn>).mock.calls;

      // Extract stages from progress calls
      const stages = progressCalls.map((call) => (call[0] as JobProgress).stage);

      // Should have gone through multiple stages
      expect(stages).toContain('starting');
      expect(stages).toContain('processing');
      expect(stages.some((s) => s === 'uploading' || s === 'finalizing')).toBe(true);
    });

    it('progress percentages increase monotonically', async () => {
      const job = createMockJob(baseGenerateJobData);

      await processGenerationJob(job);

      const progressCalls = (job.updateProgress as ReturnType<typeof vi.fn>).mock.calls;
      const percentages = progressCalls.map((call) => (call[0] as JobProgress).percentage);

      // Each percentage should be >= previous
      for (let i = 1; i < percentages.length; i++) {
        expect(percentages[i]).toBeGreaterThanOrEqual(percentages[i - 1]);
      }
    });
  });

  describe('Database Operations', () => {
    it('saves conversation history after successful generation', async () => {
      const job = createMockJob(baseGenerateJobData);

      await processGenerationJob(job);

      // Verify conversation history was saved
      expect(mockStorage.updateGeneration).toHaveBeenCalledWith(
        456,
        expect.objectContaining({
          conversationHistory: expect.any(Array),
        }),
      );
    });

    it('increments edit count for edit jobs', async () => {
      mockStorage.getGenerationById.mockResolvedValue({
        id: '457',
        userId: 'user-123',
        prompt: 'Original prompt',
        status: 'completed',
        editCount: 2,
        originalImagePaths: [],
        generatedImagePath: 'https://cloudinary.com/original-image.png',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'Original prompt' }] },
          { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'originalbase64' } }] },
        ],
      });

      const job = createMockJob(baseEditJobData);

      await processGenerationJob(job);

      // Edit count should be incremented
      expect(mockStorage.updateGeneration).toHaveBeenCalledWith(
        457,
        expect.objectContaining({
          editCount: 3,
        }),
      );
    });
  });

  describe('Result Structure', () => {
    it('returns complete GenerationJobResult on success', async () => {
      const job = createMockJob(baseGenerateJobData);

      const result = await processGenerationJob(job);

      expect(result).toMatchObject({
        generationId: 456,
        status: JobStatus.COMPLETED,
        imageUrl: expect.any(String),
        cloudinaryPublicId: expect.any(String),
        completedAt: expect.any(String),
        processingTimeMs: expect.any(Number),
      });
    });

    it('returns complete GenerationJobResult on failure', async () => {
      mockGeminiService.generateImage.mockRejectedValue(new Error('API Error'));

      const job = createMockJob(baseGenerateJobData);

      const result = await processGenerationJob(job);

      expect(result).toMatchObject({
        generationId: 456,
        status: JobStatus.FAILED,
        error: expect.any(String),
        completedAt: expect.any(String),
        processingTimeMs: expect.any(Number),
      });
    });
  });
});
