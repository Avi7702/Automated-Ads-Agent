import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Standard API rate limiter - 100 requests per 15 minutes per IP
export const apiLimiter = rateLimit({
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
