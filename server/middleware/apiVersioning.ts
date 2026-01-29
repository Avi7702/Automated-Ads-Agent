/**
 * API Versioning Middleware
 * Task 5.2 - URL rewriting for /api/v1/* and deprecation headers for /api/*
 *
 * Strategy:
 * - /api/v1/* requests are rewritten to /api/* for routing, with X-API-Version: v1 header
 * - /api/* (non-versioned) requests get Deprecation + Sunset headers for backward compat
 * - The CSRF token endpoint (/api/csrf-token) is also covered
 *
 * This middleware must be mounted BEFORE any route handlers.
 */

import type { Request, Response, NextFunction } from 'express';

/** Prefix that signals a versioned API call */
const V1_PREFIX = '/api/v1';

/**
 * Middleware that handles API versioning for all /api/* routes.
 *
 * For /api/v1/* requests:
 *   - Rewrites req.url from /api/v1/... to /api/...
 *   - Adds X-API-Version: v1 response header
 *
 * For /api/* (non-versioned) requests:
 *   - Adds deprecation headers (Deprecation, Sunset, Link)
 *   - Adds X-API-Version: v1 response header
 *
 * Non-API requests are passed through unchanged.
 */
export function apiVersioningMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Only process /api/* requests
  if (!req.url.startsWith('/api')) {
    next();
    return;
  }

  if (req.url.startsWith(V1_PREFIX)) {
    // Versioned request: rewrite URL and add version header
    req.url = '/api' + req.url.slice(V1_PREFIX.length);

    // Also rewrite originalUrl so logging and Link header generation work correctly
    if (req.originalUrl.startsWith(V1_PREFIX)) {
      req.originalUrl = '/api' + req.originalUrl.slice(V1_PREFIX.length);
    }

    res.setHeader('X-API-Version', 'v1');
  } else {
    // Legacy /api/* request: add deprecation + version headers
    res.setHeader('X-API-Version', 'v1');
    res.setHeader('Deprecation', 'true');

    // Sunset date: 6 months from now (rolling)
    const sunset = new Date();
    sunset.setMonth(sunset.getMonth() + 6);
    res.setHeader('Sunset', sunset.toUTCString());

    // Link to versioned equivalent
    const versionedPath = req.originalUrl.replace(/^\/api\//, '/api/v1/');
    res.setHeader('Link', `<${versionedPath}>; rel="successor-version"`);
  }

  next();
}
