import { logger } from './logger';

/**
 * Centralized prompt sanitization for all LLM interactions.
 * Prevents prompt injection by stripping role-override attempts,
 * instruction overrides, and other adversarial patterns from user inputs
 * before they are interpolated into LLM prompts.
 */

// Patterns that attempt to override the system/assistant role
const ROLE_OVERRIDE_PATTERNS = [
  /\b(system|assistant|human|user)\s*:/gi,
  /\[INST\]|\[\/INST\]/gi,
  /<\|.*?\|>/g,                            // Special tokens like <|endoftext|>
  /<<\s*SYS\s*>>|<<\s*\/SYS\s*>>/gi,     // Llama-style system markers
];

// Patterns that attempt to override instructions
const INSTRUCTION_OVERRIDE_PATTERNS = [
  /ignore\s+(previous|above|all|prior|earlier)\s+(instructions?|prompts?|context)/gi,
  /disregard\s+(previous|above|all|prior|earlier)\s+(instructions?|prompts?|context)/gi,
  /forget\s+(previous|above|all|everything|prior)/gi,
  /you\s+are\s+now\b/gi,
  /pretend\s+to\s+be\b/gi,
  /act\s+as\s+if\b/gi,
  /new\s+instructions?\s*:/gi,
  /override\s+(previous|all|system)/gi,
  /from\s+now\s+on\s*,?\s*(you|ignore|disregard)/gi,
];

// Patterns that attempt to extract system prompts
const EXTRACTION_PATTERNS = [
  /repeat\s+(your|the|all)\s+(instructions?|system\s*prompt|rules)/gi,
  /show\s+(me\s+)?(your|the)\s+(instructions?|system\s*prompt|rules|prompt)/gi,
  /what\s+(are|is)\s+(your|the)\s+(instructions?|system\s*prompt|rules)/gi,
  /output\s+(your|the)\s+(instructions?|system\s*prompt|rules)/gi,
  /print\s+(your|the)\s+(instructions?|system\s*prompt|rules)/gi,
];

// Markdown/code injection patterns
const MARKDOWN_INJECTION_PATTERNS = [
  /```[\s\S]*?```/g,  // Code blocks (could contain instructions)
];

interface SanitizeOptions {
  /** Max character length. Default: 2000 */
  maxLength?: number;
  /** Whether to strip code blocks. Default: true */
  stripCodeBlocks?: boolean;
  /** Whether to strip newlines (replace with spaces). Default: false */
  stripNewlines?: boolean;
  /** Context label for logging. Default: 'unknown' */
  context?: string;
}

/**
 * Sanitize user input before interpolating into an LLM prompt.
 *
 * This does NOT block the request — it strips dangerous patterns
 * and logs detections. The promptInjectionGuard middleware handles blocking.
 */
export function sanitizeForPrompt(input: string, options: SanitizeOptions = {}): string {
  const {
    maxLength = 2000,
    stripCodeBlocks = true,
    stripNewlines = false,
    context = 'unknown',
  } = options;

  if (!input || typeof input !== 'string') return '';

  let sanitized = input;
  const detections: string[] = [];

  // Strip role override attempts
  for (const pattern of ROLE_OVERRIDE_PATTERNS) {
    if (pattern.test(sanitized)) {
      detections.push(`role_override:${pattern.source.slice(0, 30)}`);
      sanitized = sanitized.replace(pattern, '[filtered]');
    }
    // Reset regex lastIndex since we use /g flag
    pattern.lastIndex = 0;
  }

  // Strip instruction override attempts
  for (const pattern of INSTRUCTION_OVERRIDE_PATTERNS) {
    if (pattern.test(sanitized)) {
      detections.push(`instruction_override:${pattern.source.slice(0, 30)}`);
      sanitized = sanitized.replace(pattern, '[filtered]');
    }
    pattern.lastIndex = 0;
  }

  // Strip system prompt extraction attempts
  for (const pattern of EXTRACTION_PATTERNS) {
    if (pattern.test(sanitized)) {
      detections.push(`extraction_attempt:${pattern.source.slice(0, 30)}`);
      sanitized = sanitized.replace(pattern, '[filtered]');
    }
    pattern.lastIndex = 0;
  }

  // Strip code blocks if enabled
  if (stripCodeBlocks) {
    for (const pattern of MARKDOWN_INJECTION_PATTERNS) {
      if (pattern.test(sanitized)) {
        detections.push('code_block_injection');
        sanitized = sanitized.replace(pattern, '');
      }
      pattern.lastIndex = 0;
    }
  }

  // Strip angle brackets (XSS-style)
  sanitized = sanitized.replace(/[<>]/g, '');

  // Optionally strip newlines
  if (stripNewlines) {
    sanitized = sanitized.replace(/\n/g, ' ');
  }

  // Trim and limit length
  sanitized = sanitized.trim().slice(0, maxLength);

  // Log detections
  if (detections.length > 0) {
    logger.warn({
      module: 'promptSanitizer',
      context,
      detections,
      inputLength: input.length,
    }, 'Prompt injection patterns detected and sanitized');
  }

  return sanitized;
}

/**
 * Sanitize content from knowledge base or external sources.
 * More aggressive than user input sanitization — also strips
 * code blocks and special tokens that could be embedded in KB data.
 */
export function sanitizeKBContent(content: string, maxLength: number = 5000): string {
  if (!content || typeof content !== 'string') return '';

  return sanitizeForPrompt(content, {
    maxLength,
    stripCodeBlocks: true,
    stripNewlines: false,
    context: 'knowledge_base',
  });
}

/**
 * Sanitize a simple string value from LLM output.
 * Used for individual fields after JSON parsing.
 */
export function sanitizeOutputString(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[<>]/g, '').trim().slice(0, 500);
}

/**
 * Detect if a string contains likely prompt injection patterns.
 * Returns true if injection is detected.
 * Used by the middleware guard for request blocking.
 */
export function detectPromptInjection(input: string): { detected: boolean; patterns: string[] } {
  if (!input || typeof input !== 'string') return { detected: false, patterns: [] };

  const patterns: string[] = [];

  for (const pattern of INSTRUCTION_OVERRIDE_PATTERNS) {
    if (pattern.test(input)) {
      patterns.push(`instruction_override`);
    }
    pattern.lastIndex = 0;
  }

  for (const pattern of EXTRACTION_PATTERNS) {
    if (pattern.test(input)) {
      patterns.push(`extraction_attempt`);
    }
    pattern.lastIndex = 0;
  }

  // Check for excessive role markers (more than 2 is suspicious)
  const roleMarkerCount = (input.match(/\b(system|assistant)\s*:/gi) || []).length;
  if (roleMarkerCount > 2) {
    patterns.push('excessive_role_markers');
  }

  return { detected: patterns.length > 0, patterns };
}
