import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Skip rate limiting in test environment when not explicitly testing rate limits
// The rate limit tests set a special header to opt-in to actual rate limiting
const shouldSkip = (req: Request): boolean => {
  if (process.env.NODE_ENV !== 'test') return false;
  // Allow rate limit tests to test actual behavior
  return req.headers['x-test-rate-limit'] !== 'true';
};

// Standard API rate limiter - 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
  skip: shouldSkip,
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true, // Return rate limit info in headers
  legacyHeaders: false,
  message: { error: 'Too many requests', retryAfter: '15 minutes' },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() ?? Date.now() + 900000 - Date.now()) / 1000),
    });
  },
});

// Expensive operations limiter - 20 requests per hour (for /api/transform)
export const expensiveLimiter = rateLimit({
  skip: shouldSkip,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Generation limit reached', retryAfter: '1 hour' },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Generation limit reached',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() ?? Date.now() + 3600000 - Date.now()) / 1000),
    });
  },
});

// Edit operations limiter - 30 requests per hour (for /api/generations/:id/edit)
export const editLimiter = rateLimit({
  skip: shouldSkip,
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Edit limit reached', retryAfter: '1 hour' },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Edit limit reached',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() ?? Date.now() + 3600000 - Date.now()) / 1000),
    });
  },
});

// Login limiter - 10 attempts per minute (brute force protection)
export const loginLimiter = rateLimit({
  skip: shouldSkip,
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts', retryAfter: '1 minute' },
  handler: (req: Request, res: Response) => {
    res.status(429).json({
      error: 'Too many login attempts',
      retryAfter: Math.ceil((req.rateLimit?.resetTime?.getTime() ?? Date.now() + 60000 - Date.now()) / 1000),
    });
  },
});
