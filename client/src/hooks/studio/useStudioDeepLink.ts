/**
 * useStudioDeepLink — Parse query params for template/plan deep linking
 */
import { useState, useEffect, useCallback } from 'react';
import { getTemplateById, type ContentTemplate } from '@shared/contentTemplates';
import type {
  Product,
  AdSceneTemplate,
  GenerationMode,
  IdeaBankMode,
  PlanContext,
  SelectedSuggestion,
  GenerationRecipe,
} from './types';

interface UseStudioDeepLinkDeps {
  templates: AdSceneTemplate[];
  products: Product[];
  prompt: string;
  setPrompt: (p: string) => void;
  setPlatform: (p: string) => void;
  setAspectRatio: (ar: string) => void;
  setSelectedProducts: (products: Product[]) => void;
  setGeneratedCopy: (copy: string) => void;
  setGeneratedImage: (url: string | null) => void;
  setGeneratedImageUrl: (url: string | null) => void;
  setSelectedTemplate: (t: AdSceneTemplate | null) => void;
  setTempUploads: (uploads: never[]) => void;
  setEditPrompt: (p: string) => void;
  setAskAIResponse: (r: string | null) => void;
  setGenerationId: (id: string | null) => void;
  setState: (state: 'idle' | 'generating' | 'result') => void;
  setSelectedSuggestion: (s: SelectedSuggestion | null) => void;
  setGenerationRecipe: (r: GenerationRecipe | undefined) => void;
}

export function useStudioDeepLink(deps: UseStudioDeepLinkDeps) {
  const [cpTemplate, setCpTemplate] = useState<ContentTemplate | null>(null);
  const [showCarouselBuilder, setShowCarouselBuilder] = useState(false);
  const [carouselTopic, setCarouselTopic] = useState('');
  const [showBeforeAfterBuilder, setShowBeforeAfterBuilder] = useState(false);
  const [beforeAfterTopic, setBeforeAfterTopic] = useState('');
  const [showTextOnlyMode, setShowTextOnlyMode] = useState(false);
  const [textOnlyTopic, setTextOnlyTopic] = useState('');

  // ── Idea Bank Mode ────────────────────────────────────
  const [ideaBankMode, setIdeaBankMode] = useState<IdeaBankMode>('freestyle');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('standard');
  const [selectedTemplateForMode, setSelectedTemplateForMode] = useState<AdSceneTemplate | null>(null);

  // ── Suggestion / Recipe ───────────────────────────────
  const [selectedSuggestion, setSelectedSuggestion] = useState<SelectedSuggestion | null>(null);
  const [generationRecipe, setGenerationRecipe] = useState<GenerationRecipe | undefined>(undefined);

  // ── Weekly Plan Context ──────────────────────────────
  const [planContext, setPlanContext] = useState<PlanContext | null>(null);

  // Parse query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cpTemplateId = params.get('cpTemplateId');
    const freshStart = params.get('fresh') === 'true';

    if (freshStart && cpTemplateId) {
      deps.setSelectedProducts([]);
      deps.setGeneratedCopy('');
      deps.setGeneratedImage(null);
      deps.setGeneratedImageUrl(null);
      deps.setPrompt('');
      deps.setSelectedTemplate(null);
      deps.setTempUploads([]);
      deps.setEditPrompt('');
      deps.setAskAIResponse(null);
      deps.setGenerationId(null);
      deps.setState('idle');
      setSelectedSuggestion(null);
      setGenerationRecipe(undefined);
      setCpTemplate(null);
      localStorage.removeItem('studio-prompt-draft');

      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('fresh');
      const newUrl = newParams.toString() ? `?${newParams.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    const templateId = params.get('templateId');
    const mode = params.get('mode');
    if (templateId && deps.templates.length > 0) {
      const template = deps.templates.find((t) => t.id === templateId);
      if (template) {
        setSelectedTemplateForMode(template);
        setIdeaBankMode('template');
        if (mode && ['exact_insert', 'inspiration'].includes(mode)) {
          setGenerationMode(mode as GenerationMode);
        } else {
          setGenerationMode('exact_insert');
        }
      }
    }

    if (cpTemplateId && !cpTemplate) {
      const contentPlannerTemplate = getTemplateById(cpTemplateId);
      if (contentPlannerTemplate) {
        setCpTemplate(contentPlannerTemplate);
        const bestPlatformEntry = contentPlannerTemplate.bestPlatforms[0];
        if (bestPlatformEntry) {
          const bestPlatform = bestPlatformEntry.platform;
          const platformMap: Record<string, string> = {
            linkedin: 'LinkedIn',
            instagram: 'Instagram',
            facebook: 'Facebook',
            twitter: 'Twitter',
            tiktok: 'TikTok',
          };
          const mappedPlatform = platformMap[bestPlatform?.toLowerCase()] || bestPlatform || 'LinkedIn';
          deps.setPlatform(mappedPlatform);

          const format = bestPlatformEntry.format;
          const formatLower = (format || '').toLowerCase();
          const formatAspectRatioMap = {
            carousel: '1080x1350',
            reel: '1080x1920',
            story: '1080x1920',
            video: '1920x1080',
            post: '1200x627',
          } as const;
          let detectedRatio = '1200x627';
          if (formatLower.includes('carousel')) detectedRatio = formatAspectRatioMap.carousel;
          else if (formatLower.includes('reel') || formatLower.includes('story'))
            detectedRatio = formatAspectRatioMap.reel;
          else if (formatLower.includes('video')) detectedRatio = formatAspectRatioMap.video;
          else detectedRatio = formatAspectRatioMap.post;
          deps.setAspectRatio(detectedRatio);
        }
        const firstTopic = contentPlannerTemplate.exampleTopics[0];
        if (firstTopic && !deps.prompt) {
          deps.setPrompt(firstTopic);
        }
      }
    }

    const suggestedPrompt = params.get('suggestedPrompt');
    if (suggestedPrompt && !deps.prompt && !cpTemplateId) {
      deps.setPrompt(suggestedPrompt);
    }

    // Weekly Plan deep-link
    const planId = params.get('planId');
    const postIndexParam = params.get('postIndex');
    if (planId && postIndexParam !== null && !planContext) {
      const postIdx = Number(postIndexParam);
      fetch(`/api/planner/weekly/current`, { credentials: 'include' })
        .then((res) => res.json())
        .then((plan) => {
          if (!plan || !plan.posts) return;
          const post = plan.posts[postIdx];
          if (!post) return;

          setPlanContext({
            planId: plan.id || planId,
            postIndex: postIdx,
            briefing: post.briefing || '',
            category: post.category || '',
            dayOfWeek: post.dayOfWeek || '',
          });

          if (post.productIds && post.productIds.length > 0 && deps.products.length > 0) {
            const planProducts = deps.products.filter((p) => post.productIds.includes(String(p.id)));
            if (planProducts.length > 0) deps.setSelectedProducts(planProducts);
          }

          if (post.platform) {
            const platformMap: Record<string, string> = {
              linkedin: 'LinkedIn',
              instagram: 'Instagram',
              facebook: 'Facebook',
              twitter: 'Twitter',
              tiktok: 'TikTok',
            };
            const mapped = platformMap[post.platform.toLowerCase()] || 'LinkedIn';
            deps.setPlatform(mapped);
          }

          if (post.briefing) {
            deps.setPrompt(post.briefing);
          }

          const newParams = new URLSearchParams(window.location.search);
          newParams.delete('planId');
          newParams.delete('postIndex');
          const newUrl = newParams.toString() ? `?${newParams.toString()}` : window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        })
        .catch(console.error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- setters on deps are stable and intentionally omitted.
  }, [deps.templates, deps.prompt, cpTemplate, deps.products, planContext]);

  const clearPlanContext = useCallback(() => {
    setPlanContext(null);
  }, []);

  const handleSelectSuggestion = useCallback(
    (suggestionPrompt: string, suggestionId?: string, reasoning?: string) => {
      deps.setPrompt(suggestionPrompt);
      setSelectedSuggestion({ id: suggestionId || 'selected', prompt: suggestionPrompt, reasoning });
      setTimeout(() => {
        document.getElementById('prompt')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    },
    [deps],
  );

  const handlePromptChange = useCallback(
    (value: string) => {
      deps.setPrompt(value);
      if (selectedSuggestion && value !== selectedSuggestion.prompt) {
        setSelectedSuggestion(null);
      }
    },
    [selectedSuggestion, deps],
  );

  return {
    // State
    cpTemplate,
    showCarouselBuilder,
    carouselTopic,
    showBeforeAfterBuilder,
    beforeAfterTopic,
    showTextOnlyMode,
    textOnlyTopic,
    ideaBankMode,
    generationMode,
    selectedTemplateForMode,
    selectedSuggestion,
    generationRecipe,
    planContext,

    // Setters
    setCpTemplate,
    setShowCarouselBuilder,
    setCarouselTopic,
    setShowBeforeAfterBuilder,
    setBeforeAfterTopic,
    setShowTextOnlyMode,
    setTextOnlyTopic,
    setIdeaBankMode,
    setGenerationMode,
    setSelectedTemplateForMode,
    setSelectedSuggestion,
    setGenerationRecipe,
    setPlanContext,
    clearPlanContext,

    // Handlers
    handleSelectSuggestion,
    handlePromptChange,
  };
}
