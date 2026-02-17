import { useState } from 'react';
import { TemplateLibrary } from '@/components/TemplateLibrary';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Sparkles, Wand2, Image as ImageIcon } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import type { AdSceneTemplate } from '@shared/schema';
import { Header } from '@/components/layout/Header';

interface TemplatesProps {
  embedded?: boolean | undefined;
  selectedId?: string | null | undefined;
}

type GenerationMode = 'exact_insert' | 'inspiration';

export default function Templates({ embedded = false, selectedId: _selectedId }: TemplatesProps) {
  const [, setLocation] = useLocation();
  const [selectedTemplate, setSelectedTemplate] = useState<AdSceneTemplate | null>(null);
  const [selectedMode, setSelectedMode] = useState<GenerationMode>('exact_insert');

  const handleSelectTemplate = (template: AdSceneTemplate) => {
    setSelectedTemplate(template);
  };

  const handleUseTemplate = () => {
    if (!selectedTemplate) return;

    // Store template selection in localStorage for the generation page
    try {
      localStorage.setItem(
        'selectedTemplate',
        JSON.stringify({
          template: selectedTemplate,
          mode: selectedMode,
        }),
      );
    } catch {
      // localStorage may be unavailable in private browsing mode
      // Continue anyway - the query params will still work
    }

    // Navigate to home page with query params
    setLocation(`/?templateId=${selectedTemplate.id}&mode=${selectedMode}`);
  };

  const mainContent = (
    <>
      {/* Selected Template Preview with Mode Selection */}
      {selectedTemplate && (
        <div className="mb-6 p-6 rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Selected Template</h3>
            <Button variant="outline" size="sm" onClick={() => setSelectedTemplate(null)}>
              Clear Selection
            </Button>
          </div>
          <div className="flex gap-6 items-start">
            <div className="w-40 h-48 rounded-lg border border-border bg-card overflow-hidden relative flex-shrink-0">
              {selectedTemplate.previewImageUrl ? (
                <img
                  src={selectedTemplate.previewImageUrl}
                  alt={selectedTemplate.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling as HTMLElement;
                    if (fallback) fallback.style.display = 'flex';
                  }}
                />
              ) : null}
              <div
                className="w-full h-full items-center justify-center absolute inset-0 flex-col gap-2"
                style={{ display: selectedTemplate.previewImageUrl ? 'none' : 'flex' }}
              >
                <ImageIcon className="w-8 h-8 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">No preview</span>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-lg mb-2">{selectedTemplate.title}</h4>
              {selectedTemplate.description && (
                <p className="text-sm text-muted-foreground mb-3">{selectedTemplate.description}</p>
              )}
              <div className="flex gap-2 flex-wrap mb-4">
                <span className="text-xs px-2 py-1 rounded-md bg-primary/20 text-primary border border-primary/30">
                  {selectedTemplate.category}
                </span>
                {selectedTemplate.lightingStyle && (
                  <span className="text-xs px-2 py-1 rounded-md bg-muted/30 text-muted-foreground border border-border">
                    {selectedTemplate.lightingStyle} lighting
                  </span>
                )}
                {selectedTemplate.environment && (
                  <span className="text-xs px-2 py-1 rounded-md bg-muted/30 text-muted-foreground border border-border">
                    {selectedTemplate.environment}
                  </span>
                )}
              </div>

              {/* Mode Selection */}
              <div className="mb-4">
                <label className="text-sm font-medium text-muted-foreground mb-2 block">Generation Mode</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedMode('exact_insert')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedMode === 'exact_insert'
                        ? 'bg-blue-500/5 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 dark:border-blue-500/20 shadow-lg shadow-blue-500/10'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                    }`}
                    data-testid="mode-exact-insert"
                  >
                    <Wand2 className="w-4 h-4" />
                    <span>Exact Insert</span>
                  </button>
                  <button
                    onClick={() => setSelectedMode('inspiration')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                      selectedMode === 'inspiration'
                        ? 'bg-purple-500/5 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/30 dark:border-purple-500/20 shadow-lg shadow-purple-500/10'
                        : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
                    }`}
                    data-testid="mode-inspiration"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Inspiration</span>
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {selectedMode === 'exact_insert'
                    ? 'Product will be inserted into the exact template scene'
                    : "Create a unique scene inspired by the template's style and mood"}
                </p>
              </div>

              {/* Use Template Button */}
              <Button
                onClick={handleUseTemplate}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-use-template"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Use Template
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Template Library Component */}
      <TemplateLibrary onSelectTemplate={handleSelectTemplate} selectedTemplateId={selectedTemplate?.id} />
    </>
  );

  if (embedded) {
    return mainContent;
  }

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans overflow-hidden relative">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/5 dark:bg-blue-500/10 blur-[120px] rounded-full" />
      </div>

      <Header currentPage="templates" />

      <main className="container max-w-7xl mx-auto px-6 pt-24 pb-20 relative z-10">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Studio
            </Button>
          </Link>
        </div>

        {mainContent}
      </main>
    </div>
  );
}
