/**
 * Brand Image Recommendation RAG Service
 *
 * A Retrieval-Augmented Generation (RAG) service that recommends relevant brand images
 * based on context. Uses semantic matching and scoring to find the best images for
 * different use cases like ad creation, social posts, and email campaigns.
 *
 * Key capabilities:
 * 1. Recommend images based on multi-factor context (product, use case, platform, mood)
 * 2. Match images to specific products using relationship and tag analysis
 * 3. Suggest appropriate image categories based on use case
 *
 * Categories supported (from brandImages table):
 * - historical_ad: Past advertising images
 * - product_hero: Hero shots of products
 * - installation: Installation/setup images
 * - detail: Close-up detail shots
 * - lifestyle: Lifestyle context images
 * - comparison: Before/after or comparison images
 */

import { storage } from "../storage";
import type { BrandImage, Product, ProductAnalysis } from "@shared/schema";

// ============================================
// TYPES
// ============================================

/**
 * Context for image recommendations
 */
export interface RecommendationContext {
  /** Product IDs to consider for recommendations */
  productIds?: string[];
  /** Use case for the images (e.g., "ad creation", "social post", "email") */
  useCase: string;
  /** Target platform (e.g., "instagram", "linkedin", "facebook") */
  platform?: string;
  /** Desired mood/style (e.g., "luxury", "cozy", "professional") */
  mood?: string;
  /** User ID for accessing brand images */
  userId: string;
  /** Maximum number of recommendations to return */
  maxResults?: number;
  /** Optional aspect ratio preference */
  aspectRatio?: string;
  /** Optional category filter */
  categoryFilter?: BrandImageCategory[];
}

/**
 * A single image recommendation with metadata
 */
export interface ImageRecommendation {
  /** Image ID from brandImages table */
  imageId: string;
  /** Cloudinary URL for the image */
  imageUrl: string;
  /** Image category */
  category: BrandImageCategory;
  /** Relevance score (0-100) */
  relevanceScore: number;
  /** Suggested use for this image in the current context */
  suggestedUse: string;
  /** Reasoning for why this image was recommended */
  reasoning: string;
  /** Tags associated with the image */
  tags?: string[];
  /** Image description if available */
  description?: string;
  /** Aspect ratio if known */
  aspectRatio?: string;
  /** Product IDs this image is associated with */
  associatedProductIds?: string[];
}

/**
 * Response from image recommendations
 */
export interface RecommendationResponse {
  /** List of recommended images sorted by relevance */
  recommendations: ImageRecommendation[];
  /** Total images considered */
  totalConsidered: number;
  /** Context that was used for matching */
  matchContext: {
    useCase: string;
    platform?: string;
    mood?: string;
    productCount: number;
    categoriesSearched: BrandImageCategory[];
  };
}

/**
 * Category suggestion result
 */
export interface CategorySuggestion {
  /** Suggested category */
  category: BrandImageCategory;
  /** Confidence score (0-100) */
  confidence: number;
  /** Reason for suggestion */
  reason: string;
}

/**
 * Brand image categories (matches schema enum)
 */
export type BrandImageCategory =
  | "historical_ad"
  | "product_hero"
  | "installation"
  | "detail"
  | "lifestyle"
  | "comparison";

// All available categories
const ALL_CATEGORIES: BrandImageCategory[] = [
  "historical_ad",
  "product_hero",
  "installation",
  "detail",
  "lifestyle",
  "comparison",
];

// ============================================
// USE CASE MAPPINGS
// ============================================

/**
 * Maps use cases to their most relevant image categories
 */
const USE_CASE_CATEGORY_MAP: Record<string, BrandImageCategory[]> = {
  // Ad creation use cases
  "ad creation": ["product_hero", "lifestyle", "historical_ad"],
  "ad": ["product_hero", "lifestyle", "historical_ad"],
  "advertisement": ["product_hero", "lifestyle", "historical_ad"],
  "advertising": ["product_hero", "lifestyle", "historical_ad"],

  // Social media use cases
  "social post": ["lifestyle", "product_hero", "detail"],
  "social media": ["lifestyle", "product_hero", "detail"],
  "instagram": ["lifestyle", "product_hero", "detail"],
  "facebook": ["lifestyle", "product_hero", "historical_ad"],
  "linkedin": ["product_hero", "installation", "comparison"],
  "twitter": ["product_hero", "lifestyle"],
  "tiktok": ["lifestyle", "installation", "detail"],

  // Email use cases
  "email": ["product_hero", "lifestyle", "comparison"],
  "email marketing": ["product_hero", "lifestyle", "comparison"],
  "newsletter": ["product_hero", "lifestyle", "detail"],

  // Product-focused use cases
  "product showcase": ["product_hero", "detail", "comparison"],
  "product detail": ["detail", "product_hero", "installation"],
  "hero image": ["product_hero", "lifestyle"],
  "feature highlight": ["detail", "comparison", "product_hero"],

  // Context-focused use cases
  "lifestyle": ["lifestyle", "installation"],
  "inspiration": ["lifestyle", "historical_ad", "installation"],
  "how-to": ["installation", "detail", "comparison"],
  "tutorial": ["installation", "detail"],
  "before after": ["comparison", "installation"],
  "comparison": ["comparison", "detail"],

  // Generic fallback
  "default": ["product_hero", "lifestyle", "detail"],
};

/**
 * Maps platforms to preferred aspect ratios and image types
 */
const PLATFORM_PREFERENCES: Record<string, {
  preferredAspectRatios: string[];
  preferredCategories: BrandImageCategory[];
}> = {
  instagram: {
    preferredAspectRatios: ["1:1", "4:5", "9:16"],
    preferredCategories: ["lifestyle", "product_hero", "detail"],
  },
  facebook: {
    preferredAspectRatios: ["1:1", "16:9", "4:5"],
    preferredCategories: ["lifestyle", "product_hero", "historical_ad"],
  },
  linkedin: {
    preferredAspectRatios: ["1:1", "16:9", "1.91:1"],
    preferredCategories: ["product_hero", "installation", "comparison"],
  },
  twitter: {
    preferredAspectRatios: ["16:9", "1:1", "2:1"],
    preferredCategories: ["product_hero", "lifestyle"],
  },
  tiktok: {
    preferredAspectRatios: ["9:16"],
    preferredCategories: ["lifestyle", "installation", "detail"],
  },
  pinterest: {
    preferredAspectRatios: ["2:3", "1:1", "9:16"],
    preferredCategories: ["lifestyle", "product_hero", "installation"],
  },
};

/**
 * Maps moods to category preferences
 */
const MOOD_CATEGORY_MAP: Record<string, BrandImageCategory[]> = {
  luxury: ["product_hero", "lifestyle", "detail"],
  cozy: ["lifestyle", "installation", "detail"],
  professional: ["product_hero", "comparison", "installation"],
  modern: ["product_hero", "lifestyle", "detail"],
  rustic: ["lifestyle", "installation", "detail"],
  minimalist: ["product_hero", "detail"],
  vibrant: ["lifestyle", "product_hero", "historical_ad"],
  industrial: ["installation", "detail", "product_hero"],
  elegant: ["product_hero", "lifestyle", "detail"],
  casual: ["lifestyle", "installation"],
};

// ============================================
// MAIN SERVICE FUNCTIONS
// ============================================

/**
 * Recommend images based on context
 *
 * Uses a multi-factor scoring system considering:
 * - Use case alignment
 * - Platform compatibility
 * - Mood matching
 * - Product associations
 * - Tag relevance
 */
export async function recommendImages(
  context: RecommendationContext
): Promise<RecommendationResponse> {
  const {
    productIds = [],
    useCase,
    platform,
    mood,
    userId,
    maxResults = 5,
    aspectRatio,
    categoryFilter,
  } = context;

  // Determine which categories to search
  const categoriesToSearch = categoryFilter || determineCategories(useCase, platform, mood);

  // Fetch all relevant brand images for the user
  const allImages = await fetchUserBrandImages(userId, categoriesToSearch);

  // If we have product IDs, also fetch product-specific images
  let productImages: BrandImage[] = [];
  let products: Product[] = [];
  let productAnalyses: Map<string, ProductAnalysis> = new Map();

  if (productIds.length > 0) {
    [productImages, products] = await Promise.all([
      storage.getBrandImagesForProducts(productIds, userId),
      storage.getProductsByIds(productIds),
    ]);

    // Get product analyses for better matching
    const analyses = await Promise.all(
      productIds.map((id) => storage.getProductAnalysisByProductId(id))
    );
    analyses.forEach((analysis, i) => {
      if (analysis) {
        productAnalyses.set(productIds[i], analysis);
      }
    });
  }

  // Combine and deduplicate images
  const imageMap = new Map<string, BrandImage>();
  [...allImages, ...productImages].forEach((img) => {
    imageMap.set(img.id, img);
  });
  const uniqueImages = Array.from(imageMap.values());

  // Score and rank images
  const scoredImages = uniqueImages.map((image) => ({
    image,
    score: calculateRelevanceScore(image, {
      useCase,
      platform,
      mood,
      productIds,
      products,
      productAnalyses,
      aspectRatio,
      categoriesToSearch,
    }),
  }));

  // Sort by score and take top results
  scoredImages.sort((a, b) => b.score.total - a.score.total);
  const topImages = scoredImages.slice(0, maxResults);

  // Build recommendations
  const recommendations: ImageRecommendation[] = topImages.map(({ image, score }) => ({
    imageId: image.id,
    imageUrl: image.cloudinaryUrl,
    category: image.category as BrandImageCategory,
    relevanceScore: Math.round(score.total),
    suggestedUse: generateSuggestedUse(image, useCase, platform),
    reasoning: generateReasoning(score),
    tags: image.tags || undefined,
    description: image.description || undefined,
    aspectRatio: image.aspectRatio || undefined,
    associatedProductIds: image.productIds || undefined,
  }));

  return {
    recommendations,
    totalConsidered: uniqueImages.length,
    matchContext: {
      useCase,
      platform,
      mood,
      productCount: productIds.length,
      categoriesSearched: categoriesToSearch,
    },
  };
}

/**
 * Find images matching a specific product
 *
 * Uses product metadata, tags, and analysis to find the most relevant images
 */
export async function matchImagesForProduct(
  productId: string,
  userId: string,
  options: {
    maxResults?: number;
    categoryFilter?: BrandImageCategory[];
  } = {}
): Promise<ImageRecommendation[]> {
  const { maxResults = 5, categoryFilter } = options;

  // Fetch product details
  const product = await storage.getProductById(productId);
  if (!product) {
    return [];
  }

  // Fetch product analysis if available
  const analysis = await storage.getProductAnalysisByProductId(productId);

  // Determine categories based on product type
  const categories = categoryFilter || inferCategoriesFromProduct(product, analysis);

  // Fetch images that match the product or its categories
  const [productImages, categoryImages] = await Promise.all([
    storage.getBrandImagesForProducts([productId], userId),
    fetchUserBrandImages(userId, categories),
  ]);

  // Combine and deduplicate
  const imageMap = new Map<string, BrandImage>();
  [...productImages, ...categoryImages].forEach((img) => {
    imageMap.set(img.id, img);
  });
  const uniqueImages = Array.from(imageMap.values());

  // Score images based on product matching
  const scoredImages = uniqueImages.map((image) => ({
    image,
    score: calculateProductMatchScore(image, product, analysis),
  }));

  // Sort and take top results
  scoredImages.sort((a, b) => b.score.total - a.score.total);
  const topImages = scoredImages.slice(0, maxResults);

  return topImages.map(({ image, score }) => ({
    imageId: image.id,
    imageUrl: image.cloudinaryUrl,
    category: image.category as BrandImageCategory,
    relevanceScore: Math.round(score.total),
    suggestedUse: generateProductSuggestedUse(image, product),
    reasoning: generateProductMatchReasoning(score, product),
    tags: image.tags || undefined,
    description: image.description || undefined,
    aspectRatio: image.aspectRatio || undefined,
    associatedProductIds: image.productIds || undefined,
  }));
}

/**
 * Suggest which image category to use based on use case
 *
 * Returns ranked suggestions with confidence scores
 */
export function suggestImageCategory(
  useCase: string,
  options: {
    platform?: string;
    mood?: string;
    maxSuggestions?: number;
  } = {}
): CategorySuggestion[] {
  const { platform, mood, maxSuggestions = 3 } = options;
  const normalizedUseCase = useCase.toLowerCase().trim();

  // Get base categories from use case
  const useCaseCategories = USE_CASE_CATEGORY_MAP[normalizedUseCase] ||
    USE_CASE_CATEGORY_MAP["default"];

  // Score each category
  const categoryScores: Map<BrandImageCategory, {
    score: number;
    reasons: string[];
  }> = new Map();

  // Initialize all categories
  ALL_CATEGORIES.forEach((cat) => {
    categoryScores.set(cat, { score: 0, reasons: [] });
  });

  // Score based on use case mapping
  useCaseCategories.forEach((cat, index) => {
    const entry = categoryScores.get(cat)!;
    const boost = (useCaseCategories.length - index) * 20;
    entry.score += boost;
    entry.reasons.push(`Matches "${useCase}" use case`);
  });

  // Boost based on platform
  if (platform) {
    const platformPrefs = PLATFORM_PREFERENCES[platform.toLowerCase()];
    if (platformPrefs) {
      platformPrefs.preferredCategories.forEach((cat, index) => {
        const entry = categoryScores.get(cat)!;
        const boost = (platformPrefs.preferredCategories.length - index) * 10;
        entry.score += boost;
        entry.reasons.push(`Recommended for ${platform}`);
      });
    }
  }

  // Boost based on mood
  if (mood) {
    const moodCategories = MOOD_CATEGORY_MAP[mood.toLowerCase()];
    if (moodCategories) {
      moodCategories.forEach((cat, index) => {
        const entry = categoryScores.get(cat)!;
        const boost = (moodCategories.length - index) * 8;
        entry.score += boost;
        entry.reasons.push(`Fits "${mood}" mood`);
      });
    }
  }

  // Convert to array and sort
  const suggestions: CategorySuggestion[] = Array.from(categoryScores.entries())
    .map(([category, { score, reasons }]) => ({
      category,
      confidence: Math.min(100, Math.round(score)),
      reason: reasons.length > 0 ? reasons.join("; ") : "General recommendation",
    }))
    .filter((s) => s.confidence > 0)
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxSuggestions);

  return suggestions;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Fetch user's brand images filtered by categories
 */
async function fetchUserBrandImages(
  userId: string,
  categories: BrandImageCategory[]
): Promise<BrandImage[]> {
  const imagePromises = categories.map((cat) =>
    storage.getBrandImagesByCategory(userId, cat)
  );
  const imageArrays = await Promise.all(imagePromises);
  return imageArrays.flat();
}

/**
 * Determine which categories to search based on context
 */
function determineCategories(
  useCase: string,
  platform?: string,
  mood?: string
): BrandImageCategory[] {
  const normalizedUseCase = useCase.toLowerCase().trim();
  const categories = new Set<BrandImageCategory>();

  // Add use case categories
  const useCaseCategories = USE_CASE_CATEGORY_MAP[normalizedUseCase] ||
    USE_CASE_CATEGORY_MAP["default"];
  useCaseCategories.forEach((cat) => categories.add(cat));

  // Add platform categories
  if (platform) {
    const platformPrefs = PLATFORM_PREFERENCES[platform.toLowerCase()];
    if (platformPrefs) {
      platformPrefs.preferredCategories.forEach((cat) => categories.add(cat));
    }
  }

  // Add mood categories
  if (mood) {
    const moodCategories = MOOD_CATEGORY_MAP[mood.toLowerCase()];
    if (moodCategories) {
      moodCategories.forEach((cat) => categories.add(cat));
    }
  }

  return Array.from(categories);
}

/**
 * Infer relevant categories from product data
 */
function inferCategoriesFromProduct(
  product: Product,
  analysis: ProductAnalysis | null | undefined
): BrandImageCategory[] {
  const categories = new Set<BrandImageCategory>();

  // Always include product hero and detail
  categories.add("product_hero");
  categories.add("detail");

  // Add lifestyle if we have context information
  if (analysis?.usageContext || product.description) {
    categories.add("lifestyle");
  }

  // Add installation if product has installation info
  if (product.features || analysis?.materials) {
    categories.add("installation");
  }

  // Add comparison if product has comparison-worthy features
  if (product.benefits && product.benefits.length > 2) {
    categories.add("comparison");
  }

  return Array.from(categories);
}

interface ScoreBreakdown {
  total: number;
  categoryScore: number;
  platformScore: number;
  moodScore: number;
  productScore: number;
  tagScore: number;
  aspectRatioScore: number;
}

/**
 * Calculate relevance score for an image
 */
function calculateRelevanceScore(
  image: BrandImage,
  context: {
    useCase: string;
    platform?: string;
    mood?: string;
    productIds: string[];
    products: Product[];
    productAnalyses: Map<string, ProductAnalysis>;
    aspectRatio?: string;
    categoriesToSearch: BrandImageCategory[];
  }
): ScoreBreakdown {
  let categoryScore = 0;
  let platformScore = 0;
  let moodScore = 0;
  let productScore = 0;
  let tagScore = 0;
  let aspectRatioScore = 0;

  // Category relevance (max 30 points)
  const categoryIndex = context.categoriesToSearch.indexOf(
    image.category as BrandImageCategory
  );
  if (categoryIndex !== -1) {
    categoryScore = Math.max(0, 30 - categoryIndex * 5);
  }

  // Platform compatibility (max 20 points)
  if (context.platform) {
    const platformPrefs = PLATFORM_PREFERENCES[context.platform.toLowerCase()];
    if (platformPrefs) {
      // Check aspect ratio compatibility
      if (image.aspectRatio && platformPrefs.preferredAspectRatios.includes(image.aspectRatio)) {
        platformScore += 10;
      }
      // Check category preference
      if (platformPrefs.preferredCategories.includes(image.category as BrandImageCategory)) {
        platformScore += 10;
      }
    }
  }

  // Mood matching (max 15 points)
  if (context.mood) {
    const moodCategories = MOOD_CATEGORY_MAP[context.mood.toLowerCase()];
    if (moodCategories && moodCategories.includes(image.category as BrandImageCategory)) {
      moodScore = 15;
    }
    // Check image tags for mood keywords
    if (image.tags?.some((tag) => tag.toLowerCase().includes(context.mood!.toLowerCase()))) {
      moodScore = Math.min(15, moodScore + 10);
    }
  }

  // Product association (max 25 points)
  if (context.productIds.length > 0) {
    // Direct product association
    const directMatch = image.productIds?.some((pid) => context.productIds.includes(pid));
    if (directMatch) {
      productScore = 25;
    } else {
      // Tag overlap with products
      const productTags = context.products.flatMap((p) => p.tags || []);
      const analysisData = Array.from(context.productAnalyses.values());
      const analysisTags = analysisData.flatMap((a) => [
        ...(a.materials || []),
        ...(a.colors || []),
        a.style,
        a.category,
        a.subcategory,
      ].filter(Boolean) as string[]);

      const allProductTags = [...productTags, ...analysisTags].map((t) => t.toLowerCase());
      const imageTags = (image.tags || []).map((t) => t.toLowerCase());
      const tagOverlap = imageTags.filter((t) => allProductTags.includes(t)).length;

      productScore = Math.min(20, tagOverlap * 5);
    }
  }

  // Tag relevance (max 10 points)
  const useCaseWords = context.useCase.toLowerCase().split(/\s+/);
  const imageTags = (image.tags || []).map((t) => t.toLowerCase());
  const tagMatches = imageTags.filter((tag) =>
    useCaseWords.some((word) => tag.includes(word) || word.includes(tag))
  ).length;
  tagScore = Math.min(10, tagMatches * 3);

  // Aspect ratio preference (bonus 5 points)
  if (context.aspectRatio && image.aspectRatio === context.aspectRatio) {
    aspectRatioScore = 5;
  }

  const total = categoryScore + platformScore + moodScore + productScore + tagScore + aspectRatioScore;

  return {
    total,
    categoryScore,
    platformScore,
    moodScore,
    productScore,
    tagScore,
    aspectRatioScore,
  };
}

/**
 * Calculate match score specifically for product matching
 */
function calculateProductMatchScore(
  image: BrandImage,
  product: Product,
  analysis: ProductAnalysis | null | undefined
): ScoreBreakdown {
  let categoryScore = 0;
  let productScore = 0;
  let tagScore = 0;

  // Direct product association (max 40 points)
  if (image.productIds?.includes(product.id)) {
    productScore = 40;
  }

  // Category relevance based on suggested use (max 20 points)
  const suggestedUses = image.suggestedUse || [];
  if (suggestedUses.includes("hero") && image.category === "product_hero") {
    categoryScore = 20;
  } else if (suggestedUses.includes("detail") && image.category === "detail") {
    categoryScore = 18;
  } else if (suggestedUses.length > 0) {
    categoryScore = 10;
  }

  // Tag matching (max 30 points)
  const productTags = (product.tags || []).map((t) => t.toLowerCase());
  const imageTags = (image.tags || []).map((t) => t.toLowerCase());

  // Add analysis data to matching
  if (analysis) {
    const analysisTags = [
      ...(analysis.materials || []),
      ...(analysis.colors || []),
      analysis.style,
      analysis.category,
      analysis.subcategory,
    ].filter(Boolean).map((t) => (t as string).toLowerCase());
    productTags.push(...analysisTags);
  }

  const tagOverlap = imageTags.filter((t) => productTags.includes(t)).length;
  tagScore = Math.min(30, tagOverlap * 6);

  // Description matching (bonus 10 points)
  let descriptionBonus = 0;
  if (image.description && product.name) {
    const descLower = image.description.toLowerCase();
    const nameLower = product.name.toLowerCase();
    if (descLower.includes(nameLower) || nameLower.split(/\s+/).some((w) => descLower.includes(w))) {
      descriptionBonus = 10;
    }
  }

  const total = productScore + categoryScore + tagScore + descriptionBonus;

  return {
    total,
    categoryScore,
    platformScore: 0,
    moodScore: 0,
    productScore,
    tagScore,
    aspectRatioScore: descriptionBonus,
  };
}

/**
 * Generate suggested use text for an image
 */
function generateSuggestedUse(
  image: BrandImage,
  useCase: string,
  platform?: string
): string {
  const category = image.category as BrandImageCategory;

  // Build suggestion based on category and context
  const categoryUsage: Record<BrandImageCategory, string> = {
    historical_ad: "Reference for proven ad style and composition",
    product_hero: "Main product showcase or hero image",
    installation: "Show product in use or installation process",
    detail: "Highlight specific features or quality details",
    lifestyle: "Create aspirational context or lifestyle appeal",
    comparison: "Demonstrate value or before/after transformation",
  };

  let suggestion = categoryUsage[category] || "General reference image";

  // Add platform-specific advice
  if (platform) {
    const platformAdvice: Record<string, string> = {
      instagram: " - ideal for visually-driven storytelling",
      linkedin: " - suitable for professional presentation",
      facebook: " - good for engaging social content",
      twitter: " - works for quick visual impact",
      tiktok: " - can be used as background or reference",
    };
    suggestion += platformAdvice[platform.toLowerCase()] || "";
  }

  return suggestion;
}

/**
 * Generate suggested use for product-specific matching
 */
function generateProductSuggestedUse(image: BrandImage, product: Product): string {
  const category = image.category as BrandImageCategory;

  switch (category) {
    case "product_hero":
      return `Hero shot for ${product.name} marketing materials`;
    case "detail":
      return `Close-up detail for showcasing ${product.name} quality`;
    case "installation":
      return `Installation reference for ${product.name}`;
    case "lifestyle":
      return `Lifestyle context showing ${product.name} in use`;
    case "comparison":
      return `Comparison image featuring ${product.name}`;
    case "historical_ad":
      return `Previous advertising featuring ${product.name}`;
    default:
      return `Reference image for ${product.name}`;
  }
}

/**
 * Generate reasoning explanation for the recommendation
 */
function generateReasoning(score: ScoreBreakdown): string {
  const reasons: string[] = [];

  if (score.categoryScore > 20) {
    reasons.push("Highly relevant category");
  } else if (score.categoryScore > 10) {
    reasons.push("Good category fit");
  }

  if (score.platformScore > 15) {
    reasons.push("Excellent platform compatibility");
  } else if (score.platformScore > 8) {
    reasons.push("Compatible with target platform");
  }

  if (score.moodScore > 10) {
    reasons.push("Strong mood alignment");
  }

  if (score.productScore > 20) {
    reasons.push("Directly associated with product");
  } else if (score.productScore > 10) {
    reasons.push("Related to product attributes");
  }

  if (score.tagScore > 6) {
    reasons.push("Multiple tag matches");
  }

  if (score.aspectRatioScore > 0) {
    reasons.push("Matches preferred aspect ratio");
  }

  return reasons.length > 0
    ? reasons.join("; ")
    : "General relevance to request";
}

/**
 * Generate reasoning for product match
 */
function generateProductMatchReasoning(score: ScoreBreakdown, product: Product): string {
  const reasons: string[] = [];

  if (score.productScore >= 40) {
    reasons.push(`Directly tagged with ${product.name}`);
  } else if (score.productScore > 20) {
    reasons.push("Strong product association");
  }

  if (score.categoryScore > 15) {
    reasons.push("Optimal image type for product");
  }

  if (score.tagScore > 20) {
    reasons.push("Many matching attributes");
  } else if (score.tagScore > 10) {
    reasons.push("Some matching attributes");
  }

  if (score.aspectRatioScore > 0) {
    reasons.push("Description mentions product");
  }

  return reasons.length > 0
    ? reasons.join("; ")
    : "General product relevance";
}

// ============================================
// EXPORTS
// ============================================

export const brandImageRecommendationRAG = {
  recommendImages,
  matchImagesForProduct,
  suggestImageCategory,
};
