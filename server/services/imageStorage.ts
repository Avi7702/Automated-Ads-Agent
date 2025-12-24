import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq, desc } from 'drizzle-orm';
import { generations } from '../../shared/schema';
import type { ConversationMessage } from './geminiService';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_IMAGE_SIZE_MB = parseInt(process.env.MAX_IMAGE_SIZE_MB || '10', 10);
const MAX_IMAGE_SIZE = MAX_IMAGE_SIZE_MB * 1024 * 1024;

export interface GenerationMetadata {
  userId: string;
  prompt: string;
  imageBase64: string;
  conversationHistory: ConversationMessage[];
  model: string;
  aspectRatio: string;
}

export interface SavedGeneration {
  id: string;
  userId: string;
  prompt: string;
  imagePath: string;
  imageUrl: string;
  conversationHistory: ConversationMessage[];
  model: string;
  aspectRatio: string;
  createdAt: Date;
  // Edit tracking fields (Phase 3)
  parentGenerationId?: string | null;
  editPrompt?: string | null;
  editCount?: number;
}

export interface EditChainItem {
  id: string;
  editPrompt: string | null;
  imageUrl: string;
  createdAt: Date;
}

class ImageStorageService {
  private pool: Pool | null = null;
  private db: ReturnType<typeof drizzle> | null = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const databaseUrl = process.env.DATABASE_URL;

    if (!databaseUrl) {
      throw new Error('DATABASE_URL environment variable is required for ImageStorageService');
    }

    this.pool = new Pool({ connectionString: databaseUrl });
    this.db = drizzle(this.pool);
    this.isInitialized = true;
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
      this.db = null;
    }
    this.isInitialized = false;
  }

  private ensureInitialized(): void {
    if (!this.isInitialized || !this.db) {
      throw new Error('ImageStorageService not initialized. Call initialize() first.');
    }
  }

  async ensureUploadDir(): Promise<void> {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  }

  generateFilename(extension: string = 'png'): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `generation_${timestamp}_${random}.${extension}`;
  }

  async saveImage(base64Data: string): Promise<string> {
    // Validate base64 data
    if (!base64Data || base64Data.length < 100) {
      throw new Error('Invalid image data: too short');
    }

    // Validate it's actually base64
    const base64Regex = /^[A-Za-z0-9+/=]+$/;
    if (!base64Regex.test(base64Data)) {
      throw new Error('Invalid image data: not valid base64');
    }

    await this.ensureUploadDir();
    const buffer = Buffer.from(base64Data, 'base64');

    // Validate decoded buffer is not empty
    if (buffer.length === 0) {
      throw new Error('Invalid image data: empty after decode');
    }

    // Validate file size
    if (buffer.length > MAX_IMAGE_SIZE) {
      throw new Error(`Image too large: maximum ${MAX_IMAGE_SIZE_MB}MB allowed`);
    }

    // Validate PNG or JPEG magic bytes
    const isPNG = buffer.length >= 4 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4E &&
      buffer[3] === 0x47;

    const isJPEG = buffer.length >= 2 &&
      buffer[0] === 0xFF &&
      buffer[1] === 0xD8;

    if (!isPNG && !isJPEG) {
      throw new Error('Invalid image format: only PNG and JPEG supported');
    }

    // Set correct extension based on detected type
    const extension = isPNG ? 'png' : 'jpg';
    const filename = this.generateFilename(extension);
    const filepath = path.join(UPLOAD_DIR, filename);

    await fs.writeFile(filepath, buffer);
    return filename;
  }

  getImagePath(filename: string): string {
    return path.join(UPLOAD_DIR, filename);
  }

  getImageUrl(filename: string): string {
    return `/uploads/${filename}`;
  }

  async deleteImage(filename: string): Promise<void> {
    try {
      const filepath = this.getImagePath(filename);
      await fs.unlink(filepath);
    } catch (error) {
      // File may not exist, that's okay
    }
  }

  async saveGeneration(metadata: GenerationMetadata): Promise<SavedGeneration> {
    this.ensureInitialized();

    // Save image to filesystem
    const filename = await this.saveImage(metadata.imageBase64);

    // Save generation to database - with cleanup on failure
    let dbGeneration;
    try {
      [dbGeneration] = await this.db!.insert(generations)
        .values({
          userId: metadata.userId,
          prompt: metadata.prompt,
          imagePath: filename,
          originalImagePaths: [], // No original images for new generations
          generatedImagePath: filename,
          conversationHistory: metadata.conversationHistory,
          model: metadata.model,
          aspectRatio: metadata.aspectRatio,
          status: 'completed',
        })
        .returning();
    } catch (error) {
      // Clean up orphaned file if DB insert fails
      await this.deleteImage(filename);
      throw error;
    }

    return {
      id: dbGeneration.id,
      userId: metadata.userId,
      prompt: metadata.prompt,
      imagePath: filename,
      imageUrl: this.getImageUrl(filename),
      conversationHistory: metadata.conversationHistory as ConversationMessage[],
      model: metadata.model,
      aspectRatio: metadata.aspectRatio,
      createdAt: dbGeneration.createdAt,
    };
  }

  async getGeneration(id: string): Promise<SavedGeneration | null> {
    this.ensureInitialized();

    const [dbGeneration] = await this.db!.select()
      .from(generations)
      .where(eq(generations.id, id));

    if (!dbGeneration) {
      return null;
    }

    return {
      id: dbGeneration.id,
      userId: dbGeneration.userId || '',
      prompt: dbGeneration.prompt,
      imagePath: dbGeneration.imagePath || '',
      imageUrl: this.getImageUrl(dbGeneration.imagePath || ''),
      conversationHistory: (dbGeneration.conversationHistory as ConversationMessage[]) || [],
      model: dbGeneration.model || '',
      aspectRatio: dbGeneration.aspectRatio || '1:1',
      createdAt: dbGeneration.createdAt,
      // Edit tracking fields (Phase 3)
      parentGenerationId: dbGeneration.parentGenerationId || null,
      editPrompt: dbGeneration.editPrompt || null,
      editCount: dbGeneration.editCount || 0,
    };
  }

  async deleteGeneration(id: string): Promise<void> {
    this.ensureInitialized();

    // Get generation to find image file
    const generation = await this.getGeneration(id);
    if (!generation) {
      throw new Error('Generation not found');
    }

    // Delete file first (if fails, DB record still exists for retry)
    if (generation.imagePath) {
      await this.deleteImage(generation.imagePath);
    }

    // Delete database record
    await this.db!.delete(generations).where(eq(generations.id, id));
  }

  async updateGeneration(
    id: string,
    imageBase64: string,
    conversationHistory: ConversationMessage[]
  ): Promise<SavedGeneration> {
    this.ensureInitialized();

    // Get existing generation
    const existing = await this.getGeneration(id);
    if (!existing) {
      throw new Error('Generation not found');
    }

    // Delete old image file
    if (existing.imagePath) {
      await this.deleteImage(existing.imagePath);
    }

    // Save new image
    const newFilename = await this.saveImage(imageBase64);

    // Update database record - with cleanup on failure
    let updated;
    try {
      [updated] = await this.db!.update(generations)
        .set({
          imagePath: newFilename,
          conversationHistory: conversationHistory,
          updatedAt: new Date()
        })
        .where(eq(generations.id, id))
        .returning();
    } catch (error) {
      // Clean up new file if DB update fails
      await this.deleteImage(newFilename);
      throw error;
    }

    return {
      id: updated.id,
      userId: updated.userId || '',
      prompt: updated.prompt,
      imagePath: newFilename,
      imageUrl: this.getImageUrl(newFilename),
      conversationHistory: conversationHistory,
      model: updated.model || '',
      aspectRatio: updated.aspectRatio || '1:1',
      createdAt: updated.createdAt,
    };
  }

  async getUserGenerations(userId: string, limit: number = 50): Promise<SavedGeneration[]> {
    this.ensureInitialized();

    const results = await this.db!.select()
      .from(generations)
      .where(eq(generations.userId, userId))
      .orderBy(desc(generations.createdAt))
      .limit(limit);

    return results.map(gen => ({
      id: gen.id,
      userId: gen.userId || '',
      prompt: gen.prompt,
      imagePath: gen.imagePath || '',
      imageUrl: this.getImageUrl(gen.imagePath || ''),
      conversationHistory: (gen.conversationHistory as ConversationMessage[]) || [],
      model: gen.model || '',
      aspectRatio: gen.aspectRatio || '1:1',
      createdAt: gen.createdAt,
    }));
  }

  async saveEdit(
    parentId: string,
    editPrompt: string,
    metadata: GenerationMetadata
  ): Promise<SavedGeneration> {
    this.ensureInitialized();

    // Get parent to determine edit count
    const parent = await this.getGeneration(parentId);
    if (!parent) {
      throw new Error('Parent generation not found');
    }

    // Save image to filesystem
    const filename = await this.saveImage(metadata.imageBase64);

    // Save new generation linked to parent - with cleanup on failure
    let dbGeneration;
    try {
      [dbGeneration] = await this.db!.insert(generations)
        .values({
          userId: metadata.userId,
          prompt: metadata.prompt,
          imagePath: filename,
          originalImagePaths: parent.imagePath ? [parent.imagePath] : [],
          generatedImagePath: filename,
          conversationHistory: metadata.conversationHistory,
          model: metadata.model,
          aspectRatio: metadata.aspectRatio,
          status: 'completed',
          parentGenerationId: parentId,
          editPrompt: editPrompt,
          editCount: (parent.editCount || 0) + 1,
        })
        .returning();
    } catch (error) {
      // Clean up orphaned file if DB insert fails
      await this.deleteImage(filename);
      throw error;
    }

    return {
      id: dbGeneration.id,
      userId: metadata.userId,
      prompt: metadata.prompt,
      imagePath: filename,
      imageUrl: this.getImageUrl(filename),
      conversationHistory: metadata.conversationHistory as ConversationMessage[],
      model: metadata.model,
      aspectRatio: metadata.aspectRatio,
      createdAt: dbGeneration.createdAt,
      parentGenerationId: parentId,
      editPrompt: editPrompt,
      editCount: (parent.editCount || 0) + 1,
    };
  }

  async getEditChain(generationId: string): Promise<EditChainItem[]> {
    this.ensureInitialized();

    const chain: EditChainItem[] = [];
    let currentId: string | null = generationId;

    // Walk up the parent chain
    while (currentId) {
      const gen = await this.getGeneration(currentId);
      if (!gen) break;

      chain.unshift({
        id: gen.id,
        editPrompt: gen.editPrompt || null,
        imageUrl: gen.imageUrl,
        createdAt: gen.createdAt,
      });

      currentId = gen.parentGenerationId || null;
    }

    return chain;
  }

  async clearAll(): Promise<void> {
    this.ensureInitialized();

    // Delete all generations from database
    await this.db!.delete(generations);

    // Clean up uploads directory
    try {
      const files = await fs.readdir(UPLOAD_DIR);
      for (const file of files) {
        if (file.startsWith('generation_')) {
          await fs.unlink(path.join(UPLOAD_DIR, file));
        }
      }
    } catch (error) {
      // Directory may not exist
    }
  }

  fileExists(filename: string): boolean {
    const filepath = this.getImagePath(filename);
    return fsSync.existsSync(filepath);
  }
}

export const imageStorageService = new ImageStorageService();
