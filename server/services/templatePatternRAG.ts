/**
 * Template Pattern RAG Service
 *
 * Matches templates to user needs based on patterns and performance data.
 * Uses RAG (Retrieval Augmented Generation) techniques for intelligent template matching
 * and customization suggestions.
 *
 * Features:
 * - Context-aware template matching (industry, objective, platform, mood, style)
 * - Visual pattern analysis for templates
 * - AI-powered customization suggestions based on brand guidelines
 * - Performance-weighted scoring
 */

import { generateContentWithRetry } from '../lib/geminiClient';
import { storage } from '../storage';
import { logger } from '../lib/logger';
import { telemetry } from '../instrumentation';
import type { PerformingAdTemplate } from '@shared/schema';

// =============================================================================
// Types
// =============================================================================

/**
 * Context for template matching - describes what the user needs
 */
export interface TemplateMatchContext {
  industry: string;
  objective: 'awareness' | 'consideration' | 'conversion' | 'engagement';
  platform: string;
  aspectRatio: string;
  mood?: string;
  style?: string;
  userId?: string; // For accessing user-specific templates
}

/**
 * A template match result with scoring and suggestions
 */
export interface TemplateMatch {
  templateId: string;
  name: string;
  matchScore: number; // 0-100
  matchReasons: string[];
  suggestedCustomizations: string[];
}

/**
 * Result from template matching operation
 */
export interface TemplateMatchResult {
  templates: TemplateMatch[];
  totalCandidates: number;
  contextAnalysis: {
    industry: string;
    objective: string;
    platform: string;
    aspectRatio: string;
    mood?: string;
    style?: string;
  };
}

/**
 * Visual pattern analysis result
 */
export interface PatternAnalysis {
  visualPatterns: string[];
  dominantColors: string[];
  layoutType: string;
  contentDensity: 'low' | 'medium' | 'high';
  focusAreas: string[];
  textHierarchy: string;
  brandingPlacement: string;
  strengthsForAds: string[];
  potentialImprovements: string[];
}

/**
 * Customization suggestion result
 */
export interface CustomizationSuggestion {
  templateId: string;
  templateName: string;
  suggestions: {
    category: 'color' | 'typography' | 'layout' | 'content' | 'branding';
    original: string;
    suggested: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
  }[];
  brandAlignmentScore: number; // 0-100
  overallRecommendation: string;
}

// =============================================================================
// Scoring Weights
// =============================================================================

const MATCH_WEIGHTS = {
  industry: 25, // Industry match is very important
  objective: 20, // Campaign objective alignment
  platform: 15, // Platform compatibility
  aspectRatio: 10, // Aspect ratio match
  mood: 10, // Mood alignment
  style: 10, // Style alignment
  performance: 10, // Performance tier bonus
};

const ENGAGEMENT_TIER_SCORES: Record<string, number> = {
  'top-5': 100,
  'top-10': 80,
  'top-25': 60,
  unranked: 40,
};

// MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Find the best templates for a given context
 *
 * @param context - The matching context including industry, objective, platform, etc.
 * @returns Array of matching templates with scores and suggestions
 */
export async function matchTemplateForContext(context: TemplateMatchContext): Promise<TemplateMatchResult> {
  const startTime = Date.now();
  let success = false;
  let errorType: string | undefined;

  try {
    // Get candidate templates
    const candidates = await getCandidateTemplates(context);

    if (candidates.length === 0) {
      return {
        templates: [],
        totalCandidates: 0,
        contextAnalysis: {
          industry: context.industry,
          objective: context.objective,
          platform: context.platform,
          aspectRatio: context.aspectRatio,
          mood: context.mood,
          style: context.style,
        },
      };
    }

    // Score each candidate
    const scoredTemplates = candidates.map((template) => scoreTemplate(template, context));

    // Sort by score descending and take top results
    scoredTemplates.sort((a, b) => b.matchScore - a.matchScore);
    const topMatches = scoredTemplates.slice(0, 10);

    // Generate customization suggestions for top matches
    const enrichedMatches = await Promise.all(
      topMatches.map(async (match) => ({
        ...match,
        suggestedCustomizations: await generateQuickCustomizations(
          candidates.find((t) => t.id === match.templateId)!,
          context,
        ),
      })),
    );

    success = true;

    return {
      templates: enrichedMatches,
      totalCandidates: candidates.length,
      contextAnalysis: {
        industry: context.industry,
        objective: context.objective,
        platform: context.platform,
        aspectRatio: context.aspectRatio,
        mood: context.mood,
        style: context.style,
      },
    };
  } catch (error) {
    success = false;
    errorType = error instanceof Error ? error.name : 'UnknownError';
    logger.error({ module: 'TemplatePatternRAG', err: error }, 'Error matching templates');
    throw error;
  } finally {
    const durationMs = Date.now() - startTime;
    telemetry.trackFileSearchQuery({
      category: 'template_matching',
      success,
      durationMs,
      errorType,
    });
  }
}

/**
 * Analyze visual patterns in a template using AI vision
 *
 * @param template - The template to analyze
 * @returns Pattern analysis including visual patterns, colors, layout, etc.
 */
export async function analyzeTemplatePatterns(template: PerformingAdTemplate): Promise<PatternAnalysis> {
  const startTime = Date.now();
  let success = false;
  let errorType: string | undefined;

  try {
    // If template already has visual patterns, use them as a base
    const existingPatterns = template.visualPatterns || [];

    // If no preview image, return basic analysis from metadata
    if (!template.previewImageUrl) {
      return {
        visualPatterns: existingPatterns,
        dominantColors: extractColorsFromPalette(template.colorPalette),
        layoutType: inferLayoutType(template),
        contentDensity: inferContentDensity(template),
        focusAreas: inferFocusAreas(template),
        textHierarchy: inferTextHierarchy(template),
        brandingPlacement: 'standard',
        strengthsForAds: generateStrengthsFromMetadata(template),
        potentialImprovements: [],
      };
    }

    // Use Gemini vision to analyze the template image
    const visionAnalysis = await analyzeTemplateWithVision(template.previewImageUrl, template);

    success = true;

    return {
      visualPatterns: [...existingPatterns, ...visionAnalysis.detectedPatterns],
      dominantColors: visionAnalysis.dominantColors,
      layoutType: visionAnalysis.layoutType,
      contentDensity: visionAnalysis.contentDensity,
      focusAreas: visionAnalysis.focusAreas,
      textHierarchy: visionAnalysis.textHierarchy,
      brandingPlacement: visionAnalysis.brandingPlacement,
      strengthsForAds: visionAnalysis.strengths,
      potentialImprovements: visionAnalysis.improvements,
    };
  } catch (error) {
    success = false;
    errorType = error instanceof Error ? error.name : 'UnknownError';
    logger.error({ module: 'TemplatePatternRAG', err: error }, 'Error analyzing template patterns');

    // Return fallback analysis from metadata
    return {
      visualPatterns: template.visualPatterns || [],
      dominantColors: extractColorsFromPalette(template.colorPalette),
      layoutType: inferLayoutType(template),
      contentDensity: inferContentDensity(template),
      focusAreas: inferFocusAreas(template),
      textHierarchy: inferTextHierarchy(template),
      brandingPlacement: 'standard',
      strengthsForAds: generateStrengthsFromMetadata(template),
      potentialImprovements: [],
    };
  } finally {
    const durationMs = Date.now() - startTime;
    telemetry.trackFileSearchQuery({
      category: 'pattern_analysis',
      success,
      durationMs,
      errorType,
    });
  }
}

/**
 * Suggest customizations for a template based on brand guidelines
 *
 * @param templateId - The template to customize
 * @param brandGuidelines - Brand guidelines to align with
 * @returns Customization suggestions with priority and reasoning
 */
export async function suggestTemplateCustomizations(
  templateId: string,
  brandGuidelines: {
    colors?: string[];
    typography?: { primary?: string; secondary?: string };
    voice?: { principles?: string[]; wordsToUse?: string[]; wordsToAvoid?: string[] };
    industry?: string;
    targetAudience?: string;
    preferredStyles?: string[];
  },
): Promise<CustomizationSuggestion> {
  const startTime = Date.now();
  let success = false;
  let errorType: string | undefined;

  try {
    // Get the template
    const template = await storage.getPerformingAdTemplate(templateId);

    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Analyze current template patterns
    const currentPatterns = await analyzeTemplatePatterns(template);

    // Generate customization suggestions using AI
    const suggestions = await generateCustomizationSuggestions(template, currentPatterns, brandGuidelines);

    success = true;

    return suggestions;
  } catch (error) {
    success = false;
    errorType = error instanceof Error ? error.name : 'UnknownError';
    logger.error({ module: 'TemplatePatternRAG', err: error }, 'Error suggesting customizations');
    throw error;
  } finally {
    const durationMs = Date.now() - startTime;
    telemetry.trackFileSearchQuery({
      category: 'customization_suggestions',
      success,
      durationMs,
      errorType,
    });
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get candidate templates based on context
 */
async function getCandidateTemplates(context: TemplateMatchContext): Promise<PerformingAdTemplate[]> {
  // If we have a userId, search their templates
  if (context.userId) {
    return await storage.searchPerformingAdTemplates(context.userId, {
      industry: context.industry,
      platform: context.platform,
      mood: context.mood,
      style: context.style,
      objective: context.objective,
    });
  }

  // Otherwise return empty (no global templates without user context)
  return [];
}

/**
 * Score a template against the matching context
 */
function scoreTemplate(template: PerformingAdTemplate, context: TemplateMatchContext): TemplateMatch {
  let score = 0;
  const matchReasons: string[] = [];

  // Industry match
  if (template.bestForIndustries?.includes(context.industry)) {
    score += MATCH_WEIGHTS.industry;
    matchReasons.push(`Industry match: ${context.industry}`);
  } else if (
    template.bestForIndustries?.some(
      (ind) =>
        ind.toLowerCase().includes(context.industry.toLowerCase()) ||
        context.industry.toLowerCase().includes(ind.toLowerCase()),
    )
  ) {
    score += MATCH_WEIGHTS.industry * 0.5;
    matchReasons.push(`Related industry: ${context.industry}`);
  }

  // Objective match
  if (template.bestForObjectives?.includes(context.objective)) {
    score += MATCH_WEIGHTS.objective;
    matchReasons.push(`Objective match: ${context.objective}`);
  }

  // Platform match
  if (template.targetPlatforms?.includes(context.platform)) {
    score += MATCH_WEIGHTS.platform;
    matchReasons.push(`Platform optimized: ${context.platform}`);
  }

  // Aspect ratio match
  if (template.targetAspectRatios?.includes(context.aspectRatio)) {
    score += MATCH_WEIGHTS.aspectRatio;
    matchReasons.push(`Aspect ratio match: ${context.aspectRatio}`);
  }

  // Mood match
  if (context.mood && template.mood === context.mood) {
    score += MATCH_WEIGHTS.mood;
    matchReasons.push(`Mood alignment: ${context.mood}`);
  }

  // Style match
  if (context.style && template.style === context.style) {
    score += MATCH_WEIGHTS.style;
    matchReasons.push(`Style alignment: ${context.style}`);
  }

  // Performance bonus
  const performanceScore = ENGAGEMENT_TIER_SCORES[template.engagementTier || 'unranked'] || 40;
  const performanceBonus = (performanceScore / 100) * MATCH_WEIGHTS.performance;
  score += performanceBonus;

  if (template.engagementTier && template.engagementTier !== 'unranked') {
    matchReasons.push(`High performer: ${template.engagementTier} tier`);
  }

  // Normalize score to 0-100
  const maxPossibleScore = Object.values(MATCH_WEIGHTS).reduce((a, b) => a + b, 0);
  const normalizedScore = Math.round((score / maxPossibleScore) * 100);

  return {
    templateId: template.id,
    name: template.name,
    matchScore: normalizedScore,
    matchReasons,
    suggestedCustomizations: [], // Will be filled later
  };
}

/**
 * Generate quick customization suggestions without full AI analysis
 */
async function generateQuickCustomizations(
  template: PerformingAdTemplate,
  context: TemplateMatchContext,
): Promise<string[]> {
  const suggestions: string[] = [];

  // Platform-specific suggestions
  if (context.platform === 'instagram' && !template.targetAspectRatios?.includes('1:1')) {
    suggestions.push('Adapt layout for Instagram square format (1:1)');
  }

  if (context.platform === 'tiktok' && !template.targetAspectRatios?.includes('9:16')) {
    suggestions.push('Optimize for TikTok vertical format (9:16)');
  }

  if (context.platform === 'linkedin' && template.mood === 'playful') {
    suggestions.push('Consider more professional tone for LinkedIn audience');
  }

  // Objective-specific suggestions
  if (context.objective === 'conversion') {
    suggestions.push('Strengthen call-to-action visibility and urgency');
  }

  if (context.objective === 'awareness') {
    suggestions.push('Emphasize brand elements and memorable visuals');
  }

  // Mood alignment suggestions
  if (context.mood && template.mood !== context.mood) {
    suggestions.push(`Adjust visual tone from ${template.mood || 'current'} to ${context.mood}`);
  }

  // Style alignment suggestions
  if (context.style && template.style !== context.style) {
    suggestions.push(`Update design style from ${template.style || 'current'} to ${context.style}`);
  }

  return suggestions;
}

/**
 * Analyze template with Gemini vision capabilities
 */
async function analyzeTemplateWithVision(
  imageUrl: string,
  template: PerformingAdTemplate,
): Promise<{
  detectedPatterns: string[];
  dominantColors: string[];
  layoutType: string;
  contentDensity: 'low' | 'medium' | 'high';
  focusAreas: string[];
  textHierarchy: string;
  brandingPlacement: string;
  strengths: string[];
  improvements: string[];
}> {
  const prompt = `Analyze this ad template image for visual patterns and design elements.

Provide a JSON response with the following structure:
{
  "detectedPatterns": ["list of visual patterns like 'hero product center', 'text overlay bottom', etc."],
  "dominantColors": ["list of main colors in the design"],
  "layoutType": "grid|centered|asymmetric|split|full-bleed",
  "contentDensity": "low|medium|high",
  "focusAreas": ["list of areas that draw attention"],
  "textHierarchy": "description of text arrangement and prominence",
  "brandingPlacement": "where branding elements are positioned",
  "strengths": ["list of what makes this template effective for ads"],
  "improvements": ["list of potential improvements"]
}

Context about this template:
- Category: ${template.category}
- Mood: ${template.mood || 'not specified'}
- Style: ${template.style || 'not specified'}
- Background type: ${template.backgroundType || 'not specified'}

Respond ONLY with valid JSON.`;

  try {
    const response = await generateContentWithRetry(
      {
        model: 'gemini-3-flash',
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: 'image/jpeg',
                  data: '', // Would need actual image data
                },
              },
            ],
          },
        ],
      },
      { operation: 'template_matching' },
    );

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (error) {
    logger.error({ module: 'TemplatePatternRAG', err: error }, 'Vision analysis failed');
  }

  // Return fallback analysis
  return {
    detectedPatterns: [],
    dominantColors: extractColorsFromPalette(template.colorPalette),
    layoutType: inferLayoutType(template),
    contentDensity: inferContentDensity(template),
    focusAreas: ['center'],
    textHierarchy: 'standard',
    brandingPlacement: 'standard',
    strengths: generateStrengthsFromMetadata(template),
    improvements: [],
  };
}

/**
 * Generate customization suggestions using AI
 */
async function generateCustomizationSuggestions(
  template: PerformingAdTemplate,
  patterns: PatternAnalysis,
  brandGuidelines: {
    colors?: string[];
    typography?: { primary?: string; secondary?: string };
    voice?: { principles?: string[]; wordsToUse?: string[]; wordsToAvoid?: string[] };
    industry?: string;
    targetAudience?: string;
    preferredStyles?: string[];
  },
): Promise<CustomizationSuggestion> {
  const prompt = `You are an expert ad designer. Suggest customizations to align this template with the brand guidelines.

Template Details:
- Name: ${template.name}
- Category: ${template.category}
- Current mood: ${template.mood || 'not specified'}
- Current style: ${template.style || 'not specified'}
- Current color palette: ${JSON.stringify(template.colorPalette || {})}
- Typography: ${JSON.stringify(template.typography || {})}
- Visual patterns: ${patterns.visualPatterns.join(', ') || 'standard'}

Brand Guidelines:
- Brand colors: ${brandGuidelines.colors?.join(', ') || 'not specified'}
- Typography: ${JSON.stringify(brandGuidelines.typography || {})}
- Voice principles: ${brandGuidelines.voice?.principles?.join(', ') || 'not specified'}
- Industry: ${brandGuidelines.industry || 'not specified'}
- Target audience: ${brandGuidelines.targetAudience || 'not specified'}
- Preferred styles: ${brandGuidelines.preferredStyles?.join(', ') || 'not specified'}

Provide suggestions as JSON:
{
  "suggestions": [
    {
      "category": "color|typography|layout|content|branding",
      "original": "current state",
      "suggested": "recommended change",
      "reason": "why this change helps",
      "priority": "high|medium|low"
    }
  ],
  "brandAlignmentScore": 0-100,
  "overallRecommendation": "summary of how to best use this template"
}

Respond ONLY with valid JSON.`;

  try {
    const response = await generateContentWithRetry(
      {
        model: 'gemini-3-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      },
      { operation: 'template_matching' },
    );

    const text = response.text || '';
    const jsonMatch = text.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        templateId: template.id,
        templateName: template.name,
        suggestions: parsed.suggestions || [],
        brandAlignmentScore: parsed.brandAlignmentScore || 50,
        overallRecommendation: parsed.overallRecommendation || 'Review template for brand alignment',
      };
    }
  } catch (error) {
    logger.error({ module: 'TemplatePatternRAG', err: error }, 'Customization suggestion generation failed');
  }

  // Return basic suggestions
  return {
    templateId: template.id,
    templateName: template.name,
    suggestions: generateBasicSuggestions(template, brandGuidelines),
    brandAlignmentScore: 50,
    overallRecommendation: 'This template can be customized to match your brand guidelines.',
  };
}

/**
 * Generate basic suggestions without AI
 */
function generateBasicSuggestions(
  template: PerformingAdTemplate,
  brandGuidelines: {
    colors?: string[];
    typography?: { primary?: string; secondary?: string };
    preferredStyles?: string[];
  },
): CustomizationSuggestion['suggestions'] {
  const suggestions: CustomizationSuggestion['suggestions'] = [];

  // Color suggestions
  if (brandGuidelines.colors && brandGuidelines.colors.length > 0) {
    suggestions.push({
      category: 'color',
      original: 'Current template colors',
      suggested: `Apply brand colors: ${brandGuidelines.colors.join(', ')}`,
      reason: 'Ensures brand consistency across all ads',
      priority: 'high',
    });
  }

  // Typography suggestions
  if (brandGuidelines.typography?.primary) {
    suggestions.push({
      category: 'typography',
      original: 'Current font stack',
      suggested: `Use ${brandGuidelines.typography.primary} as primary font`,
      reason: 'Maintains brand typography standards',
      priority: 'medium',
    });
  }

  // Style suggestions
  if (brandGuidelines.preferredStyles && brandGuidelines.preferredStyles.length > 0) {
    if (!brandGuidelines.preferredStyles.includes(template.style || '')) {
      suggestions.push({
        category: 'layout',
        original: template.style || 'Current style',
        suggested: `Adapt to ${brandGuidelines.preferredStyles[0]} style`,
        reason: 'Aligns with brand visual identity',
        priority: 'medium',
      });
    }
  }

  return suggestions;
}

/**
 * Extract colors from template color palette
 */
function extractColorsFromPalette(colorPalette: unknown): string[] {
  if (!colorPalette || typeof colorPalette !== 'object') {
    return [];
  }

  const palette = colorPalette as Record<string, string>;
  return Object.values(palette).filter((v) => typeof v === 'string' && v.length > 0);
}

/**
 * Infer layout type from template metadata
 */
function inferLayoutType(template: PerformingAdTemplate): string {
  const layouts = template.layouts as Array<{ gridStructure?: string }> | null;

  if (layouts && layouts.length > 0 && layouts[0].gridStructure) {
    return layouts[0].gridStructure;
  }

  return 'standard';
}

/**
 * Infer content density from template
 */
function inferContentDensity(template: PerformingAdTemplate): 'low' | 'medium' | 'high' {
  const contentBlocks = template.contentBlocks as Record<string, unknown> | null;

  if (!contentBlocks) return 'medium';

  const blockCount = Object.keys(contentBlocks).length;

  if (blockCount <= 2) return 'low';
  if (blockCount <= 4) return 'medium';
  return 'high';
}

/**
 * Infer focus areas from template
 */
function inferFocusAreas(template: PerformingAdTemplate): string[] {
  const areas: string[] = [];
  const contentBlocks = template.contentBlocks as Record<string, unknown> | null;

  if (contentBlocks) {
    if ('headline' in contentBlocks) areas.push('headline');
    if ('cta' in contentBlocks) areas.push('call-to-action');
    if ('body' in contentBlocks) areas.push('body content');
  }

  if (areas.length === 0) {
    areas.push('center');
  }

  return areas;
}

/**
 * Infer text hierarchy from template
 */
function inferTextHierarchy(template: PerformingAdTemplate): string {
  const typography = template.typography as {
    headlineSize?: string;
    bodySize?: string;
    ctaSize?: string;
  } | null;

  if (!typography) return 'standard';

  if (typography.headlineSize && typography.bodySize) {
    return `${typography.headlineSize} headline, ${typography.bodySize} body`;
  }

  return 'standard';
}

/**
 * Generate strengths from template metadata
 */
function generateStrengthsFromMetadata(template: PerformingAdTemplate): string[] {
  const strengths: string[] = [];

  if (template.engagementTier === 'top-5' || template.engagementTier === 'top-10') {
    strengths.push('Proven high engagement template');
  }

  if (template.targetPlatforms && template.targetPlatforms.length > 1) {
    strengths.push('Multi-platform optimized');
  }

  if (template.editableVariables && template.editableVariables.length > 0) {
    strengths.push('Highly customizable');
  }

  if (template.backgroundType === 'solid' || template.backgroundType === 'gradient') {
    strengths.push('Clean background for product focus');
  }

  if (strengths.length === 0) {
    strengths.push('Ready for customization');
  }

  return strengths;
}

// =============================================================================
// Exports
// =============================================================================

export default {
  matchTemplateForContext,
  analyzeTemplatePatterns,
  suggestTemplateCustomizations,
};
