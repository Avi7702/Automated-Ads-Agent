/**
 * Gate 3: Database Write Verification
 *
 * Purpose: Verify data was saved correctly and completely to the database.
 *
 * Verification process:
 * 1. Write data to database
 * 2. Read it back
 * 3. Compare field by field
 * 4. Detect issues (truncation, encoding, corruption)
 * 5. Retry if needed
 */

import { storage } from "../../storage";
import {
  DEFAULT_PIPELINE_CONFIG,
  type Gate3Result,
  type WritePayload,
  type WriteDiscrepancy,
  type WriteIssue,
  type PipelineConfig,
} from "./types";
import type { Product } from "@shared/schema";

// ============================================
// MAIN VERIFICATION FUNCTION
// ============================================

/**
 * Write data to database and verify it was saved correctly
 */
export async function verifyDatabaseWrite(
  payload: WritePayload,
  config: PipelineConfig = { ...DEFAULT_PIPELINE_CONFIG }
): Promise<Gate3Result> {
  let retryCount = 0;
  let lastError: Error | null = null;

  while (retryCount <= config.maxDbWriteRetries) {
    try {
      // ============================================
      // 1. Write to database
      // ============================================
      await storage.updateProduct(payload.productId, {
        description: payload.description,
        specifications: payload.specifications,
        features: payload.features,
        benefits: payload.benefits,
        tags: payload.tags,
        enrichmentStatus: "verified",
        enrichmentVerifiedAt: new Date(),
        enrichmentSource: "ai_pipeline",
      });

      // Small delay to ensure write is committed
      await delay(100);

      // ============================================
      // 2. Read back from database
      // ============================================
      const actual = await storage.getProductById(payload.productId);

      if (!actual) {
        throw new Error(`Product ${payload.productId} not found after write`);
      }

      // ============================================
      // 3. Compare field by field
      // ============================================
      const discrepancies = comparePayloadToProduct(payload, actual);

      // ============================================
      // 4. Determine if write was successful
      // ============================================
      const passed = discrepancies.length === 0;

      if (passed) {
        return {
          passed: true,
          productId: payload.productId,
          discrepancies: [],
          retryCount,
        };
      }

      // If we have discrepancies but haven't exhausted retries, try again
      if (retryCount < config.maxDbWriteRetries) {
        console.warn(
          `[Gate3] Write verification failed with ${discrepancies.length} discrepancies, retrying...`
        );
        retryCount++;
        await delay(config.retryDelayMs);
        continue;
      }

      // Exhausted retries, return failure
      return {
        passed: false,
        productId: payload.productId,
        discrepancies,
        retryCount,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.error(`[Gate3] Database operation failed:`, lastError);

      if (retryCount < config.maxDbWriteRetries) {
        retryCount++;
        await delay(config.retryDelayMs * retryCount); // Exponential backoff
        continue;
      }

      // Exhausted retries, return failure
      return {
        passed: false,
        productId: payload.productId,
        discrepancies: [
          {
            field: "_database",
            intended: "write and verify",
            actual: lastError.message,
            issue: "CORRUPTED",
          },
        ],
        retryCount,
      };
    }
  }

  // This shouldn't be reached, but TypeScript wants a return
  return {
    passed: false,
    productId: payload.productId,
    discrepancies: [
      {
        field: "_database",
        intended: "write and verify",
        actual: lastError?.message || "Unknown error",
        issue: "CORRUPTED",
      },
    ],
    retryCount,
  };
}

// ============================================
// COMPARISON FUNCTIONS
// ============================================

/**
 * Compare write payload to actual product in database
 */
function comparePayloadToProduct(
  payload: WritePayload,
  actual: Product
): WriteDiscrepancy[] {
  const discrepancies: WriteDiscrepancy[] = [];

  // Compare description
  if (payload.description) {
    const discrepancy = compareStringField(
      "description",
      payload.description,
      actual.description
    );
    if (discrepancy) discrepancies.push(discrepancy);
  }

  // Compare specifications (JSON object)
  if (payload.specifications && Object.keys(payload.specifications).length > 0) {
    const discrepancy = compareJsonField(
      "specifications",
      payload.specifications,
      actual.specifications as Record<string, string> | null
    );
    if (discrepancy) discrepancies.push(discrepancy);
  }

  // Compare features (JSON object)
  if (payload.features && Object.keys(payload.features).length > 0) {
    const discrepancy = compareJsonField(
      "features",
      payload.features,
      actual.features as Record<string, string | string[]> | null
    );
    if (discrepancy) discrepancies.push(discrepancy);
  }

  // Compare benefits (array)
  if (payload.benefits && payload.benefits.length > 0) {
    const discrepancy = compareArrayField(
      "benefits",
      payload.benefits,
      actual.benefits
    );
    if (discrepancy) discrepancies.push(discrepancy);
  }

  // Compare tags (array)
  if (payload.tags && payload.tags.length > 0) {
    const discrepancy = compareArrayField(
      "tags",
      payload.tags,
      actual.tags
    );
    if (discrepancy) discrepancies.push(discrepancy);
  }

  return discrepancies;
}

/**
 * Compare a string field
 */
function compareStringField(
  fieldName: string,
  intended: string,
  actual: string | null | undefined
): WriteDiscrepancy | null {
  if (!intended) return null;

  const actualValue = actual || "";

  if (intended === actualValue) {
    return null; // Match
  }

  // Detect the type of issue
  const issue = detectStringIssue(intended, actualValue);

  return {
    field: fieldName,
    intended,
    actual: actualValue,
    issue,
  };
}

/**
 * Compare a JSON object field
 */
function compareJsonField(
  fieldName: string,
  intended: Record<string, unknown>,
  actual: Record<string, unknown> | null | undefined
): WriteDiscrepancy | null {
  const intendedStr = JSON.stringify(intended, Object.keys(intended).sort());
  const actualStr = actual
    ? JSON.stringify(actual, Object.keys(actual).sort())
    : "{}";

  if (intendedStr === actualStr) {
    return null; // Match
  }

  // Check if data exists but differs
  if (actual && Object.keys(actual).length > 0) {
    // Check for individual field mismatches
    const missingKeys = Object.keys(intended).filter(k => !(k in actual));

    if (missingKeys.length > 0) {
      return {
        field: fieldName,
        intended: intendedStr,
        actual: actualStr,
        issue: "MISSING",
      };
    }

    // Some keys exist but values differ
    return {
      field: fieldName,
      intended: intendedStr,
      actual: actualStr,
      issue: "CORRUPTED",
    };
  }

  return {
    field: fieldName,
    intended: intendedStr,
    actual: actualStr,
    issue: actual === null ? "MISSING" : "CORRUPTED",
  };
}

/**
 * Compare an array field
 */
function compareArrayField(
  fieldName: string,
  intended: string[],
  actual: string[] | null | undefined
): WriteDiscrepancy | null {
  const actualArray = actual || [];

  // Sort for comparison (order might not matter)
  const intendedSorted = [...intended].sort();
  const actualSorted = [...actualArray].sort();

  if (JSON.stringify(intendedSorted) === JSON.stringify(actualSorted)) {
    return null; // Match
  }

  // Check for truncation
  if (actualArray.length < intended.length && actualArray.length > 0) {
    // Check if it's a prefix
    const isPrefix = actualArray.every((v, i) =>
      intended.includes(v)
    );

    if (isPrefix) {
      return {
        field: fieldName,
        intended: JSON.stringify(intended),
        actual: JSON.stringify(actualArray),
        issue: "TRUNCATED",
      };
    }
  }

  return {
    field: fieldName,
    intended: JSON.stringify(intended),
    actual: JSON.stringify(actualArray),
    issue: actualArray.length === 0 ? "MISSING" : "CORRUPTED",
  };
}

/**
 * Detect the type of issue between intended and actual string values
 */
function detectStringIssue(intended: string, actual: string): WriteIssue {
  // Check for truncation
  if (actual.length < intended.length && intended.startsWith(actual)) {
    return "TRUNCATED";
  }

  // Check for encoding issues (common patterns)
  const hasEncodingIssues =
    actual.includes("�") || // Replacement character
    actual.includes("\\u") || // Escaped unicode
    (intended.includes("'") && actual.includes("''")) || // SQL escaping artifacts
    (intended.includes('"') && actual.includes('\\"'));

  if (hasEncodingIssues) {
    return "ENCODING";
  }

  // Check for complete missing data
  if (!actual || actual.trim() === "") {
    return "MISSING";
  }

  // Check for type mismatch (e.g., number stored as string differently)
  if (typeof intended !== typeof actual) {
    return "TYPE_MISMATCH";
  }

  // Default to corruption
  return "CORRUPTED";
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Simple delay utility
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build a write payload from aggregated data
 */
export function buildWritePayload(
  productId: string,
  description: string,
  specifications: Record<string, string>,
  features: Record<string, string | string[]>,
  benefits: string[],
  tags: string[],
  sources: string[]
): WritePayload {
  return {
    productId,
    description: description.trim(),
    specifications: cleanObject(specifications),
    features: cleanObject(features) as Record<string, string | string[]>,
    benefits: benefits.filter(b => b && b.trim()),
    tags: Array.from(new Set(tags.filter(t => t && t.trim()))), // Dedupe tags
    sources,
  };
}

/**
 * Clean an object by removing empty values
 */
function cleanObject<T extends Record<string, unknown>>(obj: T): T {
  const cleaned = {} as T;

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && value !== undefined && value !== "") {
      if (Array.isArray(value) && value.length === 0) {
        continue; // Skip empty arrays
      }
      (cleaned as Record<string, unknown>)[key] = value;
    }
  }

  return cleaned;
}

/**
 * Check if Gate 3 result indicates a retry-able failure
 */
export function isRetryableFailure(result: Gate3Result): boolean {
  if (result.passed) return false;

  // Database errors are often transient
  const transientIssues: WriteIssue[] = ["CORRUPTED"];

  return result.discrepancies.some(d =>
    transientIssues.includes(d.issue) && d.field === "_database"
  );
}

// Export gate3 module
export const gate3 = {
  verifyDatabaseWrite,
  buildWritePayload,
  isRetryableFailure,
};
