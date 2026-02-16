/**
 * Agent Tools — Copywriting & Ideas
 * Tools for generating ad copy and getting AI suggestions
 */

import { FunctionTool } from '@google/adk';
import type { ToolContext } from '@google/adk';
import { z } from 'zod';
import { logger } from '../../../lib/logger';

export function createCopyTools() {
  const generatePostCopyParameters = z.object({
    platform: z.enum(['instagram', 'linkedin', 'facebook', 'twitter', 'tiktok']).describe('Target platform'),
    productName: z.string().describe('Product name'),
    productDescription: z.string().describe('Brief product description'),
    industry: z.string().optional().describe('Industry/vertical (default: general)'),
    tone: z
      .enum(['professional', 'casual', 'technical', 'urgent', 'minimal', 'authentic'])
      .optional()
      .describe('Tone of voice (default: professional)'),
    framework: z.enum(['aida', 'pas', 'bab', 'fab', 'auto']).optional().describe('Copywriting framework (default: auto)'),
    variations: z.number().min(1).max(5).optional().describe('Number of variations (default 3)'),
  });

  const executeGeneratePostCopy = async (
    input: z.infer<typeof generatePostCopyParameters>,
    _tool_context?: ToolContext,
  ) => {
    try {
      const { copywritingService } = await import('../../copywritingService');
      const { randomUUID } = await import('node:crypto');
      const results = await copywritingService.generateCopy({
        generationId: randomUUID(),
        platform: input.platform,
        productName: input.productName,
        productDescription: input.productDescription,
        industry: input.industry ?? 'general',
        tone: input.tone ?? 'professional',
        framework: input.framework ?? 'auto',
        campaignObjective: 'engagement',
        variations: input.variations ?? 3,
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
        message: `Generated ${results.length} ad copy variation(s) for ${input.platform}`,
      };
    } catch (err: unknown) {
      logger.error({ module: 'AgentTools', err }, 'Ad copy generation error');
      return { status: 'error', message: 'Failed to generate ad copy. Please try again.' };
    }
  };

  const generatePostCopy = new FunctionTool({
    name: 'generate_post_copy',
    description:
      'Generate social post copy (headline, body, CTA, hashtags) for a product on a specific social media platform. Returns multiple variations with quality scores.',
    parameters: generatePostCopyParameters,
    execute: executeGeneratePostCopy,
  });

  const generateAdCopy = new FunctionTool({
    name: 'generate_ad_copy',
    description: 'Legacy alias for generate_post_copy.',
    parameters: generatePostCopyParameters,
    execute: executeGeneratePostCopy,
  });

  const suggestIdeasParameters = z.object({
    productId: z.string().optional().describe('Product ID to get suggestions for'),
    userGoal: z
      .string()
      .optional()
      .describe('What the user wants to achieve (e.g. "increase sales", "brand awareness")'),
    maxSuggestions: z.number().min(1).max(5).optional().describe('Number of suggestions (default 3)'),
  });

  const executeSuggestIdeas = async (input: z.infer<typeof suggestIdeasParameters>, tool_context?: ToolContext) => {
    const userId = tool_context?.state?.get<string>('authenticatedUserId');
    if (!userId) {
      return { status: 'error', message: 'Authentication required. Please refresh the page and try again.' };
    }

    try {
      const { ideaBankService } = await import('../../ideaBankService');

      // Build request, only including defined properties
      const request: Record<string, unknown> = {
        userId,
        maxSuggestions: input.maxSuggestions ?? 3,
      };
      if (input.productId !== undefined) request['productId'] = input.productId;
      if (input.userGoal !== undefined) request['userGoal'] = input.userGoal;

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

  const suggestIdeas = new FunctionTool({
    name: 'suggest_ideas',
    description:
      'Get AI-powered creative suggestions for ad generation based on selected products. Returns prompt ideas with confidence scores.',
    parameters: suggestIdeasParameters,
    execute: executeSuggestIdeas,
  });

  const getIdeaSuggestions = new FunctionTool({
    name: 'get_idea_suggestions',
    description: 'Legacy alias for suggest_ideas.',
    parameters: suggestIdeasParameters,
    execute: executeSuggestIdeas,
  });

  return [generatePostCopy, generateAdCopy, suggestIdeas, getIdeaSuggestions];
}
