/**
 * Prompt Registration Index
 *
 * Imports and registers all versioned prompts into the prompt registry.
 * Call `registerAllPrompts()` during server startup.
 *
 * Naming convention: {namespace}.{action}
 * Version format: semver (major.minor.patch)
 * - major: breaking change in prompt structure or output format
 * - minor: non-breaking improvement or addition
 * - patch: typo fix or minor wording tweak
 */

import { registerPrompt, type PromptDefinition } from '../promptRegistry';

// ── Prompt Definitions ──────────────────────────────────────────────

const prompts: PromptDefinition[] = [
  // Copywriting
  {
    id: 'copywriting.ptcf_base',
    version: '1.0.0',
    description: 'PTCF (Persona, Task, Context, Format) framework for ad copy generation',
    build: (ctx) => ({
      userPrompt: `Generate ad copy using PTCF framework for ${ctx.platform || 'instagram'} platform.`,
    }),
  },
  {
    id: 'copywriting.ptcf_rag',
    version: '1.0.0',
    description: 'PTCF prompt enhanced with RAG context from knowledge base',
    build: (ctx) => ({
      userPrompt: `Generate RAG-enhanced ad copy for ${ctx.platform || 'instagram'} with knowledge base context.`,
    }),
  },

  // Idea Bank
  {
    id: 'ideaBank.suggest_freestyle',
    version: '1.0.0',
    description: 'Ad concept ideation with reasoning, confidence, and platform recommendations',
    build: (ctx) => ({
      userPrompt: `Generate ad suggestions for product: ${ctx.productName || 'unknown'}.`,
    }),
  },
  {
    id: 'ideaBank.suggest_template_slots',
    version: '1.0.0',
    description: 'Template slot filling for template-based generation mode',
    build: (ctx) => ({
      userPrompt: `Fill template slots for template: ${ctx.templateId || 'unknown'}.`,
    }),
  },

  // Vision Analysis
  {
    id: 'vision.product_analysis',
    version: '1.0.0',
    description: 'Product image analysis: category, materials, colors, style, demographics',
    build: () => ({
      userPrompt: 'Analyze this product image and extract structured attributes.',
    }),
  },
  {
    id: 'vision.arbitrary_image_analysis',
    version: '1.0.0',
    description: 'Non-product image analysis for advertising context',
    build: () => ({
      userPrompt: 'Analyze this uploaded image for advertising context.',
    }),
  },

  // Pattern Extraction
  {
    id: 'patterns.extract_abstract',
    version: '1.0.0',
    description: 'Privacy-safe abstract pattern extraction from ads (no text/brands)',
    build: () => ({
      userPrompt: 'Extract abstract visual patterns from this advertisement.',
    }),
  },

  // Content Safety
  {
    id: 'safety.content_check',
    version: '1.0.0',
    description: 'Multi-layer content safety validation (hate, violence, PII, etc.)',
    build: (ctx) => ({
      userPrompt: `Check content safety for: "${ctx.text || ''}"`,
    }),
  },

  // Confidence Scoring
  {
    id: 'scoring.brand_voice_alignment',
    version: '1.0.0',
    description: 'Brand voice alignment scoring for generated copy',
    build: (ctx) => ({
      userPrompt: `Evaluate brand voice alignment for ${ctx.platform || 'instagram'} copy.`,
    }),
  },

  // Relationship Discovery
  {
    id: 'relationships.discovery_search',
    version: '1.0.0',
    description: 'Product relationship discovery using knowledge base context',
    build: (ctx) => ({
      userPrompt: `Discover relationships for product: ${ctx.productName || 'unknown'}.`,
    }),
  },
  {
    id: 'relationships.pairwise_analysis',
    version: '1.0.0',
    description: 'Pairwise product relationship analysis and confidence scoring',
    build: (ctx) => ({
      userPrompt: `Analyze relationship between ${ctx.productA || ''} and ${ctx.productB || ''}.`,
    }),
  },

  // Templates
  {
    id: 'templates.context_match',
    version: '1.0.0',
    description: 'Template matching and scoring based on context/industry/platform',
    build: (ctx) => ({
      userPrompt: `Match templates for context: ${ctx.context || 'general'}.`,
    }),
  },

  // Installation Scenarios
  {
    id: 'installation.scenario_generation',
    version: '1.0.0',
    description: 'Installation steps, accessories, and room-specific tips generation',
    build: (ctx) => ({
      userPrompt: `Generate installation scenario for ${ctx.productName || 'unknown'}.`,
    }),
  },

  // Carousel
  {
    id: 'carousel.outline_generation',
    version: '1.0.0',
    description: 'Carousel slide outlines with hook, points, and CTA',
    build: (ctx) => ({
      userPrompt: `Generate carousel outline for topic: ${ctx.topic || 'unknown'}.`,
    }),
  },

  // Content Planner
  {
    id: 'planner.image_generation',
    version: '1.0.0',
    description: 'Image generation prompts for content planning with template/brand context',
    build: (ctx) => ({
      userPrompt: `Build image prompt for planned content on ${ctx.platform || 'instagram'}.`,
    }),
  },
];

// ── Registration ──────────────────────────────────────────────────

/**
 * Register all prompts in the registry. Call once during server startup.
 */
export function registerAllPrompts(): void {
  for (const prompt of prompts) {
    registerPrompt(prompt);
  }
}
