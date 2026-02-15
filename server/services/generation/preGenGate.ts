// @ts-nocheck
/**
 * Pre-Generation Quality Gate
 *
 * Evaluates prompt + context completeness BEFORE expensive image generation.
 * Uses gemini-3-flash for fast, cheap evaluation.
 *
 * Score 0-100:
 *   - < 40: BLOCKS generation (returns error with suggestions)
 *   - 40-60: WARNS (proceeds but includes improvement suggestions in result)
 *   - > 60: PASSES (full speed ahead)
 *
 * This gate prevents wasting expensive Gemini image generation tokens on
 * under-specified or ambiguous prompts.
 */

import { logger } from '../../lib/logger';
import { genAI } from '../../lib/gemini';

// ============================================
// TYPES
// ============================================

export interface PreGenGateResult {
  /** Overall readiness score 0-100 */
  score: number;
  /** Whether the request passes the gate (score >= 40) */
  pass: boolean;
  /** Human-readable suggestions for improving the request */
  suggestions: string[];
  /** Score breakdown by category */
  breakdown: {
    promptSpecificity: number; // 0-25: How specific/clear is the prompt?
    contextCompleteness: number; // 0-25: How much context is available?
    imageQuality: number; // 0-25: Are images provided and sufficient?
    consistency: number; // 0-25: Do prompt + mode + template align?
  };
}

export interface PreGenGateInput {
  prompt: string;
  hasImages: boolean;
  imageCount: number;
  hasTemplate: boolean;
  hasBrandContext: boolean;
  hasRecipe: boolean;
  mode: string;
}

// ============================================
// THRESHOLDS
// ============================================

/** Requests below this score are BLOCKED */
const BLOCK_THRESHOLD = 40;

/** Requests below this score get WARNINGS */
const WARN_THRESHOLD = 60;

// ============================================
// MAIN GATE FUNCTION
// ============================================

/**
 * Evaluate the readiness of a generation request.
 *
 * Uses a two-tier approach:
 * 1. Heuristic pre-check (instant, free) — catches obvious issues
 * 2. LLM evaluation (fast, cheap via gemini-3-flash) — catches subtle issues
 *
 * If the heuristic score is very high (>= 75), skips the LLM call entirely.
 */
export async function evaluatePreGenGate(input: PreGenGateInput): Promise<PreGenGateResult> {
  // Tier 1: Heuristic pre-check (free, instant)
  const heuristicResult = evaluateHeuristic(input);

  // If heuristic score is very high, skip the LLM call
  if (heuristicResult.score >= 75) {
    logger.info(
      {
        module: 'PreGenGate',
        score: heuristicResult.score,
        tier: 'heuristic-only',
      },
      'Pre-gen gate passed via heuristic (skipping LLM)',
    );
    return heuristicResult;
  }

  // Tier 2: LLM-based evaluation (cheap via gemini-3-flash)
  try {
    const llmResult = await evaluateWithLLM(input);

    // Blend scores: 40% heuristic + 60% LLM (LLM is more nuanced)
    const blendedScore = Math.round(heuristicResult.score * 0.4 + llmResult.score * 0.6);
    const allSuggestions = [...new Set([...heuristicResult.suggestions, ...llmResult.suggestions])];

    const result: PreGenGateResult = {
      score: blendedScore,
      pass: blendedScore >= BLOCK_THRESHOLD,
      suggestions: allSuggestions.slice(0, 5),
      breakdown: {
        promptSpecificity: Math.round(
          heuristicResult.breakdown.promptSpecificity * 0.4 + llmResult.breakdown.promptSpecificity * 0.6,
        ),
        contextCompleteness: Math.round(
          heuristicResult.breakdown.contextCompleteness * 0.4 + llmResult.breakdown.contextCompleteness * 0.6,
        ),
        imageQuality: Math.round(heuristicResult.breakdown.imageQuality * 0.4 + llmResult.breakdown.imageQuality * 0.6),
        consistency: Math.round(heuristicResult.breakdown.consistency * 0.4 + llmResult.breakdown.consistency * 0.6),
      },
    };

    logger.info(
      {
        module: 'PreGenGate',
        score: result.score,
        pass: result.pass,
        tier: 'heuristic+llm',
        heuristicScore: heuristicResult.score,
        llmScore: llmResult.score,
      },
      'Pre-gen gate evaluation complete',
    );

    return result;
  } catch (err) {
    // If LLM evaluation fails, fall back to heuristic only
    logger.warn({ module: 'PreGenGate', err }, 'LLM evaluation failed — using heuristic only');
    return heuristicResult;
  }
}

// ============================================
// TIER 1: HEURISTIC EVALUATION (instant, free)
// ============================================

function evaluateHeuristic(input: PreGenGateInput): PreGenGateResult {
  const suggestions: string[] = [];
  let promptSpecificity = 0;
  let contextCompleteness = 0;
  let imageQuality = 0;
  let consistency = 0;

  // --- Prompt Specificity (0-25) ---
  const promptLength = input.prompt.trim().length;
  if (promptLength === 0) {
    promptSpecificity = 0;
    suggestions.push('Prompt is empty. Describe the image you want to generate.');
  } else if (promptLength < 20) {
    promptSpecificity = 5;
    suggestions.push('Prompt is very short. Add more details about the desired scene, style, and composition.');
  } else if (promptLength < 50) {
    promptSpecificity = 12;
    suggestions.push('Consider adding more detail to your prompt (lighting, environment, mood).');
  } else if (promptLength < 150) {
    promptSpecificity = 18;
  } else {
    promptSpecificity = 25;
  }

  // Bonus: Check for descriptive keywords
  const descriptiveKeywords = [
    'lighting',
    'background',
    'color',
    'style',
    'professional',
    'product',
    'scene',
    'mood',
    'angle',
    'perspective',
    'composition',
    'quality',
  ];
  const keywordMatches = descriptiveKeywords.filter((kw) => input.prompt.toLowerCase().includes(kw)).length;
  if (keywordMatches >= 3 && promptSpecificity < 25) {
    promptSpecificity = Math.min(25, promptSpecificity + 5);
  }

  // --- Context Completeness (0-25) ---
  if (input.hasBrandContext) contextCompleteness += 10;
  if (input.hasRecipe) contextCompleteness += 8;
  if (input.hasTemplate) contextCompleteness += 7;

  if (!input.hasBrandContext && !input.hasRecipe && !input.hasTemplate) {
    contextCompleteness = 5; // Baseline — prompt alone is valid
    if (promptLength > 100) contextCompleteness = 10; // Long prompt compensates
  }

  // --- Image Quality (0-25) ---
  if (input.mode === 'exact_insert' || input.mode === 'inspiration') {
    // Template modes benefit from product images
    if (input.hasImages) {
      imageQuality = input.imageCount >= 2 ? 25 : 20;
    } else {
      imageQuality = 10;
      if (input.mode === 'exact_insert') {
        suggestions.push('Exact insert mode works best with product photos. Consider uploading product images.');
      }
    }
  } else {
    // Standard mode
    if (input.hasImages) {
      imageQuality = input.imageCount >= 2 ? 25 : 22;
    } else {
      // Text-only generation — valid but limited
      imageQuality = 15;
    }
  }

  // --- Consistency (0-25) ---
  // Check mode + template alignment
  if (input.mode === 'exact_insert' || input.mode === 'inspiration') {
    if (input.hasTemplate) {
      consistency = 25;
    } else {
      consistency = 5;
      suggestions.push(`${input.mode} mode requires a template. Select a template for best results.`);
    }
  } else {
    // Standard mode — always consistent
    consistency = 25;
  }

  const score = promptSpecificity + contextCompleteness + imageQuality + consistency;

  return {
    score,
    pass: score >= BLOCK_THRESHOLD,
    suggestions,
    breakdown: {
      promptSpecificity,
      contextCompleteness,
      imageQuality,
      consistency,
    },
  };
}

// ============================================
// TIER 2: LLM EVALUATION (fast, cheap)
// ============================================

async function evaluateWithLLM(input: PreGenGateInput): Promise<PreGenGateResult> {
  const evaluationPrompt = buildEvaluationPrompt(input);

  const result = await genAI.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: [{ role: 'user', parts: [{ text: evaluationPrompt }] }],
    config: {
      responseMimeType: 'application/json',
    },
  });

  const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!responseText) {
    throw new Error('No response from LLM evaluation');
  }

  return parseLLMResponse(responseText);
}

function buildEvaluationPrompt(input: PreGenGateInput): string {
  return `You are an advertising image generation quality gate. Evaluate whether this generation request has enough information to produce a good result.

REQUEST DETAILS:
- Prompt: "${input.prompt}"
- Mode: ${input.mode}
- Product images provided: ${input.hasImages ? `YES (${input.imageCount} image${input.imageCount > 1 ? 's' : ''})` : 'NO'}
- Template selected: ${input.hasTemplate ? 'YES' : 'NO'}
- Brand context available: ${input.hasBrandContext ? 'YES' : 'NO'}
- Recipe/product context: ${input.hasRecipe ? 'YES' : 'NO'}

Score each category 0-25:
1. PROMPT_SPECIFICITY: Is the prompt clear, specific, and actionable? Does it describe what the image should look like?
2. CONTEXT_COMPLETENESS: Is there enough context (brand, product, template) to generate a quality result?
3. IMAGE_QUALITY: Are the right images provided for this mode? (exact_insert needs product photos, standard can be text-only)
4. CONSISTENCY: Do the mode, template, and prompt align logically?

Respond in this exact JSON format:
{
  "prompt_specificity": <0-25>,
  "context_completeness": <0-25>,
  "image_quality": <0-25>,
  "consistency": <0-25>,
  "suggestions": [<up to 3 short, actionable suggestions for improvement>]
}`;
}

function parseLLMResponse(responseText: string): PreGenGateResult {
  let jsonStr = responseText.trim();

  // Handle markdown code blocks
  if (jsonStr.startsWith('```')) {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) jsonStr = match[1].trim();
  }

  const data = JSON.parse(jsonStr);

  const clamp = (v: unknown, max: number): number => {
    const n = typeof v === 'number' ? v : 0;
    return Math.min(max, Math.max(0, n));
  };

  const promptSpecificity = clamp(data.prompt_specificity, 25);
  const contextCompleteness = clamp(data.context_completeness, 25);
  const imageQuality = clamp(data.image_quality, 25);
  const consistency = clamp(data.consistency, 25);
  const score = promptSpecificity + contextCompleteness + imageQuality + consistency;

  const suggestions = Array.isArray(data.suggestions)
    ? data.suggestions.filter((s: unknown) => typeof s === 'string').slice(0, 5)
    : [];

  return {
    score,
    pass: score >= BLOCK_THRESHOLD,
    suggestions,
    breakdown: {
      promptSpecificity,
      contextCompleteness,
      imageQuality,
      consistency,
    },
  };
}

// Export thresholds for use in pipeline
export { BLOCK_THRESHOLD, WARN_THRESHOLD };
