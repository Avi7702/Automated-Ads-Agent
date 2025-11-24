import { useQuery } from "@tanstack/react-query";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, Download, Edit, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useState } from "react";

interface Generation {
  id: string;
  prompt: string;
  originalImagePaths: string[];
  generatedImagePath: string;
  resolution: string;
  createdAt: string;
}

export default function GenerationDetail() {
  const [, params] = useRoute("/generation/:id");
  const [, setLocation] = useLocation();
  const [showComparison, setShowComparison] = useState(false);

  const { data: generation, isLoading } = useQuery<Generation>({
    queryKey: ["generation", params?.id],
    queryFn: async () => {
      const response = await fetch(`/api/generations/${params?.id}`);
      if (!response.ok) throw new Error("Failed to fetch generation");
      return response.json();
    },
    enabled: !!params?.id,
  });

  const handleDownload = () => {
    if (!generation) return;
    const link = document.createElement("a");
    link.href = `/${generation.generatedImagePath}`;
    link.download = `product-content-${generation.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReEdit = () => {
    // Store generation data in localStorage for re-editing
    if (generation) {
      localStorage.setItem("reEditGeneration", JSON.stringify(generation));
      setLocation("/");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!generation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-display">Generation not found</h2>
          <Link href="/gallery">
            <Button>Back to Gallery</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/50 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/gallery" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors" data-testid="link-gallery">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Gallery</span>
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReEdit} data-testid="button-reedit">
              <Edit className="w-4 h-4 mr-2" />
              Re-Edit
            </Button>
            <Button onClick={handleDownload} data-testid="button-download">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-5xl mx-auto px-6 pt-24 pb-20 relative z-10">
        <div className="space-y-6">
          {/* Main Image */}
          <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl">
            <img
              src={`/${generation.generatedImagePath}`}
              alt={generation.prompt}
              className="w-full h-full object-contain"
              data-testid="img-generated-full"
            />
          </div>

          {/* Comparison Toggle */}
          {generation.originalImagePaths.length > 0 && (
            <div className="flex justify-center">
              <Button
                variant={showComparison ? "default" : "outline"}
                onClick={() => setShowComparison(!showComparison)}
                data-testid="button-toggle-comparison"
              >
                {showComparison ? "Hide" : "Show"} Original Images
              </Button>
            </div>
          )}

          {/* Original Images */}
          {showComparison && generation.originalImagePaths.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {generation.originalImagePaths.map((path, index) => (
                <div key={index} className="aspect-square rounded-xl overflow-hidden border border-white/10 bg-card">
                  <img
                    src={`/${path}`}
                    alt={`Original ${index + 1}`}
                    className="w-full h-full object-cover"
                    data-testid={`img-original-${index}`}
                  />
                </div>
              ))}
            </div>
          )}

          {/* Info Card */}
          <div className="p-6 rounded-3xl border border-white/5 bg-card/30 backdrop-blur-sm space-y-4">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Prompt</h3>
              <p className="text-foreground" data-testid="text-prompt-detail">{generation.prompt}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div>
                <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Created</h4>
                <p className="text-sm">{format(new Date(generation.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>
              <div>
                <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Resolution</h4>
                <p className="text-sm">{generation.resolution}</p>
              </div>
              <div>
                <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Images Used</h4>
                <p className="text-sm">{generation.originalImagePaths.length}</p>
              </div>
              <div>
                <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">ID</h4>
                <p className="text-xs font-mono text-muted-foreground">{generation.id.slice(0, 8)}...</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
