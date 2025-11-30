import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { ConversationMessage } from './geminiService';

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

// In-memory storage for testing
const inMemoryGenerations = new Map<string, SavedGeneration>();

function generateUUID(): string {
  return crypto.randomBytes(16).toString('hex');
}

class ImageStorageService {
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
    const filename = await this.saveImage(metadata.imageBase64);
    const id = generateUUID();
    
    const generation: SavedGeneration = {
      id,
      userId: metadata.userId,
      prompt: metadata.prompt,
      imagePath: filename,
      imageUrl: this.getImageUrl(filename),
      conversationHistory: metadata.conversationHistory,
      model: metadata.model,
      aspectRatio: metadata.aspectRatio,
      createdAt: new Date(),
    };

    inMemoryGenerations.set(id, generation);

    return generation;
  }

  async getGeneration(id: string): Promise<SavedGeneration | null> {
    const generation = inMemoryGenerations.get(id);
    return generation || null;
  }

  clearAll(): void {
    inMemoryGenerations.clear();
  }
}

export const imageStorageService = new ImageStorageService();
