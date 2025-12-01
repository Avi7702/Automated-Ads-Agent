import { useState } from "react";
import { Loader2, X, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const QUICK_EDITS = [
  { label: "Warmer lighting", prompt: "Make the lighting warmer and more golden" },
  { label: "Cooler tones", prompt: "Make the colors cooler with blue tones" },
  { label: "Add shadows", prompt: "Add more dramatic shadows for depth" },
  { label: "Softer look", prompt: "Make the image softer and more diffused" },
  { label: "More contrast", prompt: "Increase the contrast for a punchier look" },
  { label: "Blur background", prompt: "Blur the background to focus on the main subject" },
];

interface EditPanelProps {
  generationId: string;
  onEditComplete: (newGenerationId: string) => void;
  onClose: () => void;
}

export function EditPanel({ generationId, onEditComplete, onClose }: EditPanelProps) {
  const [editPrompt, setEditPrompt] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleApplyEdit = async () => {
    if (!editPrompt.trim()) return;

    setIsEditing(true);
    setError(null);

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

      onEditComplete(data.generationId);
    } catch (err: any) {
      console.error("Edit error:", err);
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsEditing(false);
    }
  };

  const handleQuickEdit = (prompt: string) => {
    setEditPrompt(prompt);
  };

  return (
    <div className="border rounded-2xl p-6 bg-card/50 backdrop-blur-sm space-y-5" data-testid="edit-panel-component">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">Edit Image</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          disabled={isEditing}
          data-testid="button-close-edit"
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
              data-testid={`quick-edit-${preset.label.toLowerCase().replace(/\s/g, "-")}`}
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
          placeholder="e.g., 'make the background darker' or 'add a subtle reflection'"
          rows={3}
          className="resize-none"
          disabled={isEditing}
          data-testid="input-edit-prompt"
        />
      </div>

      {error && (
        <div className="text-sm text-destructive bg-destructive/10 px-4 py-2 rounded-lg" data-testid="edit-error">
          {error}
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
          onClick={onClose}
          disabled={isEditing}
          data-testid="button-cancel"
        >
          Cancel
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: Short, specific prompts work best. The AI remembers your image and will only change what you ask for.
      </p>
    </div>
  );
}
