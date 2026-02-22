// @ts-nocheck
/**
 * Agent Orchestrator Service
 *
 * Three-stage pipeline for the Agent Mode:
 *   Stage 1 — Idea Bank Base (factual): pull pipeline state, generate suggestion cards
 *   Stage 2 — Creative Layer: build Plan Brief from suggestion + clarifying answers
 *   Stage 3 — Approval Optimizer: score the plan and return repair suggestions
 *
 * Deterministic fallback when LLM is unavailable.
 * 30-product journey rule: connected series, not single giant carousel.
 *
 * All plans and executions are DB-persisted and user-scoped.
 */

import { randomUUID } from 'crypto';
import { logger } from '../../lib/logger';
import { generateContentWithRetry } from '../../lib/geminiClient';
import { sanitizeForPrompt } from '../../lib/promptSanitizer';
import type { IStorage } from '../../storage';
import type {
  AgentSuggestion,
  ClarifyingQuestion,
  PlanBrief,
  PlanPost,
  ExecutionStep,
} from '../../../shared/types/agentPlan';

// Phase 3: Real service integrations for plan execution
import { geminiService } from '../geminiService';
import { saveGeneratedImage } from '../../fileStorage';
import { copywritingService } from '../copywritingService';
import { addToQueue } from '../approvalQueueService';

// Model — same as ideaBankService
const REASONING_MODEL = process.env['GEMINI_REASONING_MODEL'] || 'gemini-3-flash-preview';

// Platform character limits (same source-of-truth as copywritingService)
const PLATFORM_LIMITS: Record<string, number> = {
  instagram: 2200,
  linkedin: 3000,
  twitter: 280,
  facebook: 63206,
  tiktok: 2200,
};

// ---------------------------------------------------------------------------
// Stage 1 — Idea Bank Base (Factual Suggestions)
// ---------------------------------------------------------------------------

export async function generateSuggestions(
  storage: IStorage,
  userId: string,
  productIds: string[],
  limit: number,
): Promise<AgentSuggestion[]> {
  // Pull pipeline state
  const products = productIds.length > 0 ? await storage.getProductsByIds(productIds) : await storage.getProducts(30);

  if (products.length === 0) {
    return buildFallbackSuggestions([], limit);
  }

  const relationships = await storage.getProductRelationships(products.map((p) => String(p.id)));

  // Build LLM prompt
  const productDescriptions = products
    .map((p) => {
      const desc = p.description ? sanitizeForPrompt(p.description).slice(0, 200) : 'No description';
      return `- ID:${p.id} "${sanitizeForPrompt(p.name)}": ${desc}`;
    })
    .join('\n');

  const relSummary =
    relationships.length > 0
      ? `\nProduct relationships:\n${relationships.map((r) => `  ${r.productIdA} <-> ${r.productIdB} (${r.relationshipType})`).join('\n')}`
      : '';

  const prompt = `You are an advertising strategist. Given these products, generate ${limit} content suggestions.

Products:
${productDescriptions}
${relSummary}

RULES:
1. Each suggestion is one of: content_series, single_post, campaign, gap_fill
2. For many products, create connected series (e.g. 6 posts x 5 products) — NEVER a single giant carousel
3. Include confidence 0-100 and reasoning
4. Never fabricate product claims — only use actual product data above
5. Respect platform character limits: ${JSON.stringify(PLATFORM_LIMITS)}

Return ONLY a JSON array of objects with this exact shape:
[{
  "type": "content_series" | "single_post" | "campaign" | "gap_fill",
  "title": "string",
  "description": "string",
  "productIds": [number],
  "platform": "instagram" | "linkedin" | "twitter" | "facebook" | "tiktok",
  "confidence": number,
  "reasoning": "string",
  "tags": ["string"]
}]

Return exactly ${limit} items. JSON only, no markdown fences.`;

  try {
    const response = await generateContentWithRetry(
      {
        model: REASONING_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.7, maxOutputTokens: 4000 },
      },
      { operation: 'agent_suggestions' },
    );

    const text = (response.text || '').trim();
    const parsed = parseJsonArray(text);
    if (!parsed || parsed.length === 0) {
      logger.warn({ module: 'AgentOrchestrator' }, 'LLM returned unparseable suggestions, using fallback');
      return buildFallbackSuggestions(products, limit);
    }

    const productMap = new Map(products.map((p) => [Number(p.id), p]));

    return parsed.slice(0, limit).map((item: any) => ({
      id: randomUUID(),
      type: item.type || 'single_post',
      title: String(item.title || 'Untitled'),
      description: String(item.description || ''),
      products: (item.productIds || [])
        .map((pid: number) => productMap.get(pid))
        .filter(Boolean)
        .map((p: any) => ({ id: Number(p.id), name: p.name })),
      platform: String(item.platform || 'instagram'),
      confidence: Math.max(0, Math.min(100, Number(item.confidence) || 50)),
      reasoning: String(item.reasoning || ''),
      tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    }));
  } catch (err) {
    logger.error({ module: 'AgentOrchestrator', err }, 'LLM suggestion generation failed, using fallback');
    return buildFallbackSuggestions(products, limit);
  }
}

// ---------------------------------------------------------------------------
// Stage 2 — Creative Layer (Plan Brief)
// ---------------------------------------------------------------------------

export async function buildPlanPreview(
  storage: IStorage,
  userId: string,
  suggestionId: string,
  answers: Record<string, string>,
): Promise<{ plan: PlanBrief; questions?: ClarifyingQuestion[] }> {
  // Build prompt from answers
  const answerBlock = Object.entries(answers)
    .map(([k, v]) => `${k}: ${sanitizeForPrompt(v)}`)
    .join('\n');

  const prompt = `You are an advertising campaign planner.

User selected suggestion "${suggestionId}" and provided these clarifications:
${answerBlock || '(no clarifications)'}

Create a detailed plan brief. Return ONLY JSON with this exact shape:
{
  "objective": "string (campaign objective)",
  "cadence": "string (e.g. 3 posts/week for 2 weeks)",
  "platform": "instagram | linkedin | twitter | facebook | tiktok",
  "contentMix": [{"type": "string", "count": number}],
  "posts": [{
    "index": number,
    "productIds": [number],
    "prompt": "string (generation prompt for this post)",
    "platform": "string",
    "contentType": "image | carousel | video",
    "hookAngle": "string (the creative hook)"
  }],
  "questions": [{
    "id": "string",
    "question": "string",
    "type": "select | text | multiselect",
    "options": ["string"] | null,
    "required": boolean
  }] | null
}

If you need more info from the user, include "questions". Otherwise set it to null.
Limit posts to 12 maximum. JSON only, no markdown fences.`;

  try {
    const response = await generateContentWithRetry(
      {
        model: REASONING_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.6, maxOutputTokens: 6000 },
      },
      { operation: 'agent_plan_preview' },
    );

    const text = (response.text || '').trim();
    const parsed = parseJsonObject(text);

    if (!parsed) {
      const fallback = buildFallbackPlanData(suggestionId);
      const dbPlan = await storage.createAgentPlan({
        userId,
        suggestionId,
        ...fallback,
        status: 'draft',
        revisionCount: 0,
      });
      return { plan: dbPlanToBrief(dbPlan) };
    }

    // Stage 3 scoring inline (Phase 4: LLM-based with heuristic fallback)
    const score = await scorePlan(parsed, storage, userId);

    const contentMix = Array.isArray(parsed.contentMix)
      ? parsed.contentMix.map((m: any) => ({ type: String(m.type), count: Number(m.count) || 1 }))
      : [{ type: 'image', count: 3 }];

    const posts = Array.isArray(parsed.posts)
      ? parsed.posts.slice(0, 12).map((p: any, i: number) => ({
          index: i,
          productIds: Array.isArray(p.productIds) ? p.productIds.map(Number) : [],
          prompt: String(p.prompt || ''),
          platform: String(p.platform || parsed.platform || 'instagram'),
          contentType: p.contentType || 'image',
          hookAngle: String(p.hookAngle || ''),
        }))
      : [];

    // Persist to DB
    const dbPlan = await storage.createAgentPlan({
      userId,
      suggestionId,
      objective: String(parsed.objective || 'Brand awareness'),
      cadence: String(parsed.cadence || '3 posts/week'),
      platform: String(parsed.platform || 'instagram'),
      contentMix,
      approvalScore: score.total,
      scoreBreakdown: score.breakdown,
      estimatedCost: estimateCost(parsed.posts),
      posts,
      status: 'draft',
      revisionCount: 0,
    });

    const plan = dbPlanToBrief(dbPlan);

    const questions: ClarifyingQuestion[] | undefined = Array.isArray(parsed.questions)
      ? parsed.questions.map((q: any) => ({
          id: q.id || randomUUID(),
          question: String(q.question),
          type: q.type || 'text',
          options: Array.isArray(q.options) ? q.options.map(String) : undefined,
          required: Boolean(q.required),
        }))
      : undefined;

    return { plan, questions };
  } catch (err) {
    logger.error({ module: 'AgentOrchestrator', err }, 'LLM plan preview failed, using fallback');
    const fallback = buildFallbackPlanData(suggestionId);
    const dbPlan = await storage.createAgentPlan({
      userId,
      suggestionId,
      ...fallback,
      status: 'draft',
      revisionCount: 0,
    });
    return { plan: dbPlanToBrief(dbPlan) };
  }
}

// ---------------------------------------------------------------------------
// Plan Execution (idempotent, DB-persisted)
// ---------------------------------------------------------------------------

export async function executePlan(
  storage: IStorage,
  userId: string,
  planId: string,
  idempotencyKey: string,
): Promise<{ executionId: string; status: 'queued' | 'running'; steps: ExecutionStep[] }> {
  // Idempotency check via DB
  const existing = await storage.getAgentExecutionByIdempotencyKey(planId, idempotencyKey);
  if (existing) {
    return {
      executionId: existing.id,
      status: existing.status === 'running' ? 'running' : 'queued',
      steps: existing.steps as ExecutionStep[],
    };
  }

  // Load plan from DB and verify ownership
  const plan = await storage.getAgentPlanById(planId);
  if (!plan || plan.userId !== userId) {
    throw new PlanNotFoundError(planId);
  }

  const posts = plan.posts as PlanPost[];
  const steps: ExecutionStep[] = posts.map((post, i) => ({
    index: i,
    action: `Generate ${post.contentType} for post #${i + 1}: ${post.hookAngle || 'creative'}`,
    status: 'pending' as const,
  }));

  // Create execution record in DB
  const execution = await storage.createAgentExecution({
    planId,
    userId,
    idempotencyKey,
    status: 'queued',
    steps,
  });

  // Mark plan as approved
  await storage.updateAgentPlan(planId, { status: 'approved' });

  // Fire-and-forget: run steps asynchronously (no await)
  runExecutionSteps(storage, execution.id, planId, userId).catch((err) => {
    logger.error({ module: 'AgentOrchestrator', err, executionId: execution.id }, 'Execution failed');
  });

  return { executionId: execution.id, status: 'queued', steps };
}

// ---------------------------------------------------------------------------
// Plan Revision (DB-persisted)
// ---------------------------------------------------------------------------

export async function revisePlan(
  storage: IStorage,
  userId: string,
  planId: string,
  feedback: string,
): Promise<PlanBrief> {
  const existingDb = await storage.getAgentPlanById(planId);
  if (!existingDb || existingDb.userId !== userId) {
    throw new PlanNotFoundError(planId);
  }

  // Convert DB record to PlanBrief shape for the LLM prompt
  const existing = dbPlanToBrief(existingDb);

  const prompt = `You are an advertising campaign planner. Here is the current plan:
${JSON.stringify(existing, null, 2)}

The user wants to revise this plan with the following feedback:
"${sanitizeForPrompt(feedback)}"

Return the REVISED plan as JSON with the same shape. Keep unchanged fields the same.
Only modify what the feedback requests. JSON only, no markdown fences.

Shape:
{
  "objective": "string",
  "cadence": "string",
  "platform": "string",
  "contentMix": [{"type": "string", "count": number}],
  "posts": [{
    "index": number,
    "productIds": [number],
    "prompt": "string",
    "platform": "string",
    "contentType": "image | carousel | video",
    "hookAngle": "string"
  }]
}`;

  try {
    const response = await generateContentWithRetry(
      {
        model: REASONING_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.5, maxOutputTokens: 6000 },
      },
      { operation: 'agent_plan_revise' },
    );

    const text = (response.text || '').trim();
    const parsed = parseJsonObject(text);

    if (!parsed) {
      // Return existing plan unchanged if parse fails
      return existing;
    }

    const score = await scorePlan(parsed, storage, userId);

    const updatedPlan = await storage.updateAgentPlan(planId, {
      objective: String(parsed.objective || existing.objective),
      cadence: String(parsed.cadence || existing.cadence),
      platform: String(parsed.platform || existing.platform),
      contentMix: Array.isArray(parsed.contentMix)
        ? parsed.contentMix.map((m: any) => ({ type: String(m.type), count: Number(m.count) || 1 }))
        : existingDb.contentMix,
      approvalScore: score.total,
      scoreBreakdown: score.breakdown,
      estimatedCost: estimateCost(parsed.posts || existing.posts),
      posts: Array.isArray(parsed.posts)
        ? parsed.posts.slice(0, 12).map((p: any, i: number) => ({
            index: i,
            productIds: Array.isArray(p.productIds) ? p.productIds.map(Number) : [],
            prompt: String(p.prompt || ''),
            platform: String(p.platform || parsed.platform || existing.platform),
            contentType: p.contentType || 'image',
            hookAngle: String(p.hookAngle || ''),
          }))
        : existingDb.posts,
      revisionCount: (existingDb.revisionCount ?? 0) + 1,
    });

    return dbPlanToBrief(updatedPlan);
  } catch (err) {
    logger.error({ module: 'AgentOrchestrator', err }, 'LLM plan revision failed');
    return existing;
  }
}

// ---------------------------------------------------------------------------
// Get Plan / Get Execution (user-scoped DB reads)
// ---------------------------------------------------------------------------

export async function getPlan(storage: IStorage, planId: string, userId: string): Promise<PlanBrief | undefined> {
  const plan = await storage.getAgentPlanById(planId);
  if (!plan || plan.userId !== userId) return undefined;
  return dbPlanToBrief(plan);
}

export async function getExecution(
  storage: IStorage,
  executionId: string,
  userId: string,
): Promise<
  | {
      executionId: string;
      status: string;
      steps: ExecutionStep[];
      generationIds?: string[] | null;
      adCopyIds?: string[] | null;
      approvalQueueIds?: string[] | null;
    }
  | undefined
> {
  const execution = await storage.getAgentExecutionById(executionId);
  if (!execution || execution.userId !== userId) return undefined;
  return {
    executionId: execution.id,
    status: execution.status,
    steps: execution.steps as ExecutionStep[],
    generationIds: execution.generationIds,
    adCopyIds: execution.adCopyIds,
    approvalQueueIds: execution.approvalQueueIds,
  };
}

// ---------------------------------------------------------------------------
// Stage 3 — Approval Optimizer (scoring)
// ---------------------------------------------------------------------------

/**
 * Heuristic scoring fallback (renamed from original scorePlan).
 * Used when LLM scoring fails or is unavailable.
 */
function heuristicScorePlan(parsed: any): {
  total: number;
  breakdown: { criterion: string; score: number; max: number }[];
} {
  const breakdown: { criterion: string; score: number; max: number }[] = [];

  // Brand alignment: check if objective and hooks are present
  const objectiveScore = parsed.objective && parsed.objective.length > 10 ? 25 : 10;
  breakdown.push({ criterion: 'Brand Alignment', score: objectiveScore, max: 25 });

  // Platform fit: check if platform is valid and posts use correct platform
  const posts = Array.isArray(parsed.posts) ? parsed.posts : [];
  const validPlatforms = new Set(['instagram', 'linkedin', 'twitter', 'facebook', 'tiktok']);
  const platformFitScore = validPlatforms.has(parsed.platform) ? 25 : 10;
  breakdown.push({ criterion: 'Platform Fit', score: platformFitScore, max: 25 });

  // Content diversity: multiple content types?
  const types = new Set(posts.map((p: any) => p.contentType));
  const diversityScore = Math.min(25, types.size * 10);
  breakdown.push({ criterion: 'Content Diversity', score: diversityScore, max: 25 });

  // Timing/cadence: check if cadence is specified
  const cadenceScore = parsed.cadence && parsed.cadence.length > 5 ? 25 : 10;
  breakdown.push({ criterion: 'Timing & Cadence', score: cadenceScore, max: 25 });

  const total = breakdown.reduce((sum, b) => sum + b.score, 0);
  return { total, breakdown };
}

/**
 * LLM-based plan scoring with heuristic fallback.
 * Calls Gemini for semantic evaluation of the campaign plan.
 */
async function scorePlan(
  parsed: any,
  storage: IStorage,
  userId: string,
): Promise<{ total: number; breakdown: { criterion: string; score: number; max: number }[] }> {
  const brandProfile = await storage.getBrandProfileByUserId(userId);

  const prompt = `You are a marketing campaign quality evaluator. Score this campaign plan:

Plan: ${JSON.stringify({ objective: parsed.objective, cadence: parsed.cadence, platform: parsed.platform, contentMix: parsed.contentMix, postCount: (parsed.posts || []).length }, null, 2)}
${brandProfile ? `Brand: ${brandProfile.brandName}, Industry: ${brandProfile.industry}` : ''}

Score each criterion 0-25. Return ONLY JSON, no markdown:
{
  "breakdown": [
    { "criterion": "Brand Alignment", "score": <0-25>, "max": 25 },
    { "criterion": "Platform Fit", "score": <0-25>, "max": 25 },
    { "criterion": "Content Diversity", "score": <0-25>, "max": 25 },
    { "criterion": "Timing & Cadence", "score": <0-25>, "max": 25 }
  ]
}`;

  try {
    const response = await generateContentWithRetry(
      {
        model: REASONING_MODEL,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { temperature: 0.3, maxOutputTokens: 1500 },
      },
      { operation: 'agent_plan_scoring' },
    );

    const text = (response.text || '').trim();
    const result = parseJsonObject(text);

    if (result?.breakdown && Array.isArray(result.breakdown)) {
      const breakdown = result.breakdown.map((b: any) => ({
        criterion: String(b.criterion),
        score: Math.max(0, Math.min(25, Number(b.score) || 0)),
        max: 25,
      }));
      const total = breakdown.reduce((sum: number, b: any) => sum + b.score, 0);
      return { total, breakdown };
    }
  } catch (err) {
    logger.warn({ module: 'AgentOrchestrator', err }, 'LLM scoring failed, using heuristic fallback');
  }

  // Fallback to heuristic
  return heuristicScorePlan(parsed);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Map a DB AgentPlan record to the PlanBrief API shape.
 */
function dbPlanToBrief(dbPlan: any): PlanBrief {
  return {
    id: dbPlan.id,
    userId: dbPlan.userId,
    status: dbPlan.status,
    objective: dbPlan.objective,
    cadence: dbPlan.cadence,
    platform: dbPlan.platform,
    contentMix: dbPlan.contentMix as { type: string; count: number }[],
    approvalScore: dbPlan.approvalScore,
    scoreBreakdown: dbPlan.scoreBreakdown as { criterion: string; score: number; max: number }[],
    estimatedCost: dbPlan.estimatedCost as { credits: number; currency: string },
    posts: dbPlan.posts as PlanPost[],
    createdAt: dbPlan.createdAt instanceof Date ? dbPlan.createdAt.toISOString() : String(dbPlan.createdAt),
  };
}

function estimateCost(posts: any): { credits: number; currency: string } {
  const postCount = Array.isArray(posts) ? posts.length : 0;
  // Rough estimate: 1 credit per image, 3 per carousel, 5 per video
  let credits = 0;
  if (Array.isArray(posts)) {
    for (const post of posts) {
      switch (post.contentType) {
        case 'carousel':
          credits += 3;
          break;
        case 'video':
          credits += 5;
          break;
        default:
          credits += 1;
      }
    }
  }
  return { credits: credits || postCount, currency: 'credits' };
}

/**
 * Build fallback plan data (without id/createdAt — those come from DB).
 */
function buildFallbackPlanData(suggestionId: string) {
  return {
    objective: 'Brand awareness',
    cadence: '3 posts/week',
    platform: 'instagram',
    contentMix: [{ type: 'image', count: 3 }],
    approvalScore: 50,
    scoreBreakdown: [
      { criterion: 'Brand Alignment', score: 15, max: 25 },
      { criterion: 'Platform Fit', score: 15, max: 25 },
      { criterion: 'Content Diversity', score: 10, max: 25 },
      { criterion: 'Timing & Cadence', score: 10, max: 25 },
    ],
    estimatedCost: { credits: 3, currency: 'credits' },
    posts: [
      {
        index: 0,
        productIds: [],
        prompt: 'Product showcase image',
        platform: 'instagram',
        contentType: 'image',
        hookAngle: 'Lifestyle shot',
      },
      {
        index: 1,
        productIds: [],
        prompt: 'Behind the scenes',
        platform: 'instagram',
        contentType: 'image',
        hookAngle: 'Authenticity',
      },
      {
        index: 2,
        productIds: [],
        prompt: 'Customer testimonial visual',
        platform: 'instagram',
        contentType: 'image',
        hookAngle: 'Social proof',
      },
    ],
    suggestionId,
  };
}

function buildFallbackSuggestions(products: any[], limit: number): AgentSuggestion[] {
  const templates = [
    {
      type: 'single_post' as const,
      title: 'Product Spotlight',
      description: 'Highlight a single product with a lifestyle shot',
      tags: ['showcase', 'lifestyle'],
    },
    {
      type: 'content_series' as const,
      title: 'Weekly Feature Series',
      description: 'A 5-part series featuring one product per day',
      tags: ['series', 'scheduled'],
    },
    {
      type: 'campaign' as const,
      title: 'Seasonal Campaign',
      description: 'Themed campaign tied to current season',
      tags: ['seasonal', 'campaign'],
    },
    {
      type: 'gap_fill' as const,
      title: 'Fill Calendar Gap',
      description: 'Quick content to fill an empty slot this week',
      tags: ['quick', 'gap'],
    },
    {
      type: 'content_series' as const,
      title: 'Before/After Series',
      description: 'Show transformation using your product',
      tags: ['transformation', 'series'],
    },
    {
      type: 'single_post' as const,
      title: 'Customer Story',
      description: 'Share a customer success story',
      tags: ['social-proof', 'testimonial'],
    },
  ];

  return templates.slice(0, limit).map((t, i) => ({
    id: randomUUID(),
    type: t.type,
    title: t.title,
    description: t.description,
    products: products.slice(0, 3).map((p) => ({ id: Number(p.id), name: p.name })),
    platform: 'instagram',
    confidence: 40,
    reasoning: 'Template-based suggestion (LLM unavailable)',
    tags: t.tags,
  }));
}

// ---------------------------------------------------------------------------
// Phase 3 — Execution Helpers
// ---------------------------------------------------------------------------

function aspectRatioForPlatform(platform) {
  const map = {
    instagram: '1:1',
    linkedin: '16:9',
    facebook: '1:1',
    twitter: '16:9',
    tiktok: '9:16',
  };
  return map[platform] || '1:1';
}

function mapObjective(objective) {
  const lower = (objective || '').toLowerCase();
  if (lower.includes('conversion') || lower.includes('sales')) return 'conversion';
  if (lower.includes('consideration') || lower.includes('interest')) return 'consideration';
  if (lower.includes('engagement') || lower.includes('interact')) return 'engagement';
  return 'awareness';
}

async function getProductContext(storage, productIds) {
  if (!productIds || productIds.length === 0) {
    return { name: 'Product', description: 'Product advertisement' };
  }
  try {
    const products = [];
    for (const pid of productIds) {
      const product = await storage.getProductById(String(pid));
      if (product) products.push(product);
    }
    if (products.length > 0) {
      return {
        name: products.map((p) => p.name).join(' + '),
        description: products.map((p) => p.description || p.name).join('. '),
      };
    }
  } catch (err) {
    logger.warn({ module: 'AgentOrchestrator', err }, 'Failed to fetch product context, using defaults');
  }
  return { name: 'Product', description: 'Product advertisement' };
}

// ---------------------------------------------------------------------------
// Phase 3 — Per-Post Execution (image → upload → DB → copy → DB → queue)
// ---------------------------------------------------------------------------

async function executePostStep(storage, post, plan, userId) {
  // Phase 4: Fetch brand profile for context enrichment
  const brandProfile = await storage.getBrandProfileByUserId(userId);

  // A. Generate image via Gemini — enrich prompt with brand style
  let imagePrompt = post.prompt;
  if (brandProfile) {
    const style = brandProfile.preferredStyles
      ? Array.isArray(brandProfile.preferredStyles)
        ? brandProfile.preferredStyles.join(', ')
        : brandProfile.preferredStyles
      : 'Professional';
    imagePrompt = `Brand: ${brandProfile.brandName || 'Brand'}. Style: ${style}.\n\n${post.prompt}`;
  }

  const imageResult = await geminiService.generateImage(
    imagePrompt,
    {
      aspectRatio: aspectRatioForPlatform(post.platform),
    },
    userId,
  );

  // B. Upload to Cloudinary (or local fallback)
  const cloudinaryUrl = await saveGeneratedImage(imageResult.imageBase64, 'png');

  // C. Save generation record to DB
  const generation = await storage.saveGeneration({
    userId,
    prompt: post.prompt,
    originalImagePaths: [],
    generatedImagePath: cloudinaryUrl,
    imagePath: cloudinaryUrl,
    aspectRatio: aspectRatioForPlatform(post.platform),
    status: 'completed',
    conversationHistory: imageResult.conversationHistory,
    productIds: (post.productIds || []).map(String),
    generationMode: 'standard',
    mediaType: 'image',
    updatedAt: new Date(),
  });

  // D. Look up product context for copy generation
  const { name: productName, description: productDesc } = await getProductContext(storage, post.productIds);

  // Phase 4: Extract brand context for copy enrichment
  const industry = brandProfile?.industry || 'General';
  const brandVoice = brandProfile?.voice
    ? {
        principles: brandProfile.voice.principles || [],
        wordsToAvoid: brandProfile.voice.wordsToAvoid || [],
        wordsToUse: brandProfile.voice.wordsToUse || [],
      }
    : undefined;
  const targetAudience = brandProfile?.targetAudience
    ? {
        demographics: String(brandProfile.targetAudience.demographics || brandProfile.targetAudience),
        psychographics: String(brandProfile.targetAudience.psychographics || 'Decision-makers'),
        painPoints: Array.isArray(brandProfile.targetAudience.painPoints)
          ? brandProfile.targetAudience.painPoints
          : ['Quality', 'Reliability'],
      }
    : undefined;

  // E. Generate ad copy via copywriting service
  const copyResults = await copywritingService.generateCopy(
    {
      generationId: generation.id,
      platform: post.platform,
      tone: 'authentic',
      framework: 'auto',
      campaignObjective: mapObjective(plan.objective),
      productName,
      productDescription: productDesc,
      industry,
      brandVoice,
      targetAudience,
      variations: 1,
    },
    {
      productId: post.productIds?.[0]?.toString(),
      userId,
    },
  );

  const copy = copyResults[0];
  if (!copy) {
    throw new Error('Copywriting service returned no results');
  }

  // F. Save ad copy to DB
  const adCopy = await storage.saveAdCopy({
    generationId: generation.id,
    userId,
    headline: copy.headline,
    hook: copy.hook,
    bodyText: copy.bodyText,
    cta: copy.cta,
    caption: copy.caption,
    hashtags: copy.hashtags,
    platform: post.platform,
    tone: 'authentic',
    framework: copy.framework,
    productName,
    productDescription: productDesc,
    industry,
    qualityScore: copy.qualityScore,
    characterCounts: copy.characterCounts,
    variationNumber: 1,
  });

  // G. Submit to approval queue
  const queueItem = await addToQueue({
    caption: copy.caption,
    platform: post.platform,
    imageUrl: cloudinaryUrl,
    hashtags: copy.hashtags,
    userId,
    adCopyId: adCopy.id,
    generationId: generation.id,
    scheduledFor: post.scheduledDate ? new Date(post.scheduledDate) : undefined,
  });

  return {
    generationId: generation.id,
    adCopyId: adCopy.id,
    approvalQueueId: queueItem.id,
    imageUrl: cloudinaryUrl,
  };
}

// ---------------------------------------------------------------------------
// Execution Runner (replaces placeholder sleep loop)
// ---------------------------------------------------------------------------

async function runExecutionSteps(
  storage: IStorage,
  executionId: string,
  planId: string,
  userId: string,
): Promise<void> {
  // 1. Load the plan from DB to get posts
  const planRecord = await storage.getAgentPlanById(planId);
  if (!planRecord) {
    logger.error({ module: 'AgentOrchestrator', planId }, 'Plan not found for execution');
    await storage.updateAgentExecution(executionId, {
      status: 'failed',
      errorMessage: `Plan ${planId} not found`,
      completedAt: new Date(),
    });
    return;
  }

  // 2. Mark execution as running
  await storage.updateAgentExecution(executionId, { status: 'running', startedAt: new Date() });
  await storage.updateAgentPlan(planId, { status: 'executing' });

  // 3. Get current execution to read steps
  const execution = await storage.getAgentExecutionById(executionId);
  if (!execution) return;

  const steps = [...(execution.steps as ExecutionStep[])];
  const posts = (planRecord.posts || []) as PlanPost[];

  // 4. Track created IDs across all steps
  const allGenerationIds: string[] = [];
  const allAdCopyIds: string[] = [];
  const allApprovalQueueIds: string[] = [];

  let hasFailure = false;

  // 5. Execute each post
  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];
    const step = steps[i];
    if (!post || !step) continue;

    // Skip already completed steps (needed for retry)
    if (step.status === 'complete') {
      // Collect existing IDs from completed steps
      if (step.result?.generationId) allGenerationIds.push(step.result.generationId);
      if (step.result?.adCopyId) allAdCopyIds.push(step.result.adCopyId);
      if (step.result?.approvalQueueId) allApprovalQueueIds.push(step.result.approvalQueueId);
      continue;
    }

    // Check if execution was cancelled externally
    const currentExec = await storage.getAgentExecutionById(executionId);
    if (currentExec?.status === 'failed') {
      logger.info({ module: 'AgentOrchestrator', executionId }, 'Execution cancelled externally, stopping');
      break;
    }

    // Mark step as running
    step.status = 'running';
    await storage.updateAgentExecution(executionId, { steps });

    try {
      const result = await executePostStep(storage, post, planRecord, userId);

      // Mark step as complete with result IDs
      step.status = 'complete';
      step.result = {
        generationId: result.generationId,
        adCopyId: result.adCopyId,
        approvalQueueId: result.approvalQueueId,
        imageUrl: result.imageUrl,
        postIndex: step.index,
      };

      allGenerationIds.push(result.generationId);
      allAdCopyIds.push(result.adCopyId);
      allApprovalQueueIds.push(result.approvalQueueId);

      logger.info(
        { module: 'AgentOrchestrator', executionId, stepIndex: i, generationId: result.generationId },
        `Step ${i + 1}/${posts.length} complete`,
      );
    } catch (err) {
      // Mark step as failed but continue with remaining steps
      const errorMessage = err instanceof Error ? err.message : 'Unknown step error';
      step.status = 'failed';
      step.result = { error: errorMessage, postIndex: step.index };
      hasFailure = true;

      logger.error(
        { module: 'AgentOrchestrator', executionId, stepIndex: i, err },
        `Step ${i + 1}/${posts.length} failed`,
      );
    }

    // Persist steps + accumulated IDs after each step
    await storage.updateAgentExecution(executionId, {
      steps,
      generationIds: allGenerationIds,
      adCopyIds: allAdCopyIds,
      approvalQueueIds: allApprovalQueueIds,
    });

    // Brief delay between steps to avoid rate limits
    if (i < posts.length - 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // 6. Determine final status
  const finalStatus = hasFailure ? 'failed' : 'complete';
  await storage.updateAgentExecution(executionId, {
    status: finalStatus,
    completedAt: new Date(),
    steps,
    generationIds: allGenerationIds,
    adCopyIds: allAdCopyIds,
    approvalQueueIds: allApprovalQueueIds,
    ...(hasFailure && { errorMessage: 'One or more steps failed — see individual step results' }),
  });

  // 7. Update plan status
  await storage.updateAgentPlan(planId, { status: hasFailure ? 'failed' : 'completed' });

  logger.info(
    {
      module: 'AgentOrchestrator',
      executionId,
      finalStatus,
      totalSteps: posts.length,
      succeeded: allGenerationIds.length,
      failed: posts.length - allGenerationIds.length,
    },
    'Execution run complete',
  );
}

function parseJsonArray(text: string): any[] | null {
  try {
    // Strip markdown fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    const result = JSON.parse(cleaned);
    return Array.isArray(result) ? result : null;
  } catch {
    // Try to find an array in the text
    const match = text.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const result = JSON.parse(match[0]);
        return Array.isArray(result) ? result : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

function parseJsonObject(text: string): any | null {
  try {
    const cleaned = text
      .replace(/^```(?:json)?\s*\n?/i, '')
      .replace(/\n?```\s*$/i, '')
      .trim();
    const result = JSON.parse(cleaned);
    return result && typeof result === 'object' && !Array.isArray(result) ? result : null;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const result = JSON.parse(match[0]);
        return result && typeof result === 'object' && !Array.isArray(result) ? result : null;
      } catch {
        return null;
      }
    }
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phase 5 — Plan History, Cancel, Retry
// ---------------------------------------------------------------------------

export async function listPlans(storage: IStorage, userId: string, limit = 20) {
  const plans = await storage.getAgentPlansByUserId(userId, limit);
  return plans.map((p: any) => ({
    id: p.id,
    objective: p.objective,
    platform: p.platform,
    status: p.status,
    approvalScore: p.approvalScore,
    postCount: Array.isArray(p.posts) ? p.posts.length : 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
}

export async function cancelExecution(storage: IStorage, executionId: string, userId: string) {
  const execution = await storage.getAgentExecutionById(executionId);
  if (!execution || execution.userId !== userId) {
    throw new PlanNotFoundError(executionId);
  }
  if (execution.status !== 'running' && execution.status !== 'queued') {
    throw new Error('Cannot cancel execution that is not running or queued');
  }

  // Mark as failed with cancellation message
  // The runExecutionSteps loop checks for status === 'failed' before each step
  await storage.updateAgentExecution(executionId, {
    status: 'failed',
    errorMessage: 'Cancelled by user',
    completedAt: new Date(),
  });

  // Also update the plan status
  await storage.updateAgentPlan(execution.planId, {
    status: 'cancelled',
  });

  logger.info({ executionId, userId }, 'Execution cancelled by user');
}

export async function retryFailedSteps(storage: IStorage, executionId: string, userId: string) {
  const execution = await storage.getAgentExecutionById(executionId);
  if (!execution || execution.userId !== userId) {
    throw new PlanNotFoundError(executionId);
  }
  if (execution.status !== 'failed') {
    throw new Error('Can only retry failed executions');
  }

  const plan = await storage.getAgentPlanById(execution.planId);
  if (!plan) {
    throw new PlanNotFoundError(execution.planId);
  }

  // Reset failed steps to pending
  const steps = ((execution.steps || []) as ExecutionStep[]).map((s) =>
    s.status === 'failed' ? { ...s, status: 'pending' as const, result: undefined } : s,
  );

  await storage.updateAgentExecution(executionId, {
    status: 'running',
    steps,
    errorMessage: null,
    completedAt: null,
  });

  // Update plan status back to executing
  await storage.updateAgentPlan(plan.id, {
    status: 'executing',
  });

  // Fire-and-forget: re-run execution (the loop will skip completed steps)
  runExecutionSteps(storage, executionId, execution.planId, userId).catch((err) => {
    logger.error({ err, executionId }, 'Retry execution failed');
  });

  return { executionId, status: 'running', steps };
}

// Custom error for missing plans
export class PlanNotFoundError extends Error {
  constructor(planId: string) {
    super(`Plan not found: ${planId}`);
    this.name = 'NotFoundError';
  }
}
