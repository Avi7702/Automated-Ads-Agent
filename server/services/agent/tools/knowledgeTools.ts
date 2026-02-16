// @ts-nocheck
/**
 * Agent Tools - Knowledge Base & Templates
 * Tools for searching the knowledge base and browsing templates
 */

import { FunctionTool } from '@google/adk';
import type { ToolContext } from '@google/adk';
import { z } from 'zod';
import type { IStorage } from '../../../storage';
import { logger } from '../../../lib/logger';

export function createKnowledgeTools(storage: IStorage) {
  const vaultSearchParameters = z.object({
    query: z.string().min(3).describe('Search query (e.g. "brand color palette", "product warranty terms")'),
  });

  const executeVaultSearch = async (input: z.infer<typeof vaultSearchParameters>) => {
    try {
      const { queryFileSearchStore } = await import('../../fileSearchService');

      const result = await queryFileSearchStore({
        query: input.query,
        maxResults: 5,
      });

      if (!result || !result.context) {
        return {
          status: 'success',
          results: [],
          message:
            'No knowledge base results found. The knowledge base may be empty or the query did not match any documents.',
        };
      }

      return {
        status: 'success',
        context: result.context,
        citationCount: result.citations?.length ?? 0,
        message: 'Found relevant information from the knowledge base.',
      };
    } catch (err: unknown) {
      logger.error({ module: 'AgentTools', err }, 'Knowledge base search error');
      // Graceful fallback - KB not being available is not a hard failure
      return {
        status: 'success',
        results: [],
        message: 'Knowledge base search is not available at the moment. Continuing without KB context.',
      };
    }
  };

  const vaultSearch = new FunctionTool({
    name: 'vault_search',
    description:
      'Search the company vault/knowledge base (uploaded PDFs, brand guides, product catalogs) for specific information.',
    parameters: vaultSearchParameters,
    execute: executeVaultSearch,
  });

  const searchKnowledgeBase = new FunctionTool({
    name: 'search_knowledge_base',
    description: 'Legacy alias for vault_search.',
    parameters: vaultSearchParameters,
    execute: executeVaultSearch,
  });

  const getTemplates = new FunctionTool({
    name: 'get_templates',
    description:
      'List available ad scene templates with their categories, moods, and target platforms. Templates define visual compositions for ad generation.',
    parameters: z.object({
      category: z.string().optional().describe('Filter by category (e.g. "product_showcase", "lifestyle")'),
    }),
    execute: async (input) => {
      try {
        const filters: { isGlobal?: boolean; category?: string } = { isGlobal: true };
        if (input.category) {
          filters.category = input.category;
        }

        const templates = await storage.getAdSceneTemplates(filters);

        return {
          status: 'success',
          templates: templates.map((t) => ({
            id: t.id,
            title: t.title,
            category: t.category,
            mood: t.mood ?? undefined,
            environment: t.environment ?? undefined,
            platformHints: t.platformHints ?? [],
            aspectRatioHints: t.aspectRatioHints ?? [],
            bestForProductTypes: t.bestForProductTypes ?? [],
          })),
          total: templates.length,
          message: `Found ${templates.length} template(s)${input.category ? ` in category "${input.category}"` : ''}.`,
        };
      } catch (err: unknown) {
        logger.error({ module: 'AgentTools', err }, 'Failed to list templates');
        return { status: 'error', message: 'Failed to load templates. Please try again.' };
      }
    },
  });

  const getProductKnowledge = new FunctionTool({
    name: 'get_product_knowledge',
    description:
      'Get enhanced product knowledge including related products, installation scenarios, brand images, and detailed specifications. More comprehensive than get_product_details.',
    parameters: z.object({
      productId: z.string().describe('The product ID to get enhanced knowledge for'),
    }),
    execute: async (input, tool_context?: ToolContext) => {
      const userId = tool_context?.state?.get<string>('authenticatedUserId');
      if (!userId) {
        return { status: 'error', message: 'Authentication required.' };
      }

      try {
        const { productKnowledgeService } = await import('../../productKnowledgeService');

        const context = await productKnowledgeService.buildEnhancedContext(input.productId, userId);

        if (!context) {
          return { status: 'error', message: `Product ${input.productId} not found.` };
        }

        return {
          status: 'success',
          product: {
            id: context.product.id,
            name: context.product.name,
            category: context.product.category,
            description: context.product.description,
            features: context.product.features,
            benefits: context.product.benefits,
            tags: context.product.tags,
          },
          relatedProducts: context.relatedProducts.map((rp) => ({
            name: rp.product.name,
            relationship: rp.relationshipType,
            description: rp.relationshipDescription,
          })),
          installationScenarios: context.installationScenarios.map((s) => ({
            title: s.title,
            description: s.description,
            roomTypes: s.roomTypes,
          })),
          brandImageCount: context.brandImages.length,
          formattedContext: context.formattedContext,
          message: `Retrieved enhanced knowledge for "${context.product.name}".`,
        };
      } catch (err: unknown) {
        logger.error({ module: 'AgentTools', err }, 'Product knowledge error');
        return { status: 'error', message: 'Failed to get product knowledge. Please try again.' };
      }
    },
  });

  return [vaultSearch, searchKnowledgeBase, getTemplates, getProductKnowledge];
}
