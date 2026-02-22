import { promises as fs } from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { logger } from './lib/logger';

const STORAGE_BASE = path.join(process.cwd(), 'attached_assets', 'generations');
const ORIGINALS_DIR = path.join(STORAGE_BASE, 'originals');
const RESULTS_DIR = path.join(STORAGE_BASE, 'results');

// Configure Cloudinary if credentials are available
const isCloudinaryConfigured = !!(
  process.env['CLOUDINARY_CLOUD_NAME'] &&
  process.env['CLOUDINARY_API_KEY'] &&
  process.env['CLOUDINARY_API_SECRET']
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env['CLOUDINARY_CLOUD_NAME'] as string,
    api_key: process.env['CLOUDINARY_API_KEY'] as string,
    api_secret: process.env['CLOUDINARY_API_SECRET'] as string,
  });
  logger.info({ module: 'fileStorage' }, 'Cloudinary configured for persistent storage');
} else {
  logger.warn(
    { module: 'fileStorage' },
    'Cloudinary not configured - using local storage (images will be lost on deploy)',
  );
}

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
export async function saveOriginalFile(fileBuffer: Buffer, originalFilename: string): Promise<string> {
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
  return path.join('attached_assets', 'generations', 'originals', filename);
}

/**
 * Save a generated image (base64) to Cloudinary or local disk
 * @returns URL (Cloudinary) or relative path (local) to the saved file
 */
export async function saveGeneratedImage(base64Data: string, format: string = 'png'): Promise<string> {
  // Remove data URL prefix if present
  const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');

  // Use Cloudinary if configured (persistent storage)
  if (isCloudinaryConfigured) {
    try {
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload(
          `data:image/${format};base64,${base64Image}`,
          {
            folder: 'generations/results',
            resource_type: 'image',
            format: format,
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          },
        );
      });

      logger.info({ module: 'fileStorage', publicId: uploadResult.public_id }, 'Uploaded to Cloudinary');
      // Return the secure URL for the image
      return uploadResult.secure_url;
    } catch (error) {
      logger.error({ module: 'fileStorage', err: error }, 'Cloudinary upload failed, falling back to local');
      // Fall through to local storage
    }
  }

  // Fallback: Local storage (for development or if Cloudinary fails)
  await ensureDirectories();

  // Sanitize format to prevent injection
  const safeFormat = format.replace(/[^a-zA-Z0-9]/g, '');
  const filename = `${randomUUID()}.${safeFormat || 'png'}`;
  const filepath = path.join(RESULTS_DIR, filename);

  // Verify the path is safe
  if (!isPathSafe(RESULTS_DIR, filepath)) {
    throw new Error('Invalid file path');
  }

  const buffer = Buffer.from(base64Image, 'base64');
  await fs.writeFile(filepath, buffer);

  // Return relative path from project root
  return path.join('attached_assets', 'generations', 'results', filename);
}

/**
 * Delete a file from Cloudinary or local disk
 * @param pathOrUrl - Cloudinary URL or relative local path
 */
export async function deleteFile(pathOrUrl: string): Promise<void> {
  // Check if this is a Cloudinary URL
  if (pathOrUrl.startsWith('https://res.cloudinary.com/')) {
    if (!isCloudinaryConfigured) {
      logger.warn({ module: 'fileStorage' }, 'Cannot delete Cloudinary file - not configured');
      return;
    }

    try {
      // Extract public_id from Cloudinary URL
      // URL format: https://res.cloudinary.com/{cloud}/image/upload/{version}/{folder}/{public_id}.{format}
      const urlParts = pathOrUrl.split('/');
      const publicIdWithExt = urlParts.slice(-2).join('/'); // e.g., "generations/results/abc123.png"
      const publicId = publicIdWithExt.replace(/\.[^/.]+$/, ''); // Remove extension

      await new Promise<void>((resolve, reject) => {
        cloudinary.uploader.destroy(publicId, { resource_type: 'image' }, (error, _result) => {
          if (error) reject(error);
          else {
            logger.info({ module: 'fileStorage', publicId }, 'Deleted from Cloudinary');
            resolve();
          }
        });
      });
    } catch (error) {
      logger.error({ module: 'fileStorage', pathOrUrl, err: error }, 'Failed to delete from Cloudinary');
    }
    return;
  }

  // Local file deletion
  const filepath = path.join(process.cwd(), pathOrUrl);

  // Verify the path is within the storage directory
  if (!isPathSafe(STORAGE_BASE, filepath)) {
    logger.error({ module: 'fileStorage', pathOrUrl }, 'Attempted path traversal');
    throw new Error('Invalid file path');
  }

  try {
    await fs.unlink(filepath);
  } catch (error) {
    logger.error({ module: 'fileStorage', pathOrUrl, err: error }, 'Failed to delete file');
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
