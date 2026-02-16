/* eslint-disable no-console */
/**
 * Test script to verify Axiom integration
 * Run with: npx tsx test-axiom.ts
 */

// CRITICAL: Load .env BEFORE importing instrumentation
import dotenv from 'dotenv';
const result = dotenv.config();

if (result.error) {
  console.error('❌ Failed to load .env file:', result.error);
  process.exit(1);
}

console.log('✅ Loaded .env file');
console.log('   OTEL_ENDPOINT:', process.env.OTEL_EXPORTER_OTLP_ENDPOINT);
console.log('   OTEL_ENABLED:', process.env.OTEL_ENABLED);
console.log('');

// NOW import instrumentation (which reads the env vars)
import './server/instrumentation';
import { telemetry } from './server/instrumentation';

console.log('🧪 Testing Axiom integration...\n');

// Simulate some API activity
console.log('1. Tracking auth attempt...');
telemetry.trackAuth({
  action: 'login',
  success: true,
  userId: 'test-user-123',
});

console.log('2. Tracking Gemini API usage...');
telemetry.trackGeminiUsage({
  model: 'gemini-3-pro-image-preview',
  operation: 'generate',
  inputTokens: 100,
  outputTokens: 50,
  durationMs: 4200,
  userId: 'test-user-123',
  success: true,
});

console.log('3. Tracking error...');
telemetry.trackError({
  endpoint: '/api/test',
  errorType: 'test_error',
  statusCode: 500,
  userId: 'test-user-123',
});

console.log('\n✅ Test data sent!');
console.log('\nNow check your Axiom dashboard:');
console.log('1. Go to https://app.axiom.co');
console.log('2. Click on "automated-ads-agent" dataset');
console.log('3. You should see the test data within 30-60 seconds');
console.log('\nLook for metrics:');
console.log('  - auth.attempts.total (login attempt)');
console.log('  - gemini.cost.total (API cost tracking)');
console.log('  - api.errors.total (error tracking)');

// Wait a bit for metrics to export, then exit
setTimeout(() => {
  console.log('\n⏳ Waiting 5 seconds for metrics to export...');
  setTimeout(() => {
    console.log('✅ Done! Check Axiom now.');
    process.exit(0);
  }, 5000);
}, 1000);
