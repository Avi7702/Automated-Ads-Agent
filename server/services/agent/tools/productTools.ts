/**
 * Agent Tools — Product Operations
 * Tools for listing, searching, and selecting products
 */

import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import type { IStorage } from '../../../storage';
import { logger } from '../../../lib/logger';

export function createProductTools(storage: IStorage) {
  const listProducts = new FunctionTool({
    name: 'list_products',
    description:
      'Search and list products from the product library. Use this to find products the user can select for generation.',
    parameters: z.object({
      searchQuery: z.string().optional().describe('Filter products by name (case-insensitive substring match)'),
      category: z.string().optional().describe('Filter by product category'),
      limit: z.number().optional().describe('Max results to return (default 20, max 50)'),
    }),
    execute: async (input) => {
      try {
        const products = await storage.getProducts(Math.min(input.limit ?? 20, 50));
        let filtered = products;

        if (input.searchQuery) {
          const q = input.searchQuery.toLowerCase();
          filtered = filtered.filter(
            (p) => p.name?.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q),
          );
        }
        if (input.category) {
          const cat = input.category.toLowerCase();
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
    },
  });

  const getProductDetails = new FunctionTool({
    name: 'get_product_details',
    description: 'Get detailed information about a specific product including its image URL and tags.',
    parameters: z.object({
      productId: z.string().describe('The product ID to look up'),
    }),
    execute: async (input) => {
      try {
        const product = await storage.getProductById(input.productId);
        if (!product) {
          return { status: 'error', message: `Product ${input.productId} not found` };
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
        logger.error({ module: 'AgentTools', err, productId: input.productId }, 'Failed to get product details');
        return { status: 'error', message: 'Failed to load product details. Please try again.' };
      }
    },
  });

  const selectProducts = new FunctionTool({
    name: 'select_products',
    description:
      'Select 1-6 products for the current generation session. This updates the Studio UI to show these products as selected. Always call list_products first to find valid product IDs.',
    parameters: z.object({
      productIds: z.array(z.string()).min(1).max(6).describe('Array of product IDs to select (1-6)'),
    }),
    execute: async (input) => {
      try {
        const products = [];
        const notFound: string[] = [];
        for (const id of input.productIds) {
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
    },
  });

  return [listProducts, getProductDetails, selectProducts];
}
