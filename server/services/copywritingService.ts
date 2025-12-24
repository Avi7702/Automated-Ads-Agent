<<<<<<< HEAD
import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import type { InsertAdCopy, AdCopy } from "@shared/schema";

const copywritingApiKey = process.env.GOOGLE_API_KEY_TEST;
if (!copywritingApiKey) {
  console.warn("[Copywriting] Missing GOOGLE_API_KEY - copywriting features disabled");
}

const genai = copywritingApiKey ? new GoogleGenAI({ apiKey: copywritingApiKey }) : null;

export const PLATFORMS = ["instagram", "linkedin", "twitter", "facebook", "tiktok"] as const;
export type Platform = typeof PLATFORMS[number];

export const TONES = ["professional", "casual", "fun", "luxury", "minimal", "authentic"] as const;
export type Tone = typeof TONES[number];

export const FRAMEWORKS = ["aida", "pas", "bab", "fab", "auto"] as const;
export type Framework = typeof FRAMEWORKS[number];

export const CAMPAIGN_OBJECTIVES = ["awareness", "engagement", "traffic", "conversions", "leads"] as const;
export type CampaignObjective = typeof CAMPAIGN_OBJECTIVES[number];

const PLATFORM_CHAR_LIMITS: Record<Platform, { caption: number; headline: number; hashtags: number }> = {
  instagram: { caption: 2200, headline: 125, hashtags: 30 },
  linkedin: { caption: 3000, headline: 150, hashtags: 5 },
  twitter: { caption: 280, headline: 70, hashtags: 5 },
  facebook: { caption: 63206, headline: 200, hashtags: 10 },
  tiktok: { caption: 2200, headline: 100, hashtags: 5 },
};

const HOOK_PATTERNS = [
  "question",
  "statistic",
  "story",
  "controversial",
  "how_to",
  "list"
] as const;

const FRAMEWORK_PROMPTS: Record<Framework, string> = {
  aida: "Use AIDA framework: Attention (grab attention), Interest (build interest), Desire (create desire), Action (call to action)",
  pas: "Use PAS framework: Problem (identify pain point), Agitate (amplify the problem), Solution (present your solution)",
  bab: "Use BAB framework: Before (current state), After (desired state), Bridge (your product as the path)",
  fab: "Use FAB framework: Features (what it has), Advantages (why it matters), Benefits (what user gains)",
  auto: "Choose the most effective framework based on the product and platform"
};

export interface GenerateCopyInput {
  generationId: string;
  userId: string;
  platform: Platform;
  tone: Tone;
  productName: string;
  productDescription: string;
  industry: string;
  framework?: Framework;
  campaignObjective?: CampaignObjective;
  productBenefits?: string[];
  uniqueValueProp?: string;
  targetAudience?: {
    demographics?: string;
    psychographics?: string;
    painPoints?: string[];
  };
  brandVoice?: {
    personality?: string;
    values?: string[];
    doNotSay?: string[];
  };
  socialProof?: {
    testimonials?: string[];
    stats?: string[];
    awards?: string[];
  };
  variations?: number;
}

export interface CopyOutput {
=======
import { GoogleGenAI } from '@google/genai';
import type { GenerateCopyInput } from '../validation/schemas';
import { getFileSearchStoreForGeneration, queryFileSearchStore, FileCategory } from './fileSearchService';

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
>>>>>>> 154999650a04bb9973c5cddeae01dd5ce52ab181
  headline: string;
  hook: string;
  bodyText: string;
  cta: string;
  caption: string;
  hashtags: string[];
<<<<<<< HEAD
  qualityScore: {
    overall: number;
    relevance: number;
    engagement: number;
    clarity: number;
    reasoning: string;
  };
  characterCounts: {
    caption: number;
    headline: number;
    withinLimits: boolean;
  };
}

export interface GenerateCopyResult {
  success: boolean;
  copies?: AdCopy[];
  error?: string;
}

function buildCopyPrompt(input: GenerateCopyInput): string {
  const limits = PLATFORM_CHAR_LIMITS[input.platform];
  const frameworkInstruction = FRAMEWORK_PROMPTS[input.framework || "auto"];
  
  let prompt = `You are an expert social media copywriter specializing in ${input.platform} marketing. Generate compelling ad copy for the following product.

PRODUCT INFORMATION:
- Name: ${input.productName}
- Description: ${input.productDescription}
- Industry: ${input.industry}`;

  if (input.productBenefits?.length) {
    prompt += `\n- Key Benefits: ${input.productBenefits.join(", ")}`;
  }
  
  if (input.uniqueValueProp) {
    prompt += `\n- Unique Value Proposition: ${input.uniqueValueProp}`;
  }

  prompt += `\n\nTONE & STYLE:
- Tone: ${input.tone}
- ${frameworkInstruction}`;

  if (input.campaignObjective) {
    prompt += `\n- Campaign Objective: ${input.campaignObjective}`;
  }

  if (input.targetAudience) {
    prompt += `\n\nTARGET AUDIENCE:`;
    if (input.targetAudience.demographics) {
      prompt += `\n- Demographics: ${input.targetAudience.demographics}`;
    }
    if (input.targetAudience.psychographics) {
      prompt += `\n- Psychographics: ${input.targetAudience.psychographics}`;
    }
    if (input.targetAudience.painPoints?.length) {
      prompt += `\n- Pain Points: ${input.targetAudience.painPoints.join(", ")}`;
    }
  }

  if (input.brandVoice) {
    prompt += `\n\nBRAND VOICE:`;
    if (input.brandVoice.personality) {
      prompt += `\n- Personality: ${input.brandVoice.personality}`;
    }
    if (input.brandVoice.values?.length) {
      prompt += `\n- Values: ${input.brandVoice.values.join(", ")}`;
    }
    if (input.brandVoice.doNotSay?.length) {
      prompt += `\n- Avoid saying: ${input.brandVoice.doNotSay.join(", ")}`;
    }
  }

  if (input.socialProof) {
    prompt += `\n\nSOCIAL PROOF TO INCORPORATE:`;
    if (input.socialProof.testimonials?.length) {
      prompt += `\n- Testimonials: ${input.socialProof.testimonials.join("; ")}`;
    }
    if (input.socialProof.stats?.length) {
      prompt += `\n- Stats: ${input.socialProof.stats.join("; ")}`;
    }
    if (input.socialProof.awards?.length) {
      prompt += `\n- Awards: ${input.socialProof.awards.join("; ")}`;
    }
  }

  prompt += `\n\nPLATFORM REQUIREMENTS (${input.platform.toUpperCase()}):
- Caption max length: ${limits.caption} characters
- Headline max length: ${limits.headline} characters
- Maximum hashtags: ${limits.hashtags}

OUTPUT FORMAT:
Return a valid JSON object with these exact fields:
{
  "headline": "attention-grabbing headline (max ${limits.headline} chars)",
  "hook": "opening hook using one of these patterns: question, statistic, story, controversial, how_to, list",
  "bodyText": "main body copy that follows the framework",
  "cta": "clear call-to-action",
  "caption": "complete caption for ${input.platform} (max ${limits.caption} chars)",
  "hashtags": ["relevant", "hashtags", "max", "${limits.hashtags}"],
  "qualityScore": {
    "overall": 0-100,
    "relevance": 0-100,
    "engagement": 0-100,
    "clarity": 0-100,
    "reasoning": "brief explanation of scores"
  }
}

Generate compelling, platform-optimized copy. Be creative but stay within character limits.`;

  return prompt;
}

function parseAndValidateCopy(response: string, platform: Platform): CopyOutput | null {
  try {
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    
    const parsed = JSON.parse(jsonMatch[0]);
    const limits = PLATFORM_CHAR_LIMITS[platform];
    
    const copy: CopyOutput = {
      headline: String(parsed.headline || "").slice(0, limits.headline),
      hook: String(parsed.hook || ""),
      bodyText: String(parsed.bodyText || ""),
      cta: String(parsed.cta || ""),
      caption: String(parsed.caption || "").slice(0, limits.caption),
      hashtags: Array.isArray(parsed.hashtags) 
        ? parsed.hashtags.slice(0, limits.hashtags).map(String)
        : [],
      qualityScore: {
        overall: Math.min(100, Math.max(0, Number(parsed.qualityScore?.overall) || 70)),
        relevance: Math.min(100, Math.max(0, Number(parsed.qualityScore?.relevance) || 70)),
        engagement: Math.min(100, Math.max(0, Number(parsed.qualityScore?.engagement) || 70)),
        clarity: Math.min(100, Math.max(0, Number(parsed.qualityScore?.clarity) || 70)),
        reasoning: String(parsed.qualityScore?.reasoning || "Generated copy")
      },
      characterCounts: {
        caption: String(parsed.caption || "").length,
        headline: String(parsed.headline || "").length,
        withinLimits: 
          String(parsed.caption || "").length <= limits.caption &&
          String(parsed.headline || "").length <= limits.headline
      }
    };
    
    return copy;
  } catch (error) {
    console.error("[Copywriting] Failed to parse response:", error);
    return null;
  }
}

export async function generateCopy(input: GenerateCopyInput): Promise<GenerateCopyResult> {
  if (!genai) {
    return { success: false, error: "Copywriting service not configured" };
  }

  const variationsCount = Math.min(5, Math.max(1, input.variations || 3));
  const copies: AdCopy[] = [];

  try {
    for (let i = 0; i < variationsCount; i++) {
      const prompt = buildCopyPrompt(input);
      
      const result = await genai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      const responseText = result.text || "";
      const parsedCopy = parseAndValidateCopy(responseText, input.platform);
      
      if (!parsedCopy) {
        console.error(`[Copywriting] Failed to parse variation ${i + 1}`);
        continue;
      }

      const insertData: InsertAdCopy = {
        generationId: input.generationId,
        userId: input.userId,
        headline: parsedCopy.headline,
        hook: parsedCopy.hook,
        bodyText: parsedCopy.bodyText,
        cta: parsedCopy.cta,
        caption: parsedCopy.caption,
        hashtags: parsedCopy.hashtags,
        platform: input.platform,
        tone: input.tone,
        framework: input.framework || null,
        campaignObjective: input.campaignObjective || null,
        productName: input.productName,
        productDescription: input.productDescription,
        productBenefits: input.productBenefits || null,
        uniqueValueProp: input.uniqueValueProp || null,
        industry: input.industry,
        targetAudience: input.targetAudience || null,
        brandVoice: input.brandVoice || null,
        socialProof: input.socialProof || null,
        qualityScore: parsedCopy.qualityScore,
        characterCounts: parsedCopy.characterCounts,
        variationNumber: i + 1,
        parentCopyId: copies.length > 0 ? copies[0].id : null,
      };

      const savedCopy = await storage.saveAdCopy(insertData);
      copies.push(savedCopy);
      
      console.log(`[Copywriting] Generated variation ${i + 1}/${variationsCount} for generation ${input.generationId}`);
    }

    if (copies.length === 0) {
      return { success: false, error: "Failed to generate any valid copy variations" };
    }

    return { success: true, copies };
  } catch (error: any) {
    console.error("[Copywriting] Error:", error);
    return { success: false, error: error.message || "Failed to generate copy" };
  }
}

export async function getCopyByGenerationId(generationId: string): Promise<AdCopy[]> {
  return storage.getAdCopyByGenerationId(generationId);
}

export async function getCopyById(id: string): Promise<AdCopy | undefined> {
  return storage.getAdCopyById(id);
}

export async function deleteCopy(id: string): Promise<void> {
  return storage.deleteAdCopy(id);
}

export async function updateBrandVoice(userId: string, brandVoice: any): Promise<boolean> {
  const user = await storage.updateUserBrandVoice(userId, brandVoice);
  return !!user;
}
=======
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

class CopywritingService {
  private genAI: GoogleGenAI;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY environment variable is not set');
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * Generate ad copy with multiple variations using PTCF prompt framework
   */
  async generateCopy(request: GenerateCopyInput): Promise<GeneratedCopy[]> {
    const variations: GeneratedCopy[] = [];

    for (let i = 0; i < request.variations; i++) {
      const copy = await this.generateSingleCopy(request, i + 1);
      variations.push(copy);
    }

    return variations;
  }

  /**
   * Generate a single copy variation with RAG enhancement
   */
  private async generateSingleCopy(
    request: GenerateCopyInput,
    variationNumber: number
  ): Promise<GeneratedCopy> {
    // STEP 1: Retrieve relevant context from File Search Store (RAG)
    let ragContext = '';
    let citations: any[] = [];

    try {
      const fileSearchStore = await getFileSearchStoreForGeneration();

      // Query for ad examples matching the product/platform
      const contextQuery = `${request.platform} ad examples for ${request.productName} ${request.industry} ${request.productDescription}`;
      const searchResult = await queryFileSearchStore({
        query: contextQuery,
        category: FileCategory.AD_EXAMPLES,
        maxResults: 3,
      });

      ragContext = searchResult.context;
      citations = searchResult.citations || [];

      console.log(`📚 Retrieved RAG context (${ragContext.length} chars) with ${citations.length} citations`);
    } catch (error) {
      console.warn('⚠️ File Search not available, continuing without RAG context:', error);
      // Continue without RAG if File Search fails - graceful degradation
    }

    // STEP 2: Build enhanced prompt with RAG context
    const prompt = this.buildPTCFPromptWithRAG(request, variationNumber, ragContext);

    // STEP 3: Generate with File Search tool enabled
    // Configure with File Search tool if available
    let tools: Array<{ fileSearch: { fileSearchStoreNames: string[] } }> | undefined = undefined;
    try {
      const fileSearchStore = await getFileSearchStoreForGeneration();
      tools = [
        {
          fileSearch: {
            fileSearchStoreNames: [fileSearchStore],
          },
        },
      ];
    } catch (error) {
      // No File Search available, continue without tools
    }

    const response = await this.genAI.models.generateContent({
      model: 'gemini-2.0-flash-exp',
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
    });
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const generatedCopy = JSON.parse(text);

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

    return {
      ...generatedCopy,
      characterCounts,
    };
  }

  /**
   * Build PTCF (Persona, Task, Context, Format) prompt
   */
  private buildPTCFPrompt(request: GenerateCopyInput, variationNumber: number): string {
    const limits = PLATFORM_LIMITS[request.platform];

    // PERSONA
    const persona = `You are an expert social media ad copywriter specializing in ${request.platform} advertising. You have 10+ years of experience writing conversion-focused copy for ${request.industry} brands. You understand platform algorithms, user behavior, and what drives engagement.`;

    // TASK
    const framework = request.framework === 'auto' || !request.framework ?
      'the most effective copywriting framework for this campaign' :
      request.framework.toUpperCase();

    const task = `Write compelling ad copy variation #${variationNumber} for a ${request.platform} advertisement using ${framework} framework. This copy must grab attention in 3-8 seconds, resonate with the target audience, and drive them to take action.`;

    // CONTEXT
    const context = `
PRODUCT INFORMATION:
- Name: ${request.productName}
- Description: ${request.productDescription}
${request.productBenefits ? `- Key Benefits: ${request.productBenefits.join(', ')}` : ''}
${request.uniqueValueProp ? `- Unique Value: ${request.uniqueValueProp}` : ''}
- Industry: ${request.industry}

${request.campaignObjective ? `CAMPAIGN GOAL: ${request.campaignObjective.toUpperCase()}` : ''}

TARGET AUDIENCE:
${request.targetAudience ? `
- Demographics: ${request.targetAudience.demographics}
- Psychographics: ${request.targetAudience.psychographics}
- Pain Points: ${request.targetAudience.painPoints.join(', ')}
` : 'General audience - use broad appeal messaging'}

BRAND VOICE & TONE:
${request.brandVoice ? `
- Core Principles: ${request.brandVoice.principles.join(', ')}
- Words to USE: ${request.brandVoice.wordsToUse?.join(', ') || 'N/A'}
- Words to AVOID: ${request.brandVoice.wordsToAvoid?.join(', ') || 'N/A'}
` : `Tone: ${request.tone.charAt(0).toUpperCase() + request.tone.slice(1)}`}

${request.socialProof ? `
SOCIAL PROOF (incorporate if relevant):
${request.socialProof.testimonial || ''}
${request.socialProof.stats || ''}
` : ''}

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
    return `${persona}\n\n${task}\n\n${context}\n\nIMPORTANT: Return ONLY valid JSON matching the schema. No markdown, no explanations.`;
  }

  /**
   * Build PTCF prompt with RAG context (enhanced version)
   */
  private buildPTCFPromptWithRAG(
    request: GenerateCopyInput,
    variationNumber: number,
    ragContext: string
  ): string {
    const limits = PLATFORM_LIMITS[request.platform];

    // PERSONA
    const persona = `You are an expert social media ad copywriter specializing in ${request.platform} advertising. You have 10+ years of experience writing conversion-focused copy for ${request.industry} brands. You understand platform algorithms, user behavior, and what drives engagement.`;

    // TASK
    const framework = request.framework === 'auto' || !request.framework ?
      'the most effective copywriting framework for this campaign' :
      request.framework.toUpperCase();

    const task = `Write compelling ad copy variation #${variationNumber} for a ${request.platform} advertisement using ${framework} framework. This copy must grab attention in 3-8 seconds, resonate with the target audience, and drive them to take action.`;

    // RAG CONTEXT (NEW!)
    const ragSection = ragContext ? `
📚 REFERENCE MATERIALS FROM KNOWLEDGE BASE:
${ragContext}

IMPORTANT: Use these reference materials as inspiration and context, but do NOT copy them directly. Adapt the successful patterns, hooks, and approaches to match THIS specific product and audience.
` : '';

    // CONTEXT (same as before)
    const context = `
PRODUCT INFORMATION:
- Name: ${request.productName}
- Description: ${request.productDescription}
${request.productBenefits ? `- Key Benefits: ${request.productBenefits.join(', ')}` : ''}
${request.uniqueValueProp ? `- Unique Value: ${request.uniqueValueProp}` : ''}
- Industry: ${request.industry}

${request.campaignObjective ? `CAMPAIGN GOAL: ${request.campaignObjective.toUpperCase()}` : ''}

TARGET AUDIENCE:
${request.targetAudience ? `
- Demographics: ${request.targetAudience.demographics}
- Psychographics: ${request.targetAudience.psychographics}
- Pain Points: ${request.targetAudience.painPoints.join(', ')}
` : 'General audience - use broad appeal messaging'}

BRAND VOICE & TONE:
${request.brandVoice ? `
- Core Principles: ${request.brandVoice.principles.join(', ')}
- Words to USE: ${request.brandVoice.wordsToUse?.join(', ') || 'N/A'}
- Words to AVOID: ${request.brandVoice.wordsToAvoid?.join(', ') || 'N/A'}
` : `Tone: ${request.tone.charAt(0).toUpperCase() + request.tone.slice(1)}`}

${request.socialProof ? `
SOCIAL PROOF (incorporate if relevant):
${request.socialProof.testimonial || ''}
${request.socialProof.stats || ''}
` : ''}

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
  private getFrameworkGuidance(framework: string, objective?: string): string {
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

    return frameworks[framework.toLowerCase()] || frameworks.aida;
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
    const limits = PLATFORM_LIMITS[platform];

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
>>>>>>> 154999650a04bb9973c5cddeae01dd5ce52ab181
