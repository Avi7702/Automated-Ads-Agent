// @ts-nocheck
/**
 * Critic Stage — Auto-Quality Evaluation
 *
 * Evaluates a generated ad image against the original prompt, brand guidelines,
 * and product requirements. If quality is below threshold, returns a revised
 * prompt for re-generation.
 *
 * Inspired by PaperBanana's Critic Agent pattern (iterative refinement).
 * Runs silently — user never sees the critique, just gets a better image.
 */

import { logger } from '../../lib/logger';
import type { GenerationContext } from '../../types/generationPipeline';
import type { CritiqueResult } from '../../types/generationPipeline';

/** Minimum score (0-100) to pass without retry */
const QUALITY_THRESHOLD = 60;

/** Maximum retry attempts */
const MAX_RETRIES = 2;

/**
 * Evaluate a generated image and decide if it needs re-generation.
 *
 * Sends the generated image + original prompt to a VLM for evaluation.
 * Returns a CritiqueResult with pass/fail, score, and optional revised prompt.
 */
export async function evaluateGeneration(ctx: GenerationContext, geminiClient: any): Promise<CritiqueResult> {
  if (!ctx.result?.imageBase64) {
    return defaultPass();
  }

  const critiquePrompt = buildCritiquePrompt(ctx);

  try {
    const result = await geminiClient.models.generateContent({
      model: 'gemini-3-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                mimeType: ctx.result.mimeType || 'image/png',
                data: ctx.result.imageBase64,
              },
            },
            { text: critiquePrompt },
          ],
        },
      ],
      config: {
        responseMimeType: 'application/json',
      },
    });

    const responseText = result.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      logger.warn({ module: 'CriticStage' }, 'No critique response — passing by default');
      return defaultPass();
    }

    return parseCritiqueResponse(responseText);
  } catch (err) {
    logger.warn({ module: 'CriticStage', err }, 'Critique evaluation failed — passing by default');
    return defaultPass();
  }
}

/**
 * Run the full critic loop: evaluate, optionally re-generate, up to MAX_RETRIES.
 *
 * Returns the final generation result (either the original or an improved one).
 */
export async function runCriticLoop(
  ctx: GenerationContext,
  geminiClient: any,
  regenerateFn: (revisedPrompt: string) => Promise<typeof ctx.result>,
): Promise<{ retriesUsed: number; finalCritique: CritiqueResult }> {
  let retriesUsed = 0;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const critique = await evaluateGeneration(ctx, geminiClient);

    logger.info(
      {
        module: 'CriticStage',
        attempt: attempt + 1,
        score: critique.score,
        passed: critique.passed,
        issues: critique.issues,
      },
      'Critique evaluation result',
    );

    if (critique.passed) {
      return { retriesUsed, finalCritique: critique };
    }

    // Needs improvement — try to re-generate with revised prompt
    if (!critique.revisedPrompt) {
      // No revision suggestion — accept as-is
      logger.info({ module: 'CriticStage' }, 'Failed critique but no revision suggested — accepting');
      return { retriesUsed, finalCritique: critique };
    }

    logger.info({ module: 'CriticStage', attempt: attempt + 1 }, 'Re-generating with revised prompt');

    try {
      const newResult = await regenerateFn(critique.revisedPrompt);
      ctx.result = newResult;
      retriesUsed++;
    } catch (err) {
      logger.warn({ module: 'CriticStage', err }, 'Re-generation failed — keeping current result');
      return { retriesUsed, finalCritique: critique };
    }
  }

  // Exhausted retries — do a final evaluation for logging
  const finalCritique = await evaluateGeneration(ctx, geminiClient);
  return { retriesUsed, finalCritique };
}

// ============================================
// PROMPT CONSTRUCTION
// ============================================

function buildCritiquePrompt(ctx: GenerationContext): string {
  const userPrompt = ctx.input.prompt;
  const brandName = ctx.brand?.name || 'Unknown';
  const brandColors = ctx.brand?.colors?.join(', ') || 'not specified';
  const productName = ctx.product?.primaryName || 'the product';
  const hasProductImages = ctx.input.images.length > 0;

  return `You are an advertising quality evaluator. Analyze this generated ad image and evaluate it against the original requirements.

ORIGINAL PROMPT: "${userPrompt}"

CONTEXT:
- Brand: ${brandName}
- Brand Colors: ${brandColors}
- Product: ${productName}
- Product photos were provided: ${hasProductImages ? 'YES — product should be clearly visible' : 'NO — product was described in text only'}

Evaluate the image on these 4 criteria:
1. PRODUCT VISIBLE: Is the product/subject clearly visible and recognizable? (true/false)
2. BRAND CONSISTENT: Does the image align with the brand colors and style? (true/false)
3. COMPOSITION GOOD: Is the composition professional and balanced? (true/false)
4. PROMPT FAITHFUL: Does the image match what was requested in the prompt? (true/false)

Give an overall quality score from 0-100 where:
- 80-100: Excellent, ready to publish
- 60-79: Acceptable
- 40-59: Needs improvement
- 0-39: Poor, should be regenerated

If the score is below ${QUALITY_THRESHOLD}, provide a REVISED version of the original prompt that would fix the issues.

Respond in this exact JSON format:
{
  "score": <number 0-100>,
  "product_visible": <boolean>,
  "brand_consistent": <boolean>,
  "composition_good": <boolean>,
  "prompt_faithful": <boolean>,
  "issues": [<string list of specific issues found, empty if none>],
  "revised_prompt": <string or null — only if score < ${QUALITY_THRESHOLD}>
}`;
}

// ============================================
// RESPONSE PARSING
// ============================================

function parseCritiqueResponse(responseText: string): CritiqueResult {
  try {
    // Try to extract JSON from the response
    let jsonStr = responseText.trim();

    // Handle markdown code blocks
    if (jsonStr.startsWith('```')) {
      const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (match) jsonStr = match[1].trim();
    }

    const data = JSON.parse(jsonStr);

    // If score is missing or invalid, default to passing (don't block generation)
    const rawScore = typeof data.score === 'number' ? data.score : null;
    if (rawScore === null) {
      logger.warn({ module: 'CriticStage' }, 'Critique response missing score — passing by default');
      return defaultPass();
    }
    const score = Math.min(100, Math.max(0, rawScore));

    return {
      passed: score >= QUALITY_THRESHOLD,
      score,
      checks: {
        productVisible: data.product_visible !== false,
        brandConsistent: data.brand_consistent !== false,
        compositionGood: data.composition_good !== false,
        promptFaithful: data.prompt_faithful !== false,
      },
      issues: Array.isArray(data.issues) ? data.issues.slice(0, 5) : [],
      revisedPrompt: typeof data.revised_prompt === 'string' ? data.revised_prompt : undefined,
    };
  } catch (err) {
    logger.warn({ module: 'CriticStage', err }, 'Failed to parse critique response');
    return defaultPass();
  }
}

function defaultPass(): CritiqueResult {
  return {
    passed: true,
    score: 75,
    checks: {
      productVisible: true,
      brandConsistent: true,
      compositionGood: true,
      promptFaithful: true,
    },
    issues: [],
  };
}

export { QUALITY_THRESHOLD, MAX_RETRIES };
