/**
 * Product Knowledge Service
 *
 * Phase 0.5: Builds enhanced context from product data to ground AI responses.
 * This service aggregates product details, relationships, installation scenarios,
 * and brand images to provide rich context for idea generation.
 *
 * Key capabilities:
 * 1. Build enhanced context from product metadata
 * 2. Retrieve related products and their relationships
 * 3. Get installation scenarios for products
 * 4. Access brand images for visual context
 * 5. Format context for LLM consumption
 *
 * Caching: Product knowledge is cached in Redis with 24-hour TTL.
 * This data changes infrequently and is expensive to compute.
 */

import { storage } from "../storage";
import { logger } from "../lib/logger";
import { getCacheService, CACHE_TTL } from "../lib/cacheService";
import type {
  Product,
  ProductRelationship,
  InstallationScenario,
  BrandImage,
} from "@shared/schema";

// ============================================
// TYPES
// ============================================

export interface EnhancedProductContext {
  /** Primary product info */
  product: ProductInfo;
  /** Related products with relationship context */
  relatedProducts: RelatedProductInfo[];
  /** Installation scenarios featuring this product */
  installationScenarios: InstallationScenarioInfo[];
  /** Brand images that can be used for reference */
  brandImages: BrandImageInfo[];
  /** Combined context string for LLM prompts */
  formattedContext: string;
}

export interface ProductInfo {
  id: string;
  name: string;
  description?: string;
  features?: Record<string, unknown>;
  benefits?: string[];
  specifications?: Record<string, unknown>;
  tags?: string[];
  sku?: string;
  category?: string;
  cloudinaryUrl: string;
  enrichmentDraft?: Record<string, unknown>;
}

export interface RelatedProductInfo {
  product: ProductInfo;
  relationshipType: string;
  relationshipDescription?: string;
  isRequired?: boolean;
}

export interface InstallationScenarioInfo {
  id: string;
  title: string;
  description: string;
  scenarioType: string;
  roomTypes?: string[];
  styleTags?: string[];
  installationSteps?: string[];
  requiredAccessories?: string[];
  referenceImages?: Array<{
    cloudinaryUrl: string;
    publicId: string;
    caption?: string;
  }>;
}

export interface BrandImageInfo {
  id: string;
  cloudinaryUrl: string;
  category: string;
  tags?: string[];
  description?: string;
  suggestedUse?: string[];
}

// ============================================
// MAIN SERVICE
// ============================================

/**
 * Build enhanced context for a single product
 * Uses Redis cache with 24-hour TTL to avoid repeated database queries
 */
export async function buildEnhancedContext(
  productId: string,
  userId: string
): Promise<EnhancedProductContext | null> {
  const cache = getCacheService();
  const cacheKey = cache.kbKey(productId);

  // Try Redis cache first
  try {
    const cached = await cache.get<EnhancedProductContext>(cacheKey);
    if (cached) {
      logger.info({ module: 'ProductKnowledge', productId, cached: true }, 'Redis cache hit for product knowledge');
      return cached;
    }
  } catch (err) {
    logger.warn({ module: 'ProductKnowledge', err }, 'Redis cache lookup failed, computing fresh context');
  }

  // 1. Fetch primary product
  const product = await storage.getProductById(productId);
  if (!product) {
    return null;
  }

  logger.info({ module: 'ProductKnowledge', productId, cached: false }, 'Cache miss, building enhanced context');

  // 2. Fetch related data in parallel
  const [relationships, scenarios, brandImages] = await Promise.all([
    storage.getProductRelationships([productId]),
    storage.getInstallationScenariosForProducts([productId]),
    storage.getBrandImagesForProducts([productId], userId),
  ]);

  // 3. Fetch related product details
  const relatedProductIds = relationships.map((r) =>
    r.sourceProductId === productId ? r.targetProductId : r.sourceProductId
  );
  const relatedProducts = relatedProductIds.length > 0
    ? await storage.getProductsByIds(relatedProductIds)
    : [];

  // 4. Build product info
  const productInfo = mapProductToInfo(product);

  // 5. Build related products with relationship context
  const relatedProductsInfo = buildRelatedProductsInfo(
    relationships,
    relatedProducts,
    productId
  );

  // 6. Map installation scenarios
  const installationScenariosInfo = scenarios.map(mapScenarioToInfo);

  // 7. Map brand images
  const brandImagesInfo = brandImages.map(mapBrandImageToInfo);

  // 8. Format combined context for LLM
  const formattedContext = formatContextForLLM({
    product: productInfo,
    relatedProducts: relatedProductsInfo,
    installationScenarios: installationScenariosInfo,
    brandImages: brandImagesInfo,
  });

  const context: EnhancedProductContext = {
    product: productInfo,
    relatedProducts: relatedProductsInfo,
    installationScenarios: installationScenariosInfo,
    brandImages: brandImagesInfo,
    formattedContext,
  };

  // Cache the result
  try {
    await cache.set(cacheKey, context, CACHE_TTL.PRODUCT_KNOWLEDGE);
    logger.info({ module: 'ProductKnowledge', productId }, 'Product knowledge cached in Redis');
  } catch (cacheErr) {
    logger.warn({ module: 'ProductKnowledge', cacheErr }, 'Failed to cache product knowledge');
  }

  return context;
}

/**
 * Build enhanced context for multiple products
 */
export async function buildMultiProductContext(
  productIds: string[],
  userId: string
): Promise<EnhancedProductContext[]> {
  const contexts = await Promise.all(
    productIds.map((id) => buildEnhancedContext(id, userId))
  );
  return contexts.filter((c): c is EnhancedProductContext => c !== null);
}

/**
 * Get product relationships formatted for display
 */
export async function getFormattedRelationships(
  productId: string
): Promise<{
  pairsWith: RelatedProductInfo[];
  requires: RelatedProductInfo[];
  completes: RelatedProductInfo[];
  upgrades: RelatedProductInfo[];
}> {
  const relationships = await storage.getProductRelationships([productId]);
  const relatedIds = relationships.map((r) =>
    r.sourceProductId === productId ? r.targetProductId : r.sourceProductId
  );
  const relatedProducts = relatedIds.length > 0
    ? await storage.getProductsByIds(relatedIds)
    : [];

  const relatedInfo = buildRelatedProductsInfo(relationships, relatedProducts, productId);

  return {
    pairsWith: relatedInfo.filter((r) => r.relationshipType === "pairs_with"),
    requires: relatedInfo.filter((r) => r.relationshipType === "requires"),
    completes: relatedInfo.filter((r) => r.relationshipType === "completes"),
    upgrades: relatedInfo.filter((r) => r.relationshipType === "upgrades"),
  };
}

/**
 * Search products by tag and return enhanced context
 */
export async function searchProductsByTagWithContext(
  tag: string,
  userId: string
): Promise<EnhancedProductContext[]> {
  const products = await storage.searchProductsByTag(tag);
  const productIds = products.map((p) => p.id);
  return buildMultiProductContext(productIds, userId);
}

/**
 * Get installation scenarios for a room type
 */
export async function getScenariosByRoomType(
  roomType: string
): Promise<InstallationScenarioInfo[]> {
  const scenarios = await storage.getScenariosByRoomType(roomType);
  return scenarios.map(mapScenarioToInfo);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapProductToInfo(product: Product): ProductInfo {
  return {
    id: product.id,
    name: product.name,
    description: product.description || undefined,
    features: product.features as Record<string, unknown> | undefined,
    benefits: product.benefits || undefined,
    specifications: product.specifications as Record<string, unknown> | undefined,
    tags: product.tags || undefined,
    sku: product.sku || undefined,
    category: product.category || undefined,
    cloudinaryUrl: product.cloudinaryUrl,
    enrichmentDraft: product.enrichmentDraft as Record<string, unknown> | undefined,
  };
}

function buildRelatedProductsInfo(
  relationships: ProductRelationship[],
  relatedProducts: Product[],
  primaryProductId: string
): RelatedProductInfo[] {
  const productMap = new Map(relatedProducts.map((p) => [p.id, p]));

  return relationships.map((rel) => {
    const relatedId =
      rel.sourceProductId === primaryProductId
        ? rel.targetProductId
        : rel.sourceProductId;
    const product = productMap.get(relatedId);

    return {
      product: product ? mapProductToInfo(product) : {
        id: relatedId,
        name: "Unknown Product",
        cloudinaryUrl: "",
      },
      relationshipType: rel.relationshipType,
      relationshipDescription: rel.description || undefined,
      isRequired: rel.isRequired || false,
    };
  });
}

function mapScenarioToInfo(scenario: InstallationScenario): InstallationScenarioInfo {
  return {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    scenarioType: scenario.scenarioType,
    roomTypes: scenario.roomTypes || undefined,
    styleTags: scenario.styleTags || undefined,
    installationSteps: scenario.installationSteps || undefined,
    requiredAccessories: scenario.requiredAccessories || undefined,
    referenceImages: scenario.referenceImages as Array<{
      cloudinaryUrl: string;
      publicId: string;
      caption?: string;
    }> | undefined,
  };
}

function mapBrandImageToInfo(image: BrandImage): BrandImageInfo {
  return {
    id: image.id,
    cloudinaryUrl: image.cloudinaryUrl,
    category: image.category,
    tags: image.tags || undefined,
    description: image.description || undefined,
    suggestedUse: image.suggestedUse || undefined,
  };
}

/**
 * Format context into a string optimized for LLM consumption
 */
function formatContextForLLM(context: {
  product: ProductInfo;
  relatedProducts: RelatedProductInfo[];
  installationScenarios: InstallationScenarioInfo[];
  brandImages: BrandImageInfo[];
}): string {
  const { product, relatedProducts, installationScenarios, brandImages } = context;
  const parts: string[] = [];

  // Product details
  parts.push(`## Product: ${product.name}`);
  if (product.sku) parts.push(`SKU: ${product.sku}`);
  if (product.category) parts.push(`Category: ${product.category}`);
  if (product.description) parts.push(`Description: ${product.description}`);

  // Features
  if (product.features && Object.keys(product.features).length > 0) {
    parts.push("\n### Features:");
    for (const [key, value] of Object.entries(product.features)) {
      parts.push(`- ${key}: ${value}`);
    }
  }

  // Benefits
  if (product.benefits && product.benefits.length > 0) {
    parts.push("\n### Benefits:");
    product.benefits.forEach((b) => parts.push(`- ${b}`));
  }

  // Specifications
  if (product.specifications && Object.keys(product.specifications).length > 0) {
    parts.push("\n### Specifications:");
    for (const [key, value] of Object.entries(product.specifications)) {
      parts.push(`- ${key}: ${value}`);
    }
  }

  // Tags
  if (product.tags && product.tags.length > 0) {
    parts.push(`\nTags: ${product.tags.join(", ")}`);
  }

  // Enrichment draft data (scraped from NDS website)
  const draft = product.enrichmentDraft;
  if (draft) {
    if (draft.installationContext) {
      parts.push(`\n### Installation Context:\n${draft.installationContext}`);
    }
    if (Array.isArray(draft.useCases) && draft.useCases.length > 0) {
      parts.push("\n### Real-World Use Cases:");
      (draft.useCases as string[]).forEach((uc) => parts.push(`- ${uc}`));
    }
    if (Array.isArray(draft.targetAudience) && draft.targetAudience.length > 0) {
      parts.push(`\nTarget Audience: ${(draft.targetAudience as string[]).join(", ")}`);
    }
    if (Array.isArray(draft.relatedCategories) && draft.relatedCategories.length > 0) {
      parts.push(`\nRelated Categories: ${(draft.relatedCategories as string[]).join(", ")}`);
    }
  }

  // Related products
  if (relatedProducts.length > 0) {
    parts.push("\n## Related Products:");
    relatedProducts.forEach((rp) => {
      const typeLabel = formatRelationshipType(rp.relationshipType);
      parts.push(`- ${rp.product.name} (${typeLabel})`);
      if (rp.relationshipDescription) {
        parts.push(`  ${rp.relationshipDescription}`);
      }
    });
  }

  // Installation scenarios
  if (installationScenarios.length > 0) {
    parts.push("\n## Installation Scenarios:");
    installationScenarios.forEach((scenario) => {
      parts.push(`\n### ${scenario.title}`);
      parts.push(scenario.description);
      if (scenario.roomTypes && scenario.roomTypes.length > 0) {
        parts.push(`Room types: ${scenario.roomTypes.join(", ")}`);
      }
      if (scenario.styleTags && scenario.styleTags.length > 0) {
        parts.push(`Style: ${scenario.styleTags.join(", ")}`);
      }
      if (scenario.requiredAccessories && scenario.requiredAccessories.length > 0) {
        parts.push(`Required accessories: ${scenario.requiredAccessories.join(", ")}`);
      }
    });
  }

  // Brand images reference
  if (brandImages.length > 0) {
    parts.push("\n## Available Brand Images:");
    const groupedByCategory = groupBy(brandImages, "category");
    for (const [category, images] of Object.entries(groupedByCategory)) {
      parts.push(`- ${formatCategory(category)}: ${images.length} images`);
    }
  }

  return parts.join("\n");
}

function formatRelationshipType(type: string): string {
  const labels: Record<string, string> = {
    pairs_with: "pairs with",
    requires: "requires",
    replaces: "replaces",
    matches: "matches",
    completes: "completes",
    upgrades: "upgrades to",
  };
  return labels[type] || type;
}

function formatCategory(category: string): string {
  return category
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce(
    (acc, item) => {
      const k = String(item[key]);
      if (!acc[k]) acc[k] = [];
      acc[k].push(item);
      return acc;
    },
    {} as Record<string, T[]>
  );
}

// ============================================
// CACHE INVALIDATION
// ============================================

/**
 * Invalidate cached product knowledge for a specific product
 * Call this when product data, relationships, or scenarios change
 */
export async function invalidateProductKnowledgeCache(productId: string): Promise<void> {
  const cache = getCacheService();

  try {
    const deleted = await cache.invalidate(`kb:${productId}:*`);
    logger.info({ module: 'ProductKnowledge', productId, keysDeleted: deleted }, 'Product knowledge cache invalidated');
  } catch (err) {
    logger.error({ module: 'ProductKnowledge', err }, 'Failed to invalidate product knowledge cache');
  }
}

/**
 * Invalidate cached product knowledge for multiple products
 * Useful when bulk operations affect multiple products
 */
export async function invalidateMultiProductKnowledgeCache(productIds: string[]): Promise<void> {
  const cache = getCacheService();

  try {
    let totalDeleted = 0;
    for (const productId of productIds) {
      const deleted = await cache.invalidate(`kb:${productId}:*`);
      totalDeleted += deleted;
    }
    logger.info({ module: 'ProductKnowledge', productIds, totalKeysDeleted: totalDeleted }, 'Multiple product knowledge caches invalidated');
  } catch (err) {
    logger.error({ module: 'ProductKnowledge', err }, 'Failed to invalidate product knowledge caches');
  }
}

// ============================================
// EXPORTS
// ============================================

export const productKnowledgeService = {
  buildEnhancedContext,
  buildMultiProductContext,
  getFormattedRelationships,
  searchProductsByTagWithContext,
  getScenariosByRoomType,
  invalidateProductKnowledgeCache,
  invalidateMultiProductKnowledgeCache,
};
