import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadZone } from "@/components/UploadZone";
import { PromptInput } from "@/components/PromptInput";
import { IntentVisualizer } from "@/components/IntentVisualizer";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw, Download, Check, Image, Sparkles, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Import generated assets
import bottleBefore from "@assets/generated_images/plain_white_water_bottle_product_shot.png";
import bottleAfter from "@assets/generated_images/water_bottle_lifestyle_marketing_shot.png";
import spacerBefore from "@assets/generated_images/black_plastic_spacer_product_shot.png";
import spacerAfter from "@assets/generated_images/industrial_spacer_lifestyle_shot.png";

type Step = "upload" | "describe" | "generating" | "result";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedDemo, setSelectedDemo] = useState<"bottle" | "spacer" | null>(null);
  const [resolution, setResolution] = useState<"1K" | "2K" | "4K">("2K");
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generationId, setGenerationId] = useState<string | null>(null);

  // Auto-save draft prompt to localStorage
  useEffect(() => {
    const savePromptDraft = () => {
      if (prompt) {
        localStorage.setItem("promptDraft", prompt);
      }
    };
    const timeout = setTimeout(savePromptDraft, 500); // Debounce
    return () => clearTimeout(timeout);
  }, [prompt]);

  // Restore draft prompt on mount
  useEffect(() => {
    const savedPrompt = localStorage.getItem("promptDraft");
    if (savedPrompt) {
      setPrompt(savedPrompt);
    }

    // Check for re-edit generation data
    const reEditData = localStorage.getItem("reEditGeneration");
    if (reEditData) {
      const loadReEditData = async () => {
        try {
          const generation = JSON.parse(reEditData);
          setPrompt(generation.prompt);
          
          // Fetch original images and convert to File objects
          const filePromises = generation.originalImagePaths.map(async (path: string, index: number) => {
            const response = await fetch(`/${path}`);
            const blob = await response.blob();
            const filename = path.split("/").pop() || `image-${index}.png`;
            return new File([blob], filename, { type: blob.type });
          });
          
          const loadedFiles = await Promise.all(filePromises);
          setFiles(loadedFiles);
          setStep("describe"); // Skip upload step since files are loaded
          
          localStorage.removeItem("reEditGeneration"); // Clear after loading
        } catch (error) {
          console.error("Failed to load re-edit data:", error);
          localStorage.removeItem("reEditGeneration");
        }
      };
      
      loadReEditData();
    }
  }, []);

  // Mock handlers
  const handleFilesSelected = (newFiles: File[]) => {
    setFiles(newFiles);
    setSelectedDemo(null);
    setStep("describe");
  };

  const selectDemo = (type: "bottle" | "spacer") => {
    setSelectedDemo(type);
    setFiles([]); // Clear files if demo is selected
    setStep("describe");
    
    // Pre-fill a prompt for the demo
    if (type === "bottle") {
      setPrompt("Make this look like a premium lifestyle shot in a misty forest, nature vibes.");
    } else if (type === "spacer") {
      setPrompt("Show this installed on a steel structure at a construction site, industrial engineering style.");
    }
  };

  const handleGenerate = async () => {
    setStep("generating");
    
    try {
      // Prepare form data
      const formData = new FormData();
      
      // Get the files - either from uploaded files or demo images
      let filesToUpload: File[] = [];
      
      if (files.length > 0) {
        // User uploaded their own files (limit to 6)
        filesToUpload = files.slice(0, 6);
      } else if (selectedDemo) {
        // Convert demo image to file
        const demoImage = selectedDemo === "bottle" ? bottleBefore : spacerBefore;
        const response = await fetch(demoImage);
        const blob = await response.blob();
        const file = new File([blob], `${selectedDemo}-demo.png`, { type: "image/png" });
        filesToUpload = [file];
      } else {
        throw new Error("No image selected");
      }
      
      // Append all images
      filesToUpload.forEach((file, index) => {
        formData.append("images", file);
      });
      
      formData.append("prompt", prompt);
      
      // Call the API
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
      setStep("result");
      
      // Clear draft after successful generation
      localStorage.removeItem("promptDraft");
      
    } catch (error: any) {
      console.error("Generation error:", error);
      alert(`Failed to generate image: ${error.message}`);
      setStep("describe");
    }
  };

  const handleReset = () => {
    setStep("upload");
    setFiles([]);
    setSelectedDemo(null);
    setPrompt("");
    setGeneratedImage(null);
    setGenerationId(null);
    localStorage.removeItem("promptDraft");
  };

  // Get current preview image
  const getPreviewImage = () => {
    if (selectedDemo === "bottle") return bottleBefore;
    if (selectedDemo === "spacer") return spacerBefore;
    if (files.length > 0) return URL.createObjectURL(files[0]);
    return null;
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
        <div className="container max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white font-bold text-sm">
              V3
            </div>
            <span className="font-display font-medium tracking-tight">Product Content Studio</span>
          </div>
          <nav className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <span className="text-foreground">Generate</span>
            <Link href="/gallery" className="hover:text-foreground cursor-pointer transition-colors" data-testid="link-gallery-header">
              Gallery
            </Link>
          </nav>
        </div>
      </header>

      <main className="container max-w-3xl mx-auto px-6 pt-32 pb-20 relative z-10">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: UPLOAD */}
          {step === "upload" && (
            <motion.div
              key="upload"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="text-center space-y-4">
                <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                  Transform boring photos<br />into marketing gold.
                </h1>
                <p className="text-lg text-muted-foreground max-w-lg mx-auto">
                  Upload a product photo. Describe the scene. Get professional results instantly.
                </p>
              </div>

              <UploadZone onFilesSelected={handleFilesSelected} />

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="h-px flex-1 bg-border" />
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Or try a demo</span>
                  <div className="h-px flex-1 bg-border" />
                </div>

                <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                  <button 
                    onClick={() => selectDemo("bottle")}
                    className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all"
                    data-testid="button-demo-bottle"
                  >
                    <img src={bottleBefore} alt="Bottle" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                      <span className="text-white font-medium text-sm">Minimalist Bottle</span>
                    </div>
                  </button>
                   <button 
                    onClick={() => selectDemo("spacer")}
                    className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all"
                    data-testid="button-demo-spacer"
                  >
                    <img src={spacerBefore} alt="Spacer" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                      <span className="text-white font-medium text-sm">Industrial Clip</span>
                    </div>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 2: DESCRIBE */}
          {step === "describe" && (
            <motion.div
              key="describe"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <button onClick={handleReset} className="p-2 rounded-full hover:bg-secondary transition-colors" data-testid="button-back">
                    <ArrowRight className="w-5 h-5 rotate-180" />
                  </button>
                  <div>
                    <h2 className="font-medium">
                      {files.length > 0 ? `${files.length} Product${files.length > 1 ? 's' : ''}` : 'Product Photo'}
                    </h2>
                    <p className="text-xs text-muted-foreground">Ready to transform</p>
                  </div>
                </div>

                {/* Image Thumbnails */}
                <div className="flex flex-wrap gap-2">
                  {files.length > 0 ? (
                    files.map((file, index) => (
                      <div key={index} className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-card">
                        <img src={URL.createObjectURL(file)} alt={`Upload ${index + 1}`} className="w-full h-full object-cover" data-testid={`img-upload-${index}`} />
                      </div>
                    ))
                  ) : selectedDemo ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden border border-white/10 bg-card">
                      <img src={getPreviewImage() || ""} alt="Demo" className="w-full h-full object-cover" data-testid="img-demo" />
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <PromptInput 
                    value={prompt} 
                    onChange={setPrompt} 
                    onSubmit={handleGenerate} 
                    isGenerating={false} 
                  />
                  <IntentVisualizer prompt={prompt} />
                </div>

                {/* Resolution Selector */}
                <div className="flex items-center gap-3">
                  <label className="text-sm text-muted-foreground font-medium">Resolution:</label>
                  <Select value={resolution} onValueChange={(value: "1K" | "2K" | "4K") => setResolution(value)}>
                    <SelectTrigger className="w-[140px]" data-testid="select-resolution">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1K">1K (Fast)</SelectItem>
                      <SelectItem value="2K">2K (Balanced)</SelectItem>
                      <SelectItem value="4K">4K (Premium)</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">
                    {resolution === "1K" && "1024 × 1024"}
                    {resolution === "2K" && "2048 × 2048"}
                    {resolution === "4K" && "4096 × 4096"}
                  </span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Link href="/gallery" className="p-4 rounded-2xl border border-white/5 bg-card/30 hover:bg-card/50 transition-all group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Image className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">View Gallery</h4>
                      <p className="text-xs text-muted-foreground">Past generations</p>
                    </div>
                  </div>
                </Link>
                <div className="p-4 rounded-2xl border border-white/5 bg-card/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">Auto-saved</h4>
                      <p className="text-xs text-muted-foreground">Draft stored</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 3: GENERATING (LOADING) */}
          {step === "generating" && (
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
                  <div className="w-16 h-16 rounded-lg overflow-hidden opacity-50 blur-sm">
                    <img src={getPreviewImage() || ""} alt="" className="w-full h-full object-cover" />
                  </div>
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

          {/* STEP 4: RESULT */}
          {step === "result" && generatedImage && (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
               <div className="flex items-center justify-between flex-wrap gap-4">
                 <div className="flex items-center gap-3">
                   <button onClick={handleReset} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors" data-testid="button-start-new">
                     <ArrowRight className="w-4 h-4 rotate-180" />
                     <span className="hidden sm:inline">Start New</span>
                   </button>
                   {generationId && (
                     <Link href={`/generation/${generationId}`} className="text-sm text-primary hover:text-primary/80 transition-colors flex items-center gap-1.5" data-testid="link-view-details">
                       <History className="w-4 h-4" />
                       <span className="hidden sm:inline">View Details</span>
                     </Link>
                   )}
                 </div>
                 <div className="flex gap-2">
                   <Button variant="outline" size="sm" onClick={handleDownload} data-testid="button-download-result">
                     <Download className="w-4 h-4 sm:mr-2" />
                     <span className="hidden sm:inline">Download</span>
                   </Button>
                   <Button size="sm" onClick={handleGenerate} data-testid="button-regenerate">
                     <Sparkles className="w-4 h-4 sm:mr-2" />
                     <span className="hidden sm:inline">Refine</span>
                   </Button>
                 </div>
               </div>

               <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 bg-black group shadow-2xl">
                 <img 
                   src={generatedImage} 
                   alt="Generated" 
                   className="w-full h-full object-cover"
                 />
                 
                 {/* Comparison Slider (Simple Hover for now) */}
                 <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                   <span className="bg-black/50 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-full border border-white/10">
                     Result
                   </span>
                 </div>

                 <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/90 to-transparent opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                   <p className="text-white/90 text-sm line-clamp-2">{prompt}</p>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 rounded-2xl bg-card border border-white/5">
                   <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Input</h4>
                   <div className="flex items-center gap-3">
                     <div className="w-12 h-12 rounded-lg overflow-hidden border border-white/10 bg-black/50">
                       <img src={getPreviewImage() || ""} alt="Input" className="w-full h-full object-cover opacity-70" />
                     </div>
                     <span className="text-sm font-medium">Original.png</span>
                   </div>
                 </div>
                 <div className="p-4 rounded-2xl bg-card border border-white/5">
                   <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Specs</h4>
                   <div className="space-y-1">
                     <div className="flex justify-between text-sm">
                       <span className="text-muted-foreground">Model</span>
                       <span className="font-mono text-xs">gemini-2.5</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-muted-foreground">Resolution</span>
                       <span>{resolution === "1K" ? "1024×1024" : resolution === "2K" ? "2048×2048" : "4096×4096"}</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-muted-foreground">Images</span>
                       <span>{files.length || 1}</span>
                     </div>
                   </div>
                 </div>
               </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
