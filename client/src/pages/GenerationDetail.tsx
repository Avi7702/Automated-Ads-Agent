import { useQuery } from "@tanstack/react-query";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowLeft, Download, Pencil, X, Loader2, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { format } from "date-fns";
import { useState } from "react";
import { CopywritingPanel } from "@/components/CopywritingPanel";

const QUICK_EDITS = [
  { label: "Warmer lighting", prompt: "Make the lighting warmer and more golden" },
  { label: "Cooler tones", prompt: "Make the colors cooler with blue tones" },
  { label: "Add shadows", prompt: "Add more dramatic shadows for depth" },
  { label: "Softer look", prompt: "Make the image softer and more diffused" },
  { label: "More contrast", prompt: "Increase the contrast for a punchier look" },
  { label: "Blur background", prompt: "Blur the background to focus on the main subject" },
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
    link.href = `/${generation.generatedImagePath}`;
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

      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-background/50 backdrop-blur-md">
        <div className="container max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/gallery" className="flex items-center gap-3 text-muted-foreground hover:text-foreground transition-colors" data-testid="link-gallery">
            <ArrowLeft className="w-5 h-5" />
            <span className="font-medium">Gallery</span>
          </Link>
          <div className="flex gap-2">
            {canEdit && (
              <Button
                variant="outline"
                onClick={() => setIsEditPanelOpen(true)}
                disabled={isEditPanelOpen}
                data-testid="button-edit"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
            <Button onClick={handleDownload} data-testid="button-download">
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </div>
      </header>

      <main className="container max-w-5xl mx-auto px-6 pt-24 pb-20 relative z-10">
        <div className="space-y-6">
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

          <div className="relative aspect-square rounded-3xl overflow-hidden border border-white/10 bg-black shadow-2xl">
            <img
              src={`/${generation.generatedImagePath}`}
              alt={generation.prompt}
              className="w-full h-full object-contain"
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
