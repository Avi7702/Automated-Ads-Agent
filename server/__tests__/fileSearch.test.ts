import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to define mocks that will be available to vi.mock factories
const { mockTrackFileSearchUpload, mockTrackFileSearchQuery, mockStat, mockMkdir, mockReaddir } = vi.hoisted(() => ({
  mockTrackFileSearchUpload: vi.fn(),
  mockTrackFileSearchQuery: vi.fn(),
  mockStat: vi.fn(),
  mockMkdir: vi.fn(),
  mockReaddir: vi.fn(),
}));

// Track SDK calls for verification
const sdkCalls = vi.hoisted(() => ({
  uploadToFileSearchStore: vi.fn(),
  generateContent: vi.fn(),
  listStores: vi.fn(),
  createStore: vi.fn(),
  listFiles: vi.fn(),
  deleteFile: vi.fn(),
}));

// Mock GoogleGenAI SDK - must be done before import
vi.mock('@google/genai', () => {
  class MockGoogleGenAI {
    fileSearchStores = {
      list: sdkCalls.listStores,
      create: sdkCalls.createStore,
      uploadToFileSearchStore: sdkCalls.uploadToFileSearchStore,
      listFiles: sdkCalls.listFiles,
      deleteFile: sdkCalls.deleteFile,
    };
    models = {
      generateContent: sdkCalls.generateContent,
    };
  }

  return {
    GoogleGenAI: MockGoogleGenAI,
  };
});

// Helper to set up default mock implementations
function setupDefaultMocks() {
  const store = {
    name: 'fileSearchStores/test-store-123',
    config: {
      displayName: 'nds-copywriting-rag',
    },
  };

  const file = {
    name: 'files/test-file-456',
  };

  const operation = {
    result: () => Promise.resolve(file),
  };

  sdkCalls.listStores.mockImplementation(() => Promise.resolve([store]));
  sdkCalls.createStore.mockImplementation(() => Promise.resolve(store));
  sdkCalls.uploadToFileSearchStore.mockImplementation(() => Promise.resolve(operation));
  sdkCalls.listFiles.mockImplementation(() => Promise.resolve([
    {
      name: 'files/test-file-1',
      config: {
        displayName: 'test-ad.pdf',
        customMetadata: [
          { key: 'category', stringValue: 'ad_examples' },
          { key: 'uploadedAt', stringValue: '2025-12-24T00:00:00.000Z' },
        ],
      },
    },
  ]));
  sdkCalls.deleteFile.mockImplementation(() => Promise.resolve({}));
  sdkCalls.generateContent.mockImplementation(() => Promise.resolve({
    candidates: [
      {
        content: {
          parts: [{ text: 'Retrieved context from knowledge base' }],
        },
      },
    ],
    citations: [{ source: 'test-doc-1', text: 'Citation text' }],
  }));
}

// Mock telemetry
vi.mock('../instrumentation', () => ({
  telemetry: {
    trackFileSearchUpload: mockTrackFileSearchUpload,
    trackFileSearchQuery: mockTrackFileSearchQuery,
  },
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    stat: (...args: unknown[]) => mockStat(...args),
    mkdir: (...args: unknown[]) => mockMkdir(...args),
    readdir: (...args: unknown[]) => mockReaddir(...args),
  },
}));

// Now import the module after mocks are set up
import * as fileSearchService from '../services/fileSearchService';
import { telemetry } from '../instrumentation';

// ============================================================================
// Part 1: Direct Unit Tests for validateFile (no SDK mocking needed)
// ============================================================================
describe('validateFile', () => {
  describe('dangerous file blocking (security first)', () => {
    it('should block .exe files with specific error message', () => {
      expect(() => fileSearchService.validateFile('/test/virus.exe', { size: 1024 }))
        .toThrow('Dangerous file type blocked: .exe');
    });

    it('should block .sh files', () => {
      expect(() => fileSearchService.validateFile('/test/script.sh', { size: 1024 }))
        .toThrow('Dangerous file type blocked: .sh');
    });

    it('should block .bat files', () => {
      expect(() => fileSearchService.validateFile('/test/batch.bat', { size: 1024 }))
        .toThrow('Dangerous file type blocked: .bat');
    });

    it('should block .cmd files', () => {
      expect(() => fileSearchService.validateFile('/test/command.cmd', { size: 1024 }))
        .toThrow('Dangerous file type blocked: .cmd');
    });

    it('should block .ps1 files', () => {
      expect(() => fileSearchService.validateFile('/test/powershell.ps1', { size: 1024 }))
        .toThrow('Dangerous file type blocked: .ps1');
    });
  });

  describe('unsupported file type rejection', () => {
    it('should reject .xyz files with unsupported error', () => {
      expect(() => fileSearchService.validateFile('/test/file.xyz', { size: 1024 }))
        .toThrow('Unsupported file type: .xyz');
    });

    it('should reject .mp3 files', () => {
      expect(() => fileSearchService.validateFile('/test/audio.mp3', { size: 1024 }))
        .toThrow('Unsupported file type: .mp3');
    });

    it('should reject .jpg files', () => {
      expect(() => fileSearchService.validateFile('/test/image.jpg', { size: 1024 }))
        .toThrow('Unsupported file type: .jpg');
    });
  });

  describe('file size validation', () => {
    it('should reject files over 100MB', () => {
      const size101MB = 101 * 1024 * 1024;
      expect(() => fileSearchService.validateFile('/test/large.pdf', { size: size101MB }))
        .toThrow('File too large');
    });

    it('should accept files at exactly 100MB', () => {
      const size100MB = 100 * 1024 * 1024;
      expect(() => fileSearchService.validateFile('/test/exact.pdf', { size: size100MB }))
        .not.toThrow();
    });

    it('should accept files under 100MB', () => {
      const size50MB = 50 * 1024 * 1024;
      expect(() => fileSearchService.validateFile('/test/normal.pdf', { size: size50MB }))
        .not.toThrow();
    });

    it('should accept very small files', () => {
      expect(() => fileSearchService.validateFile('/test/tiny.txt', { size: 1 }))
        .not.toThrow();
    });
  });

  describe('supported file types', () => {
    const supportedExtensions = [
      '.pdf', '.docx', '.doc', '.txt', '.md', '.csv', '.xlsx', '.xls',
      '.pptx', '.ppt', '.json', '.xml', '.yaml', '.yml', '.html', '.htm'
    ];

    supportedExtensions.forEach(ext => {
      it(`should accept ${ext} files`, () => {
        expect(() => fileSearchService.validateFile(`/test/file${ext}`, { size: 1024 }))
          .not.toThrow();
      });
    });
  });

  describe('case insensitivity', () => {
    it('should accept .PDF (uppercase)', () => {
      expect(() => fileSearchService.validateFile('/test/document.PDF', { size: 1024 }))
        .not.toThrow();
    });

    it('should accept .TXT (uppercase)', () => {
      expect(() => fileSearchService.validateFile('/test/readme.TXT', { size: 1024 }))
        .not.toThrow();
    });

    it('should block .EXE (uppercase)', () => {
      expect(() => fileSearchService.validateFile('/test/virus.EXE', { size: 1024 }))
        .toThrow('Dangerous file type blocked');
    });
  });
});

// ============================================================================
// Part 2: Exported Constants Verification
// ============================================================================
describe('exported constants', () => {
  it('should export ALLOWED_FILE_EXTENSIONS with 16 types', () => {
    expect(fileSearchService.ALLOWED_FILE_EXTENSIONS).toBeDefined();
    expect(fileSearchService.ALLOWED_FILE_EXTENSIONS.length).toBe(16);
    expect(fileSearchService.ALLOWED_FILE_EXTENSIONS).toContain('.pdf');
    expect(fileSearchService.ALLOWED_FILE_EXTENSIONS).toContain('.docx');
  });

  it('should export DANGEROUS_EXTENSIONS with 5 types', () => {
    expect(fileSearchService.DANGEROUS_EXTENSIONS).toBeDefined();
    expect(fileSearchService.DANGEROUS_EXTENSIONS.length).toBe(5);
    expect(fileSearchService.DANGEROUS_EXTENSIONS).toContain('.exe');
    expect(fileSearchService.DANGEROUS_EXTENSIONS).toContain('.sh');
  });

  it('should export MAX_FILE_SIZE_MB as 100', () => {
    expect(fileSearchService.MAX_FILE_SIZE_MB).toBe(100);
  });

  it('should export MAX_FILE_SIZE_BYTES as 100 * 1024 * 1024', () => {
    expect(fileSearchService.MAX_FILE_SIZE_BYTES).toBe(100 * 1024 * 1024);
  });
});

// ============================================================================
// Part 3: Integration Tests with SDK Mocking
// ============================================================================
describe('File Search Service Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Set up SDK mocks
    setupDefaultMocks();
    // Reset fs mock implementations
    mockStat.mockResolvedValue({
      size: 1024 * 1024, // 1MB
      isFile: () => true,
    });
    mockMkdir.mockResolvedValue(undefined);
    mockReaddir.mockResolvedValue([]);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initializeFileSearchStore', () => {
    it('should return existing store if found', async () => {
      const store = await fileSearchService.initializeFileSearchStore();

      expect(store).toBeDefined();
      expect(store.name).toBe('fileSearchStores/test-store-123');
      expect(store.config.displayName).toBe('nds-copywriting-rag');
      expect(sdkCalls.listStores).toHaveBeenCalled();
    });

    it('should create new store if none exists', async () => {
      sdkCalls.listStores.mockResolvedValueOnce([]);

      const store = await fileSearchService.initializeFileSearchStore();

      expect(store).toBeDefined();
      expect(sdkCalls.createStore).toHaveBeenCalledWith({
        config: {
          displayName: 'nds-copywriting-rag',
        },
      });
    });
  });

  describe('uploadReferenceFile', () => {
    it('should upload valid PDF and verify SDK call parameters', async () => {
      const result = await fileSearchService.uploadReferenceFile({
        filePath: '/test/path/test-ad.pdf',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
        description: 'Test ad example',
      });

      expect(result.fileName).toBe('test-ad.pdf');
      expect(result.fileId).toBe('files/test-file-456');
      expect(result.category).toBe('ad_examples');

      // Verify SDK was called with correct parameters
      expect(sdkCalls.uploadToFileSearchStore).toHaveBeenCalledWith({
        file: '/test/path/test-ad.pdf',
        fileSearchStoreName: 'fileSearchStores/test-store-123',
        config: expect.objectContaining({
          displayName: 'test-ad.pdf',
          customMetadata: expect.arrayContaining([
            { key: 'category', stringValue: 'ad_examples' },
            { key: 'description', stringValue: 'Test ad example' },
          ]),
        }),
      });
    });

    it('should include chunking config in upload', async () => {
      await fileSearchService.uploadReferenceFile({
        filePath: '/test/doc.pdf',
        category: fileSearchService.FileCategory.BRAND_GUIDELINES,
      });

      expect(sdkCalls.uploadToFileSearchStore).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            chunkingConfig: {
              whiteSpaceConfig: {
                maxTokensPerChunk: 500,
                maxOverlapTokens: 50,
              },
            },
          }),
        })
      );
    });

    it('should track telemetry on successful upload', async () => {
      await fileSearchService.uploadReferenceFile({
        filePath: '/test/ad.pdf',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
      });

      expect(telemetry.trackFileSearchUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'ad_examples',
          success: true,
          durationMs: expect.any(Number),
        })
      );
    });

    it('should track telemetry on failed upload', async () => {
      mockStat.mockResolvedValue({
        size: 101 * 1024 * 1024, // 101MB - too large
        isFile: () => true,
      });

      await expect(
        fileSearchService.uploadReferenceFile({
          filePath: '/test/large.pdf',
          category: fileSearchService.FileCategory.AD_EXAMPLES,
        })
      ).rejects.toThrow('File too large');

      expect(telemetry.trackFileSearchUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorType: 'Error',
        })
      );
    });

    it('should reject dangerous files before reaching SDK', async () => {
      await expect(
        fileSearchService.uploadReferenceFile({
          filePath: '/test/virus.exe',
          category: fileSearchService.FileCategory.AD_EXAMPLES,
        })
      ).rejects.toThrow('Dangerous file type blocked: .exe');

      // SDK should never be called for dangerous files
      expect(sdkCalls.uploadToFileSearchStore).not.toHaveBeenCalled();
    });

    it('should convert metadata values to strings', async () => {
      await fileSearchService.uploadReferenceFile({
        filePath: '/test/ad.pdf',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
        metadata: {
          year: 2025,
          priority: 1,
        },
      });

      expect(sdkCalls.uploadToFileSearchStore).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            customMetadata: expect.arrayContaining([
              { key: 'year', stringValue: '2025' },
              { key: 'priority', stringValue: '1' },
            ]),
          }),
        })
      );
    });
  });

  describe('queryFileSearchStore', () => {
    it('should construct query with category filter', async () => {
      await fileSearchService.queryFileSearchStore({
        query: 'Instagram ad examples',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
        maxResults: 5,
      });

      expect(sdkCalls.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'gemini-2.0-flash-exp',
          contents: [{ role: 'user', parts: [{ text: 'Instagram ad examples' }] }],
          tools: [
            expect.objectContaining({
              fileSearch: expect.objectContaining({
                fileSearchStoreNames: ['fileSearchStores/test-store-123'],
                metadataFilter: 'category="ad_examples"',
              }),
            }),
          ],
        })
      );
    });

    it('should omit metadata filter when no category provided', async () => {
      await fileSearchService.queryFileSearchStore({
        query: 'Any examples',
        maxResults: 3,
      });

      expect(sdkCalls.generateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          tools: [
            expect.objectContaining({
              fileSearch: expect.not.objectContaining({
                metadataFilter: expect.anything(),
              }),
            }),
          ],
        })
      );
    });

    it('should extract text from response candidates', async () => {
      const result = await fileSearchService.queryFileSearchStore({
        query: 'test query',
      });

      expect(result.context).toBe('Retrieved context from knowledge base');
    });

    it('should return citations from response', async () => {
      const result = await fileSearchService.queryFileSearchStore({
        query: 'test query',
      });

      expect(result.citations).toHaveLength(1);
      expect(result.citations[0]).toEqual({
        source: 'test-doc-1',
        text: 'Citation text',
      });
    });

    it('should track telemetry on successful query', async () => {
      await fileSearchService.queryFileSearchStore({
        query: 'test query',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
      });

      expect(telemetry.trackFileSearchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'ad_examples',
          success: true,
          durationMs: expect.any(Number),
          resultsCount: 1,
        })
      );
    });

    it('should track telemetry on failed query', async () => {
      const error = new Error('SDK error');
      sdkCalls.generateContent.mockRejectedValueOnce(error);

      await expect(
        fileSearchService.queryFileSearchStore({ query: 'test' })
      ).rejects.toThrow('SDK error');

      expect(telemetry.trackFileSearchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorType: 'Error',
        })
      );
    });
  });

  describe('listReferenceFiles', () => {
    it('should call SDK listFiles with store name', async () => {
      await fileSearchService.listReferenceFiles();

      expect(sdkCalls.listFiles).toHaveBeenCalledWith({
        fileSearchStoreName: 'fileSearchStores/test-store-123',
      });
    });

    it('should filter files by category when provided', async () => {
      sdkCalls.listFiles.mockResolvedValueOnce([
        {
          name: 'files/1',
          config: {
            customMetadata: [{ key: 'category', stringValue: 'ad_examples' }],
          },
        },
        {
          name: 'files/2',
          config: {
            customMetadata: [{ key: 'category', stringValue: 'brand_guidelines' }],
          },
        },
      ]);

      const files = await fileSearchService.listReferenceFiles(
        fileSearchService.FileCategory.AD_EXAMPLES
      );

      expect(files).toHaveLength(1);
      expect(files[0].name).toBe('files/1');
    });
  });

  describe('deleteReferenceFile', () => {
    it('should call SDK deleteFile with correct parameters', async () => {
      await fileSearchService.deleteReferenceFile('files/test-file-123');

      expect(sdkCalls.deleteFile).toHaveBeenCalledWith({
        fileSearchStoreName: 'fileSearchStores/test-store-123',
        fileName: 'files/test-file-123',
      });
    });

    it('should return success on deletion', async () => {
      const result = await fileSearchService.deleteReferenceFile('files/test-123');

      expect(result.success).toBe(true);
    });
  });

  describe('seedFileSearchStore', () => {
    it('should create reference directory structure', async () => {
      const result = await fileSearchService.seedFileSearchStore();

      expect(result.success).toBe(true);
      expect(result.referenceDir).toContain('reference-materials');
      expect(mockMkdir).toHaveBeenCalled();
    });

    it('should create subdirectory for each category', async () => {
      await fileSearchService.seedFileSearchStore();

      // 1 main directory + 6 category directories
      expect(mockMkdir).toHaveBeenCalledTimes(7);
    });
  });

  describe('uploadDirectoryToFileSearch', () => {
    beforeEach(() => {
      mockReaddir.mockResolvedValue(['file1.pdf', 'file2.docx', 'file3.txt']);
      mockStat.mockResolvedValue({
        size: 1024,
        isFile: () => true,
      });
    });

    it('should upload all files from directory', async () => {
      const results = await fileSearchService.uploadDirectoryToFileSearch({
        directoryPath: '/test/ads',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
      });

      expect(results.length).toBe(3);
      expect(sdkCalls.uploadToFileSearchStore).toHaveBeenCalledTimes(3);
    });

    it('should skip non-file entries', async () => {
      mockStat.mockResolvedValue({
        size: 1024,
        isFile: () => false,
        isDirectory: () => true,
      });

      const results = await fileSearchService.uploadDirectoryToFileSearch({
        directoryPath: '/test/ads',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
      });

      expect(results).toEqual([]);
      expect(sdkCalls.uploadToFileSearchStore).not.toHaveBeenCalled();
    });

    it('should add source_directory to metadata', async () => {
      mockReaddir.mockResolvedValue(['file.pdf']);

      await fileSearchService.uploadDirectoryToFileSearch({
        directoryPath: '/test/my-ads',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
      });

      expect(sdkCalls.uploadToFileSearchStore).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            customMetadata: expect.arrayContaining([
              { key: 'source_directory', stringValue: 'my-ads' },
            ]),
          }),
        })
      );
    });
  });

  describe('getFileSearchStoreForGeneration', () => {
    it('should return store name string', async () => {
      const storeName = await fileSearchService.getFileSearchStoreForGeneration();

      expect(storeName).toBe('fileSearchStores/test-store-123');
    });
  });

  describe('FileCategory enum', () => {
    it('should export all required categories', () => {
      expect(fileSearchService.FileCategory.BRAND_GUIDELINES).toBe('brand_guidelines');
      expect(fileSearchService.FileCategory.AD_EXAMPLES).toBe('ad_examples');
      expect(fileSearchService.FileCategory.PRODUCT_CATALOG).toBe('product_catalog');
      expect(fileSearchService.FileCategory.COMPETITOR_RESEARCH).toBe('competitor_research');
      expect(fileSearchService.FileCategory.PERFORMANCE_DATA).toBe('performance_data');
      expect(fileSearchService.FileCategory.GENERAL).toBe('general');
    });
  });
});

// ============================================================================
// Part 4: Error Handling Tests
// ============================================================================
describe('Error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupDefaultMocks();
    mockStat.mockResolvedValue({
      size: 1024,
      isFile: () => true,
    });
  });

  it('should propagate SDK errors from uploadToFileSearchStore', async () => {
    const sdkError = new Error('Upload quota exceeded');
    sdkCalls.uploadToFileSearchStore.mockRejectedValueOnce(sdkError);

    await expect(
      fileSearchService.uploadReferenceFile({
        filePath: '/test/file.pdf',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
      })
    ).rejects.toThrow('Upload quota exceeded');
  });

  it('should propagate SDK errors from generateContent', async () => {
    const sdkError = new Error('Rate limit exceeded');
    sdkCalls.generateContent.mockRejectedValueOnce(sdkError);

    await expect(
      fileSearchService.queryFileSearchStore({ query: 'test' })
    ).rejects.toThrow('Rate limit exceeded');
  });

  it('should propagate SDK errors from listFiles', async () => {
    const sdkError = new Error('Store not found');
    sdkCalls.listStores.mockResolvedValueOnce([{ name: 'test', config: { displayName: 'nds-copywriting-rag' } }]);
    sdkCalls.listFiles.mockRejectedValueOnce(sdkError);

    await expect(
      fileSearchService.listReferenceFiles()
    ).rejects.toThrow('Store not found');
  });

  it('should handle file stat errors', async () => {
    mockStat.mockRejectedValueOnce(new Error('ENOENT: no such file'));

    await expect(
      fileSearchService.uploadReferenceFile({
        filePath: '/nonexistent/file.pdf',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
      })
    ).rejects.toThrow('ENOENT');
  });
});
