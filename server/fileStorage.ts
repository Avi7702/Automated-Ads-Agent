import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const STORAGE_BASE = path.join(process.cwd(), "attached_assets", "generations");
const ORIGINALS_DIR = path.join(STORAGE_BASE, "originals");
const RESULTS_DIR = path.join(STORAGE_BASE, "results");

async function ensureDirectories() {
  await fs.mkdir(ORIGINALS_DIR, { recursive: true });
  await fs.mkdir(RESULTS_DIR, { recursive: true });
}

/**
 * Save an uploaded file to disk
 * @returns Relative path to the saved file
 */
export async function saveOriginalFile(
  fileBuffer: Buffer,
  originalFilename: string
): Promise<string> {
  await ensureDirectories();
  
  const ext = path.extname(originalFilename);
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(ORIGINALS_DIR, filename);
  
  await fs.writeFile(filepath, fileBuffer);
  
  // Return relative path from project root
  return path.join("attached_assets", "generations", "originals", filename);
}

/**
 * Save a generated image (base64) to disk
 * @returns Relative path to the saved file
 */
export async function saveGeneratedImage(
  base64Data: string,
  format: string = "png"
): Promise<string> {
  await ensureDirectories();
  
  const filename = `${randomUUID()}.${format}`;
  const filepath = path.join(RESULTS_DIR, filename);
  
  // Remove data URL prefix if present
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, "");
  const buffer = Buffer.from(base64Image, "base64");
  
  await fs.writeFile(filepath, buffer);
  
  // Return relative path from project root
  return path.join("attached_assets", "generations", "results", filename);
}

/**
 * Delete a file from disk
 */
export async function deleteFile(relativePath: string): Promise<void> {
  const filepath = path.join(process.cwd(), relativePath);
  try {
    await fs.unlink(filepath);
  } catch (error) {
    console.error(`Failed to delete file ${relativePath}:`, error);
  }
}

/**
 * Read a file and return as buffer
 */
export async function readFile(relativePath: string): Promise<Buffer> {
  const filepath = path.join(process.cwd(), relativePath);
  return await fs.readFile(filepath);
}
