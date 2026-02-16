/* eslint-disable no-console */
﻿import assert from 'node:assert/strict';

import { computeAdaptiveEstimate, estimateGenerationCostMicros } from '../server/services/pricingEstimator';

function usd(micros: number) {
  return Math.round(micros) / 1_000_000;
}

// 1) Fallback: no rows returns prior.
{
  const prior = estimateGenerationCostMicros({
    resolution: '2K',
    inputImagesCount: 1,
    promptChars: 100,
  });

  const out = computeAdaptiveEstimate({
    rows: [],
    priorMeanMicros: prior.estimatedCostMicros,
    priorStrength: 10,
    halfLifeDays: 7,
  });

  assert.equal(out.usedFallback, true);
  assert.equal(out.sampleCount, 0);
  assert.equal(out.estimatedCostMicros, prior.estimatedCostMicros);
}

// 2) With rows: mean should be between prior and observed.
{
  const prior = estimateGenerationCostMicros({
    resolution: '2K',
    inputImagesCount: 1,
    promptChars: 100,
  });

  const now = Date.now();
  const rows = [
    { estimatedCostMicros: prior.estimatedCostMicros + 50_000, createdAt: new Date(now - 1000 * 60 * 60) },
    { estimatedCostMicros: prior.estimatedCostMicros + 100_000, createdAt: new Date(now - 1000 * 60 * 60 * 24) },
  ];

  const out = computeAdaptiveEstimate({
    rows,
    priorMeanMicros: prior.estimatedCostMicros,
    priorStrength: 10,
    halfLifeDays: 7,
  });

  assert.equal(out.usedFallback, false);
  assert.equal(out.sampleCount, 2);
  assert.ok(out.estimatedCostMicros >= prior.estimatedCostMicros);
  assert.ok(out.p90Micros >= out.estimatedCostMicros);
  // sanity bounds
  assert.ok(usd(out.estimatedCostMicros) > 0);
}

console.log('OK: pricing estimator tests passed');
