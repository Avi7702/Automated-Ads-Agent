import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { PromptInput } from "@/components/PromptInput";
import { IntentVisualizer } from "@/components/IntentVisualizer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, RefreshCw, Download, Check, Image, Sparkles, History, Package, X, Search, Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import type { Product } from "@shared/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GenerationState = "idle" | "generating" | "result";

export default function Home() {
  const [state, setState] = useState<GenerationState>("idle");
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [resolution, setResolution] = useState<"1K" | "2K" | "4K">("2K");
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);
  
  // Gallery filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  
  // AI Prompt Suggestions
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Fetch all products from Cloudinary
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch("/api/products");
      if (!res.ok) return [];
      return res.json();
    },
  });

  // Auto-save draft prompt to localStorage
  useEffect(() => {
    const savePromptDraft = () => {
      if (prompt) {
        localStorage.setItem("promptDraft", prompt);
      }
    };
    const timeout = setTimeout(savePromptDraft, 500);
    return () => clearTimeout(timeout);
  }, [prompt]);

  // Restore draft prompt and handle Library handoff on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem("promptDraft");
    if (savedPrompt) {
      setPrompt(savedPrompt);
    }

    // Check for Library handoff (product selected from Library page)
    const productUrl = localStorage.getItem("selectedProductUrl");
    const productName = localStorage.getItem("selectedProductName");
    const productId = localStorage.getItem("selectedProductId");
    
    if (productUrl && productName && productId && products.length > 0) {
      // Find the product in the loaded products list
      const product = products.find(p => p.id === productId);
      if (product) {
        setSelectedProducts([product]);
      }
      
      // Clear from localStorage
      localStorage.removeItem("selectedProductUrl");
      localStorage.removeItem("selectedProductName");
      localStorage.removeItem("selectedProductId");
    }

  }, [products]);

  // Fetch AI prompt suggestions when products are selected
  const fetchSuggestions = async () => {
    if (selectedProducts.length === 0) return;
    
    setLoadingSuggestions(true);
    try {
      const productNames = selectedProducts.map(p => p.name).join(", ");
      const categories = Array.from(new Set(selectedProducts.map(p => p.category).filter(Boolean)));
      
      const res = await fetch("/api/prompt-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productName: productNames,
          category: categories[0] || undefined,
        }),
      });
      
      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      }
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  // Auto-fetch suggestions when products are selected or changed
  useEffect(() => {
    if (selectedProducts.length > 0) {
      fetchSuggestions();
    } else {
      setSuggestions([]);
    }
  }, [selectedProducts.map(p => p.id).join(",")]);

  // Toggle product selection
  const toggleProductSelection = (product: Product) => {
    setSelectedProducts(prev => {
      const isSelected = prev.some(p => p.id === product.id);
      if (isSelected) {
        return prev.filter(p => p.id !== product.id);
      } else {
        // Limit to 6 products
        if (prev.length >= 6) return prev;
        return [...prev, product];
      }
    });
  };

  // Filter products based on search and category
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || product.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Get unique categories from products
  const categories: string[] = ["all", ...Array.from(new Set(products.map(p => p.category).filter((c): c is string => !!c)))];

  const handleGenerate = async () => {
    if (selectedProducts.length === 0) {
      alert("Please select at least one product from the gallery below");
      return;
    }

    setState("generating");
    
    try {
      const formData = new FormData();
      
      // Fetch and convert selected products to File objects
      const filePromises = selectedProducts.map(async (product, index) => {
        const response = await fetch(product.cloudinaryUrl);
        const blob = await response.blob();
        return new File([blob], `${product.name}.jpg`, { type: blob.type });
      });
      
      const files = await Promise.all(filePromises);
      
      files.forEach(file => {
        formData.append("images", file);
      });
      
      formData.append("prompt", prompt);
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
      
      localStorage.removeItem("promptDraft");
      
    } catch (error: any) {
      console.error("Generation error:", error);
      alert(`Failed to generate image: ${error.message}`);
      setState("idle");
    }
  };

  const handleReset = () => {
    setState("idle");
    setSelectedProducts([]);
    setPrompt("");
    setGeneratedImage(null);
    setGenerationId(null);
    localStorage.removeItem("promptDraft");
  };

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = generatedImage;
    link.download = `product-${generationId || Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans overflow-hidden relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/50 backdrop-blur-md">
        <div className="container max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              V3
            </div>
            <span className="font-display font-medium tracking-tight">Product Content Studio</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <span className="text-foreground">Generate</span>
            <Link href="/library" className="hover:text-foreground cursor-pointer transition-colors" data-testid="link-library-header">
              Library
            </Link>
            <Link href="/prompts" className="hover:text-foreground cursor-pointer transition-colors" data-testid="link-prompts-header">
              Prompts
            </Link>
            <Link href="/gallery" className="hover:text-foreground cursor-pointer transition-colors" data-testid="link-gallery-header">
              Gallery
            </Link>
          </nav>
        </div>
      </header>

      <main className="container max-w-7xl mx-auto px-6 pt-24 pb-20 relative z-10">
        <AnimatePresence mode="wait">
          {/* GENERATING STATE */}
          {state === "generating" && (
            <motion.div
              key="generating"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8"
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
                <div className="flex flex-col items-center gap-1 text-muted-foreground text-sm">
                  <motion.span 
                    animate={{ opacity: [0, 1, 0] }} 
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    Analyzing lighting conditions...
                  </motion.span>
                  <motion.span 
                    animate={{ opacity: [0, 1, 0] }} 
                    transition={{ duration: 2, delay: 1, repeat: Infinity }}
                  >
                    Composing lifestyle scene...
                  </motion.span>
                </div>
              </div>
            </motion.div>
          )}

          {/* RESULT STATE */}
          {state === "result" && generatedImage && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-3xl mx-auto space-y-6"
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <button onClick={handleReset} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="button-start-new">
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    <span>Start New</span>
                  </button>
                  {generationId && (
                    <Link href={`/generation/${generationId}`} className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5" data-testid="link-view-details">
                      <History className="w-4 h-4" />
                      <span>View Details</span>
                    </Link>
                  )}
                </div>
                <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download-result">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 bg-black group shadow-2xl">
                <img 
                  src={generatedImage} 
                  alt="Generated" 
                  className="w-full h-full object-cover"
                  data-testid="img-generated-result"
                />
                
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                  <p className="text-white/90 text-sm line-clamp-2">{prompt}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-card border border-white/5">
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Input Products</h4>
                  <span className="text-sm font-medium">{selectedProducts.length} product{selectedProducts.length > 1 ? 's' : ''}</span>
                </div>
                <div className="p-4 rounded-2xl bg-card border border-white/5">
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Resolution</h4>
                  <span className="text-sm">{resolution === "1K" ? "1024×1024" : resolution === "2K" ? "2048×2048" : "4096×4096"}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* IDLE STATE - Main Generation Interface */}
          {state === "idle" && (
            <motion.div
              key="idle"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-12"
            >
              {/* Generation Area */}
              <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-3">
                  <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                    Transform products into<br />marketing masterpieces.
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Select products from your library below, describe your vision, and generate professional content.
                  </p>
                </div>

                {/* Selected Products Preview */}
                {selectedProducts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="p-6 rounded-2xl border border-white/10 bg-card/30 backdrop-blur-sm space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                        Selected Products ({selectedProducts.length}/6)
                      </h3>
                      <button
                        onClick={() => setSelectedProducts([])}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                        data-testid="button-clear-selection"
                      >
                        Clear All
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {selectedProducts.map(product => (
                        <div
                          key={product.id}
                          className="relative group"
                          data-testid={`selected-product-${product.id}`}
                        >
                          <div className="w-20 h-20 rounded-lg overflow-hidden border-2 border-primary/50 bg-card">
                            <img src={product.cloudinaryUrl} alt={product.name} className="w-full h-full object-cover" />
                          </div>
                          <button
                            onClick={() => toggleProductSelection(product)}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                            data-testid={`button-remove-${product.id}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                            <span className="text-white text-xs truncate block">{product.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Prompt Input Area */}
                <div className="space-y-4">
                  <PromptInput 
                    value={prompt} 
                    onChange={setPrompt} 
                    onSubmit={handleGenerate} 
                    isGenerating={false}
                  />
                  <IntentVisualizer prompt={prompt} />

                  {/* Resolution Selector */}
                  <div className="flex items-center gap-3">
                    <label className="text-sm text-muted-foreground font-medium">Resolution:</label>
                    <Select value={resolution} onValueChange={(value: "1K" | "2K" | "4K") => setResolution(value)}>
                      <SelectTrigger className="w-[140px]" data-testid="select-resolution">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1K">1K — $0.134</SelectItem>
                        <SelectItem value="2K">2K — $0.134</SelectItem>
                        <SelectItem value="4K">4K — $0.24</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Generate Button */}
                  <Button
                    onClick={handleGenerate}
                    disabled={selectedProducts.length === 0 || !prompt.trim()}
                    className="w-full h-12"
                    data-testid="button-generate"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Marketing Content
                  </Button>
                </div>

                {/* Idea Bank - Context Aware */}
                {selectedProducts.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-6 rounded-2xl border border-white/10 bg-gradient-to-br from-primary/5 to-purple-500/5 space-y-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-primary" />
                        <h3 className="font-medium">Idea Bank</h3>
                        <span className="text-xs text-muted-foreground">
                          {suggestions.length > 0 ? `${suggestions.length} ideas for your products` : 'Loading ideas...'}
                        </span>
                      </div>
                      <button
                        onClick={fetchSuggestions}
                        disabled={loadingSuggestions}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
                        data-testid="button-refresh-suggestions"
                      >
                        <RefreshCw className={cn("w-4 h-4", loadingSuggestions && "animate-spin")} />
                      </button>
                    </div>

                    {loadingSuggestions ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
                      </div>
                    ) : suggestions.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {suggestions.map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => setPrompt(suggestion)}
                            className="p-4 rounded-xl border border-white/10 bg-card/50 hover:bg-card hover:border-primary/30 transition-all text-left group"
                            data-testid={`button-suggestion-${index}`}
                          >
                            <p className="text-sm text-foreground/90 group-hover:text-foreground transition-colors">
                              {suggestion}
                            </p>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        No suggestions available. Click refresh to try again.
                      </p>
                    )}
                  </motion.div>
                )}
              </div>

              {/* Product Gallery */}
              <div className="space-y-6">
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <h2 className="text-2xl font-display font-semibold">Product Library</h2>
                    <p className="text-sm text-muted-foreground">
                      {products.length} products • Select up to 6 for generation
                    </p>
                  </div>
                  <Link href="/library">
                    <Button variant="outline" size="sm" data-testid="button-manage-library">
                      <Package className="w-4 h-4 mr-2" />
                      Manage Library
                    </Button>
                  </Link>
                </div>

                {/* Filters */}
                <div className="flex gap-3 flex-wrap">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search products..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-products"
                    />
                  </div>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="w-[200px]" data-testid="select-category-filter">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>
                          {category === "all" ? "All Categories" : category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Product Grid */}
                {filteredProducts.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredProducts.map(product => {
                      const isSelected = selectedProducts.some(p => p.id === product.id);
                      return (
                        <button
                          key={product.id}
                          onClick={() => toggleProductSelection(product)}
                          disabled={!isSelected && selectedProducts.length >= 6}
                          className={cn(
                            "relative group aspect-square rounded-xl overflow-hidden border-2 transition-all",
                            isSelected 
                              ? "border-primary ring-2 ring-primary/20 scale-95" 
                              : "border-white/10 hover:border-white/30",
                            !isSelected && selectedProducts.length >= 6 && "opacity-50 cursor-not-allowed"
                          )}
                          data-testid={`button-product-${product.id}`}
                        >
                          <img 
                            src={product.cloudinaryUrl} 
                            alt={product.name} 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                              <Check className="w-4 h-4" />
                            </div>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-3">
                            <p className="text-white text-xs font-medium truncate">{product.name}</p>
                            {product.category && (
                              <p className="text-white/60 text-xs truncate">{product.category}</p>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No products found</p>
                    <Link href="/library">
                      <Button variant="link" size="sm" className="mt-2">
                        Add products to your library
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
