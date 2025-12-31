/**
 * Template Ingestion Service
 *
 * Parses and imports high-performing ad templates from various sources:
 * - AdSpy, BigSpy (ad intelligence platforms)
 * - Envato, Canva, Figma (design marketplaces)
 * - Manual input
 *
 * Features:
 * - URL-based fetching and parsing
 * - File-based import (JSON, CSV)
 * - Preview image upload to Cloudinary
 * - Data normalization to performingAdTemplates schema
 * - Validation and error handling
 */

import { v2 as cloudinary } from "cloudinary";
import { storage } from "../storage";
import type {
  InsertPerformingAdTemplate,
  PerformingAdTemplate,
} from "@shared/schema";

// ============================================
// TYPES
// ============================================

export type SourcePlatform =
  | "adspy"
  | "bigspy"
  | "envato"
  | "canva"
  | "figma"
  | "manual";

export type TemplateCategory =
  | "ecommerce"
  | "saas"
  | "services"
  | "awareness";

export type EngagementTier =
  | "top-5"
  | "top-10"
  | "top-25"
  | "unranked";

export type EstimatedBudget =
  | "under-1k"
  | "1k-5k"
  | "5k-20k"
  | "20k+";

export type BackgroundType =
  | "solid"
  | "gradient"
  | "image"
  | "video";

export type TemplateFormat =
  | "figma"
  | "canva"
  | "html-css"
  | "react"
  | "image";

export type TemplateMood =
  | "luxury"
  | "cozy"
  | "bold"
  | "minimal"
  | "vibrant";

export type TemplateStyle =
  | "modern"
  | "classic"
  | "playful"
  | "professional";

export interface RawTemplateData {
  /** Template name/title */
  name?: string;
  /** Description of the template */
  description?: string;
  /** Category for classification */
  category?: string;
  /** Source URL where template was found */
  sourceUrl?: string;
  /** Advertiser/brand name (from ad spy tools) */
  advertiserName?: string;
  /** Preview image URL */
  previewImageUrl?: string;
  /** Engagement/performance metrics */
  engagementRate?: number;
  runningDays?: number;
  estimatedBudget?: string;
  engagementTier?: string;
  /** Platform-specific metrics */
  platformMetrics?: Array<{
    platform: string;
    estimatedCTR?: number;
    estimatedConversionRate?: number;
  }>;
  /** Layout specifications */
  layouts?: Array<{
    platform: string;
    aspectRatio: string;
    gridStructure?: { columns: number; rows: number };
  }>;
  /** Color palette */
  colorPalette?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    text?: string;
    contrast?: number;
  };
  /** Typography settings */
  typography?: {
    fontStack?: string[];
    headlineSize?: number;
    bodySize?: number;
    ctaSize?: number;
  };
  /** Background type */
  backgroundType?: string;
  /** Content block definitions */
  contentBlocks?: {
    headline?: { placeholder?: string; maxLength?: number; position?: string };
    body?: { placeholder?: string; maxLength?: number; position?: string };
    cta?: { text?: string; position?: string; style?: string };
  };
  /** Visual patterns detected */
  visualPatterns?: string[];
  /** Mood/feeling */
  mood?: string;
  /** Design style */
  style?: string;
  /** Template format */
  templateFormat?: string;
  /** Source file URL (Figma, Canva link) */
  sourceFileUrl?: string;
  /** Editable variables */
  editableVariables?: string[];
  /** Target platforms */
  targetPlatforms?: string[];
  /** Target aspect ratios */
  targetAspectRatios?: string[];
  /** Best industries */
  bestForIndustries?: string[];
  /** Best objectives */
  bestForObjectives?: string[];
  /** Is template active */
  isActive?: boolean;
  /** Is template featured */
  isFeatured?: boolean;
  /** Any additional raw data from source */
  rawMetadata?: Record<string, unknown>;
}

export interface IngestionResult {
  success: boolean;
  templateId?: string;
  template?: PerformingAdTemplate;
  error?: string;
  warnings?: string[];
}

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
}

// ============================================
// CLOUDINARY CONFIGURATION
// ============================================

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

// Default placeholder for templates without preview images
const PLACEHOLDER_PREVIEW =
  "https://res.cloudinary.com/dq1h66xvf/image/upload/v1735334139/nds-logo_wnlmue.png";
const PLACEHOLDER_PUBLIC_ID = "nds-logo_wnlmue";

// ============================================
// SOURCE PARSERS
// ============================================

/**
 * Parse raw data from AdSpy export format
 */
function parseAdSpyData(rawData: Record<string, unknown>): RawTemplateData {
  return {
    name: String(rawData.ad_title || rawData.title || "Untitled Ad"),
    description: String(rawData.ad_text || rawData.body_text || ""),
    sourceUrl: String(rawData.ad_url || rawData.url || ""),
    advertiserName: String(rawData.advertiser || rawData.page_name || ""),
    previewImageUrl: String(rawData.image_url || rawData.thumbnail || ""),
    engagementRate: Number(rawData.likes || 0) + Number(rawData.shares || 0),
    runningDays: Number(rawData.days_running || rawData.duration || 0),
    targetPlatforms: rawData.platforms
      ? (rawData.platforms as string[])
      : [String(rawData.platform || "facebook")],
    rawMetadata: rawData,
  };
}

/**
 * Parse raw data from BigSpy export format
 */
function parseBigSpyData(rawData: Record<string, unknown>): RawTemplateData {
  return {
    name: String(rawData.ad_name || rawData.creative_title || "Untitled Ad"),
    description: String(rawData.ad_description || rawData.ad_copy || ""),
    sourceUrl: String(rawData.landing_page || rawData.ad_link || ""),
    advertiserName: String(rawData.advertiser_name || rawData.brand || ""),
    previewImageUrl: String(rawData.creative_url || rawData.image || ""),
    engagementRate: Number(rawData.engagement_score || 0),
    runningDays: Number(rawData.active_days || 0),
    estimatedBudget: String(rawData.estimated_spend || ""),
    targetPlatforms: rawData.channels
      ? (rawData.channels as string[])
      : [String(rawData.channel || "facebook")],
    rawMetadata: rawData,
  };
}

/**
 * Parse raw data from Envato/ThemeForest format
 */
function parseEnvatoData(rawData: Record<string, unknown>): RawTemplateData {
  return {
    name: String(rawData.name || rawData.title || "Untitled Template"),
    description: String(rawData.description || rawData.summary || ""),
    sourceUrl: String(rawData.url || rawData.item_url || ""),
    advertiserName: String(rawData.author || rawData.seller || ""),
    previewImageUrl: String(rawData.preview_url || rawData.thumbnail || ""),
    templateFormat: String(rawData.file_type || rawData.format || "image"),
    sourceFileUrl: String(rawData.download_url || ""),
    category:
      rawData.category === "marketing"
        ? "ecommerce"
        : String(rawData.category || "ecommerce"),
    targetPlatforms: rawData.compatible_with
      ? (rawData.compatible_with as string[])
      : ["instagram", "facebook"],
    rawMetadata: rawData,
  };
}

/**
 * Parse raw data from Canva export format
 */
function parseCanvaData(rawData: Record<string, unknown>): RawTemplateData {
  // Canva exports typically include design specifications
  const dimensions = rawData.dimensions as { width?: number; height?: number } | undefined;
  const aspectRatio = dimensions
    ? calculateAspectRatio(dimensions.width || 1080, dimensions.height || 1080)
    : "1:1";

  return {
    name: String(rawData.title || rawData.name || "Untitled Design"),
    description: String(rawData.description || ""),
    sourceUrl: String(rawData.share_url || rawData.url || ""),
    previewImageUrl: String(rawData.thumbnail_url || rawData.preview || ""),
    templateFormat: "canva",
    sourceFileUrl: String(rawData.edit_url || ""),
    targetAspectRatios: [aspectRatio],
    colorPalette: rawData.colors
      ? {
          primary: String((rawData.colors as string[])[0] || "#000000"),
          secondary: String((rawData.colors as string[])[1] || "#FFFFFF"),
          accent: String((rawData.colors as string[])[2] || "#FF6B35"),
        }
      : undefined,
    typography: rawData.fonts
      ? { fontStack: rawData.fonts as string[] }
      : undefined,
    rawMetadata: rawData,
  };
}

/**
 * Parse raw data from Figma export format
 */
function parseFigmaData(rawData: Record<string, unknown>): RawTemplateData {
  const node = rawData.document || rawData;
  const dimensions = node as { absoluteBoundingBox?: { width?: number; height?: number } };
  const aspectRatio = dimensions.absoluteBoundingBox
    ? calculateAspectRatio(
        dimensions.absoluteBoundingBox.width || 1080,
        dimensions.absoluteBoundingBox.height || 1080
      )
    : "1:1";

  return {
    name: String(rawData.name || "Untitled Frame"),
    description: String(rawData.description || ""),
    sourceUrl: String(rawData.figma_url || rawData.url || ""),
    previewImageUrl: String(rawData.thumbnail_url || ""),
    templateFormat: "figma",
    sourceFileUrl: String(rawData.file_url || rawData.figma_url || ""),
    targetAspectRatios: [aspectRatio],
    style: inferStyleFromFigma(rawData),
    rawMetadata: rawData,
  };
}

/**
 * Parse manual input data (already in expected format)
 */
function parseManualData(rawData: Record<string, unknown>): RawTemplateData {
  return rawData as RawTemplateData;
}

/**
 * Route to appropriate parser based on source platform
 */
function parseRawData(
  rawData: Record<string, unknown>,
  source: SourcePlatform
): RawTemplateData {
  switch (source) {
    case "adspy":
      return parseAdSpyData(rawData);
    case "bigspy":
      return parseBigSpyData(rawData);
    case "envato":
      return parseEnvatoData(rawData);
    case "canva":
      return parseCanvaData(rawData);
    case "figma":
      return parseFigmaData(rawData);
    case "manual":
    default:
      return parseManualData(rawData);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate aspect ratio string from dimensions
 */
function calculateAspectRatio(width: number, height: number): string {
  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(width, height);
  const ratioW = width / divisor;
  const ratioH = height / divisor;

  // Map to common aspect ratios
  const ratio = width / height;
  if (Math.abs(ratio - 1) < 0.1) return "1:1";
  if (Math.abs(ratio - 16 / 9) < 0.1) return "16:9";
  if (Math.abs(ratio - 9 / 16) < 0.1) return "9:16";
  if (Math.abs(ratio - 4 / 5) < 0.1) return "4:5";
  if (Math.abs(ratio - 1.91) < 0.1) return "1.91:1";

  // Return calculated ratio
  return `${ratioW}:${ratioH}`;
}

/**
 * Infer style from Figma document structure
 */
function inferStyleFromFigma(rawData: Record<string, unknown>): TemplateStyle {
  const name = String(rawData.name || "").toLowerCase();
  if (name.includes("modern") || name.includes("minimal")) return "modern";
  if (name.includes("classic") || name.includes("elegant")) return "classic";
  if (name.includes("fun") || name.includes("playful")) return "playful";
  if (name.includes("corporate") || name.includes("professional"))
    return "professional";
  return "modern";
}

/**
 * Validate and normalize category
 */
function normalizeCategory(category?: string): TemplateCategory {
  const normalized = (category || "").toLowerCase();
  if (["ecommerce", "e-commerce", "product", "shop"].some((c) => normalized.includes(c)))
    return "ecommerce";
  if (["saas", "software", "app", "tech"].some((c) => normalized.includes(c)))
    return "saas";
  if (["service", "consulting", "agency"].some((c) => normalized.includes(c)))
    return "services";
  return "awareness";
}

/**
 * Validate and normalize engagement tier
 */
function normalizeEngagementTier(
  tier?: string,
  engagementRate?: number
): EngagementTier {
  if (tier) {
    const normalized = tier.toLowerCase().replace(/\s+/g, "-");
    if (["top-5", "top-10", "top-25", "unranked"].includes(normalized)) {
      return normalized as EngagementTier;
    }
  }

  // Infer from engagement rate if available
  if (engagementRate !== undefined) {
    if (engagementRate >= 85) return "top-5";
    if (engagementRate >= 70) return "top-10";
    if (engagementRate >= 50) return "top-25";
  }

  return "unranked";
}

/**
 * Validate and normalize estimated budget
 */
function normalizeEstimatedBudget(budget?: string): EstimatedBudget | undefined {
  if (!budget) return undefined;
  const normalized = budget.toLowerCase().replace(/\s+/g, "");
  if (normalized.includes("under") || Number(budget) < 1000) return "under-1k";
  if (normalized.includes("1k-5k") || (Number(budget) >= 1000 && Number(budget) < 5000))
    return "1k-5k";
  if (normalized.includes("5k-20k") || (Number(budget) >= 5000 && Number(budget) < 20000))
    return "5k-20k";
  if (normalized.includes("20k") || Number(budget) >= 20000) return "20k+";
  return undefined;
}

/**
 * Validate and normalize background type
 */
function normalizeBackgroundType(type?: string): BackgroundType | undefined {
  if (!type) return undefined;
  const normalized = type.toLowerCase();
  if (["solid", "flat", "single"].some((t) => normalized.includes(t))) return "solid";
  if (["gradient", "fade"].some((t) => normalized.includes(t))) return "gradient";
  if (["image", "photo", "background"].some((t) => normalized.includes(t))) return "image";
  if (["video", "motion", "animated"].some((t) => normalized.includes(t))) return "video";
  return "solid";
}

/**
 * Validate and normalize template format
 */
function normalizeTemplateFormat(format?: string): TemplateFormat | undefined {
  if (!format) return undefined;
  const normalized = format.toLowerCase();
  if (normalized.includes("figma")) return "figma";
  if (normalized.includes("canva")) return "canva";
  if (["html", "css", "web"].some((f) => normalized.includes(f))) return "html-css";
  if (["react", "jsx", "tsx"].some((f) => normalized.includes(f))) return "react";
  if (["image", "png", "jpg", "static"].some((f) => normalized.includes(f))) return "image";
  return "image";
}

/**
 * Validate and normalize mood
 */
function normalizeMood(mood?: string): TemplateMood | undefined {
  if (!mood) return undefined;
  const normalized = mood.toLowerCase();
  if (["luxury", "elegant", "premium"].some((m) => normalized.includes(m))) return "luxury";
  if (["cozy", "warm", "comfortable"].some((m) => normalized.includes(m))) return "cozy";
  if (["bold", "strong", "energetic"].some((m) => normalized.includes(m))) return "bold";
  if (["minimal", "clean", "simple"].some((m) => normalized.includes(m))) return "minimal";
  if (["vibrant", "colorful", "bright"].some((m) => normalized.includes(m))) return "vibrant";
  return undefined;
}

/**
 * Validate and normalize style
 */
function normalizeStyle(style?: string): TemplateStyle | undefined {
  if (!style) return undefined;
  const normalized = style.toLowerCase();
  if (["modern", "contemporary"].some((s) => normalized.includes(s))) return "modern";
  if (["classic", "traditional", "elegant"].some((s) => normalized.includes(s)))
    return "classic";
  if (["playful", "fun", "casual"].some((s) => normalized.includes(s))) return "playful";
  if (["professional", "corporate", "business"].some((s) => normalized.includes(s)))
    return "professional";
  return undefined;
}

/**
 * Validate platforms array
 */
function normalizePlatforms(platforms?: string[]): string[] {
  const validPlatforms = ["instagram", "facebook", "linkedin", "twitter", "tiktok"];
  if (!platforms || !Array.isArray(platforms)) return ["instagram", "facebook"];

  return platforms
    .map((p) => p.toLowerCase().trim())
    .filter((p) => validPlatforms.includes(p));
}

/**
 * Validate aspect ratios array
 */
function normalizeAspectRatios(ratios?: string[]): string[] {
  const validRatios = ["1:1", "9:16", "16:9", "4:5", "1.91:1"];
  if (!ratios || !Array.isArray(ratios)) return ["1:1"];

  return ratios.filter((r) => validRatios.includes(r));
}

/**
 * Sanitize string input
 */
function sanitizeString(input: unknown, maxLength = 1000): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

// ============================================
// MAIN SERVICE FUNCTIONS
// ============================================

/**
 * Upload a preview image to Cloudinary
 */
export async function uploadPreviewImage(
  imageUrl: string
): Promise<CloudinaryUploadResult> {
  if (!isCloudinaryConfigured) {
    console.warn("[TemplateIngestion] Cloudinary not configured - using placeholder");
    return {
      secureUrl: PLACEHOLDER_PREVIEW,
      publicId: PLACEHOLDER_PUBLIC_ID,
    };
  }

  try {
    // Validate URL
    new URL(imageUrl);

    const result = await new Promise<CloudinaryUploadResult>((resolve, reject) => {
      cloudinary.uploader.upload(
        imageUrl,
        {
          folder: "performing-templates/previews",
          resource_type: "image",
          transformation: [
            { width: 1200, height: 1200, crop: "limit" }, // Limit size
            { quality: "auto:good" }, // Optimize quality
            { fetch_format: "auto" }, // Auto format
          ],
        },
        (error, result) => {
          if (error) {
            console.error("[TemplateIngestion] Cloudinary upload error:", error);
            reject(error);
          } else if (result) {
            resolve({
              secureUrl: result.secure_url,
              publicId: result.public_id,
            });
          } else {
            reject(new Error("No result from Cloudinary"));
          }
        }
      );
    });

    console.log(`[TemplateIngestion] Uploaded preview: ${result.publicId}`);
    return result;
  } catch (error) {
    console.error("[TemplateIngestion] Failed to upload preview image:", error);
    // Return placeholder on failure
    return {
      secureUrl: PLACEHOLDER_PREVIEW,
      publicId: PLACEHOLDER_PUBLIC_ID,
    };
  }
}

/**
 * Normalize raw template data to match the performingAdTemplates schema
 */
export function normalizeTemplate(
  rawData: Record<string, unknown>,
  source: SourcePlatform
): {
  normalized: Partial<InsertPerformingAdTemplate>;
  warnings: string[];
} {
  const warnings: string[] = [];
  const parsed = parseRawData(rawData, source);

  // Validate required fields
  if (!parsed.name || parsed.name.trim().length < 3) {
    warnings.push("Template name is missing or too short - using default");
  }

  // Build normalized template
  const normalized: Partial<InsertPerformingAdTemplate> = {
    name: sanitizeString(parsed.name, 200) || "Untitled Template",
    description: sanitizeString(parsed.description, 2000) || undefined,
    category: normalizeCategory(parsed.category),
    sourcePlatform: source,
    sourceUrl: sanitizeString(parsed.sourceUrl, 500) || undefined,
    advertiserName: sanitizeString(parsed.advertiserName, 200) || undefined,
    engagementTier: normalizeEngagementTier(
      parsed.engagementTier,
      parsed.engagementRate
    ),
    estimatedEngagementRate:
      parsed.engagementRate !== undefined
        ? Math.min(100, Math.max(0, parsed.engagementRate))
        : undefined,
    runningDays: parsed.runningDays || undefined,
    estimatedBudget: normalizeEstimatedBudget(parsed.estimatedBudget),
    platformMetrics: parsed.platformMetrics || undefined,
    layouts: parsed.layouts || undefined,
    colorPalette: parsed.colorPalette || undefined,
    typography: parsed.typography || undefined,
    backgroundType: normalizeBackgroundType(parsed.backgroundType),
    contentBlocks: parsed.contentBlocks || undefined,
    visualPatterns: parsed.visualPatterns || undefined,
    mood: normalizeMood(parsed.mood),
    style: normalizeStyle(parsed.style),
    templateFormat: normalizeTemplateFormat(parsed.templateFormat),
    sourceFileUrl: sanitizeString(parsed.sourceFileUrl, 500) || undefined,
    editableVariables: parsed.editableVariables || undefined,
    targetPlatforms: normalizePlatforms(parsed.targetPlatforms),
    targetAspectRatios: normalizeAspectRatios(parsed.targetAspectRatios),
    bestForIndustries: parsed.bestForIndustries || undefined,
    bestForObjectives: parsed.bestForObjectives || undefined,
    isActive: parsed.isActive !== false,
    isFeatured: parsed.isFeatured === true,
  };

  // Add warnings for missing optional but recommended fields
  if (!normalized.description) {
    warnings.push("No description provided");
  }
  if (!normalized.previewImageUrl) {
    warnings.push("No preview image URL - will use placeholder");
  }

  return { normalized, warnings };
}

/**
 * Save a normalized template to the database
 */
export async function saveTemplate(
  template: InsertPerformingAdTemplate
): Promise<PerformingAdTemplate> {
  return await storage.createPerformingAdTemplate(template);
}

/**
 * Ingest a template from a URL (fetches and parses the data)
 * Note: This is a simplified implementation - actual URL scraping
 * would require platform-specific API integrations or web scraping
 */
export async function ingestFromUrl(
  url: string,
  source: SourcePlatform,
  userId: string
): Promise<IngestionResult> {
  const warnings: string[] = [];

  try {
    // Validate URL
    const parsedUrl = new URL(url);
    warnings.push(`Fetching from: ${parsedUrl.hostname}`);

    // For now, we create a minimal template from the URL
    // In production, this would integrate with platform APIs
    const rawData: RawTemplateData = {
      name: `Template from ${parsedUrl.hostname}`,
      sourceUrl: url,
      description: `Imported from ${source}`,
    };

    // Normalize the data
    const { normalized, warnings: normalizeWarnings } = normalizeTemplate(
      rawData as Record<string, unknown>,
      source
    );
    warnings.push(...normalizeWarnings);

    // Upload preview image if available
    let previewResult: CloudinaryUploadResult = {
      secureUrl: PLACEHOLDER_PREVIEW,
      publicId: PLACEHOLDER_PUBLIC_ID,
    };

    if (normalized.previewImageUrl) {
      previewResult = await uploadPreviewImage(normalized.previewImageUrl);
    }

    // Build complete template
    const templateData: InsertPerformingAdTemplate = {
      ...normalized,
      userId,
      name: normalized.name || "Untitled Template",
      category: normalized.category || "awareness",
      previewImageUrl: previewResult.secureUrl,
      previewPublicId: previewResult.publicId,
      isActive: true,
      isFeatured: false,
    };

    // Save to database
    const savedTemplate = await saveTemplate(templateData);

    return {
      success: true,
      templateId: savedTemplate.id,
      template: savedTemplate,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error("[TemplateIngestion] URL ingestion error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to ingest from URL",
      warnings,
    };
  }
}

/**
 * Ingest a template from a local file (JSON or CSV)
 */
export async function ingestFromFile(
  fileContent: string,
  source: SourcePlatform,
  userId: string,
  fileType: "json" | "csv" = "json"
): Promise<IngestionResult[]> {
  const results: IngestionResult[] = [];

  try {
    let rawDataArray: Record<string, unknown>[];

    if (fileType === "json") {
      const parsed = JSON.parse(fileContent);
      rawDataArray = Array.isArray(parsed) ? parsed : [parsed];
    } else {
      // Simple CSV parsing
      rawDataArray = parseCSV(fileContent);
    }

    for (const rawData of rawDataArray) {
      const result = await ingestSingleTemplate(rawData, source, userId);
      results.push(result);
    }

    return results;
  } catch (error) {
    console.error("[TemplateIngestion] File ingestion error:", error);
    return [
      {
        success: false,
        error: error instanceof Error ? error.message : "Failed to parse file",
      },
    ];
  }
}

/**
 * Ingest a single template from raw data
 */
export async function ingestSingleTemplate(
  rawData: Record<string, unknown>,
  source: SourcePlatform,
  userId: string
): Promise<IngestionResult> {
  const warnings: string[] = [];

  try {
    // Normalize the data
    const { normalized, warnings: normalizeWarnings } = normalizeTemplate(
      rawData,
      source
    );
    warnings.push(...normalizeWarnings);

    // Upload preview image if available
    let previewResult: CloudinaryUploadResult = {
      secureUrl: PLACEHOLDER_PREVIEW,
      publicId: PLACEHOLDER_PUBLIC_ID,
    };

    const previewUrl =
      (rawData.previewImageUrl as string) ||
      (rawData.preview_image_url as string) ||
      (rawData.image_url as string) ||
      (rawData.thumbnail as string);

    if (previewUrl) {
      previewResult = await uploadPreviewImage(previewUrl);
    }

    // Build complete template
    const templateData: InsertPerformingAdTemplate = {
      ...normalized,
      userId,
      name: normalized.name || "Untitled Template",
      category: normalized.category || "awareness",
      previewImageUrl: previewResult.secureUrl,
      previewPublicId: previewResult.publicId,
      isActive: normalized.isActive !== false,
      isFeatured: normalized.isFeatured === true,
    };

    // Save to database
    const savedTemplate = await saveTemplate(templateData);

    return {
      success: true,
      templateId: savedTemplate.id,
      template: savedTemplate,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (error) {
    console.error("[TemplateIngestion] Single template ingestion error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to ingest template",
      warnings,
    };
  }
}

/**
 * Simple CSV parser for template imports
 */
function parseCSV(csvContent: string): Record<string, unknown>[] {
  const lines = csvContent.trim().split("\n");
  if (lines.length < 2) return [];

  // Parse header row
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().replace(/^"|"$/g, ""));

  // Parse data rows
  const results: Record<string, unknown>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, unknown> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = values[j];
      }
      results.push(row);
    }
  }

  return results;
}

/**
 * Parse a single CSV line handling quoted values
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

/**
 * Bulk import templates from an array of raw data
 */
export async function bulkIngest(
  templates: Record<string, unknown>[],
  source: SourcePlatform,
  userId: string
): Promise<{
  successful: IngestionResult[];
  failed: IngestionResult[];
  summary: {
    total: number;
    success: number;
    failed: number;
  };
}> {
  const successful: IngestionResult[] = [];
  const failed: IngestionResult[] = [];

  for (const template of templates) {
    const result = await ingestSingleTemplate(template, source, userId);
    if (result.success) {
      successful.push(result);
    } else {
      failed.push(result);
    }
  }

  return {
    successful,
    failed,
    summary: {
      total: templates.length,
      success: successful.length,
      failed: failed.length,
    },
  };
}

// ============================================
// EXPORTS
// ============================================

export const templateIngestionService = {
  ingestFromUrl,
  ingestFromFile,
  ingestSingleTemplate,
  normalizeTemplate,
  uploadPreviewImage,
  saveTemplate,
  bulkIngest,
};
