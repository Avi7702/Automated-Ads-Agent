import { useStudioState } from '@/hooks/useStudioState';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { IdeaBankPanel } from '@/components/IdeaBankPanel';
import { Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * PromptEditor - Main prompt input with IdeaBank integration
 *
 * Features:
 * - Textarea for prompt editing
 * - Selected suggestion display
 * - IdeaBank suggestions panel
 * - Character count
 */
export function PromptEditor() {
  const {
    state: { prompt, selectedSuggestion, selectedProducts, tempUploads, ideaBankMode },
    setPrompt,
    setSuggestion,
    setRecipe,
  } = useStudioState();

  const hasImages = selectedProducts.length > 0 || tempUploads.length > 0;

  return (
    <div className="space-y-4">
      {/* Selected Suggestion Card */}
      {selectedSuggestion && (
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in-50 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-xs font-medium text-primary">AI Suggestion</span>
              </div>
              <p className="text-sm">{selectedSuggestion.prompt}</p>
              {selectedSuggestion.reasoning && (
                <p className="text-xs text-muted-foreground mt-1">{selectedSuggestion.reasoning}</p>
              )}
            </div>
            <button onClick={() => setSuggestion(null)} className="p-1 rounded hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* Main Textarea */}
      <div className="relative">
        <Textarea
          placeholder={
            hasImages
              ? 'Describe how you want your ad image to look...'
              : 'Select products or upload images first, then describe your vision...'
          }
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className={cn('min-h-[120px] resize-none', !hasImages && 'opacity-50')}
          disabled={!hasImages}
        />
        <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">{prompt.length}/2000</div>
      </div>

      {/* IdeaBank Panel */}
      {hasImages && (
        <IdeaBankPanel
          selectedProducts={selectedProducts}
          tempUploads={tempUploads}
          mode={ideaBankMode}
          onSelectPrompt={(prompt: string, id?: string, reasoning?: string) => {
            setSuggestion({
              id: id || '',
              prompt,
              reasoning,
            });
          }}
          onRecipeAvailable={setRecipe}
        />
      )}

      {/* Mode Badge */}
      {ideaBankMode !== 'freestyle' && (
        <Badge variant="outline" className="text-xs">
          Mode: {ideaBankMode}
        </Badge>
      )}
    </div>
  );
}
