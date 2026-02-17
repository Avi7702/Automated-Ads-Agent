/**
 * Performance Metrics Middleware
 *
 * Tracks per-endpoint latency, throughput, and error rates using LRU eviction
 */

import { Request, Response, NextFunction } from 'express';
import { BoundedMap } from '../utils/memoryManager';

interface EndpointMetrics {
  endpoint: string;
  method: string;
  requests: number;
  errors: number;
  totalLatency: number;
  minLatency: number;
  maxLatency: number;
  lastReset: Date;
}

// Use existing BoundedMap with LRU eviction and automatic cleanup
const metricsMap = new BoundedMap<string, EndpointMetrics>({
  maxSize: 1000,
  name: 'PerformanceMetrics',
  cleanupIntervalMs: 5 * 60 * 1000, // Clean up every 5 minutes
});

/**
 * Normalize endpoint paths to remove IDs for aggregation
 * Converts /api/ads/123 -> /api/ads/:id
 * Converts /api/users/550e8400-e29b-41d4-a716-446655440000 -> /api/users/:uuid
 */
function normalizeEndpoint(path: string): string {
  return path
    .replace(/\/[0-9a-f]{24}/gi, '/:id') // MongoDB ObjectIds
    .replace(/\/\d+/g, '/:id') // Numeric IDs
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:uuid'); // UUIDs
}

/**
 * Express middleware to track performance metrics for each endpoint
 */
export function performanceMetricsMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip health checks and monitoring endpoints to avoid noise
  if (req.path.startsWith('/api/health') || req.path.startsWith('/api/monitoring')) {
    return next();
  }

  const start = Date.now();
  const endpoint = normalizeEndpoint(req.path);
  const method = req.method;
  const key = `${method} ${endpoint}`;

  res.on('finish', () => {
    const latency = Date.now() - start;
    const isError = res.statusCode >= 500;

    let metrics = metricsMap.get(key);
    if (!metrics) {
      metrics = {
        endpoint,
        method,
        requests: 0,
        errors: 0,
        totalLatency: 0,
        minLatency: Infinity,
        maxLatency: 0,
        lastReset: new Date(),
      };
      metricsMap.set(key, metrics);
    }

    metrics.requests++;
    if (isError) metrics.errors++;
    metrics.totalLatency += latency;
    metrics.minLatency = Math.min(metrics.minLatency, latency);
    metrics.maxLatency = Math.max(metrics.maxLatency, latency);
  });

  next();
}

/**
 * Get all performance metrics sorted by request count
 */
export function getPerformanceMetrics() {
  const metrics: Array<{
    endpoint: string;
    method: string;
    requests: number;
    errors: number;
    errorRate: number;
    avgLatency: number;
    minLatency: number;
    maxLatency: number;
    lastReset: Date;
  }> = [];

  metricsMap.forEach((m, _key) => {
    metrics.push({
      endpoint: m.endpoint,
      method: m.method,
      requests: m.requests,
      errors: m.errors,
      errorRate: m.requests > 0 ? (m.errors / m.requests) * 100 : 0,
      avgLatency: m.requests > 0 ? m.totalLatency / m.requests : 0,
      minLatency: m.minLatency === Infinity ? 0 : m.minLatency,
      maxLatency: m.maxLatency,
      lastReset: m.lastReset,
    });
  });

  return metrics.sort((a, b) => b.requests - a.requests);
}

/**
 * Reset all performance metrics (called on shutdown)
 */
export function resetPerformanceMetrics() {
  metricsMap.clear();
}
