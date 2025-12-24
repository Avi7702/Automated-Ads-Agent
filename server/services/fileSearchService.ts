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

import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY environment variable is required');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// File Search Store configuration
const FILE_SEARCH_STORE_NAME = 'nds-copywriting-rag';

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
 */
export async function initializeFileSearchStore() {
  try {
    // Check if store already exists
    const stores = await (genAI as any).fileSearchStores.list();
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
    throw error;
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

  try {
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

    // Add user-provided metadata
    for (const [key, value] of Object.entries(metadata)) {
      if (typeof value === 'string') {
        customMetadata.push({ key, stringValue: value });
      } else if (typeof value === 'number') {
        customMetadata.push({ key, numericValue: value });
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

    return {
      fileName,
      fileId: result.name,
      category,
      uploadedAt: new Date(),
      metadata,
    };
  } catch (error) {
    console.error(`❌ Error uploading file ${filePath}:`, error);
    throw error;
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
}) {
  const { query, category, maxResults = 5 } = params;

  try {
    const store = await initializeFileSearchStore();

    // Build metadata filter if category specified
    const metadataFilter = category ? `category="${category}"` : undefined;

    // Use Gemini's File Search tool
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent({
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

    const response = await result.response;
    return {
      context: response.text(),
      citations: (response as any).citations || [],
    };
  } catch (error) {
    console.error('❌ Error querying File Search Store:', error);
    throw error;
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
