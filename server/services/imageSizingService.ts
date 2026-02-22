/**
 * Image Sizing Service
 *
 * Handles image resizing and formatting for different social media platforms.
 * Integrates with Cloudinary for on-the-fly image transformations.
 *
 * Usage:
 *   import { generatePlatformImages, resizeImageForPlatform } from './services/imageSizingService';
 *   const images = await generatePlatformImages(cloudinaryUrl, ['instagram', 'linkedin']);
 */

import { logger } from '../lib/logger';
import { getPlatformSpecs, getRecommendedAspectRatio, type PlatformSpecs } from './platformSpecsService';

/**
 * Image sizing options
 */
export interface ImageSizingOptions {
  platform: string;
  contentType?: 'feed' | 'story' | 'reel' | 'short';
  aspectRatio?: string; // '1:1', '4:5', '16:9', '9:16', etc.
  format?: 'jpg' | 'png' | 'webp';
  quality?: 'auto' | 'auto:best' | 'auto:good' | 'auto:low' | number;
  crop?: 'fill' | 'scale' | 'fit' | 'pad' | 'thumb';
}

/**
 * Sized image with Cloudinary URL and metadata
 */
export interface SizedImage {
  url: string; // Full Cloudinary URL with transformations
  width: number;
  height: number;
  format: string;
  estimatedSizeKB: number;
  cloudinaryTransform: string; // Transformation string (e.g., 'w_1080,h_1080,c_fill,f_jpg,q_auto')
  aspectRatio: string;
  platform: string;
  contentType?: string;
}

/**
 * Cloudinary configuration from environment
 */
interface CloudinaryConfig {
  cloudName: string;
  baseUrl: string;
}

/**
 * Get Cloudinary configuration
 */
function getCloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env['CLOUDINARY_CLOUD_NAME'];

  if (!cloudName) {
    throw new Error('CLOUDINARY_CLOUD_NAME not configured');
  }

  return {
    cloudName,
    baseUrl: `https://res.cloudinary.com/${cloudName}/image/upload`,
  };
}

/**
 * Extract public ID from Cloudinary URL
 *
 * @param cloudinaryUrl - Full Cloudinary URL
 * @returns Public ID (path to image)
 */
export function extractPublicId(cloudinaryUrl: string): string {
  // Handle full Cloudinary URLs
  // Format: https://res.cloudinary.com/{cloud}/image/upload/v{version}/{publicId}
  const uploadMatch = cloudinaryUrl.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.\w+)?$/);
  if (uploadMatch?.[1]) {
    return uploadMatch[1];
  }

  // Handle URLs with transformations
  // Format: https://res.cloudinary.com/{cloud}/image/upload/{transformations}/{publicId}
  const transformMatch = cloudinaryUrl.match(/\/upload\/[^\/]+\/(.+?)(?:\.\w+)?$/);
  if (transformMatch?.[1]) {
    return transformMatch[1];
  }

  // If no match, assume it's already a public ID
  return cloudinaryUrl.replace(/\.\w+$/, ''); // Remove extension if present
}

/**
 * Build Cloudinary transformation URL
 *
 * @param publicId - Cloudinary public ID
 * @param transformations - Transformation string
 * @returns Full Cloudinary URL
 */
export function buildCloudinaryUrl(publicId: string, transformations: string): string {
  const config = getCloudinaryConfig();
  return `${config.baseUrl}/${transformations}/${publicId}`;
}

/**
 * Generate aspect ratio dimensions
 *
 * @param aspectRatio - Aspect ratio string (e.g., '16:9')
 * @param targetWidth - Desired width (optional)
 * @returns Width and height
 */
function calculateDimensions(aspectRatio: string, targetWidth?: number): { width: number; height: number } {
  const parts = aspectRatio.split(':').map(Number);
  const widthRatio = parts[0] ?? 1;
  const heightRatio = parts[1] ?? 1;

  if (targetWidth) {
    return {
      width: targetWidth,
      height: Math.round((targetWidth * heightRatio) / widthRatio),
    };
  }

  // Default to standard widths
  const standardWidths: Record<string, number> = {
    '1:1': 1080,
    '4:5': 1080,
    '3:4': 1080,
    '9:16': 1080,
    '16:9': 1920,
    '1.91:1': 1200,
    '2:3': 1000,
    '1:2.1': 1000,
  };

  const width = standardWidths[aspectRatio] || 1080;
  const height = Math.round((width * heightRatio) / widthRatio);

  return { width, height };
}

/**
 * Estimate compressed file size
 *
 * Very rough estimation: uncompressed size * compression ratio
 * Actual size varies based on image complexity
 */
function estimateFileSize(width: number, height: number, format: string, quality: string | number): number {
  const pixels = width * height;
  const bytesPerPixel = format === 'png' ? 3 : 1.5; // PNG larger than JPEG/WebP

  let compressionRatio = 0.1; // Default ~10% of uncompressed

  if (typeof quality === 'number') {
    compressionRatio = quality / 100;
  } else if (quality.includes('auto:best')) {
    compressionRatio = 0.15;
  } else if (quality.includes('auto:good')) {
    compressionRatio = 0.1;
  } else if (quality.includes('auto:low')) {
    compressionRatio = 0.05;
  }

  const estimatedBytes = pixels * bytesPerPixel * compressionRatio;
  return Math.round(estimatedBytes / 1024); // Convert to KB
}

/**
 * Resize image for a specific platform
 *
 * @param sourceImageUrl - Cloudinary URL or public ID
 * @param options - Sizing options
 * @returns Sized image with transformation URL
 */
export async function resizeImageForPlatform(sourceImageUrl: string, options: ImageSizingOptions): Promise<SizedImage> {
  const startTime = Date.now();

  try {
    // Get platform specs
    const specs = getPlatformSpecs(options.platform);
    if (!specs) {
      throw new Error(`Platform '${options.platform}' not supported`);
    }

    // Determine aspect ratio
    let aspectRatio: string;
    let width: number;
    let height: number;

    if (options.aspectRatio) {
      // Use specified aspect ratio
      aspectRatio = options.aspectRatio;
      const dims = calculateDimensions(aspectRatio);
      width = dims.width;
      height = dims.height;
    } else {
      // Use recommended aspect ratio for platform
      const recommended = getRecommendedAspectRatio(options.platform);
      if (!recommended) {
        throw new Error(`No aspect ratio found for platform '${options.platform}'`);
      }
      aspectRatio = recommended.ratio;
      width = recommended.width;
      height = recommended.height;
    }

    // Determine format
    const format = options.format || determineOptimalFormat(options.platform, specs);

    // Determine quality
    const quality = options.quality || 'auto:best';

    // Determine crop mode
    const crop = options.crop || 'fill'; // fill = crop to exact dimensions

    // Build Cloudinary transformation string
    const transformations = [
      `w_${width}`,
      `h_${height}`,
      `c_${crop}`,
      `f_${format}`,
      `q_${quality}`,
      'dpr_auto', // Automatic device pixel ratio
    ].join(',');

    // Extract public ID and build URL
    const publicId = extractPublicId(sourceImageUrl);
    const url = buildCloudinaryUrl(publicId, transformations);

    // Estimate file size
    const estimatedSizeKB = estimateFileSize(width, height, format, quality);

    const result: SizedImage = {
      url,
      width,
      height,
      format,
      estimatedSizeKB,
      cloudinaryTransform: transformations,
      aspectRatio,
      platform: options.platform,
      ...(options.contentType !== undefined && { contentType: options.contentType }),
    };

    logger.debug(
      {
        platform: options.platform,
        aspectRatio,
        dimensions: `${width}x${height}`,
        format,
        estimatedSizeKB,
        duration: Date.now() - startTime,
      },
      'Image resized for platform',
    );

    return result;
  } catch (error) {
    logger.error({ error, platform: options.platform, sourceImageUrl }, 'Image resizing failed');
    throw error;
  }
}

/**
 * Determine optimal image format for platform
 */
function determineOptimalFormat(platform: string, specs: PlatformSpecs): 'jpg' | 'png' | 'webp' {
  // Instagram requires JPEG (PNG not supported for feed)
  if (platform === 'instagram' || platform === 'instagram-reel') {
    return 'jpg';
  }

  // Use WebP for modern platforms (better compression)
  if (specs.image.formats.includes('webp')) {
    return 'webp';
  }

  // Default to JPEG (smaller file size)
  return 'jpg';
}

/**
 * Generate images for multiple platforms
 *
 * Creates optimally-sized images for each specified platform.
 *
 * @param sourceImageUrl - Cloudinary URL or public ID
 * @param platforms - Array of platform identifiers
 * @param options - Optional global sizing options
 * @returns Map of platform to sized image
 */
export async function generatePlatformImages(
  sourceImageUrl: string,
  platforms: string[],
  options?: Partial<ImageSizingOptions>,
): Promise<Record<string, SizedImage>> {
  const startTime = Date.now();
  const results: Record<string, SizedImage> = {};

  try {
    // Generate images for all platforms in parallel
    const imagePromises = platforms.map(async (platform) => {
      const platformOptions: ImageSizingOptions = {
        ...options,
        platform,
      };

      const sized = await resizeImageForPlatform(sourceImageUrl, platformOptions);
      return { platform, sized };
    });

    const sizedResults = await Promise.all(imagePromises);

    // Build result object
    sizedResults.forEach(({ platform, sized }) => {
      results[platform] = sized;
    });

    logger.info(
      {
        platforms,
        totalImages: Object.keys(results).length,
        duration: Date.now() - startTime,
      },
      'Batch image generation completed',
    );

    return results;
  } catch (error) {
    logger.error({ error, platforms, sourceImageUrl }, 'Batch image generation failed');
    throw error;
  }
}

/**
 * Generate all aspect ratio variations for a single platform
 *
 * Useful for carousel posts or A/B testing different formats.
 *
 * @param sourceImageUrl - Cloudinary URL or public ID
 * @param platform - Platform identifier
 * @returns Array of sized images (one per aspect ratio)
 */
export async function generateAllAspectRatios(sourceImageUrl: string, platform: string): Promise<SizedImage[]> {
  const specs = getPlatformSpecs(platform);
  if (!specs) {
    throw new Error(`Platform '${platform}' not supported`);
  }

  const aspectRatios = specs.image.aspectRatios;
  const results: SizedImage[] = [];

  for (const ar of aspectRatios) {
    const sized = await resizeImageForPlatform(sourceImageUrl, {
      platform,
      aspectRatio: ar.ratio,
    });

    results.push({
      ...sized,
      aspectRatio: `${ar.ratio} (${ar.name})`,
    });
  }

  logger.info(
    {
      platform,
      aspectRatiosGenerated: results.length,
    },
    'Generated all aspect ratio variations',
  );

  return results;
}

/**
 * Validate image against platform requirements
 *
 * @param width - Image width
 * @param height - Image height
 * @param fileSizeMB - File size in megabytes
 * @param format - Image format
 * @param platform - Platform identifier
 * @returns Validation result
 */
export function validateImageForPlatform(
  width: number,
  height: number,
  fileSizeMB: number,
  format: string,
  platform: string,
): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  const specs = getPlatformSpecs(platform);
  if (!specs) {
    errors.push(`Platform '${platform}' not supported`);
    return { isValid: false, errors, warnings };
  }

  // Validate format
  if (!specs.image.formats.includes(format.toLowerCase())) {
    errors.push(`Format '${format}' not supported. Supported formats: ${specs.image.formats.join(', ')}`);
  }

  // Validate dimensions
  if (width < specs.image.minWidth) {
    errors.push(`Width ${width}px is below minimum ${specs.image.minWidth}px`);
  }

  if (height < specs.image.minHeight) {
    errors.push(`Height ${height}px is below minimum ${specs.image.minHeight}px`);
  }

  // Validate file size
  if (fileSizeMB > specs.image.maxSizeMB) {
    errors.push(`File size ${fileSizeMB}MB exceeds maximum ${specs.image.maxSizeMB}MB`);
  }

  // Check aspect ratio
  const aspectRatio = (width / height).toFixed(2);
  const matchesAspectRatio = specs.image.aspectRatios.some((ar) => {
    const parts = ar.ratio.split(':').map(Number);
    const w = parts[0] ?? 1;
    const h = parts[1] ?? 1;
    const expectedRatio = (w / h).toFixed(2);
    return aspectRatio === expectedRatio;
  });

  if (!matchesAspectRatio) {
    warnings.push(
      `Aspect ratio ${aspectRatio} doesn't match recommended ratios: ${specs.image.aspectRatios.map((ar) => ar.ratio).join(', ')}`,
    );
  }

  const isValid = errors.length === 0;
  return { isValid, errors, warnings };
}

/**
 * Get transformation string for specific use case
 *
 * @param useCase - Transformation use case
 * @returns Cloudinary transformation string
 */
export function getTransformationPreset(useCase: 'thumbnail' | 'preview' | 'full' | 'optimized'): string {
  switch (useCase) {
    case 'thumbnail':
      return 'w_150,h_150,c_thumb,f_jpg,q_auto:low';

    case 'preview':
      return 'w_400,h_400,c_limit,f_jpg,q_auto:good';

    case 'full':
      return 'w_2048,h_2048,c_limit,f_jpg,q_auto:best';

    case 'optimized':
      return 'w_1080,h_1080,c_limit,f_auto,q_auto,dpr_auto';

    default:
      return 'q_auto,f_auto';
  }
}

/**
 * Create responsive image srcset for web display
 *
 * @param publicId - Cloudinary public ID
 * @param widths - Array of widths for responsive images
 * @returns srcset string for <img> tag
 */
export function createResponsiveSrcSet(publicId: string, widths: number[] = [320, 640, 1024, 1920]): string {
  const config = getCloudinaryConfig();
  const srcset = widths.map((width) => {
    const transform = `w_${width},c_scale,f_auto,q_auto`;
    const url = `${config.baseUrl}/${transform}/${publicId}`;
    return `${url} ${width}w`;
  });

  return srcset.join(', ');
}
