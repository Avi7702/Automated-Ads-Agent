/**
 * SSRF Prevention Utility
 *
 * Validates user-provided URLs to prevent Server-Side Request Forgery attacks.
 * Blocks private/internal IPs, localhost, link-local, and non-HTTP(S) schemes.
 */

import { logger } from './logger';

// Private and reserved IP ranges (IPv4)
const BLOCKED_IPV4_RANGES = [
  /^127\./, // Loopback
  /^10\./, // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
  /^192\.168\./, // Class C private
  /^169\.254\./, // Link-local
  /^0\./, // Current network
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, // Shared address space (CGN)
  /^198\.1[89]\./, // Benchmarking
  /^192\.0\.[02]\./, // Documentation / IETF protocol
  /^198\.51\.100\./, // Documentation (TEST-NET-2)
  /^203\.0\.113\./, // Documentation (TEST-NET-3)
  /^224\./, // Multicast
  /^240\./, // Reserved for future use
  /^255\.255\.255\.255$/, // Broadcast
];

// Blocked hostnames
const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'ip6-localhost',
  'ip6-loopback',
  '[::1]',
  '[::0]',
  '[0:0:0:0:0:0:0:0]',
  '[0:0:0:0:0:0:0:1]',
  'metadata.google.internal', // GCP metadata
  'metadata.google.com',
  '169.254.169.254', // AWS/GCP/Azure metadata
]);

export interface SsrfValidationResult {
  safe: boolean;
  reason?: string;
}

/**
 * Validate that a URL is safe from SSRF attacks.
 *
 * @param urlString - The raw URL string to validate
 * @param allowedProtocols - Protocols to allow (defaults to https only)
 * @returns Validation result with safe boolean and optional reason
 */
export function validateUrlSafe(urlString: string, allowedProtocols: string[] = ['https:']): SsrfValidationResult {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { safe: false, reason: 'Invalid URL format' };
  }

  // 1. Protocol check
  if (!allowedProtocols.includes(parsed.protocol)) {
    return { safe: false, reason: `Disallowed protocol: ${parsed.protocol}` };
  }

  // 2. Block userinfo (user:pass@host) — often used in SSRF bypasses
  if (parsed.username || parsed.password) {
    return { safe: false, reason: 'URL contains credentials (userinfo)' };
  }

  // 3. Block non-standard ports commonly used for internal services
  if (parsed.port && !['80', '443', ''].includes(parsed.port)) {
    return { safe: false, reason: `Non-standard port: ${parsed.port}` };
  }

  const hostname = parsed.hostname.toLowerCase();

  // 4. Blocked hostnames (localhost, metadata endpoints, etc.)
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    return { safe: false, reason: `Blocked hostname: ${hostname}` };
  }

  // 5. Block IPv6 addresses in brackets (most are internal)
  if (hostname.startsWith('[')) {
    return { safe: false, reason: 'IPv6 addresses not allowed' };
  }

  // 6. Block bare IPv4 addresses in private ranges
  if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
    for (const range of BLOCKED_IPV4_RANGES) {
      if (range.test(hostname)) {
        return { safe: false, reason: `Private/reserved IP: ${hostname}` };
      }
    }
  }

  // 7. Block hostnames that resolve to no TLD (internal names like "redis", "postgres")
  if (!hostname.includes('.')) {
    return { safe: false, reason: `Single-label hostname (internal): ${hostname}` };
  }

  return { safe: true };
}

/**
 * Convenience function: throws if URL is not safe.
 */
export function assertUrlSafe(urlString: string, context: string, allowedProtocols?: string[]): URL {
  const result = validateUrlSafe(urlString, allowedProtocols);
  if (!result.safe) {
    logger.warn({ module: 'SSRFGuard', url: urlString, reason: result.reason, context }, 'SSRF: blocked unsafe URL');
    throw new Error(`Unsafe URL blocked: ${result.reason}`);
  }
  return new URL(urlString);
}
