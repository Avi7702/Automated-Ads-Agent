import { logger } from '../lib/logger';
import { generateContentWithRetry } from '../lib/geminiClient';
import type { GenerateCopyInput } from '../validation/schemas';
import { getFileSearchStoreForGeneration, queryFileSearchStore, FileCategory } from './fileSearchService';
import { sanitizeForPrompt } from '../lib/promptSanitizer';
import { safeParseLLMResponse, generatedCopySchema } from '../validation/llmResponseSchemas';
import { productKnowledgeService, type EnhancedProductContext } from './productKnowledgeService';

/**
 * Look up platform limits, throwing if the platform is unknown.
 */
function getPlatformLimitsOrThrow(platform: string): PlatformLimits {
  const limits = PLATFORM_LIMITS[platform];
  if (!limits) {
    throw new Error(`Unknown platform: ${platform}. Supported: ${Object.keys(PLATFORM_LIMITS).join(', ')}`);
  }
  return limits;
}

// Platform character limits (2025 standards)
interface PlatformLimits {
  headline: { optimal: number; max: number };
  hook: { optimal: number; max: number };
  primaryText: { optimal: number; max: number };
  caption: { optimal: number; max: number };
  description?: { optimal: number; max: number };
}

const PLATFORM_LIMITS: Record<string, PlatformLimits> = {
  instagram: {
    headline: { optimal: 40, max: 40 },
    hook: { optimal: 60, max: 60 },
    primaryText: { optimal: 125, max: 2200 },
    caption: { optimal: 125, max: 2200 },
  },
  linkedin: {
    headline: { optimal: 150, max: 150 },
    hook: { optimal: 60, max: 60 },
    primaryText: { optimal: 150, max: 600 },
    caption: { optimal: 150, max: 600 },
    description: { optimal: 45, max: 45 },
  },
  facebook: {
    headline: { optimal: 27, max: 27 },
    hook: { optimal: 60, max: 60 },
    primaryText: { optimal: 125, max: 500 },
    caption: { optimal: 125, max: 500 },
    description: { optimal: 27, max: 27 },
  },
  twitter: {
    headline: { optimal: 23, max: 23 },
    hook: { optimal: 60, max: 60 },
    primaryText: { optimal: 257, max: 280 },
    caption: { optimal: 257, max: 280 },
  },
  tiktok: {
    headline: { optimal: 40, max: 40 },
    hook: { optimal: 60, max: 60 },
    primaryText: { optimal: 100, max: 150 },
    caption: { optimal: 100, max: 150 },
  },
};

interface GeneratedCopy {
  headline: string;
  hook: string;
  bodyText: string;
  cta: string;
  caption: string;
  hashtags: string[];
  framework: string;
  qualityScore: {
    clarity: number;
    persuasiveness: number;
    platformFit: number;
    brandAlignment: number;
    overallScore: number;
    reasoning: string;
  };
  characterCounts: {
    headline: number;
    hook: number;
    body: number;
    caption: number;
    total: number;
  };
}

function getDefaultQualityScore(): GeneratedCopy['qualityScore'] {
  return {
    clarity: 5,
    persuasiveness: 5,
    platformFit: 5,
    brandAlignment: 5,
    overallScore: 5,
    reasoning: 'Quality score not provided by LLM',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseNumberInRange(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, value));
}

function parseQualityScore(value: unknown): GeneratedCopy['qualityScore'] {
  const defaults = getDefaultQualityScore();
  if (!isRecord(value)) {
    return defaults;
  }

  // Accept both legacy 0-100 and newer 1-10 scales without crashing.
  const clarity = parseNumberInRange(value['clarity'], 0, 100, defaults.clarity);
  const persuasiveness = parseNumberInRange(value['persuasiveness'], 0, 100, defaults.persuasiveness);
  const platformFit = parseNumberInRange(value['platformFit'], 0, 100, defaults.platformFit);
  const brandAlignment = parseNumberInRange(value['brandAlignment'], 0, 100, defaults.brandAlignment);
  const overallScore = parseNumberInRange(value['overallScore'], 0, 100, defaults.overallScore);
  const reasoning = typeof value['reasoning'] === 'string' ? value['reasoning'] : defaults.reasoning;

  return {
    clarity,
    persuasiveness,
    platformFit,
    brandAlignment,
    overallScore,
    reasoning,
  };
}

class CopywritingService {
  // No constructor needed - uses shared client

  /**
   * Generate ad copy with multiple variations using PTCF prompt framework
   *
   * @param request - The validated copy generation input
   * @param options - Optional enrichment: productId + userId to auto-fetch product knowledge
   */
  async generateCopy(
    request: GenerateCopyInput,
    options?: { productId?: string; userId?: string },
  ): Promise<GeneratedCopy[]> {
    // Build enhanced product context if productId + userId are provided
    let enhancedContext: EnhancedProductContext | null = null;
    if (options?.productId && options?.userId) {
      try {
        enhancedContext = await productKnowledgeService.buildEnhancedContext(options.productId, options.userId);
        if (enhancedContext) {
          logger.info(
            { module: 'Copywriting', productId: options.productId },
            'Enhanced product context loaded for copy generation',
          );
        }
      } catch (err) {
        logger.warn({ module: 'Copywriting', err }, 'Failed to load enhanced product context, continuing without it');
      }
    }

    const variations: GeneratedCopy[] = [];

    for (let i = 0; i < request.variations; i++) {
      const copy = await this.generateSingleCopy(request, i + 1, enhancedContext);
      variations.push(copy);
    }

    return variations;
  }

  /**
   * Generate a single copy variation with RAG enhancement
   */
  async generateSingleCopy(
    request: GenerateCopyInput,
    variationNumber: number,
    enhancedContext?: EnhancedProductContext | null,
  ): Promise<GeneratedCopy> {
    // STEP 1: Retrieve relevant context from File Search Store (RAG)
    let ragContext = '';
    let citations: string[] = [];

    try {
      await getFileSearchStoreForGeneration();

      // Query for ad examples matching the product/platform
      const contextQuery = `${request.platform} ad examples for ${request.productName} ${request.industry} ${request.productDescription}`;
      const searchResult = await queryFileSearchStore({
        query: contextQuery,
        category: FileCategory.AD_EXAMPLES,
        maxResults: 3,
      });

      if (searchResult) {
        ragContext = searchResult.context;
        citations = searchResult.citations || [];
        logger.info(
          { module: 'Copywriting', contextLength: ragContext.length, citationCount: citations.length },
          'Retrieved RAG context',
        );
      } else {
        logger.info({ module: 'Copywriting' }, 'No RAG context found for this query');
      }
    } catch (error) {
      logger.warn({ module: 'Copywriting', err: error }, 'File Search not available, continuing without RAG context');
      // Continue without RAG if File Search fails - graceful degradation
    }

    // STEP 2: Build enhanced prompt with RAG context and product knowledge
    const prompt = this.buildPTCFPromptWithRAG(request, variationNumber, ragContext, enhancedContext);

    // STEP 3: Generate with File Search tool enabled
    // Configure with File Search tool if available
    let tools: Array<{ fileSearch: { fileSearchStoreNames: string[] } }> | undefined = undefined;
    try {
      const fileSearchStore = await getFileSearchStoreForGeneration();
      if (fileSearchStore) {
        tools = [
          {
            fileSearch: {
              fileSearchStoreNames: [fileSearchStore],
            },
          },
        ];
      }
    } catch (error) {
      // No File Search available, continue without tools
    }

    // MODEL RECENCY RULE: Before changing any model ID, verify today's date and confirm the model is current within the last 3-4 weeks.
    const response = await generateContentWithRetry(
      {
        model: 'gemini-3-pro-preview',
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        config: {
          responseModalities: ['TEXT'],
          responseMimeType: 'application/json',
          responseSchema: this.getResponseSchema(request.platform),
        },
        ...(tools && { tools }),
      },
      { operation: 'ad_copy_generation' },
    );
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const generatedCopy = safeParseLLMResponse(text, generatedCopySchema, 'ad_copy_generation');

    // Calculate character counts
    const characterCounts = {
      headline: generatedCopy.headline.length,
      hook: generatedCopy.hook.length,
      body: generatedCopy.bodyText.length,
      caption: generatedCopy.caption.length,
      total:
        generatedCopy.headline.length +
        generatedCopy.hook.length +
        generatedCopy.bodyText.length +
        generatedCopy.caption.length,
    };

    // generatedCopy may not include qualityScore (not in the Zod schema).
    // Parse best-effort from raw JSON without allowing malformed payloads to crash.
    let rawParsed: Record<string, unknown> = {};
    try {
      const parsed = JSON.parse(text);
      if (isRecord(parsed)) {
        rawParsed = parsed;
      }
    } catch {
      // safeParseLLMResponse already validated core copy fields; keep defaults for quality score.
    }
    const qualityScore = parseQualityScore(rawParsed['qualityScore']);

    return {
      ...generatedCopy,
      framework: generatedCopy.framework ?? 'AIDA',
      cta: generatedCopy.cta ?? '',
      hashtags: generatedCopy.hashtags ?? [],
      qualityScore,
      characterCounts,
    };
  }

  /**
   * Build PTCF prompt with RAG context and product knowledge (enhanced version)
   */
  private buildPTCFPromptWithRAG(
    request: GenerateCopyInput,
    variationNumber: number,
    ragContext: string,
    enhancedContext?: EnhancedProductContext | null,
  ): string {
    const limits = getPlatformLimitsOrThrow(request.platform);

    // PERSONA
    const persona = `You are an expert social media ad copywriter specializing in ${request.platform} advertising. You have 10+ years of experience writing conversion-focused copy for ${request.industry} brands. You understand platform algorithms, user behavior, and what drives engagement.`;

    // TASK
    const framework =
      request.framework === 'auto' || !request.framework
        ? 'the most effective copywriting framework for this campaign'
        : request.framework.toUpperCase();

    const task = `Write compelling ad copy variation #${variationNumber} for a ${request.platform} advertisement using ${framework} framework. This copy must grab attention in 3-8 seconds, resonate with the target audience, and drive them to take action.`;

    // RAG CONTEXT
    const ragSection = ragContext
      ? `
REFERENCE MATERIALS FROM KNOWLEDGE BASE:
${ragContext}

IMPORTANT: Use these reference materials as inspiration and context, but do NOT copy them directly. Adapt the successful patterns, hooks, and approaches to match THIS specific product and audience.
`
      : '';

    const s = (v: string) => sanitizeForPrompt(v, { maxLength: 500, context: 'copy_ptcf_rag' });

    // PRODUCT KNOWLEDGE SECTION — enriched from productKnowledgeService
    let productKnowledgeSection = '';
    if (enhancedContext) {
      const pkParts: string[] = [];

      // Product features (key-value pairs from product DB)
      const features = enhancedContext.product.features;
      if (features && typeof features === 'object' && Object.keys(features).length > 0) {
        const featureLines = Object.entries(features)
          .slice(0, 10)
          .map(([k, v]) => `  - ${k}: ${v}`)
          .join('\n');
        pkParts.push(`Product Features:\n${featureLines}`);
      }

      // Product specifications
      const specs = enhancedContext.product.specifications;
      if (specs && typeof specs === 'object' && Object.keys(specs).length > 0) {
        const specLines = Object.entries(specs)
          .slice(0, 10)
          .map(([k, v]) => `  - ${k}: ${v}`)
          .join('\n');
        pkParts.push(`Technical Specifications:\n${specLines}`);
      }

      // Product benefits (from DB, supplement what caller may have already provided)
      const dbBenefits = enhancedContext.product.benefits;
      if (dbBenefits && dbBenefits.length > 0) {
        pkParts.push(`Product Benefits: ${dbBenefits.slice(0, 6).join(', ')}`);
      }

      // Product category and tags
      if (enhancedContext.product.category) {
        pkParts.push(`Product Category: ${enhancedContext.product.category}`);
      }
      if (enhancedContext.product.tags && enhancedContext.product.tags.length > 0) {
        pkParts.push(`Product Tags: ${enhancedContext.product.tags.slice(0, 8).join(', ')}`);
      }

      // Enrichment draft data (AI-scraped info like use cases, installation context)
      const draft = enhancedContext.product.enrichmentDraft as Record<string, unknown> | undefined;
      if (draft && typeof draft === 'object') {
        if (draft['installationContext']) {
          pkParts.push(`Installation Context: ${s(String(draft['installationContext']))}`);
        }
        const useCases = draft['useCases'];
        if (Array.isArray(useCases) && useCases.length > 0) {
          pkParts.push(`Real-World Use Cases: ${(useCases as string[]).slice(0, 5).join(', ')}`);
        }
      }

      // Related products (complementary/pairs with)
      if (enhancedContext.relatedProducts.length > 0) {
        const relatedLines = enhancedContext.relatedProducts
          .slice(0, 4)
          .map(
            (rp) =>
              `  - ${rp.product.name} (${rp.relationshipType}${rp.relationshipDescription ? ': ' + rp.relationshipDescription : ''})`,
          )
          .join('\n');
        pkParts.push(`Related Products (can reference in copy for cross-sell / bundling):\n${relatedLines}`);
      }

      // Installation scenarios
      if (enhancedContext.installationScenarios.length > 0) {
        const scenarioLines = enhancedContext.installationScenarios
          .slice(0, 3)
          .map((sc) => `  - ${sc.title}: ${sc.description.slice(0, 120)}`)
          .join('\n');
        pkParts.push(
          `Installation / Usage Scenarios (can reference for how-to or educational copy):\n${scenarioLines}`,
        );
      }

      if (pkParts.length > 0) {
        productKnowledgeSection = `\nDEEP PRODUCT KNOWLEDGE (use this to write specific, accurate copy — never invent product details):\n${pkParts.join('\n\n')}\n`;
      }
    }

    // CONTEXT (core request data, with sanitization)
    const context = `
PRODUCT INFORMATION:
- Name: ${s(request.productName)}
- Description: ${s(request.productDescription)}
${request.productBenefits ? `- Key Benefits: ${request.productBenefits.map(s).join(', ')}` : ''}
${request.uniqueValueProp ? `- Unique Value: ${s(request.uniqueValueProp)}` : ''}
- Industry: ${s(request.industry)}
${productKnowledgeSection}
${request.campaignObjective ? `CAMPAIGN GOAL: ${s(request.campaignObjective).toUpperCase()}` : ''}

TARGET AUDIENCE:
${
  request.targetAudience
    ? `
- Demographics: ${s(request.targetAudience.demographics)}
- Psychographics: ${s(request.targetAudience.psychographics)}
- Pain Points: ${request.targetAudience.painPoints.map(s).join(', ')}
`
    : 'General audience - use broad appeal messaging'
}

BRAND VOICE & TONE:
${
  request.brandVoice
    ? `
- Core Principles: ${request.brandVoice.principles.map(s).join(', ')}
- Words to USE: ${request.brandVoice.wordsToUse?.map(s).join(', ') || 'N/A'}
- Words to AVOID: ${request.brandVoice.wordsToAvoid?.map(s).join(', ') || 'N/A'}
`
    : `Tone: ${s(request.tone.charAt(0).toUpperCase() + request.tone.slice(1))}`
}

${
  request.socialProof
    ? `
SOCIAL PROOF (incorporate if relevant):
${request.socialProof.testimonial ? s(request.socialProof.testimonial) : ''}
${request.socialProof.stats ? s(request.socialProof.stats) : ''}
`
    : ''
}

PLATFORM REQUIREMENTS (${request.platform.toUpperCase()}):
${this.getPlatformRequirements(request.platform)}

CHARACTER LIMITS (STRICT):
- Headline: max ${limits.headline.max} characters (optimal: ${limits.headline.optimal})
- Hook: max ${limits.hook.max} characters (optimal: ${limits.hook.optimal})
- Body Text: max ${limits.primaryText.max} characters (optimal: ${limits.primaryText.optimal})
- Caption: max ${limits.caption.max} characters (optimal: ${limits.caption.optimal})

COPYWRITING FRAMEWORK:
${this.getFrameworkGuidance(request.framework || 'auto', request.campaignObjective)}

HOOK REQUIREMENTS:
${this.getHookGuidance(request.platform, request.campaignObjective)}

VARIATION REQUIREMENTS:
This is variation #${variationNumber}. Make it distinct from other variations while maintaining brand consistency.
${variationNumber === 1 ? '- Focus on emotional appeal' : ''}
${variationNumber === 2 ? '- Focus on logical benefits and proof' : ''}
${variationNumber === 3 ? '- Focus on urgency and scarcity' : ''}
`;

    // FORMAT
    return `${persona}\n\n${task}\n\n${ragSection}\n${context}\n\nIMPORTANT: Return ONLY valid JSON matching the schema. No markdown, no explanations.`;
  }

  /**
   * Platform-specific requirements (2025 best practices)
   */
  private getPlatformRequirements(platform: string): string {
    const requirements: Record<string, string> = {
      instagram: `
- Visual-first: Copy must complement imagery
- Casual, authentic, relatable tone
- Use 3-5 hashtags max in ads (hashtags DON'T improve reach in ads)
- Explicit CTAs perform better ("Shop Now", "Learn More")
- First 125 characters are critical (shown before "...more")
- Emojis can boost engagement but use sparingly (1-2 max)
`,
      linkedin: `
- Lead with insight, NOT sales pitch
- Thought leadership angle (1.7x higher CTR than promotional)
- Professional but authentic tone (authenticity beats polish)
- Shorter paragraphs, easier to skim
- B2B audience: focus on ROI, efficiency, expertise
- First 150 characters shown before "...see more"
`,
      facebook: `
- Community-focused messaging
- Social proof is CRITICAL (reviews, testimonials, user stats)
- Skimmable format: short sentences, line breaks
- Longer copy OK for high-ticket items (but keep it scannable)
- Conversational tone, speak directly to reader
- Strong CTA buttons perform best
`,
      twitter: `
- Posts <100 chars get 17% more engagement
- Punchy, concise, conversational
- Join trending conversations when relevant
- Use lists, numbers, specific stats
- Thread-style narrative for complex messages
- Strong hook in first 23 characters
`,
      tiktok: `
- First 3 seconds are CRITICAL
- UGC/"lo-fi" aesthetic beats polished ads
- Authentic > corporate
- Trending sounds + native editing style
- "Blend in while standing out"
- Conversational, casual language
`,
    };

    return requirements[platform] || '';
  }

  /**
   * Copywriting framework guidance
   */
  private getFrameworkGuidance(framework: string, _objective?: string): string {
    if (framework === 'auto') {
      return `
AUTO-SELECT FRAMEWORK:
Based on the campaign objective, choose the most effective framework:
- AWARENESS: Use AIDA or PAS (grab attention + educate)
- CONSIDERATION: Use BAB or FAB (show transformation)
- CONVERSION: Use PAS (agitate pain, present solution)
- ENGAGEMENT: Use AIDA (build desire, encourage action)

Explain your choice in the qualityScore.reasoning field.
`;
    }

    const frameworks: Record<string, string> = {
      aida: `
AIDA FRAMEWORK:
1. ATTENTION: Hook that stops the scroll (stat, question, bold claim)
2. INTEREST: Build curiosity about the product/benefit
3. DESIRE: Make them want it (emotional appeal, social proof, FOMO)
4. ACTION: Clear, specific CTA

Example: "87% of users see results in 7 days [A]. Here's how our AI-powered system works [I]. Imagine cutting your workload in half [D]. Start your free trial today [A]."
`,
      pas: `
PAS FRAMEWORK:
1. PROBLEM: Identify the pain point your audience faces
2. AGITATE: Make the problem feel urgent and costly
3. SOLUTION: Present your product as the answer

Example: "Still manually scheduling 50+ posts per week? [P] Every hour spent on scheduling is an hour lost to strategy [A]. Our AI does it in 60 seconds [S]."
`,
      bab: `
BAB FRAMEWORK:
1. BEFORE: Paint the current frustrating situation
2. AFTER: Show the transformed future state
3. BRIDGE: Explain how your product gets them there

Example: "Before: 6 hours/week on content scheduling. After: 10 minutes with full automation. Bridge: Our AI learns your brand voice and schedules perfectly."
`,
      fab: `
FAB FRAMEWORK:
1. FEATURES: What the product does (specific capabilities)
2. ADVANTAGES: Why those features matter (benefits)
3. BENEFITS: How it improves the customer's life

Example: "Multi-platform posting [F] = reach all audiences at once [A] = 3x more engagement with less effort [B]."
`,
    };

    return frameworks[framework.toLowerCase()] || frameworks['aida'] || '';
  }

  /**
   * Hook pattern guidance
   */
  private getHookGuidance(platform: string, objective?: string): string {
    return `
The HOOK is your most important element. You have 3-8 seconds to grab attention.

PROVEN HOOK PATTERNS:
1. PATTERN INTERRUPT: Unexpected opening that breaks the scroll
   Example: "I quit my 6-figure job for this..." "This sounds crazy but..."

2. QUESTION HOOK: Thought-provoking question that targets pain point
   Example: "Still losing 40% of leads at checkout?" "What if you could 10x your output?"

3. STAT HOOK: Surprising, specific statistic
   Example: "87% of ${platform} users miss this critical feature" "3 out of 4 professionals waste 15 hours/week on this"

4. PAIN POINT: Relatable frustration statement
   Example: "Tired of [specific pain]? Here's why..." "If you're struggling with [problem]..."

5. BENEFIT PROMISE: Bold outcome claim
   Example: "Double your engagement in 30 days" "Cut costs by 50% starting today"

6. EVEN IF/WITHOUT: Soothe objections upfront
   Example: "Even if you have zero experience..." "Get results without changing your workflow"

Choose the pattern that best fits:
${objective === 'awareness' ? '- Use Stats or Questions for education' : ''}
${objective === 'consideration' ? '- Use Pain Point or BAB for resonance' : ''}
${objective === 'conversion' ? '- Use Benefit Promise or Even If for urgency' : ''}
`;
  }

  /**
   * Response schema for Gemini (ensures structured JSON output)
   */
  private getResponseSchema(platform: string) {
    const limits = getPlatformLimitsOrThrow(platform);

    return {
      type: 'object',
      properties: {
        headline: {
          type: 'string',
          description: `Attention-grabbing headline (max ${limits.headline.max} chars)`,
          maxLength: limits.headline.max,
        },
        hook: {
          type: 'string',
          description: `Opening hook that stops the scroll (max ${limits.hook.max} chars)`,
          maxLength: limits.hook.max,
        },
        bodyText: {
          type: 'string',
          description: `Main copy body (max ${limits.primaryText.max} chars)`,
          maxLength: limits.primaryText.max,
        },
        cta: {
          type: 'string',
          description: 'Clear call-to-action (max 30 chars)',
          maxLength: 30,
        },
        caption: {
          type: 'string',
          description: `Full caption text (max ${limits.caption.max} chars)`,
          maxLength: limits.caption.max,
        },
        hashtags: {
          type: 'array',
          description: 'Relevant hashtags (3-5 for ads)',
          items: { type: 'string' },
          minItems: 3,
          maxItems: 5,
        },
        framework: {
          type: 'string',
          description: 'Framework used (AIDA, PAS, BAB, FAB)',
          enum: ['AIDA', 'PAS', 'BAB', 'FAB'],
        },
        qualityScore: {
          type: 'object',
          description: 'Self-assessment of copy quality',
          properties: {
            clarity: { type: 'number', minimum: 1, maximum: 10 },
            persuasiveness: { type: 'number', minimum: 1, maximum: 10 },
            platformFit: { type: 'number', minimum: 1, maximum: 10 },
            brandAlignment: { type: 'number', minimum: 1, maximum: 10 },
            overallScore: { type: 'number', minimum: 1, maximum: 10 },
            reasoning: { type: 'string', description: 'Why this approach works' },
          },
          required: ['clarity', 'persuasiveness', 'platformFit', 'brandAlignment', 'overallScore', 'reasoning'],
        },
      },
      required: ['headline', 'hook', 'bodyText', 'cta', 'caption', 'hashtags', 'framework', 'qualityScore'],
    };
  }
}

export const copywritingService = new CopywritingService();
