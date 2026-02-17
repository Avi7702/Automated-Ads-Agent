export type GenerationOperation = 'generate' | 'edit';
export type GenerationResolution = '1K' | '2K' | '4K';

export type CostEstimationSource = 'usageMetadata' | 'pricingFormula' | 'fallback';

export interface UsageMetadataLike {
  promptTokenCount?: number;
  candidatesTokenCount?: number;
  totalTokenCount?: number;
}

export interface GenerationCostInputs {
  resolution: GenerationResolution;
  inputImagesCount: number;
  promptChars: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  usageMetadata?: UsageMetadataLike | null;
}

export interface CostEstimateResult {
  estimatedCostMicros: number;
  estimationSource: CostEstimationSource;
  inputTokens: number | null;
  outputTokens: number | null;
}

// Baseline costs in USD (defaults; override via env if desired).
// Note: keep these conservative; the adaptive estimator will learn from history.
const BASELINE_USD_BY_RESOLUTION: Record<GenerationResolution, number> = {
  '1K': 0.13,
  '2K': 0.13,
  '4K': 0.24,
};

function usdToMicros(usd: number): number {
  return Math.max(0, Math.round(usd * 1_000_000));
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeResolution(input: unknown): GenerationResolution | null {
  if (input === '1K' || input === '2K' || input === '4K') return input;
  return null;
}

export function extractUsageMetadataTokens(usage?: UsageMetadataLike | null): {
  inputTokens: number | null;
  outputTokens: number | null;
} {
  if (!usage) return { inputTokens: null, outputTokens: null };

  const inputTokens = typeof usage.promptTokenCount === 'number' ? usage.promptTokenCount : null;
  const outputTokens = typeof usage.candidatesTokenCount === 'number' ? usage.candidatesTokenCount : null;

  return { inputTokens, outputTokens };
}

export function estimateGenerationCostMicros(inputs: GenerationCostInputs): CostEstimateResult {
  const baselineUsdEnvKey = `PRICING_BASELINE_USD_${inputs.resolution}`;
  const baselineUsd = process.env[baselineUsdEnvKey]
    ? Number(process.env[baselineUsdEnvKey])
    : BASELINE_USD_BY_RESOLUTION[inputs.resolution];

  const inputImagesCount = clampInt(inputs.inputImagesCount, 0, 6);
  const promptChars = clampInt(inputs.promptChars, 0, 20000);

  // Prefer real token counts from usageMetadata when available.
  const fromUsage = extractUsageMetadataTokens(inputs.usageMetadata ?? null);
  const inputTokens =
    typeof inputs.inputTokens === 'number' ? clampInt(inputs.inputTokens, 0, 10_000_000) : fromUsage.inputTokens;
  const outputTokens =
    typeof inputs.outputTokens === 'number' ? clampInt(inputs.outputTokens, 0, 10_000_000) : fromUsage.outputTokens;

  // Deterministic formula:
  // - Base image cost by resolution
  // - Slight uplift for multi-image compositions (more complex scenes)
  // - Optional token cost if PRICING_TOKEN_USD_PER_1K is provided (otherwise 0)
  const multiImageFactor = inputImagesCount <= 1 ? 1 : 1 + Math.min(0.25, 0.05 * (inputImagesCount - 1));

  const tokenUsdPer1k = process.env['PRICING_TOKEN_USD_PER_1K'] ? Number(process.env['PRICING_TOKEN_USD_PER_1K']) : 0;

  const inferredInputTokens = inputTokens ?? Math.round(promptChars / 4);
  const inferredOutputTokens = outputTokens ?? 0;

  const tokenUsd = tokenUsdPer1k > 0 ? ((inferredInputTokens + inferredOutputTokens) / 1000) * tokenUsdPer1k : 0;

  const estimatedCostMicros = usdToMicros(baselineUsd * multiImageFactor + tokenUsd);

  const estimationSource: CostEstimationSource =
    inputTokens !== null || outputTokens !== null ? 'usageMetadata' : 'pricingFormula';

  return {
    estimatedCostMicros,
    estimationSource,
    inputTokens,
    outputTokens,
  };
}

export interface UsageRowForEstimation {
  estimatedCostMicros: number;
  createdAt: Date;
}

export interface AdaptiveEstimateOutput {
  estimatedCostMicros: number;
  p50Micros: number;
  p90Micros: number;
  sampleCount: number;
  effectiveSampleCount: number;
  lastUpdatedAt: Date | null;
  usedFallback: boolean;
}

function weightedQuantile(values: { v: number; w: number }[], q: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a.v - b.v);
  const totalW = sorted.reduce((s, x) => s + x.w, 0);
  if (totalW <= 0) return sorted[Math.floor(sorted.length / 2)]!.v;

  let acc = 0;
  const target = q * totalW;
  for (const x of sorted) {
    acc += x.w;
    if (acc >= target) return x.v;
  }
  return sorted[sorted.length - 1]!.v;
}

export function computeAdaptiveEstimate(params: {
  rows: UsageRowForEstimation[];
  priorMeanMicros: number;
  priorStrength: number;
  halfLifeDays: number;
}): AdaptiveEstimateOutput {
  const { rows, priorMeanMicros, priorStrength, halfLifeDays } = params;
  const now = Date.now();

  if (!rows || rows.length === 0) {
    const mean = clampInt(priorMeanMicros, 0, 2_000_000_000);
    return {
      estimatedCostMicros: mean,
      p50Micros: mean,
      p90Micros: clampInt(mean * 1.25, 0, 2_000_000_000),
      sampleCount: 0,
      effectiveSampleCount: 0,
      lastUpdatedAt: null,
      usedFallback: true,
    };
  }

  const lambda = Math.log(2) / Math.max(1e-6, halfLifeDays); // per day
  const weighted = rows.map((r) => {
    const ageDays = Math.max(0, (now - r.createdAt.getTime()) / (1000 * 60 * 60 * 24));
    const w = Math.exp(-lambda * ageDays);
    return { v: clampInt(r.estimatedCostMicros, 0, 2_000_000_000), w, createdAt: r.createdAt.getTime() };
  });

  const sumW = weighted.reduce((s, x) => s + x.w, 0);
  const sumWV = weighted.reduce((s, x) => s + x.w * x.v, 0);
  const sumW2 = weighted.reduce((s, x) => s + x.w * x.w, 0);
  const effectiveSampleCount = sumW2 > 0 ? (sumW * sumW) / sumW2 : weighted.length;

  const posteriorMean = (priorStrength * priorMeanMicros + sumWV) / (priorStrength + sumW);

  const p50 = weightedQuantile(
    weighted.map((x) => ({ v: x.v, w: x.w })),
    0.5,
  );
  const p90 = weightedQuantile(
    weighted.map((x) => ({ v: x.v, w: x.w })),
    0.9,
  );

  const lastUpdatedAtMs = weighted.reduce((m, x) => Math.max(m, x.createdAt), 0);

  return {
    estimatedCostMicros: clampInt(posteriorMean, 0, 2_000_000_000),
    p50Micros: clampInt(p50, 0, 2_000_000_000),
    p90Micros: clampInt(Math.max(p90, posteriorMean), 0, 2_000_000_000),
    sampleCount: rows.length,
    effectiveSampleCount,
    lastUpdatedAt: lastUpdatedAtMs ? new Date(lastUpdatedAtMs) : null,
    usedFallback: false,
  };
}
