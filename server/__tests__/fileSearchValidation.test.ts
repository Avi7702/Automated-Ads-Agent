/**
 * Unit tests for File Search validation logic
 * Tests file validation rules without requiring Google SDK
 */
import { describe, it, expect } from 'vitest';
import path from 'path';

// Allowed file types for File Search (from fileSearchService.ts)
const ALLOWED_FILE_EXTENSIONS = [
  '.pdf', '.docx', '.doc', '.txt', '.md', '.csv', '.xlsx', '.xls',
  '.pptx', '.ppt', '.json', '.xml', '.yaml', '.yml', '.html', '.htm'
];

const MAX_FILE_SIZE_MB = 100;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Dangerous extensions that should be blocked
const DANGEROUS_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.ps1'];

/**
 * Validate file before upload (extracted logic)
 */
function validateFile(filePath: string, stats: { size: number }): { valid: boolean; error?: string } {
  const ext = path.extname(filePath).toLowerCase();

  // Block dangerous executable files first (security check)
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Dangerous file type blocked: ${ext}` };
  }

  // Check file extension
  if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    return { valid: false, error: `Unsupported file type: ${ext}. Allowed types: ${ALLOWED_FILE_EXTENSIONS.join(', ')}` };
  }

  // Check file size
  if (stats.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max: ${MAX_FILE_SIZE_MB}MB)` };
  }

  return { valid: true };
}

// File categories for organization
enum FileCategory {
  BRAND_GUIDELINES = 'brand_guidelines',
  AD_EXAMPLES = 'ad_examples',
  PRODUCT_CATALOG = 'product_catalog',
  COMPETITOR_RESEARCH = 'competitor_research',
  PERFORMANCE_DATA = 'performance_data',
  GENERAL = 'general',
}

describe('File Search Validation', () => {
  describe('validateFile', () => {
    it('should accept valid PDF files', () => {
      const result = validateFile('/test/document.pdf', { size: 1024 * 1024 });
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files that are too large', () => {
      const result = validateFile('/test/large.pdf', { size: 101 * 1024 * 1024 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('File too large');
    });

    it('should reject unsupported file types', () => {
      const result = validateFile('/test/file.xyz', { size: 1024 });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Unsupported file type');
    });

    it('should block dangerous executable files', () => {
      const dangerousFiles = [
        '/test/virus.exe',
        '/test/script.sh',
        '/test/batch.bat',
        '/test/command.cmd',
        '/test/powershell.ps1',
      ];

      for (const filePath of dangerousFiles) {
        const result = validateFile(filePath, { size: 1024 });
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Dangerous file type blocked');
      }
    });

    it('should accept all supported file types', () => {
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
        const result = validateFile(filePath, { size: 1024 });
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      }
    });

    it('should handle edge case at exactly 100MB', () => {
      const result = validateFile('/test/exact.pdf', { size: 100 * 1024 * 1024 });
      expect(result.valid).toBe(true);
    });

    it('should handle very small files', () => {
      const result = validateFile('/test/tiny.txt', { size: 1 });
      expect(result.valid).toBe(true);
    });

    it('should handle file paths with spaces', () => {
      const result = validateFile('/test/my file.pdf', { size: 1024 });
      expect(result.valid).toBe(true);
    });

    it('should handle uppercase extensions', () => {
      const result = validateFile('/test/document.PDF', { size: 1024 });
      expect(result.valid).toBe(true);
    });
  });

  describe('FileCategory enum', () => {
    it('should have all required categories', () => {
      expect(FileCategory.BRAND_GUIDELINES).toBe('brand_guidelines');
      expect(FileCategory.AD_EXAMPLES).toBe('ad_examples');
      expect(FileCategory.PRODUCT_CATALOG).toBe('product_catalog');
      expect(FileCategory.COMPETITOR_RESEARCH).toBe('competitor_research');
      expect(FileCategory.PERFORMANCE_DATA).toBe('performance_data');
      expect(FileCategory.GENERAL).toBe('general');
    });

    it('should have exactly 6 categories', () => {
      const categoryCount = Object.keys(FileCategory).length;
      expect(categoryCount).toBe(6);
    });
  });

  describe('Constants', () => {
    it('should have correct max file size', () => {
      expect(MAX_FILE_SIZE_MB).toBe(100);
      expect(MAX_FILE_SIZE_BYTES).toBe(100 * 1024 * 1024);
    });

    it('should have 16 allowed file extensions', () => {
      expect(ALLOWED_FILE_EXTENSIONS.length).toBe(16);
    });

    it('should have 5 dangerous extensions blocked', () => {
      expect(DANGEROUS_EXTENSIONS.length).toBe(5);
    });
  });
});
