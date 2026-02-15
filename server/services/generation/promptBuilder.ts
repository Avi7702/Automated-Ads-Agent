// @ts-nocheck
/**
 * Prompt Builder
 *
 * Assembles the final generation prompt from all pipeline context.
 * Extracts the prompt construction logic that was inline in /api/transform
 * into a testable, reusable module.
 *
 * Three mode-specific builders:
 * - buildStandardPrompt: direct generation from user prompt
 * - buildExactInsertPrompt: product inserted into template scene
 * - buildInspirationPrompt: template-inspired creative generation
 *
 * Each builder layers context in order:
 * [Style Directive] + [Core Prompt] + [Brand Context] + [Product Context]
 * + [Patterns] + [KB Context] + [Quality Constraints]
 */

import type { GenerationContext } from '../../types/generationPipeline';
import { logger } from '../../lib/logger';

/**
 * Build the final prompt based on generation mode and all available context.
 */
export function buildPrompt(ctx: GenerationContext): string {
  const { mode } = ctx.input;
  const hasImages = ctx.input.images.length > 0;

  let prompt: string;

  switch (mode) {
    case 'exact_insert':
      prompt = buildExactInsertPrompt(ctx, hasImages);
      break;
    case 'inspiration':
      prompt = buildInspirationPrompt(ctx, hasImages);
      break;
    default:
      prompt = buildStandardPrompt(ctx, hasImages);
      break;
  }

  // Layer shared context sections onto any mode's prompt
  prompt = appendStyleDirective(prompt, ctx);
  prompt = appendBrandContext(prompt, ctx);
  prompt = appendBrandDNAContext(prompt, ctx);
  prompt = appendProductContext(prompt, ctx);
  prompt = appendPatternsContext(prompt, ctx);
  prompt = appendKBContext(prompt, ctx);
  prompt = appendVisionContext(prompt, ctx);
  prompt = appendPlatformGuidelines(prompt, ctx);

  return prompt;
}

// ============================================
// MODE-SPECIFIC PROMPT BUILDERS
// ============================================

function buildStandardPrompt(ctx: GenerationContext, hasImages: boolean): string {
  const { prompt } = ctx.input;

  if (!hasImages) {
    // Text-only generation — use prompt as-is
    return prompt;
  }

  if (ctx.input.images.length === 1) {
    return `Transform this product photo based on the following instructions: ${prompt}

Guidelines:
- Keep the product as the hero/focus
- Maintain professional photography quality
- Ensure the product is clearly visible and recognizable
- Apply the requested scene, lighting, and style changes
- Do not add text or watermarks`;
  }

  return `Transform these ${ctx.input.images.length} product photos based on the following instructions: ${prompt}

Guidelines:
- Combine/arrange all products in a cohesive scene
- Keep all products clearly visible and recognizable
- Maintain professional photography quality
- Apply the requested scene, lighting, and style changes
- Show how the products work together or as a collection
- Do not add text or watermarks`;
}

function buildExactInsertPrompt(ctx: GenerationContext, hasImages: boolean): string {
  const { prompt } = ctx.input;
  const template = ctx.template;

  if (!template) {
    // Fallback to standard if template is missing
    return buildStandardPrompt(ctx, hasImages);
  }

  if (hasImages) {
    return `Insert this product into the following scene template while maintaining exact quality standards.

Template Scene: ${template.blueprint}

User Instructions: ${prompt}

CRITICAL QUALITY CONSTRAINTS:
- Product must be clearly visible and recognizable as the main subject
- Product lighting must match the template scene's lighting style exactly
- Product placement must follow the template's placement hints: ${JSON.stringify(template.placementHints || {})}
- Maintain professional photography quality
- Scene environment should match template exactly: ${template.environment || 'as described'}
- Overall mood must match template mood: ${template.mood || 'as described'}
- Do not add text or watermarks
- Product must look natural and integrated into the scene, not pasted on

If multiple products provided, arrange them according to the template's composition while maintaining all quality constraints.`;
  }

  return `Generate an image following this scene template exactly.

Template Scene: ${template.blueprint}

User Instructions: ${prompt}

QUALITY CONSTRAINTS:
- Follow the template's scene description precisely
- Match lighting style: ${template.lighting || 'as described in template'}
- Match environment: ${template.environment || 'as described'}
- Match mood: ${template.mood || 'as described'}
- Professional photography quality
- Do not add text or watermarks`;
}

function buildInspirationPrompt(ctx: GenerationContext, hasImages: boolean): string {
  const { prompt } = ctx.input;
  const template = ctx.template;

  if (!template) {
    return buildStandardPrompt(ctx, hasImages);
  }

  if (hasImages) {
    return `Transform this product photo inspired by the following template style, but create a unique scene.

Template Inspiration:
- Category: ${template.category}
- Mood: ${template.mood || 'not specified'}
- Lighting Style: ${template.lighting || 'not specified'}
- Environment Type: ${template.environment || 'not specified'}
- General Vibe: ${template.blueprint.slice(0, 200)}

User Instructions: ${prompt}

Guidelines:
- Keep the product as the hero/focus
- Capture the template's mood and style, but create a NEW unique scene
- Maintain professional photography quality
- Ensure the product is clearly visible and recognizable
- Do not copy the template scene exactly - be creative while maintaining the aesthetic
- Do not add text or watermarks`;
  }

  return `Generate an image inspired by this template style, creating a unique scene.

Template Inspiration:
- Category: ${template.category}
- Mood: ${template.mood || 'not specified'}
- Lighting Style: ${template.lighting || 'not specified'}
- Environment: ${template.environment || 'not specified'}

User Instructions: ${prompt}

Guidelines:
- Capture the template's aesthetic and mood
- Create a unique scene, don't copy the template exactly
- Professional photography quality
- Do not add text or watermarks`;
}

// ============================================
// SHARED CONTEXT APPENDORS
// ============================================

function appendStyleDirective(prompt: string, ctx: GenerationContext): string {
  if (!ctx.style?.directive) return prompt;

  logger.info(
    { module: 'PromptBuilder', referenceCount: ctx.style.referenceCount },
    'Style directive applied to prompt',
  );

  // Style directive goes at the very top for maximum influence
  return `${ctx.style.directive}\n\n${prompt}`;
}

function appendBrandContext(prompt: string, ctx: GenerationContext): string {
  if (!ctx.brand) return prompt;

  const brand = ctx.brand;
  const section = `

BRAND GUIDELINES (${brand.name}):
- Visual Style: ${brand.styles.join(', ') || 'Professional'}
- Brand Values: ${brand.values.join(', ') || 'Reliability'}
- Brand Colors: ${brand.colors.join(', ') || 'Standard'}
- Voice Principles: ${brand.voicePrinciples.join(', ') || 'Professional'}

Ensure the generated image aligns with these brand guidelines where possible.`;

  return prompt + section;
}

function appendProductContext(prompt: string, ctx: GenerationContext): string {
  if (!ctx.product) return prompt;

  let section = `

PRODUCT CONTEXT:`;

  // Relationships
  if (ctx.product.relationships.length > 0) {
    section += `
Related Products:`;
    for (const rel of ctx.product.relationships.slice(0, 5)) {
      section += `
- ${rel.targetProductName} (${rel.relationshipType})${rel.description ? `: ${rel.description}` : ''}`;
    }
  }

  // Installation scenarios
  const activeScenarios = ctx.product.scenarios.filter((s) => s.isActive !== false);
  if (activeScenarios.length > 0) {
    section += `
Installation Context:`;
    for (const scenario of activeScenarios.slice(0, 2)) {
      section += `
- ${scenario.title}: ${scenario.description.slice(0, 200)}`;
    }
  }

  section += `

Consider these product relationships and usage contexts when generating the image.`;

  return prompt + section;
}

function appendPatternsContext(prompt: string, ctx: GenerationContext): string {
  if (!ctx.patterns?.directive) return prompt;

  logger.info(
    { module: 'PromptBuilder', patternCount: ctx.patterns.patternCount },
    'Learned patterns applied to prompt',
  );

  return (
    prompt +
    `

LEARNED ADVERTISING PATTERNS:
${ctx.patterns.directive}

Apply relevant patterns from successful ads when composing the image.`
  );
}

function appendKBContext(prompt: string, ctx: GenerationContext): string {
  if (!ctx.kb?.context) return prompt;

  logger.info({ module: 'PromptBuilder' }, 'KB context applied to prompt');

  return (
    prompt +
    `

BRAND KNOWLEDGE BASE:
${ctx.kb.context.slice(0, 1000)}

Use this brand knowledge to inform the image generation.`
  );
}

function appendVisionContext(prompt: string, ctx: GenerationContext): string {
  if (!ctx.vision) return prompt;

  return (
    prompt +
    `

PRODUCT VISUAL ANALYSIS:
- Category: ${ctx.vision.category}
- Materials: ${ctx.vision.materials.join(', ')}
- Colors: ${ctx.vision.colors.join(', ')}
- Style: ${ctx.vision.style}
- Usage Context: ${ctx.vision.usageContext}

Ensure the generated image is consistent with these product characteristics.`
  );
}

/**
 * Append Brand DNA context (Phase 5 Intelligence Layer).
 * Adds persistent brand insights learned from historical brand data analysis.
 */
function appendBrandDNAContext(prompt: string, ctx: GenerationContext): string {
  if (!ctx.brandDNA?.contentRules) return prompt;

  logger.info({ module: 'PromptBuilder' }, 'Brand DNA context applied to prompt');

  return (
    prompt +
    `
${ctx.brandDNA.contentRules}

Apply these brand DNA insights to ensure generation aligns with the brand's proven patterns.`
  );
}

// ============================================
// PLATFORM-SPECIFIC GUIDELINES (Phase 5.3)
// ============================================

/**
 * Returns platform-specific image guidelines for the target platform.
 */
export function getPlatformGuidelines(platform: string): string {
  const guidelines: Record<string, string> = {
    instagram:
      'Square (1:1) or vertical (4:5), vibrant colors, lifestyle-focused, clean composition, high visual impact',
    linkedin: 'Horizontal (1.91:1), professional tone, data-driven visuals, minimal text overlay, business-appropriate',
    tiktok: 'Vertical (9:16), bold text, high contrast, dynamic composition, eye-catching in first frame',
    facebook: 'Flexible (1.91:1 for ads, 1:1 for posts), engaging, storytelling-focused, works at small sizes in feed',
    twitter: 'Horizontal (16:9), clean composition, minimal text, works well cropped, stands out in timeline',
    'twitter/x': 'Horizontal (16:9), clean composition, minimal text, works well cropped, stands out in timeline',
  };

  return guidelines[platform.toLowerCase()] || '';
}

/**
 * Append platform-specific guidelines to the prompt if a target platform is specified.
 */
function appendPlatformGuidelines(prompt: string, ctx: GenerationContext): string {
  // Determine platform from input or recipe
  const platform = ctx.input.platform || (ctx.input.recipe as any)?.platform || null;

  if (!platform) return prompt;

  const guidelines = getPlatformGuidelines(platform);
  if (!guidelines) return prompt;

  logger.info({ module: 'PromptBuilder', platform }, 'Platform guidelines applied to prompt');

  return (
    prompt +
    `

PLATFORM GUIDELINES (${platform.toUpperCase()}):
${guidelines}

Optimize the image composition and style for ${platform} best practices.`
  );
}
