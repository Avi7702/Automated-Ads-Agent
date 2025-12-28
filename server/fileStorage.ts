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
 * Validate that a path doesn't escape the allowed directory (path traversal protection)
 */
function isPathSafe(basePath: string, targetPath: string): boolean {
  const resolvedBase = path.resolve(basePath);
  const resolvedTarget = path.resolve(targetPath);
  return resolvedTarget.startsWith(resolvedBase + path.sep) || resolvedTarget === resolvedBase;
}

/**
 * Sanitize a filename to prevent path traversal
 */
function sanitizeFilename(filename: string): string {
  // Remove any directory components and only keep the base filename
  const basename = path.basename(filename);
  // Remove any potentially dangerous characters
  return basename.replace(/[^a-zA-Z0-9._-]/g, '_');
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

  // Sanitize the extension from the original filename
  const sanitized = sanitizeFilename(originalFilename);
  const ext = path.extname(sanitized) || '.bin';
  const filename = `${randomUUID()}${ext}`;
  const filepath = path.join(ORIGINALS_DIR, filename);

  // Verify the path is safe
  if (!isPathSafe(ORIGINALS_DIR, filepath)) {
    throw new Error('Invalid file path');
  }

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

  // Sanitize format to prevent injection
  const safeFormat = format.replace(/[^a-zA-Z0-9]/g, '');
  const filename = `${randomUUID()}.${safeFormat || 'png'}`;
  const filepath = path.join(RESULTS_DIR, filename);

  // Verify the path is safe
  if (!isPathSafe(RESULTS_DIR, filepath)) {
    throw new Error('Invalid file path');
  }

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

  // Verify the path is within the storage directory
  if (!isPathSafe(STORAGE_BASE, filepath)) {
    console.error(`[fileStorage] Attempted path traversal: ${relativePath}`);
    throw new Error('Invalid file path');
  }

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

  // Verify the path is within the storage directory
  if (!isPathSafe(STORAGE_BASE, filepath)) {
    throw new Error('Invalid file path');
  }

  return await fs.readFile(filepath);
}
