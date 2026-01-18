/**
 * Carousel Outline Service
 *
 * Generates structured slide outlines for carousel content.
 * Uses AI to create a narrative flow with hook, points, and CTA.
 *
 * 2026 Best Practices (Research-based):
 * - Optimal slide count: 7 (sweet spot, 5-10 range)
 * - First slide critical: 80% of engagement comes from slide 1
 * - One idea per slide: Dense text = ignored content
 * - Mobile-first design: Large fonts, minimal text
 * - Engagement prompts: "Save this", "Swipe →", questions in CTA
 * - Educational = highest engagement (4.7% avg vs 3.9% product)
 * - Authenticity > Perfection: Raw, honest content outperforms polished
 *
 * Sources:
 * - SocialInsider LinkedIn Benchmarks 2025
 * - SocialPilot, Neal Schaffer LinkedIn Carousel Guides 2026
 * - StackInfluence Instagram Carousel Guide 2026
 */

import { logger } from '../lib/logger';
import { generateContentWithRetry } from '../lib/geminiClient';
import { getTemplateById } from '../../shared/contentTemplates';

// Slide purposes for carousel structure
type SlidePurpose = 'hook' | 'problem' | 'point' | 'solution' | 'proof' | 'cta';

interface CarouselSlide {
  slideNumber: number;
  purpose: SlidePurpose;
  headline: string;
  body: string;
  imagePrompt: string;
}

interface CarouselOutline {
  title: string;
  description: string;
  slideCount: number;
  slides: CarouselSlide[];
  captionCopy: string;
  hashtags: string[];
}

interface GenerateCarouselOutlineInput {
  templateId: string;
  topic: string;
  slideCount: number;
  platform: string;
  productNames?: string[];
}

class CarouselOutlineService {
  /**
   * Generate a carousel outline with slides
   */
  async generateOutline(input: GenerateCarouselOutlineInput): Promise<CarouselOutline> {
    const { templateId, topic, slideCount, platform, productNames = [] } = input;

    // Get template context
    const template = getTemplateById(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Build the slide structure based on count
    const slideStructure = this.getSlideStructure(slideCount);

    const prompt = this.buildOutlinePrompt({
      template,
      topic,
      slideCount,
      platform,
      productNames,
      slideStructure,
    });

    logger.info(
      { templateId, topic, slideCount, platform },
      '[CarouselOutline] Generating outline'
    );

    try {
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
            temperature: 0.7,
            maxOutputTokens: 4000,
          },
        },
        { operation: 'carousel_outline_generation' }
      );

      // Extract text from response
      const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const outline = this.parseOutlineResponse(responseText, slideCount, topic);

      logger.info(
        { slides: outline.slides.length },
        '[CarouselOutline] Generated outline successfully'
      );

      return outline;
    } catch (error) {
      logger.error({ err: error }, '[CarouselOutline] Failed to generate outline');
      throw error;
    }
  }

  /**
   * Get recommended slide structure based on count
   * 2026 Research: 7 slides is the sweet spot (5-10 range optimal)
   */
  private getSlideStructure(slideCount: number): { purpose: SlidePurpose; label: string }[] {
    // 5-slide structure (minimum effective)
    if (slideCount === 5) {
      return [
        { purpose: 'hook', label: 'Hook - Stop the scroll (80% of engagement!)' },
        { purpose: 'problem', label: 'Problem - The pain point they face' },
        { purpose: 'point', label: 'Solution - Your key insight' },
        { purpose: 'proof', label: 'Proof - Evidence or example' },
        { purpose: 'cta', label: 'CTA - Save/Share prompt' },
      ];
    }

    // 6-slide structure
    if (slideCount === 6) {
      return [
        { purpose: 'hook', label: 'Hook - Stop the scroll (80% of engagement!)' },
        { purpose: 'problem', label: 'Problem - The pain point' },
        { purpose: 'point', label: 'Point 1 - First insight' },
        { purpose: 'point', label: 'Point 2 - Second insight' },
        { purpose: 'solution', label: 'Solution - The answer' },
        { purpose: 'cta', label: 'CTA - Engagement prompt' },
      ];
    }

    // 7-slide structure (2026 SWEET SPOT - highest engagement)
    if (slideCount === 7) {
      return [
        { purpose: 'hook', label: 'Hook - Bold claim or question (CRITICAL!)' },
        { purpose: 'problem', label: 'Problem - Agitate the pain point' },
        { purpose: 'point', label: 'Point 1 - First key insight' },
        { purpose: 'point', label: 'Point 2 - Second key insight' },
        { purpose: 'point', label: 'Point 3 - Third key insight' },
        { purpose: 'solution', label: 'Solution - The takeaway' },
        { purpose: 'cta', label: 'CTA - Save this + question' },
      ];
    }

    // 8-slide structure
    if (slideCount === 8) {
      return [
        { purpose: 'hook', label: 'Hook - Grab attention immediately' },
        { purpose: 'problem', label: 'Problem - What pain point?' },
        { purpose: 'point', label: 'Point 1 - First insight' },
        { purpose: 'point', label: 'Point 2 - Second insight' },
        { purpose: 'point', label: 'Point 3 - Third insight' },
        { purpose: 'proof', label: 'Proof - Evidence/example' },
        { purpose: 'solution', label: 'Solution - The answer' },
        { purpose: 'cta', label: 'CTA - Call to action' },
      ];
    }

    // 10-slide structure (max recommended)
    const structure: { purpose: SlidePurpose; label: string }[] = [
      { purpose: 'hook', label: 'Hook - Stop the scroll' },
      { purpose: 'problem', label: 'Problem - The pain point' },
      { purpose: 'point', label: 'Point 1 - First insight' },
      { purpose: 'point', label: 'Point 2 - Second insight' },
      { purpose: 'point', label: 'Point 3 - Third insight' },
      { purpose: 'point', label: 'Point 4 - Fourth insight' },
      { purpose: 'proof', label: 'Proof - Evidence' },
      { purpose: 'proof', label: 'Proof 2 - More evidence' },
      { purpose: 'solution', label: 'Solution - The takeaway' },
      { purpose: 'cta', label: 'CTA - Engagement prompt' },
    ];
    return structure.slice(0, slideCount);
  }

  /**
   * Build the prompt for generating carousel outline
   */
  private buildOutlinePrompt(params: {
    template: NonNullable<ReturnType<typeof getTemplateById>>;
    topic: string;
    slideCount: number;
    platform: string;
    productNames: string[];
    slideStructure: { purpose: SlidePurpose; label: string }[];
  }): string {
    const { template, topic, slideCount, platform, productNames, slideStructure } = params;

    const productContext = productNames.length > 0
      ? `Products to feature: ${productNames.join(', ')}`
      : 'No specific products - focus on the topic itself';

    const hookFormulas = template.hookFormulas.slice(0, 3).join('\n  - ');

    return `You are a social media content strategist specializing in ${platform} carousels in 2026.

Create a ${slideCount}-slide carousel outline for the following:

TOPIC: ${topic}
CATEGORY: ${template.category} - ${template.title}
PLATFORM: ${platform}
${productContext}

TEMPLATE CONTEXT:
- Description: ${template.description}
- Hook formulas to use:
  - ${hookFormulas}
- Post structure: ${template.postStructure}
- What to avoid: ${template.whatToAvoid.join(', ')}

SLIDE STRUCTURE:
${slideStructure.map((s, i) => `Slide ${i + 1}: ${s.label} (${s.purpose})`).join('\n')}

For each slide, provide:
1. HEADLINE: Bold text (max 40 chars) - ONE main idea, mobile-readable
2. BODY: Supporting text (max 100 chars) - explains the headline concisely
3. IMAGE_PROMPT: A detailed prompt for generating a visual (max 200 chars)

Also provide:
- CAPTION: The post caption for ${platform} (max 300 chars) with engagement prompts
- HASHTAGS: 5 relevant hashtags

2026 CAROUSEL BEST PRACTICES (MUST FOLLOW):
1. SLIDE 1 IS CRITICAL: 80% of engagement comes from the first slide!
   - Use bold claims, surprising stats, or curiosity-provoking questions
   - Make people STOP scrolling immediately

2. ONE IDEA PER SLIDE: Dense text = ignored content
   - Max 40 chars headline, 100 chars body
   - Large, readable fonts assumed

3. VISUAL RHYTHM: Mix text-first with image-led slides
   - Don't make every slide look the same
   - Keep brand consistency but vary composition

4. AUTHENTIC > POLISHED: Raw, honest content outperforms perfect content in 2026
   - Write like a real person, not marketing copy
   - Share genuine insights, not corporate speak

5. ENGAGEMENT PROMPTS in CTA:
   - Include "📌 Save this" or "Swipe 👉"
   - End with a question to prompt comments
   - Educational content gets 4.7% engagement vs 3.9% for product

6. STORY FLOW: Each slide must connect to create a cohesive narrative
   - Not random tips - a logical progression
   - Build tension then resolve it

Respond in this exact JSON format:
{
  "title": "Carousel title",
  "description": "Brief description of the carousel",
  "slides": [
    {
      "slideNumber": 1,
      "purpose": "hook",
      "headline": "Stop doing this mistake",
      "body": "Most contractors waste money on...",
      "imagePrompt": "Professional construction site with warning sign, orange safety cones, dramatic lighting"
    }
  ],
  "captionCopy": "The post caption...",
  "hashtags": ["construction", "tips", "contractor", "building", "proadvice"]
}`;
  }

  /**
   * Parse the AI response into structured outline
   */
  private parseOutlineResponse(response: string, expectedSlides: number, topic: string): CarouselOutline {
    try {
      // Extract JSON from response (might be wrapped in markdown code blocks)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate structure
      if (!parsed.slides || !Array.isArray(parsed.slides)) {
        throw new Error('Invalid slides structure');
      }

      // Ensure we have the right number of slides
      const slides: CarouselSlide[] = parsed.slides.slice(0, expectedSlides).map((slide: any, index: number) => ({
        slideNumber: index + 1,
        purpose: slide.purpose || 'point',
        headline: String(slide.headline || '').slice(0, 100),
        body: String(slide.body || '').slice(0, 200),
        imagePrompt: String(slide.imagePrompt || '').slice(0, 300),
      }));

      return {
        title: String(parsed.title || topic).slice(0, 100),
        description: String(parsed.description || '').slice(0, 300),
        slideCount: slides.length,
        slides,
        captionCopy: String(parsed.captionCopy || '').slice(0, 500),
        hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 10) : [],
      };
    } catch (error) {
      logger.error(
        { err: error, response: response.slice(0, 500) },
        '[CarouselOutline] Failed to parse response'
      );

      // Return a fallback structure
      return this.generateFallbackOutline(topic, expectedSlides);
    }
  }

  /**
   * Generate fallback outline if AI response parsing fails
   */
  private generateFallbackOutline(topic: string, slideCount: number): CarouselOutline {
    const structure = this.getSlideStructure(slideCount);

    return {
      title: topic,
      description: `A carousel about ${topic}`,
      slideCount,
      slides: structure.map((s, i) => ({
        slideNumber: i + 1,
        purpose: s.purpose,
        headline: `${s.label}`,
        body: `Content about ${topic}...`,
        imagePrompt: `Professional image related to ${topic}, clean design, ${s.purpose} visual`,
      })),
      captionCopy: `Learn more about ${topic}. Save this for later!`,
      hashtags: ['tips', 'howto', 'learn', 'guide', 'professional'],
    };
  }
}

// Export singleton instance
export const carouselOutlineService = new CarouselOutlineService();

export type { CarouselOutline, CarouselSlide, GenerateCarouselOutlineInput };
