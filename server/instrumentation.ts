/**
 * OpenTelemetry Instrumentation for Automated-Ads-Agent
 *
 * This file MUST be imported before any other modules to ensure
 * proper instrumentation of all dependencies (Express, PostgreSQL, Redis, etc.)
 *
 * Automatically traces:
 * - HTTP requests (Express routes)
 * - PostgreSQL queries (via pg driver)
 * - Redis operations (via ioredis)
 * - External HTTP calls (to Gemini API, etc.)
 *
 * Custom metrics tracked:
 * - Gemini API token usage and costs
 * - Image generations per user
 * - API request latencies
 * - Error rates by endpoint
 *
 * Supported backends:
 * - Grafana Cloud (recommended)
 * - Axiom
 * - New Relic
 * - Uptrace
 * - Any OTLP-compatible backend
 */

// Load environment variables FIRST (before reading process.env below)
import dotenv from 'dotenv';
dotenv.config();

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-proto';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-proto';
import { PeriodicExportingMetricReader, MeterProvider } from '@opentelemetry/sdk-metrics';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from '@opentelemetry/semantic-conventions';
import { metrics } from '@opentelemetry/api';

// =============================================================================
// Configuration from environment variables
// =============================================================================
const OTEL_ENABLED = process.env.OTEL_ENABLED !== 'false';
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318';
const OTEL_HEADERS = process.env.OTEL_EXPORTER_OTLP_HEADERS || '';
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || 'automated-ads-agent';
const SERVICE_VERSION = process.env.npm_package_version || '1.0.0';
const DEPLOYMENT_ENV = process.env.NODE_ENV || 'development';

// =============================================================================
// Custom Metrics - Exported for use in services
// =============================================================================

// Meter for custom metrics (initialized after SDK starts)
let appMeter: ReturnType<typeof metrics.getMeter>;

// Gemini API Metrics
let geminiTokensCounter: ReturnType<typeof appMeter.createCounter>;
let geminiCostCounter: ReturnType<typeof appMeter.createCounter>;
let geminiRequestsCounter: ReturnType<typeof appMeter.createCounter>;
let geminiLatencyHistogram: ReturnType<typeof appMeter.createHistogram>;

// User Activity Metrics
let imageGenerationsCounter: ReturnType<typeof appMeter.createCounter>;
let imageEditsCounter: ReturnType<typeof appMeter.createCounter>;
let activeUsersGauge: ReturnType<typeof appMeter.createUpDownCounter>;

// Error Metrics
let apiErrorsCounter: ReturnType<typeof appMeter.createCounter>;

// Auth Metrics
let authAttemptsCounter: ReturnType<typeof appMeter.createCounter>;
let rateLimitHitsCounter: ReturnType<typeof appMeter.createCounter>;

// Storage Metrics
let storageUsageGauge: ReturnType<typeof appMeter.createUpDownCounter>;

// File Search (RAG) Metrics
let fileSearchUploadsCounter: ReturnType<typeof appMeter.createCounter>;
let fileSearchQueriesCounter: ReturnType<typeof appMeter.createCounter>;
let fileSearchErrorsCounter: ReturnType<typeof appMeter.createCounter>;
let fileSearchLatencyHistogram: ReturnType<typeof appMeter.createHistogram>;

/**
 * Initialize custom metrics after SDK is ready
 */
function initializeCustomMetrics() {
  appMeter = metrics.getMeter(SERVICE_NAME, SERVICE_VERSION);

  // ===== Gemini API Cost Tracking =====
  geminiTokensCounter = appMeter.createCounter('gemini.tokens.total', {
    description: 'Total tokens used in Gemini API calls',
    unit: 'tokens',
  });

  geminiCostCounter = appMeter.createCounter('gemini.cost.total', {
    description: 'Estimated cost of Gemini API calls in USD',
    unit: 'USD',
  });

  geminiRequestsCounter = appMeter.createCounter('gemini.requests.total', {
    description: 'Total number of Gemini API requests',
    unit: 'requests',
  });

  geminiLatencyHistogram = appMeter.createHistogram('gemini.request.duration', {
    description: 'Gemini API request duration',
    unit: 'ms',
  });

  // ===== User Activity Tracking =====
  imageGenerationsCounter = appMeter.createCounter('images.generations.total', {
    description: 'Total number of images generated',
    unit: 'images',
  });

  imageEditsCounter = appMeter.createCounter('images.edits.total', {
    description: 'Total number of image edits',
    unit: 'edits',
  });

  activeUsersGauge = appMeter.createUpDownCounter('users.active', {
    description: 'Number of currently active users',
    unit: 'users',
  });

  // ===== Error Tracking =====
  apiErrorsCounter = appMeter.createCounter('api.errors.total', {
    description: 'Total number of API errors',
    unit: 'errors',
  });

  // ===== Auth Tracking =====
  authAttemptsCounter = appMeter.createCounter('auth.attempts.total', {
    description: 'Total authentication attempts',
    unit: 'attempts',
  });

  rateLimitHitsCounter = appMeter.createCounter('ratelimit.hits.total', {
    description: 'Total rate limit hits',
    unit: 'hits',
  });

  // ===== Storage Tracking =====
  storageUsageGauge = appMeter.createUpDownCounter('storage.usage.bytes', {
    description: 'Current storage usage in bytes',
    unit: 'bytes',
  });

  // ===== File Search (RAG) Tracking =====
  fileSearchUploadsCounter = appMeter.createCounter('filesearch.uploads.total', {
    description: 'Total files uploaded to File Search Store',
    unit: 'files',
  });

  fileSearchQueriesCounter = appMeter.createCounter('filesearch.queries.total', {
    description: 'Total File Search queries executed',
    unit: 'queries',
  });

  fileSearchErrorsCounter = appMeter.createCounter('filesearch.errors.total', {
    description: 'Total File Search operation errors',
    unit: 'errors',
  });

  fileSearchLatencyHistogram = appMeter.createHistogram('filesearch.latency.ms', {
    description: 'File Search operation latency in milliseconds',
    unit: 'ms',
  });
}

// =============================================================================
// Metrics Helper Functions - Export for use in services
// =============================================================================

// Gemini pricing (as of Dec 2024) - adjust as needed
const GEMINI_PRICING = {
  'gemini-3-pro-image-preview': {
    inputPerMillion: 0.00, // Free during preview
    outputPerMillion: 0.00,
    imageGeneration: 0.04, // $0.04 per image (estimate)
  },
  'gemini-1.5-pro': {
    inputPerMillion: 3.50,
    outputPerMillion: 10.50,
    imageGeneration: 0.00,
  },
  'gemini-1.5-flash': {
    inputPerMillion: 0.075,
    outputPerMillion: 0.30,
    imageGeneration: 0.00,
  },
};

export const telemetry = {
  /**
   * Track Gemini API usage and cost
   */
  trackGeminiUsage(params: {
    model: string;
    operation: 'generate' | 'edit';
    inputTokens?: number;
    outputTokens?: number;
    durationMs: number;
    userId?: string;
    success: boolean;
    errorType?: string;
  }) {
    if (!OTEL_ENABLED || !geminiRequestsCounter) return;

    const { model, operation, inputTokens = 0, outputTokens = 0, durationMs, userId, success, errorType } = params;
    const pricing = GEMINI_PRICING[model as keyof typeof GEMINI_PRICING] || GEMINI_PRICING['gemini-3-pro-image-preview'];

    // Calculate cost
    const tokenCost = (inputTokens / 1_000_000) * pricing.inputPerMillion +
                      (outputTokens / 1_000_000) * pricing.outputPerMillion;
    const imageCost = success ? pricing.imageGeneration : 0;
    const totalCost = tokenCost + imageCost;

    // Record metrics
    geminiRequestsCounter.add(1, {
      model,
      operation,
      success: String(success),
      error_type: errorType || 'none',
    });

    geminiTokensCounter.add(inputTokens + outputTokens, {
      model,
      token_type: 'total',
      operation,
    });

    geminiCostCounter.add(totalCost, {
      model,
      operation,
      cost_type: 'total',
    });

    geminiLatencyHistogram.record(durationMs, {
      model,
      operation,
      success: String(success),
    });

    // Track user activity
    if (userId) {
      if (operation === 'generate') {
        imageGenerationsCounter.add(1, { user_id: userId });
      } else if (operation === 'edit') {
        imageEditsCounter.add(1, { user_id: userId });
      }
    }

    // Track errors
    if (!success && errorType) {
      apiErrorsCounter.add(1, {
        endpoint: `/api/${operation === 'generate' ? 'transform' : 'edit'}`,
        error_type: errorType,
      });
    }
  },

  /**
   * Track authentication attempts
   */
  trackAuth(params: {
    action: 'login' | 'register' | 'logout' | 'token_refresh';
    success: boolean;
    userId?: string;
    reason?: string;
  }) {
    if (!OTEL_ENABLED || !authAttemptsCounter) return;

    authAttemptsCounter.add(1, {
      action: params.action,
      success: String(params.success),
      reason: params.reason || 'none',
    });
  },

  /**
   * Track rate limit hits
   */
  trackRateLimit(params: {
    endpoint: string;
    userId?: string;
    ip?: string;
  }) {
    if (!OTEL_ENABLED || !rateLimitHitsCounter) return;

    rateLimitHitsCounter.add(1, {
      endpoint: params.endpoint,
    });
  },

  /**
   * Track API errors
   */
  trackError(params: {
    endpoint: string;
    errorType: string;
    statusCode: number;
    userId?: string;
  }) {
    if (!OTEL_ENABLED || !apiErrorsCounter) return;

    apiErrorsCounter.add(1, {
      endpoint: params.endpoint,
      error_type: params.errorType,
      status_code: String(params.statusCode),
    });
  },

  /**
   * Track storage usage changes
   */
  trackStorageChange(bytes: number, operation: 'add' | 'remove') {
    if (!OTEL_ENABLED || !storageUsageGauge) return;

    const change = operation === 'add' ? bytes : -bytes;
    storageUsageGauge.add(change, { operation });
  },

  /**
   * Track active user sessions
   */
  trackUserSession(action: 'start' | 'end') {
    if (!OTEL_ENABLED || !activeUsersGauge) return;

    activeUsersGauge.add(action === 'start' ? 1 : -1, {});
  },

  /**
   * Track File Search file uploads
   */
  trackFileSearchUpload(params: {
    category: string;
    success: boolean;
    durationMs: number;
    errorType?: string;
  }) {
    if (!OTEL_ENABLED || !fileSearchUploadsCounter) return;

    const { category, success, durationMs, errorType } = params;

    fileSearchUploadsCounter.add(1, {
      category,
      success: String(success),
    });

    fileSearchLatencyHistogram.record(durationMs, {
      operation: 'upload',
      category,
      success: String(success),
    });

    if (!success && errorType) {
      fileSearchErrorsCounter.add(1, {
        operation: 'upload',
        error_type: errorType,
      });
    }
  },

  /**
   * Track File Search queries
   */
  trackFileSearchQuery(params: {
    category?: string;
    success: boolean;
    durationMs: number;
    resultsCount?: number;
    errorType?: string;
  }) {
    if (!OTEL_ENABLED || !fileSearchQueriesCounter) return;

    const { category, success, durationMs, errorType } = params;

    fileSearchQueriesCounter.add(1, {
      category: category || 'all',
      success: String(success),
    });

    fileSearchLatencyHistogram.record(durationMs, {
      operation: 'query',
      category: category || 'all',
      success: String(success),
    });

    if (!success && errorType) {
      fileSearchErrorsCounter.add(1, {
        operation: 'query',
        error_type: errorType,
      });
    }
  },
};

// =============================================================================
// SDK Initialization
// =============================================================================

if (OTEL_ENABLED) {
  const resource = defaultResource().merge(resourceFromAttributes({
    [SEMRESATTRS_SERVICE_NAME]: SERVICE_NAME,
    [SEMRESATTRS_SERVICE_VERSION]: SERVICE_VERSION,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: DEPLOYMENT_ENV,
  }));

  // Parse headers for authentication (e.g., Grafana Cloud, New Relic)
  const headers: Record<string, string> = {};
  if (OTEL_HEADERS) {
    OTEL_HEADERS.split(',').forEach(header => {
      const [key, value] = header.split('=');
      if (key && value) {
        headers[key.trim()] = value.trim();
      }
    });
  }

  // Configure trace exporter
  const traceExporter = new OTLPTraceExporter({
    url: `${OTEL_ENDPOINT}/v1/traces`,
    headers,
  });

  // Configure metrics exporter
  const metricExporter = new OTLPMetricExporter({
    url: `${OTEL_ENDPOINT}/v1/metrics`,
    headers,
  });

  const metricReader = new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 30000, // Export metrics every 30 seconds
  });

  // Initialize the SDK
  const sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader,
    instrumentations: [
      getNodeAutoInstrumentations({
        // Customize instrumentation settings
        '@opentelemetry/instrumentation-express': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-http': {
          enabled: true,
        },
        '@opentelemetry/instrumentation-pg': {
          enabled: true,
          enhancedDatabaseReporting: true,
        },
        '@opentelemetry/instrumentation-ioredis': {
          enabled: true,
        },
        // Disable noisy/unnecessary instrumentations
        '@opentelemetry/instrumentation-fs': {
          enabled: false,
        },
        '@opentelemetry/instrumentation-dns': {
          enabled: false,
        },
      }),
    ],
  });

  // Start the SDK
  sdk.start();

  // Initialize custom metrics after SDK starts
  initializeCustomMetrics();

  console.log(`📊 OpenTelemetry initialized`);
  console.log(`   Service: ${SERVICE_NAME} v${SERVICE_VERSION}`);
  console.log(`   Environment: ${DEPLOYMENT_ENV}`);
  console.log(`   Exporting to: ${OTEL_ENDPOINT}`);
  if (Object.keys(headers).length > 0) {
    console.log(`   Auth headers configured: ${Object.keys(headers).join(', ')}`);
  }

  // Graceful shutdown
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('OpenTelemetry SDK shut down successfully'))
      .catch((error) => console.error('Error shutting down OpenTelemetry SDK', error))
      .finally(() => process.exit(0));
  });
} else {
  console.log('📊 OpenTelemetry disabled (OTEL_ENABLED=false)');
}

export {};



