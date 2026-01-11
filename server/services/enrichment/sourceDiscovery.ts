/**
 * Source Discovery Service
 *
 * Finds authoritative data sources for products using:
 * 1. Google Search via Gemini grounding
 * 2. Direct website scraping for known sources
 * 3. Priority ranking by source trustworthiness
 *
 * Priority order:
 * - NDS official website (ndspro.com) - trustLevel: 10
 * - Manufacturer websites - trustLevel: 8-9
 * - Major distributors (Ferguson, HD Supply) - trustLevel: 7-8
 * - Industry databases - trustLevel: 6
 * - General web results - trustLevel: 4
 */

import { generateContentWithRetry } from "../../lib/geminiClient";
import {
  SOURCE_TRUST_LEVELS,
  DEFAULT_PIPELINE_CONFIG,
  type SourceSearchResult,
  type SourceType,
  type VisionResult,
  type PipelineConfig,
} from "./types";

// ============================================
// CONSTANTS
// ============================================

// Search model - uses Google Search grounding
// MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.
const SEARCH_MODEL = process.env.GEMINI_SEARCH_MODEL || "gemini-2.5-flash";

// Known trusted domains for construction products
const TRUSTED_DOMAINS = [
  "ndspro.com",
  "nds.com",
  "ferguson.com",
  "hdsupply.com",
  "homedepot.com",
  "lowes.com",
  "menards.com",
  "grainger.com",
  "sweets.construction.com",
  "arcat.com",
];

// ============================================
// MAIN DISCOVERY FUNCTION
// ============================================

/**
 * Discover authoritative sources for a product
 */
export async function discoverSources(
  productName: string,
  vision: VisionResult,
  config: PipelineConfig = { ...DEFAULT_PIPELINE_CONFIG }
): Promise<SourceSearchResult[]> {
  const sources: SourceSearchResult[] = [];

  // Build search queries
  const queries = buildSearchQueries(productName, vision);

  // ============================================
  // 1. Search using Gemini with Google Search grounding
  // ============================================
  for (const query of queries) {
    try {
      const searchResults = await performGroundedSearch(query);
      sources.push(...searchResults);

      // Stop if we have enough sources
      if (sources.length >= config.maxSourcesPerProduct) {
        break;
      }
    } catch (err) {
      console.error(`[SourceDiscovery] Search failed for query "${query}":`, err);
      // Continue with other queries
    }
  }

  // ============================================
  // 2. Deduplicate and rank sources
  // ============================================
  const deduped = deduplicateSources(sources);
  const ranked = rankSources(deduped);

  // Return top N sources
  return ranked.slice(0, config.maxSourcesPerProduct);
}

// ============================================
// SEARCH QUERY BUILDING
// ============================================

/**
 * Build search queries from product info
 */
function buildSearchQueries(
  productName: string,
  vision: VisionResult
): string[] {
  const queries: string[] = [];

  // Primary query: exact product name
  queries.push(`"${productName}" specifications`);

  // Add SKU if detected
  if (vision.detectedText && vision.detectedText.length > 0) {
    for (const text of vision.detectedText) {
      // Only use text that looks like a SKU (alphanumeric, reasonable length)
      if (/^[A-Z0-9\-_]{4,20}$/i.test(text)) {
        queries.push(`"${text}" product specifications`);
      }
    }
  }

  // Category-specific query
  if (vision.category && vision.subcategory) {
    queries.push(`${vision.category} ${vision.subcategory} "${productName}"`);
  }

  // Material-specific query
  if (vision.materials && vision.materials.length > 0) {
    const materialStr = vision.materials.slice(0, 2).join(" ");
    queries.push(`${materialStr} ${productName} specifications`);
  }

  // NDS-specific query (prioritize manufacturer)
  queries.push(`site:ndspro.com "${productName}"`);
  queries.push(`site:nds.com "${productName}"`);

  return queries;
}

// ============================================
// GROUNDED SEARCH
// ============================================

/**
 * Perform a search using Gemini with Google Search grounding
 */
async function performGroundedSearch(query: string): Promise<SourceSearchResult[]> {
  const prompt = `Find authoritative product information for this search query.

## Search Query
${query}

## Task
Search for this product and return information about the search results found.

For each relevant result, extract:
1. The page URL
2. The page title
3. A summary of the product information found
4. Any product name mentioned
5. Any SKU or part number mentioned
6. URLs of product images found

Return as JSON array:
[
  {
    "url": "https://...",
    "pageTitle": "Page title",
    "summary": "Brief summary of product info found",
    "productName": "Official product name if found",
    "sku": "SKU or part number if found, or null",
    "imageUrls": ["https://...image1.jpg", "https://...image2.jpg"]
  }
]

Focus on:
- Official manufacturer pages
- Major distributor product pages
- Technical specification pages
- Avoid forums, reviews, and blog posts

Return only the JSON array, no additional text.`;

  try {
    const response = await generateContentWithRetry({
      model: SEARCH_MODEL,
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.1,
        maxOutputTokens: 2000,
        // Enable Google Search grounding
        tools: [{ googleSearch: {} }],
      },
    }, { operation: 'enrichment_source_discovery' });

    const text = response.text || "";

    // Extract grounding metadata for additional source info
    const groundingMeta = (response as unknown as {
      candidates?: Array<{
        groundingMetadata?: {
          webSearchQueries?: string[];
          groundingChunks?: Array<{
            web?: {
              uri?: string;
              title?: string;
            };
          }>;
        };
      }>;
    })?.candidates?.[0]?.groundingMetadata;

    const sources: SourceSearchResult[] = [];

    // Parse AI-extracted results
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as Array<{
          url: string;
          pageTitle: string;
          summary: string;
          productName: string;
          sku: string | null;
          imageUrls: string[];
        }>;

        for (const result of parsed) {
          if (!result.url) continue;

          const sourceInfo = analyzeSourceUrl(result.url);

          sources.push({
            url: result.url,
            sourceType: sourceInfo.type,
            sourceName: sourceInfo.name,
            trustLevel: sourceInfo.trustLevel,
            pageTitle: result.pageTitle || "",
            pageContent: result.summary || "",
            extractedProductName: result.productName || "",
            extractedSKU: result.sku || null,
            extractedImages: Array.isArray(result.imageUrls) ? result.imageUrls : [],
          });
        }
      } catch (parseErr) {
        console.warn("[SourceDiscovery] Failed to parse search results:", parseErr);
      }
    }

    // Also add sources from grounding chunks
    if (groundingMeta?.groundingChunks) {
      for (const chunk of groundingMeta.groundingChunks) {
        if (chunk.web?.uri) {
          // Check if we already have this URL
          const exists = sources.some(s => s.url === chunk.web?.uri);
          if (!exists) {
            const sourceInfo = analyzeSourceUrl(chunk.web.uri);

            sources.push({
              url: chunk.web.uri,
              sourceType: sourceInfo.type,
              sourceName: sourceInfo.name,
              trustLevel: sourceInfo.trustLevel,
              pageTitle: chunk.web.title || "",
              pageContent: "", // Will be fetched later
              extractedProductName: "",
              extractedSKU: null,
              extractedImages: [],
            });
          }
        }
      }
    }

    return sources;
  } catch (err) {
    console.error("[SourceDiscovery] Grounded search failed:", err);
    return [];
  }
}

// ============================================
// SOURCE ANALYSIS
// ============================================

interface SourceInfo {
  type: SourceType;
  name: string;
  trustLevel: number;
}

/**
 * Analyze a source URL to determine type and trust level
 */
function analyzeSourceUrl(url: string): SourceInfo {
  try {
    const parsedUrl = new URL(url);
    const domain = parsedUrl.hostname.replace(/^www\./, "").toLowerCase();

    // Check for known trusted domains
    for (const trustedDomain of TRUSTED_DOMAINS) {
      if (domain.includes(trustedDomain) || trustedDomain.includes(domain)) {
        const trustLevel = SOURCE_TRUST_LEVELS[trustedDomain] || 7;

        // Determine type based on trust level
        let type: SourceType;
        if (trustLevel >= 9) {
          type = "primary";
        } else if (trustLevel >= 7) {
          type = "secondary";
        } else {
          type = "tertiary";
        }

        // Format source name
        const name = formatSourceName(trustedDomain);

        return { type, name, trustLevel };
      }
    }

    // Check if it looks like a manufacturer site
    if (
      domain.includes("manufacturer") ||
      domain.endsWith(".com") && !domain.includes("amazon") && !domain.includes("ebay")
    ) {
      return {
        type: "secondary",
        name: formatSourceName(domain),
        trustLevel: 6,
      };
    }

    // Default: general web result
    return {
      type: "tertiary",
      name: formatSourceName(domain),
      trustLevel: SOURCE_TRUST_LEVELS["default"],
    };
  } catch {
    return {
      type: "tertiary",
      name: "Unknown Source",
      trustLevel: SOURCE_TRUST_LEVELS["default"],
    };
  }
}

/**
 * Format a domain name into a readable source name
 */
function formatSourceName(domain: string): string {
  // Remove common prefixes and TLDs
  const cleaned = domain
    .replace(/^www\./, "")
    .replace(/\.(com|org|net|io|co)$/, "");

  // Capitalize words
  return cleaned
    .split(/[\.\-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// ============================================
// DEDUPLICATION AND RANKING
// ============================================

/**
 * Deduplicate sources by URL
 */
function deduplicateSources(sources: SourceSearchResult[]): SourceSearchResult[] {
  const seen = new Set<string>();
  const deduped: SourceSearchResult[] = [];

  for (const source of sources) {
    // Normalize URL for comparison
    const normalizedUrl = normalizeUrl(source.url);

    if (!seen.has(normalizedUrl)) {
      seen.add(normalizedUrl);
      deduped.push(source);
    }
  }

  return deduped;
}

/**
 * Normalize URL for deduplication
 */
function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove tracking parameters
    parsed.searchParams.delete("utm_source");
    parsed.searchParams.delete("utm_medium");
    parsed.searchParams.delete("utm_campaign");
    parsed.searchParams.delete("ref");
    parsed.searchParams.delete("source");

    // Normalize path
    let path = parsed.pathname.toLowerCase();
    if (path.endsWith("/")) {
      path = path.slice(0, -1);
    }

    return `${parsed.hostname}${path}`;
  } catch {
    return url.toLowerCase();
  }
}

/**
 * Rank sources by trust level and relevance
 */
function rankSources(sources: SourceSearchResult[]): SourceSearchResult[] {
  return [...sources].sort((a, b) => {
    // Primary sort: trust level (higher is better)
    if (b.trustLevel !== a.trustLevel) {
      return b.trustLevel - a.trustLevel;
    }

    // Secondary sort: has product name
    const aHasName = a.extractedProductName ? 1 : 0;
    const bHasName = b.extractedProductName ? 1 : 0;
    if (bHasName !== aHasName) {
      return bHasName - aHasName;
    }

    // Tertiary sort: has SKU
    const aHasSku = a.extractedSKU ? 1 : 0;
    const bHasSku = b.extractedSKU ? 1 : 0;
    return bHasSku - aHasSku;
  });
}

// ============================================
// CONTENT FETCHING
// ============================================

/**
 * Fetch full page content for a source
 */
export async function fetchSourceContent(
  source: SourceSearchResult
): Promise<SourceSearchResult> {
  // Skip if we already have content
  if (source.pageContent && source.pageContent.length > 500) {
    return source;
  }

  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; ProductEnrichmentBot/1.0)",
        "Accept": "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      console.warn(`[SourceDiscovery] Failed to fetch ${source.url}: ${response.status}`);
      return source;
    }

    const html = await response.text();

    // Extract text content (simple approach - could use proper HTML parser)
    const textContent = extractTextFromHtml(html);

    // Extract images
    const imageUrls = extractImagesFromHtml(html, source.url);

    return {
      ...source,
      pageContent: textContent,
      extractedImages: Array.from(new Set([...source.extractedImages, ...imageUrls])),
    };
  } catch (err) {
    console.warn(`[SourceDiscovery] Content fetch failed for ${source.url}:`, err);
    return source;
  }
}

/**
 * Fetch content for multiple sources in parallel
 */
export async function fetchSourceContentsBatch(
  sources: SourceSearchResult[]
): Promise<SourceSearchResult[]> {
  const results = await Promise.all(
    sources.map(source =>
      fetchSourceContent(source).catch(() => source)
    )
  );

  return results;
}

// ============================================
// HTML PARSING HELPERS
// ============================================

/**
 * Extract text content from HTML (simple approach)
 */
function extractTextFromHtml(html: string): string {
  // Remove script and style elements
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, "");

  // Replace HTML tags with spaces
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  // Clean up whitespace
  text = text.replace(/\s+/g, " ").trim();

  // Limit length
  return text.substring(0, 20000);
}

/**
 * Extract image URLs from HTML
 */
function extractImagesFromHtml(html: string, baseUrl: string): string[] {
  const images: string[] = [];

  // Match img src attributes
  const imgPattern = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;

  while ((match = imgPattern.exec(html)) !== null) {
    let imgUrl = match[1];

    // Skip data URIs and tiny images
    if (imgUrl.startsWith("data:")) continue;
    if (imgUrl.includes("1x1") || imgUrl.includes("pixel")) continue;

    // Convert relative URLs to absolute
    try {
      imgUrl = new URL(imgUrl, baseUrl).href;
      images.push(imgUrl);
    } catch {
      // Invalid URL, skip
    }
  }

  // Limit to first 10 images
  return images.slice(0, 10);
}

// Export source discovery module
export const sourceDiscovery = {
  discoverSources,
  fetchSourceContent,
  fetchSourceContentsBatch,
  analyzeSourceUrl,
};
