import { cn } from '@/lib/utils';
import { useStudioState } from '@/hooks/useStudioState';
import { PromptEditor } from './sections/PromptEditor';
import { OutputSettings } from './sections/OutputSettings';
import { GenerateButton } from './sections/GenerateButton';
import { ResultView } from './sections/ResultView';

interface SmartCanvasProps {
  className?: string;
}

/**
 * SmartCanvas - Central generation workspace
 *
 * Orchestrates the generation workflow:
 * 1. Prompt editing with IdeaBank suggestions
 * 2. Output settings (platform, aspect ratio, resolution)
 * 3. Generate button with price estimate
 * 4. Result display with actions (edit, copy, preview, save)
 */
export function SmartCanvas({ className }: SmartCanvasProps) {
  const { hasResult } = useStudioState();

  return (
    <div
      className={cn(
        'flex flex-col h-full bg-background',
        className
      )}
    >
      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Show result view if we have a generated image */}
        {hasResult ? (
          <ResultView />
        ) : (
          <>
            {/* Prompt Section */}
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Describe Your Vision</h2>
              <PromptEditor />
            </section>

            {/* Output Settings */}
            <section className="space-y-4">
              <h2 className="text-lg font-medium">Output Settings</h2>
              <OutputSettings />
            </section>
          </>
        )}
      </div>

      {/* Sticky Generate Button */}
      {!hasResult && (
        <div className="border-t border-border p-4 bg-card/50 backdrop-blur-sm">
          <GenerateButton />
        </div>
      )}
    </div>
  );
}
