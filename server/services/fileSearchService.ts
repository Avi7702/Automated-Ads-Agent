/**
 * Google Gemini File Search Service
 *
 * Manages the RAG (Retrieval Augmented Generation) system for ad copywriting
 * using Google's File Search Tool for context grounding.
 *
 * Features:
 * - Upload brand guidelines, ad examples, product catalogs
 * - Automatic chunking, embedding, and indexing
 * - Semantic search for relevant context during copy generation
 * - Citation tracking for transparency
 *
 * Docs: https://ai.google.dev/gemini-api/docs/file-search
 */

import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';
import { telemetry } from '../instrumentation';

// Fallback to GOOGLE_API_KEY for backward compatibility
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
if (!GEMINI_API_KEY) {
  console.warn('[FileSearch] No GEMINI_API_KEY or GOOGLE_API_KEY found - File Search features disabled');
}

const genAI = GEMINI_API_KEY ? new GoogleGenAI({ apiKey: GEMINI_API_KEY }) : null;

// File Search Store configuration
const FILE_SEARCH_STORE_NAME = 'nds-copywriting-rag';

// Allowed file types for File Search (Google supports 100+ formats)
export const ALLOWED_FILE_EXTENSIONS = [
  '.pdf', '.docx', '.doc', '.txt', '.md', '.csv', '.xlsx', '.xls',
  '.pptx', '.ppt', '.json', '.xml', '.yaml', '.yml', '.html', '.htm'
];

// Dangerous extensions that should be blocked (security check)
export const DANGEROUS_EXTENSIONS = ['.exe', '.sh', '.bat', '.cmd', '.ps1'];

export const MAX_FILE_SIZE_MB = 100; // Google File Search limit
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Validate file before upload
 * Security checks run first (dangerous extensions), then format, then size
 */
export function validateFile(filePath: string, stats: { size: number }): void {
  const ext = path.extname(filePath).toLowerCase();

  // SECURITY FIRST: Block dangerous executable files
  if (DANGEROUS_EXTENSIONS.includes(ext)) {
    throw new Error(`Dangerous file type blocked: ${ext}`);
  }

  // Check file extension is in allowed list
  if (!ALLOWED_FILE_EXTENSIONS.includes(ext)) {
    throw new Error(
      `Unsupported file type: ${ext}. Allowed types: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`
    );
  }

  // Check file size
  if (stats.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max: ${MAX_FILE_SIZE_MB}MB)`
    );
  }
}

/**
 * File categories for organization
 */
export enum FileCategory {
  BRAND_GUIDELINES = 'brand_guidelines',
  AD_EXAMPLES = 'ad_examples',
  PRODUCT_CATALOG = 'product_catalog',
  COMPETITOR_RESEARCH = 'competitor_research',
  PERFORMANCE_DATA = 'performance_data',
  GENERAL = 'general',
}

/**
 * Initialize or get existing File Search Store
 * Note: File Search is not supported by Replit AI integrations
 * Returns null if not available
 */
export async function initializeFileSearchStore(): Promise<any | null> {
  // File Search Store is not supported by Replit AI integrations
  // Return null to gracefully disable this feature
  if (!genAI || process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
    console.log('[FileSearch] File Search Store disabled - using Replit AI integrations');
    return null;
  }
  
  try {
    // Check if store already exists
    const stores = await (genAI as any).fileSearchStores?.list?.();
    if (!stores || !Array.isArray(stores)) {
      console.log('[FileSearch] File Search Store API not available');
      return null;
    }
    
    const existingStore = stores.find(
      (store: any) => store.config?.displayName === FILE_SEARCH_STORE_NAME
    );

    if (existingStore) {
      console.log('✅ Found existing File Search Store:', existingStore.name);
      return existingStore;
    }

    // Create new store
    console.log('📁 Creating new File Search Store...');
    const newStore = await (genAI as any).fileSearchStores.create({
      config: {
        displayName: FILE_SEARCH_STORE_NAME,
      },
    });

    console.log('✅ Created File Search Store:', newStore.name);
    return newStore;
  } catch (error) {
    console.error('❌ Error initializing File Search Store:', error);
    return null;
  }
}

/**
 * Upload a file to the File Search Store
 */
export async function uploadReferenceFile(params: {
  filePath: string;
  category: FileCategory;
  description?: string;
  metadata?: Record<string, string | number>;
}) {
  const { filePath, category, description, metadata = {} } = params;
  const startTime = Date.now();
  let success = false;
  let errorType: string | undefined;

  try {
    // Validate file before upload
    const stats = await fs.stat(filePath);
    validateFile(filePath, stats);

    // Get or create store
    const store = await initializeFileSearchStore();

    // Prepare file metadata
    const fileName = path.basename(filePath);
    const customMetadata = [
      { key: 'category', stringValue: category },
      { key: 'uploadedAt', stringValue: new Date().toISOString() },
    ];

    if (description) {
      customMetadata.push({ key: 'description', stringValue: description });
    }

    // Add user-provided metadata (convert all values to strings)
    for (const [key, value] of Object.entries(metadata)) {
      if (value !== null && value !== undefined) {
        customMetadata.push({ key, stringValue: String(value) });
      }
    }

    // Upload file to File Search Store
    console.log(`📤 Uploading ${fileName} to File Search Store...`);
    const operation = await (genAI as any).fileSearchStores.uploadToFileSearchStore({
      file: filePath,
      fileSearchStoreName: store.name,
      config: {
        displayName: fileName,
        customMetadata,
        chunkingConfig: {
          whiteSpaceConfig: {
            maxTokensPerChunk: 500, // Larger chunks for ad copy context
            maxOverlapTokens: 50,
          },
        },
      },
    });

    // Wait for operation to complete
    const result = await operation.result();
    console.log(`✅ Uploaded ${fileName}:`, result.name);

    success = true;

    return {
      fileName,
      fileId: result.name,
      category,
      uploadedAt: new Date(),
      metadata,
    };
  } catch (error) {
    success = false;
    errorType = error instanceof Error ? error.name : 'UnknownError';
    console.error(`❌ Error uploading file ${filePath}:`, error);
    throw error;
  } finally {
    // Track upload metrics
    const durationMs = Date.now() - startTime;
    telemetry.trackFileSearchUpload({
      category,
      success,
      durationMs,
      errorType,
    });
  }
}

/**
 * List all files in the File Search Store
 */
export async function listReferenceFiles(category?: FileCategory) {
  try {
    const store = await initializeFileSearchStore();
    const files = await (genAI as any).fileSearchStores.listFiles({
      fileSearchStoreName: store.name,
    });

    if (category) {
      return files.filter(
        (file: any) =>
          file.config?.customMetadata?.find(
            (m: any) => m.key === 'category' && m.stringValue === category
          )
      );
    }

    return files;
  } catch (error) {
    console.error('❌ Error listing files:', error);
    throw error;
  }
}

/**
 * Delete a file from the File Search Store
 */
export async function deleteReferenceFile(fileId: string) {
  try {
    const store = await initializeFileSearchStore();
    await (genAI as any).fileSearchStores.deleteFile({
      fileSearchStoreName: store.name,
      fileName: fileId,
    });

    console.log(`✅ Deleted file: ${fileId}`);
    return { success: true };
  } catch (error) {
    console.error(`❌ Error deleting file ${fileId}:`, error);
    throw error;
  }
}

/**
 * Query the File Search Store for relevant context
 * Used internally by copywriting service
 */
export async function queryFileSearchStore(params: {
  query: string;
  category?: FileCategory;
  maxResults?: number;
}): Promise<{ context: string; citations: any[] } | null> {
  const { query, category, maxResults = 5 } = params;
  const startTime = Date.now();
  let success = false;
  let errorType: string | undefined;
  let resultsCount = 0;

  try {
    const store = await initializeFileSearchStore();
    
    // Return null if file search is not available
    if (!store) {
      return null;
    }

    // Build metadata filter if category specified
    const metadataFilter = category ? `category="${category}"` : undefined;

    // Use Gemini's File Search tool with new SDK pattern
    // Note: File Search tools may not be fully typed in the SDK yet
    const response = await (genAI.models.generateContent as any)({
      model: 'gemini-3-pro-preview',
      contents: [{ role: 'user', parts: [{ text: query }] }],
      tools: [
        {
          fileSearch: {
            fileSearchStoreNames: [store.name],
            ...(metadataFilter && { metadataFilter }),
          },
        },
      ],
    });

    const citations = (response as any).citations || [];
    resultsCount = citations.length;
    success = true;

    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      context: text,
      citations,
    };
  } catch (error) {
    success = false;
    errorType = error instanceof Error ? error.name : 'UnknownError';
    console.error('❌ Error querying File Search Store:', error);
    throw error;
  } finally {
    // Track query metrics
    const durationMs = Date.now() - startTime;
    telemetry.trackFileSearchQuery({
      category,
      success,
      durationMs,
      resultsCount,
      errorType,
    });
  }
}

/**
 * Get File Search Store for use in copywriting generation
 * Returns the store name to pass to Gemini's tools config
 */
export async function getFileSearchStoreForGeneration() {
  const store = await initializeFileSearchStore();
  return store.name;
}

/**
 * Upload multiple reference files from a directory
 */
export async function uploadDirectoryToFileSearch(params: {
  directoryPath: string;
  category: FileCategory;
  description?: string;
}) {
  const { directoryPath, category, description } = params;

  try {
    const files = await fs.readdir(directoryPath);
    const results = [];

    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stats = await fs.stat(filePath);

      if (stats.isFile()) {
        const result = await uploadReferenceFile({
          filePath,
          category,
          description: description || `Uploaded from ${path.basename(directoryPath)}`,
          metadata: {
            source_directory: path.basename(directoryPath),
          },
        });
        results.push(result);
      }
    }

    console.log(`✅ Uploaded ${results.length} files from ${directoryPath}`);
    return results;
  } catch (error) {
    console.error(`❌ Error uploading directory ${directoryPath}:`, error);
    throw error;
  }
}

/**
 * Seed the File Search Store with initial reference materials
 * Call this once to bootstrap the system with NDS examples
 */
export async function seedFileSearchStore() {
  console.log('🌱 Seeding File Search Store with initial reference materials...');

  try {
    // Create reference materials directory if it doesn't exist
    const refDir = path.join(process.cwd(), 'reference-materials');
    await fs.mkdir(refDir, { recursive: true });

    // Create subdirectories for each category
    const categories = Object.values(FileCategory);
    for (const category of categories) {
      await fs.mkdir(path.join(refDir, category), { recursive: true });
    }

    console.log(`
✅ Created reference materials directory structure:
   ${refDir}/
   ├── brand_guidelines/
   ├── ad_examples/
   ├── product_catalog/
   ├── competitor_research/
   ├── performance_data/
   └── general/

📝 Next steps:
   1. Add your NDS ad examples to: ${refDir}/ad_examples/
   2. Add brand guidelines to: ${refDir}/brand_guidelines/
   3. Add product catalogs to: ${refDir}/product_catalog/
   4. Run: POST /api/file-search/upload-directory to index them

💡 Supported formats: PDF, DOCX, TXT, MD, CSV, XLSX, PPTX, and more
   Max file size: 100 MB per file
    `);

    return { success: true, referenceDir: refDir };
  } catch (error) {
    console.error('❌ Error seeding File Search Store:', error);
    throw error;
  }
}
