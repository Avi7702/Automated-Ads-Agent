/**
 * Agent Tools — Image Generation
 * Tools for setting prompts, output settings, and generating images
 */

import { Type } from '@google/genai';
import type { FunctionDeclaration } from '@google/genai';
import type { IStorage } from '../../../storage';
import { logger } from '../../../lib/logger';
import type { ToolExecutor } from './types';

/** Tool declarations for Gemini function calling */
export const declarations: FunctionDeclaration[] = [
  {
    name: 'set_prompt',
    description:
      'Set the generation prompt in the Studio UI. Use this to write a creative prompt describing the ad image to generate. The prompt will appear in the Studio composer.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'The generation prompt describing the desired ad image' },
      },
      required: ['prompt'],
    },
  },
  {
    name: 'set_output_settings',
    description: 'Configure the output settings for generation: platform, aspect ratio, and resolution.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        platform: {
          type: Type.STRING,
          enum: ['instagram', 'linkedin', 'facebook', 'twitter', 'tiktok', 'custom'],
          description: 'Target social media platform',
        },
        aspectRatio: {
          type: Type.STRING,
          enum: ['1:1', '4:5', '16:9', '9:16', '4:3'],
          description: 'Image aspect ratio',
        },
        resolution: {
          type: Type.STRING,
          enum: ['1K', '2K', '4K'],
          description: 'Output resolution',
        },
      },
    },
  },
  {
    name: 'generate_post_image',
    description:
      'Generate an ad image using the current prompt and selected products. IMPORTANT: Always confirm with the user before calling this tool, as it uses API credits. Make sure products are selected and a prompt is set first.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'The generation prompt' },
        productIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Product IDs to include',
        },
        resolution: {
          type: Type.STRING,
          enum: ['1K', '2K', '4K'],
          description: 'Output resolution (default 1K)',
        },
        mode: {
          type: Type.STRING,
          enum: ['exact_insert', 'inspiration', 'standard'],
          description: 'Generation mode (default standard)',
        },
      },
      required: ['prompt', 'productIds'],
    },
  },
  {
    name: 'generate_image',
    description: 'Legacy alias for generate_post_image.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: 'The generation prompt' },
        productIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Product IDs to include',
        },
        resolution: {
          type: Type.STRING,
          enum: ['1K', '2K', '4K'],
          description: 'Output resolution (default 1K)',
        },
        mode: {
          type: Type.STRING,
          enum: ['exact_insert', 'inspiration', 'standard'],
          description: 'Generation mode (default standard)',
        },
      },
      required: ['prompt', 'productIds'],
    },
  },
];

/** Create executor map (keyed by tool name) */
export function createExecutors(storage: IStorage): Map<string, ToolExecutor> {
  const map = new Map<string, ToolExecutor>();

  map.set('set_prompt', async (args, _userId) => {
    const prompt = args['prompt'] as string;
    return {
      status: 'success',
      uiActions: [{ type: 'set_prompt', payload: { prompt } }],
      message: `Prompt set: "${prompt.slice(0, 80)}..."`,
    };
  });

  map.set('set_output_settings', async (args, _userId) => {
    const platform = args['platform'] as string | undefined;
    const aspectRatio = args['aspectRatio'] as string | undefined;
    const resolution = args['resolution'] as string | undefined;

    const actions: Array<{ type: string; payload: Record<string, string> }> = [];
    if (platform) actions.push({ type: 'set_platform', payload: { platform } });
    if (aspectRatio) actions.push({ type: 'set_aspect_ratio', payload: { aspectRatio } });
    if (resolution) actions.push({ type: 'set_resolution', payload: { resolution } });

    const parts: string[] = [];
    if (platform) parts.push(`platform=${platform}`);
    if (aspectRatio) parts.push(`aspectRatio=${aspectRatio}`);
    if (resolution) parts.push(`resolution=${resolution}`);

    return {
      status: 'success',
      uiActions: actions,
      message: `Settings updated: ${parts.join(', ')}`,
    };
  });

  const executeGeneratePostImage: ToolExecutor = async (args, userId) => {
    if (!userId) {
      return { status: 'error', message: 'Authentication required. Please refresh the page and try again.' };
    }

    const prompt = args['prompt'] as string;
    const productIds = args['productIds'] as string[];
    const resolution = ((args['resolution'] as string | undefined) ?? '1K') as '1K' | '2K' | '4K';
    const mode = ((args['mode'] as string | undefined) ?? 'standard') as 'exact_insert' | 'inspiration' | 'standard';

    // Collect product images and metadata for the generation recipe
    const images: Array<{ buffer: Buffer; mimetype: string; originalname: string }> = [];
    const recipeProducts: Array<{
      id: string;
      name: string;
      category?: string;
      description?: string;
      imageUrls: string[];
    }> = [];
    for (const id of productIds) {
      try {
        const product = await storage.getProductById(id);
        if (!product) continue;

        // Track product metadata for the generation recipe
        recipeProducts.push({
          id: String(product.id),
          name: product.name ?? id,
          ...(product.category != null && { category: product.category }),
          ...(product.description != null && { description: product.description.slice(0, 500) }),
          imageUrls: product.cloudinaryUrl ? [product.cloudinaryUrl] : [],
        });

        if (product.cloudinaryUrl) {
          // SSRF protection: only allow Cloudinary URLs
          let urlObj: URL;
          try {
            urlObj = new URL(product.cloudinaryUrl);
          } catch {
            logger.warn({ module: 'AgentTools', productId: id }, 'Invalid product image URL');
            continue;
          }
          if (!urlObj.hostname.endsWith('.cloudinary.com')) {
            logger.warn(
              { module: 'AgentTools', productId: id, hostname: urlObj.hostname },
              'Blocked non-Cloudinary image URL',
            );
            continue;
          }

          const resp = await fetch(product.cloudinaryUrl);
          if (resp.ok) {
            const buffer = Buffer.from(await resp.arrayBuffer());
            const contentType = resp.headers.get('content-type') ?? 'image/jpeg';
            images.push({
              buffer,
              mimetype: contentType,
              originalname: `${product.name}.${contentType.split('/')[1] ?? 'jpg'}`,
            });
          } else {
            logger.warn({ module: 'AgentTools', productId: id, status: resp.status }, 'Failed to fetch product image');
          }
        }
      } catch (err: unknown) {
        logger.warn({ module: 'AgentTools', productId: id, err }, 'Error fetching product image');
      }
    }

    if (images.length === 0) {
      return {
        status: 'error',
        message: 'No product images could be loaded. Ensure selected products have uploaded images.',
      };
    }

    try {
      const { executeGenerationPipeline } = await import('../../generation');
      const result = await executeGenerationPipeline({
        userId,
        prompt,
        images,
        mode,
        resolution,
        recipe: {
          version: '1.0',
          products: recipeProducts,
          relationships: [],
          scenarios: [],
        },
      });

      return {
        status: 'success',
        uiActions: [
          { type: 'generation_complete', payload: { imageUrl: result.imageUrl, generationId: result.generationId } },
        ],
        message: `Image generated successfully! Generation ID: ${result.generationId}`,
        generationId: result.generationId,
        imageUrl: result.imageUrl,
      };
    } catch (err: unknown) {
      logger.error({ module: 'AgentTools', err, userId }, 'Generation pipeline error');
      return { status: 'error', message: 'Image generation failed. Please try again.' };
    }
  };

  map.set('generate_post_image', executeGeneratePostImage);
  map.set('generate_image', executeGeneratePostImage);

  return map;
}
