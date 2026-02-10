// @ts-nocheck
/**
 * Studio — Unified creative workspace
 *
 * Thin orchestrator (~250 lines) that delegates to:
 * - useStudioOrchestrator: all state + handlers
 * - ComposerView: idle state (prompt, products, templates, generate)
 * - GeneratingView: loading animation
 * - ResultViewEnhanced: result state (image, actions, edit, copy)
 * - HistoryPanel: right-side generation history
 * - SaveToCatalogDialog / TemplateInspirationDialog: modal overlays
 *
 * Previously 2,963 lines. Decomposed in Phase 2 of Unified Studio redesign.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

// Components
import { Header } from '@/components/layout/Header';
import { StudioProvider } from '@/context/StudioContext';
import { ComposerView, ResultViewEnhanced, GeneratingView } from '@/components/studio/MainCanvas';
import { InspectorPanel } from '@/components/studio/InspectorPanel';
import { IdeaBankBar } from '@/components/studio/IdeaBankBar';
import { HistoryPanel } from '@/components/studio/HistoryPanel';
import { SaveToCatalogDialog } from '@/components/SaveToCatalogDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, History, TrendingUp, Star, Layout, X } from 'lucide-react';

// Hooks
import { useStudioOrchestrator } from '@/hooks/useStudioOrchestrator';

// ─── Helper Components ──────────────────────────────────

function ContextBar({
  selectedProducts,
  selectedTemplate,
  platform,
  visible,
}: {
  selectedProducts: any[];
  selectedTemplate: any;
  platform: string;
  visible: boolean;
}) {
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 left-1/2 -translate-x-1/2 z-40 bg-background/90 backdrop-blur-md border border-border rounded-full px-4 py-2 flex items-center gap-3 shadow-lg"
    >
      <span className="text-xs text-muted-foreground">
        {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}
      </span>
      {selectedTemplate && <span className="text-xs text-primary">{selectedTemplate.title}</span>}
      <span className="text-xs text-muted-foreground">{platform}</span>
    </motion.div>
  );
}

function KeyboardShortcutsPanel({
  visible,
  shortcuts,
  onClose,
  onToggle,
  haptic,
}: {
  visible: boolean;
  shortcuts: any[];
  onClose: () => void;
  onToggle: () => void;
  haptic: (intensity: string) => void;
}) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="glass rounded-xl shadow-lg p-5 w-80"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Keyboard Shortcuts
            </h3>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="space-y-2">
            {shortcuts.map((s, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-center justify-between text-xs py-2 px-2.5 rounded-lg',
                  s.disabled ? 'opacity-40' : 'hover:bg-muted/50',
                )}
              >
                <span>{s.description}</span>
                <div className="flex gap-1">
                  {s.ctrlKey && <kbd className="px-2 py-1 text-[10px] rounded bg-muted border font-mono">Ctrl</kbd>}
                  {s.shiftKey && <kbd className="px-2 py-1 text-[10px] rounded bg-muted border font-mono">Shift</kbd>}
                  <kbd className="px-2 py-1 text-[10px] rounded bg-muted border font-mono">{s.key.toUpperCase()}</kbd>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            haptic('light');
            onToggle();
          }}
          className={cn(
            'glass h-11 w-11 rounded-full p-0 flex items-center justify-center',
            visible && 'ring-2 ring-primary/30',
          )}
          title="Keyboard Shortcuts (Shift + ?)"
        >
          <span className="text-base font-semibold">?</span>
        </Button>
      </motion.div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────

export default function Studio() {
  const orch = useStudioOrchestrator();

  return (
    <StudioProvider>
      <div className="min-h-screen bg-background text-foreground relative">
        {/* Background Ambience */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-primary/10 via-purple-500/8 to-transparent blur-[120px] rounded-full animate-float" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-blue-500/10 via-cyan-500/8 to-transparent blur-[120px] rounded-full animate-float-delayed" />
        </div>

        <Header currentPage="studio" />

        {/* Context Bar */}
        <AnimatePresence>
          <ContextBar
            selectedProducts={orch.selectedProducts}
            selectedTemplate={orch.selectedTemplate}
            platform={orch.platform}
            visible={orch.showContextBar}
          />
        </AnimatePresence>

        {/* Main Content */}
        <main
          className={cn(
            'container mx-auto px-6 pt-24 pb-24 lg:pb-12 relative z-10',
            orch.historyPanelOpen ? 'max-w-[1600px]' : 'max-w-7xl',
          )}
        >
          {/* Hero */}
          <motion.div
            ref={orch.heroRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 py-8"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-zinc-900 to-zinc-900/60 dark:from-white dark:to-white/60 bg-clip-text text-transparent">
              Create stunning product visuals
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Select products, describe your vision, and generate professional marketing content in minutes.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={orch.handleHistoryToggle} className="gap-2">
                <History className="w-4 h-4" />
                {orch.historyPanelOpen ? 'Hide History' : 'History'}
              </Button>
            </div>
          </motion.div>

          {/* Grid: Center + Right + History */}
          <div
            className={cn(
              'lg:grid lg:gap-8',
              orch.historyPanelOpen ? 'lg:grid-cols-[1fr_400px_320px]' : 'lg:grid-cols-[1fr_400px]',
            )}
          >
            {/* Center Column — State Machine */}
            <div className="min-w-0">
              <AnimatePresence mode="wait">
                {orch.state === 'idle' && <ComposerView key="composer" orch={orch} />}
                {orch.state === 'generating' && (
                  <GeneratingView
                    key="generating"
                    onCancel={orch.handleCancelGeneration}
                    mediaType={orch.generatedMediaType}
                  />
                )}
                {orch.state === 'result' && <ResultViewEnhanced key="result" orch={orch} />}
              </AnimatePresence>
            </div>

            {/* Right Column — Inspector Panel (desktop) */}
            <div className="hidden lg:block min-w-0">
              <div className="sticky top-24 max-h-[calc(100vh-120px)] rounded-2xl border border-border bg-card/30 overflow-hidden">
                <InspectorPanel orch={orch} />
              </div>
            </div>

            {/* History Panel */}
            <HistoryPanel
              isOpen={orch.historyPanelOpen}
              onToggle={orch.handleHistoryToggle}
              onSelectGeneration={(id) => {
                orch.selectGeneration(id);
                fetch(`/api/generations/${id}`, { credentials: 'include' })
                  .then((r) => r.json())
                  .then((data) => {
                    if (data.imageUrl) orch.handleLoadFromHistory(data);
                  })
                  .catch(console.error);
              }}
              className="hidden lg:flex"
            />
          </div>

          {/* Idea Bank Bar — Horizontal suggestions */}
          <div className="mt-6 hidden lg:block">
            <IdeaBankBar orch={orch} />
          </div>
        </main>

        {/* Mobile Inspector — Bottom Sheet */}
        {orch.generatedImage && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t max-h-[60vh] overflow-y-auto">
            <InspectorPanel orch={orch} />
          </div>
        )}

        {/* Save to Catalog Dialog */}
        {orch.generatedImage && (
          <ErrorBoundary>
            <SaveToCatalogDialog
              isOpen={orch.showSaveToCatalog}
              onClose={() => orch.setShowSaveToCatalog(false)}
              imageUrl={orch.generatedImage}
              defaultName={`Generated - ${new Date().toLocaleDateString()}`}
            />
          </ErrorBoundary>
        )}

        {/* Template Inspiration Dialog */}
        <Dialog open={orch.showTemplateInspiration} onOpenChange={orch.setShowTemplateInspiration}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Template Inspiration
              </DialogTitle>
              <DialogDescription>Browse high-performing ad templates for creative direction</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto">
              {orch.isLoadingFeatured ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : orch.featuredAdTemplates.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  <p>No featured templates yet.</p>
                  <Link href="/templates">
                    <Button variant="link" className="mt-2">
                      Browse template library
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-1">
                  {orch.featuredAdTemplates.map((template) => (
                    <button
                      key={template.id}
                      onClick={() => orch.handleSelectPerformingTemplate(template)}
                      className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-colors text-left"
                    >
                      <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                        {template.previewImageUrl ? (
                          <img
                            src={template.previewImageUrl}
                            alt={template.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Layout className="w-10 h-10 text-muted-foreground/30" />
                          </div>
                        )}
                        {template.isFeatured && (
                          <Badge className="absolute top-2 left-2 bg-yellow-500/90 text-yellow-950 text-xs">
                            <Star className="w-3 h-3 mr-1 fill-current" /> Featured
                          </Badge>
                        )}
                      </div>
                      <div className="p-3 space-y-1">
                        <h4 className="font-medium text-sm line-clamp-1">{template.name}</h4>
                        <div className="flex flex-wrap gap-1">
                          {template.mood && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10">{template.mood}</span>
                          )}
                          {template.style && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10">{template.style}</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Keyboard Shortcuts */}
        <KeyboardShortcutsPanel
          visible={orch.showKeyboardShortcuts}
          shortcuts={orch.shortcuts}
          onClose={() => orch.setShowKeyboardShortcuts(false)}
          onToggle={() => orch.setShowKeyboardShortcuts(!orch.showKeyboardShortcuts)}
          haptic={orch.haptic}
        />
      </div>
    </StudioProvider>
  );
}
