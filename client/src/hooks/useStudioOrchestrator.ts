// @ts-nocheck
/**
 * useStudioOrchestrator — Extracted from Studio.tsx
 *
 * Holds ALL state, effects, handlers, and queries for the Studio page.
 * This hook makes it possible to decompose the Studio UI into small components
 * while keeping a single source of truth for state.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { cn, getProductImageUrl } from '@/lib/utils';
import { getCsrfToken } from '@/lib/queryClient';
import type { Product, PerformingAdTemplate, AdSceneTemplate } from '@shared/schema';
import type { GenerationDTO } from '@shared/types/api';
import type { GenerationRecipe, GenerationMode, IdeaBankMode } from '@shared/types/ideaBank';
import type { AnalyzedUpload } from '@/types/analyzedUpload';
import { getTemplateById, type ContentTemplate } from '@shared/contentTemplates';
import { toast } from 'sonner';
import { useHistoryPanelUrl } from '@/hooks/useUrlState';
import { useHaptic } from '@/hooks/useHaptic';
import { useKeyboardShortcuts, type ShortcutConfig } from '@/hooks/useKeyboardShortcuts';

// Types
export type GenerationState = 'idle' | 'generating' | 'result';

export interface CopyResult {
  headline: string;
  hook: string;
  bodyText: string;
  cta: string;
  caption: string;
  hashtags: string[];
  framework: string;
}

interface CollapsedSections {
  upload: boolean;
  products: boolean;
  templates: boolean;
  refine: boolean;
  copy: boolean;
  preview: boolean;
  styleRefs: boolean;
}

const COLLAPSED_SECTIONS_KEY = 'studio-collapsed-sections';

function getStoredCollapsedSections(): CollapsedSections {
  try {
    const stored = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return {
    upload: false,
    products: false,
    templates: false,
    refine: false,
    copy: true,
    preview: true,
    styleRefs: false,
  };
}

function storeCollapsedSections(sections: CollapsedSections) {
  try {
    localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(sections));
  } catch {}
}

export function useStudioOrchestrator() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const { haptic } = useHaptic();

  // ── Generation State ──────────────────────────────────
  const [state, setState] = useState<GenerationState>('idle');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ── Selection State ───────────────────────────────────
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AdSceneTemplate | null>(null);
  const [templateCategory, setTemplateCategory] = useState('all');
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState('LinkedIn');
  const [aspectRatio, setAspectRatio] = useState('1200x627');
  const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('2K');
  const [selectedStyleRefIds, setSelectedStyleRefIds] = useState<string[]>([]);

  // ── UI State ──────────────────────────────────────────
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>(getStoredCollapsedSections);
  const [currentSection, setCurrentSection] = useState('products');
  const [showContextBar, setShowContextBar] = useState(false);
  const [showStickyGenerate, setShowStickyGenerate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeActionButton, setActiveActionButton] = useState<'edit' | 'copy' | 'preview' | 'save' | null>(null);

  // ── Quick Start ───────────────────────────────────────
  const [quickStartMode, setQuickStartMode] = useState(false);
  const [quickStartPrompt, setQuickStartPrompt] = useState('');

  // ── Temporary Uploads ─────────────────────────────────
  const [tempUploads, setTempUploads] = useState<AnalyzedUpload[]>([]);

  // ── Price Estimate ────────────────────────────────────
  const [priceEstimate, setPriceEstimate] = useState<{
    estimatedCost: number;
    p90: number;
    sampleCount: number;
    usedFallback: boolean;
  } | null>(null);

  // ── Edit / Ask AI ─────────────────────────────────────
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [askAIQuestion, setAskAIQuestion] = useState('');
  const [askAIResponse, setAskAIResponse] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);

  // ── Ad Copy ───────────────────────────────────────────
  const [generatedCopy, setGeneratedCopy] = useState('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedCopyFull, setGeneratedCopyFull] = useState<CopyResult | null>(null);

  // ── Dialogs ───────────────────────────────────────────
  const [showSaveToCatalog, setShowSaveToCatalog] = useState(false);
  const [showTemplateInspiration, setShowTemplateInspiration] = useState(false);
  const [selectedPerformingTemplate, setSelectedPerformingTemplate] = useState<PerformingAdTemplate | null>(null);

  // ── Suggestion / Recipe ───────────────────────────────
  const [selectedSuggestion, setSelectedSuggestion] = useState<{
    id: string;
    prompt: string;
    reasoning?: string;
  } | null>(null);
  const [generationRecipe, setGenerationRecipe] = useState<GenerationRecipe | undefined>(undefined);
  const [ideaBankMode, setIdeaBankMode] = useState<IdeaBankMode>('freestyle');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('standard');
  const [selectedTemplateForMode, setSelectedTemplateForMode] = useState<AdSceneTemplate | null>(null);

  // ── Weekly Plan Context ──────────────────────────────
  const [planContext, setPlanContext] = useState<{
    planId: string;
    postIndex: number;
    briefing: string;
    category: string;
    dayOfWeek: string;
  } | null>(null);

  // ── Content Planner ───────────────────────────────────
  const [cpTemplate, setCpTemplate] = useState<ContentTemplate | null>(null);
  const [showCarouselBuilder, setShowCarouselBuilder] = useState(false);
  const [carouselTopic, setCarouselTopic] = useState('');
  const [showBeforeAfterBuilder, setShowBeforeAfterBuilder] = useState(false);
  const [beforeAfterTopic, setBeforeAfterTopic] = useState('');
  const [showTextOnlyMode, setShowTextOnlyMode] = useState(false);
  const [textOnlyTopic, setTextOnlyTopic] = useState('');
  const [showCanvasEditor, setShowCanvasEditor] = useState(false);

  // ── Video Mode ──────────────────────────────────────
  const [mediaMode, setMediaMode] = useState<'image' | 'video'>('image');
  const [videoDuration, setVideoDuration] = useState<'4' | '6' | '8'>('8');
  const [videoJobId, setVideoJobId] = useState<string | null>(null);
  const [generatedMediaType, setGeneratedMediaType] = useState<'image' | 'video'>('image');

  // ── History Panel ─────────────────────────────────────
  const { isHistoryOpen, selectedGenerationId, openHistory, closeHistory, selectGeneration } = useHistoryPanelUrl();
  const [historyPanelOpen, setHistoryPanelOpen] = useState(isHistoryOpen);

  // ── UX Feedback ───────────────────────────────────────
  const [justCopied, setJustCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  // ── Refs ──────────────────────────────────────────────
  const generateButtonRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);
  const videoPollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Queries ───────────────────────────────────────────
  const { data: authUser } = useQuery({
    queryKey: ['auth'],
    queryFn: async () => {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: async () => {
      const res = await fetch('/api/products');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : data?.products || [];
    },
  });

  const { data: templates = [] } = useQuery<AdSceneTemplate[]>({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates');
      if (!res.ok) return [];
      const data = await res.json();
      return data.templates || [];
    },
  });

  const { data: featuredAdTemplates = [], isLoading: isLoadingFeatured } = useQuery<PerformingAdTemplate[]>({
    queryKey: ['performing-ad-templates-featured'],
    queryFn: async () => {
      const res = await fetch('/api/performing-ad-templates/featured', { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showTemplateInspiration,
  });

  // ── Derived State ─────────────────────────────────────
  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
        return matchesSearch && matchesCategory;
      }),
    [products, searchQuery, categoryFilter],
  );

  const categories = useMemo(
    () => ['all', ...Array.from(new Set(products.map((p) => p.category).filter((c): c is string => !!c)))],
    [products],
  );

  const progressSections = useMemo(
    () => [
      { id: 'upload', label: 'Upload', completed: tempUploads.length > 0 },
      { id: 'products', label: 'Products', completed: selectedProducts.length > 0 },
      { id: 'templates', label: 'Style', completed: !!selectedTemplate },
      { id: 'prompt', label: 'Prompt', completed: !!prompt.trim() },
      { id: 'generate', label: 'Generate', completed: state === 'result' },
      { id: 'result', label: 'Result', completed: state === 'result' },
    ],
    [tempUploads.length, selectedProducts.length, selectedTemplate, prompt, state],
  );

  const canGenerate = useMemo(
    () => (selectedProducts.length > 0 || tempUploads.length > 0) && prompt.trim().length > 0,
    [selectedProducts.length, tempUploads.length, prompt],
  );

  // ── Effects ───────────────────────────────────────────

  // Persist collapsed sections
  useEffect(() => {
    storeCollapsedSections(collapsedSections);
  }, [collapsedSections]);

  // Auto-save draft prompt
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (prompt) localStorage.setItem('studio-prompt-draft', prompt);
    }, 500);
    return () => clearTimeout(timeout);
  }, [prompt]);

  // Restore draft on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem('studio-prompt-draft');
    if (savedPrompt && !prompt) setPrompt(savedPrompt);
  }, []);

  // Sync history panel URL state
  useEffect(() => {
    setHistoryPanelOpen(isHistoryOpen);
  }, [isHistoryOpen]);

  // Zoom wheel handler
  useEffect(() => {
    const container = zoomContainerRef.current;
    if (!container) return;
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setImageScale((prev) => Math.max(0.5, Math.min(3, prev + delta)));
    };
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Load generation from URL
  useEffect(() => {
    if (selectedGenerationId && !generatedImage) {
      fetch(`/api/generations/${selectedGenerationId}`, { credentials: 'include' })
        .then((res) => res.json())
        .then((data) => {
          if (data.imageUrl) {
            setGeneratedImage(data.imageUrl);
            setGenerationId(data.id);
            setPrompt(data.prompt || '');
            setState('result');
          }
        })
        .catch(console.error);
    }
  }, [selectedGenerationId, generatedImage]);

  // Price estimate
  useEffect(() => {
    const inputImagesCount = selectedProducts.length + tempUploads.length;
    const promptChars = prompt.length;
    if (inputImagesCount === 0 && promptChars === 0) {
      setPriceEstimate(null);
      return;
    }
    const debounceTimer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({
          resolution,
          operation: 'generate',
          inputImagesCount: String(inputImagesCount),
          promptChars: String(promptChars),
        });
        const res = await fetch(`/api/pricing/estimate?${params}`);
        if (res.ok) setPriceEstimate(await res.json());
      } catch {}
    }, 300);
    return () => clearTimeout(debounceTimer);
  }, [selectedProducts.length, tempUploads.length, prompt.length, resolution]);

  // Parse query params for template/pattern deep linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cpTemplateId = params.get('cpTemplateId');
    const freshStart = params.get('fresh') === 'true';

    if (freshStart && cpTemplateId) {
      setSelectedProducts([]);
      setGeneratedCopy('');
      setGeneratedImage(null);
      setGeneratedImageUrl(null);
      setPrompt('');
      setSelectedTemplate(null);
      setTempUploads([]);
      setEditPrompt('');
      setAskAIResponse(null);
      setGenerationId(null);
      setState('idle');
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
    if (templateId && templates.length > 0) {
      const template = templates.find((t) => t.id === templateId);
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
        if (contentPlannerTemplate.bestPlatforms.length > 0) {
          const bestPlatform = contentPlannerTemplate.bestPlatforms[0].platform;
          const platformMap: Record<string, string> = {
            linkedin: 'LinkedIn',
            instagram: 'Instagram',
            facebook: 'Facebook',
            twitter: 'Twitter',
            tiktok: 'TikTok',
          };
          const mappedPlatform = platformMap[bestPlatform?.toLowerCase()] || bestPlatform || 'LinkedIn';
          setPlatform(mappedPlatform);

          const format = contentPlannerTemplate.bestPlatforms[0]?.format;
          const formatLower = (format || '').toLowerCase();
          const formatAspectRatioMap: Record<string, string> = {
            carousel: '1080x1350',
            reel: '1080x1920',
            story: '1080x1920',
            video: '1920x1080',
            post: '1200x627',
          };
          let detectedRatio = '1200x627';
          if (formatLower.includes('carousel')) detectedRatio = formatAspectRatioMap.carousel;
          else if (formatLower.includes('reel') || formatLower.includes('story'))
            detectedRatio = formatAspectRatioMap.reel;
          else if (formatLower.includes('video')) detectedRatio = formatAspectRatioMap.video;
          else detectedRatio = formatAspectRatioMap.post;
          setAspectRatio(detectedRatio);
        }
        if (contentPlannerTemplate.exampleTopics.length > 0 && !prompt) {
          setPrompt(contentPlannerTemplate.exampleTopics[0]);
        }
      }
    }

    const suggestedPrompt = params.get('suggestedPrompt');
    if (suggestedPrompt && !prompt && !cpTemplateId) {
      setPrompt(suggestedPrompt);
    }

    // Weekly Plan deep-link: /?planId=xxx&postIndex=2
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

          // Set plan context
          setPlanContext({
            planId: plan.id || planId,
            postIndex: postIdx,
            briefing: post.briefing || '',
            category: post.category || '',
            dayOfWeek: post.dayOfWeek || '',
          });

          // Auto-select products from plan
          if (post.productIds && post.productIds.length > 0 && products.length > 0) {
            const planProducts = products.filter((p) => post.productIds.includes(String(p.id)));
            if (planProducts.length > 0) setSelectedProducts(planProducts);
          }

          // Auto-set platform
          if (post.platform) {
            const platformMap: Record<string, string> = {
              linkedin: 'LinkedIn',
              instagram: 'Instagram',
              facebook: 'Facebook',
              twitter: 'Twitter',
              tiktok: 'TikTok',
            };
            const mapped = platformMap[post.platform.toLowerCase()] || 'LinkedIn';
            setPlatform(mapped);
          }

          // Auto-set prompt from briefing
          if (post.briefing) {
            setPrompt(post.briefing);
          }

          // Clean up URL params
          const newParams = new URLSearchParams(window.location.search);
          newParams.delete('planId');
          newParams.delete('postIndex');
          const newUrl = newParams.toString() ? `?${newParams.toString()}` : window.location.pathname;
          window.history.replaceState({}, '', newUrl);
        })
        .catch(console.error);
    }
  }, [templates, prompt, cpTemplate, products, planContext]);

  // Cleanup video polling on unmount
  useEffect(() => {
    return () => {
      if (videoPollIntervalRef.current) {
        clearInterval(videoPollIntervalRef.current);
        videoPollIntervalRef.current = null;
      }
      if (videoPollTimeoutRef.current) {
        clearTimeout(videoPollTimeoutRef.current);
        videoPollTimeoutRef.current = null;
      }
    };
  }, []);

  // Scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowContextBar(scrollY > 200 && state === 'idle');
      if (generateButtonRef.current) {
        const rect = generateButtonRef.current.getBoundingClientRect();
        setShowStickyGenerate(rect.bottom < 0 && state === 'idle');
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [state]);

  // ── Handlers ──────────────────────────────────────────

  const toggleProductSelection = useCallback((product: Product) => {
    setSelectedProducts((prev) => {
      const isSelected = prev.some((p) => p.id === product.id);
      if (isSelected) return prev.filter((p) => p.id !== product.id);
      if (prev.length >= 6) return prev;
      return [...prev, product];
    });
  }, []);

  const toggleSection = useCallback((section: keyof CollapsedSections) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  const navigateToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentSection(id);
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    const hasImages = selectedProducts.length > 0 || tempUploads.length > 0;
    // Auto-detect quick start: if quickStartPrompt has content, treat as quick start
    const isQuickStart = quickStartMode || (quickStartPrompt.trim().length > 0 && !hasImages);
    if (!hasImages && !isQuickStart) return;
    const finalPrompt = isQuickStart ? quickStartPrompt : prompt;
    if (!finalPrompt.trim()) return;

    setState('generating');

    // Create AbortController for this generation
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();

      if (!isQuickStart) {
        const filePromises = selectedProducts.map(async (product) => {
          const imageUrl = getProductImageUrl(product.cloudinaryUrl);
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          return new File([blob], `${product.name}.jpg`, { type: blob.type });
        });
        const files = await Promise.all(filePromises);
        files.forEach((file) => formData.append('images', file));
        tempUploads.forEach((upload) => formData.append('images', upload.file));
      }

      formData.append('prompt', finalPrompt);
      formData.append('resolution', resolution);

      if (ideaBankMode === 'template' && selectedTemplateForMode) {
        formData.append('mode', generationMode);
        formData.append('templateId', selectedTemplateForMode.id);
      }

      if (generationRecipe) {
        formData.append('recipe', JSON.stringify(generationRecipe));
      }

      if (selectedStyleRefIds.length > 0) {
        formData.append('styleReferenceIds', JSON.stringify(selectedStyleRefIds));
      }

      const token = await getCsrfToken().catch(() => '');
      const response = await fetch('/api/transform', {
        method: 'POST',
        headers: { 'x-csrf-token': token },
        credentials: 'include',
        body: formData,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to transform image');
      }

      const data = await response.json();
      setGeneratedImage(data.imageUrl);
      setGenerationId(data.generationId);
      setState('result');
      localStorage.removeItem('studio-prompt-draft');

      // Auto-update weekly plan post status if creating from plan
      if (planContext && data.generationId) {
        const csrfToken = await getCsrfToken().catch(() => '');
        fetch(`/api/planner/weekly/${planContext.planId}/posts/${planContext.postIndex}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrfToken },
          credentials: 'include',
          body: JSON.stringify({ status: 'generated', generationId: data.generationId }),
        }).catch(console.error);
      }

      setTimeout(() => {
        document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      // Don't show error toast if user cancelled
      if (error.name === 'AbortError') {
        toast.info('Generation cancelled');
        setState('idle');
        return;
      }
      toast.error(`Failed to generate image: ${error.message}`);
      setState('idle');
    } finally {
      abortControllerRef.current = null;
    }
  }, [
    selectedProducts,
    tempUploads,
    quickStartMode,
    quickStartPrompt,
    prompt,
    resolution,
    ideaBankMode,
    selectedTemplateForMode,
    generationMode,
    generationRecipe,
    selectedStyleRefIds,
  ]);

  const handleCancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setState('idle');
  }, []);

  /** Generate a video via Veo — enqueues a BullMQ job then polls for completion */
  const handleGenerateVideo = useCallback(async () => {
    const finalPrompt = quickStartPrompt.trim() || prompt.trim();
    if (!finalPrompt) return;

    setState('generating');
    setGeneratedMediaType('video');

    try {
      const token = await getCsrfToken().catch(() => '');
      const response = await fetch('/api/generations/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': token },
        credentials: 'include',
        body: JSON.stringify({
          prompt: finalPrompt,
          duration: videoDuration,
          aspectRatio: aspectRatio === '1080x1920' || aspectRatio === '1080x1350' ? '9:16' : '16:9',
          videoResolution: resolution === '4K' ? '4k' : resolution === '1K' ? '720p' : '1080p',
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to start video generation');
      }

      const data = await response.json();
      setGenerationId(data.generationId);
      setVideoJobId(data.jobId);

      // Clear any previous polling
      if (videoPollIntervalRef.current) {
        clearInterval(videoPollIntervalRef.current);
        videoPollIntervalRef.current = null;
      }
      if (videoPollTimeoutRef.current) {
        clearTimeout(videoPollTimeoutRef.current);
        videoPollTimeoutRef.current = null;
      }

      // Poll for completion
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/jobs/${data.jobId}`, { credentials: 'include' });
          if (!statusRes.ok) return;

          const statusData = await statusRes.json();

          if (statusData.state === 'completed' && statusData.generation?.generatedImagePath) {
            clearInterval(pollInterval);
            videoPollIntervalRef.current = null;
            if (videoPollTimeoutRef.current) {
              clearTimeout(videoPollTimeoutRef.current);
              videoPollTimeoutRef.current = null;
            }
            setGeneratedImage(statusData.generation.generatedImagePath);
            setState('result');
            setVideoJobId(null);
            toast.success('Video generated!');
          } else if (statusData.state === 'failed') {
            clearInterval(pollInterval);
            videoPollIntervalRef.current = null;
            if (videoPollTimeoutRef.current) {
              clearTimeout(videoPollTimeoutRef.current);
              videoPollTimeoutRef.current = null;
            }
            toast.error(`Video generation failed: ${statusData.failedReason || 'Unknown error'}`);
            setState('idle');
            setVideoJobId(null);
          }
        } catch {
          // silently retry on network blips
        }
      }, 5000);
      videoPollIntervalRef.current = pollInterval;

      // Safety timeout — stop polling after 12 minutes
      const safetyTimeout = setTimeout(() => {
        clearInterval(pollInterval);
        videoPollIntervalRef.current = null;
        videoPollTimeoutRef.current = null;
        toast.error('Video generation timed out. Check Gallery for results.');
        setState('idle');
        setVideoJobId(null);
      }, 720_000);
      videoPollTimeoutRef.current = safetyTimeout;
    } catch (error: any) {
      toast.error(`Video generation failed: ${error.message}`);
      setState('idle');
      setGeneratedMediaType('image');
    }
  }, [quickStartPrompt, prompt, videoDuration, aspectRatio, resolution, videoJobId]);

  const handleDownload = useCallback(() => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `product-${generationId || Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImage, generationId]);

  const handleDownloadWithFeedback = useCallback(async () => {
    if (!generatedImage) return;
    haptic('light');
    setIsDownloading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      handleDownload();
      haptic('medium');
      toast.success('Image downloaded!', { duration: 2000 });
    } catch {
      haptic('heavy');
      toast.error('Download failed');
    } finally {
      setTimeout(() => setIsDownloading(false), 500);
    }
  }, [generatedImage, handleDownload, haptic]);

  const handleReset = useCallback(() => {
    setState('idle');
    setGeneratedImage(null);
    setGenerationId(null);
    setQuickStartMode(false);
    setQuickStartPrompt('');
    setTempUploads([]);
    setGeneratedCopy('');
    setGeneratedMediaType('image');
    setVideoJobId(null);
  }, []);

  const handleApplyEdit = useCallback(async () => {
    if (!editPrompt.trim() || !generationId) return;
    haptic('light');
    setIsEditing(true);
    try {
      const editToken = await getCsrfToken().catch(() => '');
      const response = await fetch(`/api/generations/${generationId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': editToken },
        credentials: 'include',
        body: JSON.stringify({ editPrompt: editPrompt.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Edit failed');
      haptic('medium');
      toast.success('Changes applied!', { duration: 2000 });
      setLocation(`/generation/${data.generationId}`);
    } catch (error: any) {
      haptic('heavy');
      toast.error(error.message || 'Edit failed');
    } finally {
      setIsEditing(false);
    }
  }, [editPrompt, generationId, haptic, setLocation]);

  const handleCanvasEditComplete = useCallback(
    (newImageUrl: string) => {
      setGeneratedImage(newImageUrl);
      setShowCanvasEditor(false);
      haptic('medium');
      toast.success('Canvas edit applied!', { duration: 2000 });
    },
    [haptic],
  );

  const handleSelectSuggestion = useCallback((suggestionPrompt: string, suggestionId?: string, reasoning?: string) => {
    setPrompt(suggestionPrompt);
    setSelectedSuggestion({ id: suggestionId || 'selected', prompt: suggestionPrompt, reasoning });
    setTimeout(() => {
      document.getElementById('prompt')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  }, []);

  const handlePromptChange = useCallback(
    (value: string) => {
      setPrompt(value);
      if (selectedSuggestion && value !== selectedSuggestion.prompt) {
        setSelectedSuggestion(null);
      }
    },
    [selectedSuggestion],
  );

  const handleGenerateCopy = useCallback(async () => {
    if (!generationId) return;
    haptic('light');
    setIsGeneratingCopy(true);
    try {
      const productName = selectedProducts.length > 0 ? selectedProducts.map((p) => p.name).join(', ') : 'Product';
      const productDescription =
        selectedProducts.length > 0
          ? selectedProducts.map((p) => p.description || p.name).join('. ')
          : prompt || quickStartPrompt || 'Professional product for marketing';

      const copyToken = await getCsrfToken().catch(() => '');
      const response = await fetch('/api/copy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': copyToken },
        credentials: 'include',
        body: JSON.stringify({
          generationId,
          platform: platform.toLowerCase(),
          tone: 'professional',
          productName: productName.slice(0, 100),
          productDescription: productDescription.slice(0, 500),
          industry: 'Building Products',
          framework: 'auto',
          variations: 1,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to generate copy');
      if (data.variations && data.variations.length > 0) {
        setGeneratedCopy(data.variations[0].copy);
        haptic('medium');
        toast.success('Copy generated!', { duration: 2000 });
      }
    } catch (error: any) {
      haptic('heavy');
      toast.error(error.message || 'Failed to generate copy');
    } finally {
      setIsGeneratingCopy(false);
    }
  }, [generationId, haptic, selectedProducts, prompt, quickStartPrompt, platform]);

  const handleLoadFromHistory = useCallback((generation: GenerationDTO) => {
    setGeneratedImage(generation.imageUrl);
    setGenerationId(generation.id);
    setPrompt(generation.prompt || '');
    setState('result');
    setTimeout(() => {
      document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const handleHistoryToggle = useCallback(() => {
    if (historyPanelOpen) {
      closeHistory();
    } else {
      openHistory();
    }
    setHistoryPanelOpen(!historyPanelOpen);
  }, [historyPanelOpen, closeHistory, openHistory]);

  const handleAskAI = useCallback(async () => {
    if (!askAIQuestion.trim() || !generationId) return;
    setIsAskingAI(true);
    setAskAIResponse(null);
    try {
      const analyzeToken = await getCsrfToken().catch(() => '');
      const response = await fetch(`/api/generations/${generationId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-csrf-token': analyzeToken },
        credentials: 'include',
        body: JSON.stringify({ question: askAIQuestion.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || 'Failed to get response');
      setAskAIResponse(data.answer);
      setAskAIQuestion('');
    } catch (error: any) {
      toast.error(error.message || 'Failed to get response');
    } finally {
      setIsAskingAI(false);
    }
  }, [askAIQuestion, generationId]);

  const handleSelectPerformingTemplate = useCallback(
    (template: PerformingAdTemplate) => {
      setSelectedPerformingTemplate(template);
      const platformMap: Record<string, string> = {
        instagram: 'Instagram',
        linkedin: 'LinkedIn',
        facebook: 'Facebook',
        twitter: 'Twitter',
        tiktok: 'TikTok',
      };
      const aspectRatioMap: Record<string, string> = {
        '1:1': '1200x1200',
        '16:9': '1920x1080',
        '9:16': '1080x1920',
        '4:5': '1080x1350',
        '1.91:1': '1200x627',
      };
      if (template.targetPlatforms && template.targetPlatforms.length > 0) {
        const mapped = platformMap[template.targetPlatforms[0]];
        if (mapped) setPlatform(mapped);
      }
      if (template.targetAspectRatios && template.targetAspectRatios.length > 0) {
        const mapped = aspectRatioMap[template.targetAspectRatios[0]];
        if (mapped) setAspectRatio(mapped);
      }
      const styleHints: string[] = [];
      if (template.mood) styleHints.push(template.mood);
      if (template.style) styleHints.push(template.style);
      if (template.backgroundType) styleHints.push(`${template.backgroundType} background`);
      if (styleHints.length > 0) {
        const stylePrefix = `Style: ${styleHints.join(', ')}. `;
        if (!prompt.startsWith('Style:')) {
          setPrompt((prev) => (prev ? `${stylePrefix}${prev}` : stylePrefix));
        }
      }
      setShowTemplateInspiration(false);
    },
    [prompt],
  );

  const clearPlanContext = useCallback(() => {
    setPlanContext(null);
  }, []);

  const handleCopyText = useCallback(() => {
    if (!generatedCopy) return;
    haptic('light');
    navigator.clipboard.writeText(generatedCopy);
    setJustCopied(true);
    setTimeout(() => setJustCopied(false), 2000);
    toast.success('Copied to clipboard!', { duration: 2000 });
  }, [generatedCopy, haptic]);

  // ── Keyboard Shortcuts ────────────────────────────────
  const shortcuts: ShortcutConfig[] = useMemo(
    () => [
      {
        key: 'g',
        ctrlKey: true,
        callback: () => {
          if (state === 'idle' && canGenerate) handleGenerate();
        },
        description: 'Generate image',
        disabled: state !== 'idle' || !canGenerate,
      },
      {
        key: 'd',
        ctrlKey: true,
        callback: () => {
          if (generatedImage) handleDownloadWithFeedback();
        },
        description: 'Download image',
        disabled: !generatedImage,
      },
      {
        key: 'r',
        ctrlKey: true,
        callback: handleReset,
        description: 'Reset workspace',
        disabled: state === 'idle' && !generatedImage,
      },
      {
        key: '/',
        callback: () => document.getElementById('prompt-textarea')?.focus(),
        description: 'Focus prompt',
      },
      {
        key: '?',
        shiftKey: true,
        callback: () => setShowKeyboardShortcuts((v) => !v),
        description: 'Toggle shortcuts help',
      },
    ],
    [state, canGenerate, generatedImage, handleGenerate, handleDownloadWithFeedback, handleReset],
  );

  useKeyboardShortcuts(shortcuts);

  // ── Return ────────────────────────────────────────────
  return {
    // State
    state,
    generatedImage,
    generationId,
    selectedProducts,
    selectedTemplate,
    templateCategory,
    prompt,
    platform,
    aspectRatio,
    resolution,
    collapsedSections,
    currentSection,
    showContextBar,
    showStickyGenerate,
    searchQuery,
    categoryFilter,
    activeActionButton,
    quickStartMode,
    quickStartPrompt,
    tempUploads,
    priceEstimate,
    editPrompt,
    isEditing,
    askAIQuestion,
    askAIResponse,
    isAskingAI,
    generatedCopy,
    isGeneratingCopy,
    generatedImageUrl,
    generatedCopyFull,
    showSaveToCatalog,
    showTemplateInspiration,
    selectedPerformingTemplate,
    selectedSuggestion,
    generationRecipe,
    ideaBankMode,
    generationMode,
    selectedTemplateForMode,
    planContext,
    cpTemplate,
    showCarouselBuilder,
    carouselTopic,
    showBeforeAfterBuilder,
    beforeAfterTopic,
    showTextOnlyMode,
    textOnlyTopic,
    showCanvasEditor,
    mediaMode,
    videoDuration,
    videoJobId,
    generatedMediaType,
    historyPanelOpen,
    justCopied,
    isDownloading,
    showKeyboardShortcuts,
    imageScale,
    imagePosition,
    canGenerate,
    shortcuts,

    // Data
    authUser,
    products,
    templates,
    featuredAdTemplates,
    isLoadingFeatured,
    filteredProducts,
    categories,
    progressSections,

    // Refs
    generateButtonRef,
    heroRef,
    zoomContainerRef,

    // Setters (for components that need direct state control)
    setState,
    setGeneratedImage,
    setGenerationId,
    setSelectedProducts,
    setSelectedTemplate,
    setTemplateCategory,
    setPrompt,
    setPlatform,
    setAspectRatio,
    setResolution,
    setSearchQuery,
    setCategoryFilter,
    setActiveActionButton,
    setQuickStartMode,
    setQuickStartPrompt,
    setTempUploads,
    setEditPrompt,
    setAskAIQuestion,
    setGeneratedCopy,
    setIsGeneratingCopy,
    setGeneratedCopyFull,
    setShowSaveToCatalog,
    setShowTemplateInspiration,
    setSelectedPerformingTemplate,
    setSelectedSuggestion,
    setGenerationRecipe,
    setIdeaBankMode,
    setGenerationMode,
    setSelectedTemplateForMode,
    setPlanContext,
    clearPlanContext,
    setCpTemplate,
    setShowCarouselBuilder,
    setCarouselTopic,
    setShowBeforeAfterBuilder,
    setBeforeAfterTopic,
    setShowTextOnlyMode,
    setTextOnlyTopic,
    setShowCanvasEditor,
    setMediaMode,
    setVideoDuration,
    setVideoJobId,
    setGeneratedMediaType,
    setHistoryPanelOpen,
    setShowKeyboardShortcuts,
    setImageScale,
    setImagePosition,
    selectedStyleRefIds,
    setSelectedStyleRefIds,

    // Handlers
    toggleProductSelection,
    toggleSection,
    navigateToSection,
    handleGenerate,
    handleGenerateVideo,
    handleCancelGeneration,
    handleDownload,
    handleDownloadWithFeedback,
    handleReset,
    handleApplyEdit,
    handleCanvasEditComplete,
    handleSelectSuggestion,
    handlePromptChange,
    handleGenerateCopy,
    handleLoadFromHistory,
    handleHistoryToggle,
    handleAskAI,
    handleSelectPerformingTemplate,
    handleCopyText,

    // History URL state
    selectGeneration,
    haptic,
  };
}

export type StudioOrchestrator = ReturnType<typeof useStudioOrchestrator>;
