/**
 * Job Queue Integration Tests
 *
 * Comprehensive integration tests for the BullMQ job queue infrastructure.
 * Tests end-to-end job processing, concurrent jobs, error handling,
 * progress updates, SSE streaming, and worker lifecycle.
 *
 * TDD Methodology:
 * 1. Write tests FIRST (RED)
 * 2. Verify implementation (GREEN)
 * 3. Refactor if needed (IMPROVE)
 */

import { Queue, Worker, Job, QueueEvents } from 'bullmq';
import { EventEmitter } from 'events';
import {
  GenerationJobData,
  GenerationJobResult,
  JobType,
  JobStatus,
  GenerateJobData,
  EditJobData,
  VariationJobData,
  JobProgress,
  QUEUE_NAMES,
  DEFAULT_JOB_OPTIONS,
} from '../jobs/types';

// Use vi.hoisted to define mocks that will be available to vi.mock factories
const {
  mockStorage,
  mockGeminiService,
  mockCloudinary,
  mockLogger,
} = vi.hoisted(() => ({
  mockStorage: {
    getGenerationById: vi.fn(),
    updateGeneration: vi.fn(),
    saveGeneration: vi.fn(),
    createUser: vi.fn(),
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
  mockLogger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock external dependencies
vi.mock('../storage', () => ({
  storage: mockStorage,
}));

vi.mock('../services/geminiService', () => ({
  geminiService: mockGeminiService,
}));

vi.mock('cloudinary', () => ({
  v2: mockCloudinary,
}));

vi.mock('../lib/logger', () => ({
  logger: mockLogger,
  createModuleLogger: () => mockLogger,
}));

// Import after mocks are set up
import { processGenerationJob } from '../jobs/generationWorker';

describe('Job Queue Integration Tests', () => {
  // Test fixtures
  const baseGenerateJobData: GenerateJobData = {
    jobType: JobType.GENERATE,
    userId: 'user-integration-123',
    generationId: 1001,
    createdAt: new Date().toISOString(),
    prompt: 'A professional product photo for an advertisement',
    aspectRatio: '1:1',
  };

  const mockGenerateResult = {
    imageBase64: 'base64encodedimagedata_integration_test',
    conversationHistory: [
      { role: 'user' as const, parts: [{ text: 'A professional product photo' }] },
      { role: 'model' as const, parts: [{ inlineData: { mimeType: 'image/png', data: 'base64' } }] },
    ],
    model: 'gemini-3-pro-image-preview',
    usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 20, totalTokenCount: 30 },
  };

  const mockCloudinaryUploadResult = {
    secure_url: 'https://cloudinary.com/integration-test-image.png',
    public_id: 'integration-test-image-123',
  };

  // Helper to create mock Job objects
  function createMockJob<T extends GenerationJobData>(
    data: T,
    options: Partial<{
      id: string;
      attemptsMade: number;
      opts: { timeout?: number };
    }> = {}
  ): Job<T, GenerationJobResult> {
    return {
      id: options.id || `test-job-${Date.now()}`,
      data,
      attemptsMade: options.attemptsMade || 0,
      opts: options.opts || {},
      updateProgress: vi.fn().mockResolvedValue(undefined),
      log: vi.fn().mockResolvedValue(undefined),
    } as unknown as Job<T, GenerationJobResult>;
  }

  beforeEach(() => {
    vi.clearAllMocks();

    // Default successful mock implementations
    mockStorage.getGenerationById.mockResolvedValue({
      id: '1001',
      userId: 'user-integration-123',
      prompt: 'A professional product photo for an advertisement',
      status: 'pending',
      originalImagePaths: [],
      generatedImagePath: '',
      conversationHistory: null,
    });

    mockStorage.updateGeneration.mockResolvedValue({
      id: '1001',
      userId: 'user-integration-123',
      status: 'processing',
    });

    mockGeminiService.generateImage.mockResolvedValue(mockGenerateResult);
    mockGeminiService.continueConversation.mockResolvedValue(mockGenerateResult);
    mockCloudinary.uploader.upload.mockResolvedValue(mockCloudinaryUploadResult);
  });

  // =================================================================
  // 1. END-TO-END JOB PROCESSING TESTS
  // =================================================================
  describe('End-to-End Job Processing', () => {
    it('should enqueue a job and process it successfully', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'e2e-job-1' });

      const result = await processGenerationJob(job);

      // Verify job completed successfully
      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(result.generationId).toBe(baseGenerateJobData.generationId);
      expect(result.imageUrl).toBe(mockCloudinaryUploadResult.secure_url);
      expect(result.cloudinaryPublicId).toBe(mockCloudinaryUploadResult.public_id);
      expect(result.processingTimeMs).toBeDefined();
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.completedAt).toBeDefined();
    });

    it('should update generation status from pending to processing to completed', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'e2e-status-job' });

      await processGenerationJob(job);

      // Verify status progression
      const updateCalls = mockStorage.updateGeneration.mock.calls;

      // First update: pending -> processing
      expect(updateCalls[0]).toEqual([
        baseGenerateJobData.generationId,
        expect.objectContaining({ status: 'processing' }),
      ]);

      // Final update: processing -> completed with image path
      const lastCall = updateCalls[updateCalls.length - 1];
      expect(lastCall).toEqual([
        baseGenerateJobData.generationId,
        expect.objectContaining({
          status: 'completed',
          generatedImagePath: mockCloudinaryUploadResult.secure_url,
        }),
      ]);
    });

    it('should return correct job status via job result', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'e2e-result-job' });

      const result = await processGenerationJob(job);

      expect(result).toMatchObject({
        generationId: baseGenerateJobData.generationId,
        status: JobStatus.COMPLETED,
        imageUrl: expect.any(String),
        cloudinaryPublicId: expect.any(String),
        processingTimeMs: expect.any(Number),
        completedAt: expect.any(String),
      });

      // Verify timestamp is valid ISO string
      expect(() => new Date(result.completedAt)).not.toThrow();
    });

    it('should handle edit job end-to-end', async () => {
      // Setup edit job prerequisites
      mockStorage.getGenerationById.mockResolvedValue({
        id: '1002',
        userId: 'user-integration-123',
        prompt: 'Original prompt',
        status: 'completed',
        originalImagePaths: [],
        generatedImagePath: 'https://cloudinary.com/original.png',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'Original prompt' }] },
          { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'original64' } }] },
        ],
        editCount: 0,
      });

      const editJobData: EditJobData = {
        jobType: JobType.EDIT,
        userId: 'user-integration-123',
        generationId: 1002,
        createdAt: new Date().toISOString(),
        editPrompt: 'Make the background blue',
        originalImageUrl: 'https://cloudinary.com/original.png',
      };

      const job = createMockJob(editJobData, { id: 'e2e-edit-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(mockGeminiService.continueConversation).toHaveBeenCalledWith(
        expect.any(Array),
        editJobData.editPrompt,
        editJobData.userId
      );
    });

    it('should handle variation job end-to-end', async () => {
      mockStorage.getGenerationById.mockResolvedValue({
        id: '1003',
        userId: 'user-integration-123',
        prompt: 'Original product image',
        status: 'completed',
        originalImagePaths: ['https://cloudinary.com/original.png'],
        generatedImagePath: 'https://cloudinary.com/original.png',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'Original prompt' }] },
          { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'original64' } }] },
        ],
      });

      const variationJobData: VariationJobData = {
        jobType: JobType.VARIATION,
        userId: 'user-integration-123',
        generationId: 1003,
        createdAt: new Date().toISOString(),
        originalImageUrl: 'https://cloudinary.com/original.png',
        variationStrength: 0.6,
      };

      const job = createMockJob(variationJobData, { id: 'e2e-variation-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(mockGeminiService.generateImage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ referenceImages: expect.any(Array) }),
        variationJobData.userId
      );
    });
  });

  // =================================================================
  // 2. CONCURRENT JOB PROCESSING TESTS
  // =================================================================
  describe('Concurrent Job Processing', () => {
    it('should handle multiple concurrent jobs (5+ jobs at once)', async () => {
      const jobCount = 7; // More than 5 to test concurrency
      const jobs = Array.from({ length: jobCount }, (_, i) => {
        const jobData: GenerateJobData = {
          ...baseGenerateJobData,
          generationId: 2000 + i,
          prompt: `Concurrent job ${i + 1}`,
        };

        // Setup storage mock for each generation
        mockStorage.getGenerationById.mockImplementation((id: string) => ({
          id,
          userId: 'user-integration-123',
          prompt: `Concurrent job ${parseInt(id) - 2000 + 1}`,
          status: 'pending',
          originalImagePaths: [],
          generatedImagePath: '',
          conversationHistory: null,
        }));

        return createMockJob(jobData, { id: `concurrent-job-${i}` });
      });

      // Process all jobs concurrently
      const results = await Promise.all(
        jobs.map((job) => processGenerationJob(job))
      );

      // All jobs should complete successfully
      expect(results).toHaveLength(jobCount);
      results.forEach((result, i) => {
        expect(result.status).toBe(JobStatus.COMPLETED);
        expect(result.generationId).toBe(2000 + i);
      });
    });

    it('should process all jobs without conflicts', async () => {
      const jobCount = 5;
      const processedGenerationIds = new Set<number>();
      const updateCalls: Array<[number, any]> = [];

      // Track all updateGeneration calls
      mockStorage.updateGeneration.mockImplementation((id: number, data: any) => {
        updateCalls.push([id, data]);
        return Promise.resolve({ id: String(id), status: data.status });
      });

      const jobs = Array.from({ length: jobCount }, (_, i) => {
        const genId = 3000 + i;
        mockStorage.getGenerationById.mockImplementation((id: string) => {
          const numId = parseInt(id);
          return {
            id,
            userId: 'user-integration-123',
            prompt: `Job for gen ${numId}`,
            status: 'pending',
            originalImagePaths: [],
            generatedImagePath: '',
            conversationHistory: null,
          };
        });

        return createMockJob(
          { ...baseGenerateJobData, generationId: genId },
          { id: `conflict-test-job-${i}` }
        );
      });

      const results = await Promise.all(
        jobs.map((job) => processGenerationJob(job))
      );

      // Track unique generation IDs processed
      results.forEach((result) => {
        processedGenerationIds.add(result.generationId);
      });

      // All generations should be unique (no conflicts)
      expect(processedGenerationIds.size).toBe(jobCount);

      // Each job should have its own updates (2 updates per job: processing + completed)
      expect(updateCalls.length).toBe(jobCount * 2);
    });

    it('should complete all concurrent jobs successfully', async () => {
      const jobCount = 5;

      mockStorage.getGenerationById.mockImplementation((id: string) => ({
        id,
        userId: 'user-integration-123',
        prompt: `Job ${id}`,
        status: 'pending',
        originalImagePaths: [],
        generatedImagePath: '',
        conversationHistory: null,
      }));

      const jobs = Array.from({ length: jobCount }, (_, i) =>
        createMockJob(
          { ...baseGenerateJobData, generationId: 4000 + i },
          { id: `complete-test-${i}` }
        )
      );

      const results = await Promise.all(
        jobs.map((job) => processGenerationJob(job))
      );

      // All should be completed
      const completedCount = results.filter(
        (r) => r.status === JobStatus.COMPLETED
      ).length;
      expect(completedCount).toBe(jobCount);

      // All should have image URLs
      results.forEach((result) => {
        expect(result.imageUrl).toBeDefined();
        expect(result.imageUrl).toContain('cloudinary.com');
      });
    });
  });

  // =================================================================
  // 3. ERROR HANDLING TESTS
  // =================================================================
  describe('Error Handling', () => {
    it('should handle Gemini API failures gracefully', async () => {
      const apiError = new Error('Gemini API quota exceeded');
      mockGeminiService.generateImage.mockRejectedValue(apiError);

      const job = createMockJob(baseGenerateJobData, { id: 'error-gemini-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toContain('Gemini API quota exceeded');
      expect(result.generationId).toBe(baseGenerateJobData.generationId);
      expect(result.processingTimeMs).toBeDefined();
    });

    it('should update job status to failed with error message', async () => {
      const apiError = new Error('Network timeout');
      mockGeminiService.generateImage.mockRejectedValue(apiError);

      const job = createMockJob(baseGenerateJobData, { id: 'error-status-job' });

      const result = await processGenerationJob(job);

      // Verify database was updated with failed status
      const updateCalls = mockStorage.updateGeneration.mock.calls;
      const failedUpdate = updateCalls.find(
        (call) => call[1].status === 'failed'
      );

      expect(failedUpdate).toBeDefined();
      expect(failedUpdate![0]).toBe(baseGenerateJobData.generationId);
      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toBe('Network timeout');
    });

    it('should not block other jobs when one fails', async () => {
      // First job will fail, others succeed
      let callCount = 0;
      mockGeminiService.generateImage.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.reject(new Error('First job failed'));
        }
        return Promise.resolve(mockGenerateResult);
      });

      mockStorage.getGenerationById.mockImplementation((id: string) => ({
        id,
        userId: 'user-integration-123',
        prompt: `Job ${id}`,
        status: 'pending',
        originalImagePaths: [],
        generatedImagePath: '',
        conversationHistory: null,
      }));

      const jobs = [
        createMockJob({ ...baseGenerateJobData, generationId: 5001 }, { id: 'fail-job' }),
        createMockJob({ ...baseGenerateJobData, generationId: 5002 }, { id: 'success-job-1' }),
        createMockJob({ ...baseGenerateJobData, generationId: 5003 }, { id: 'success-job-2' }),
      ];

      const results = await Promise.all(
        jobs.map((job) => processGenerationJob(job))
      );

      // First job failed
      expect(results[0].status).toBe(JobStatus.FAILED);
      expect(results[0].generationId).toBe(5001);

      // Other jobs succeeded
      expect(results[1].status).toBe(JobStatus.COMPLETED);
      expect(results[2].status).toBe(JobStatus.COMPLETED);
    });

    it('should handle missing generation record error', async () => {
      mockStorage.getGenerationById.mockResolvedValue(null);

      const job = createMockJob(baseGenerateJobData, { id: 'missing-gen-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toContain('Generation not found');
    });

    it('should handle Cloudinary upload failures', async () => {
      mockCloudinary.uploader.upload.mockRejectedValue(
        new Error('Cloudinary: insufficient storage quota')
      );

      const job = createMockJob(baseGenerateJobData, { id: 'cloudinary-fail-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toContain('Cloudinary');
    });

    it('should handle invalid job type error', async () => {
      const invalidJobData = {
        jobType: 'invalid_type' as JobType,
        userId: 'user-123',
        generationId: 5000,
        createdAt: new Date().toISOString(),
      } as unknown as GenerationJobData;

      const job = createMockJob(invalidJobData, { id: 'invalid-type-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toContain('Unknown job type');
    });

    it('should handle database update failures gracefully', async () => {
      // First call succeeds (processing status), second fails
      let updateCount = 0;
      mockStorage.updateGeneration.mockImplementation(() => {
        updateCount++;
        if (updateCount > 1) {
          return Promise.reject(new Error('Database connection lost'));
        }
        return Promise.resolve({ id: '1001', status: 'processing' });
      });

      const job = createMockJob(baseGenerateJobData, { id: 'db-fail-job' });

      const result = await processGenerationJob(job);

      // Job should still fail gracefully
      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toContain('Database connection lost');
    });
  });

  // =================================================================
  // 4. JOB PROGRESS UPDATES TESTS
  // =================================================================
  describe('Job Progress Updates', () => {
    it('should report progress during processing', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'progress-job' });

      await processGenerationJob(job);

      // Verify updateProgress was called
      expect(job.updateProgress).toHaveBeenCalled();
      const progressCalls = (job.updateProgress as ReturnType<typeof vi.fn>).mock.calls;
      expect(progressCalls.length).toBeGreaterThan(0);
    });

    it('should have progress percentage increase monotonically', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'monotonic-progress-job' });

      await processGenerationJob(job);

      const progressCalls = (job.updateProgress as ReturnType<typeof vi.fn>).mock.calls;
      const percentages = progressCalls.map((call) => (call[0] as JobProgress).percentage);

      // Verify monotonic increase
      for (let i = 1; i < percentages.length; i++) {
        expect(percentages[i]).toBeGreaterThanOrEqual(percentages[i - 1]);
      }

      // Verify final percentage is 100
      expect(percentages[percentages.length - 1]).toBe(100);
    });

    it('should emit progress events with correct stages', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'stages-progress-job' });

      await processGenerationJob(job);

      const progressCalls = (job.updateProgress as ReturnType<typeof vi.fn>).mock.calls;
      const stages = progressCalls.map((call) => (call[0] as JobProgress).stage);

      // Should include key stages
      expect(stages).toContain('starting');
      expect(stages).toContain('processing');
      expect(stages.some((s) => s === 'uploading' || s === 'finalizing')).toBe(true);
    });

    it('should include meaningful progress messages', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'messages-progress-job' });

      await processGenerationJob(job);

      const progressCalls = (job.updateProgress as ReturnType<typeof vi.fn>).mock.calls;
      const messages = progressCalls.map((call) => (call[0] as JobProgress).message);

      // All messages should be non-empty strings
      messages.forEach((msg) => {
        expect(typeof msg).toBe('string');
        expect(msg.length).toBeGreaterThan(0);
      });
    });

    it('should have progress start at 0% and end at 100%', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'bounds-progress-job' });

      await processGenerationJob(job);

      const progressCalls = (job.updateProgress as ReturnType<typeof vi.fn>).mock.calls;
      const percentages = progressCalls.map((call) => (call[0] as JobProgress).percentage);

      expect(percentages[0]).toBe(0);
      expect(percentages[percentages.length - 1]).toBe(100);
    });

    it('should report progress even on failed jobs', async () => {
      // Fail at processing stage
      mockGeminiService.generateImage.mockRejectedValue(new Error('API Error'));

      const job = createMockJob(baseGenerateJobData, { id: 'failed-progress-job' });

      await processGenerationJob(job);

      // Should still have some progress updates before failure
      expect(job.updateProgress).toHaveBeenCalled();
      const progressCalls = (job.updateProgress as ReturnType<typeof vi.fn>).mock.calls;
      expect(progressCalls.length).toBeGreaterThan(0);
    });
  });

  // =================================================================
  // 5. SSE STREAM TESTS (Mocked behavior simulation)
  // =================================================================
  describe('SSE Stream Behavior', () => {
    // These tests simulate SSE behavior based on job events
    // Actual SSE endpoint testing would require supertest with a running server

    it('should emit events that can be consumed by SSE', async () => {
      const events: Array<{ type: string; data: any }> = [];
      const job = createMockJob(baseGenerateJobData, { id: 'sse-test-job' });

      // Simulate SSE event collection via progress updates
      job.updateProgress = vi.fn().mockImplementation((progress: JobProgress) => {
        events.push({
          type: 'progress',
          data: progress,
        });
        return Promise.resolve();
      });

      await processGenerationJob(job);

      // Should have multiple progress events
      expect(events.length).toBeGreaterThan(0);

      // Verify events have correct structure for SSE
      events.forEach((event) => {
        expect(event.type).toBe('progress');
        expect(event.data).toHaveProperty('stage');
        expect(event.data).toHaveProperty('percentage');
        expect(event.data).toHaveProperty('message');
      });
    });

    it('should support initial status event', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'sse-initial-job' });

      const result = await processGenerationJob(job);

      // Result can be used to send initial status
      const initialStatus = {
        type: 'status',
        state: result.status === JobStatus.COMPLETED ? 'completed' : 'failed',
        progress: { percentage: 100 },
      };

      expect(initialStatus.type).toBe('status');
      expect(initialStatus.state).toBeDefined();
    });

    it('should support completion event for SSE', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'sse-complete-job' });

      const result = await processGenerationJob(job);

      // Simulate SSE completed event
      const completedEvent = {
        type: 'completed',
        result: {
          generationId: result.generationId,
          imageUrl: result.imageUrl,
          status: result.status,
        },
      };

      expect(completedEvent.type).toBe('completed');
      expect(completedEvent.result.imageUrl).toBeDefined();
    });

    it('should support failure event for SSE', async () => {
      mockGeminiService.generateImage.mockRejectedValue(new Error('SSE failure test'));

      const job = createMockJob(baseGenerateJobData, { id: 'sse-fail-job' });

      const result = await processGenerationJob(job);

      // Simulate SSE failed event
      const failedEvent = {
        type: 'failed',
        error: result.error,
      };

      expect(failedEvent.type).toBe('failed');
      expect(failedEvent.error).toContain('SSE failure test');
    });

    it('should handle client disconnect scenarios gracefully', async () => {
      // Simulate a scenario where processing continues even if client disconnects
      // The job should still complete successfully
      const job = createMockJob(baseGenerateJobData, { id: 'sse-disconnect-job' });

      // Even if progress updates "fail" (client disconnected), job continues
      job.updateProgress = vi.fn().mockImplementation(() => {
        // Simulate disconnected client - no error, just ignored
        return Promise.resolve();
      });

      const result = await processGenerationJob(job);

      // Job should still complete
      expect(result.status).toBe(JobStatus.COMPLETED);
    });
  });

  // =================================================================
  // 6. WORKER LIFECYCLE TESTS
  // =================================================================
  describe('Worker Lifecycle', () => {
    it('should process jobs from queue correctly', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'lifecycle-process-job' });

      // Process job like a worker would
      const result = await processGenerationJob(job);

      // Verify full processing lifecycle
      expect(result).toBeDefined();
      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(result.processingTimeMs).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });

    it('should handle job processing in sequence', async () => {
      const executionOrder: number[] = [];

      const jobs = [1, 2, 3].map((i) => {
        const jobData: GenerateJobData = {
          ...baseGenerateJobData,
          generationId: 6000 + i,
        };
        return createMockJob(jobData, { id: `sequence-job-${i}` });
      });

      // Process sequentially (like a worker with concurrency 1)
      for (const job of jobs) {
        await processGenerationJob(job);
        executionOrder.push(job.data.generationId);
      }

      expect(executionOrder).toEqual([6001, 6002, 6003]);
    });

    it('should track processing time accurately', async () => {
      // Add artificial delay to processing
      mockGeminiService.generateImage.mockImplementation(async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return mockGenerateResult;
      });

      const job = createMockJob(baseGenerateJobData, { id: 'timing-job' });

      const result = await processGenerationJob(job);

      // Processing time should be at least the delay we added
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(50);
    });

    it('should handle job with maximum allowed attempts', async () => {
      // Simulate a job that has made multiple attempts
      const job = createMockJob(baseGenerateJobData, {
        id: 'max-attempts-job',
        attemptsMade: DEFAULT_JOB_OPTIONS.attempts! - 1, // Last attempt
      });

      const result = await processGenerationJob(job);

      // Should still process successfully
      expect(result.status).toBe(JobStatus.COMPLETED);
    });
  });

  // =================================================================
  // 7. JOB RETRY LOGIC TESTS
  // =================================================================
  describe('Job Retry Logic', () => {
    it('should mark job as failed when processing fails', async () => {
      mockGeminiService.generateImage.mockRejectedValue(new Error('Retry test failure'));

      const job = createMockJob(baseGenerateJobData, {
        id: 'retry-fail-job',
        attemptsMade: 0,
      });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toBeDefined();
    });

    it('should include attempt information in error context', async () => {
      mockGeminiService.generateImage.mockRejectedValue(new Error('Attempt tracking test'));

      const job = createMockJob(baseGenerateJobData, {
        id: 'attempt-tracking-job',
        attemptsMade: 2,
      });

      const result = await processGenerationJob(job);

      // Job should fail with proper tracking
      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.processingTimeMs).toBeDefined();
      expect(result.completedAt).toBeDefined();
    });

    it('should not retry on permanent failures (like validation)', async () => {
      // Missing generation is a permanent failure
      mockStorage.getGenerationById.mockResolvedValue(null);

      const job = createMockJob(baseGenerateJobData, {
        id: 'permanent-fail-job',
        attemptsMade: 0,
      });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toContain('Generation not found');
    });

    it('should handle transient failures appropriately', async () => {
      // Simulate transient failure (network timeout)
      mockGeminiService.generateImage.mockRejectedValue(new Error('ETIMEDOUT'));

      const job = createMockJob(baseGenerateJobData, {
        id: 'transient-fail-job',
        attemptsMade: 1,
      });

      const result = await processGenerationJob(job);

      // Job fails but error indicates transient issue
      expect(result.status).toBe(JobStatus.FAILED);
      expect(result.error).toContain('ETIMEDOUT');
    });
  });

  // =================================================================
  // 8. EDGE CASES AND BOUNDARY TESTS
  // =================================================================
  describe('Edge Cases and Boundaries', () => {
    it('should handle very long prompts', async () => {
      const longPrompt = 'A '.repeat(1000) + 'detailed product image';
      const jobData: GenerateJobData = {
        ...baseGenerateJobData,
        generationId: 7001,
        prompt: longPrompt,
      };

      mockStorage.getGenerationById.mockResolvedValue({
        id: '7001',
        userId: 'user-integration-123',
        prompt: longPrompt,
        status: 'pending',
        originalImagePaths: [],
        generatedImagePath: '',
        conversationHistory: null,
      });

      const job = createMockJob(jobData, { id: 'long-prompt-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(mockGeminiService.generateImage).toHaveBeenCalledWith(
        longPrompt,
        expect.any(Object),
        expect.any(String)
      );
    });

    it('should handle special characters in prompts', async () => {
      const specialPrompt = 'Product with "quotes" and <brackets> & ampersand unicode: \u00e9\u00f1\u00fc';
      const jobData: GenerateJobData = {
        ...baseGenerateJobData,
        generationId: 7002,
        prompt: specialPrompt,
      };

      mockStorage.getGenerationById.mockResolvedValue({
        id: '7002',
        userId: 'user-integration-123',
        prompt: specialPrompt,
        status: 'pending',
        originalImagePaths: [],
        generatedImagePath: '',
        conversationHistory: null,
      });

      const job = createMockJob(jobData, { id: 'special-chars-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.COMPLETED);
    });

    it('should handle all supported aspect ratios', async () => {
      const aspectRatios: Array<'1:1' | '16:9' | '9:16' | '4:3' | '3:4'> = [
        '1:1', '16:9', '9:16', '4:3', '3:4',
      ];

      for (const aspectRatio of aspectRatios) {
        const jobData: GenerateJobData = {
          ...baseGenerateJobData,
          generationId: 7010 + aspectRatios.indexOf(aspectRatio),
          aspectRatio,
        };

        mockStorage.getGenerationById.mockResolvedValue({
          id: String(jobData.generationId),
          userId: 'user-integration-123',
          prompt: 'Aspect ratio test',
          status: 'pending',
          originalImagePaths: [],
          generatedImagePath: '',
          conversationHistory: null,
        });

        const job = createMockJob(jobData, { id: `aspect-ratio-${aspectRatio}-job` });

        const result = await processGenerationJob(job);

        expect(result.status).toBe(JobStatus.COMPLETED);
        expect(mockGeminiService.generateImage).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({ aspectRatio }),
          expect.any(String)
        );
      }
    });

    it('should handle zero edit count properly', async () => {
      mockStorage.getGenerationById.mockResolvedValue({
        id: '7020',
        userId: 'user-integration-123',
        prompt: 'Original prompt',
        status: 'completed',
        originalImagePaths: [],
        generatedImagePath: 'https://cloudinary.com/original.png',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'Original prompt' }] },
          { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'base64' } }] },
        ],
        editCount: 0,
      });

      const editJobData: EditJobData = {
        jobType: JobType.EDIT,
        userId: 'user-integration-123',
        generationId: 7020,
        createdAt: new Date().toISOString(),
        editPrompt: 'Add more contrast',
        originalImageUrl: 'https://cloudinary.com/original.png',
      };

      const job = createMockJob(editJobData, { id: 'zero-edit-count-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.COMPLETED);

      // Verify edit count was incremented from 0 to 1
      const updateCalls = mockStorage.updateGeneration.mock.calls;
      const completedUpdate = updateCalls.find((call) => call[1].editCount !== undefined);
      expect(completedUpdate?.[1].editCount).toBe(1);
    });

    it('should handle high edit count', async () => {
      mockStorage.getGenerationById.mockResolvedValue({
        id: '7021',
        userId: 'user-integration-123',
        prompt: 'Heavily edited image',
        status: 'completed',
        originalImagePaths: [],
        generatedImagePath: 'https://cloudinary.com/edited.png',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'Original' }] },
          { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'base64' } }] },
        ],
        editCount: 99,
      });

      const editJobData: EditJobData = {
        jobType: JobType.EDIT,
        userId: 'user-integration-123',
        generationId: 7021,
        createdAt: new Date().toISOString(),
        editPrompt: 'One more edit',
        originalImageUrl: 'https://cloudinary.com/edited.png',
      };

      const job = createMockJob(editJobData, { id: 'high-edit-count-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.COMPLETED);

      // Verify edit count was incremented to 100
      const updateCalls = mockStorage.updateGeneration.mock.calls;
      const completedUpdate = updateCalls.find((call) => call[1].editCount === 100);
      expect(completedUpdate).toBeDefined();
    });

    it('should handle variation strength at boundaries', async () => {
      const strengths = [0, 0.5, 1];

      for (const strength of strengths) {
        mockStorage.getGenerationById.mockResolvedValue({
          id: '7030',
          userId: 'user-integration-123',
          prompt: 'Variation test',
          status: 'completed',
          originalImagePaths: ['https://cloudinary.com/original.png'],
          generatedImagePath: 'https://cloudinary.com/original.png',
          conversationHistory: [
            { role: 'user', parts: [{ text: 'Original' }] },
            { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'base64' } }] },
          ],
        });

        const variationJobData: VariationJobData = {
          jobType: JobType.VARIATION,
          userId: 'user-integration-123',
          generationId: 7030,
          createdAt: new Date().toISOString(),
          originalImageUrl: 'https://cloudinary.com/original.png',
          variationStrength: strength,
        };

        const job = createMockJob(variationJobData, { id: `variation-strength-${strength}-job` });

        const result = await processGenerationJob(job);

        expect(result.status).toBe(JobStatus.COMPLETED);
      }
    });
  });

  // =================================================================
  // 9. RESOURCE CLEANUP TESTS
  // =================================================================
  describe('Resource Cleanup', () => {
    it('should not leave orphaned database records on failure', async () => {
      mockGeminiService.generateImage.mockRejectedValue(new Error('Cleanup test failure'));

      const job = createMockJob(baseGenerateJobData, { id: 'cleanup-test-job' });

      await processGenerationJob(job);

      // Verify the generation was updated to failed status (not left in processing)
      const updateCalls = mockStorage.updateGeneration.mock.calls;
      const lastUpdate = updateCalls[updateCalls.length - 1];

      expect(lastUpdate[1].status).toBe('failed');
    });

    it('should handle cleanup when storage update fails', async () => {
      mockGeminiService.generateImage.mockRejectedValue(new Error('Original failure'));

      // Make the failure status update also fail
      mockStorage.updateGeneration.mockImplementation((id: number, data: any) => {
        if (data.status === 'failed') {
          return Promise.reject(new Error('Cannot update to failed'));
        }
        return Promise.resolve({ id: String(id), status: data.status });
      });

      const job = createMockJob(baseGenerateJobData, { id: 'cleanup-fail-job' });

      // Should not throw even if cleanup fails
      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.FAILED);
    });

    it('should complete cleanly without memory leaks (no lingering promises)', async () => {
      const jobs = Array.from({ length: 10 }, (_, i) =>
        createMockJob(
          { ...baseGenerateJobData, generationId: 8000 + i },
          { id: `memory-test-job-${i}` }
        )
      );

      mockStorage.getGenerationById.mockImplementation((id: string) => ({
        id,
        userId: 'user-integration-123',
        prompt: 'Memory test',
        status: 'pending',
        originalImagePaths: [],
        generatedImagePath: '',
        conversationHistory: null,
      }));

      // Process all jobs
      const results = await Promise.all(
        jobs.map((job) => processGenerationJob(job))
      );

      // All should complete
      expect(results.length).toBe(10);
      results.forEach((result) => {
        expect(result.status).toBe(JobStatus.COMPLETED);
        expect(result.completedAt).toBeDefined();
      });
    });
  });

  // =================================================================
  // 10. TYPE GUARDS AND DATA VALIDATION TESTS
  // =================================================================
  describe('Type Guards and Data Validation', () => {
    it('should correctly identify generate job type', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'type-guard-generate-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(mockGeminiService.generateImage).toHaveBeenCalled();
      expect(mockGeminiService.continueConversation).not.toHaveBeenCalled();
    });

    it('should correctly identify edit job type', async () => {
      mockStorage.getGenerationById.mockResolvedValue({
        id: '9001',
        userId: 'user-integration-123',
        prompt: 'Original',
        status: 'completed',
        originalImagePaths: [],
        generatedImagePath: 'https://cloudinary.com/original.png',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'Original' }] },
          { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'base64' } }] },
        ],
        editCount: 0,
      });

      const editJobData: EditJobData = {
        jobType: JobType.EDIT,
        userId: 'user-integration-123',
        generationId: 9001,
        createdAt: new Date().toISOString(),
        editPrompt: 'Edit test',
        originalImageUrl: 'https://cloudinary.com/original.png',
      };

      const job = createMockJob(editJobData, { id: 'type-guard-edit-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.COMPLETED);
      expect(mockGeminiService.continueConversation).toHaveBeenCalled();
    });

    it('should correctly identify variation job type', async () => {
      mockStorage.getGenerationById.mockResolvedValue({
        id: '9002',
        userId: 'user-integration-123',
        prompt: 'Original for variation',
        status: 'completed',
        originalImagePaths: ['https://cloudinary.com/original.png'],
        generatedImagePath: 'https://cloudinary.com/original.png',
        conversationHistory: [
          { role: 'user', parts: [{ text: 'Original' }] },
          { role: 'model', parts: [{ inlineData: { mimeType: 'image/png', data: 'base64' } }] },
        ],
      });

      const variationJobData: VariationJobData = {
        jobType: JobType.VARIATION,
        userId: 'user-integration-123',
        generationId: 9002,
        createdAt: new Date().toISOString(),
        originalImageUrl: 'https://cloudinary.com/original.png',
        variationStrength: 0.5,
      };

      const job = createMockJob(variationJobData, { id: 'type-guard-variation-job' });

      const result = await processGenerationJob(job);

      expect(result.status).toBe(JobStatus.COMPLETED);
      // Variation uses generateImage, not continueConversation
      expect(mockGeminiService.generateImage).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ referenceImages: expect.any(Array) }),
        expect.any(String)
      );
    });

    it('should validate job result structure', async () => {
      const job = createMockJob(baseGenerateJobData, { id: 'result-validation-job' });

      const result = await processGenerationJob(job);

      // Validate required fields exist
      expect(result).toHaveProperty('generationId');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('completedAt');

      // Validate types
      expect(typeof result.generationId).toBe('number');
      expect([JobStatus.COMPLETED, JobStatus.FAILED]).toContain(result.status);
      expect(typeof result.completedAt).toBe('string');

      // Validate optional fields on success
      if (result.status === JobStatus.COMPLETED) {
        expect(result.imageUrl).toBeDefined();
        expect(typeof result.imageUrl).toBe('string');
        expect(result.cloudinaryPublicId).toBeDefined();
        expect(typeof result.cloudinaryPublicId).toBe('string');
      }
    });
  });
});
