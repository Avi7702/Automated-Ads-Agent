# World-Class AI Image Generation Experience
## Complete A-to-Z Best Practices for Social Media Content Creation

*The definitive guide to building a truly exceptional image generation app*

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Phase 1: Pre-Generation Experience](#phase-1-pre-generation-experience)
3. [Phase 2: Generation Experience](#phase-2-generation-experience)
4. [Phase 3: Post-Generation & Iteration](#phase-3-post-generation--iteration)
5. [Phase 4: Multi-Platform Optimization](#phase-4-multi-platform-optimization)
6. [Phase 5: Workflow & Batch Processing](#phase-5-workflow--batch-processing)
7. [Phase 6: Analytics & A/B Testing](#phase-6-analytics--ab-testing)
8. [Phase 7: Advanced Features](#phase-7-advanced-features)
9. [Implementation Roadmap](#implementation-roadmap)
10. [Database Schema](#database-schema)
11. [API Endpoints](#api-endpoints)
12. [Frontend Components](#frontend-components)

---

## Executive Summary

This guide transforms a basic image generation app into a **world-class social media content creation platform**. It incorporates:

- **Thought signature preservation** for intelligent editing (Gemini 3 Pro best practice)
- **Multi-variation generation** for A/B testing
- **Platform-specific optimization** (auto-sizing for Instagram, LinkedIn, etc.)
- **Prompt templates & presets** for consistent brand imagery
- **Batch processing** for content calendars
- **Version history & edit chains** for iterative refinement
- **Analytics integration** for performance tracking

---

## Phase 1: Pre-Generation Experience

### 1.1 Smart Prompt Builder

Instead of a blank text field, offer structured prompt building:

```typescript
interface PromptBuilder {
  // Core elements
  subject: string;           // "steel reinforcement bars"
  action?: string;           // "being delivered", "stacked neatly"
  environment: string;       // "construction site", "warehouse", "studio"
  
  // Style elements
  style: 'photorealistic' | 'professional' | 'artistic' | 'minimal' | 'dynamic';
  mood: 'energetic' | 'professional' | 'trustworthy' | 'innovative' | 'warm';
  lighting: 'natural' | 'studio' | 'golden_hour' | 'dramatic' | 'soft';
  
  // Technical specs
  composition: 'close-up' | 'wide-shot' | 'aerial' | 'eye-level' | 'low-angle';
  colorPalette?: string[];   // ["#FF6B35", "#004E89"] - brand colors
  
  // Platform optimization
  targetPlatform: Platform;
  aspectRatio: AspectRatio;
}
```

### 1.2 Prompt Templates Library

Pre-built templates for common social media use cases:

```typescript
const promptTemplates = {
  // Product Showcase
  product_hero: {
    name: "Product Hero Shot",
    template: "{product} photographed in {environment}, {lighting} lighting, {style} style, professional product photography",
    defaults: { lighting: "studio", style: "photorealistic", environment: "clean white background" },
    platforms: ["instagram_post", "linkedin_post", "facebook_post"]
  },
  
  // Behind the Scenes
  bts_action: {
    name: "Behind the Scenes",
    template: "{subject} at work in {environment}, candid documentary style, {lighting} lighting, authentic and engaging",
    defaults: { lighting: "natural", environment: "workplace" },
    platforms: ["instagram_story", "linkedin_post"]
  },
  
  // Testimonial/Quote Card
  quote_card: {
    name: "Quote Card Background",
    template: "Abstract {mood} background with {colorPalette} gradient, minimal design, space for text overlay, {style}",
    defaults: { mood: "professional", style: "minimal" },
    platforms: ["instagram_post", "linkedin_post", "twitter_post"]
  },
  
  // Industry/Construction Specific
  construction_site: {
    name: "Construction Site",
    template: "{product} on active construction site, {weather} day, {lighting} lighting, documentary style, professional",
    defaults: { weather: "clear", lighting: "golden_hour" },
    platforms: ["linkedin_post", "instagram_post"]
  },
  
  // Delivery/Logistics
  delivery_shot: {
    name: "Delivery Success",
    template: "{product} being unloaded from delivery truck, {environment}, professional logistics photography, {mood} atmosphere",
    defaults: { environment: "construction site entrance", mood: "efficient" },
    platforms: ["instagram_story", "linkedin_post"]
  },
  
  // Team/People
  team_spotlight: {
    name: "Team Spotlight",
    template: "Professional portrait of {subject} in {environment}, {lighting} lighting, approachable and {mood}",
    defaults: { lighting: "natural", mood: "confident", environment: "workplace" },
    platforms: ["linkedin_post", "instagram_post"]
  }
};
```

### 1.3 Reference Image Intelligence

Smart handling of reference/product images:

```typescript
interface ReferenceImageConfig {
  // How to use the reference
  usage: 'style_reference' | 'subject_reference' | 'composition_reference' | 'color_reference';
  
  // Weight/influence (0-1)
  influence: number;
  
  // Auto-detected attributes (via AI analysis)
  detected: {
    dominantColors: string[];
    style: string;
    mood: string;
    objects: string[];
  };
}
```

### 1.4 Brand Kit Integration

Store and apply brand guidelines:

```typescript
interface BrandKit {
  id: string;
  name: string;
  
  // Visual identity
  primaryColors: string[];
  secondaryColors: string[];
  fonts: string[];
  
  // Style preferences
  preferredStyles: string[];
  avoidStyles: string[];
  
  // Prompt additions (automatically appended)
  styleGuide: string;  // e.g., "professional, clean, modern, trustworthy"
  
  // Logo/watermark
  logoUrl?: string;
  watermarkPosition?: 'bottom-right' | 'bottom-left' | 'center';
}
```

---

## Phase 2: Generation Experience

### 2.1 Multi-Variation Generation

**Critical Best Practice**: Generate multiple variations in one request for selection:

```typescript
interface GenerationRequest {
  prompt: string;
  referenceImages?: string[];
  
  // Generate variations
  variationCount: 3 | 4 | 6;  // 3-6 variations per generation
  variationStrategy: 'diverse' | 'similar' | 'ab_test';
  
  // For A/B testing
  abTestVariables?: {
    lighting?: ['warm', 'cool'];
    composition?: ['close-up', 'wide'];
    mood?: ['energetic', 'calm'];
  };
}
```

**Implementation**:

```typescript
async function generateWithVariations(request: GenerationRequest): Promise<GenerationResult[]> {
  const variations: GenerationResult[] = [];
  
  if (request.variationStrategy === 'ab_test' && request.abTestVariables) {
    // Generate specific A/B test variations
    for (const [variable, options] of Object.entries(request.abTestVariables)) {
      for (const option of options) {
        const modifiedPrompt = injectVariable(request.prompt, variable, option);
        const result = await generateSingle(modifiedPrompt, request.referenceImages);
        variations.push({
          ...result,
          variationType: 'ab_test',
          testedVariable: variable,
          testedValue: option
        });
      }
    }
  } else {
    // Generate diverse/similar variations
    for (let i = 0; i < request.variationCount; i++) {
      const result = await generateSingle(
        request.prompt,
        request.referenceImages,
        { seed: request.variationStrategy === 'similar' ? undefined : generateSeed() }
      );
      variations.push(result);
    }
  }
  
  return variations;
}
```

### 2.2 Thought Signature Preservation (Gemini 3 Pro)

**THE MOST CRITICAL BEST PRACTICE** for editing:

```typescript
interface GenerationResult {
  id: string;
  imageUrl: string;
  
  // CRITICAL: Store the full conversation history including thought signatures
  conversationHistory: GeminiContent[];  // Must preserve thoughtSignature fields!
  
  // Metadata
  prompt: string;
  model: string;
  timestamp: Date;
  
  // Variation info
  variationType?: 'ab_test' | 'diverse' | 'similar';
  testedVariable?: string;
  testedValue?: string;
  
  // Edit chain
  parentGenerationId?: string;
  editPrompt?: string;
  editCount: number;
}
```

**Storage Implementation**:

```typescript
async function saveGeneration(result: GeminiResponse, request: GenerationRequest) {
  const generation = {
    id: generateId(),
    imageUrl: await saveImage(result.image),
    prompt: request.prompt,
    
    // CRITICAL: Store full conversation history as-is
    // This preserves thought signatures for future edits
    conversationHistory: JSON.stringify([
      { role: 'user', parts: buildUserParts(request) },
      result.candidates[0].content  // Contains thoughtSignature!
    ]),
    
    // Enable editing
    canEdit: true,
    editCount: 0
  };
  
  await db.insert('generations', generation);
  return generation;
}
```

### 2.3 Progress & Preview

Real-time generation feedback:

```typescript
interface GenerationProgress {
  stage: 'queued' | 'processing' | 'generating' | 'post-processing' | 'complete';
  progress: number;  // 0-100
  previewUrl?: string;  // Low-res preview when available
  estimatedTimeRemaining?: number;  // seconds
}
```

---

## Phase 3: Post-Generation & Iteration

### 3.1 Edit Interface with Thought Signatures

**The Edit Flow**:

```typescript
async function editGeneration(generationId: string, editPrompt: string): Promise<GenerationResult> {
  // 1. Load parent generation
  const parent = await db.get('generations', generationId);
  if (!parent.canEdit) throw new Error('This generation cannot be edited');
  
  // 2. Parse stored conversation history (includes thought signatures)
  const history = JSON.parse(parent.conversationHistory);
  
  // 3. Append edit request to history
  history.push({
    role: 'user',
    parts: [{ text: editPrompt }]
  });
  
  // 4. Call Gemini with FULL history (preserves thought signatures)
  const response = await gemini.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: history,
    generationConfig: {
      responseModalities: ['TEXT', 'IMAGE']
    }
  });
  
  // 5. Update history with response
  history.push(response.candidates[0].content);
  
  // 6. Create new generation record (preserves edit chain)
  const newGeneration = {
    id: generateId(),
    imageUrl: await saveImage(response.image),
    prompt: parent.prompt,  // Original prompt
    editPrompt: editPrompt,
    parentGenerationId: parent.id,
    conversationHistory: JSON.stringify(history),
    canEdit: true,
    editCount: parent.editCount + 1
  };
  
  await db.insert('generations', newGeneration);
  return newGeneration;
}
```

### 3.2 Quick Edit Presets

Pre-defined edit operations for one-click adjustments:

```typescript
const quickEditPresets = {
  // Lighting adjustments
  lighting: [
    { id: 'warmer', prompt: 'Make the lighting warmer and more golden', icon: '🌅' },
    { id: 'cooler', prompt: 'Make the lighting cooler and more blue-toned', icon: '❄️' },
    { id: 'brighter', prompt: 'Increase overall brightness', icon: '☀️' },
    { id: 'dramatic', prompt: 'Add more dramatic contrast and shadows', icon: '🎭' },
    { id: 'soft', prompt: 'Soften the lighting for a more gentle look', icon: '🌸' }
  ],
  
  // Composition adjustments
  composition: [
    { id: 'zoom_in', prompt: 'Zoom in closer to the main subject', icon: '🔍' },
    { id: 'zoom_out', prompt: 'Zoom out to show more context', icon: '🔭' },
    { id: 'blur_bg', prompt: 'Blur the background more for focus on subject', icon: '📷' },
    { id: 'sharpen', prompt: 'Sharpen the image and add more detail', icon: '✨' }
  ],
  
  // Style adjustments
  style: [
    { id: 'more_professional', prompt: 'Make it look more professional and polished', icon: '💼' },
    { id: 'more_vibrant', prompt: 'Increase color vibrancy and saturation', icon: '🎨' },
    { id: 'more_minimal', prompt: 'Simplify the composition, more minimal', icon: '⬜' },
    { id: 'more_dynamic', prompt: 'Add more energy and dynamic feeling', icon: '⚡' }
  ],
  
  // Industry-specific (construction/steel)
  industry: [
    { id: 'steel_prominent', prompt: 'Make the steel/metal elements more prominent', icon: '🔩' },
    { id: 'safety_visible', prompt: 'Ensure safety equipment is clearly visible', icon: '🦺' },
    { id: 'industrial_feel', prompt: 'Enhance the industrial aesthetic', icon: '🏭' },
    { id: 'quality_focus', prompt: 'Emphasize the quality and precision of materials', icon: '✅' }
  ],
  
  // Social media optimization
  social: [
    { id: 'text_space', prompt: 'Create more empty space for text overlay', icon: '📝' },
    { id: 'attention_grabbing', prompt: 'Make it more eye-catching and scroll-stopping', icon: '👀' },
    { id: 'human_element', prompt: 'Add or emphasize human presence/activity', icon: '👷' }
  ]
};
```

### 3.3 Edit History & Version Comparison

Track and visualize the edit chain:

```typescript
interface EditHistoryView {
  generations: GenerationResult[];
  
  // Visual comparison
  compareMode: 'side_by_side' | 'slider' | 'overlay';
  selectedVersions: [string, string];  // Two generation IDs to compare
  
  // Revert capability
  canRevertTo: (generationId: string) => boolean;
}

async function getEditHistory(generationId: string): Promise<GenerationResult[]> {
  const history: GenerationResult[] = [];
  let current = await db.get('generations', generationId);
  
  // Walk back through parent chain
  while (current) {
    history.unshift(current);
    if (current.parentGenerationId) {
      current = await db.get('generations', current.parentGenerationId);
    } else {
      current = null;
    }
  }
  
  return history;
}
```

---

## Phase 4: Multi-Platform Optimization

### 4.1 Platform-Specific Aspect Ratios (2025)

**Critical for social media success**:

```typescript
const platformSpecs = {
  // Instagram
  instagram_feed_square: { width: 1080, height: 1080, ratio: '1:1', name: 'Instagram Feed (Square)' },
  instagram_feed_portrait: { width: 1080, height: 1350, ratio: '4:5', name: 'Instagram Feed (Portrait)' },
  instagram_feed_landscape: { width: 1080, height: 566, ratio: '1.91:1', name: 'Instagram Feed (Landscape)' },
  instagram_story: { width: 1080, height: 1920, ratio: '9:16', name: 'Instagram Story/Reel' },
  instagram_grid: { width: 1012, height: 1350, ratio: '3:4', name: 'Instagram Grid (New 2025)' },
  
  // LinkedIn
  linkedin_post_landscape: { width: 1200, height: 627, ratio: '1.91:1', name: 'LinkedIn Post (Landscape)' },
  linkedin_post_square: { width: 1080, height: 1080, ratio: '1:1', name: 'LinkedIn Post (Square)' },
  linkedin_post_portrait: { width: 1080, height: 1350, ratio: '4:5', name: 'LinkedIn Post (Portrait)' },
  linkedin_article_cover: { width: 1920, height: 1080, ratio: '16:9', name: 'LinkedIn Article Cover' },
  linkedin_company_cover: { width: 1128, height: 191, ratio: '6:1', name: 'LinkedIn Company Cover' },
  
  // Facebook
  facebook_post: { width: 1200, height: 630, ratio: '1.91:1', name: 'Facebook Post' },
  facebook_story: { width: 1080, height: 1920, ratio: '9:16', name: 'Facebook Story' },
  facebook_cover: { width: 820, height: 312, ratio: '2.63:1', name: 'Facebook Cover' },
  
  // Twitter/X
  twitter_post: { width: 1200, height: 675, ratio: '16:9', name: 'X/Twitter Post' },
  twitter_post_square: { width: 1200, height: 1200, ratio: '1:1', name: 'X/Twitter Post (Square)' },
  twitter_header: { width: 1500, height: 500, ratio: '3:1', name: 'X/Twitter Header' },
  
  // Pinterest
  pinterest_pin: { width: 1000, height: 1500, ratio: '2:3', name: 'Pinterest Pin' },
  pinterest_long_pin: { width: 1000, height: 2100, ratio: '1:2.1', name: 'Pinterest Long Pin' },
  
  // TikTok
  tiktok_video: { width: 1080, height: 1920, ratio: '9:16', name: 'TikTok Video' },
  
  // YouTube
  youtube_thumbnail: { width: 1280, height: 720, ratio: '16:9', name: 'YouTube Thumbnail' },
  youtube_banner: { width: 2560, height: 1440, ratio: '16:9', name: 'YouTube Banner' },
  
  // Universal
  universal_square: { width: 1200, height: 1200, ratio: '1:1', name: 'Universal Square' },
  universal_landscape: { width: 1200, height: 630, ratio: '1.91:1', name: 'Universal Landscape' }
};

// Gemini aspect ratio mappings
const geminiAspectRatios = {
  '1:1': '1:1',
  '4:5': '4:5',
  '3:4': '3:4',
  '9:16': '9:16',
  '16:9': '16:9',
  '1.91:1': '16:9',  // Closest match
  '2:3': '2:3',
  '3:2': '3:2'
};
```

### 4.2 Auto-Resize for Multiple Platforms

Generate one image, export to multiple sizes:

```typescript
interface MultiPlatformExport {
  sourceGenerationId: string;
  targetPlatforms: Platform[];
  
  // How to handle different ratios
  resizeStrategy: 'crop_center' | 'crop_smart' | 'regenerate' | 'extend';
  
  // Smart cropping uses AI to identify focal point
  focalPoint?: { x: number; y: number };
}

async function exportToMultiplePlatforms(config: MultiPlatformExport): Promise<ExportResult[]> {
  const results: ExportResult[] = [];
  const source = await db.get('generations', config.sourceGenerationId);
  
  for (const platform of config.targetPlatforms) {
    const spec = platformSpecs[platform];
    
    if (config.resizeStrategy === 'regenerate') {
      // Re-generate with new aspect ratio (uses thought signatures!)
      const result = await editGeneration(
        source.id,
        `Recreate this image with a ${spec.ratio} aspect ratio, optimized for ${spec.name}`
      );
      results.push({ platform, generationId: result.id, url: result.imageUrl });
    } else {
      // Crop/resize existing image
      const resizedUrl = await resizeImage(source.imageUrl, spec, config.focalPoint);
      results.push({ platform, generationId: source.id, url: resizedUrl });
    }
  }
  
  return results;
}
```

### 4.3 Platform-Specific Safe Zones

Account for UI elements that overlay images:

```typescript
const platformSafeZones = {
  instagram_story: {
    top: 250,      // Profile picture, username
    bottom: 340,   // CTA buttons, swipe up
    left: 64,
    right: 64
  },
  instagram_feed: {
    top: 0,
    bottom: 0,
    left: 0,
    right: 0  // Feed posts have no overlay
  },
  facebook_story: {
    top: 250,
    bottom: 640,   // 14% top, 35% bottom as per Meta guidelines
    left: 64,
    right: 64
  },
  tiktok_video: {
    top: 150,
    bottom: 300,   // Comment/share buttons
    right: 100     // Action buttons on right
  }
};
```

---

## Phase 5: Workflow & Batch Processing

### 5.1 Content Calendar Integration

Plan and batch-generate content:

```typescript
interface ContentCalendarEntry {
  id: string;
  scheduledDate: Date;
  platform: Platform;
  
  // Content
  promptTemplate: string;
  variables: Record<string, string>;  // Fill in template variables
  
  // Generation status
  status: 'planned' | 'generating' | 'generated' | 'approved' | 'scheduled' | 'published';
  generationId?: string;
  
  // Approval workflow
  approvedBy?: string;
  approvedAt?: Date;
  
  // Publishing
  publishedAt?: Date;
  publishedUrl?: string;
}
```

### 5.2 Batch Generation

Generate multiple images in one operation:

```typescript
interface BatchGenerationRequest {
  // Template-based batch
  template: PromptTemplate;
  variations: Array<{
    variables: Record<string, string>;
    platforms: Platform[];
  }>;
  
  // Or CSV-based batch
  csvData?: {
    headers: string[];
    rows: string[][];
    promptColumn: string;
    platformColumn: string;
  };
  
  // Batch settings
  batchSize: number;  // How many to process concurrently
  priorityOrder: 'fifo' | 'platform' | 'date';
}

async function processBatch(request: BatchGenerationRequest): Promise<BatchResult> {
  const jobs: GenerationJob[] = [];
  
  // Create jobs from variations
  for (const variation of request.variations) {
    const prompt = fillTemplate(request.template, variation.variables);
    
    for (const platform of variation.platforms) {
      jobs.push({
        id: generateId(),
        prompt,
        platform,
        aspectRatio: platformSpecs[platform].ratio,
        status: 'queued'
      });
    }
  }
  
  // Process in batches
  const results: GenerationResult[] = [];
  for (let i = 0; i < jobs.length; i += request.batchSize) {
    const batch = jobs.slice(i, i + request.batchSize);
    const batchResults = await Promise.all(
      batch.map(job => generateSingle(job.prompt, [], { aspectRatio: job.aspectRatio }))
    );
    results.push(...batchResults);
    
    // Progress callback
    await reportProgress({
      completed: results.length,
      total: jobs.length,
      currentBatch: Math.floor(i / request.batchSize) + 1
    });
  }
  
  return { jobs, results };
}
```

### 5.3 Project/Campaign Organization

Group related generations:

```typescript
interface Project {
  id: string;
  name: string;
  description?: string;
  
  // Brand settings
  brandKitId?: string;
  defaultStyle?: StylePreset;
  
  // Content
  generations: GenerationResult[];
  folders: ProjectFolder[];
  
  // Collaboration
  members: ProjectMember[];
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  status: 'active' | 'archived';
}

interface ProjectFolder {
  id: string;
  name: string;
  generationIds: string[];
  subfolders: ProjectFolder[];
}
```

---

## Phase 6: Analytics & A/B Testing

### 6.1 Generation Analytics

Track what works:

```typescript
interface GenerationAnalytics {
  generationId: string;
  
  // Usage metrics
  views: number;
  downloads: number;
  shares: number;
  edits: number;
  
  // Quality metrics
  userRating?: 1 | 2 | 3 | 4 | 5;
  wasApproved: boolean;
  wasPublished: boolean;
  
  // Social performance (if integrated)
  socialMetrics?: {
    platform: Platform;
    impressions: number;
    engagement: number;
    clicks: number;
    saves: number;
  };
  
  // A/B test results
  abTestId?: string;
  abTestWinner?: boolean;
}
```

### 6.2 A/B Test Framework

Test different approaches:

```typescript
interface ABTest {
  id: string;
  name: string;
  
  // What we're testing
  hypothesis: string;
  variable: 'lighting' | 'composition' | 'style' | 'color' | 'custom';
  
  // Variants
  variants: Array<{
    id: string;
    name: string;
    generationId: string;
    description: string;
  }>;
  
  // Results
  status: 'running' | 'completed' | 'cancelled';
  winnerId?: string;
  confidence?: number;  // Statistical confidence
  
  // Metrics to compare
  primaryMetric: 'engagement' | 'clicks' | 'saves' | 'user_rating';
}

async function createABTest(config: ABTestConfig): Promise<ABTest> {
  // Generate variants for each test condition
  const variants = await Promise.all(
    config.conditions.map(async (condition) => {
      const generation = await generateSingle(
        modifyPromptForCondition(config.basePrompt, condition),
        config.referenceImages
      );
      return {
        id: generateId(),
        name: condition.name,
        generationId: generation.id,
        description: condition.description
      };
    })
  );
  
  return {
    id: generateId(),
    name: config.name,
    hypothesis: config.hypothesis,
    variable: config.variable,
    variants,
    status: 'running'
  };
}
```

### 6.3 Prompt Performance Tracking

Learn from successful generations:

```typescript
interface PromptPerformance {
  promptHash: string;  // Hash of normalized prompt
  prompt: string;
  
  // Usage stats
  timesUsed: number;
  avgRating: number;
  approvalRate: number;
  
  // Performance by platform
  platformPerformance: Record<Platform, {
    avgEngagement: number;
    avgClicks: number;
    sampleSize: number;
  }>;
  
  // Successful variations
  topVariations: string[];  // Best-performing edit prompts
}

// Recommend prompts based on performance
async function getRecommendedPrompts(context: {
  platform: Platform;
  industry?: string;
  style?: string;
}): Promise<PromptRecommendation[]> {
  return db.query('prompt_performance', {
    where: {
      platform: context.platform,
      avgRating: { gt: 4 },
      approvalRate: { gt: 0.8 }
    },
    orderBy: 'avgEngagement',
    limit: 10
  });
}
```

---

## Phase 7: Advanced Features

### 7.1 AI-Powered Alt Text Generation

Accessibility and SEO:

```typescript
async function generateAltText(generationId: string): Promise<string> {
  const generation = await db.get('generations', generationId);
  
  const response = await gemini.generateContent({
    model: 'gemini-3-pro',
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'image/png', data: await imageToBase64(generation.imageUrl) } },
        { text: `Generate concise, descriptive alt text for this image for accessibility. 
                 Focus on: main subject, action, setting, and key visual elements.
                 Keep it under 125 characters.
                 Do not start with "Image of" or "Picture of".` }
      ]
    }]
  });
  
  return response.candidates[0].content.parts[0].text;
}
```

### 7.2 Smart Caption Suggestions

Generate social media captions to accompany images:

```typescript
interface CaptionRequest {
  generationId: string;
  platform: Platform;
  tone: 'professional' | 'casual' | 'enthusiastic' | 'informative';
  includeHashtags: boolean;
  includeCTA: boolean;
  maxLength?: number;
}

async function generateCaption(request: CaptionRequest): Promise<CaptionSuggestion[]> {
  const generation = await db.get('generations', request.generationId);
  
  const platformGuidelines = {
    instagram: { maxLength: 2200, hashtagCount: '5-15', tone: 'engaging and visual' },
    linkedin: { maxLength: 3000, hashtagCount: '3-5', tone: 'professional and insightful' },
    twitter: { maxLength: 280, hashtagCount: '1-2', tone: 'concise and punchy' },
    facebook: { maxLength: 500, hashtagCount: '0-3', tone: 'conversational' }
  };
  
  const response = await gemini.generateContent({
    model: 'gemini-3-pro',
    contents: [{
      role: 'user',
      parts: [
        { inlineData: { mimeType: 'image/png', data: await imageToBase64(generation.imageUrl) } },
        { text: `Generate 3 caption options for this image on ${request.platform}.
                 
                 Guidelines:
                 - Tone: ${request.tone}
                 - Max length: ${request.maxLength || platformGuidelines[request.platform].maxLength}
                 - ${request.includeHashtags ? `Include ${platformGuidelines[request.platform].hashtagCount} relevant hashtags` : 'No hashtags'}
                 - ${request.includeCTA ? 'Include a call-to-action' : 'No CTA needed'}
                 
                 Original image prompt: ${generation.prompt}
                 
                 Return as JSON array: [{ "caption": "...", "hashtags": [...] }]` }
      ]
    }]
  });
  
  return JSON.parse(response.candidates[0].content.parts[0].text);
}
```

### 7.3 Watermark & Branding Overlay

Auto-apply brand elements:

```typescript
interface BrandOverlay {
  logoUrl?: string;
  logoPosition: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  logoOpacity: number;  // 0-1
  logoSize: 'small' | 'medium' | 'large';
  
  // Text overlay
  textOverlay?: {
    text: string;
    font: string;
    color: string;
    position: 'top' | 'bottom' | 'center';
    style: 'solid' | 'gradient' | 'shadow';
  };
  
  // Color overlay
  colorOverlay?: {
    color: string;
    opacity: number;
    blendMode: 'multiply' | 'overlay' | 'soft-light';
  };
}
```

### 7.4 Template Locking & Consistency

Ensure brand consistency across generations:

```typescript
interface LockedTemplate {
  id: string;
  name: string;
  
  // Locked elements (cannot be changed by users)
  locked: {
    styleGuide: string;      // Always appended to prompts
    colorPalette: string[];  // Must use these colors
    composition?: string;    // Fixed composition rules
    avoidList: string[];     // Never include these
  };
  
  // Variable elements (user can customize)
  variables: Array<{
    name: string;
    type: 'text' | 'select' | 'color';
    options?: string[];
    default?: string;
    required: boolean;
  }>;
}
```

### 7.5 Favorite & Quick Access

Power user features:

```typescript
interface UserPreferences {
  // Favorites
  favoriteTemplates: string[];
  favoriteGenerations: string[];
  favoriteEditPresets: string[];
  
  // Recent
  recentPrompts: string[];
  recentPlatforms: Platform[];
  
  // Defaults
  defaultPlatform: Platform;
  defaultStyle: string;
  defaultBrandKitId?: string;
  
  // Keyboard shortcuts
  shortcuts: Record<string, string>;
}
```

---

## Implementation Roadmap

### Priority 1: Core Edit Functionality (Week 1)
- [x] Database schema updates (conversation_history, parent_generation_id, edit_prompt)
- [ ] Modified generate endpoint with thought signature storage
- [ ] New edit endpoint POST `/api/generations/:id/edit`
- [ ] Basic edit UI with text input
- [ ] Quick edit presets (lighting, composition, style)

### Priority 2: Multi-Variation Generation (Week 2)
- [ ] Generate 3-6 variations per request
- [ ] Variation selection UI (grid view, compare mode)
- [ ] A/B test variant generation
- [ ] Favorite/select best variation

### Priority 3: Platform Optimization (Week 3)
- [ ] Platform selector with aspect ratio presets
- [ ] Auto-resize for multiple platforms
- [ ] Safe zone visualization
- [ ] Platform-specific export

### Priority 4: Prompt Builder & Templates (Week 4)
- [ ] Structured prompt builder UI
- [ ] Template library (10+ templates)
- [ ] Variable substitution system
- [ ] Brand kit integration

### Priority 5: Workflow Features (Week 5-6)
- [ ] Project organization
- [ ] Batch generation
- [ ] Content calendar integration
- [ ] Version history & comparison

### Priority 6: Analytics & Advanced (Week 7-8)
- [ ] Generation analytics tracking
- [ ] A/B test framework
- [ ] Prompt performance tracking
- [ ] Alt text generation
- [ ] Caption suggestions

---

## Database Schema

```sql
-- Core tables
CREATE TABLE generations (
  id TEXT PRIMARY KEY,
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'gemini-3-pro-image-preview',
  
  -- Thought signature preservation (CRITICAL)
  conversation_history JSONB NOT NULL,
  can_edit BOOLEAN DEFAULT true,
  
  -- Edit chain
  parent_generation_id TEXT REFERENCES generations(id),
  edit_prompt TEXT,
  edit_count INTEGER DEFAULT 0,
  
  -- Variation info
  variation_type TEXT,  -- 'ab_test', 'diverse', 'similar'
  variation_group_id TEXT,
  tested_variable TEXT,
  tested_value TEXT,
  
  -- Platform targeting
  target_platform TEXT,
  aspect_ratio TEXT,
  
  -- Organization
  project_id TEXT REFERENCES projects(id),
  folder_id TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE prompt_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  template TEXT NOT NULL,
  defaults JSONB,
  platforms TEXT[],
  category TEXT,
  is_locked BOOLEAN DEFAULT false,
  locked_elements JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE brand_kits (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  primary_colors TEXT[],
  secondary_colors TEXT[],
  fonts TEXT[],
  style_guide TEXT,
  avoid_list TEXT[],
  logo_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  brand_kit_id TEXT REFERENCES brand_kits(id),
  status TEXT DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ab_tests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hypothesis TEXT,
  variable TEXT NOT NULL,
  variants JSONB NOT NULL,
  status TEXT DEFAULT 'running',
  winner_id TEXT,
  confidence DECIMAL,
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);

CREATE TABLE generation_analytics (
  id TEXT PRIMARY KEY,
  generation_id TEXT REFERENCES generations(id),
  views INTEGER DEFAULT 0,
  downloads INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  user_rating INTEGER,
  was_approved BOOLEAN,
  was_published BOOLEAN,
  social_metrics JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_generations_parent ON generations(parent_generation_id);
CREATE INDEX idx_generations_project ON generations(project_id);
CREATE INDEX idx_generations_platform ON generations(target_platform);
CREATE INDEX idx_generations_variation_group ON generations(variation_group_id);
```

---

## API Endpoints

```typescript
// Generation
POST   /api/generate              // Generate with variations
POST   /api/generations/:id/edit  // Edit with thought signatures
GET    /api/generations/:id       // Get generation details
GET    /api/generations/:id/history  // Get edit chain
DELETE /api/generations/:id       // Delete generation

// Variations
POST   /api/generate/variations   // Generate multiple variations
GET    /api/variations/:groupId   // Get all variations in group
POST   /api/variations/:groupId/select  // Select best variation

// Templates
GET    /api/templates             // List templates
GET    /api/templates/:id         // Get template
POST   /api/templates             // Create template
PUT    /api/templates/:id         // Update template

// Brand Kits
GET    /api/brand-kits            // List brand kits
POST   /api/brand-kits            // Create brand kit
PUT    /api/brand-kits/:id        // Update brand kit

// Projects
GET    /api/projects              // List projects
POST   /api/projects              // Create project
GET    /api/projects/:id/generations  // Get project generations

// Export
POST   /api/generations/:id/export    // Export to format
POST   /api/generations/:id/resize    // Resize for platforms

// Batch
POST   /api/batch/generate        // Batch generation
GET    /api/batch/:id/status      // Batch status

// Analytics
GET    /api/analytics/generations     // Generation analytics
GET    /api/analytics/prompts         // Prompt performance
POST   /api/ab-tests                  // Create A/B test
GET    /api/ab-tests/:id/results      // A/B test results

// AI Features
POST   /api/generations/:id/alt-text  // Generate alt text
POST   /api/generations/:id/caption   // Generate caption
```

---

## Frontend Components

```typescript
// Core Components
<PromptBuilder />           // Structured prompt building
<TemplateSelector />        // Browse and select templates
<VariationGrid />           // View/select variations
<EditPanel />               // Quick edit presets + custom edit
<VersionHistory />          // Edit chain visualization
<PlatformSelector />        // Choose target platform
<AspectRatioPreview />      // Preview how image will look

// Advanced Components
<BatchGenerator />          // Batch generation interface
<ABTestCreator />           // Create A/B tests
<AnalyticsDashboard />      // View performance metrics
<BrandKitEditor />          // Manage brand settings
<ProjectOrganizer />        // Organize generations into projects

// Export Components
<MultiPlatformExport />     // Export to multiple sizes
<SafeZoneOverlay />         // Visualize safe zones
<CaptionGenerator />        // AI caption suggestions
```

---

## Summary: What Makes This World-Class

1. **Thought Signature Preservation**: The absolute best practice for AI image editing
2. **Multi-Variation Generation**: Never settle for one option
3. **Platform Intelligence**: Auto-optimize for every social network
4. **Structured Prompts**: Templates and builders for consistency
5. **Edit Chains**: Iterate intelligently, not from scratch
6. **A/B Testing Built-In**: Data-driven creative decisions
7. **Batch Processing**: Scale content creation
8. **Analytics Integration**: Learn what works
9. **Brand Consistency**: Lock styles and maintain identity
10. **AI-Powered Extras**: Alt text, captions, smart cropping

This transforms a basic image generator into a **professional social media content creation platform**.
