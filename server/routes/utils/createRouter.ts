/**
 * Router Factory Utilities
 * Provides common utilities for creating routers
 */

import { Router, Request, Response, NextFunction } from 'express';
import { logger } from '../../lib/logger';

/**
 * Create a new Express router with standard configuration
 */
export function createRouter(): Router {
  return Router({ mergeParams: true });
}

/**
 * Wrap async route handlers to catch errors
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * Handle route errors with consistent format
 */
export function handleRouteError(res: Response, error: unknown, context: string): void {
  logger.error({ err: error, context }, `Route error in ${context}`);

  if (error instanceof Error) {
    // Known error types
    if (error.name === 'ValidationError') {
      res.status(400).json({
        error: error.message,
        code: 'VALIDATION_ERROR',
      } as ErrorResponse);
      return;
    }

    if (error.name === 'NotFoundError') {
      res.status(404).json({
        error: error.message,
        code: 'NOT_FOUND',
      } as ErrorResponse);
      return;
    }

    if (error.name === 'UnauthorizedError') {
      res.status(401).json({
        error: error.message,
        code: 'UNAUTHORIZED',
      } as ErrorResponse);
      return;
    }

    if (error.name === 'ForbiddenError') {
      res.status(403).json({
        error: error.message,
        code: 'FORBIDDEN',
      } as ErrorResponse);
      return;
    }

    if (error.name === 'ConflictError') {
      res.status(409).json({
        error: error.message,
        code: 'CONFLICT',
      } as ErrorResponse);
      return;
    }

    // Rate limit errors
    if (error.message.includes('rate limit') || error.message.includes('quota')) {
      res.status(429).json({
        error: error.message,
        code: 'RATE_LIMITED',
      } as ErrorResponse);
      return;
    }
  }

  // Generic server error
  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR',
  } as ErrorResponse);
}
