/**
 * Agent Tools — Product Operations
 * Tools for listing, searching, and selecting products
 */

import { Type } from '@google/genai';
import type { FunctionDeclaration } from '@google/genai';
import type { IStorage } from '../../../storage';
import { logger } from '../../../lib/logger';
import type { ToolExecutor } from './types';

/** Tool declarations for Gemini function calling */
export const declarations: FunctionDeclaration[] = [
  {
    name: 'list_products',
    description:
      'Search and list products from the product library. Use this to find products the user can select for generation.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        searchQuery: { type: Type.STRING, description: 'Filter products by name (case-insensitive substring match)' },
        category: { type: Type.STRING, description: 'Filter by product category' },
        limit: { type: Type.NUMBER, description: 'Max results to return (default 20, max 50)' },
      },
    },
  },
  {
    name: 'get_product_details',
    description: 'Get detailed information about a specific product including its image URL and tags.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        productId: { type: Type.STRING, description: 'The product ID to look up' },
      },
      required: ['productId'],
    },
  },
  {
    name: 'select_products',
    description:
      'Select 1-6 products for the current generation session. This updates the Studio UI to show these products as selected. Always call list_products first to find valid product IDs.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        productIds: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'Array of product IDs to select (1-6)',
        },
      },
      required: ['productIds'],
    },
  },
];

/** Create executor map (keyed by tool name) */
export function createExecutors(storage: IStorage): Map<string, ToolExecutor> {
  const map = new Map<string, ToolExecutor>();

  map.set('list_products', async (args, _userId) => {
    try {
      const searchQuery = args['searchQuery'] as string | undefined;
      const category = args['category'] as string | undefined;
      const limit = args['limit'] as number | undefined;

      const products = await storage.getProducts(Math.min(limit ?? 20, 50));
      let filtered = products;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(
          (p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
        );
      }
      if (category) {
        const cat = category.toLowerCase();
        filtered = filtered.filter((p) => p.category?.toLowerCase().includes(cat));
      }

      return {
        status: 'success',
        products: filtered.map((p) => ({
          id: p.id,
          name: p.name,
          category: p.category ?? 'uncategorized',
          description: p.description?.slice(0, 200) ?? '',
          hasImage: Boolean(p.cloudinaryUrl),
        })),
        total: filtered.length,
      };
    } catch (err: unknown) {
      logger.error({ module: 'AgentTools', err }, 'Failed to list products');
      return { status: 'error', message: 'Failed to load products. Please try again.' };
    }
  });

  map.set('get_product_details', async (args, _userId) => {
    try {
      const productId = args['productId'] as string;
      const product = await storage.getProductById(productId);
      if (!product) {
        return { status: 'error', message: `Product ${productId} not found` };
      }

      return {
        status: 'success',
        product: {
          id: product.id,
          name: product.name,
          category: product.category,
          description: product.description,
          imageUrl: product.cloudinaryUrl,
          tags: product.tags ?? [],
        },
      };
    } catch (err: unknown) {
      logger.error({ module: 'AgentTools', err, productId: args['productId'] }, 'Failed to get product details');
      return { status: 'error', message: 'Failed to load product details. Please try again.' };
    }
  });

  map.set('select_products', async (args, _userId) => {
    try {
      const productIds = args['productIds'] as string[];
      const products = [];
      const notFound: string[] = [];
      for (const id of productIds) {
        const p = await storage.getProductById(id);
        if (p) {
          products.push({ id: p.id, name: p.name, imageUrl: p.cloudinaryUrl });
        } else {
          notFound.push(id);
        }
      }

      if (products.length === 0) {
        return { status: 'error', message: 'None of the provided product IDs were found' };
      }

      const warning = notFound.length > 0 ? ` (${notFound.length} ID(s) not found: ${notFound.join(', ')})` : '';

      return {
        status: 'success',
        uiActions: [{ type: 'select_products', payload: { products } }],
        message: `Selected ${products.length} product(s): ${products.map((p) => p.name).join(', ')}${warning}`,
      };
    } catch (err: unknown) {
      logger.error({ module: 'AgentTools', err }, 'Failed to select products');
      return { status: 'error', message: 'Failed to select products. Please try again.' };
    }
  });

  return map;
}
