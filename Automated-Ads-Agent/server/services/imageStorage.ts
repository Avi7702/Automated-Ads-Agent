import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { eq } from 'drizzle-orm';
import { generations } from '../../shared/schema';
import type { ConversationMessage } from './geminiService';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

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
    await this.ensureUploadDir();
    const filename = this.generateFilename();
    const filepath = path.join(UPLOAD_DIR, filename);
    const buffer = Buffer.from(base64Data, 'base64');
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

    // Save generation to database
    const [dbGeneration] = await this.db!.insert(generations)
      .values({
        userId: metadata.userId,
        prompt: metadata.prompt,
        imagePath: filename,
        conversationHistory: metadata.conversationHistory,
        model: metadata.model,
        aspectRatio: metadata.aspectRatio,
        status: 'completed',
      })
      .returning();

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
    };
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
