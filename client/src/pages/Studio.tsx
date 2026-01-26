// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { cn, getProductImageUrl } from "@/lib/utils";
import type { Product, PromptTemplate, PerformingAdTemplate, AdSceneTemplate } from "@shared/schema";
import type { GenerationDTO } from "@shared/types/api";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { IdeaBankPanel } from "@/components/IdeaBankPanel";
import { LinkedInPostPreview } from "@/components/LinkedInPostPreview";
import { TemplateLibrary } from "@/components/TemplateLibrary";
import type { GenerationRecipe, TemplateSlotSuggestion, GenerationMode, IdeaBankMode } from "@shared/types/ideaBank";
import { UploadZone } from "@/components/UploadZone";
import type { AnalyzedUpload } from "@/types/analyzedUpload";
import { HistoryTimeline } from "@/components/HistoryTimeline";
import { HistoryPanel } from "@/components/studio/HistoryPanel";
import { SaveToCatalogDialog } from "@/components/SaveToCatalogDialog";
import { useHistoryPanelUrl } from "@/hooks/useUrlState";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/layout/Header";
import { StudioProvider } from "@/context/StudioContext";
import { ContentPlannerGuidance } from "@/components/ContentPlannerGuidance";
import { CarouselBuilder } from "@/components/CarouselBuilder";
import { BeforeAfterBuilder } from "@/components/BeforeAfterBuilder";
import { TextOnlyMode } from "@/components/TextOnlyMode";
import { getTemplateById, type ContentTemplate } from "@shared/contentTemplates";
import { toast } from "sonner";
import { useHaptic } from "@/hooks/useHaptic";
import { useRipple } from "@/hooks/useRipple";
import { useKeyboardShortcuts, type ShortcutConfig } from "@/hooks/useKeyboardShortcuts";
import { useGesture } from "@use-gesture/react";

// Icons
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
  Copy,
  X,
  Search,
  Filter,
  Package,
  Image as ImageIcon,
  Download,
  Share2,
  RefreshCw,
  Pencil,
  MessageCircle,
  Send,
  Loader2,
  History,
  LayoutGrid,
  Zap,
  Eye,
  FolderPlus,
  TrendingUp,
  Star,
  Layout,
  Instagram,
  Linkedin,
  Facebook,
  Twitter,
  Wand2,
  FileImage,
} from "lucide-react";

// Types
type GenerationState = "idle" | "generating" | "result";

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

// Persist collapsed state to localStorage
const COLLAPSED_SECTIONS_KEY = "studio-collapsed-sections";

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

// Section wrapper with collapse functionality
function Section({
  id,
  title,
  subtitle,
  isOpen,
  onToggle,
  children,
  className,
}: {
  id: string;
  title: string;
  subtitle?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <motion.section
        id={id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "rounded-2xl overflow-hidden transition-all duration-300",
          isOpen ? "neomorph shadow-layered" : "border border-border/50 shadow-sm",
          "bg-gradient-to-br from-card via-card to-card/50",
          "hover:shadow-xl hover:border-primary/20",
          className
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="w-full p-6 flex items-center justify-between hover:bg-muted/50 transition-colors">
            <div className="text-left">
              <h2 className="text-lg font-medium">{title}</h2>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {isOpen ? (
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-5 h-5 text-muted-foreground" />
            )}
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-6 pb-6">{children}</div>
        </CollapsibleContent>
      </motion.section>
    </Collapsible>
  );
}

// Progress Rail for desktop
function ProgressRail({
  currentSection,
  sections,
  onNavigate,
}: {
  currentSection: string;
  sections: { id: string; label: string; completed: boolean }[];
  onNavigate: (id: string) => void;
}) {
  return (
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
              "w-3 h-3 rounded-full border-2 transition-all",
              section.completed
                ? "bg-primary border-primary"
                : currentSection === section.id
                ? "border-primary bg-transparent"
                : "border-muted-foreground/30 bg-transparent"
            )}
          />
          <span className="absolute right-6 whitespace-nowrap text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-card px-2 py-1 rounded border border-border">
            {section.label}
          </span>
          {index < sections.length - 1 && (
            <div
              className={cn(
                "absolute top-3 left-1/2 -translate-x-1/2 w-0.5 h-4",
                section.completed ? "bg-primary" : "bg-muted-foreground/20"
              )}
            />
          )}
        </button>
      ))}
    </div>
  );
}

// Floating Context Bar
function ContextBar({
  selectedProducts,
  selectedTemplate,
  platform,
  visible,
}: {
  selectedProducts: Product[];
  selectedTemplate: PromptTemplate | null;
  platform: string;
  visible: boolean;
}) {
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
            <Package className="w-4 h-4 text-primary" />
            {selectedProducts.length} product{selectedProducts.length > 1 ? "s" : ""}
          </span>
        )}
        {selectedTemplate && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="flex items-center gap-1.5">
              <ImageIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              {selectedTemplate.title}
            </span>
          </>
        )}
        {platform && (
          <>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{platform}</span>
          </>
        )}
      </div>
    </motion.div>
  );
}

// Sticky Generate Bar
function StickyGenerateBar({
  visible,
  selectedProducts,
  platform,
  onGenerate,
  disabled,
  isGenerating,
}: {
  visible: boolean;
  selectedProducts: Product[];
  platform: string;
  onGenerate: () => void;
  disabled: boolean;
  isGenerating: boolean;
}) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 100, opacity: 0 }}
      className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 mb-safe"
    >
      <div className="relative">
        {/* Pulsing ring when ready */}
        {!disabled && !isGenerating && (
          <div className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-75" />
        )}

        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
          <Button
            size="lg"
            onClick={onGenerate}
            disabled={disabled || isGenerating}
            className={cn(
              "relative px-8 h-16 text-lg rounded-full shadow-2xl group overflow-hidden",
              !disabled && !isGenerating && "glass"
            )}
          >
            {/* Animated gradient background */}
            {!disabled && !isGenerating && (
              <div className="absolute inset-0 bg-gradient-to-r from-primary via-purple-500 to-primary animate-gradient-x opacity-90" />
            )}

            <span className="relative z-10 flex items-center">
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2 ai-sparkle ai-glow" />
                  Generate Image
                </>
              )}
            </span>
          </Button>
        </motion.div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-3">
        {selectedProducts.length} product{selectedProducts.length > 1 ? "s" : ""} • {platform}
      </p>
    </motion.div>
  );
}

export default function Studio() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Generation state
  const [state, setState] = useState<GenerationState>("idle");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  // Selection state
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<AdSceneTemplate | null>(null);
  const [templateCategory, setTemplateCategory] = useState<string>("all");
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState("LinkedIn");
  const [aspectRatio, setAspectRatio] = useState("1200x627");
  const [resolution, setResolution] = useState<"1K" | "2K" | "4K">("2K");

  // UI state
  const [collapsedSections, setCollapsedSections] = useState<CollapsedSections>(
    getStoredCollapsedSections
  );
  const [currentSection, setCurrentSection] = useState("products");
  const [showContextBar, setShowContextBar] = useState(false);
  const [showStickyGenerate, setShowStickyGenerate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [activeActionButton, setActiveActionButton] = useState<'edit' | 'copy' | 'preview' | 'save' | null>(null);

  // Quick start mode
  const [quickStartMode, setQuickStartMode] = useState(false);
  const [quickStartPrompt, setQuickStartPrompt] = useState("");

  // Temporary uploads (not saved to catalog) - with AI analysis
  const [tempUploads, setTempUploads] = useState<AnalyzedUpload[]>([]);

  // Price estimate
  const [priceEstimate, setPriceEstimate] = useState<{
    estimatedCost: number;
    p90: number;
    sampleCount: number;
    usedFallback: boolean;
  } | null>(null);

  // Edit/Ask AI state
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [askAIQuestion, setAskAIQuestion] = useState("");
  const [askAIResponse, setAskAIResponse] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);

  // Ad Copy state for LinkedIn Preview
  const [generatedCopy, setGeneratedCopy] = useState<string>("");
  const [isGeneratingCopy, setIsGeneratingCopy] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedCopyFull, setGeneratedCopyFull] = useState<CopyResult | null>(null);

  // Save to Catalog dialog state
  const [showSaveToCatalog, setShowSaveToCatalog] = useState(false);

  // Template Inspiration dialog state
  const [showTemplateInspiration, setShowTemplateInspiration] = useState(false);
  const [selectedPerformingTemplate, setSelectedPerformingTemplate] = useState<PerformingAdTemplate | null>(null);

  // Selected suggestion state - for highlighting and showing near textarea
  const [selectedSuggestion, setSelectedSuggestion] = useState<{
    id: string;
    prompt: string;
    reasoning?: string;
  } | null>(null);

  // GenerationRecipe from IdeaBank - contains relationships, scenarios, brand context
  const [generationRecipe, setGenerationRecipe] = useState<GenerationRecipe | undefined>(undefined);

  // IdeaBankMode: Controls Idea Bank orchestration ('freestyle' or 'template')
  const [ideaBankMode, setIdeaBankMode] = useState<IdeaBankMode>('freestyle');

  // GenerationMode: Controls how /api/transform processes templates ('exact_insert', 'inspiration', 'standard')
  // When user comes from Templates.tsx, this is set from query params
  const [generationMode, setGenerationMode] = useState<GenerationMode>('standard');

  const [selectedTemplateForMode, setSelectedTemplateForMode] = useState<AdSceneTemplate | null>(null);

  // Content Planner template state (from cpTemplateId query param)
  const [cpTemplate, setCpTemplate] = useState<ContentTemplate | null>(null);

  // Carousel Builder state (for carousel format content)
  const [showCarouselBuilder, setShowCarouselBuilder] = useState(false);
  const [carouselTopic, setCarouselTopic] = useState("");

  // Before/After Builder state (for transformation content)
  const [showBeforeAfterBuilder, setShowBeforeAfterBuilder] = useState(false);
  const [beforeAfterTopic, setBeforeAfterTopic] = useState("");

  // Text-Only Mode state (for text-only posts - 30% more reach!)
  const [showTextOnlyMode, setShowTextOnlyMode] = useState(false);
  const [textOnlyTopic, setTextOnlyTopic] = useState("");

  // History panel URL state
  const { isHistoryOpen, selectedGenerationId, openHistory, closeHistory, selectGeneration } = useHistoryPanelUrl();
  const [historyPanelOpen, setHistoryPanelOpen] = useState(isHistoryOpen);

  // 2026 UX: Haptic feedback, ripple effects, and copy state
  const { haptic } = useHaptic();
  const { createRipple } = useRipple();
  const [justCopied, setJustCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  // Phase 3: Image gesture controls (pinch-to-zoom, drag)
  const [imageScale, setImageScale] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });

  // Refs for scroll tracking
  const generateButtonRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const zoomContainerRef = useRef<HTMLDivElement>(null);

  // Auth
  const { data: authUser } = useQuery({
    queryKey: ["auth"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    retry: false,
  });

  // Fetch products
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) return [];
      const data = await res.json();
      // Handle both formats: direct array or wrapped {products: [...]}
      return Array.isArray(data) ? data : (data?.products || []);
    },
  });

  // Fetch ad scene templates
  const { data: templates = [] } = useQuery<AdSceneTemplate[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await fetch("/api/templates");
      if (!res.ok) return [];
      const data = await res.json();
      return data.templates || [];
    },
  });

  // Fetch featured performing ad templates (for inspiration)
  const { data: featuredAdTemplates = [], isLoading: isLoadingFeatured } = useQuery<PerformingAdTemplate[]>({
    queryKey: ["performing-ad-templates-featured"],
    queryFn: async () => {
      const res = await fetch("/api/performing-ad-templates/featured", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: showTemplateInspiration, // Only fetch when modal is opened
  });

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    "all",
    ...Array.from(
      new Set(products.map((p) => p.category).filter((c): c is string => !!c))
    ),
  ];

  // Persist collapsed state
  useEffect(() => {
    storeCollapsedSections(collapsedSections);
  }, [collapsedSections]);

  // Auto-save draft prompt to localStorage
  useEffect(() => {
    const savePromptDraft = () => {
      if (prompt) {
        localStorage.setItem("studio-prompt-draft", prompt);
      }
    };
    const timeout = setTimeout(savePromptDraft, 500);
    return () => clearTimeout(timeout);
  }, [prompt]);

  // Restore draft on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem("studio-prompt-draft");
    if (savedPrompt && !prompt) {
      setPrompt(savedPrompt);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync history panel URL state to local state
  useEffect(() => {
    setHistoryPanelOpen(isHistoryOpen);
  }, [isHistoryOpen]);

  // Handle wheel event for zoom with passive: false to allow preventDefault
  useEffect(() => {
    const container = zoomContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = -e.deltaY * 0.001;
      setImageScale(prev => Math.max(0.5, Math.min(3, prev + delta)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Load generation from URL param (?generation=:id)
  useEffect(() => {
    if (selectedGenerationId && !generatedImage) {
      fetch(`/api/generations/${selectedGenerationId}`, { credentials: 'include' })
        .then(res => res.json())
        .then(data => {
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

  // Fetch price estimate when inputs change
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
          operation: "generate",
          inputImagesCount: String(inputImagesCount),
          promptChars: String(promptChars),
        });

        const res = await fetch(`/api/pricing/estimate?${params}`);
        if (res.ok) {
          const data = await res.json();
          setPriceEstimate(data);
        }
      } catch {
        // Silent fail - price estimate is non-critical
      }
    };

    const debounceTimer = setTimeout(fetchPriceEstimate, 300);
    return () => clearTimeout(debounceTimer);
  }, [selectedProducts.length, tempUploads.length, prompt.length, resolution]);

  // Parse query params for template/pattern deep linking
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cpTemplateId = params.get('cpTemplateId');
    const freshStart = params.get('fresh') === 'true';

    // Handle fresh start - clear all state before loading template
    if (freshStart && cpTemplateId) {
      // Clear all existing state for a fresh start
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
      setCpTemplate(null); // Reset so the template gets re-loaded below

      // Also clear localStorage draft to prevent restoration
      localStorage.removeItem('studio-prompt-draft');

      // Remove the fresh param from URL to prevent re-triggering
      const newParams = new URLSearchParams(window.location.search);
      newParams.delete('fresh');
      const newUrl = newParams.toString() ? `?${newParams.toString()}` : window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Handle template selection from /templates page
    const templateId = params.get('templateId');
    const mode = params.get('mode');
    if (templateId && templates.length > 0) {
      const template = templates.find(t => t.id === templateId);
      if (template) {
        setSelectedTemplateForMode(template);
        setIdeaBankMode('template'); // Switch UI to template mode

        // Validate and set generation mode from query params (from Templates.tsx)
        if (mode && ['exact_insert', 'inspiration'].includes(mode)) {
          setGenerationMode(mode as GenerationMode);
        } else {
          // Default to exact_insert when template is selected
          setGenerationMode('exact_insert');
        }
      }
    }

    // Handle Content Planner template (cpTemplateId is already parsed above)
    if (cpTemplateId && !cpTemplate) {
      const contentPlannerTemplate = getTemplateById(cpTemplateId);
      if (contentPlannerTemplate) {
        setCpTemplate(contentPlannerTemplate);

        // Auto-select platform from template's best platforms
        if (contentPlannerTemplate.bestPlatforms.length > 0) {
          const bestPlatform = contentPlannerTemplate.bestPlatforms[0].platform;
          // Map to our platform names
          const platformMap: Record<string, string> = {
            'linkedin': 'LinkedIn',
            'instagram': 'Instagram',
            'facebook': 'Facebook',
            'twitter': 'Twitter',
            'tiktok': 'TikTok',
          };
          const mappedPlatform = platformMap[bestPlatform.toLowerCase()] || bestPlatform;
          setPlatform(mappedPlatform);

          // Auto-set aspect ratio based on format
          const format = contentPlannerTemplate.bestPlatforms[0].format;
          const formatLower = format.toLowerCase();

          // Format to aspect ratio mapping
          const formatAspectRatioMap: Record<string, string> = {
            'carousel': '1080x1350',
            'reel': '1080x1920',
            'story': '1080x1920',
            'video': '1920x1080',
            'post': '1200x627',
          };

          // Detect format type and set aspect ratio
          let detectedRatio = '1200x627'; // default

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

        // Pre-fill prompt with first example topic
        if (contentPlannerTemplate.exampleTopics.length > 0 && !prompt) {
          setPrompt(contentPlannerTemplate.exampleTopics[0]);
        }
      }
    }

    // Legacy: Handle suggestedPrompt (old format - now deprecated)
    const suggestedPrompt = params.get('suggestedPrompt');
    if (suggestedPrompt && !prompt && !cpTemplateId) {
      setPrompt(suggestedPrompt);
    }
  }, [templates, prompt, cpTemplate]);

  // Scroll tracking for context bar and sticky generate
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setShowContextBar(scrollY > 200 && state === "idle");

      if (generateButtonRef.current) {
        const rect = generateButtonRef.current.getBoundingClientRect();
        setShowStickyGenerate(rect.bottom < 0 && state === "idle");
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [state]);

  // Toggle product selection
  const toggleProductSelection = (product: Product) => {
    setSelectedProducts((prev) => {
      const isSelected = prev.some((p) => p.id === product.id);
      if (isSelected) {
        return prev.filter((p) => p.id !== product.id);
      } else {
        if (prev.length >= 6) return prev;
        return [...prev, product];
      }
    });
  };

  // Toggle section
  const toggleSection = (section: keyof CollapsedSections) => {
    setCollapsedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Navigate to section
  const navigateToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setCurrentSection(id);
    }
  };

  // Handle generation
  const handleGenerate = async () => {
    const hasImages = selectedProducts.length > 0 || tempUploads.length > 0;
    if (!hasImages && !quickStartMode) {
      return;
    }

    const finalPrompt = quickStartMode ? quickStartPrompt : prompt;
    if (!finalPrompt.trim()) return;

    setState("generating");

    try {
      const formData = new FormData();

      if (!quickStartMode) {
        // Add selected products as files
        const filePromises = selectedProducts.map(async (product) => {
          const imageUrl = getProductImageUrl(product.cloudinaryUrl);
          const response = await fetch(imageUrl);
          const blob = await response.blob();
          return new File([blob], `${product.name}.jpg`, { type: blob.type });
        });

        const files = await Promise.all(filePromises);
        files.forEach((file) => formData.append("images", file));

        // Add temp uploads (extract File from AnalyzedUpload)
        tempUploads.forEach((upload) => formData.append("images", upload.file));
      }

      formData.append("prompt", finalPrompt);
      formData.append("resolution", resolution);

      // Send template context if user has selected a template and is in template mode
      // Map IdeaBankMode to GenerationMode for the image generation endpoint
      if (ideaBankMode === 'template' && selectedTemplateForMode) {
        // Use the specific generationMode set from Templates.tsx query params,
        // or default to 'exact_insert' if not specified
        formData.append('mode', generationMode);
        formData.append('templateId', selectedTemplateForMode.id);
      }

      // Append GenerationRecipe if available (from IdeaBank suggestions)
      if (generationRecipe) {
        formData.append("recipe", JSON.stringify(generationRecipe));
      }

      const response = await fetch("/api/transform", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to transform image");
      }

      const data = await response.json();
      setGeneratedImage(data.imageUrl);
      setGenerationId(data.generationId);
      setState("result");

      // Clear the draft after successful generation
      localStorage.removeItem("studio-prompt-draft");

      // Scroll to result
      setTimeout(() => {
        document.getElementById("result")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error: any) {
      alert(`Failed to generate image: ${error.message}`);
      setState("idle");
    }
  };

  // Handle quick start generate
  const handleQuickStartGenerate = () => {
    if (!quickStartPrompt.trim()) return;
    setQuickStartMode(true);
    handleGenerate();
  };

  // Handle download
  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `product-${generationId || Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2026 UX: Download with feedback
  const handleDownloadWithFeedback = async () => {
    if (!generatedImage) return;

    // Immediate haptic feedback
    haptic('light');

    // Show loading state
    setIsDownloading(true);

    try {
      // Small delay to ensure loading state is visible
      await new Promise(resolve => setTimeout(resolve, 100));

      handleDownload();

      // Success feedback
      haptic('medium');
      toast.success('✓ Image downloaded!', {
        duration: 2000
      });
    } catch (error) {
      haptic('heavy');
      toast.error('✗ Download failed');
    } finally {
      // Keep loading state briefly so user sees the feedback
      setTimeout(() => setIsDownloading(false), 500);
    }
  };

  // Handle reset
  const handleReset = () => {
    setState("idle");
    setGeneratedImage(null);
    setGenerationId(null);
    setQuickStartMode(false);
    setQuickStartPrompt("");
    setTempUploads([]); // Clear temp uploads
    setGeneratedCopy(""); // Clear generated copy
  };

  // Keyboard shortcuts for power users
  const shortcuts: ShortcutConfig[] = [
    {
      key: 'g',
      ctrlKey: true,
      callback: () => {
        if (state === 'idle' && selectedProducts.length > 0) {
          handleGenerate();
        }
      },
      description: 'Generate image',
      disabled: state !== 'idle' || selectedProducts.length === 0
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
      disabled: !generatedImage
    },
    {
      key: 'r',
      ctrlKey: true,
      callback: handleReset,
      description: 'Reset workspace',
      disabled: state === 'idle' && !generatedImage
    },
    {
      key: '/',
      callback: () => {
        const promptTextarea = document.getElementById('prompt-textarea');
        if (promptTextarea) {
          promptTextarea.focus();
        }
      },
      description: 'Focus prompt'
    },
    {
      key: '?',
      shiftKey: true,
      callback: () => setShowKeyboardShortcuts(!showKeyboardShortcuts),
      description: 'Toggle shortcuts help'
    }
  ];

  useKeyboardShortcuts(shortcuts);

  // Handle edit
  const handleApplyEdit = async () => {
    if (!editPrompt.trim() || !generationId) return;

    // Immediate haptic feedback
    haptic('light');
    setIsEditing(true);

    try {
      const response = await fetch(`/api/generations/${generationId}/edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editPrompt: editPrompt.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Edit failed");
      }

      // Success feedback
      haptic('medium');
      toast.success('✓ Changes applied!', {
        duration: 2000
      });

      setLocation(`/generation/${data.generationId}`);
    } catch (error: any) {
      haptic('heavy');
      toast.error(`✗ ${error.message || "Edit failed"}`);
    } finally {
      setIsEditing(false);
    }
  };

  // Handle suggestion selection from Idea Bank
  const handleSelectSuggestion = (suggestionPrompt: string, suggestionId?: string, reasoning?: string) => {
    setPrompt(suggestionPrompt);
    setSelectedSuggestion({
      id: suggestionId || "selected",
      prompt: suggestionPrompt,
      reasoning,
    });
    // Scroll to prompt section to show the selection
    setTimeout(() => {
      document.getElementById("prompt")?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Clear selected suggestion when user manually edits prompt
  const handlePromptChange = (value: string) => {
    setPrompt(value);
    // Only clear selection if user is typing something different
    if (selectedSuggestion && value !== selectedSuggestion.prompt) {
      setSelectedSuggestion(null);
    }
  };

  // Handle Generate Ad Copy
  const handleGenerateCopy = async () => {
    if (!generationId) return;

    // Immediate haptic feedback
    haptic('light');
    setIsGeneratingCopy(true);

    try {
      // Build product info from selected products or prompt
      const productName = selectedProducts.length > 0
        ? selectedProducts.map(p => p.name).join(", ")
        : "Product";
      const productDescription = selectedProducts.length > 0
        ? selectedProducts.map(p => p.description || p.name).join(". ")
        : (prompt || quickStartPrompt || "Professional product for marketing");

      const response = await fetch("/api/copy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          generationId,
          platform: platform.toLowerCase() as "linkedin" | "instagram" | "facebook" | "twitter" | "tiktok",
          tone: "professional",
          productName: productName.slice(0, 100), // Max 100 chars
          productDescription: productDescription.slice(0, 500), // Max 500 chars
          industry: "Building Products", // Default industry
          framework: "auto",
          variations: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate copy");
      }

      // Use the first variation
      if (data.variations && data.variations.length > 0) {
        setGeneratedCopy(data.variations[0].copy);

        // Success feedback
        haptic('medium');
        toast.success('✓ Copy generated!', {
          duration: 2000
        });
      }
    } catch (error: any) {
      haptic('heavy');
      toast.error(`✗ ${error.message || "Failed to generate copy"}`);
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  // Handle loading a generation from history
  const handleLoadFromHistory = (generation: GenerationDTO) => {
    // imageUrl is already transformed by DTO (handles Cloudinary vs local paths)
    setGeneratedImage(generation.imageUrl);
    setGenerationId(generation.id);
    setPrompt(generation.prompt || "");
    setState("result");
    // Scroll to result
    setTimeout(() => {
      document.getElementById("result")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Handle history panel toggle
  const handleHistoryToggle = () => {
    if (historyPanelOpen) {
      closeHistory();
    } else {
      openHistory();
    }
    setHistoryPanelOpen(!historyPanelOpen);
  };

  // Handle Ask AI
  const handleAskAI = async () => {
    if (!askAIQuestion.trim() || !generationId) return;

    setIsAskingAI(true);
    setAskAIResponse(null);

    try {
      const response = await fetch(`/api/generations/${generationId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: askAIQuestion.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to get response");
      }

      setAskAIResponse(data.answer);
      setAskAIQuestion("");
    } catch (error: any) {
      alert(error.message || "Failed to get response");
    } finally {
      setIsAskingAI(false);
    }
  };

  // Handle selecting a performing ad template for inspiration
  const handleSelectPerformingTemplate = (template: PerformingAdTemplate) => {
    setSelectedPerformingTemplate(template);

    // Map template platform to our platform names
    const platformMap: Record<string, string> = {
      instagram: "Instagram",
      linkedin: "LinkedIn",
      facebook: "Facebook",
      twitter: "Twitter",
      tiktok: "TikTok",
    };

    // Map aspect ratios to our format
    const aspectRatioMap: Record<string, string> = {
      "1:1": "1200x1200",
      "16:9": "1920x1080",
      "9:16": "1080x1920",
      "4:5": "1080x1350",
      "1.91:1": "1200x627",
    };

    // Set platform from first target platform
    if (template.targetPlatforms && template.targetPlatforms.length > 0) {
      const mappedPlatform = platformMap[template.targetPlatforms[0]];
      if (mappedPlatform) {
        setPlatform(mappedPlatform);
      }
    }

    // Set aspect ratio from first target aspect ratio
    if (template.targetAspectRatios && template.targetAspectRatios.length > 0) {
      const mappedRatio = aspectRatioMap[template.targetAspectRatios[0]];
      if (mappedRatio) {
        setAspectRatio(mappedRatio);
      }
    }

    // Build style hints for the prompt
    const styleHints: string[] = [];
    if (template.mood) styleHints.push(template.mood);
    if (template.style) styleHints.push(template.style);
    if (template.backgroundType) styleHints.push(`${template.backgroundType} background`);

    // Add style hints to prompt if any exist
    if (styleHints.length > 0) {
      const stylePrefix = `Style: ${styleHints.join(", ")}. `;
      // Only prepend if not already in prompt
      if (!prompt.startsWith("Style:")) {
        setPrompt((prev) => prev ? `${stylePrefix}${prev}` : stylePrefix);
      }
    }

    // Close the modal
    setShowTemplateInspiration(false);
  };

  // Progress rail sections
  const progressSections = [
    { id: "upload", label: "Upload", completed: tempUploads.length > 0 },
    { id: "products", label: "Products", completed: selectedProducts.length > 0 },
    { id: "templates", label: "Style", completed: !!selectedTemplate },
    { id: "prompt", label: "Prompt", completed: !!prompt.trim() },
    { id: "generate", label: "Generate", completed: state === "result" },
    { id: "result", label: "Result", completed: state === "result" },
  ];

  return (
    <StudioProvider>
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans relative">
      {/* Background Ambience - 2026 floating gradients */}
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

      {/* Progress Rail (Desktop) */}
      <ProgressRail
        currentSection={currentSection}
        sections={progressSections}
        onNavigate={navigateToSection}
      />

      {/* Main Content - 2/3 Column Layout on Desktop */}
      {/* pb-24 on mobile accounts for the ~60px fixed bottom preview bar */}
      <main className={cn(
        "container mx-auto px-6 pt-24 pb-24 lg:pb-12 relative z-10",
        historyPanelOpen ? "max-w-[1600px]" : "max-w-7xl"
      )}>
        {/* Desktop: 2/3-column grid (with optional history panel), Mobile: single column */}
        <div className={cn(
          "lg:grid lg:gap-8",
          historyPanelOpen
            ? "lg:grid-cols-[1fr_400px_320px]"
            : "lg:grid-cols-[1fr_400px]"
        )}>
          {/* Left Column - All Inputs (scrollable) */}
          <div className="space-y-8 min-w-0">
          {/* Hero Section */}
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 py-8"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-zinc-900 to-zinc-900/60 dark:from-white dark:to-white/60 bg-clip-text text-transparent">
              Create stunning product visuals
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select products, describe your vision, and generate professional marketing content in minutes.
            </p>
            {/* Quick Actions */}
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleHistoryToggle}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                {historyPanelOpen ? "Hide History" : "History"}
              </Button>
            </div>
          </motion.div>

          {/* Quick Start */}
          {state === "idle" && (
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
                  placeholder="Describe what you want to create... e.g., 'A minimalist product shot with soft natural lighting on a clean white background' or 'Dynamic lifestyle image showing the product in use outdoors'"
                  className="flex-1 min-h-[120px] resize-none text-base"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleQuickStartGenerate();
                    }
                  }}
                />
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Press Enter to generate, Shift+Enter for new line</span>
                  <Button
                    onClick={handleQuickStartGenerate}
                    disabled={!quickStartPrompt.trim()}
                  >
                    <Sparkles className="w-4 h-4 mr-2 ai-sparkle text-primary ai-glow" />
                    Generate Now
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Or scroll down for the full studio experience with product selection and templates.
              </p>
            </motion.div>
          )}

          {/* Generating State */}
          {state === "generating" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center min-h-[400px] space-y-6"
            >
              {/* Orbital loader with enhanced depth */}
              <div className="relative w-24 h-24">
                <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                <div className="absolute inset-2 rounded-full border-4 border-transparent border-r-purple-500 animate-spin-reverse" style={{ animationDuration: '1.5s' }} />
                <Sparkles className="absolute inset-0 m-auto w-8 h-8 text-primary ai-glow" />
              </div>

              {/* Progress text with animated gradient */}
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-gradient-animated">
                  Generating magic...
                </p>
                <p className="text-sm text-muted-foreground">
                  This usually takes 5-10 seconds
                </p>
              </div>

              {/* Pulse indicator */}
              <div className="flex gap-2">
                {[0, 1, 2].map(i => (
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
          {state === "result" && generatedImage && (
            <motion.div
              id="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8"
            >
              {/* Result Header */}
              <div className="flex items-center justify-between">
                <Button variant="ghost" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Start New
                </Button>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleDownloadWithFeedback}
                    disabled={isDownloading}
                    className="hover:scale-105 transition-all"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </>
                    )}
                  </Button>
                  <Link href={`/generation/${generationId}`}>
                    <Button
                      variant="outline"
                      className="hover:scale-105 transition-all hover:border-primary/50"
                    >
                      <History className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Generated Image with Pinch-to-Zoom */}
              <div
                ref={zoomContainerRef}
                className="rounded-2xl overflow-hidden border border-border bg-black relative touch-none select-none"
              >
                <motion.div
                  style={{
                    scale: imageScale,
                    x: imagePosition.x,
                    y: imagePosition.y,
                    cursor: imageScale > 1 ? 'grab' : 'default'
                  }}
                  onDoubleClick={() => {
                    // Reset zoom on double-click
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

                {/* Zoom controls hint */}
                {imageScale === 1 && (
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full text-xs text-white/80">
                    Scroll to zoom • Double-click to reset
                  </div>
                )}

                {/* Current zoom level indicator */}
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

              {/* Action Buttons - 2026 UX with active states */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <Button
                  variant={activeActionButton === 'edit' ? "default" : "outline"}
                  className={cn(
                    "h-14 transition-all",
                    activeActionButton === 'edit' && "ring-2 ring-primary/30 scale-105"
                  )}
                  onClick={() => {
                    haptic('light');
                    setActiveActionButton('edit');
                    toggleSection("refine");
                    if (collapsedSections.refine) {
                      toast.success("Edit panel opened");
                      // Scroll to the refine section after it opens
                      setTimeout(() => {
                        document.getElementById('refine')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }
                  }}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant={activeActionButton === 'copy' ? "default" : "outline"}
                  className={cn(
                    "h-14 transition-all",
                    activeActionButton === 'copy' && "ring-2 ring-primary/30 scale-105"
                  )}
                  onClick={() => {
                    haptic('light');
                    setActiveActionButton('copy');
                    toggleSection("copy");
                    if (collapsedSections.copy) {
                      toast.success("Copy panel opened");
                      // Scroll to the ask-ai section after it opens
                      setTimeout(() => {
                        document.getElementById('ask-ai')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant={activeActionButton === 'preview' ? "default" : "outline"}
                  className={cn(
                    "h-14 transition-all",
                    activeActionButton === 'preview' && "ring-2 ring-primary/30 scale-105"
                  )}
                  onClick={() => {
                    haptic('light');
                    setActiveActionButton('preview');
                    toggleSection("preview");
                    if (collapsedSections.preview) {
                      toast.success("Preview panel opened");
                      // Scroll to the linkedin-preview section after it opens
                      setTimeout(() => {
                        document.getElementById('linkedin-preview')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }, 100);
                    }
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant={activeActionButton === 'save' ? "default" : "outline"}
                  className={cn(
                    "h-14 transition-all",
                    activeActionButton === 'save' && "ring-2 ring-primary/30 scale-105"
                  )}
                  onClick={() => {
                    haptic('light');
                    setActiveActionButton('save');
                    setShowSaveToCatalog(true);
                    toast.success("Save dialog opened");
                  }}
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Save
                </Button>
                <Button
                  variant={justCopied ? "default" : "outline"}
                  className={cn(
                    "h-14 transition-all",
                    justCopied && "bg-green-500/10 border-green-500"
                  )}
                  disabled={!generatedCopy}
                  onClick={async () => {
                    if (!generatedCopy) return;

                    haptic('light');

                    try {
                      await navigator.clipboard.writeText(generatedCopy);
                      setJustCopied(true);
                      setTimeout(() => setJustCopied(false), 2000);
                      toast.success('✓ Copied to clipboard!', { duration: 2000 });
                    } catch (error) {
                      toast.error('Failed to copy to clipboard');
                    }
                  }}
                >
                  {justCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Text
                    </>
                  )}
                </Button>
              </div>

              {/* History Timeline */}
              <ErrorBoundary>
                <HistoryTimeline
                  currentGenerationId={generationId}
                  onSelect={handleLoadFromHistory}
                />
              </ErrorBoundary>

              {/* Refine Section */}
              <Section
                id="refine"
                title="Refine Your Image"
                subtitle="Describe what you'd like to change"
                isOpen={!collapsedSections.refine}
                onToggle={() => toggleSection("refine")}
              >
                <div className="space-y-4">
                  <Textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="e.g., 'Make the lighting warmer' or 'Add a subtle shadow'"
                    rows={3}
                    className="resize-none"
                  />
                  <div className="flex flex-wrap gap-2">
                    {["Warmer lighting", "Cooler tones", "More contrast", "Blur background"].map((preset) => (
                      <Button
                        key={preset}
                        variant="outline"
                        size="sm"
                        onClick={() => setEditPrompt(preset)}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={handleApplyEdit}
                    disabled={!editPrompt.trim() || isEditing}
                    className="w-full"
                  >
                    {isEditing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Applying...
                      </>
                    ) : (
                      "Apply Changes"
                    )}
                  </Button>
                </div>
              </Section>

              {/* Ask AI Section */}
              <Section
                id="ask-ai"
                title="Ask AI"
                subtitle="Get insights about your generation"
                isOpen={!collapsedSections.copy}
                onToggle={() => toggleSection("copy")}
              >
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      value={askAIQuestion}
                      onChange={(e) => setAskAIQuestion(e.target.value)}
                      placeholder="Ask a question about the image..."
                      onKeyDown={(e) => e.key === "Enter" && handleAskAI()}
                    />
                    <Button
                      onClick={handleAskAI}
                      disabled={!askAIQuestion.trim() || isAskingAI}
                    >
                      {isAskingAI ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  {askAIResponse && (
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-sm whitespace-pre-wrap">{askAIResponse}</p>
                    </div>
                  )}
                </div>
              </Section>

              {/* LinkedIn Preview Section */}
              <Section
                id="linkedin-preview"
                title="Preview on LinkedIn"
                subtitle={generatedCopy ? "See how your post will look" : "Generate copy first to see preview"}
                isOpen={!collapsedSections.preview}
                onToggle={() => toggleSection("preview")}
              >
                <div className="space-y-4">
                  {!generatedCopy ? (
                    <div className="text-center py-8">
                      <Eye className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground mb-4">
                        Generate ad copy to see how your post will look on LinkedIn
                      </p>
                      <Button
                        onClick={handleGenerateCopy}
                        disabled={isGeneratingCopy}
                      >
                        {isGeneratingCopy ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 mr-2 ai-sparkle text-primary ai-glow" />
                            Generate Ad Copy
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {/* Editable Copy */}
                      <div>
                        <label className="text-sm text-muted-foreground mb-2 block">
                          Edit your post text:
                        </label>
                        <Textarea
                          value={generatedCopy}
                          onChange={(e) => setGeneratedCopy(e.target.value)}
                          rows={4}
                          className="resize-none"
                        />
                      </div>

                      {/* LinkedIn Preview */}
                      <div className="pt-4 border-t border-border">
                        <LinkedInPostPreview
                          authorName={authUser?.email?.split("@")[0] || "Your Company"}
                          authorHeadline="Building Products | Construction Solutions"
                          postText={generatedCopy}
                          imageUrl={generatedImage || undefined}
                          hashtags={generatedCopyFull?.hashtags || []}
                        />
                      </div>

                      {/* Regenerate Button */}
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGenerateCopy}
                          disabled={isGeneratingCopy}
                        >
                          {isGeneratingCopy ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <RefreshCw className="w-4 h-4 mr-2" />
                          )}
                          Regenerate Copy
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </Section>
            </motion.div>
          )}

          {/* Idle State - Full Flow */}
          {state === "idle" && (
            <>
              {/* Generation Path Selection */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="w-5 h-5 text-primary ai-sparkle ai-glow" />
                  <h3 className="font-medium">Choose Your Path</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Freestyle Mode */}
                  <button
                    onClick={() => {
                      setIdeaBankMode('freestyle');
                      setGenerationMode('standard');
                      setSelectedTemplateForMode(null);
                    }}
                    className={cn(
                      "p-6 rounded-xl border-2 transition-all text-left group",
                      ideaBankMode === 'freestyle'
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50 bg-card/50"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        ideaBankMode === 'freestyle'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                      )}>
                        <Wand2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">Freestyle</h4>
                        {ideaBankMode === 'freestyle' && (
                          <Check className="w-4 h-4 text-primary inline ml-2" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      AI suggests complete scene ideas based on your products. Full creative freedom.
                    </p>
                  </button>

                  {/* Template Mode */}
                  <button
                    onClick={() => {
                      setIdeaBankMode('template');
                      setGenerationMode('exact_insert'); // Default to exact_insert
                    }}
                    className={cn(
                      "p-6 rounded-xl border-2 transition-all text-left group",
                      ideaBankMode === 'template'
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50 bg-card/50"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        ideaBankMode === 'template'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                      )}>
                        <FileImage className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">Use Template</h4>
                        {ideaBankMode === 'template' && (
                          <Check className="w-4 h-4 text-primary inline ml-2" />
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Pick a proven scene template, AI fills in the details with your products.
                    </p>
                  </button>
                </div>

                {/* Template Picker - shown when template mode is selected */}
                {ideaBankMode === 'template' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-4 rounded-xl border border-border bg-card/30 mt-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layout className="w-4 h-4 text-primary" />
                          <span className="font-medium">Select a Template</span>
                        </div>
                        {selectedTemplateForMode?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedTemplateForMode(null)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                          </Button>
                        )}
                      </div>
                      <TemplateLibrary
                        onSelectTemplate={(template: AdSceneTemplate) => {
                          setSelectedTemplateForMode(template);
                        }}
                        selectedTemplateId={selectedTemplateForMode?.id || undefined}
                        className="max-h-[400px] overflow-y-auto"
                      />
                    </div>
                  </motion.div>
                )}
              </motion.div>

              {/* Upload Section - Temporary Images */}
              <Section
                id="upload"
                title="Upload Images"
                subtitle="One-time use (not saved to catalog)"
                isOpen={!collapsedSections.upload}
                onToggle={() => toggleSection("upload")}
              >
                <UploadZone
                  uploads={tempUploads}
                  onUploadsChange={setTempUploads}
                  maxFiles={6 - selectedProducts.length}
                  disabled={selectedProducts.length + tempUploads.length >= 6}
                />
              </Section>

              {/* Products Section */}
              <Section
                id="products"
                title="Your Products"
                subtitle={`Select up to 6 products (${selectedProducts.length} selected)`}
                isOpen={!collapsedSections.products}
                onToggle={() => toggleSection("products")}
              >
                <div className="space-y-4">
                  {/* Selected Products Preview */}
                  {selectedProducts.length > 0 && (
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                      {selectedProducts.map((product) => (
                        <div
                          key={product.id}
                          className="relative group w-16 h-16 rounded-lg overflow-hidden border-2 border-primary"
                        >
                          <img
                            src={getProductImageUrl(product.cloudinaryUrl)}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => toggleProductSelection(product)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <X className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => setSelectedProducts([])}
                        className="text-xs text-muted-foreground hover:text-foreground"
                      >
                        Clear all
                      </button>
                    </div>
                  )}

                  {/* Filters */}
                  <div className="flex gap-3">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        placeholder="Search products..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-[160px]">
                        <Filter className="w-4 h-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat === "all" ? "All Categories" : cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Product Grid - Bento-style layout with featured products */}
                  <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border/50 p-2">
                    <div className="grid grid-cols-6 gap-2 sm:gap-3 auto-rows-[80px]">
                      {filteredProducts.map((product, index) => {
                        const isSelected = selectedProducts.some((p) => p.id === product.id);
                        const isFeatured = index === 0;
                        const isWide = (index + 1) % 7 === 0;

                        return (
                          <button
                            key={product.id}
                            onClick={(e) => {
                              createRipple(e);
                              haptic('light');
                              toggleProductSelection(product);
                            }}
                            disabled={!isSelected && selectedProducts.length >= 6}
                            className={cn(
                              "card-interactive relative rounded-xl overflow-hidden border-2 transition-all group",
                              // Bento grid sizing
                              isFeatured && "col-span-2 row-span-2",
                              isWide && !isFeatured && "col-span-3",
                              !isFeatured && !isWide && "col-span-1",
                              // Selection states
                              isSelected
                                ? "border-primary ring-2 ring-primary/20 scale-105"
                                : "border-border hover:border-primary/50 hover:scale-102",
                              !isSelected && selectedProducts.length >= 6 && "opacity-50"
                            )}
                          >
                            <img
                              src={getProductImageUrl(product.cloudinaryUrl)}
                              alt={product.name}
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                              loading="lazy"
                            />

                            {/* Gradient overlay on hover */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                              <p className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium truncate">
                                {product.name}
                              </p>
                            </div>

                            {/* Selection indicator */}
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary shadow-lg flex items-center justify-center"
                              >
                                <Check className="w-4 h-4 text-white" />
                              </motion.div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {filteredProducts.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No products found</p>
                    </div>
                  )}
                </div>
              </Section>

              {/* Templates Section */}
              <Section
                id="templates"
                title="Style & Template"
                subtitle={selectedTemplate ? `Selected: ${selectedTemplate.title}` : "Choose a starting point (optional)"}
                isOpen={!collapsedSections.templates}
                onToggle={() => toggleSection("templates")}
              >
                <div className="space-y-4">
                  {/* Category Filter */}
                  <div className="flex flex-wrap gap-2">
                    {["all", ...Array.from(new Set(templates.map(t => t.category).filter(Boolean)))].map((cat) => (
                      <Button
                        key={cat}
                        variant={templateCategory === cat ? "default" : "outline"}
                        size="sm"
                        onClick={() => setTemplateCategory(cat)}
                      >
                        {cat === "all" ? "All" : cat}
                      </Button>
                    ))}
                  </div>

                  {/* Templates Horizontal Scroll */}
                  {templates.length > 0 ? (
                    <div className="flex gap-4 overflow-x-auto pb-3 px-1 -mx-1 snap-x snap-mandatory scroll-smooth touch-pan-x">
                      {templates
                        .filter(t => templateCategory === "all" || t.category === templateCategory)
                        .map((template) => (
                          <button
                            key={template.id}
                            onClick={() => {
                              if (selectedTemplate?.id === template.id) {
                                setSelectedTemplate(null);
                              } else {
                                setSelectedTemplate(template);
                                // Pre-fill the prompt with the template
                                setPrompt(template.promptBlueprint);
                              }
                            }}
                            className={cn(
                              "flex-shrink-0 p-4 rounded-xl border-2 transition-all text-left min-w-[200px] max-w-[220px] snap-start touch-manipulation",
                              selectedTemplate?.id === template.id
                                ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                                : "border-border hover:border-primary/50 bg-card/50 active:scale-[0.98]"
                            )}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-primary truncate">
                                {template.category || "General"}
                              </span>
                              {selectedTemplate?.id === template.id && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </div>
                            <p className="text-sm font-medium truncate">{template.title}</p>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                              {template.description || template.promptBlueprint}
                            </p>
                            {template.tags && template.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {template.tags.slice(0, 3).map((tag, i) => (
                                  <span
                                    key={i}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-muted-foreground"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </button>
                        ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No templates available. Add templates in the admin section.
                    </p>
                  )}

                  {selectedTemplate && (
                    <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border border-primary/20">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-primary" />
                        <span className="text-sm">Using template: <strong>{selectedTemplate.title}</strong></span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedTemplate(null)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Template Inspiration - High-performing ads */}
                  <div className="pt-4 border-t border-border/50">
                    <button
                      onClick={() => setShowTemplateInspiration(true)}
                      className="w-full p-4 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 dark:from-yellow-500/30 to-orange-500/20 dark:to-orange-500/30 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium flex items-center gap-2">
                            Template Inspiration
                            {featuredAdTemplates.length > 0 && (
                              <Badge variant="secondary" className="text-xs">
                                {featuredAdTemplates.length} featured
                              </Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Browse high-performing ad templates for style ideas
                          </p>
                        </div>
                        <Star className="w-5 h-5 text-muted-foreground group-hover:text-yellow-600 dark:group-hover:text-yellow-400 transition-colors" />
                      </div>
                    </button>

                    {/* Show selected performing template */}
                    {selectedPerformingTemplate && (
                      <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-500/20 dark:border-yellow-500/30">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
                          <span className="text-sm">
                            Inspired by: <strong>{selectedPerformingTemplate.name}</strong>
                          </span>
                          {selectedPerformingTemplate.engagementTier && selectedPerformingTemplate.engagementTier !== "unranked" && (
                            <Badge variant="outline" className="text-xs bg-yellow-500/10 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 border-yellow-500/30 dark:border-yellow-500/20">
                              {selectedPerformingTemplate.engagementTier.replace("-", " ")}
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedPerformingTemplate(null)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    Select a template to pre-fill your prompt, or skip and describe your vision below.
                  </p>
                </div>
              </Section>

              {/* Prompt Section */}
              <motion.section
                id="prompt"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl border border-border bg-card/30 backdrop-blur-sm space-y-6"
              >
                <h2 className="text-lg font-medium">Describe Your Vision</h2>

                {/* Selected Suggestion Card - shows when a suggestion is selected */}
                <AnimatePresence>
                  {selectedSuggestion && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, y: -10, height: 0 }}
                      className="p-4 rounded-xl bg-primary/10 border-2 border-primary/30 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-primary">Selected Suggestion</span>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedSuggestion(null);
                            setPrompt("");
                          }}
                          className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      {selectedSuggestion.reasoning && (
                        <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">
                          {selectedSuggestion.reasoning}
                        </p>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content Planner Guidance Panel */}
                {cpTemplate && !showCarouselBuilder && !showBeforeAfterBuilder && !showTextOnlyMode && (
                  <ContentPlannerGuidance
                    template={cpTemplate}
                    platform={platform}
                    onDismiss={() => {
                      setCpTemplate(null);
                      // Clear the URL param
                      const url = new URL(window.location.href);
                      url.searchParams.delete('cpTemplateId');
                      window.history.replaceState({}, '', url.toString());
                    }}
                    onSelectHook={(hook) => {
                      setPrompt(hook);
                    }}
                    onGenerateCopy={(copy) => {
                      setGeneratedCopy(copy);
                    }}
                    onSetAspectRatio={(ratio) => {
                      setAspectRatio(ratio);
                    }}
                    onGenerateImage={() => {
                      // Check format and open appropriate builder
                      const format = cpTemplate.bestPlatforms[0]?.format?.toLowerCase() || '';
                      const topic = prompt || cpTemplate.exampleTopics[0] || cpTemplate.title;

                      if (format.includes('carousel') || format.includes('slides')) {
                        // Carousel format
                        setCarouselTopic(topic);
                        setShowCarouselBuilder(true);
                      } else if (format.includes('before') && format.includes('after')) {
                        // Before/After format
                        setBeforeAfterTopic(topic);
                        setShowBeforeAfterBuilder(true);
                      } else if (format.includes('text') || format.includes('thread')) {
                        // Text-only format (30% more reach on LinkedIn!)
                        setTextOnlyTopic(topic);
                        setShowTextOnlyMode(true);
                      } else {
                        // Standard image generation
                        handleGenerate();
                      }
                    }}
                    productNames={selectedProducts.map(p => p.name)}
                    hasProductsSelected={selectedProducts.length > 0 || tempUploads.length > 0}
                    availableProducts={products}
                    selectedProductIds={selectedProducts.map(p => p.id)}
                    onProductSelectionChange={(productIds) => {
                      const newProducts = products.filter(p => productIds.includes(p.id));
                      setSelectedProducts(newProducts);
                    }}
                    onGenerateComplete={(result) => {
                      // Store full copy object for future use
                      if (result.copy) {
                        setGeneratedCopyFull(result.copy);
                        // Keep caption in generatedCopy for backward compatibility
                        if (result.copy.caption) {
                          setGeneratedCopy(result.copy.caption);
                        }
                      }
                      // Handle image: use imageUrl if provided, otherwise set prompt for generation
                      if (result.image?.imageUrl && result.image.imageUrl.trim()) {
                        setGeneratedImageUrl(result.image.imageUrl);
                      } else if (result.image?.prompt && result.image.prompt.trim()) {
                        setPrompt(result.image.prompt);
                      }
                    }}
                  />
                )}

                {/* Carousel Builder - shown when creating carousel content */}
                {showCarouselBuilder && cpTemplate && (
                  <CarouselBuilder
                    templateId={cpTemplate.id}
                    topic={carouselTopic}
                    platform={platform}
                    productNames={selectedProducts.map(p => p.name)}
                    productImageUrls={selectedProducts.map(p => p.cloudinaryUrl).filter(Boolean) as string[]}
                    aspectRatio={aspectRatio}
                    onClose={() => {
                      setShowCarouselBuilder(false);
                    }}
                    onComplete={(outline) => {
                      // Optionally handle completed carousel
                      setShowCarouselBuilder(false);
                    }}
                  />
                )}

                {/* Before/After Builder - shown when creating transformation content */}
                {showBeforeAfterBuilder && cpTemplate && (
                  <BeforeAfterBuilder
                    templateId={cpTemplate.id}
                    topic={beforeAfterTopic}
                    platform={platform}
                    productNames={selectedProducts.map(p => p.name)}
                    productImageUrls={selectedProducts.map(p => p.cloudinaryUrl).filter(Boolean) as string[]}
                    aspectRatio={aspectRatio}
                    onClose={() => {
                      setShowBeforeAfterBuilder(false);
                    }}
                    onComplete={(result) => {
                      // Optionally handle completed before/after
                      setShowBeforeAfterBuilder(false);
                    }}
                  />
                )}

                {/* Text-Only Mode - shown for text posts (30% more reach on LinkedIn!) */}
                {showTextOnlyMode && cpTemplate && (
                  <TextOnlyMode
                    templateId={cpTemplate.id}
                    topic={textOnlyTopic}
                    platform={platform}
                    onClose={() => {
                      setShowTextOnlyMode(false);
                    }}
                    onComplete={(result) => {
                      // Set the generated copy
                      setGeneratedCopy(result.copy);
                      setShowTextOnlyMode(false);
                    }}
                  />
                )}

                {/* Main Prompt Textarea */}
                <div className="space-y-2">
                  <Textarea
                    value={prompt}
                    onChange={(e) => handlePromptChange(e.target.value)}
                    placeholder="Professional construction site product shot, NDS drainage solutions installed in active trench work..."
                    rows={5}
                    className={cn(
                      "resize-none text-lg transition-all",
                      selectedSuggestion && "border-primary/50 ring-2 ring-primary/20"
                    )}
                  />
                  {prompt && (
                    <p className="text-xs text-muted-foreground text-right">
                      {prompt.length} characters
                    </p>
                  )}
                </div>

                {/* Idea Bank - suggestions based on selected products */}
                <ErrorBoundary>
                  <IdeaBankPanel
                    selectedProducts={selectedProducts}
                    tempUploads={tempUploads}
                    onSelectPrompt={(promptText, id, reasoning) => handleSelectSuggestion(promptText, id, reasoning)}
                    onRecipeAvailable={(recipe) => setGenerationRecipe(recipe)}
                    onSetPlatform={setPlatform}
                    onSetAspectRatio={setAspectRatio}
                    onQuickGenerate={(promptText) => {
                      setPrompt(promptText);
                      // Small delay to ensure state is updated before generating
                      setTimeout(() => handleGenerate(), 100);
                    }}
                    selectedPromptId={selectedSuggestion?.id}
                    isGenerating={state === "generating"}
                    mode={ideaBankMode}
                    templateId={selectedTemplateForMode?.id || undefined}
                    onSlotSuggestionSelect={(suggestion: TemplateSlotSuggestion, mergedPrompt: string) => {
                      // When user selects a slot suggestion in template mode,
                      // set the merged prompt for generation
                      setPrompt(mergedPrompt);
                      setSelectedSuggestion({
                        id: `slot-${Date.now()}`,
                        prompt: mergedPrompt,
                        reasoning: suggestion.reasoning,
                      });
                    }}
                  />
                </ErrorBoundary>

                {/* Platform & Aspect Ratio */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Platform:</span>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger className="w-full sm:w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                        <SelectItem value="Instagram">Instagram</SelectItem>
                        <SelectItem value="Facebook">Facebook</SelectItem>
                        <SelectItem value="Twitter">Twitter/X</SelectItem>
                        <SelectItem value="TikTok">TikTok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Size:</span>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="w-full sm:w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1200x627">1200×627 (LinkedIn Post)</SelectItem>
                        <SelectItem value="1200x1200">1200×1200 (Square)</SelectItem>
                        <SelectItem value="1080x1350">1080×1350 (Portrait)</SelectItem>
                        <SelectItem value="1920x1080">1920×1080 (Landscape HD)</SelectItem>
                        <SelectItem value="1080x1920">1080×1920 (Story/Reel)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Quality:</span>
                    <Select value={resolution} onValueChange={(v: "1K" | "2K" | "4K") => setResolution(v)}>
                      <SelectTrigger className="w-full sm:w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1K">1K</SelectItem>
                        <SelectItem value="2K">2K (HD)</SelectItem>
                        <SelectItem value="4K">4K</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </motion.section>

              {/* Price Estimate */}
              {priceEstimate && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 dark:from-green-500/20 to-emerald-500/10 dark:to-emerald-500/20 border border-green-500/20 dark:border-green-500/30"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">💲</span>
                      <div>
                        <p className="text-sm font-medium">
                          Estimated cost: <span className="text-green-700 dark:text-green-400">${priceEstimate.estimatedCost.toFixed(3)}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {priceEstimate.usedFallback
                            ? "Based on default rates"
                            : `Based on ${priceEstimate.sampleCount} similar generations`}
                          {priceEstimate.p90 > priceEstimate.estimatedCost && (
                            <span> • 90th percentile: ${priceEstimate.p90.toFixed(3)}</span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Generate Button */}
              <motion.div
                ref={generateButtonRef}
                id="generate"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="py-8"
              >
                <Button
                  size="lg"
                  onClick={handleGenerate}
                  disabled={(selectedProducts.length === 0 && tempUploads.length === 0) || !prompt.trim()}
                  className="w-full h-16 text-lg rounded-2xl"
                >
                  <Sparkles className="w-5 h-5 mr-2 ai-sparkle text-primary ai-glow" />
                  Generate Image
                </Button>
                <p className="text-center text-sm text-muted-foreground mt-3">
                  {selectedProducts.length + tempUploads.length} image{selectedProducts.length + tempUploads.length !== 1 ? "s" : ""} • {platform} • {resolution}
                </p>
              </motion.div>
            </>
          )}
          </div>

          {/* Right Column - LinkedIn Preview (Always Visible, Sticky on Desktop) */}
          <div className="hidden lg:block min-w-0">
            <div className="sticky top-24 max-h-[calc(100vh-120px)] overflow-y-auto w-full">
              <div className="rounded-2xl border border-border bg-card/30 backdrop-blur-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Eye className="w-5 h-5 text-primary" />
                  <h3 className="font-medium">LinkedIn Preview</h3>
                </div>

                <LinkedInPostPreview
                  authorName={authUser?.email?.split("@")[0] || "Your Company"}
                  authorHeadline="Building Products | Construction Solutions"
                  postText={generatedCopy || null}
                  imageUrl={generatedImage || selectedTemplateForMode?.previewImageUrl || null}
                  hashtags={generatedCopyFull?.hashtags || []}
                  isEditable={true}
                  onTextChange={(text) => setGeneratedCopy(text)}
                  onGenerateCopy={generationId ? handleGenerateCopy : undefined}
                  onGenerateImage={selectedProducts.length > 0 && prompt.trim() ? handleGenerate : undefined}
                  isGeneratingCopy={isGeneratingCopy}
                  isGeneratingImage={state === "generating"}
                />

                {/* Action Buttons */}
                <div className="mt-4 space-y-2">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "flex-1 transition-all",
                        justCopied && "bg-green-500/10 border-green-500"
                      )}
                      disabled={!generatedImage || !generatedCopy}
                      onClick={async () => {
                        if (!generatedCopy) return;

                        // Immediate haptic feedback
                        haptic('light');

                        // Copy to clipboard
                        await navigator.clipboard.writeText(generatedCopy);

                        // Visual state change
                        setJustCopied(true);
                        setTimeout(() => setJustCopied(false), 2000);

                        // Success toast
                        toast.success('✓ Copied to clipboard!', {
                          duration: 2000
                        });
                      }}
                    >
                      {justCopied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          📋 Copy Text
                        </>
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
                        <>
                          📥 Download
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* History Panel - Third column when open */}
          <HistoryPanel
            isOpen={historyPanelOpen}
            onToggle={handleHistoryToggle}
            onSelectGeneration={(id) => {
              selectGeneration(id);
              // Load that generation - fetch full data first
              fetch(`/api/generations/${id}`, { credentials: 'include' })
                .then(res => res.json())
                .then(data => {
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

      {/* Mobile LinkedIn Preview - Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t border-border pb-safe">
        <Collapsible>
          <CollapsibleTrigger asChild>
            <button className="w-full p-4 min-h-12 flex items-center justify-between hover:bg-muted/50">
              <div className="flex items-center gap-2">
                <Eye className="w-5 h-5 text-primary" />
                <span className="font-medium">LinkedIn Preview</span>
                {generatedImage && generatedCopy ? (
                  <span className="text-xs text-green-600 dark:text-green-400 bg-green-500/10 dark:bg-green-500/20 px-2 py-0.5 rounded-full">Ready</span>
                ) : (
                  <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-0.5 rounded-full">
                    {generatedImage ? "Need copy" : generatedCopy ? "Need image" : "Empty"}
                  </span>
                )}
              </div>
              <ChevronUp className="w-5 h-5 text-muted-foreground" />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="p-4 pt-0 max-h-[60vh] overflow-y-auto">
              <LinkedInPostPreview
                authorName={authUser?.email?.split("@")[0] || "Your Company"}
                authorHeadline="Building Products | Construction Solutions"
                postText={generatedCopy || null}
                imageUrl={generatedImage || null}
                hashtags={generatedCopyFull?.hashtags || []}
                isEditable={true}
                onTextChange={(text) => setGeneratedCopy(text)}
                onGenerateCopy={generationId ? handleGenerateCopy : undefined}
                onGenerateImage={selectedProducts.length > 0 && prompt.trim() ? handleGenerate : undefined}
                isGeneratingCopy={isGeneratingCopy}
                isGeneratingImage={state === "generating"}
              />
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "flex-1 transition-all",
                    justCopied && "bg-green-500/10 border-green-500"
                  )}
                  disabled={!generatedCopy}
                  onClick={async () => {
                    if (!generatedCopy) return;

                    // Immediate haptic feedback
                    haptic('light');

                    // Copy to clipboard
                    await navigator.clipboard.writeText(generatedCopy);

                    // Visual state change
                    setJustCopied(true);
                    setTimeout(() => setJustCopied(false), 2000);

                    // Success toast
                    toast.success('✓ Copied to clipboard!', {
                      duration: 2000
                    });
                  }}
                >
                  {justCopied ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Copied!
                    </>
                  ) : (
                    <>
                      📋 Copy
                    </>
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
                    <>
                      📥 Download
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Sticky Generate Bar */}
      <AnimatePresence>
        <StickyGenerateBar
          visible={showStickyGenerate}
          selectedProducts={selectedProducts}
          platform={platform}
          onGenerate={handleGenerate}
          disabled={(selectedProducts.length === 0 && tempUploads.length === 0) || !prompt.trim()}
          isGenerating={state === "generating"}
        />
      </AnimatePresence>

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
                  <div key={i} className="rounded-xl border border-border bg-card overflow-hidden animate-pulse">
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
                  Add high-performing ad templates to your library to see them here for inspiration.
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
                      onClick={() => handleSelectPerformingTemplate(template)}
                      className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 hover:shadow-lg transition-all text-left group"
                    >
                      {/* Image */}
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

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex gap-1">
                          {template.isFeatured && (
                            <Badge className="bg-yellow-500/90 dark:bg-yellow-600/90 text-yellow-950 dark:text-yellow-50 text-xs px-1.5 py-0.5">
                              <Star className="w-3 h-3 mr-1 fill-current" />
                              Featured
                            </Badge>
                          )}
                        </div>
                        {template.engagementTier && template.engagementTier !== "unranked" && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary" className="text-xs px-1.5 py-0.5 bg-black/50 backdrop-blur-sm text-white border-0">
                              {template.engagementTier.replace("-", " ")}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="p-3 space-y-2">
                        <h4 className="font-medium text-sm line-clamp-1">{template.name}</h4>

                        {/* Style tags */}
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

                        {/* Platforms */}
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

          {/* Footer */}
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

      {/* Keyboard Shortcuts Help - Floating Button & Dialog */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Help Dialog */}
        {showKeyboardShortcuts && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="glass rounded-xl shadow-layered p-5 w-80 mb-2"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary" />
                Keyboard Shortcuts
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowKeyboardShortcuts(false)}
                className="h-6 w-6 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2.5">
              {shortcuts.map((shortcut, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-center justify-between text-xs py-2 px-2.5 rounded-lg transition-colors",
                    shortcut.disabled
                      ? "opacity-40"
                      : "hover:bg-muted/50"
                  )}
                >
                  <span className="text-foreground/80">{shortcut.description}</span>
                  <div className="flex gap-1">
                    {shortcut.ctrlKey && (
                      <kbd className="px-2 py-1 text-[10px] rounded bg-muted border border-border font-mono">
                        Ctrl
                      </kbd>
                    )}
                    {shortcut.shiftKey && (
                      <kbd className="px-2 py-1 text-[10px] rounded bg-muted border border-border font-mono">
                        Shift
                      </kbd>
                    )}
                    <kbd className="px-2 py-1 text-[10px] rounded bg-muted border border-border font-mono">
                      {shortcut.key.toUpperCase()}
                    </kbd>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-border/50">
              <p className="text-[10px] text-muted-foreground text-center">
                Press <kbd className="px-1.5 py-0.5 text-[9px] rounded bg-muted border border-border font-mono">?</kbd> to toggle this menu
              </p>
            </div>
          </motion.div>
        )}

        {/* Help Button */}
        <motion.div
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              haptic('light');
              setShowKeyboardShortcuts(!showKeyboardShortcuts);
            }}
            className={cn(
              "glass h-11 w-11 rounded-full shadow-layered p-0 flex items-center justify-center group",
              showKeyboardShortcuts && "ring-2 ring-primary/30 bg-primary/10"
            )}
            title="Keyboard Shortcuts (Shift + ?)"
          >
            <span className="text-base font-semibold group-hover:scale-110 transition-transform">
              ?
            </span>
          </Button>
        </motion.div>
      </div>
    </div>
    </StudioProvider>
  );
}
