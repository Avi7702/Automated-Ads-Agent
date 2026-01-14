/**
 * Error Tracking Service
 *
 * Tracks recent errors using efficient ring buffer with truncated stack traces
 * to prevent memory bloat
 */

import { nanoid } from 'nanoid';
import * as crypto from 'crypto';

interface ErrorEvent {
    id: string;
    timestamp: Date;
    statusCode: number;
    message: string;
    endpoint: string;
    method: string;
    userAgent?: string;
    stack?: string;
    fingerprint: string; // Hash for deduplication
}

/**
 * Ring buffer for efficient error storage with O(1) operations
 * Fixed-size circular buffer that overwrites oldest entries when full
 */
class ErrorRingBuffer {
    private buffer: (ErrorEvent | undefined)[] = [];
    private index = 0;
    private readonly capacity: number;

    constructor(capacity: number) {
        this.capacity = capacity;
        this.buffer = new Array(capacity);
    }

    /**
     * Add error to buffer (O(1) operation)
     */
    push(error: ErrorEvent) {
        this.buffer[this.index] = error;
        this.index = (this.index + 1) % this.capacity;
    }

    /**
     * Get N most recent errors
     */
    getRecent(limit: number): ErrorEvent[] {
        const result: ErrorEvent[] = [];
        for (let i = 0; i < Math.min(limit, this.capacity); i++) {
            const idx = (this.index - 1 - i + this.capacity) % this.capacity;
            if (this.buffer[idx]) {
                result.push(this.buffer[idx]!);
            }
        }
        return result;
    }

    /**
     * Clear all errors
     */
    clear() {
        this.buffer = new Array(this.capacity);
        this.index = 0;
    }

    /**
     * Get current size (number of errors stored)
     */
    get size() {
        return this.buffer.filter(e => e !== undefined).length;
    }

    /**
     * Get all errors (for stats)
     */
    getAll(): ErrorEvent[] {
        return this.buffer.filter((e): e is ErrorEvent => e !== undefined);
    }
}

const recentErrors = new ErrorRingBuffer(100);

/**
 * Create error fingerprint for deduplication
 * Uses hash of message + first 200 chars of stack
 */
function createFingerprint(message: string, stack?: string): string {
    const content = message + (stack ? stack.slice(0, 200) : '');
    return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Truncate stack trace to prevent memory bloat
 * Keeps only first 10 lines of stack trace
 */
function truncateStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    const lines = stack.split('\n').slice(0, 10);
    return lines.join('\n');
}

/**
 * Track an error event
 * Called from error handler middleware
 */
export function trackError(error: {
    statusCode: number;
    message: string;
    endpoint: string;
    method: string;
    userAgent?: string;
    stack?: string;
}) {
    const errorEvent: ErrorEvent = {
        id: nanoid(),
        timestamp: new Date(),
        ...error,
        stack: truncateStack(error.stack),
        fingerprint: createFingerprint(error.message, error.stack),
    };

    recentErrors.push(errorEvent);
}

/**
 * Get recent errors
 */
export function getRecentErrors(limit = 50): ErrorEvent[] {
    return recentErrors.getRecent(limit);
}

/**
 * Get error statistics
 */
export function getErrorStats() {
    const errors = recentErrors.getAll();
    const now = Date.now();
    const last5min = errors.filter(e => now - e.timestamp.getTime() < 5 * 60 * 1000);
    const last1hour = errors.filter(e => now - e.timestamp.getTime() < 60 * 60 * 1000);

    return {
        total: recentErrors.size,
        last5min: last5min.length,
        last1hour: last1hour.length,
        byStatusCode: groupBy(errors, 'statusCode'),
        byEndpoint: groupBy(errors, 'endpoint'),
        byFingerprint: groupBy(errors, 'fingerprint'),
    };
}

/**
 * Group errors by a key for statistics
 */
function groupBy<T>(array: T[], key: keyof T): Record<string, number> {
    return array.reduce((acc, item) => {
        const k = String(item[key]);
        acc[k] = (acc[k] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
}

/**
 * Clear all errors (called on shutdown)
 */
export function clearErrors() {
    recentErrors.clear();
}
