import { useQuery } from "@tanstack/react-query";
import { Link, useRoute, useLocation } from "wouter";
import { Download, Pencil, X, Loader2, History, MessageCircle, Send, Sparkles, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useState, useCallback } from "react";
import { CopywritingPanel } from "@/components/CopywritingPanel";
import { Header } from "@/components/layout/Header";
import { cn } from "@/lib/utils";

const QUICK_EDITS = [
  { label: "Warmer lighting", prompt: "Make the lighting warmer and more golden" },
  { label: "Cooler tones", prompt: "Make the colors cooler with blue tones" },
  { label: "Add shadows", prompt: "Add more dramatic shadows for depth" },
  { label: "Softer look", prompt: "Make the image softer and more diffused" },
  { label: "More contrast", prompt: "Increase the contrast for a punchier look" },
  { label: "Blur background", prompt: "Blur the background to focus on the main subject" },
];

const SUGGESTED_QUESTIONS = [
  "What changes did you make to the original image?",
  "How can I improve my prompt to get better results?",
  "Why does the lighting look this way?",
  "What would make this image more professional?",
];

interface Generation {
  id: string;
  prompt: string;
  originalImagePaths: string[];
  generatedImagePath: string;
  resolution: string;
  cost?: number | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  createdAt: string;
  editPrompt?: string | null;
  parentGenerationId?: string | null;
  conversationHistory?: string | null;
}

export default function GenerationDetail() {
  const [, params] = useRoute("/generation/:id");
  const [, setLocation] = useLocation();
  const [showComparison, setShowComparison] = useState(false);
  const [isEditPanelOpen, setIsEditPanelOpen] = useState(false);
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  
  // Ask AI state
  const [isAskAIOpen, setIsAskAIOpen] = useState(false);
  const [askAIQuestion, setAskAIQuestion] = useState("");
  const [askAIResponse, setAskAIResponse] = useState<string | null>(null);
  const [lastAskedQuestion, setLastAskedQuestion] = useState<string | null>(null);
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [askAIError, setAskAIError] = useState<string | null>(null);

  // Image loading state
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoaded(true);
  }, []);

  const { data: generation, isLoading } = useQuery<Generation>({
    queryKey: ["generation", params?.id],
    queryFn: async () => {
      const response = await fetch(`/api/generations/${params?.id}`);
      if (!response.ok) throw new Error("Failed to fetch generation");
      return response.json();
    },
    enabled: !!params?.id,
  });

  const canEdit = !!generation?.conversationHistory;

  const handleDownload = () => {
    if (!generation) return;
    const link = document.createElement("a");
    // Handle both Cloudinary URLs and local paths
    const imageUrl = generation.generatedImagePath.startsWith("http")
      ? generation.generatedImagePath
      : `/${generation.generatedImagePath}`;
    link.href = imageUrl;
    link.download = `product-content-${generation.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleApplyEdit = async () => {
    if (!editPrompt.trim() || !generation) return;

    setIsEditing(true);
    setEditError(null);

    try {
      const response = await fetch(`/api/generations/${generation.id}/edit`, {
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
      setEditError(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleQuickEdit = (prompt: string) => {
    setEditPrompt(prompt);
  };

  const handleCloseEditPanel = () => {
    setIsEditPanelOpen(false);
    setEditPrompt("");
    setEditError(null);
  };

  const handleAskAI = async (question?: string) => {
    const q = question || askAIQuestion;
    if (!q.trim() || !generation) return;

    setIsAskingAI(true);
    setAskAIError(null);
    setAskAIResponse(null);
    setLastAskedQuestion(q.trim());

    try {
      const response = await fetch(`/api/generations/${generation.id}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to get response");
      }

      setAskAIResponse(data.answer);
      setAskAIQuestion("");
    } catch (error: any) {
      console.error("Ask AI error:", error);
      setAskAIError(error.message || "Something went wrong. Please try again.");
    } finally {
      setIsAskingAI(false);
    }
  };

  const handleCloseAskAI = () => {
    setIsAskAIOpen(false);
    setAskAIQuestion("");
    setAskAIResponse(null);
    setLastAskedQuestion(null);
    setAskAIError(null);
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
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
      </div>

      <Header currentPage="generation" />

      <main className="container max-w-5xl mx-auto px-6 pt-24 pb-20 relative z-10">
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex items-center justify-between">
            <Link href="/gallery" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to Gallery
            </Link>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAskAIOpen(true)}
                disabled={isAskAIOpen}
                data-testid="button-ask-ai"
              >
                <MessageCircle className="w-4 h-4 mr-1" />
                Ask AI
              </Button>
              {canEdit && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditPanelOpen(true)}
                  disabled={isEditPanelOpen}
                  data-testid="button-edit"
                >
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
              <Button size="sm" onClick={handleDownload} data-testid="button-download">
                <Download className="w-4 h-4 mr-1" />
                Download
              </Button>
            </div>
          </div>

          {generation.parentGenerationId && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-4 py-3 rounded-xl" data-testid="edit-lineage-info">
              <History className="w-4 h-4" />
              <span>
                Edited from{" "}
                <Link
                  href={`/generation/${generation.parentGenerationId}`}
                  className="text-primary hover:underline"
                  data-testid="link-parent-generation"
                >
                  previous version
                </Link>
              </span>
              {generation.editPrompt && (
                <span className="text-xs ml-2 opacity-70">
                  — "{generation.editPrompt}"
                </span>
              )}
            </div>
          )}

          <div className="relative w-full max-w-4xl mx-auto rounded-3xl overflow-hidden border border-border/50 bg-gradient-to-b from-black/90 to-black shadow-2xl ring-1 ring-white/5 group">
            {/* Subtle corner accents */}
            <div className="absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none z-10" />
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-primary/10 to-transparent pointer-events-none z-10" />

            {/* Loading skeleton */}
            {!imageLoaded && !imageError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/20 animate-pulse min-h-[300px]">
                <Loader2 className="w-8 h-8 text-primary/50 animate-spin mb-2" />
                <span className="text-xs text-muted-foreground">Loading image...</span>
              </div>
            )}

            {/* Error state */}
            {imageError && (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <ImageIcon className="w-12 h-12 mb-3 opacity-50" />
                <span className="text-sm">Failed to load image</span>
              </div>
            )}

            {/* Main image with performance optimizations */}
            <img
              src={generation.generatedImagePath.startsWith("http") ? generation.generatedImagePath : `/${generation.generatedImagePath}`}
              alt={generation.prompt}
              className={cn(
                "w-full h-auto max-h-[75vh] object-contain block transition-all duration-300",
                "group-hover:scale-[1.02]",
                imageLoaded ? "opacity-100" : "opacity-0"
              )}
              loading="lazy"
              decoding="async"
              onLoad={handleImageLoad}
              onError={handleImageError}
              data-testid="img-generated-full"
            />
          </div>

          {!canEdit && (
            <p className="text-sm text-muted-foreground text-center" data-testid="text-cannot-edit">
              This image was generated before the edit feature was available.
            </p>
          )}

          {isEditPanelOpen && (
            <div className="border rounded-2xl p-6 bg-card/50 backdrop-blur-sm space-y-5" data-testid="edit-panel">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">What would you like to change?</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseEditPanel}
                  disabled={isEditing}
                  data-testid="button-close-edit-panel"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Quick edits:</p>
                <div className="flex flex-wrap gap-2">
                  {QUICK_EDITS.map((preset) => (
                    <button
                      key={preset.label}
                      onClick={() => handleQuickEdit(preset.prompt)}
                      disabled={isEditing}
                      className={`
                        px-3 py-1.5 text-sm rounded-full border transition-colors
                        ${editPrompt === preset.prompt
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background hover:bg-muted border-border"
                        }
                        disabled:opacity-50 disabled:cursor-not-allowed
                      `}
                      data-testid={`button-quick-edit-${preset.label.toLowerCase().replace(/\s/g, "-")}`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Or describe your edit:</p>
                <Textarea
                  value={editPrompt}
                  onChange={(e) => setEditPrompt(e.target.value)}
                  placeholder="e.g., 'make the background darker' or 'add a subtle reflection on the floor'"
                  rows={3}
                  className="resize-none"
                  disabled={isEditing}
                  data-testid="input-edit-prompt"
                />
              </div>

              {editError && (
                <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg" data-testid="text-edit-error">
                  {editError}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={handleApplyEdit}
                  disabled={!editPrompt.trim() || isEditing}
                  className="flex-1"
                  data-testid="button-apply-edit"
                >
                  {isEditing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Applying edit...
                    </>
                  ) : (
                    "Apply Edit"
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCloseEditPanel}
                  disabled={isEditing}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
              </div>

              <p className="text-xs text-muted-foreground">
                Tip: Short, specific prompts work best. The AI remembers your image and will only change what you ask for.
              </p>
            </div>
          )}

          {isAskAIOpen && (
            <div className="border rounded-2xl p-6 bg-card/50 backdrop-blur-sm space-y-5" data-testid="ask-ai-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">Ask AI about this image</h3>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCloseAskAI}
                  disabled={isAskingAI}
                  data-testid="button-close-ask-ai"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Quick questions:</p>
                <div className="flex flex-wrap gap-2">
                  {SUGGESTED_QUESTIONS.map((question, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleAskAI(question)}
                      disabled={isAskingAI}
                      className="px-3 py-1.5 text-sm rounded-full border bg-background hover:bg-muted border-border transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid={`button-suggested-question-${idx}`}
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">Or ask your own question:</p>
                <div className="flex gap-2">
                  <Input
                    value={askAIQuestion}
                    onChange={(e) => setAskAIQuestion(e.target.value)}
                    placeholder="e.g., 'Why is there a reflection?' or 'How can I make it look more natural?'"
                    disabled={isAskingAI}
                    onKeyDown={(e) => e.key === 'Enter' && handleAskAI()}
                    data-testid="input-ask-ai-question"
                  />
                  <Button
                    onClick={() => handleAskAI()}
                    disabled={!askAIQuestion.trim() || isAskingAI}
                    data-testid="button-send-question"
                  >
                    {isAskingAI ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>

              {askAIError && (
                <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg" data-testid="text-ask-ai-error">
                  {askAIError}
                </div>
              )}

              {(askAIResponse || isAskingAI) && lastAskedQuestion && (
                <div className="space-y-3">
                  <div className="bg-muted/30 rounded-lg p-3 border-l-2 border-muted-foreground/30">
                    <p className="text-xs text-muted-foreground mb-1">You asked:</p>
                    <p className="text-sm italic">"{lastAskedQuestion}"</p>
                  </div>
                  
                  {isAskingAI && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Analyzing images and thinking...</span>
                    </div>
                  )}
                  
                  {askAIResponse && (
                    <div className="bg-muted/50 rounded-xl p-4 space-y-2 border border-primary/20" data-testid="ask-ai-response">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <p className="text-xs font-medium text-primary uppercase tracking-wider">AI Response</p>
                      </div>
                      <div className="max-h-64 overflow-y-auto pr-2">
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{askAIResponse}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                AI analyzes both the original and generated images to help you understand the transformation.
              </p>
            </div>
          )}

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

          {showComparison && generation.originalImagePaths.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {generation.originalImagePaths.map((path, index) => (
                <div key={index} className="aspect-square rounded-xl overflow-hidden border border-border bg-card">
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

          <div className="p-6 rounded-3xl border border-border/50 bg-card/30 backdrop-blur-sm space-y-4">
            <div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">Prompt</h3>
              <p className="text-foreground" data-testid="text-prompt-detail">{generation.prompt}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
              <div>
                <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Created</h4>
                <p className="text-sm">{format(new Date(generation.createdAt), "MMM d, yyyy 'at' h:mm a")}</p>
              </div>
              <div>
                <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Resolution</h4>
                <p className="text-sm">{generation.resolution}</p>
              </div>
              {generation.cost != null && (
                <div>
                  <h4 className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Cost</h4>
                  <p className="text-sm font-medium text-green-600">${generation.cost.toFixed(4)}</p>
                </div>
              )}
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

          <CopywritingPanel generationId={generation.id} prompt={generation.prompt} />
        </div>
      </main>
    </div>
  );
}
