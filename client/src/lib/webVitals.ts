import type { Metric } from 'web-vitals';

/**
 * Report Web Vitals metrics.
 * In development: logs to console.
 * In production: could POST to an analytics endpoint.
 */
function sendToAnalytics(metric: Metric) {
  // Log in development for debugging
  if (import.meta.env.DEV) {
    console.log(`[Web Vital] ${metric.name}: ${metric.value.toFixed(1)}ms (${metric.rating})`);
    return;
  }

  // In production, you could send to an analytics endpoint:
  // navigator.sendBeacon('/api/analytics/vitals', JSON.stringify(metric));
}

/**
 * Initialize Web Vitals tracking.
 * Call this once from main.tsx.
 */
export async function initWebVitals() {
  try {
    const { onCLS, onINP, onLCP, onFCP, onTTFB } = await import('web-vitals');

    onCLS(sendToAnalytics);
    onINP(sendToAnalytics);
    onLCP(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
  } catch {
    // web-vitals not available (e.g., SSR or unsupported browser)
  }
}
