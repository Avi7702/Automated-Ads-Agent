/**
 * Content Planner Service - 2026 AI-First Implementation
 *
 * Generates complete posts (copy + image) with:
 * 1. Brand context integration
 * 2. Parallel generation with Promise.allSettled
 * 3. Partial success handling
 * 4. Unique content on every generation (temperature > 0)
 */

import { logger } from '../lib/logger';
import { storage } from '../storage';
import { copywritingService } from './copywritingService';
import { getTemplateById, type ContentTemplate } from '@shared/contentTemplates';
import type { Product, BrandProfile } from '@shared/schema';
import type { GenerateCopyInput } from '../validation/schemas';

// Try to import genaiImage for direct image generation
try {
  require('../lib/gemini');
} catch {
  logger.warn({ module: 'ContentPlannerService' }, 'Image generation not available - gemini client not loaded');
}

// Types
export interface GenerateCompletePostRequest {
  userId: string;
  templateId: string;
  productIds: string[];
  topic?: string;
  platform: 'instagram' | 'linkedin' | 'facebook' | 'twitter' | 'tiktok';
}

export interface CopyResult {
  headline: string;
  hook: string;
  bodyText: string;
  cta: string;
  caption: string;
  hashtags: string[];
  framework: string;
}

export interface ImageResult {
  imageUrl: string;
  prompt: string;
}

export interface GenerateCompletePostResponse {
  success: boolean;
  copy?: CopyResult;
  image?: ImageResult;
  copyError?: string;
  imageError?: string;
  template: {
    id: string;
    title: string;
    category: string;
  };
}

/**
 * Generate a complete post with copy and image in parallel
 */
export async function generateCompletePost(
  request: GenerateCompletePostRequest,
): Promise<GenerateCompletePostResponse> {
  const startTime = Date.now();
  const { userId, templateId, productIds, topic, platform } = request;

  logger.info(
    {
      module: 'ContentPlannerService',
      userId,
      templateId,
      productCount: productIds.length,
      platform,
    },
    'Starting complete post generation',
  );

  // 1. Fetch template
  const template = getTemplateById(templateId);
  if (!template) {
    return {
      success: false,
      copyError: `Template not found: ${templateId}`,
      imageError: `Template not found: ${templateId}`,
      template: { id: templateId, title: 'Unknown', category: 'unknown' },
    };
  }

  // 2. Validate product requirements
  if (template.productRequirement === 'required' && productIds.length === 0) {
    return {
      success: false,
      copyError: `Template "${template.title}" requires at least one product`,
      imageError: `Template "${template.title}" requires at least one product`,
      template: { id: template.id, title: template.title, category: template.category },
    };
  }

  if (template.minProducts && productIds.length < template.minProducts) {
    return {
      success: false,
      copyError: `Template "${template.title}" requires at least ${template.minProducts} products`,
      imageError: `Template "${template.title}" requires at least ${template.minProducts} products`,
      template: { id: template.id, title: template.title, category: template.category },
    };
  }

  // 3. Fetch brand profile and products
  const [brandProfile, products] = await Promise.all([
    storage.getBrandProfileByUserId(userId),
    productIds.length > 0 ? fetchProducts(userId, productIds) : Promise.resolve([]),
  ]);

  // 4. Generate copy and image in parallel
  const [copyResult, imageResult] = await Promise.allSettled([
    generateCopy(template, products, brandProfile ?? null, topic, platform),
    template.imageRequirement !== 'none'
      ? generateImage(template, products, brandProfile ?? null, topic, platform)
      : Promise.resolve(null),
  ]);

  // 5. Process results with partial success handling
  const response: GenerateCompletePostResponse = {
    success: false,
    template: { id: template.id, title: template.title, category: template.category },
  };

  // Handle copy result
  if (copyResult.status === 'fulfilled' && copyResult.value) {
    response.copy = copyResult.value;
    response.success = true;
  } else if (copyResult.status === 'rejected') {
    response.copyError = copyResult.reason?.message || 'Copy generation failed';
    logger.error(
      {
        module: 'ContentPlannerService',
        error: copyResult.reason,
      },
      'Copy generation failed',
    );
  }

  // Handle image result
  if (imageResult.status === 'fulfilled' && imageResult.value) {
    response.image = imageResult.value;
    response.success = true;
  } else if (imageResult.status === 'rejected') {
    response.imageError = imageResult.reason?.message || 'Image generation failed';
    logger.error(
      {
        module: 'ContentPlannerService',
        error: imageResult.reason,
      },
      'Image generation failed',
    );
  } else if (template.imageRequirement === 'none') {
    // Not an error - template doesn't need images
    response.success = response.copy !== undefined;
  }

  const duration = Date.now() - startTime;
  logger.info(
    {
      module: 'ContentPlannerService',
      duration,
      hasCopy: !!response.copy,
      hasImage: !!response.image,
      success: response.success,
    },
    'Complete post generation finished',
  );

  return response;
}

/**
 * Fetch products by IDs
 */
async function fetchProducts(_userId: string, productIds: string[]): Promise<Product[]> {
  const products: Product[] = [];

  for (const productId of productIds) {
    try {
      const product = await storage.getProductById(productId);
      if (product) {
        products.push(product);
      }
    } catch (e) {
      logger.warn(
        {
          module: 'ContentPlannerService',
          productId,
        },
        'Failed to fetch product',
      );
    }
  }

  return products;
}

/**
 * Generate copy using copywritingService with template context
 */
async function generateCopy(
  template: ContentTemplate,
  products: Product[],
  brandProfile: BrandProfile | null,
  topic: string | undefined,
  platform: string,
): Promise<CopyResult> {
  // Map template category to campaign objective
  const campaignObjective = mapCategoryToObjective(template.category);

  // Map template to copywriting framework
  const framework = inferFramework(template);

  // Build product context
  const productName = products.length > 0 ? products.map((p) => p.name).join(' + ') : topic || template.title;

  const productDescription = buildProductDescription(products, template, topic);

  // Build target audience from brand profile
  const targetAudience = brandProfile
    ? {
        demographics: String(brandProfile.targetAudience || 'B2B professionals'),
        psychographics: 'Decision-makers seeking reliable solutions',
        painPoints: ['Quality concerns', 'Delivery timing', 'Cost optimization'] as string[],
      }
    : undefined;

  // Build brand voice from profile
  const brandVoice = brandProfile?.voice
    ? {
        principles: (brandProfile.voice as any).principles || ['Professional', 'Trustworthy'],
        wordsToAvoid: (brandProfile.voice as any).wordsToAvoid || [],
        wordsToUse: (brandProfile.voice as any).wordsToUse || [],
      }
    : undefined;

  // Add template hooks to the request
  const input: GenerateCopyInput = {
    generationId: `content-planner-${Date.now()}`,
    platform: platform as any,
    tone: 'authentic',
    framework: framework as any,
    campaignObjective: campaignObjective as any,
    productName,
    productDescription,
    industry: brandProfile?.industry || 'Construction/Steel',
    targetAudience,
    brandVoice,
    variations: 1,
  };

  const results = await copywritingService.generateCopy(input);

  const first = results[0];
  if (!first) {
    throw new Error('No copy variations generated');
  }

  return first;
}

/**
 * Generate image prompt for the template
 * Returns the prompt that should be used with /api/transform
 */
async function generateImage(
  template: ContentTemplate,
  products: Product[],
  brandProfile: BrandProfile | null,
  topic: string | undefined,
  platform: string,
): Promise<ImageResult> {
  // Build an image prompt based on template and products
  const platformFormats: Record<string, string> = {
    instagram: '1080x1080 square format',
    linkedin: '1200x627 landscape format',
    facebook: '1080x1080 square format',
    twitter: '1200x675 landscape format',
    tiktok: '1080x1920 portrait format',
  };

  const prompt = buildImagePrompt(
    template,
    products,
    brandProfile,
    topic,
    platformFormats[platform] ?? '1080x1080 square format',
  );

  // For now, return the prompt - the frontend will call /api/transform
  // In the future, we could call the image generation directly here
  return {
    imageUrl: '', // Will be filled by /api/transform call
    prompt,
  };
}

/**
 * Build image prompt from template and context
 */
function buildImagePrompt(
  template: ContentTemplate,
  products: Product[],
  brandProfile: BrandProfile | null,
  topic: string | undefined,
  format: string,
): string {
  let prompt = `Generate a professional marketing image for a ${template.category} social media post.

TEMPLATE: ${template.title}
${template.description}

FORMAT: ${format}
`;

  if (products.length > 0) {
    prompt += `
PRODUCTS TO FEATURE:
${products.map((p) => `- ${p.name}: ${p.description || 'Product image'}`).join('\n')}

IMPORTANT: The product(s) must be the hero/focus of the image.
`;
  }

  if (topic) {
    prompt += `
TOPIC/ANGLE: ${topic}
`;
  }

  if (brandProfile) {
    prompt += `
BRAND GUIDELINES (${brandProfile.brandName}):
- Visual Style: ${brandProfile.preferredStyles?.join(', ') || 'Professional'}
- Brand Colors: ${brandProfile.colorPreferences?.join(', ') || 'Standard'}
`;
  }

  prompt += `
STYLE REQUIREMENTS:
- Professional photography quality
- Clean, modern aesthetic
- No text overlays or watermarks
- Appropriate for ${template.bestPlatforms[0]?.platform || 'social media'}
`;

  return prompt;
}

/**
 * Build product description from products and template
 */
function buildProductDescription(products: Product[], template: ContentTemplate, topic: string | undefined): string {
  let description = '';

  if (products.length > 0) {
    description = products
      .map((p) => {
        let desc = p.name;
        if (p.description) desc += `: ${p.description}`;
        return desc;
      })
      .join('\n\n');
  }

  if (topic) {
    description += `\n\nTopic/Angle: ${topic}`;
  }

  description += `\n\nContent Type: ${template.title}`;
  description += `\n\nHook Patterns to Use:\n${template.hookFormulas.slice(0, 2).join('\n')}`;

  return description;
}

/**
 * Map template category to campaign objective
 */
function mapCategoryToObjective(category: string): string {
  const mapping: Record<string, string> = {
    product_showcase: 'consideration',
    educational: 'awareness',
    industry_insights: 'awareness',
    customer_success: 'conversion',
    company_updates: 'engagement',
    engagement: 'engagement',
  };
  return mapping[category] || 'awareness';
}

/**
 * Infer copywriting framework from template post structure
 */
function inferFramework(template: ContentTemplate): string {
  const structure = template.postStructure.toLowerCase();

  if (structure.includes('problem') && structure.includes('agitate')) {
    return 'pas';
  }
  if (structure.includes('before') && structure.includes('after')) {
    return 'bab';
  }
  if (structure.includes('feature') && structure.includes('benefit')) {
    return 'fab';
  }
  if (structure.includes('attention') || structure.includes('interest')) {
    return 'aida';
  }

  return 'auto';
}

// Export as service object for clean imports
export const contentPlannerService = {
  generateCompletePost,
};
