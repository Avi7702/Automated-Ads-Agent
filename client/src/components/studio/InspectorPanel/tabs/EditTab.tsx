// @ts-nocheck
import { memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2, Pencil } from 'lucide-react';
import { useStudioState } from '@/hooks/useStudioState';

const EDIT_PRESETS = [
  'Warmer lighting',
  'Cooler tones',
  'More contrast',
  'Softer look',
  'Brighter background',
  'More vibrant colors',
  'Add subtle shadows',
  'Professional lighting',
];

interface EditTabProps {
  onApplyEdit: () => void;
}

export const EditTab = memo(function EditTab({ onApplyEdit }: EditTabProps) {
  const { state, setEditPrompt } = useStudioState();
  const hasResult = Boolean(state.generatedImage);

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Pencil className="w-4 h-4 text-primary" />
        Refine Image
      </div>

      {!hasResult ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Generate an image first, then use this tab to refine it.
        </p>
      ) : (
        <>
          <Textarea
            value={state.editPrompt}
            onChange={(e) => setEditPrompt(e.target.value)}
            placeholder="Describe what changes you would like..."
            rows={3}
            className="resize-none text-sm"
          />

          <div className="flex flex-wrap gap-1.5">
            {EDIT_PRESETS.map((preset) => (
              <button
                key={preset}
                onClick={() => setEditPrompt(preset)}
                className="text-xs px-2.5 py-1.5 rounded-full border border-border hover:bg-muted/80 hover:border-primary/30 transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>

          <Button
            onClick={onApplyEdit}
            disabled={!state.editPrompt.trim() || state.isEditing}
            className="w-full"
            size="sm"
          >
            {state.isEditing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Apply Changes
              </>
            )}
          </Button>
        </>
      )}
    </motion.div>
  );
});
