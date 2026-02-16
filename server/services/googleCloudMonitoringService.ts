/**
 * Google Cloud Monitoring Service
 *
 * Fetches real quota usage data from Google Cloud Monitoring API.
 * This provides accurate, Google-verified quota consumption data
 * with ~15 minute latency from Google's side.
 *
 * Prerequisites:
 * 1. Enable Cloud Monitoring API in Google Cloud Console
 * 2. Create a service account with "Monitoring Viewer" role
 * 3. Download the JSON key file
 * 4. Set GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS env vars
 *
 * @see https://cloud.google.com/monitoring/api/metrics
 * @see https://cloud.google.com/monitoring/alerts/using-quota-metrics
 */

import { SignJWT, importPKCS8 } from 'jose';
import { logger } from '../lib/logger';
import { storage } from '../storage';

// Types for Cloud Monitoring API responses
interface TimeSeriesPoint {
  interval: {
    startTime: string;
    endTime: string;
  };
  value: {
    int64Value?: string;
    doubleValue?: number;
  };
}

interface TimeSeries {
  metric: {
    type: string;
    labels: Record<string, string>;
  };
  resource: {
    type: string;
    labels: Record<string, string>;
  };
  points: TimeSeriesPoint[];
}

interface TimeSeriesListResponse {
  timeSeries?: TimeSeries[];
  nextPageToken?: string;
}

export interface GoogleQuotaSnapshot {
  syncedAt: Date;
  projectId: string;
  service: string;
  quotas: {
    metricName: string;
    displayName: string;
    usage: number;
    limit: number;
    percentage: number;
    unit: string;
  }[];
  syncStatus: 'success' | 'partial' | 'failed';
  errorMessage?: string;
  nextSyncAt: Date;
}

// Quota metrics we care about for Gemini API
const GEMINI_QUOTA_METRICS = [
  {
    metricType: 'serviceruntime.googleapis.com/quota/rate/net_usage',
    quotaMetric: 'generativelanguage.googleapis.com/generate_content_requests',
    displayName: 'Generate Content Requests',
    unit: 'requests',
  },
  {
    metricType: 'serviceruntime.googleapis.com/quota/allocation/usage',
    quotaMetric: 'generativelanguage.googleapis.com/generate_content_input_token_count',
    displayName: 'Input Tokens',
    unit: 'tokens',
  },
  {
    metricType: 'serviceruntime.googleapis.com/quota/allocation/usage',
    quotaMetric: 'generativelanguage.googleapis.com/generate_content_output_token_count',
    displayName: 'Output Tokens',
    unit: 'tokens',
  },
];

// Sync interval in milliseconds (15 minutes)
const SYNC_INTERVAL_MS = 15 * 60 * 1000;

// In-memory cache for last sync
let lastSyncResult: GoogleQuotaSnapshot | null = null;
let syncTimer: NodeJS.Timeout | null = null;

/**
 * Check if Google Cloud credentials are configured
 */
export function isGoogleCloudConfigured(): boolean {
  return !!(
    process.env.GOOGLE_CLOUD_PROJECT &&
    (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_CLOUD_CREDENTIALS_JSON)
  );
}

/**
 * Get the Google Cloud project ID
 */
function getProjectId(): string {
  const projectId = process.env.GOOGLE_CLOUD_PROJECT;
  if (!projectId) {
    throw new Error('GOOGLE_CLOUD_PROJECT environment variable is not set');
  }
  return projectId;
}

/**
 * Get an access token using Application Default Credentials
 * This works with:
 * - Service account JSON key file (GOOGLE_APPLICATION_CREDENTIALS)
 * - Inline JSON credentials (GOOGLE_CLOUD_CREDENTIALS_JSON)
 * - GCE metadata server (when running on Google Cloud)
 */
async function getAccessToken(): Promise<string> {
  // Try inline credentials first (for Railway/Render deployment)
  if (process.env.GOOGLE_CLOUD_CREDENTIALS_JSON) {
    try {
      const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS_JSON);
      return await getAccessTokenFromServiceAccount(credentials);
    } catch (error) {
      logger.error({ module: 'GoogleCloudMonitoring', err: error }, 'Failed to parse inline credentials');
    }
  }

  // Try Application Default Credentials
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      const fs = await import('fs');
      const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
      const credentialsJson = fs.readFileSync(credentialsPath, 'utf-8');
      const credentials = JSON.parse(credentialsJson);
      return await getAccessTokenFromServiceAccount(credentials);
    } catch (error) {
      logger.error({ module: 'GoogleCloudMonitoring', err: error }, 'Failed to load credentials file');
    }
  }

  // Try GCE metadata server (when running on Google Cloud)
  try {
    const response = await fetch(
      'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
      { headers: { 'Metadata-Flavor': 'Google' } },
    );
    if (response.ok) {
      const data = await response.json();
      return data.access_token;
    }
  } catch {
    // Not running on GCE, that's fine
  }

  throw new Error(
    'No Google Cloud credentials configured. Set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_CREDENTIALS_JSON',
  );
}

/**
 * Get access token from service account credentials using JWT (jose)
 */
async function getAccessTokenFromServiceAccount(credentials: {
  client_email: string;
  private_key: string;
  token_uri?: string;
}): Promise<string> {
  const audience = credentials.token_uri || 'https://oauth2.googleapis.com/token';

  const privateKeyObj = await importPKCS8(credentials.private_key, 'RS256');
  const token = await new SignJWT({
    iss: credentials.client_email,
    sub: credentials.client_email,
    aud: audience,
    scope: 'https://www.googleapis.com/auth/monitoring.read',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKeyObj);

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: token,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to get access token: ${error}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Query Cloud Monitoring API for time series data
 */
async function queryTimeSeries(
  projectId: string,
  filter: string,
  startTime: Date,
  endTime: Date,
): Promise<TimeSeries[]> {
  const accessToken = await getAccessToken();

  const params = new URLSearchParams({
    filter,
    'interval.startTime': startTime.toISOString(),
    'interval.endTime': endTime.toISOString(),
    'aggregation.alignmentPeriod': '60s',
    'aggregation.perSeriesAligner': 'ALIGN_RATE',
  });

  const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.text();
    logger.error({ module: 'GoogleCloudMonitoring', status: response.status, error }, 'API error');
    throw new Error(`Cloud Monitoring API error: ${response.status} ${response.statusText}`);
  }

  const data: TimeSeriesListResponse = await response.json();
  return data.timeSeries || [];
}

/**
 * Query quota limit from Cloud Monitoring
 */
async function queryQuotaLimit(projectId: string, quotaMetric: string): Promise<number | null> {
  const accessToken = await getAccessToken();

  const filter = `metric.type="serviceruntime.googleapis.com/quota/limit" AND resource.type="consumer_quota" AND resource.label.service="generativelanguage.googleapis.com" AND metric.label.quota_metric="${quotaMetric}"`;

  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

  const params = new URLSearchParams({
    filter,
    'interval.startTime': startTime.toISOString(),
    'interval.endTime': endTime.toISOString(),
  });

  const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    return null;
  }

  const data: TimeSeriesListResponse = await response.json();
  const series = data.timeSeries?.[0];
  const point = series?.points?.[0];

  if (point?.value?.int64Value) {
    return parseInt(point.value.int64Value, 10);
  }
  if (point?.value?.doubleValue !== undefined) {
    return point.value.doubleValue;
  }

  return null;
}

/**
 * Fetch all Gemini API quota metrics from Google Cloud Monitoring
 */
export async function fetchGoogleQuotaSnapshot(): Promise<GoogleQuotaSnapshot> {
  const syncedAt = new Date();
  const nextSyncAt = new Date(syncedAt.getTime() + SYNC_INTERVAL_MS);

  if (!isGoogleCloudConfigured()) {
    return {
      syncedAt,
      projectId: 'not-configured',
      service: 'generativelanguage.googleapis.com',
      quotas: [],
      syncStatus: 'failed',
      errorMessage:
        'Google Cloud credentials not configured. Set GOOGLE_CLOUD_PROJECT and GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_CREDENTIALS_JSON.',
      nextSyncAt,
    };
  }

  try {
    const projectId = getProjectId();
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - 60 * 60 * 1000); // Last hour

    const quotas: GoogleQuotaSnapshot['quotas'] = [];
    const errors: string[] = [];

    for (const metric of GEMINI_QUOTA_METRICS) {
      try {
        // Query usage
        const usageFilter = `metric.type="${metric.metricType}" AND resource.type="consumer_quota" AND resource.label.service="generativelanguage.googleapis.com" AND metric.label.quota_metric="${metric.quotaMetric}"`;

        const timeSeries = await queryTimeSeries(projectId, usageFilter, startTime, endTime);

        // Get the most recent value
        let usage = 0;
        if (timeSeries.length > 0 && timeSeries[0].points?.length > 0) {
          const point = timeSeries[0].points[0];
          usage = point.value.int64Value ? parseInt(point.value.int64Value, 10) : point.value.doubleValue || 0;
        }

        // Query limit
        const limit = (await queryQuotaLimit(projectId, metric.quotaMetric)) || 0;

        quotas.push({
          metricName: metric.quotaMetric,
          displayName: metric.displayName,
          usage,
          limit,
          percentage: limit > 0 ? (usage / limit) * 100 : 0,
          unit: metric.unit,
        });
      } catch (error: any) {
        logger.error(
          { module: 'GoogleCloudMonitoring', metric: metric.displayName, err: error },
          'Failed to fetch metric',
        );
        errors.push(`${metric.displayName}: ${error.message}`);
      }
    }

    const result: GoogleQuotaSnapshot = {
      syncedAt,
      projectId,
      service: 'generativelanguage.googleapis.com',
      quotas,
      syncStatus: errors.length === 0 ? 'success' : quotas.length > 0 ? 'partial' : 'failed',
      errorMessage: errors.length > 0 ? errors.join('; ') : undefined,
      nextSyncAt,
    };

    // Cache the result
    lastSyncResult = result;

    // Persist to database
    try {
      await storage.saveGoogleQuotaSnapshot({
        syncedAt: result.syncedAt,
        nextSyncAt: result.nextSyncAt,
        syncStatus: result.syncStatus,
        errorMessage: result.errorMessage || null,
        projectId: result.projectId,
        service: result.service,
        quotas: result.quotas,
        brandId: null, // Global snapshot
      });
    } catch (dbError) {
      logger.warn({ module: 'GoogleCloudMonitoring', err: dbError }, 'Failed to persist snapshot to database');
    }

    logger.info(
      { module: 'GoogleCloudMonitoring', metricCount: quotas.length, status: result.syncStatus },
      'Sync completed',
    );

    return result;
  } catch (error: any) {
    logger.error({ module: 'GoogleCloudMonitoring', err: error }, 'Sync failed');

    const result: GoogleQuotaSnapshot = {
      syncedAt,
      projectId: process.env.GOOGLE_CLOUD_PROJECT || 'unknown',
      service: 'generativelanguage.googleapis.com',
      quotas: [],
      syncStatus: 'failed',
      errorMessage: error.message,
      nextSyncAt,
    };

    lastSyncResult = result;
    return result;
  }
}

/**
 * Get the last sync result (from memory cache)
 */
export function getLastSyncResult(): GoogleQuotaSnapshot | null {
  return lastSyncResult;
}

/**
 * Get sync status information
 */
export function getSyncStatus(): {
  isConfigured: boolean;
  lastSyncedAt: Date | null;
  nextSyncAt: Date | null;
  syncIntervalMs: number;
  status: 'success' | 'partial' | 'failed' | 'never_synced';
  errorMessage?: string;
} {
  const isConfigured = isGoogleCloudConfigured();

  if (!lastSyncResult) {
    return {
      isConfigured,
      lastSyncedAt: null,
      nextSyncAt: isConfigured ? new Date(Date.now() + 1000) : null, // Sync soon if configured
      syncIntervalMs: SYNC_INTERVAL_MS,
      status: 'never_synced',
    };
  }

  return {
    isConfigured,
    lastSyncedAt: lastSyncResult.syncedAt,
    nextSyncAt: lastSyncResult.nextSyncAt,
    syncIntervalMs: SYNC_INTERVAL_MS,
    status: lastSyncResult.syncStatus,
    errorMessage: lastSyncResult.errorMessage,
  };
}

/**
 * Start the automatic sync timer
 */
export function startAutoSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
  }

  if (!isGoogleCloudConfigured()) {
    logger.info({ module: 'GoogleCloudMonitoring' }, 'Auto-sync disabled: Google Cloud credentials not configured');
    return;
  }

  logger.info({ module: 'GoogleCloudMonitoring', intervalMinutes: SYNC_INTERVAL_MS / 1000 / 60 }, 'Starting auto-sync');

  // Initial sync
  fetchGoogleQuotaSnapshot().catch((err) =>
    logger.error({ module: 'GoogleCloudMonitoring', err }, 'Initial sync failed'),
  );

  // Schedule recurring syncs
  syncTimer = setInterval(() => {
    fetchGoogleQuotaSnapshot().catch((err) =>
      logger.error({ module: 'GoogleCloudMonitoring', err }, 'Scheduled sync failed'),
    );
  }, SYNC_INTERVAL_MS);
}

/**
 * Stop the automatic sync timer
 */
export function stopAutoSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
    logger.info({ module: 'GoogleCloudMonitoring' }, 'Auto-sync stopped');
  }
}

/**
 * Trigger a manual sync
 */
export async function triggerManualSync(): Promise<GoogleQuotaSnapshot> {
  logger.info({ module: 'GoogleCloudMonitoring' }, 'Manual sync triggered');
  return fetchGoogleQuotaSnapshot();
}

export const googleCloudMonitoringService = {
  isConfigured: isGoogleCloudConfigured,
  fetchSnapshot: fetchGoogleQuotaSnapshot,
  getLastSync: getLastSyncResult,
  getSyncStatus,
  startAutoSync,
  stopAutoSync,
  triggerManualSync,
};
