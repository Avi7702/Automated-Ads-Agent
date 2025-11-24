import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UploadZone } from "@/components/UploadZone";
import { PromptInput } from "@/components/PromptInput";
import { IntentVisualizer } from "@/components/IntentVisualizer";
import { Button } from "@/components/ui/button";
import { ArrowRight, RefreshCw, Download, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Import generated assets
import bottleBefore from "@assets/generated_images/plain_white_water_bottle_product_shot.png";
import bottleAfter from "@assets/generated_images/water_bottle_lifestyle_marketing_shot.png";
import shoeBefore from "@assets/generated_images/white_running_shoe_product_shot.png";
import shoeAfter from "@assets/generated_images/running_shoe_urban_marketing_shot.png";

type Step = "upload" | "describe" | "generating" | "result";

export default function Home() {
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [selectedDemo, setSelectedDemo] = useState<"bottle" | "shoe" | null>(null);
  const [prompt, setPrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Mock handlers
  const handleFilesSelected = (newFiles: File[]) => {
    setFiles(newFiles);
    setSelectedDemo(null);
    setStep("describe");
  };

  const selectDemo = (type: "bottle" | "shoe") => {
    setSelectedDemo(type);
    setFiles([]); // Clear files if demo is selected
    setStep("describe");
    
    // Pre-fill a prompt for the demo
    if (type === "bottle") {
      setPrompt("Make this look like a premium lifestyle shot in a misty forest, nature vibes.");
    } else {
      setPrompt("Show this sneaker splashing through a puddle on a neon-lit city street at night.");
    }
  };

  const handleGenerate = () => {
    setStep("generating");
    
    // Simulate API call delay
    setTimeout(() => {
      if (selectedDemo === "bottle") {
        setGeneratedImage(bottleAfter);
      } else if (selectedDemo === "shoe") {
        setGeneratedImage(shoeAfter);
      } else {
        // Fallback for custom uploads (since we can't actually transform them)
        // We'll just show the bottle after as a "mock" result
        setGeneratedImage(bottleAfter); 
      }
      setStep("result");
    }, 3500);
  };

  const handleReset = () => {
    setStep("upload");
    setFiles([]);
    setSelectedDemo(null);
    setPrompt("");
    setGeneratedImage(null);
  };

  // Get current preview image
  const getPreviewImage = () => {
    if (selectedDemo === "bottle") return bottleBefore;
    if (selectedDemo === "shoe") return shoeBefore;
    if (files.length > 0) return URL.createObjectURL(files[0]);
    return null;
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
            <span className="hover:text-foreground cursor-pointer transition-colors">History</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Settings</span>
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

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => selectDemo("bottle")}
                    className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all"
                  >
                    <img src={bottleBefore} alt="Bottle" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                      <span className="text-white font-medium text-sm">Minimalist Bottle</span>
                    </div>
                  </button>
                  <button 
                    onClick={() => selectDemo("shoe")}
                    className="group relative aspect-[4/3] rounded-2xl overflow-hidden border border-white/10 hover:border-primary/50 transition-all"
                  >
                    <img src={shoeBefore} alt="Shoe" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-4">
                      <span className="text-white font-medium text-sm">Running Shoe</span>
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
              <div className="flex items-center gap-4">
                <button onClick={handleReset} className="p-2 rounded-full hover:bg-secondary transition-colors">
                  <ArrowRight className="w-5 h-5 rotate-180" />
                </button>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/10 bg-card">
                    <img src={getPreviewImage() || ""} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h2 className="font-medium">Product Photo</h2>
                    <p className="text-xs text-muted-foreground">Ready to transform</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <PromptInput 
                  value={prompt} 
                  onChange={setPrompt} 
                  onSubmit={handleGenerate} 
                  isGenerating={false} 
                />
                <IntentVisualizer prompt={prompt} />
              </div>

              {/* Simulated Chat History / Context */}
              <div className="p-6 rounded-3xl border border-white/5 bg-card/30 backdrop-blur-sm space-y-4">
                <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">System Intelligence</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3 text-muted-foreground/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2" />
                    <p>Model locked to <span className="text-foreground font-mono text-xs bg-white/5 px-1 py-0.5 rounded">gemini-3-pro-image-preview</span></p>
                  </div>
                  <div className="flex items-start gap-3 text-muted-foreground/80">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2" />
                    <p>Dynamic Intent Engine active. Waiting for description...</p>
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
               <div className="flex items-center justify-between">
                 <button onClick={handleReset} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                   <ArrowRight className="w-4 h-4 rotate-180" />
                   Start New
                 </button>
                 <div className="flex gap-2">
                   <Button variant="outline" size="sm">
                     <RefreshCw className="w-4 h-4 mr-2" />
                     Regenerate
                   </Button>
                   <Button size="sm">
                     <Download className="w-4 h-4 mr-2" />
                     Download High-Res
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
                       <span>Gemini 3 Pro</span>
                     </div>
                     <div className="flex justify-between text-sm">
                       <span className="text-muted-foreground">Resolution</span>
                       <span>2048 x 2048</span>
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
