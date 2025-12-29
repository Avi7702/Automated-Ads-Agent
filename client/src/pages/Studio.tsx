// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import type { Product } from "@shared/schema";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { IdeaBankPanel } from "@/components/IdeaBankPanel";

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
  Settings,
  LayoutGrid,
  Zap,
  User,
  LogOut,
} from "lucide-react";

// Types
type GenerationState = "idle" | "generating" | "result";

interface CollapsedSections {
  products: boolean;
  templates: boolean;
  refine: boolean;
  copy: boolean;
}

// Persist collapsed state to localStorage
const COLLAPSED_SECTIONS_KEY = "studio-collapsed-sections";

function getStoredCollapsedSections(): CollapsedSections {
  try {
    const stored = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return { products: false, templates: false, refine: true, copy: true };
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
          "rounded-2xl border border-white/10 bg-card/30 backdrop-blur-sm overflow-hidden",
          className
        )}
      >
        <CollapsibleTrigger asChild>
          <button className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors">
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
          <span className="absolute right-6 whitespace-nowrap text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity bg-card px-2 py-1 rounded border border-white/10">
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
  selectedTemplate: string | null;
  platform: string;
  visible: boolean;
}) {
  if (!visible) return null;

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-card/90 backdrop-blur-md border border-white/10 shadow-lg"
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
              {selectedTemplate}
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
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
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
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [platform, setPlatform] = useState("Instagram");
  const [aspectRatio, setAspectRatio] = useState("1:1");
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

  // Edit/Ask AI state
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [askAIQuestion, setAskAIQuestion] = useState("");
  const [askAIResponse, setAskAIResponse] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);

  // Selected suggestion state - for highlighting and showing near textarea
  const [selectedSuggestion, setSelectedSuggestion] = useState<{
    id: string;
    prompt: string;
    reasoning?: string;
  } | null>(null);

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

  const demoLoginMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/demo", { credentials: "include" });
      if (!res.ok) throw new Error("Demo login failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth"] }),
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["auth"] }),
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
    if (selectedProducts.length === 0 && !quickStartMode) {
      return;
    }

    const finalPrompt = quickStartMode ? quickStartPrompt : prompt;
    if (!finalPrompt.trim()) return;

    setState("generating");

    try {
      const formData = new FormData();

      if (!quickStartMode) {
        const filePromises = selectedProducts.map(async (product) => {
          const response = await fetch(product.cloudinaryUrl);
          const blob = await response.blob();
          return new File([blob], `${product.name}.jpg`, { type: blob.type });
        });

        const files = await Promise.all(filePromises);
        files.forEach((file) => formData.append("images", file));
      }

      formData.append("prompt", finalPrompt);
      formData.append("resolution", resolution);

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

  // Progress rail sections
  const progressSections = [
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
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/50 backdrop-blur-md">
        <div className="container max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              V3
            </div>
            <span className="font-display font-medium tracking-tight">
              Product Content Studio
            </span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <span className="text-foreground">Studio</span>
            <Link href="/gallery" className="hover:text-foreground transition-colors">
              Gallery
            </Link>
            <Link href="/settings" className="hover:text-foreground transition-colors">
              <Settings className="w-4 h-4" />
            </Link>
            <div className="border-l border-white/10 h-5 mx-2" />
            {authUser ? (
              <div className="flex items-center gap-3">
                <span className="text-xs text-primary">{authUser.email}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => demoLoginMutation.mutate()}
                disabled={demoLoginMutation.isPending}
              >
                <User className="w-4 h-4 mr-2" />
                {demoLoginMutation.isPending ? "..." : "Demo Login"}
              </Button>
            )}
          </nav>
        </div>
      </header>

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

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-6 pt-24 pb-32 relative z-10">
        <div className="space-y-8">
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
              <div className="flex gap-3">
                <Input
                  value={quickStartPrompt}
                  onChange={(e) => setQuickStartPrompt(e.target.value)}
                  placeholder="Just describe what you want to create..."
                  className="flex-1"
                  onKeyDown={(e) => e.key === "Enter" && handleQuickStartGenerate()}
                />
                <Button
                  onClick={handleQuickStartGenerate}
                  disabled={!quickStartPrompt.trim()}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate Now
                </Button>
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
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black">
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="w-full aspect-square object-cover"
                />
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-3 gap-4">
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
                <Button variant="outline" className="h-14">
                  <Share2 className="w-4 h-4 mr-2" />
                  Share
                </Button>
              </div>

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
                    <div className="p-4 rounded-xl bg-card border border-white/10">
                      <p className="text-sm whitespace-pre-wrap">{askAIResponse}</p>
                    </div>
                  )}
                </div>
              </Section>
            </motion.div>
          )}

          {/* Idle State - Full Flow */}
          {state === "idle" && (
            <>
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
                            src={product.cloudinaryUrl}
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

                  {/* Product Grid */}
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                    {filteredProducts.map((product) => {
                      const isSelected = selectedProducts.some((p) => p.id === product.id);
                      return (
                        <button
                          key={product.id}
                          onClick={() => toggleProductSelection(product)}
                          disabled={!isSelected && selectedProducts.length >= 6}
                          className={cn(
                            "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                            isSelected
                              ? "border-primary ring-2 ring-primary/20"
                              : "border-white/10 hover:border-white/30",
                            !isSelected && selectedProducts.length >= 6 && "opacity-50"
                          )}
                        >
                          <img
                            src={product.cloudinaryUrl}
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
                subtitle="Choose a starting point (optional)"
                isOpen={!collapsedSections.templates}
                onToggle={() => toggleSection("templates")}
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {["All", "Product Shots", "Social Media", "Banners", "Lifestyle"].map((cat) => (
                      <Button
                        key={cat}
                        variant={selectedTemplate === cat ? "default" : "outline"}
                        size="sm"
                        onClick={() => setSelectedTemplate(cat === selectedTemplate ? null : cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Or skip this — describe your vision below instead.
                  </p>
                </div>
              </Section>

              {/* Prompt Section */}
              <motion.section
                id="prompt"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl border border-white/10 bg-card/30 backdrop-blur-sm space-y-6"
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
                    placeholder="A summer lifestyle shot with soft morning light, products arranged on a wooden table..."
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
                <IdeaBankPanel
                  selectedProducts={selectedProducts}
                  onSelectPrompt={(promptText) => handleSelectSuggestion(promptText)}
                  selectedPromptId={selectedSuggestion?.id}
                />

                {/* Platform & Aspect Ratio */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Platform:</span>
                    <Select value={platform} onValueChange={setPlatform}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Instagram">Instagram</SelectItem>
                        <SelectItem value="Facebook">Facebook</SelectItem>
                        <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                        <SelectItem value="Twitter">Twitter/X</SelectItem>
                        <SelectItem value="TikTok">TikTok</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Aspect:</span>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1:1">1:1</SelectItem>
                        <SelectItem value="4:5">4:5</SelectItem>
                        <SelectItem value="16:9">16:9</SelectItem>
                        <SelectItem value="9:16">9:16</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Quality:</span>
                    <Select value={resolution} onValueChange={(v: "1K" | "2K" | "4K") => setResolution(v)}>
                      <SelectTrigger className="w-[100px]">
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
                  disabled={selectedProducts.length === 0 || !prompt.trim()}
                  className="w-full h-16 text-lg rounded-2xl"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Image
                </Button>
                <p className="text-center text-sm text-muted-foreground mt-3">
                  {selectedProducts.length} product{selectedProducts.length !== 1 ? "s" : ""} • {platform} • {resolution}
                </p>
              </motion.div>
            </>
          )}
        </div>
      </main>

      {/* Sticky Generate Bar */}
      <AnimatePresence>
        <StickyGenerateBar
          visible={showStickyGenerate}
          selectedProducts={selectedProducts}
          platform={platform}
          onGenerate={handleGenerate}
          disabled={selectedProducts.length === 0 || !prompt.trim()}
          isGenerating={state === "generating"}
        />
      </AnimatePresence>
    </div>
  );
}
