import React, { memo, useCallback } from 'react';
import { RefreshCw, Target } from 'lucide-react';
import { SuggestionCard } from './SuggestionCard';
import { TemplateSlotCard } from './TemplateSlotCard';
import type { IdeaBankSuggestionsProps, TemplateSlotSuggestion } from './types';

function IdeaBankSuggestionsComponent({
  mode,
  response,
  slotSuggestions,
  mergedPrompt,
  templateContext,
  templateId,
  loading,
  error,
  selectedPromptId,
  selectedSlotIndex,
  isGenerating,
  onSelectPrompt,
  onQuickGenerate,
  onSlotSelect,
  onRecipeAvailable,
  onSetPlatform,
  onSetAspectRatio,
}: IdeaBankSuggestionsProps) {
  // Memoized handler for freestyle suggestions
  const handleSuggestionUse = useCallback(
    (prompt: string, id: string, reasoning?: string) => {
      onSelectPrompt(prompt, id, reasoning);

      // Pass recipe context to parent for /api/transform
      if (onRecipeAvailable && response?.recipe) {
        onRecipeAvailable(response.recipe);
      }

      // Find the suggestion to get platform/aspect ratio recommendations
      const suggestion = response?.suggestions.find((s) => s.id === id);
      if (suggestion) {
        if (suggestion.recommendedPlatform && onSetPlatform) {
          onSetPlatform(suggestion.recommendedPlatform);
        }
        if (suggestion.recommendedAspectRatio && onSetAspectRatio) {
          onSetAspectRatio(suggestion.recommendedAspectRatio);
        }
      }
    },
    [onSelectPrompt, onRecipeAvailable, response, onSetPlatform, onSetAspectRatio],
  );

  // Memoized handler for quick generate
  const handleQuickGenerate = useCallback(
    (prompt: string, suggestionId: string) => {
      if (!onQuickGenerate) return;

      const suggestion = response?.suggestions.find((s) => s.id === suggestionId);
      if (!suggestion) return;

      // First set the prompt so user can see what's generating
      onSelectPrompt(prompt, suggestionId, suggestion.reasoning);

      // Pass recipe context to parent for /api/transform
      if (onRecipeAvailable && response?.recipe) {
        onRecipeAvailable(response.recipe);
      }

      // Auto-set platform if recommendation exists
      if (suggestion.recommendedPlatform && onSetPlatform) {
        onSetPlatform(suggestion.recommendedPlatform);
      }

      // Then trigger generation
      onQuickGenerate(prompt);
    },
    [onQuickGenerate, onSelectPrompt, onRecipeAvailable, response, onSetPlatform],
  );

  // Memoized handler for slot suggestion selection
  const handleSlotUse = useCallback(
    (index: number, suggestion: TemplateSlotSuggestion, prompt: string) => {
      onSlotSelect(index, suggestion, prompt);
      onSelectPrompt(prompt, `slot-${index}`, suggestion.reasoning);
    },
    [onSlotSelect, onSelectPrompt],
  );

  // Loading State
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Error State
  if (error) {
    return <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-sm">{error}</div>;
  }

  // Template Mode
  if (mode === 'template') {
    return (
      <>
        {/* Template Context Info */}
        {templateContext && (
          <div className="p-3 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/20 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-amber-600" />
              <span className="font-medium text-amber-700 dark:text-amber-400">{templateContext.title}</span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 dark:bg-amber-500/30 text-amber-600 dark:text-amber-400">
                {templateContext.category}
              </span>
            </div>
            {templateContext.environment && (
              <p className="text-xs text-muted-foreground">
                Environment: {templateContext.environment} | Mood: {templateContext.mood || 'N/A'} | Lighting:{' '}
                {templateContext.lightingStyle || 'N/A'}
              </p>
            )}
          </div>
        )}

        {/* Slot Suggestions Grid */}
        {slotSuggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {slotSuggestions.length} slot {slotSuggestions.length === 1 ? 'suggestion' : 'suggestions'} for this
                template
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {slotSuggestions.map((suggestion, index) => (
                <TemplateSlotCard
                  key={`slot-${index}`}
                  suggestion={suggestion}
                  onUse={(slotSuggestion, prompt) => handleSlotUse(index, slotSuggestion, prompt)}
                  index={index}
                  isSelected={selectedSlotIndex === index}
                  mergedPrompt={mergedPrompt}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State - No Slot Suggestions */}
        {slotSuggestions.length === 0 && templateId && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No slot suggestions available. Click refresh to try again.
          </p>
        )}

        {/* No Template Selected */}
        {!templateId && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Select a template to get AI-powered slot suggestions.
          </p>
        )}
      </>
    );
  }

  // Freestyle Mode
  if (response && response.suggestions.length > 0) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {response.suggestions.length} AI-generated {response.suggestions.length === 1 ? 'idea' : 'ideas'}
          </span>
          {onQuickGenerate && (
            <span className="text-xs text-green-600 dark:text-green-400">Click "Generate" to start immediately</span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {response.suggestions.map((suggestion, index) => (
            <SuggestionCard
              key={suggestion.id}
              suggestion={suggestion}
              onUse={handleSuggestionUse}
              onQuickGenerate={onQuickGenerate ? (prompt) => handleQuickGenerate(prompt, suggestion.id) : undefined}
              index={index}
              isSelected={selectedPromptId === suggestion.id}
              isGenerating={isGenerating}
            />
          ))}
        </div>
      </div>
    );
  }

  // Empty State - Freestyle Mode
  if (response && response.suggestions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        No suggestions available. Click refresh to try again.
      </p>
    );
  }

  return null;
}

export const IdeaBankSuggestions = memo(IdeaBankSuggestionsComponent);
