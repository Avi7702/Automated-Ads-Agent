import { GoogleGenAI } from "@google/genai";
import { storage } from "../storage";
import type { InsertAdCopy, AdCopy } from "@shared/schema";

const copywritingApiKey = process.env.GOOGLE_API_KEY_TEST || process.env.GOOGLE_API_KEY;
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
  headline: string;
  hook: string;
  bodyText: string;
  cta: string;
  caption: string;
  hashtags: string[];
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
