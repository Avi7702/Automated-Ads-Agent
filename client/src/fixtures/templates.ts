/**
 * Prompt Template & Ad Scene Template Test Fixtures
 *
 * Mock template data for testing template selection, matching, and rendering.
 * Covers both legacy PromptTemplate and new AdSceneTemplate schemas.
 *
 * @file client/src/fixtures/templates.ts
 */

import type { PromptTemplate } from '../../../shared/schema';
import type {
  AdSceneTemplate as IdeaBankAdSceneTemplate,
} from '../../../shared/types/ideaBank';

// === LEGACY PROMPT TEMPLATES ===

/**
 * Legacy prompt templates (simple key-value style)
 * Used in older parts of the system
 */
export const mockPromptTemplates: PromptTemplate[] = [
  {
    id: 'pt-001',
    title: 'Professional Product Hero',
    prompt: 'Create a professional product photograph of {{product}} on a clean white background with soft studio lighting. The product should be the main focal point, centered in the frame.',
    category: 'product_showcase',
    tags: ['hero', 'studio', 'clean', 'professional'],
    createdAt: new Date('2026-01-01'),
  },
  {
    id: 'pt-002',
    title: 'Construction Site Action Shot',
    prompt: 'Show {{product}} being used on an active construction site. Include construction workers wearing safety gear. The lighting should be natural daylight, emphasizing the rugged durability of the product.',
    category: 'installation',
    tags: ['construction', 'action', 'worksite', 'durability'],
    createdAt: new Date('2026-01-02'),
  },
  {
    id: 'pt-003',
    title: 'Before/After Transformation',
    prompt: 'Create a split-screen before/after image showing the problem on the left and the solution using {{product}} on the right. Use consistent lighting across both sides.',
    category: 'educational',
    tags: ['before-after', 'transformation', 'comparison'],
    createdAt: new Date('2026-01-03'),
  },
  {
    id: 'pt-004',
    title: 'Scale Demonstration',
    prompt: 'Photograph {{product}} next to common objects for scale reference. Include a ruler, hand, or standard tool to help viewers understand the product dimensions.',
    category: 'educational',
    tags: ['scale', 'dimensions', 'reference'],
    createdAt: new Date('2026-01-04'),
  },
  {
    id: 'pt-005',
    title: 'Lifestyle Integration',
    prompt: 'Show {{product}} integrated into a beautiful finished space. The setting should be aspirational - a modern home or upscale commercial space that highlights the aesthetic appeal of the product.',
    category: 'product_showcase',
    tags: ['lifestyle', 'aspirational', 'finished-space'],
    createdAt: new Date('2026-01-05'),
  },
  {
    id: 'pt-006',
    title: 'Technical Detail Close-up',
    prompt: 'Create an extreme close-up of {{product}} highlighting its technical details, textures, and quality construction. Use macro photography style with shallow depth of field.',
    category: 'product_showcase',
    tags: ['detail', 'macro', 'quality', 'texture'],
    createdAt: new Date('2026-01-06'),
  },
  {
    id: 'pt-007',
    title: 'Urgency Sale Banner',
    prompt: 'Design a bold promotional banner featuring {{product}} with urgency messaging. Use dynamic angles and high contrast colors. Leave space for "LIMITED TIME" or "SALE" overlay text.',
    category: 'urgency',
    tags: ['sale', 'urgency', 'promotional', 'banner'],
    createdAt: new Date('2026-01-07'),
  },
];

// === AD SCENE TEMPLATES (INTELLIGENT IDEA BANK) ===

/**
 * Ad Scene Templates - Rich templates with placement hints and platform targeting
 * Used by Intelligent Idea Bank for smart template matching
 */
export const mockAdSceneTemplates: IdeaBankAdSceneTemplate[] = [
  {
    id: 'ast-001',
    title: 'Clean White Studio Showcase',
    description: 'Professional product photography on infinite white background with soft box lighting.',
    previewImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/templates/white-studio.jpg',
    previewPublicId: 'templates/white-studio',
    referenceImages: [
      { url: 'https://res.cloudinary.com/demo/image/upload/v1/refs/studio-ref-1.jpg', publicId: 'refs/studio-ref-1' },
      { url: 'https://res.cloudinary.com/demo/image/upload/v1/refs/studio-ref-2.jpg', publicId: 'refs/studio-ref-2' },
    ],
    category: 'product_showcase',
    tags: ['studio', 'white', 'clean', 'professional', 'ecommerce'],
    platformHints: ['instagram', 'facebook', 'linkedin'],
    aspectRatioHints: ['1:1', '4:5'],
    promptBlueprint: 'Professional product photograph of {{product}} centered on an infinite white cyclorama background. Soft diffused lighting from above and sides. No shadows. Product fills 60% of frame. Ultra-sharp focus.',
    placementHints: { position: 'center', scale: 'large' },
    lightingStyle: 'soft',
    intent: 'showcase',
    environment: 'studio',
    mood: 'professional',
    bestForProductTypes: ['flooring', 'tile', 'fixtures', 'tools'],
    isGlobal: true,
    createdBy: null,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 'ast-002',
    title: 'Active Construction Site',
    description: 'Rugged outdoor setting showing product in real-world construction use.',
    previewImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/templates/construction-site.jpg',
    previewPublicId: 'templates/construction-site',
    referenceImages: [
      { url: 'https://res.cloudinary.com/demo/image/upload/v1/refs/site-ref-1.jpg', publicId: 'refs/site-ref-1' },
    ],
    category: 'worksite',
    tags: ['construction', 'outdoor', 'rugged', 'professional', 'action'],
    platformHints: ['linkedin', 'facebook'],
    aspectRatioHints: ['16:9', '1:1'],
    promptBlueprint: '{{product}} being installed on an active construction site. Workers in safety vests and hard hats. Morning sunlight creating warm golden hour glow. Dust particles in the air. Realistic construction environment.',
    placementHints: { position: 'center', scale: 'medium' },
    lightingStyle: 'natural',
    intent: 'installation',
    environment: 'worksite',
    mood: 'industrial',
    bestForProductTypes: ['rebar', 'mesh', 'spacers', 'drainage', 'concrete'],
    isGlobal: true,
    createdBy: null,
    createdAt: '2026-01-02T00:00:00Z',
  },
  {
    id: 'ast-003',
    title: 'Split Before/After',
    description: 'Side-by-side comparison showing problem and solution.',
    previewImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/templates/before-after.jpg',
    previewPublicId: 'templates/before-after',
    referenceImages: null,
    category: 'educational',
    tags: ['before-after', 'comparison', 'transformation', 'educational'],
    platformHints: ['instagram', 'facebook', 'tiktok'],
    aspectRatioHints: ['1:1', '9:16'],
    promptBlueprint: 'Split screen image. LEFT: Problem scenario (water damage, cracks, old installation). RIGHT: Solution using {{product}} showing perfect installation. Consistent lighting on both sides. Clear dividing line.',
    placementHints: { position: 'right', scale: 'medium' },
    lightingStyle: 'natural',
    intent: 'before-after',
    environment: 'indoor',
    mood: 'professional',
    bestForProductTypes: ['waterproofing', 'flooring', 'drainage', 'membranes'],
    isGlobal: true,
    createdBy: null,
    createdAt: '2026-01-03T00:00:00Z',
  },
  {
    id: 'ast-004',
    title: 'Scale Reference with Worker Hands',
    description: 'Product held in worker hands to demonstrate size and handling.',
    previewImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/templates/hands-scale.jpg',
    previewPublicId: 'templates/hands-scale',
    referenceImages: [
      { url: 'https://res.cloudinary.com/demo/image/upload/v1/refs/hands-ref-1.jpg', publicId: 'refs/hands-ref-1' },
    ],
    category: 'product_showcase',
    tags: ['scale', 'hands', 'demonstration', 'sizing'],
    platformHints: ['instagram', 'linkedin'],
    aspectRatioHints: ['4:5', '1:1'],
    promptBlueprint: 'Close-up of {{product}} being held by professional worker hands wearing work gloves. Product is the hero, hands provide scale reference. Shallow depth of field blurs background. Natural daylight.',
    placementHints: { position: 'center', scale: 'large' },
    lightingStyle: 'natural',
    intent: 'scale-demo',
    environment: 'worksite',
    mood: 'professional',
    bestForProductTypes: ['spacers', 'fasteners', 'small-tools', 'connectors'],
    isGlobal: true,
    createdBy: null,
    createdAt: '2026-01-04T00:00:00Z',
  },
  {
    id: 'ast-005',
    title: 'Luxury Interior Lifestyle',
    description: 'Product in an upscale finished interior space.',
    previewImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/templates/luxury-interior.jpg',
    previewPublicId: 'templates/luxury-interior',
    referenceImages: [
      { url: 'https://res.cloudinary.com/demo/image/upload/v1/refs/interior-ref-1.jpg', publicId: 'refs/interior-ref-1' },
      { url: 'https://res.cloudinary.com/demo/image/upload/v1/refs/interior-ref-2.jpg', publicId: 'refs/interior-ref-2' },
      { url: 'https://res.cloudinary.com/demo/image/upload/v1/refs/interior-ref-3.jpg', publicId: 'refs/interior-ref-3' },
    ],
    category: 'product_showcase',
    tags: ['luxury', 'interior', 'lifestyle', 'aspirational', 'residential'],
    platformHints: ['instagram', 'facebook', 'pinterest'],
    aspectRatioHints: ['4:5', '9:16'],
    promptBlueprint: 'Beautiful modern interior featuring {{product}} as the flooring/wall treatment. Minimalist furniture, natural light streaming through large windows. Plants and tasteful decor. Architectural photography style.',
    placementHints: { position: 'bottom', scale: 'fill' },
    lightingStyle: 'natural',
    intent: 'showcase',
    environment: 'indoor',
    mood: 'minimal',
    bestForProductTypes: ['flooring', 'tile', 'wall-panels', 'trim'],
    isGlobal: true,
    createdBy: null,
    createdAt: '2026-01-05T00:00:00Z',
  },
  {
    id: 'ast-006',
    title: 'Bold Urgency Banner',
    description: 'High-contrast promotional template with space for sale messaging.',
    previewImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/templates/urgency-banner.jpg',
    previewPublicId: 'templates/urgency-banner',
    referenceImages: null,
    category: 'product_showcase',
    tags: ['sale', 'urgency', 'promotional', 'bold', 'banner'],
    platformHints: ['facebook', 'instagram'],
    aspectRatioHints: ['16:9', '1:1'],
    promptBlueprint: 'Dynamic product shot of {{product}} at dramatic angle. Bold red and yellow accent colors. High contrast lighting. Space in upper right for promotional text overlay. Energy and urgency.',
    placementHints: { position: 'left', scale: 'large' },
    lightingStyle: 'dramatic',
    intent: 'showcase',
    environment: 'studio',
    mood: 'urgent',
    bestForProductTypes: ['tools', 'equipment', 'clearance-items'],
    isGlobal: true,
    createdBy: null,
    createdAt: '2026-01-06T00:00:00Z',
  },
  {
    id: 'ast-007',
    title: 'Underground Installation Cross-Section',
    description: 'Educational cutaway showing proper underground installation.',
    previewImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/templates/underground-cutaway.jpg',
    previewPublicId: 'templates/underground-cutaway',
    referenceImages: [
      { url: 'https://res.cloudinary.com/demo/image/upload/v1/refs/cutaway-ref-1.jpg', publicId: 'refs/cutaway-ref-1' },
    ],
    category: 'educational',
    tags: ['cutaway', 'cross-section', 'underground', 'installation', 'educational'],
    platformHints: ['linkedin', 'youtube'],
    aspectRatioHints: ['16:9'],
    promptBlueprint: 'Educational cross-section illustration showing {{product}} installed underground. Clear soil layers visible. Proper grading and drainage direction indicated. Technical but accessible visual style.',
    placementHints: { position: 'center', scale: 'medium' },
    lightingStyle: 'studio',
    intent: 'installation',
    environment: 'outdoor',
    mood: 'professional',
    bestForProductTypes: ['drainage', 'waterproofing', 'foundation', 'pipes'],
    isGlobal: true,
    createdBy: null,
    createdAt: '2026-01-07T00:00:00Z',
  },
  {
    id: 'ast-008',
    title: 'User Custom Template',
    description: 'A custom template created by a specific user.',
    previewImageUrl: 'https://res.cloudinary.com/demo/image/upload/v1/templates/custom-user.jpg',
    previewPublicId: 'templates/custom-user',
    referenceImages: null,
    category: 'installation',
    tags: ['custom', 'user-created'],
    platformHints: ['instagram'],
    aspectRatioHints: ['1:1'],
    promptBlueprint: 'Custom template for {{product}} with specific brand requirements.',
    placementHints: { position: 'center', scale: 'medium' },
    lightingStyle: 'natural',
    intent: 'installation',
    environment: 'worksite',
    mood: 'industrial',
    bestForProductTypes: ['drainage'],
    isGlobal: false,
    createdBy: 'user-123',
    createdAt: '2026-01-08T00:00:00Z',
  },
];

// === FILTERED SUBSETS ===

/** Product showcase templates */
export const productShowcaseTemplates = mockAdSceneTemplates.filter(
  (t) => t.category === 'product_showcase'
);

/** Educational templates */
export const educationalTemplates = mockAdSceneTemplates.filter(
  (t) => t.category === 'educational'
);

/** Worksite templates */
export const worksiteTemplates = mockAdSceneTemplates.filter(
  (t) => t.category === 'worksite'
);

/** Installation templates */
export const installationTemplates = mockAdSceneTemplates.filter(
  (t) => t.category === 'installation'
);

/** Global (shared) templates */
export const globalTemplates = mockAdSceneTemplates.filter((t) => t.isGlobal);

/** User-created (non-global) templates */
export const userTemplates = mockAdSceneTemplates.filter((t) => !t.isGlobal);

/** Templates suitable for Instagram */
export const instagramTemplates = mockAdSceneTemplates.filter(
  (t) => t.platformHints?.includes('instagram')
);

/** Templates suitable for LinkedIn */
export const linkedinTemplates = mockAdSceneTemplates.filter(
  (t) => t.platformHints?.includes('linkedin')
);

/** Templates for drainage products */
export const drainageTemplates = mockAdSceneTemplates.filter(
  (t) => t.bestForProductTypes?.includes('drainage')
);

/** Templates with reference images */
export const templatesWithReferences = mockAdSceneTemplates.filter(
  (t) => t.referenceImages && t.referenceImages.length > 0
);

// === FACTORY FUNCTIONS ===

/**
 * Creates a new prompt template with custom overrides
 */
export function createMockPromptTemplate(
  overrides: Partial<PromptTemplate> = {}
): PromptTemplate {
  const id = overrides.id || `pt-test-${Date.now()}`;
  return {
    id,
    title: `Test Template ${id}`,
    prompt: 'Test prompt for {{product}}',
    category: 'product_showcase',
    tags: ['test'],
    createdAt: new Date(),
    ...overrides,
  };
}

/**
 * Creates a new ad scene template with custom overrides
 */
export function createMockAdSceneTemplate(
  overrides: Partial<IdeaBankAdSceneTemplate> = {}
): IdeaBankAdSceneTemplate {
  const id = overrides.id || `ast-test-${Date.now()}`;
  return {
    id,
    title: `Test Ad Scene Template ${id}`,
    description: 'A test template for unit testing',
    previewImageUrl: `https://res.cloudinary.com/demo/image/upload/v1/templates/${id}.jpg`,
    previewPublicId: `templates/${id}`,
    referenceImages: null,
    category: 'product_showcase',
    tags: ['test'],
    platformHints: ['instagram'],
    aspectRatioHints: ['1:1'],
    promptBlueprint: 'Test blueprint for {{product}}',
    placementHints: { position: 'center', scale: 'medium' },
    lightingStyle: 'natural',
    intent: 'showcase',
    environment: 'studio',
    mood: 'professional',
    bestForProductTypes: [],
    isGlobal: true,
    createdBy: null,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// === SINGLE TEMPLATE EXPORTS ===

/** A single product showcase template */
export const singleShowcaseTemplate = mockAdSceneTemplates[0];

/** A single worksite template */
export const singleWorksiteTemplate = mockAdSceneTemplates[1];

/** A single educational template */
export const singleEducationalTemplate = mockAdSceneTemplates[2];

/** A template with multiple reference images */
export const templateWithMultipleRefs = mockAdSceneTemplates[4];

/** A user-created (non-global) template */
export const singleUserTemplate = mockAdSceneTemplates[7];
