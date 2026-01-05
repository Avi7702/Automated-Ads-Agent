import "dotenv/config";
import Firecrawl from "@mendable/firecrawl-js";
import { v2 as cloudinary } from "cloudinary";
import { db } from "../db";
import { products } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * NDS Website Scraper Service
 *
 * Scrapes all products from nextdaysteel.co.uk using Firecrawl,
 * downloads images to Cloudinary, and populates the database.
 *
 * Categories to scrape:
 * - Reinforcement Bars (T8-T40)
 * - Reinforcement Mesh (A142-B1131)
 * - Structural Steel
 * - Groundworks
 * - Accessories
 */

// Configure Cloudinary (optional - can work without it)
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Initialize Firecrawl (v2 unified client)
const firecrawl = new Firecrawl({
  apiKey: process.env.FIRECRAWL_API_KEY || undefined,
});

// NDS Website Configuration
const NDS_BASE_URL = "https://www.nextdaysteel.co.uk";

// Product categories to scrape
const CATEGORIES = [
  {
    name: "rebar",
    displayName: "Reinforcement Bars",
    url: "/collections/steel-reinforcement-bars",
    subcategories: ["T8", "T10", "T12", "T16", "T20", "T25", "T32", "T40"],
  },
  {
    name: "mesh",
    displayName: "Reinforcement Mesh",
    url: "/collections/reinforcement-mesh",
    subcategories: ["A142", "A193", "A252", "A393", "B283", "B385", "B503", "B785", "B1131"],
  },
  {
    name: "cut-bent",
    displayName: "Cut & Bent Rebar",
    url: "/collections/custom-cut-bent-rebars",
    subcategories: [],
  },
  {
    name: "structural",
    displayName: "Structural Steel",
    url: "/collections/structural-steel-steel-fabrication",
    subcategories: ["Flat Bar", "Equal Angles", "SHS", "Universal Beams", "Universal Columns"],
  },
  {
    name: "groundworks",
    displayName: "Groundworks",
    url: "/collections/groundworks",
    subcategories: ["Holding Down Bolts", "Trench Sheets", "Formwork", "Gas Venting"],
  },
  {
    name: "accessories",
    displayName: "Accessories",
    url: "/collections/accessories",
    subcategories: [
      "Reinforcement Accessories",
      "Formwork & Shuttering",
      "Slab Accessories",
      "Waterproofing",
      "Concrete Accessories",
      "Fencing",
    ],
  },
];

interface ScrapedProduct {
  name: string;
  url: string;
  description: string;
  imageUrls: string[];
  price?: string;
  specifications?: Record<string, string>;
  features?: string[];
  category: string;
  subcategory?: string;
  sku?: string;
}

interface ScrapeResult {
  category: string;
  products: ScrapedProduct[];
  errors: string[];
}

/**
 * Scrape a single collection page to get product list
 */
async function scrapeCollectionPage(categoryUrl: string): Promise<string[]> {
  console.log(`📄 Scraping collection: ${categoryUrl}`);

  try {
    const result = await firecrawl.scrape(`${NDS_BASE_URL}${categoryUrl}`, {
      formats: ["markdown", "links"],
    });

    // V2 API doesn't have success field, it throws on error
    // Extract product URLs from links
    const productUrls: string[] = [];
    const links = result.links || [];

    for (const link of links) {
      if (link.includes("/products/") && !productUrls.includes(link)) {
        productUrls.push(link);
      }
    }

    // Also try to extract from markdown content
    const markdown = result.markdown || "";
    const productUrlRegex = /\/products\/[a-z0-9-]+/gi;
    const matches = markdown.match(productUrlRegex) || [];

    for (const match of matches) {
      const fullUrl = `${NDS_BASE_URL}${match}`;
      if (!productUrls.includes(fullUrl)) {
        productUrls.push(fullUrl);
      }
    }

    console.log(`   Found ${productUrls.length} product URLs`);
    return productUrls;
  } catch (error) {
    console.error(`Error scraping collection ${categoryUrl}:`, error);
    return [];
  }
}

/**
 * Scrape a single product page for details
 */
async function scrapeProductPage(productUrl: string, category: string): Promise<ScrapedProduct | null> {
  console.log(`   🔍 Scraping product: ${productUrl}`);

  try {
    const result = await firecrawl.scrape(productUrl, {
      formats: ["markdown", "html"],
    });

    // V2 API throws on error, no success field check needed
    const markdown = result.markdown || "";
    const html = result.html || "";

    // Extract product name (usually first H1)
    const nameMatch = markdown.match(/^#\s+(.+)$/m) || markdown.match(/^##\s+(.+)$/m);
    const name = nameMatch ? nameMatch[1].trim() : extractNameFromUrl(productUrl);

    // Extract description (paragraphs after the title)
    const descriptionMatch = markdown.match(/(?:^|\n)([A-Z][^#\n]{50,500})/);
    const description = descriptionMatch ? descriptionMatch[1].trim() : "";

    // Extract image URLs from HTML
    const imageUrls: string[] = [];
    const imgRegex = /src=["']([^"']*(?:cdn\.shopify\.com|nextdaysteel)[^"']*\.(?:jpg|jpeg|png|webp)[^"']*)["']/gi;
    let imgMatch;
    while ((imgMatch = imgRegex.exec(html)) !== null) {
      let imgUrl = imgMatch[1];
      // Ensure HTTPS and clean URL
      if (imgUrl.startsWith("//")) imgUrl = "https:" + imgUrl;
      if (!imageUrls.includes(imgUrl) && !imgUrl.includes("logo") && !imgUrl.includes("icon")) {
        imageUrls.push(imgUrl);
      }
    }

    // Extract price if available
    const priceMatch = markdown.match(/[£$][\d,]+\.?\d*/);
    const price = priceMatch ? priceMatch[0] : undefined;

    // Extract specifications from tables or lists
    const specifications: Record<string, string> = {};
    const specRegex = /\*\*([^*]+)\*\*[:\s]+([^\n*]+)/g;
    let specMatch;
    while ((specMatch = specRegex.exec(markdown)) !== null) {
      specifications[specMatch[1].trim()] = specMatch[2].trim();
    }

    // Extract features (bullet points)
    const features: string[] = [];
    const featureRegex = /^[-*]\s+(.+)$/gm;
    let featureMatch;
    while ((featureMatch = featureRegex.exec(markdown)) !== null) {
      const feature = featureMatch[1].trim();
      if (feature.length > 10 && feature.length < 200) {
        features.push(feature);
      }
    }

    // Extract SKU if available
    const skuMatch = markdown.match(/SKU[:\s]+([A-Z0-9-]+)/i) || markdown.match(/Product Code[:\s]+([A-Z0-9-]+)/i);
    const sku = skuMatch ? skuMatch[1] : generateSku(name, category);

    return {
      name,
      url: productUrl,
      description,
      imageUrls: imageUrls.slice(0, 5), // Max 5 images per product
      price,
      specifications,
      features: features.slice(0, 10), // Max 10 features
      category,
      sku,
    };
  } catch (error) {
    console.error(`Error scraping product ${productUrl}:`, error);
    return null;
  }
}

/**
 * Extract product name from URL
 */
function extractNameFromUrl(url: string): string {
  const slug = url.split("/products/")[1] || url.split("/").pop() || "unknown";
  return slug
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Generate SKU from product name and category
 */
function generateSku(name: string, category: string): string {
  const prefix = category.toUpperCase().substring(0, 3);
  const namePart = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .substring(0, 10);
  return `NDS-${prefix}-${namePart}`;
}

/**
 * Upload image to Cloudinary
 */
async function uploadImageToCloudinary(
  imageUrl: string,
  productName: string,
  category: string
): Promise<{ url: string; publicId: string } | null> {
  try {
    const slug = productName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .substring(0, 50);

    const result = await cloudinary.uploader.upload(imageUrl, {
      folder: `product-library/${category}`,
      public_id: slug,
      overwrite: true,
      resource_type: "image",
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
    };
  } catch (error) {
    console.error(`Failed to upload image for ${productName}:`, error);
    return null;
  }
}

/**
 * Save product to database
 * Works with or without Cloudinary - uses source URL if Cloudinary not available
 */
async function saveProductToDatabase(
  product: ScrapedProduct,
  cloudinaryData?: { url: string; publicId: string } | null
) {
  try {
    // Check if product exists by SKU or name
    const existing = await db.query.products.findFirst({
      where: eq(products.sku, product.sku || ""),
    });

    // Use Cloudinary URL if available, otherwise use source image URL
    const imageUrl = cloudinaryData?.url || product.imageUrls[0] || "";
    const publicId = cloudinaryData?.publicId || `source/${product.category}/${product.sku}`;

    const productData = {
      name: product.name,
      cloudinaryUrl: imageUrl,
      cloudinaryPublicId: publicId,
      category: product.category,
      description: product.description || `${product.name} - High quality steel reinforcement product from Next Day Steel.`,
      features: product.specifications || {},
      benefits: product.features || [],
      specifications: {
        price: product.price,
        sourceUrl: product.url,
        sourceImageUrls: product.imageUrls, // Keep all source URLs for later Cloudinary upload
        ...product.specifications,
      },
      tags: generateTags(product),
      sku: product.sku,
      enrichmentStatus: "draft" as const,
      enrichmentSource: "web_scrape" as const,
    };

    if (existing) {
      await db.update(products).set(productData).where(eq(products.id, existing.id));
      console.log(`   🔄 Updated: ${product.name}`);
      return { action: "updated", id: existing.id };
    } else {
      const [newProduct] = await db.insert(products).values(productData).returning();
      console.log(`   ✨ Created: ${product.name}`);
      return { action: "created", id: newProduct.id };
    }
  } catch (error) {
    console.error(`Failed to save product ${product.name}:`, error);
    return { action: "error", error };
  }
}

/**
 * Generate tags from product data
 */
function generateTags(product: ScrapedProduct): string[] {
  const tags: string[] = [product.category];

  // Add subcategory if available
  if (product.subcategory) {
    tags.push(product.subcategory.toLowerCase());
  }

  // Extract tags from name
  const nameWords = product.name.toLowerCase().split(/\s+/);
  for (const word of nameWords) {
    if (word.length > 2 && !tags.includes(word)) {
      // Common product identifiers
      if (/^[abt]\d+$/i.test(word)) tags.push(word); // A142, T10, B283
      if (word.includes("mesh")) tags.push("mesh");
      if (word.includes("rebar") || word.includes("bar")) tags.push("rebar");
      if (word.includes("spacer")) tags.push("spacer");
      if (word.includes("wire")) tags.push("wire");
    }
  }

  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Scrape a single category
 */
async function scrapeCategory(category: (typeof CATEGORIES)[0]): Promise<ScrapeResult> {
  console.log(`\n${"═".repeat(60)}`);
  console.log(`📦 SCRAPING: ${category.displayName}`);
  console.log(`${"═".repeat(60)}`);

  const result: ScrapeResult = {
    category: category.name,
    products: [],
    errors: [],
  };

  try {
    // Get all product URLs from the collection
    const productUrls = await scrapeCollectionPage(category.url);

    if (productUrls.length === 0) {
      result.errors.push(`No products found in ${category.displayName}`);
      return result;
    }

    console.log(`\n📋 Processing ${productUrls.length} products...`);

    // Scrape each product (with rate limiting)
    for (let i = 0; i < productUrls.length; i++) {
      const url = productUrls[i];
      console.log(`\n[${i + 1}/${productUrls.length}]`);

      const product = await scrapeProductPage(url, category.name);

      if (product) {
        result.products.push(product);

        // Try to upload to Cloudinary if configured, otherwise save with source URL
        let cloudinaryData = null;
        if (isCloudinaryConfigured && product.imageUrls.length > 0) {
          cloudinaryData = await uploadImageToCloudinary(
            product.imageUrls[0],
            product.name,
            category.name
          );
        }

        // Save to database (works with or without Cloudinary)
        if (product.imageUrls.length > 0 || cloudinaryData) {
          await saveProductToDatabase(product, cloudinaryData);
        } else {
          result.errors.push(`No images found for ${product.name}`);
        }
      } else {
        result.errors.push(`Failed to scrape ${url}`);
      }

      // Rate limiting: wait 1 second between requests
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  } catch (error) {
    result.errors.push(`Category error: ${error}`);
  }

  return result;
}

/**
 * Main scraping function - scrapes all categories
 */
export async function scrapeNDSWebsite(options?: {
  categories?: string[];
  dryRun?: boolean;
  limit?: number;
}): Promise<{
  totalProducts: number;
  created: number;
  updated: number;
  errors: string[];
  byCategory: Record<string, { count: number; errors: string[] }>;
}> {
  console.log("\n" + "═".repeat(70));
  console.log("  NDS WEBSITE SCRAPER");
  console.log("  Scraping products from nextdaysteel.co.uk");
  console.log("═".repeat(70));

  if (!process.env.FIRECRAWL_API_KEY) {
    throw new Error("FIRECRAWL_API_KEY not set in environment variables");
  }

  const results = {
    totalProducts: 0,
    created: 0,
    updated: 0,
    errors: [] as string[],
    byCategory: {} as Record<string, { count: number; errors: string[] }>,
  };

  // Filter categories if specified
  const categoriesToScrape = options?.categories
    ? CATEGORIES.filter((c) => options.categories!.includes(c.name))
    : CATEGORIES;

  console.log(`\n📋 Categories to scrape: ${categoriesToScrape.map((c) => c.displayName).join(", ")}`);
  if (options?.dryRun) console.log("🔍 DRY RUN MODE - No database changes");
  if (options?.limit) console.log(`📊 Limit: ${options.limit} products per category`);

  for (const category of categoriesToScrape) {
    const categoryResult = await scrapeCategory(category);

    results.byCategory[category.name] = {
      count: categoryResult.products.length,
      errors: categoryResult.errors,
    };

    results.totalProducts += categoryResult.products.length;
    results.errors.push(...categoryResult.errors);
  }

  // Print summary
  console.log("\n" + "═".repeat(70));
  console.log("  SCRAPING COMPLETE - SUMMARY");
  console.log("═".repeat(70));
  console.log(`\n  Total Products Scraped: ${results.totalProducts}`);
  console.log(`  Total Errors: ${results.errors.length}`);
  console.log("\n  By Category:");
  for (const [cat, data] of Object.entries(results.byCategory)) {
    console.log(`    ${cat}: ${data.count} products, ${data.errors.length} errors`);
  }

  return results;
}

/**
 * Scrape a single category by name
 */
export async function scrapeSingleCategory(categoryName: string) {
  const category = CATEGORIES.find((c) => c.name === categoryName);
  if (!category) {
    throw new Error(`Unknown category: ${categoryName}. Valid: ${CATEGORIES.map((c) => c.name).join(", ")}`);
  }
  return scrapeCategory(category);
}

/**
 * Get list of available categories
 */
export function getAvailableCategories() {
  return CATEGORIES.map((c) => ({
    name: c.name,
    displayName: c.displayName,
    url: c.url,
    subcategories: c.subcategories,
  }));
}
