/**
 * Agent Tools — Image Generation
 * Tools for setting prompts, output settings, and generating images
 */

import { FunctionTool } from '@google/adk';
import type { ToolContext } from '@google/adk';
import { z } from 'zod';
import type { IStorage } from '../../../storage';
import { logger } from '../../../lib/logger';

export function createGenerationTools(storage: IStorage) {
  const setPrompt = new FunctionTool({
    name: 'set_prompt',
    description:
      'Set the generation prompt in the Studio UI. Use this to write a creative prompt describing the ad image to generate. The prompt will appear in the Studio composer.',
    parameters: z.object({
      prompt: z.string().min(5).describe('The generation prompt describing the desired ad image'),
    }),
    execute: async (input) => {
      return {
        status: 'success',
        uiActions: [{ type: 'set_prompt', payload: { prompt: input.prompt } }],
        message: `Prompt set: "${input.prompt.slice(0, 80)}..."`,
      };
    },
  });

  const setOutputSettings = new FunctionTool({
    name: 'set_output_settings',
    description: 'Configure the output settings for generation: platform, aspect ratio, and resolution.',
    parameters: z.object({
      platform: z
        .enum(['instagram', 'linkedin', 'facebook', 'twitter', 'tiktok', 'custom'])
        .optional()
        .describe('Target social media platform'),
      aspectRatio: z.enum(['1:1', '4:5', '16:9', '9:16', '4:3']).optional().describe('Image aspect ratio'),
      resolution: z.enum(['1K', '2K', '4K']).optional().describe('Output resolution'),
    }),
    execute: async (input) => {
      const actions: Array<{ type: string; payload: Record<string, string> }> = [];
      if (input.platform) actions.push({ type: 'set_platform', payload: { platform: input.platform } });
      if (input.aspectRatio) actions.push({ type: 'set_aspect_ratio', payload: { aspectRatio: input.aspectRatio } });
      if (input.resolution) actions.push({ type: 'set_resolution', payload: { resolution: input.resolution } });

      const parts: string[] = [];
      if (input.platform) parts.push(`platform=${input.platform}`);
      if (input.aspectRatio) parts.push(`aspectRatio=${input.aspectRatio}`);
      if (input.resolution) parts.push(`resolution=${input.resolution}`);

      return {
        status: 'success',
        uiActions: actions,
        message: `Settings updated: ${parts.join(', ')}`,
      };
    },
  });

  const generatePostImageParameters = z.object({
    prompt: z.string().describe('The generation prompt'),
    productIds: z.array(z.string()).min(1).max(6).describe('Product IDs to include'),
    resolution: z.enum(['1K', '2K', '4K']).optional().describe('Output resolution (default 1K)'),
    mode: z.enum(['exact_insert', 'inspiration', 'standard']).optional().describe('Generation mode (default standard)'),
  });

  const executeGeneratePostImage = async (
    input: z.infer<typeof generatePostImageParameters>,
    tool_context?: ToolContext,
  ) => {
    const userId = tool_context?.state?.get<string>('authenticatedUserId');
    if (!userId) {
      return { status: 'error', message: 'Authentication required. Please refresh the page and try again.' };
    }

    // Collect product images and metadata for the generation recipe
    const images: Array<{ buffer: Buffer; mimetype: string; originalname: string }> = [];
    const recipeProducts: Array<{
      id: string;
      name: string;
      category?: string;
      description?: string;
      imageUrls: string[];
    }> = [];
    for (const id of input.productIds) {
      try {
        const product = await storage.getProductById(id);
        if (!product) continue;

        // Track product metadata for the generation recipe
        recipeProducts.push({
          id: String(product.id),
          name: product.name ?? id,
          category: product.category ?? undefined,
          description: product.description?.slice(0, 500) ?? undefined,
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
        prompt: input.prompt,
        images,
        mode: input.mode ?? 'standard',
        resolution: input.resolution ?? '1K',
        recipe: {
          version: '1.0',
          products: recipeProducts,
          relationships: [],
          scenarios: [],
        },
      });

      return {
        status: 'success',
        uiActions: [{ type: 'generation_complete', payload: { imageUrl: result.imageUrl, generationId: result.generationId } }],
        message: `Image generated successfully! Generation ID: ${result.generationId}`,
        generationId: result.generationId,
        imageUrl: result.imageUrl,
      };
    } catch (err: unknown) {
      logger.error({ module: 'AgentTools', err, userId }, 'Generation pipeline error');
      return { status: 'error', message: 'Image generation failed. Please try again.' };
    }
  };

  const generatePostImage = new FunctionTool({
    name: 'generate_post_image',
    description:
      'Generate an ad image using the current prompt and selected products. IMPORTANT: Always confirm with the user before calling this tool, as it uses API credits. Make sure products are selected and a prompt is set first.',
    parameters: generatePostImageParameters,
    execute: executeGeneratePostImage,
  });

  const generateImage = new FunctionTool({
    name: 'generate_image',
    description: 'Legacy alias for generate_post_image.',
    parameters: generatePostImageParameters,
    execute: executeGeneratePostImage,
  });

  return [setPrompt, setOutputSettings, generatePostImage, generateImage];
}
