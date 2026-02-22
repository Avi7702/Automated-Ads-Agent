/**
 * Agent Tools — Copywriting & Ideas
 * Tools for generating ad copy and getting AI suggestions
 */

import { Type } from '@google/genai';
import type { FunctionDeclaration } from '@google/genai';
import { logger } from '../../../lib/logger';
import type { ToolExecutor } from './types';

/** Tool declarations for Gemini function calling */
export const declarations: FunctionDeclaration[] = [
  {
    name: 'generate_post_copy',
    description:
      'Generate social post copy (headline, body, CTA, hashtags) for a product on a specific social media platform. Returns multiple variations with quality scores.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        platform: {
          type: Type.STRING,
          enum: ['instagram', 'linkedin', 'facebook', 'twitter', 'tiktok'],
          description: 'Target platform',
        },
        productName: { type: Type.STRING, description: 'Product name' },
        productDescription: { type: Type.STRING, description: 'Brief product description' },
        industry: { type: Type.STRING, description: 'Industry/vertical (default: general)' },
        tone: {
          type: Type.STRING,
          enum: ['professional', 'casual', 'technical', 'urgent', 'minimal', 'authentic'],
          description: 'Tone of voice (default: professional)',
        },
        framework: {
          type: Type.STRING,
          enum: ['aida', 'pas', 'bab', 'fab', 'auto'],
          description: 'Copywriting framework (default: auto)',
        },
        variations: { type: Type.NUMBER, description: 'Number of variations (default 3)' },
      },
      required: ['platform', 'productName', 'productDescription'],
    },
  },
  {
    name: 'generate_ad_copy',
    description: 'Legacy alias for generate_post_copy.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        platform: {
          type: Type.STRING,
          enum: ['instagram', 'linkedin', 'facebook', 'twitter', 'tiktok'],
          description: 'Target platform',
        },
        productName: { type: Type.STRING, description: 'Product name' },
        productDescription: { type: Type.STRING, description: 'Brief product description' },
        industry: { type: Type.STRING, description: 'Industry/vertical (default: general)' },
        tone: {
          type: Type.STRING,
          enum: ['professional', 'casual', 'technical', 'urgent', 'minimal', 'authentic'],
          description: 'Tone of voice (default: professional)',
        },
        framework: {
          type: Type.STRING,
          enum: ['aida', 'pas', 'bab', 'fab', 'auto'],
          description: 'Copywriting framework (default: auto)',
        },
        variations: { type: Type.NUMBER, description: 'Number of variations (default 3)' },
      },
      required: ['platform', 'productName', 'productDescription'],
    },
  },
  {
    name: 'suggest_ideas',
    description:
      'Get AI-powered creative suggestions for ad generation based on selected products. Returns prompt ideas with confidence scores.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        productId: { type: Type.STRING, description: 'Product ID to get suggestions for' },
        userGoal: {
          type: Type.STRING,
          description: 'What the user wants to achieve (e.g. "increase sales", "brand awareness")',
        },
        maxSuggestions: { type: Type.NUMBER, description: 'Number of suggestions (default 3)' },
      },
    },
  },
  {
    name: 'get_idea_suggestions',
    description: 'Legacy alias for suggest_ideas.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        productId: { type: Type.STRING, description: 'Product ID to get suggestions for' },
        userGoal: {
          type: Type.STRING,
          description: 'What the user wants to achieve (e.g. "increase sales", "brand awareness")',
        },
        maxSuggestions: { type: Type.NUMBER, description: 'Number of suggestions (default 3)' },
      },
    },
  },
];

/** Create executor map (keyed by tool name) */
export function createExecutors(): Map<string, ToolExecutor> {
  const map = new Map<string, ToolExecutor>();

  const executeGeneratePostCopy: ToolExecutor = async (args, _userId) => {
    try {
      const platform = args['platform'] as string;
      const productName = args['productName'] as string;
      const productDescription = args['productDescription'] as string;
      const industry = (args['industry'] as string | undefined) ?? 'general';
      const tone = (args['tone'] as string | undefined) ?? 'professional';
      const framework = (args['framework'] as string | undefined) ?? 'auto';
      const variations = (args['variations'] as number | undefined) ?? 3;

      const { copywritingService } = await import('../../copywritingService');
      const { randomUUID } = await import('node:crypto');
      const results = await copywritingService.generateCopy({
        generationId: randomUUID(),
        platform,
        productName,
        productDescription,
        industry,
        tone,
        framework,
        campaignObjective: 'engagement',
        variations,
      } as any);

      return {
        status: 'success',
        uiActions: [{ type: 'copy_generated', payload: { copies: results } }],
        copies: results.map((c: any) => ({
          headline: c.headline,
          hook: c.hook,
          bodyText: c.bodyText,
          cta: c.cta,
          caption: c.caption,
          hashtags: c.hashtags,
          framework: c.framework,
          qualityScore: c.qualityScore?.overallScore,
        })),
        message: `Generated ${results.length} ad copy variation(s) for ${platform}`,
      };
    } catch (err: unknown) {
      logger.error({ module: 'AgentTools', err }, 'Ad copy generation error');
      return { status: 'error', message: 'Failed to generate ad copy. Please try again.' };
    }
  };

  map.set('generate_post_copy', executeGeneratePostCopy);
  map.set('generate_ad_copy', executeGeneratePostCopy);

  const executeSuggestIdeas: ToolExecutor = async (args, userId) => {
    if (!userId) {
      return { status: 'error', message: 'Authentication required. Please refresh the page and try again.' };
    }

    try {
      const productId = args['productId'] as string | undefined;
      const userGoal = args['userGoal'] as string | undefined;
      const maxSuggestions = (args['maxSuggestions'] as number | undefined) ?? 3;

      const { ideaBankService } = await import('../../ideaBankService');

      // Build request, only including defined properties
      const request: Record<string, unknown> = {
        userId,
        maxSuggestions,
      };
      if (productId !== undefined) request['productId'] = productId;
      if (userGoal !== undefined) request['userGoal'] = userGoal;

      const result = await ideaBankService.generateSuggestions(request as any);

      if (!result.success) {
        return { status: 'error', message: (result as any).error?.message ?? 'Failed to generate suggestions' };
      }

      const response = result.response as any;
      const suggestions = response.suggestions ?? [];

      return {
        status: 'success',
        suggestions: suggestions.map((s: any) => ({
          summary: s.summary,
          prompt: s.prompt,
          confidence: s.confidence,
          mode: s.mode,
          recommendedPlatform: s.recommendedPlatform,
        })),
        message: `Generated ${suggestions.length} creative suggestion(s)`,
      };
    } catch (err: unknown) {
      logger.error({ module: 'AgentTools', err, userId }, 'Idea suggestions error');
      return { status: 'error', message: 'Failed to generate suggestions. Please try again.' };
    }
  };

  map.set('suggest_ideas', executeSuggestIdeas);
  map.set('get_idea_suggestions', executeSuggestIdeas);

  return map;
}
