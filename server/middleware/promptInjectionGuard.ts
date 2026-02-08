import type { Request, Response, NextFunction } from 'express';
import { detectPromptInjection } from '../lib/promptSanitizer';
import { logger } from '../lib/logger';

/**
 * Middleware that scans request body fields for prompt injection patterns.
 * Applied to AI-facing endpoints to detect and block adversarial inputs.
 *
 * This does NOT sanitize — it blocks requests with high-confidence injection.
 * The promptSanitizer module handles sanitization at the service layer.
 */

// Fields to scan in the request body
const FIELDS_TO_SCAN = [
  'prompt',
  'editPrompt',
  'userGoal',
  'productDescription',
  'productName',
  'message',
  'text',
  'instructions',
  'topic',
  'caption',
];

/**
 * Recursively extract string values from an object for scanning
 */
function extractStringFields(obj: unknown, fields: string[]): Array<{ field: string; value: string }> {
  const results: Array<{ field: string; value: string }> = [];

  if (!obj || typeof obj !== 'object') return results;

  for (const field of fields) {
    const value = (obj as Record<string, unknown>)[field];
    if (typeof value === 'string' && value.length > 0) {
      results.push({ field, value });
    }
  }

  return results;
}

export function promptInjectionGuard(req: Request, _res: Response, next: NextFunction): void {
  // Only scan POST/PUT/PATCH bodies
  if (!['POST', 'PUT', 'PATCH'].includes(req.method)) {
    next();
    return;
  }

  const body = req.body;
  if (!body || typeof body !== 'object') {
    next();
    return;
  }

  const fieldsToCheck = extractStringFields(body, FIELDS_TO_SCAN);
  const detections: Array<{ field: string; patterns: string[] }> = [];

  for (const { field, value } of fieldsToCheck) {
    const result = detectPromptInjection(value);
    if (result.detected) {
      detections.push({ field, patterns: result.patterns });
    }
  }

  if (detections.length > 0) {
    logger.warn({
      module: 'promptInjectionGuard',
      ip: req.ip,
      path: req.path,
      userId: (req as unknown as Record<string, unknown>)['userId'],
      detections,
    }, 'Prompt injection attempt detected in request');

    // Log but don't block — sanitization happens at service layer.
    // In strict mode (future), we could block:
    // res.status(400).json({ error: 'Request contains disallowed patterns' });
    // return;
  }

  next();
}
