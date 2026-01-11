// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { cn, getProductImageUrl } from "@/lib/utils";
import type { Product, PromptTemplate, PerformingAdTemplate, AdSceneTemplate } from "@shared/schema";

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
import type { GenerationRecipe, TemplateSlotSuggestion } from "@shared/types/ideaBank";
import { UploadZone } from "@/components/UploadZone";
import type { AnalyzedUpload } from "@/types/analyzedUpload";
import { HistoryTimeline } from "@/components/HistoryTimeline";
import { SaveToCatalogDialog } from "@/components/SaveToCatalogDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Header } from "@/components/layout/Header";

// Icons
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  Check,
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
          "rounded-2xl border border-border bg-card/30 backdrop-blur-sm overflow-hidden",
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
              <ImageIcon className="w-4 h-4 text-purple-500" />
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
      <Button
        size="lg"
        onClick={onGenerate}
        disabled={disabled || isGenerating}
        className="px-8 h-14 text-lg rounded-full shadow-xl shadow-primary/20"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5 mr-2" />
            Generate Image
          </>
        )}
      </Button>
      <p className="text-center text-xs text-muted-foreground mt-2">
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

  // Generation path selection: Freestyle vs Template mode
  const [generationMode, setGenerationMode] = useState<'freestyle' | 'template'>('freestyle');
  const [selectedTemplateForMode, setSelectedTemplateForMode] = useState<AdSceneTemplate | null>(null);

  // Refs for scroll tracking
  const generateButtonRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);

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
      return res.json();
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
      } catch (error) {
        console.error("Failed to fetch price estimate:", error);
      }
    };

    const debounceTimer = setTimeout(fetchPriceEstimate, 300);
    return () => clearTimeout(debounceTimer);
  }, [selectedProducts.length, tempUploads.length, prompt.length, resolution]);

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
      console.error("Generation error:", error);
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

  // Handle edit
  const handleApplyEdit = async () => {
    if (!editPrompt.trim() || !generationId) return;

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

      setLocation(`/generation/${data.generationId}`);
    } catch (error: any) {
      console.error("Edit error:", error);
      alert(error.message || "Edit failed");
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
        // Auto-expand preview section
        setCollapsedSections((prev) => ({ ...prev, preview: false }));
      }
    } catch (error: any) {
      console.error("Copy generation error:", error);
      alert(error.message || "Failed to generate copy");
    } finally {
      setIsGeneratingCopy(false);
    }
  };

  // Handle loading a generation from history
  const handleLoadFromHistory = (generation: any) => {
    // Handle both Cloudinary URLs and local paths
    const imagePath = generation.generatedImagePath?.startsWith("http")
      ? generation.generatedImagePath
      : `/${generation.generatedImagePath}`;
    setGeneratedImage(imagePath);
    setGenerationId(generation.id);
    setPrompt(generation.prompt || "");
    setState("result");
    // Scroll to result
    setTimeout(() => {
      document.getElementById("result")?.scrollIntoView({ behavior: "smooth" });
    }, 100);
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
      console.error("Ask AI error:", error);
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
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
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

      {/* Main Content - 2 Column Layout on Desktop */}
      {/* pb-24 on mobile accounts for the ~60px fixed bottom preview bar */}
      <main className="container max-w-7xl mx-auto px-6 pt-24 pb-24 lg:pb-12 relative z-10">
        {/* Desktop: 2-column grid, Mobile: single column */}
        <div className="lg:grid lg:grid-cols-[1fr_400px] lg:gap-8">
          {/* Left Column - All Inputs (scrollable) */}
          <div className="space-y-8 min-w-0">
          {/* Hero Section */}
          <motion.div
            ref={heroRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 py-8"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
              Create stunning product visuals
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select products, describe your vision, and generate professional marketing content in minutes.
            </p>
          </motion.div>

          {/* Quick Start */}
          {state === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5"
            >
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-primary" />
                <h3 className="font-medium">Quick Start</h3>
                <span className="text-xs text-muted-foreground">Skip the setup</span>
              </div>
              <div className="flex flex-col gap-3">
                <Textarea
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
                    <Sparkles className="w-4 h-4 mr-2" />
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
              className="flex flex-col items-center justify-center py-20 text-center space-y-8"
            >
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
                <div className="absolute inset-4 rounded-full border-r-2 border-purple-500 animate-spin-slow" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-primary" />
                </div>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-display font-medium">Generating content...</h2>
                <p className="text-muted-foreground">
                  This usually takes 10-30 seconds
                </p>
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
                  <Button variant="outline" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Link href={`/generation/${generationId}`}>
                    <Button variant="outline">
                      <History className="w-4 h-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Generated Image */}
              <div className="rounded-2xl overflow-hidden border border-border bg-black">
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="w-full aspect-square object-cover"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  className="h-14"
                  onClick={() => toggleSection("refine")}
                >
                  <Pencil className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  className="h-14"
                  onClick={() => toggleSection("copy")}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  variant="outline"
                  className="h-14"
                  onClick={() => {
                    toggleSection("preview");
                    if (!generatedCopy) {
                      handleGenerateCopy();
                    }
                  }}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  className="h-14"
                  onClick={() => setShowSaveToCatalog(true)}
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  Save
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
                            <Sparkles className="w-4 h-4 mr-2" />
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
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-medium">Choose Your Path</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Freestyle Mode */}
                  <button
                    onClick={() => {
                      setGenerationMode('freestyle');
                      setSelectedTemplateForMode(null);
                    }}
                    className={cn(
                      "p-6 rounded-xl border-2 transition-all text-left group",
                      generationMode === 'freestyle'
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50 bg-card/50"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        generationMode === 'freestyle'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                      )}>
                        <Wand2 className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">Freestyle</h4>
                        {generationMode === 'freestyle' && (
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
                    onClick={() => setGenerationMode('template')}
                    className={cn(
                      "p-6 rounded-xl border-2 transition-all text-left group",
                      generationMode === 'template'
                        ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                        : "border-border hover:border-primary/50 bg-card/50"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        generationMode === 'template'
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
                      )}>
                        <FileImage className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-medium">Use Template</h4>
                        {generationMode === 'template' && (
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
                {generationMode === 'template' && (
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

                  {/* Product Grid - with internal scroll */}
                  <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border/50 p-2">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                      {filteredProducts.map((product) => {
                        const isSelected = selectedProducts.some((p) => p.id === product.id);
                        return (
                          <button
                            key={product.id}
                            onClick={() => toggleProductSelection(product)}
                            disabled={!isSelected && selectedProducts.length >= 6}
                            className={cn(
                              "relative aspect-square min-h-[80px] rounded-xl overflow-hidden border-2 transition-all",
                              isSelected
                                ? "border-primary ring-2 ring-primary/20"
                                : "border-border hover:border-primary/50",
                              !isSelected && selectedProducts.length >= 6 && "opacity-50"
                            )}
                          >
                            <img
                              src={getProductImageUrl(product.cloudinaryUrl)}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                            {isSelected && (
                              <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                              <p className="text-white text-xs truncate">{product.name}</p>
                            </div>
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
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-yellow-500" />
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
                        <Star className="w-5 h-5 text-muted-foreground group-hover:text-yellow-500 transition-colors" />
                      </div>
                    </button>

                    {/* Show selected performing template */}
                    {selectedPerformingTemplate && (
                      <div className="mt-3 flex items-center justify-between p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-yellow-500" />
                          <span className="text-sm">
                            Inspired by: <strong>{selectedPerformingTemplate.name}</strong>
                          </span>
                          {selectedPerformingTemplate.engagementTier && selectedPerformingTemplate.engagementTier !== "unranked" && (
                            <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
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
                    mode={generationMode}
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
                  className="p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20"
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
                  <Sparkles className="w-5 h-5 mr-2" />
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
                      className="flex-1"
                      disabled={!generatedImage || !generatedCopy}
                      onClick={() => {
                        if (generatedCopy) {
                          navigator.clipboard.writeText(generatedCopy);
                        }
                      }}
                    >
                      📋 Copy Text
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      disabled={!generatedImage}
                      onClick={handleDownload}
                    >
                      📥 Download
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
                  <span className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">Ready</span>
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
                  className="flex-1"
                  disabled={!generatedCopy}
                  onClick={() => {
                    if (generatedCopy) {
                      navigator.clipboard.writeText(generatedCopy);
                    }
                  }}
                >
                  📋 Copy
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  disabled={!generatedImage}
                  onClick={handleDownload}
                >
                  📥 Download
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
              <TrendingUp className="w-5 h-5 text-yellow-500" />
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
                            <Badge className="bg-yellow-500/90 text-yellow-950 text-xs px-1.5 py-0.5">
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
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-500 capitalize">
                              {template.mood}
                            </span>
                          )}
                          {template.style && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 capitalize">
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
    </div>
  );
}
