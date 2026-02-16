/**
 * Zod contracts for Product API endpoints
 *
 * GET /api/products → ListProductsResponse (array of ProductDTO)
 * GET /api/products/:id → ProductDTO
 */
import { z } from 'zod';

/**
 * ProductDTO — matches the shape returned by GET /api/products
 * Based on the `products` table in shared/schema.ts
 */
export const ProductDTO = z
  .object({
    id: z.string(),
    name: z.string(),
    // Some fixtures/mocks omit these fields or return null.
    cloudinaryUrl: z.string().nullable().optional(),
    cloudinaryPublicId: z.string().nullable().optional(),
    category: z.string().nullable().optional(),

    // Phase 0.5: Product Knowledge Fields
    description: z.string().nullable().optional(),
    features: z.unknown().nullable().optional(), // jsonb — shape varies
    benefits: z.array(z.string()).nullable().optional(),
    specifications: z.unknown().nullable().optional(), // jsonb — shape varies
    tags: z.array(z.string()).nullable().optional(),
    sku: z.string().nullable().optional(),

    // Product Enrichment Workflow
    enrichmentStatus: z.string().nullable().optional(),
    enrichmentDraft: z.unknown().nullable().optional(),
    enrichmentVerifiedAt: z.string().or(z.date()).nullable().optional(), // ISO/date across API + tests
    enrichmentSource: z.string().nullable().optional(),

    createdAt: z.string().or(z.date()), // may arrive as ISO string or Date
  })
  .passthrough(); // Don't break on extra fields

export type ProductDTO = z.infer<typeof ProductDTO>;

/**
 * ListProductsResponse — GET /api/products returns a plain array
 */
export const ListProductsResponse = z.array(ProductDTO);
export type ListProductsResponse = z.infer<typeof ListProductsResponse>;
