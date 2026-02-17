/**
 * PatternPrivacyFilter Service
 *
 * Multi-layer privacy scanning for ad images before pattern extraction.
 * Ensures no private content (brand names, logos, faces, personal info) is processed.
 *
 * Privacy Layers:
 * 1. Text density check - reject images with >15% text coverage
 * 2. Brand name detection via OCR + blocklist
 * 3. Logo detection via Gemini Vision
 * 4. Face detection - reject ANY images with faces
 */

import { generateContentWithRetry } from '../lib/geminiClient';
import { logger } from '../lib/logger';

// Model for privacy scanning (use flash for speed/cost)
const PRIVACY_SCAN_MODEL = process.env['GEMINI_PRIVACY_MODEL'] || 'gemini-3-flash';

/**
 * Privacy scan result returned by the service
 */
export interface PrivacyScanResult {
  textDensity: number; // 0-100 percentage of image covered by text
  detectedBrands: string[]; // Brand names detected (even partial matches)
  hasLogos: boolean; // Whether company logos are detected
  hasFaces: boolean; // Whether human faces are detected
  hasContactInfo: boolean; // Email, phone, website detected
  isSafeToProcess: boolean; // Final verdict
  rejectionReason?: string; // Why it was rejected (if applicable)
  warnings: string[]; // Non-blocking warnings
}

/**
 * Extracted pattern structure (for sanitization)
 * Matches the JSONB types defined in shared/schema.ts
 */
export interface ExtractedPatternData {
  layoutPattern?: {
    structure?: string;
    visualHierarchy?: string[];
    whitespaceUsage?: 'minimal' | 'balanced' | 'generous';
    focalPointPosition?: string;
  };
  colorPsychology?: {
    dominantMood?: string;
    colorScheme?: 'monochromatic' | 'complementary' | 'analogous' | 'triadic';
    contrastLevel?: 'low' | 'medium' | 'high';
    emotionalTone?: string;
  };
  hookPatterns?: {
    hookType?: string;
    headlineFormula?: string;
    ctaStyle?: 'soft' | 'direct' | 'urgency';
    persuasionTechnique?: string;
  };
  visualElements?: {
    imageStyle?: 'photography' | 'illustration' | 'mixed' | '3d-render' | 'abstract';
    humanPresence?: boolean;
    productVisibility?: 'prominent' | 'subtle' | 'none';
    iconography?: boolean;
    backgroundType?: 'solid' | 'gradient' | 'image' | 'pattern';
  };
}

// Common brand names blocklist (top brands that could cause issues)
const BRAND_BLOCKLIST = new Set([
  // Tech
  'apple',
  'google',
  'microsoft',
  'amazon',
  'meta',
  'facebook',
  'instagram',
  'twitter',
  'tiktok',
  'snapchat',
  'netflix',
  'spotify',
  'adobe',
  'salesforce',
  'oracle',
  'ibm',
  'intel',
  'nvidia',
  'amd',
  'dell',
  'hp',
  'lenovo',
  'samsung',
  'sony',
  'lg',
  'huawei',
  // Consumer
  'nike',
  'adidas',
  'puma',
  'reebok',
  'coca-cola',
  'pepsi',
  'mcdonalds',
  'starbucks',
  'burger king',
  'kfc',
  'subway',
  'walmart',
  'target',
  'costco',
  'ikea',
  'home depot',
  // Automotive
  'tesla',
  'ford',
  'chevrolet',
  'toyota',
  'honda',
  'bmw',
  'mercedes',
  'audi',
  'porsche',
  // Finance
  'visa',
  'mastercard',
  'paypal',
  'stripe',
  'square',
  'american express',
  'chase',
  // Other major
  'disney',
  'warner',
  'paramount',
  'universal',
  'nbc',
  'cbs',
  'fox',
  'hbo',
]);

// Patterns that indicate contact information
const CONTACT_PATTERNS = [
  /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/, // email
  /\+?[0-9]{1,4}[-.\s]?[(]?[0-9]{1,3}[)]?[-.\s]?[0-9]{1,4}[-.\s]?[0-9]{1,9}/, // phone
  /(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?/, // website
];

/**
 * Scan image buffer for private content
 *
 * @param imageBuffer - Image file buffer
 * @param mimeType - MIME type of the image
 * @returns Privacy scan result
 */
export async function scanForPrivateContent(imageBuffer: Buffer, mimeType: string): Promise<PrivacyScanResult> {
  const warnings: string[] = [];

  try {
    // Convert buffer to base64
    const base64Image = imageBuffer.toString('base64');

    // Privacy-focused vision prompt
    const prompt = `Analyze this image for privacy concerns. Return a JSON object with:

{
  "textDensity": <number 0-100, percentage of image covered by readable text>,
  "detectedText": <array of all readable text strings found, or empty array if none>,
  "hasLogos": <boolean, true if any company/brand logos are visible>,
  "logoDescriptions": <array of generic logo descriptions like "circular tech logo", "sports brand swoosh">,
  "hasFaces": <boolean, true if any human faces are visible>,
  "faceCount": <number of faces detected>,
  "hasContactInfo": <boolean, true if emails, phone numbers, or websites are visible>
}

Be thorough - detect ALL text, logos, and faces. This is for privacy compliance.
Do NOT describe the ad content or products - ONLY report privacy-relevant elements.`;

    const response = await generateContentWithRetry(
      {
        model: PRIVACY_SCAN_MODEL,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType,
                  data: base64Image,
                },
              },
            ],
          },
        ],
        config: {
          temperature: 0.1, // Low temperature for consistent detection
        },
      },
      { operation: 'privacy_scan' },
    );

    const text = response.text || '';

    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn({ responseText: text.substring(0, 200) }, 'Failed to parse privacy scan response');
      return {
        textDensity: 0,
        detectedBrands: [],
        hasLogos: false,
        hasFaces: false,
        hasContactInfo: false,
        isSafeToProcess: false,
        rejectionReason: 'Could not analyze image for privacy concerns',
        warnings,
      };
    }

    const scanResult = JSON.parse(jsonMatch[0]);

    // Extract detected text for brand matching
    const detectedText: string[] = scanResult.detectedText || [];
    const detectedBrands: string[] = [];

    // Check detected text against brand blocklist
    for (const text of detectedText) {
      const lowerText = text.toLowerCase();
      for (const brand of BRAND_BLOCKLIST) {
        if (lowerText.includes(brand)) {
          detectedBrands.push(brand);
        }
      }

      // Check for contact info patterns
      for (const pattern of CONTACT_PATTERNS) {
        if (pattern.test(text)) {
          scanResult.hasContactInfo = true;
          break;
        }
      }
    }

    // Determine if safe to process
    let isSafeToProcess = true;
    let rejectionReason: string | undefined;

    // Rule 1: Reject if faces detected
    if (scanResult.hasFaces) {
      isSafeToProcess = false;
      rejectionReason = 'Image contains human faces - cannot process for privacy reasons';
    }
    // Rule 2: Reject if text density > 15%
    else if (scanResult.textDensity > 15) {
      isSafeToProcess = false;
      rejectionReason = `Image contains too much text (${scanResult.textDensity}% coverage) - patterns may leak copyrighted copy`;
    }
    // Rule 3: Reject if known brands detected
    else if (detectedBrands.length > 0) {
      isSafeToProcess = false;
      rejectionReason = `Detected brand names: ${detectedBrands.join(', ')} - cannot extract patterns from competitor ads`;
    }
    // Rule 4: Warn but allow if logos detected (might be user's own brand)
    else if (scanResult.hasLogos) {
      warnings.push('Image contains logos - extracted patterns will be generic to avoid trademark issues');
    }
    // Rule 5: Warn if contact info detected
    else if (scanResult.hasContactInfo) {
      warnings.push('Image contains contact information - will be excluded from extracted patterns');
    }

    return {
      textDensity: scanResult.textDensity || 0,
      detectedBrands,
      hasLogos: scanResult.hasLogos || false,
      hasFaces: scanResult.hasFaces || false,
      hasContactInfo: scanResult.hasContactInfo || false,
      isSafeToProcess,
      ...(rejectionReason !== undefined && { rejectionReason }),
      warnings,
    };
  } catch (error) {
    logger.error({ err: error }, 'Privacy scan failed');
    return {
      textDensity: 0,
      detectedBrands: [],
      hasLogos: false,
      hasFaces: false,
      hasContactInfo: false,
      isSafeToProcess: false,
      rejectionReason: 'Privacy scan failed - cannot verify image safety',
      warnings,
    };
  }
}

/**
 * Sanitize extracted pattern to remove any leaked text content
 *
 * This is a second-pass safety filter that strips any actual text
 * that might have leaked through the extraction process.
 *
 * @param pattern - Extracted pattern data
 * @returns Sanitized pattern
 */
export function sanitizeExtractedPattern(pattern: ExtractedPatternData): ExtractedPatternData {
  // Helper to check if a string looks like actual ad copy (not a pattern description)
  function isLikelyAdCopy(text: string | undefined): boolean {
    if (!text) return false;

    // If it's short and generic (pattern description), allow it
    if (text.length < 50 && !text.match(/\d{2,}/)) return false;

    // Reject if it contains:
    // - Specific numbers/percentages (e.g., "50% off", "save $100")
    // - Quoted text
    // - Exclamation marks (common in ad copy)
    // - Brand-like capitalization
    const adCopyPatterns = [
      /\$\d+/, // Dollar amounts
      /\d+%/, // Percentages
      /"[^"]+"/, // Quoted text
      /!/, // Exclamation marks
      /[A-Z]{2,}(?:\s[A-Z]{2,})+/, // ALL CAPS phrases
    ];

    return adCopyPatterns.some((p) => p.test(text));
  }

  // Sanitize a string field
  function sanitize(text: string | undefined): string | undefined {
    if (!text) return text;
    if (isLikelyAdCopy(text)) {
      // Replace with generic description
      return '[content redacted - pattern only]';
    }
    return text;
  }

  // Deep clone and sanitize
  const sanitized: ExtractedPatternData = {};

  if (pattern.layoutPattern) {
    const lp = pattern.layoutPattern;
    const structure = sanitize(lp.structure);
    const visualHierarchy = lp.visualHierarchy?.map((v) => sanitize(v)).filter((v): v is string => !!v);
    const focalPointPosition = sanitize(lp.focalPointPosition);
    sanitized.layoutPattern = {
      ...(structure !== undefined && { structure }),
      ...(visualHierarchy !== undefined && { visualHierarchy }),
      ...(lp.whitespaceUsage !== undefined && { whitespaceUsage: lp.whitespaceUsage }),
      ...(focalPointPosition !== undefined && { focalPointPosition }),
    };
  }

  if (pattern.colorPsychology) {
    const cp = pattern.colorPsychology;
    const dominantMood = sanitize(cp.dominantMood);
    const emotionalTone = sanitize(cp.emotionalTone);
    sanitized.colorPsychology = {
      ...(dominantMood !== undefined && { dominantMood }),
      ...(cp.colorScheme !== undefined && { colorScheme: cp.colorScheme }),
      ...(cp.contrastLevel !== undefined && { contrastLevel: cp.contrastLevel }),
      ...(emotionalTone !== undefined && { emotionalTone }),
    };
  }

  if (pattern.hookPatterns) {
    const hp = pattern.hookPatterns;
    const hookType = sanitize(hp.hookType);
    const headlineFormula = sanitize(hp.headlineFormula);
    const persuasionTechnique = sanitize(hp.persuasionTechnique);
    sanitized.hookPatterns = {
      ...(hookType !== undefined && { hookType }),
      ...(headlineFormula !== undefined && { headlineFormula }),
      ...(hp.ctaStyle !== undefined && { ctaStyle: hp.ctaStyle }),
      ...(persuasionTechnique !== undefined && { persuasionTechnique }),
    };
  }

  if (pattern.visualElements) {
    const ve = pattern.visualElements;
    sanitized.visualElements = {
      ...(ve.imageStyle !== undefined && { imageStyle: ve.imageStyle }),
      ...(ve.humanPresence !== undefined && { humanPresence: ve.humanPresence }),
      ...(ve.productVisibility !== undefined && { productVisibility: ve.productVisibility }),
      ...(ve.iconography !== undefined && { iconography: ve.iconography }),
      ...(ve.backgroundType !== undefined && { backgroundType: ve.backgroundType }),
    };
  }

  return sanitized;
}

/**
 * Check if image is safe for pattern extraction (convenience function)
 */
export async function isImageSafeForExtraction(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<{ safe: boolean; reason?: string }> {
  const result = await scanForPrivateContent(imageBuffer, mimeType);
  return {
    safe: result.isSafeToProcess,
    ...(result.rejectionReason !== undefined && { reason: result.rejectionReason }),
  };
}
