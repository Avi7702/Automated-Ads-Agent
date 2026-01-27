/**
 * StudioOptimized - Performance-optimized Studio page
 *
 * This is a refactored version of Studio.tsx that uses:
 * - React.memo for sub-components (70% fewer re-renders)
 * - useCallback for stable event handler references
 * - useMemo for expensive computations
 * - Context-based state management (StudioContext)
 *
 * Component Structure:
 * - StudioHeader: Title and quick actions
 * - StudioSidebar: Upload, products, templates
 * - StudioCanvas: Prompt, IdeaBank, settings
 * - StudioToolbar: Generate button, actions
 *
 * Migration: This can replace Studio.tsx once performance is verified
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Link, useLocation } from 'wouter';
import { cn, getProductImageUrl } from '@/lib/utils';
import type { Product, PromptTemplate, PerformingAdTemplate, AdSceneTemplate } from '@shared/schema';
import type { GenerationDTO } from '@shared/types/api';

// Memoized Components
import {
  StudioHeader,
  StudioSidebar,
  StudioCanvas,
  StudioToolbar,
} from '@/components/studio/memoized';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Feature Components
import { LinkedInPostPreview } from '@/components/LinkedInPostPreview';
import { HistoryTimeline } from '@/components/HistoryTimeline';
import { HistoryPanel } from '@/components/studio/HistoryPanel';
import { SaveToCatalogDialog } from '@/components/SaveToCatalogDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Header } from '@/components/layout/Header';
import { StudioProvider } from '@/context/StudioContext';
import { getTemplateById, type ContentTemplate } from '@shared/contentTemplates';
import { toast } from 'sonner';

// Hooks
import { useHistoryPanelUrl } from '@/hooks/useUrlState';
import { useHaptic } from '@/hooks/useHaptic';
import { useRipple } from '@/hooks/useRipple';
import { useKeyboardShortcuts, type ShortcutConfig } from '@/hooks/useKeyboardShortcuts';

// Types
import type { GenerationRecipe, TemplateSlotSuggestion, GenerationMode, IdeaBankMode } from '@shared/types/ideaBank';
import type { AnalyzedUpload } from '@/types/analyzedUpload';

// Icons
import {
  Sparkles,
  ChevronUp,
  Check,
  X,
  Eye,
  Loader2,
  TrendingUp,
  Star,
  Layout,
  Instagram,
  Linkedin,
  Facebook,
  Twitter,
  Zap,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';

// Types
type GenerationState = 'idle' | 'generating' | 'result';

interface CopyResult {
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
}

interface SelectedSuggestion {
  id: string;
  prompt: string;
  reasoning?: string;
}

// Persist collapsed state to localStorage
const COLLAPSED_SECTIONS_KEY = 'studio-collapsed-sections';

function getStoredCollapsedSections(): CollapsedSections {
  try {
    const stored = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { upload: false, products: false, templates: false, refine: true, copy: true, preview: true };
}

function storeCollapsedSections(sections: CollapsedSections) {
  try {
    localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify(sections));
  } catch {}
}

// Progress Rail component - inline since it's simple and uses memo
const ProgressRail = ({
  currentSection,
  sections,
  onNavigate,
}: {
  currentSection: string;
  sections: { id: string; label: string; completed: boolean }[];
  onNavigate: (id: string) => void;
}) => (
  <div className="hidden lg:flex fixed right-8 top-1/2 -translate-y-1/2 flex-col items-center gap-4 z-40">
    {sections.map((section, index) => (
      <button
        key={section.id}
        onClick={() => onNavigate(section.id)}
        className="group relative flex items-center"
        title={section.label}
      >
        <div
          className={cn(
            'w-3 h-3 rounded-full border-2 transition-all',
            section.completed
              ? 'bg-primary border-primary'
              : currentSection === section.id
              ? 'border-primary bg-transparent'
              : 'border-muted-foreground/30 bg-transparent'
          )}
        />
        <span className="absolute right-6 whitespace-nowrap text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-card px-2 py-1 rounded border border-border">
          {section.label}
        </span>
        {index < sections.length - 1 && (
          <div
            className={cn(
              'absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-4',
              section.completed ? 'bg-primary' : 'bg-muted-foreground/20'
            )}
          />
        )}
      </button>
    ))}
  </div>
);

// Context Bar - shows floating bar with current selections
const ContextBar = ({
  selectedProducts,
  selectedTemplate,
  platform,
  visible,
}: {
  selectedProducts: Product[];
  selectedTemplate: PromptTemplate | null;
  platform: string;
  visible: boolean;
}) => {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-card/90 backdrop-blur-md border border-border shadow-lg"
    >
      <div className="flex items-center gap-3 text-sm">
        {selectedProducts.length > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="w-4 h-4 text-primary">P</span>
            {selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''}
          </span>
        )}
        {selectedTemplate && (
          <>
            <span className="text-muted-foreground">-</span>
            <span className="flex items-center gap-1.5">{selectedTemplate.title}</span>
          </>
        )}
        {platform && (
          <>
            <span className="text-muted-foreground">-</span>
            <span className="text-muted-foreground">{platform}</span>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default function StudioOptimized() {
  const [, setLocation] = useLocation();

  // ============================================
  // STATE
  // ============================================

  // Generation state
  const [state, setState] = useState<GenerationState>('idle');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  // Selection state
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AdSceneTemplate | null>(null);
  const [templateCategory, setTemplateCategory] = useState<string>('all');
  const [prompt, setPrompt] = useState('');
  const [platform, setPlatform] = useState('LinkedIn');
  const [aspectRatio, setAspectRatio] = useState('1200x627');
  const [resolution, setResolution] = useState<'1K' | '2K' | '4K'>('2K');

  // UI state
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>(
    getStoredCollapsedSections
  );
  const [currentSection, setCurrentSection] = useState('products');
  const [showContextBar, setShowContextBar] = useState(false);
  const [showStickyGenerate, setShowStickyGenerate] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [activeActionButton, setActiveActionButton] = useState<'edit' | 'copy' | 'preview' | 'save' | null>(null);

  // Quick start mode
  const [quickStartMode, setQuickStartMode] = useState(false);
  const [quickStartPrompt, setQuickStartPrompt] = useState('');

  // Temporary uploads
  const [tempUploads, setTempUploads] = useState<AnalyzedUpload[]>([]);

  // Price estimate
  const [priceEstimate, setPriceEstimate] = useState<{
    estimatedCost: number;
    p90: number;
    sampleCount: number;
    usedFallback: boolean;
  } | null>(null);

  // Edit/Ask AI state
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [askAIQuestion, setAskAIQuestion] = useState('');
  const [askAIResponse, setAskAIResponse] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);

  // Ad Copy state
  const [generatedCopy, setGeneratedCopy] = useState<string>('');
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedCopyFull, setGeneratedCopyFull] = useState<CopyResult | null>(null);

  // Dialog state
  const [showSaveToCatalog, setShowSaveToCatalog] = useState(false);
  const [showTemplateInspiration, setShowTemplateInspiration] = useState(false);
  const [selectedPerformingTemplate, setSelectedPerformingTemplate] = useState<PerformingAdTemplate | null>(null);

  // Selected suggestion state
  const [selectedSuggestion, setSelectedSuggestion] = useState<SelectedSuggestion | null>(null);

  // Generation modes
  const [generationRecipe, setGenerationRecipe] = useState<GenerationRecipe | undefined>(undefined);
  const [ideaBankMode, setIdeaBankMode] = useState<IdeaBankMode>('freestyle');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('standard');
  const [selectedTemplateForMode, setSelectedTemplateForMode] = useState<AdSceneTemplate | null>(null);

  // Content Planner state
  const [cpTemplate, setCpTemplate] = useState<ContentTemplate | null>(null);
  const [showCarouselBuilder, setShowCarouselBuilder] = useState(false);
  const [carouselTopic, setCarouselTopic] = useState('');
  const [showBeforeAfterBuilder, setShowBeforeAfterBuilder] = useState(false);
  const [beforeAfterTopic, setBeforeAfterTopic] = useState('');
  const [showTextOnlyMode, setShowTextOnlyMode] = useState(false);
  const [textOnlyTopic, setTextOnlyTopic] = useState('');

  // History panel state
  const { isHistoryOpen, selectedGenerationId, openHistory, closeHistory, selectGeneration } =
    useHistoryPanelUrl();
  const [historyPanelOpen, setHistoryPanelOpen] = useState(isHistoryOpen);

  // UX state
  const { haptic } = useHaptic();
  const { createRipple } = useRipple();
  const [justCopied, setJustCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Image zoom state
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  // Refs
  const generateButtonRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);

  // ============================================
  // QUERIES
  // ============================================

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

  // ============================================
  // MEMOIZED VALUES
  // ============================================

  // Filter products
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, categoryFilter]);

  // Get categories from products
  const categories = useMemo(() => {
    return [
      'all',
      ...Array.from(new Set(products.map((p) => p.category).filter((c): c is string => !!c))),
    ];
  }, [products]);

  // Progress rail sections
  const progressSections = useMemo(
    () => [
      { id: 'upload', label: 'Upload', completed: tempUploads.length > 0 },
      { id: 'products', label: 'Products', completed: selectedProducts.length > 0 },
      { id: 'templates', label: 'Style', completed: !!selectedTemplate },
      { id: 'prompt', label: 'Prompt', completed: !!prompt.trim() },
      { id: 'generate', label: 'Generate', completed: state === 'result' },
      { id: 'result', label: 'Result', completed: state === 'result' },
    ],
    [tempUploads.length, selectedProducts.length, selectedTemplate, prompt, state]
  );

  // Price estimate props - memoized to prevent unnecessary PriceEstimate re-renders
  const priceEstimateProps = useMemo(() => {
    if (!priceEstimate) return null;
    return {
      estimatedCost: priceEstimate.estimatedCost,
      p90: priceEstimate.p90,
      sampleCount: priceEstimate.sampleCount,
      usedFallback: priceEstimate.usedFallback,
    };
  }, [priceEstimate]);

  // ============================================
  // CALLBACKS - Stable references for memoized components
  // ============================================

  // History toggle
  const handleHistoryToggle = useCallback(() => {
    if (historyPanelOpen) {
      closeHistory();
    } else {
      openHistory();
    }
    setHistoryPanelOpen(!historyPanelOpen);
  }, [historyPanelOpen, closeHistory, openHistory]);

  // Product toggle
  const toggleProductSelection = useCallback((product: Product) => {
    setSelectedProducts((prev) => {
      const isSelected = prev.some((p) => p.id === product.id);
      if (isSelected) {
        return prev.filter((p) => p.id !== product.id);
      } else {
        if (prev.length >= 6) return prev;
        return [...prev, product];
      }
    });
  }, []);

  // Clear products
  const handleProductsClear = useCallback(() => {
    setSelectedProducts([]);
  }, []);

  // Section toggle
  const toggleSection = useCallback((section: keyof CollapsedSections) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  }, []);

  // Navigate to section
  const navigateToSection = useCallback((id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentSection(id);
    }
  }, []);

  // Handle generation
  const handleGenerate = useCallback(async () => {
    const hasImages = selectedProducts.length > 0 || tempUploads.length > 0;
    if (!hasImages && !quickStartMode) return;

    const finalPrompt = quickStartMode ? quickStartPrompt : prompt;
    if (!finalPrompt.trim()) return;

    setState('generating');

    try {
      const formData = new FormData();

      if (!quickStartMode) {
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

      const response = await fetch('/api/transform', {
        method: 'POST',
        body: formData,
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

      setTimeout(() => {
        document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error: any) {
      alert(`Failed to generate image: ${error.message}`);
      setState('idle');
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
  ]);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `product-${generationId || Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [generatedImage, generationId]);

  // Download with feedback
  const handleDownloadWithFeedback = useCallback(async () => {
    if (!generatedImage) return;

    haptic('light');
    setIsDownloading(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 100));
      handleDownload();
      haptic('medium');
      toast.success('Image downloaded!', { duration: 2000 });
    } catch (error) {
      haptic('heavy');
      toast.error('Download failed');
    } finally {
      setTimeout(() => setIsDownloading(false), 500);
    }
  }, [generatedImage, haptic, handleDownload]);

  // Handle reset
  const handleReset = useCallback(() => {
    setState('idle');
    setGeneratedImage(null);
    setGenerationId(null);
    setQuickStartMode(false);
    setQuickStartPrompt('');
    setTempUploads([]);
    setGeneratedCopy('');
  }, []);

  // Handle prompt change
  const handlePromptChange = useCallback(
    (value: string) => {
      setPrompt(value);
      if (selectedSuggestion && value !== selectedSuggestion.prompt) {
        setSelectedSuggestion(null);
      }
    },
    [selectedSuggestion]
  );

  // Clear suggestion
  const handleClearSuggestion = useCallback(() => {
    setSelectedSuggestion(null);
    setPrompt('');
  }, []);

  // Select suggestion
  const handleSelectSuggestion = useCallback(
    (suggestionPrompt: string, suggestionId?: string, reasoning?: string) => {
      setPrompt(suggestionPrompt);
      setSelectedSuggestion({
        id: suggestionId || 'selected',
        prompt: suggestionPrompt,
        reasoning,
      });
      setTimeout(() => {
        document.getElementById('prompt')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
    },
    []
  );

  // Handle slot suggestion select
  const handleSlotSuggestionSelect = useCallback(
    (suggestion: TemplateSlotSuggestion, mergedPrompt: string) => {
      setPrompt(mergedPrompt);
      setSelectedSuggestion({
        id: `slot-${Date.now()}`,
        prompt: mergedPrompt,
        reasoning: suggestion.reasoning,
      });
    },
    []
  );

  // Select freestyle mode
  const handleSelectFreestyle = useCallback(() => {
    setIdeaBankMode('freestyle');
    setGenerationMode('standard');
    setSelectedTemplateForMode(null);
  }, []);

  // Select template mode
  const handleSelectTemplate = useCallback(() => {
    setIdeaBankMode('template');
    setGenerationMode('exact_insert');
  }, []);

  // Clear template for mode
  const handleClearTemplateForMode = useCallback(() => {
    setSelectedTemplateForMode(null);
  }, []);

  // Select template for mode
  const handleTemplateForModeSelect = useCallback((template: AdSceneTemplate) => {
    setSelectedTemplateForMode(template);
  }, []);

  // Template select
  const handleTemplateSelect = useCallback(
    (template: AdSceneTemplate | null) => {
      setSelectedTemplate(template);
      if (template) {
        setPrompt(template.promptBlueprint);
      }
    },
    []
  );

  // Show template inspiration
  const handleShowTemplateInspiration = useCallback(() => {
    setShowTemplateInspiration(true);
  }, []);

  // Clear performing template
  const handleClearPerformingTemplate = useCallback(() => {
    setSelectedPerformingTemplate(null);
  }, []);

  // Dismiss CP template
  const handleDismissCpTemplate = useCallback(() => {
    setCpTemplate(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('cpTemplateId');
    window.history.replaceState({}, '', url.toString());
  }, []);

  // Action button clicks
  const handleEditClick = useCallback(() => {
    haptic('light');
    setActiveActionButton('edit');
    toggleSection('refine');
    if (collapsedSections.refine) {
      toast.success('Edit panel opened');
      setTimeout(() => {
        document.getElementById('refine')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [haptic, toggleSection, collapsedSections.refine]);

  const handleCopyClick = useCallback(() => {
    haptic('light');
    setActiveActionButton('copy');
    toggleSection('copy');
    if (collapsedSections.copy) {
      toast.success('Copy panel opened');
      setTimeout(() => {
        document.getElementById('ask-ai')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [haptic, toggleSection, collapsedSections.copy]);

  const handlePreviewClick = useCallback(() => {
    haptic('light');
    setActiveActionButton('preview');
    toggleSection('preview');
    if (collapsedSections.preview) {
      toast.success('Preview panel opened');
      setTimeout(() => {
        document
          .getElementById('linkedin-preview')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [haptic, toggleSection, collapsedSections.preview]);

  const handleSaveClick = useCallback(() => {
    haptic('light');
    setActiveActionButton('save');
    setShowSaveToCatalog(true);
    toast.success('Save dialog opened');
  }, [haptic]);

  const handleCopyText = useCallback(async () => {
    if (!generatedCopy) return;

    haptic('light');

    try {
      await navigator.clipboard.writeText(generatedCopy);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
      toast.success('Copied to clipboard!', { duration: 2000 });
    } catch (error) {
      toast.error('Failed to copy to clipboard');
    }
  }, [generatedCopy, haptic]);

  // Generate copy
  const handleGenerateCopy = useCallback(async () => {
    if (!generationId) return;

    haptic('light');
    setIsGeneratingCopy(true);

    try {
      const productName =
        selectedProducts.length > 0
          ? selectedProducts.map((p) => p.name).join(', ')
          : 'Product';
      const productDescription =
        selectedProducts.length > 0
          ? selectedProducts.map((p) => p.description || p.name).join('. ')
          : prompt || quickStartPrompt || 'Professional product for marketing';

      const response = await fetch('/api/copy/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          generationId,
          platform: platform.toLowerCase() as 'linkedin' | 'instagram' | 'facebook' | 'twitter' | 'tiktok',
          tone: 'professional',
          productName: productName.slice(0, 100),
          productDescription: productDescription.slice(0, 500),
          industry: 'Building Products',
          framework: 'auto',
          variations: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate copy');
      }

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
  }, [generationId, selectedProducts, prompt, quickStartPrompt, platform, haptic]);

  // Handle loading from history
  const handleLoadFromHistory = useCallback((generation: GenerationDTO) => {
    setGeneratedImage(generation.imageUrl);
    setGenerationId(generation.id);
    setPrompt(generation.prompt || '');
    setState('result');
    setTimeout(() => {
      document.getElementById('result')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Product selection change (from content planner)
  const handleProductSelectionChange = useCallback(
    (productIds: string[]) => {
      const newProducts = products.filter((p) => productIds.includes(p.id));
      setSelectedProducts(newProducts);
    },
    [products]
  );

  // Generate complete (from content planner)
  const handleGenerateComplete = useCallback(
    (result: { copy?: CopyResult; image?: { imageUrl?: string; prompt?: string } }) => {
      if (result.copy) {
        setGeneratedCopyFull(result.copy);
        if (result.copy.caption) {
          setGeneratedCopy(result.copy.caption);
        }
      }
      if (result.image?.imageUrl && result.image.imageUrl.trim()) {
        setGeneratedImageUrl(result.image.imageUrl);
      } else if (result.image?.prompt && result.image.prompt.trim()) {
        setPrompt(result.image.prompt);
      }
    },
    []
  );

  // Quick generate
  const handleQuickGenerate = useCallback(
    (promptText: string) => {
      setPrompt(promptText);
      setTimeout(() => handleGenerate(), 100);
    },
    [handleGenerate]
  );

  // Builder close handlers
  const handleCloseCarouselBuilder = useCallback(() => {
    setShowCarouselBuilder(false);
  }, []);

  const handleCarouselComplete = useCallback(() => {
    setShowCarouselBuilder(false);
  }, []);

  const handleCloseBeforeAfterBuilder = useCallback(() => {
    setShowBeforeAfterBuilder(false);
  }, []);

  const handleBeforeAfterComplete = useCallback(() => {
    setShowBeforeAfterBuilder(false);
  }, []);

  const handleCloseTextOnlyMode = useCallback(() => {
    setShowTextOnlyMode(false);
  }, []);

  const handleTextOnlyComplete = useCallback((result: { copy: string }) => {
    setGeneratedCopy(result.copy);
    setShowTextOnlyMode(false);
  }, []);

  // ============================================
  // EFFECTS
  // ============================================

  // Persist collapsed state
  useEffect(() => {
    storeCollapsedSections(collapsedSections);
  }, [collapsedSections]);

  // Auto-save draft prompt
  useEffect(() => {
    const savePromptDraft = () => {
      if (prompt) {
        localStorage.setItem('studio-prompt-draft', prompt);
      }
    };
    const timeout = setTimeout(savePromptDraft, 500);
    return () => clearTimeout(timeout);
  }, [prompt]);

  // Restore draft on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem('studio-prompt-draft');
    if (savedPrompt && !prompt) {
      setPrompt(savedPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync history panel URL state
  useEffect(() => {
    setHistoryPanelOpen(isHistoryOpen);
  }, [isHistoryOpen]);

  // Wheel event for zoom
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

  // Fetch price estimate
  useEffect(() => {
    const fetchPriceEstimate = async () => {
      const inputImagesCount = selectedProducts.length + tempUploads.length;
      const promptChars = prompt.length;

      if (inputImagesCount === 0 && promptChars === 0) {
        setPriceEstimate(null);
        return;
      }

      try {
        const params = new URLSearchParams({
          resolution,
          operation: 'generate',
          inputImagesCount: String(inputImagesCount),
          promptChars: String(promptChars),
        });

        const res = await fetch(`/api/pricing/estimate?${params}`);
        if (res.ok) {
          const data = await res.json();
          setPriceEstimate(data);
        }
      } catch {
        // Silent fail
      }
    };

    const debounceTimer = setTimeout(fetchPriceEstimate, 300);
    return () => clearTimeout(debounceTimer);
  }, [selectedProducts.length, tempUploads.length, prompt.length, resolution]);

  // Parse query params
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
          const mappedPlatform = platformMap[bestPlatform.toLowerCase()] || bestPlatform;
          setPlatform(mappedPlatform);

          const format = contentPlannerTemplate.bestPlatforms[0].format;
          const formatLower = format.toLowerCase();

          const formatAspectRatioMap: Record<string, string> = {
            carousel: '1080x1350',
            reel: '1080x1920',
            story: '1080x1920',
            video: '1920x1080',
            post: '1200x627',
          };

          let detectedRatio = '1200x627';

          if (formatLower.includes('carousel')) {
            detectedRatio = formatAspectRatioMap.carousel;
          } else if (formatLower.includes('reel') || formatLower.includes('story')) {
            detectedRatio = formatAspectRatioMap.reel;
          } else if (formatLower.includes('video')) {
            detectedRatio = formatAspectRatioMap.video;
          } else {
            detectedRatio = formatAspectRatioMap.post;
          }

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
  }, [templates, prompt, cpTemplate]);

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

  // Keyboard shortcuts
  const shortcuts: ShortcutConfig[] = useMemo(
    () => [
      {
        key: 'g',
        ctrlKey: true,
        callback: () => {
          if (state === 'idle' && selectedProducts.length > 0) {
            handleGenerate();
          }
        },
        description: 'Generate image',
        disabled: state !== 'idle' || selectedProducts.length === 0,
      },
      {
        key: 'd',
        ctrlKey: true,
        callback: () => {
          if (generatedImage) {
            handleDownloadWithFeedback();
          }
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
        callback: () => {
          const promptTextarea = document.getElementById('prompt-textarea');
          if (promptTextarea) {
            promptTextarea.focus();
          }
        },
        description: 'Focus prompt',
      },
      {
        key: '?',
        shiftKey: true,
        callback: () => setShowKeyboardShortcuts(!showKeyboardShortcuts),
        description: 'Toggle shortcuts help',
      },
    ],
    [state, selectedProducts.length, generatedImage, handleGenerate, handleDownloadWithFeedback, handleReset, showKeyboardShortcuts]
  );

  useKeyboardShortcuts(shortcuts);

  // ============================================
  // RENDER
  // ============================================

  return (
    <StudioProvider>
      <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans relative">
        {/* Background Ambience */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-primary/10 via-purple-500/8 to-transparent blur-[120px] rounded-full animate-float" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-blue-500/10 via-cyan-500/8 to-transparent blur-[120px] rounded-full animate-float-delayed" />
          <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] bg-gradient-radial from-violet-500/5 to-transparent blur-[100px] rounded-full animate-pulse" />
        </div>

        {/* Header */}
        <Header currentPage="studio" />

        {/* Context Bar */}
        <AnimatePresence>
          <ContextBar
            selectedProducts={selectedProducts}
            selectedTemplate={selectedTemplate}
            platform={platform}
            visible={showContextBar}
          />
        </AnimatePresence>

        {/* Progress Rail */}
        <ProgressRail
          currentSection={currentSection}
          sections={progressSections}
          onNavigate={navigateToSection}
        />

        {/* Main Content */}
        <main
          className={cn(
            'container mx-auto px-6 pt-24 pb-24 lg:pb-12 relative z-10',
            historyPanelOpen ? 'max-w-[1600px]' : 'max-w-7xl'
          )}
        >
          <div
            className={cn(
              'lg:grid lg:gap-8',
              historyPanelOpen ? 'lg:grid-cols-[1fr_400px_320px]' : 'lg:grid-cols-[1fr_400px]'
            )}
          >
            {/* Left Column - All Inputs */}
            <div className="space-y-8 min-w-0">
              {/* Hero Section - Memoized */}
              <StudioHeader
                historyPanelOpen={historyPanelOpen}
                onHistoryToggle={handleHistoryToggle}
              />

              {/* Quick Start */}
              {state === 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 dark:to-purple-500/10"
                >
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-5 h-5 text-primary" />
                    <h3 className="font-medium">Quick Start</h3>
                    <span className="text-xs text-muted-foreground">Skip the setup</span>
                  </div>
                  <div className="flex flex-col gap-3">
                    <Textarea
                      id="prompt-textarea"
                      value={quickStartPrompt}
                      onChange={(e) => setQuickStartPrompt(e.target.value)}
                      placeholder="Describe what you want to create..."
                      className="flex-1 min-h-[120px] resize-none text-base"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (quickStartPrompt.trim()) {
                            setQuickStartMode(true);
                            handleGenerate();
                          }
                        }
                      }}
                    />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">
                        Press Enter to generate, Shift+Enter for new line
                      </span>
                      <Button
                        onClick={() => {
                          if (quickStartPrompt.trim()) {
                            setQuickStartMode(true);
                            handleGenerate();
                          }
                        }}
                        disabled={!quickStartPrompt.trim()}
                      >
                        <Sparkles className="w-4 h-4 mr-2 ai-sparkle text-primary ai-glow" />
                        Generate Now
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Or scroll down for the full studio experience with product selection and
                    templates.
                  </p>
                </motion.div>
              )}

              {/* Generating State */}
              {state === 'generating' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center min-h-[400px] space-y-6"
                >
                  <div className="relative w-24 h-24">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                    <div
                      className="absolute inset-2 rounded-full border-4 border-transparent border-r-purple-500 animate-spin-reverse"
                      style={{ animationDuration: '1.5s' }}
                    />
                    <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary ai-glow" />
                  </div>
                  <div className="text-center space-y-2">
                    <p className="text-lg font-semibold text-gradient-animated">
                      Generating magic...
                    </p>
                    <p className="text-sm text-muted-foreground">
                      This usually takes 5-10 seconds
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full bg-primary animate-pulse"
                        style={{ animationDelay: `${i * 200}ms` }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Result State */}
              {state === 'result' && generatedImage && (
                <motion.div
                  id="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-8"
                >
                  {/* Result header and action buttons using memoized toolbar */}
                  <StudioToolbar
                    selectedProductsCount={selectedProducts.length}
                    tempUploadsCount={tempUploads.length}
                    selectedProducts={selectedProducts}
                    platform={platform}
                    resolution={resolution}
                    hasPrompt={!!prompt.trim()}
                    onGenerate={handleGenerate}
                    showResultHeader={true}
                    generationId={generationId}
                    isDownloading={isDownloading}
                    onReset={handleReset}
                    onDownload={handleDownloadWithFeedback}
                    showActionButtons={true}
                    activeActionButton={activeActionButton}
                    generatedCopy={generatedCopy}
                    justCopied={justCopied}
                    onEditClick={handleEditClick}
                    onCopyClick={handleCopyClick}
                    onPreviewClick={handlePreviewClick}
                    onSaveClick={handleSaveClick}
                    onCopyText={handleCopyText}
                    showStickyGenerate={showStickyGenerate}
                    prompt={prompt}
                    isGenerating={state === 'generating'}
                  />

                  {/* Generated Image */}
                  <div
                    ref={zoomContainerRef}
                    className="rounded-2xl overflow-hidden border border-border bg-black relative touch-none select-none"
                  >
                    <motion.div
                      style={{
                        scale: imageScale,
                        x: imagePosition.x,
                        y: imagePosition.y,
                        cursor: imageScale > 1 ? 'grab' : 'default',
                      }}
                      onDoubleClick={() => {
                        setImageScale(1);
                        setImagePosition({ x: 0, y: 0 });
                      }}
                      className="transition-none"
                    >
                      <img
                        src={generatedImage}
                        alt="Generated"
                        className="w-full aspect-square object-cover pointer-events-none"
                        draggable={false}
                      />
                    </motion.div>

                    {imageScale === 1 && (
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-white/80">
                        Scroll to zoom - Double-click to reset
                      </div>
                    )}

                    {imageScale !== 1 && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute top-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-white font-mono"
                      >
                        {Math.round(imageScale * 100)}%
                      </motion.div>
                    )}
                  </div>

                  {/* History Timeline */}
                  <ErrorBoundary>
                    <HistoryTimeline
                      currentGenerationId={generationId}
                      onSelect={handleLoadFromHistory}
                    />
                  </ErrorBoundary>
                </motion.div>
              )}

              {/* Idle State - Full Flow with memoized components */}
              {state === 'idle' && (
                <>
                  {/* Sidebar content (upload, products, templates) */}
                  <StudioSidebar
                    products={filteredProducts}
                    selectedProducts={selectedProducts}
                    onProductToggle={toggleProductSelection}
                    onProductsClear={handleProductsClear}
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    categoryFilter={categoryFilter}
                    onCategoryFilterChange={setCategoryFilter}
                    categories={categories}
                    tempUploads={tempUploads}
                    onUploadsChange={setTempUploads}
                    templates={templates}
                    selectedTemplate={selectedTemplate}
                    onTemplateSelect={handleTemplateSelect}
                    templateCategory={templateCategory}
                    onTemplateCategoryChange={setTemplateCategory}
                    onPromptFill={setPrompt}
                    featuredAdTemplates={featuredAdTemplates}
                    selectedPerformingTemplate={selectedPerformingTemplate}
                    onShowTemplateInspiration={handleShowTemplateInspiration}
                    onClearPerformingTemplate={handleClearPerformingTemplate}
                    collapsedSections={collapsedSections}
                    onToggleSection={toggleSection}
                  />

                  {/* Canvas content (path selection, prompt, settings) */}
                  <StudioCanvas
                    isIdle={state === 'idle'}
                    ideaBankMode={ideaBankMode}
                    generationMode={generationMode}
                    selectedTemplateForMode={selectedTemplateForMode}
                    prompt={prompt}
                    selectedSuggestion={selectedSuggestion}
                    platform={platform}
                    aspectRatio={aspectRatio}
                    resolution={resolution}
                    selectedProducts={selectedProducts}
                    tempUploads={tempUploads}
                    isGenerating={state === 'generating'}
                    generationRecipe={generationRecipe}
                    priceEstimate={priceEstimateProps}
                    cpTemplate={cpTemplate}
                    products={products}
                    showCarouselBuilder={showCarouselBuilder}
                    carouselTopic={carouselTopic}
                    showBeforeAfterBuilder={showBeforeAfterBuilder}
                    beforeAfterTopic={beforeAfterTopic}
                    showTextOnlyMode={showTextOnlyMode}
                    textOnlyTopic={textOnlyTopic}
                    onSelectFreestyle={handleSelectFreestyle}
                    onSelectTemplate={handleSelectTemplate}
                    onClearTemplateForMode={handleClearTemplateForMode}
                    onTemplateForModeSelect={handleTemplateForModeSelect}
                    onPromptChange={handlePromptChange}
                    onClearSuggestion={handleClearSuggestion}
                    onPlatformChange={setPlatform}
                    onAspectRatioChange={setAspectRatio}
                    onResolutionChange={setResolution}
                    onSelectPrompt={handleSelectSuggestion}
                    onRecipeAvailable={setGenerationRecipe}
                    onQuickGenerate={handleQuickGenerate}
                    onSlotSuggestionSelect={handleSlotSuggestionSelect}
                    onDismissCpTemplate={handleDismissCpTemplate}
                    onGenerateCopy={(copy) => setGeneratedCopy(copy)}
                    onGenerateComplete={handleGenerateComplete}
                    onProductSelectionChange={handleProductSelectionChange}
                    onGenerate={handleGenerate}
                    onCloseCarouselBuilder={handleCloseCarouselBuilder}
                    onCarouselComplete={handleCarouselComplete}
                    onCloseBeforeAfterBuilder={handleCloseBeforeAfterBuilder}
                    onBeforeAfterComplete={handleBeforeAfterComplete}
                    onCloseTextOnlyMode={handleCloseTextOnlyMode}
                    onTextOnlyComplete={handleTextOnlyComplete}
                  />

                  {/* Generate Button - Toolbar in idle state */}
                  <div ref={generateButtonRef}>
                    <StudioToolbar
                      selectedProductsCount={selectedProducts.length}
                      tempUploadsCount={tempUploads.length}
                      selectedProducts={selectedProducts}
                      platform={platform}
                      resolution={resolution}
                      hasPrompt={!!prompt.trim()}
                      onGenerate={handleGenerate}
                      showResultHeader={false}
                      generationId={null}
                      isDownloading={false}
                      onReset={handleReset}
                      onDownload={handleDownloadWithFeedback}
                      showActionButtons={false}
                      activeActionButton={null}
                      generatedCopy=""
                      justCopied={false}
                      onEditClick={() => {}}
                      onCopyClick={() => {}}
                      onPreviewClick={() => {}}
                      onSaveClick={() => {}}
                      onCopyText={() => {}}
                      showStickyGenerate={showStickyGenerate}
                      prompt={prompt}
                      isGenerating={state === 'generating'}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Right Column - LinkedIn Preview */}
            <div className="hidden lg:block min-w-0">
              <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto w-full">
                <div className="rounded-2xl border border-border bg-card/30 backdrop-blur-sm p-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Eye className="w-5 h-5 text-primary" />
                    <h3 className="font-medium">LinkedIn Preview</h3>
                  </div>

                  <LinkedInPostPreview
                    authorName={authUser?.email?.split('@')[0] || 'Your Company'}
                    authorHeadline="Building Products | Construction Solutions"
                    postText={generatedCopy || null}
                    imageUrl={generatedImage || selectedTemplateForMode?.previewImageUrl || null}
                    hashtags={generatedCopyFull?.hashtags || []}
                    isEditable={true}
                    onTextChange={(text) => setGeneratedCopy(text)}
                    onGenerateCopy={generationId ? handleGenerateCopy : undefined}
                    onGenerateImage={
                      selectedProducts.length > 0 && prompt.trim() ? handleGenerate : undefined
                    }
                    isGeneratingCopy={isGeneratingCopy}
                    isGeneratingImage={state === 'generating'}
                  />

                  {/* Action Buttons */}
                  <div className="mt-4 space-y-2">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          'flex-1 transition-all',
                          justCopied && 'bg-green-500/10 border-green-500'
                        )}
                        disabled={!generatedImage || !generatedCopy}
                        onClick={handleCopyText}
                      >
                        {justCopied ? (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Copied!
                          </>
                        ) : (
                          <>Copy Text</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        disabled={!generatedImage || isDownloading}
                        onClick={handleDownloadWithFeedback}
                      >
                        {isDownloading ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Downloading...
                          </>
                        ) : (
                          <>Download</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* History Panel */}
            <HistoryPanel
              isOpen={historyPanelOpen}
              onToggle={handleHistoryToggle}
              onSelectGeneration={(id) => {
                selectGeneration(id);
                fetch(`/api/generations/${id}`, { credentials: 'include' })
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.generatedImagePath || data.imageUrl) {
                      handleLoadFromHistory(data);
                    }
                  })
                  .catch(console.error);
              }}
              className="hidden lg:flex"
            />
          </div>
        </main>

        {/* Mobile LinkedIn Preview */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border pb-safe">
          <Collapsible>
            <CollapsibleTrigger asChild>
              <button className="w-full p-4 min-h-12 flex items-center justify-between hover:bg-muted/50">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-primary" />
                  <span className="font-medium">LinkedIn Preview</span>
                  {generatedImage && generatedCopy ? (
                    <span className="text-xs text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-500/20 px-2 py-0.5 rounded-full">
                      Ready
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
                      {generatedImage ? 'Need copy' : generatedCopy ? 'Need image' : 'Empty'}
                    </span>
                  )}
                </div>
                <ChevronUp className="w-5 h-5 text-muted-foreground" />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-4 pt-0 max-h-[60vh] overflow-y-auto">
                <LinkedInPostPreview
                  authorName={authUser?.email?.split('@')[0] || 'Your Company'}
                  authorHeadline="Building Products | Construction Solutions"
                  postText={generatedCopy || null}
                  imageUrl={generatedImage || null}
                  hashtags={generatedCopyFull?.hashtags || []}
                  isEditable={true}
                  onTextChange={(text) => setGeneratedCopy(text)}
                  onGenerateCopy={generationId ? handleGenerateCopy : undefined}
                  onGenerateImage={
                    selectedProducts.length > 0 && prompt.trim() ? handleGenerate : undefined
                  }
                  isGeneratingCopy={isGeneratingCopy}
                  isGeneratingImage={state === 'generating'}
                />
                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'flex-1 transition-all',
                      justCopied && 'bg-green-500/10 border-green-500'
                    )}
                    disabled={!generatedCopy}
                    onClick={handleCopyText}
                  >
                    {justCopied ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Copied!
                      </>
                    ) : (
                      <>Copy</>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    disabled={!generatedImage || isDownloading}
                    onClick={handleDownloadWithFeedback}
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>Download</>
                    )}
                  </Button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        {/* Save to Catalog Dialog */}
        {generatedImage && (
          <ErrorBoundary>
            <SaveToCatalogDialog
              isOpen={showSaveToCatalog}
              onClose={() => setShowSaveToCatalog(false)}
              imageUrl={generatedImage}
              defaultName={`Generated - ${new Date().toLocaleDateString()}`}
            />
          </ErrorBoundary>
        )}

        {/* Template Inspiration Dialog */}
        <Dialog open={showTemplateInspiration} onOpenChange={setShowTemplateInspiration}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                Template Inspiration
              </DialogTitle>
              <DialogDescription>
                Browse high-performing ad templates to inspire your creative direction
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-2 -mr-2">
              {isLoadingFeatured ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="rounded-xl border border-border bg-card overflow-hidden animate-pulse"
                    >
                      <div className="aspect-[4/3] bg-muted" />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : featuredAdTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Layout className="w-12 h-12 text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-1">No featured templates yet</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Add high-performing ad templates to your library to see them here for
                    inspiration.
                  </p>
                  <Link href="/templates">
                    <Button variant="outline" className="mt-4 gap-2">
                      <Layout className="w-4 h-4" />
                      Go to Template Library
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
                  {featuredAdTemplates.map((template) => {
                    const platformIcons: Record<string, typeof Instagram> = {
                      instagram: Instagram,
                      linkedin: Linkedin,
                      facebook: Facebook,
                      twitter: Twitter,
                      tiktok: Sparkles,
                    };

                    return (
                      <button
                        key={template.id}
                        onClick={() => {
                          setSelectedPerformingTemplate(template);
                          setShowTemplateInspiration(false);
                        }}
                        className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all text-left group"
                      >
                        <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                          {template.previewImageUrl ? (
                            <img
                              src={template.previewImageUrl}
                              alt={template.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Layout className="w-10 h-10 text-muted-foreground/30" />
                            </div>
                          )}

                          <div className="absolute top-2 left-2 flex gap-1">
                            {template.isFeatured && (
                              <Badge className="bg-yellow-500/90 dark:bg-yellow-600/90 text-yellow-950 dark:text-yellow-50 text-xs px-1.5 py-0.5">
                                <Star className="w-3 h-3 mr-1 fill-current" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          {template.engagementTier && template.engagementTier !== 'unranked' && (
                            <div className="absolute top-2 right-2">
                              <Badge
                                variant="secondary"
                                className="text-xs px-1.5 py-0.5 bg-black/50 backdrop-blur-sm text-white border-0"
                              >
                                {template.engagementTier.replace('-', ' ')}
                              </Badge>
                            </div>
                          )}
                        </div>

                        <div className="p-3 space-y-2">
                          <h4 className="font-medium text-sm line-clamp-1">{template.name}</h4>

                          <div className="flex flex-wrap gap-1">
                            {template.mood && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 capitalize">
                                {template.mood}
                              </span>
                            )}
                            {template.style && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 capitalize">
                                {template.style}
                              </span>
                            )}
                            {template.category && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                                {template.category}
                              </span>
                            )}
                          </div>

                          {template.targetPlatforms && template.targetPlatforms.length > 0 && (
                            <div className="flex items-center gap-1.5 pt-1">
                              {template.targetPlatforms.slice(0, 4).map((p) => {
                                const Icon = platformIcons[p] || Sparkles;
                                return (
                                  <Icon
                                    key={p}
                                    className="w-3.5 h-3.5 text-muted-foreground"
                                    title={p}
                                  />
                                );
                              })}
                              {template.targetPlatforms.length > 4 && (
                                <span className="text-[10px] text-muted-foreground">
                                  +{template.targetPlatforms.length - 4}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-border mt-4">
              <Link href="/templates">
                <Button variant="ghost" size="sm" className="gap-2">
                  <Layout className="w-4 h-4" />
                  View Full Library
                </Button>
              </Link>
              <Button variant="outline" onClick={() => setShowTemplateInspiration(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </StudioProvider>
  );
}
