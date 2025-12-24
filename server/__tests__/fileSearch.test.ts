import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Use vi.hoisted to define mocks that will be available to vi.mock factories
const { mockTrackFileSearchUpload, mockTrackFileSearchQuery, mockStat, mockMkdir, mockReaddir } = vi.hoisted(() => ({
  mockTrackFileSearchUpload: vi.fn(),
  mockTrackFileSearchQuery: vi.fn(),
  mockStat: vi.fn(),
  mockMkdir: vi.fn(),
  mockReaddir: vi.fn(),
}));

// Mock GoogleGenAI SDK - must be done before import
vi.mock('@google/genai', () => {
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

  const genAIInstance = {
    fileSearchStores: {
      list: () => Promise.resolve([store]),
      create: () => Promise.resolve(store),
      uploadToFileSearchStore: () => Promise.resolve(operation),
      listFiles: () => Promise.resolve([
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
      ]),
      deleteFile: () => Promise.resolve({}),
    },
    models: {
      generateContent: () => Promise.resolve({
        candidates: [
          {
            content: {
              parts: [{ text: 'Retrieved context from knowledge base' }],
            },
          },
        ],
        citations: [{ source: 'test-doc-1', text: 'Citation text' }],
      }),
    },
  };

  class MockGoogleGenAI {
    fileSearchStores = genAIInstance.fileSearchStores;
    models = genAIInstance.models;
  }

  return {
    GoogleGenAI: MockGoogleGenAI,
  };
});

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

describe('File Search Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset mock implementations
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
    });
  });

  describe('uploadReferenceFile', () => {
    it('should successfully upload a valid PDF file', async () => {
      const result = await fileSearchService.uploadReferenceFile({
        filePath: '/test/path/test-ad.pdf',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
        description: 'Test ad example',
      });

      expect(result).toBeDefined();
      expect(result.fileName).toBe('test-ad.pdf');
      expect(result.fileId).toBe('files/test-file-456');
      expect(result.category).toBe('ad_examples');

      // Verify telemetry was called
      expect(telemetry.trackFileSearchUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'ad_examples',
          success: true,
          durationMs: expect.any(Number),
        })
      );
    });

    it('should reject files that are too large', async () => {
      // Mock file larger than 100MB
      mockStat.mockResolvedValue({
        size: 101 * 1024 * 1024, // 101MB
        isFile: () => true,
      });

      await expect(
        fileSearchService.uploadReferenceFile({
          filePath: '/test/path/large-file.pdf',
          category: fileSearchService.FileCategory.AD_EXAMPLES,
        })
      ).rejects.toThrow('File too large');

      // Verify telemetry tracked the error
      expect(telemetry.trackFileSearchUpload).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errorType: 'Error',
        })
      );
    });

    it('should reject unsupported file types', async () => {
      await expect(
        fileSearchService.uploadReferenceFile({
          filePath: '/test/path/file.xyz',
          category: fileSearchService.FileCategory.AD_EXAMPLES,
        })
      ).rejects.toThrow('Unsupported file type');
    });

    it('should block dangerous executable files', async () => {
      // Note: In the actual service, unsupported file types are rejected first,
      // so dangerous executables get the "Unsupported file type" error
      const dangerousFiles = [
        '/test/virus.exe',
        '/test/script.sh',
        '/test/batch.bat',
        '/test/command.cmd',
        '/test/powershell.ps1',
      ];

      for (const filePath of dangerousFiles) {
        await expect(
          fileSearchService.uploadReferenceFile({
            filePath,
            category: fileSearchService.FileCategory.AD_EXAMPLES,
          })
        ).rejects.toThrow(); // These are rejected - either as unsupported or dangerous
      }
    });

    it('should accept all supported file types', async () => {
      const supportedFiles = [
        '/test/doc.pdf',
        '/test/doc.docx',
        '/test/doc.doc',
        '/test/doc.txt',
        '/test/doc.md',
        '/test/data.csv',
        '/test/data.xlsx',
        '/test/data.xls',
        '/test/presentation.pptx',
        '/test/presentation.ppt',
        '/test/config.json',
        '/test/config.xml',
        '/test/config.yaml',
        '/test/config.yml',
        '/test/page.html',
        '/test/page.htm',
      ];

      for (const filePath of supportedFiles) {
        const result = await fileSearchService.uploadReferenceFile({
          filePath,
          category: fileSearchService.FileCategory.AD_EXAMPLES,
        });
        expect(result).toBeDefined();
        expect(result.fileId).toBe('files/test-file-456');
      }
    });

    it('should include custom metadata in upload', async () => {
      const result = await fileSearchService.uploadReferenceFile({
        filePath: '/test/ad.pdf',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
        description: 'Nike Instagram ad',
        metadata: {
          brand: 'Nike',
          platform: 'Instagram',
          year: 2025,
        },
      });

      expect(result.metadata).toEqual({
        brand: 'Nike',
        platform: 'Instagram',
        year: 2025,
      });
    });
  });

  describe('queryFileSearchStore', () => {
    it('should successfully query for context', async () => {
      const result = await fileSearchService.queryFileSearchStore({
        query: 'Instagram ad for running shoes',
        category: fileSearchService.FileCategory.AD_EXAMPLES,
        maxResults: 5,
      });

      expect(result).toBeDefined();
      expect(result.context).toBe('Retrieved context from knowledge base');
      expect(result.citations).toHaveLength(1);
      expect(result.citations[0]).toEqual({
        source: 'test-doc-1',
        text: 'Citation text',
      });

      // Verify telemetry was called
      expect(telemetry.trackFileSearchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'ad_examples',
          success: true,
          durationMs: expect.any(Number),
          resultsCount: 1,
        })
      );
    });

    it('should query without category filter', async () => {
      const result = await fileSearchService.queryFileSearchStore({
        query: 'Any ad copy examples',
        maxResults: 3,
      });

      expect(result).toBeDefined();
      expect(result.context).toBeDefined();

      // Verify telemetry tracked query without category
      expect(telemetry.trackFileSearchQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          category: undefined,
          success: true,
        })
      );
    });
  });

  describe('listReferenceFiles', () => {
    it('should list all files without category filter', async () => {
      const files = await fileSearchService.listReferenceFiles();

      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
      expect(files.length).toBeGreaterThan(0);
    });

    it('should filter files by category', async () => {
      const files = await fileSearchService.listReferenceFiles(
        fileSearchService.FileCategory.AD_EXAMPLES
      );

      expect(files).toBeDefined();
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('deleteReferenceFile', () => {
    it('should successfully delete a file', async () => {
      const result = await fileSearchService.deleteReferenceFile('files/test-file-123');

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('seedFileSearchStore', () => {
    it('should create directory structure', async () => {
      const result = await fileSearchService.seedFileSearchStore();

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.referenceDir).toContain('reference-materials');

      // Verify mkdir was called
      expect(mockMkdir).toHaveBeenCalled();
    });

    it('should create subdirectories for each category', async () => {
      await fileSearchService.seedFileSearchStore();

      // Check that mkdir was called at least for the main directory
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('reference-materials'),
        expect.objectContaining({ recursive: true })
      );

      // Verify mkdir was called multiple times (once for main + once per category)
      expect(mockMkdir).toHaveBeenCalledTimes(7); // 1 main + 6 categories
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
        description: 'Bulk upload test',
      });

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(3);

      // Verify each file was uploaded
      for (const result of results) {
        expect(result.fileId).toBe('files/test-file-456');
        expect(result.category).toBe('ad_examples');
      }
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

      // Should return empty array since all entries are directories
      expect(results).toEqual([]);
    });
  });

  describe('getFileSearchStoreForGeneration', () => {
    it('should return store name for generation', async () => {
      const storeName = await fileSearchService.getFileSearchStoreForGeneration();

      expect(storeName).toBe('fileSearchStores/test-store-123');
    });
  });

  describe('FileCategory enum', () => {
    it('should have all required categories', () => {
      expect(fileSearchService.FileCategory.BRAND_GUIDELINES).toBe('brand_guidelines');
      expect(fileSearchService.FileCategory.AD_EXAMPLES).toBe('ad_examples');
      expect(fileSearchService.FileCategory.PRODUCT_CATALOG).toBe('product_catalog');
      expect(fileSearchService.FileCategory.COMPETITOR_RESEARCH).toBe('competitor_research');
      expect(fileSearchService.FileCategory.PERFORMANCE_DATA).toBe('performance_data');
      expect(fileSearchService.FileCategory.GENERAL).toBe('general');
    });
  });
});
