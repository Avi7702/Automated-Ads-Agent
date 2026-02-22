// @ts-nocheck
/**
 * Studio - Unified creative workspace
 *
 * Includes three workspace modes:
 * - Agent Mode: full-screen assistant
 * - Studio Mode: composer-first with inline assistant
 * - Split View: assistant + composer side by side
 */

import { AnimatePresence, motion } from 'framer-motion';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { cn } from '@/lib/utils';

import { Header } from '@/components/layout/Header';
import { StudioProvider } from '@/context/StudioContext';
import { ComposerView, ResultViewEnhanced, GeneratingView } from '@/components/studio/MainCanvas';
import { InspectorPanel } from '@/components/studio/InspectorPanel';
import { IdeaBankBar } from '@/components/studio/IdeaBankBar';
import { HistoryPanel } from '@/components/studio/HistoryPanel';
import { AgentChatPanel } from '@/components/studio/AgentChat';
import { AgentModePanel } from '@/components/studio/AgentMode';
import { SaveToCatalogDialog } from '@/components/SaveToCatalogDialog';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Sparkles, History, TrendingUp, Star, Layout, X } from 'lucide-react';

import { useStudioOrchestrator } from '@/hooks/useStudioOrchestrator';
import type { ShortcutConfig } from '@/hooks/useKeyboardShortcuts';
import type { Product } from '@shared/schema';
import type { IdeaBankContextSnapshot } from '@/components/ideabank/types';

type WorkspaceMode = 'agent' | 'studio' | 'split';
type IdeaBankBridgeState = 'idle' | 'waiting' | 'ready' | 'error' | 'sent';

function ContextBar({
  selectedProducts,
  selectedTemplate,
  platform,
  visible,
}: {
  selectedProducts: Product[];
  selectedTemplate: { title: string } | null;
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
  shortcuts: ShortcutConfig[];
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

export default function Studio() {
  const orch = useStudioOrchestrator();

  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => {
    if (typeof window === 'undefined') return 'split';
    const stored = window.localStorage.getItem('studio-workspace-mode');
    if (stored === 'agent' || stored === 'studio' || stored === 'split') return stored;
    return window.innerWidth >= 1280 ? 'split' : 'studio';
  });

  const [ideaBankContext, setIdeaBankContext] = useState<IdeaBankContextSnapshot | null>(null);
  const [ideaBankBridgeState, setIdeaBankBridgeState] = useState<IdeaBankBridgeState>('idle');
  const [agentExternalMessage, setAgentExternalMessage] = useState<{ id: string; text: string } | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('studio-workspace-mode', workspaceMode);
  }, [workspaceMode]);

  const buildIdeaBankAgentMessage = useCallback((context: IdeaBankContextSnapshot) => {
    const ideas = context.suggestions.slice(0, 5);
    const lines = [
      `I have ${context.suggestionCount} idea bank suggestion(s). Help me choose and plan execution.`,
      '',
      'Idea Bank results:',
      ...ideas.map(
        (idea, index) => `${index + 1}. ${idea.summary || idea.prompt}${idea.prompt ? `\nPrompt: ${idea.prompt}` : ''}`,
      ),
      '',
      'Please return:',
      '1) Best idea for today',
      '2) 7-day post plan aligned to brand voice',
      '3) Recommended prompts for generation',
    ];
    return lines.join('\n').trim();
  }, []);

  const queueIdeaBankMessageToAgent = useCallback(
    (context: IdeaBankContextSnapshot) => {
      if (!context || context.suggestionCount <= 0) return false;

      setAgentExternalMessage({
        id: `idea-bank-${Date.now()}`,
        text: buildIdeaBankAgentMessage(context),
      });
      setIdeaBankBridgeState('sent');
      setWorkspaceMode('split');
      return true;
    },
    [buildIdeaBankAgentMessage],
  );

  const handleIdeaBankContextChange = useCallback((context: IdeaBankContextSnapshot) => {
    setIdeaBankContext(context);

    if (context.status === 'error') {
      setIdeaBankBridgeState((prev) => (prev === 'sent' ? 'sent' : 'error'));
      return;
    }
    if (context.status === 'ready') {
      setIdeaBankBridgeState((prev) => (prev === 'sent' ? 'sent' : 'ready'));
      return;
    }
    if (context.status === 'loading') {
      setIdeaBankBridgeState((prev) => (prev === 'waiting' ? 'waiting' : 'idle'));
      return;
    }
    setIdeaBankBridgeState((prev) => (prev === 'sent' ? 'sent' : 'idle'));
  }, []);

  useEffect(() => {
    if (ideaBankBridgeState !== 'waiting' || !ideaBankContext) return;

    if (ideaBankContext.status === 'ready') {
      if (ideaBankContext.suggestionCount > 0) {
        queueIdeaBankMessageToAgent(ideaBankContext);
      } else {
        setIdeaBankBridgeState('idle');
      }
      return;
    }
    if (ideaBankContext.status === 'error') {
      setIdeaBankBridgeState('error');
    }
  }, [ideaBankBridgeState, ideaBankContext, queueIdeaBankMessageToAgent]);

  const handleSendIdeasToAgent = useCallback(() => {
    if (!ideaBankContext) {
      setIdeaBankBridgeState('waiting');
      return;
    }

    if (ideaBankContext.status === 'loading') {
      setIdeaBankBridgeState('waiting');
      return;
    }

    if (ideaBankContext.status === 'error') {
      setIdeaBankBridgeState('error');
      return;
    }

    if (ideaBankContext.status === 'ready' && ideaBankContext.suggestionCount > 0) {
      queueIdeaBankMessageToAgent(ideaBankContext);
      return;
    }

    setIdeaBankBridgeState('idle');
  }, [ideaBankContext, queueIdeaBankMessageToAgent]);

  const handleExternalMessageConsumed = useCallback((id: string) => {
    setAgentExternalMessage((prev) => (prev?.id === id ? null : prev));
  }, []);

  const workspaceHeadline = useMemo(() => {
    if (workspaceMode === 'agent') return 'Plan, ask, and execute with the assistant';
    if (workspaceMode === 'split') return 'Plan with the assistant while composing visuals';
    return 'Create stunning product visuals';
  }, [workspaceMode]);

  const workspaceSubheading = useMemo(() => {
    if (workspaceMode === 'agent') {
      return 'Use one focused chat workspace for strategy, content planning, and generation commands.';
    }
    if (workspaceMode === 'split') {
      return 'Agent and composer side-by-side: pick products, review Idea Bank, edit prompts, and generate faster.';
    }
    return 'Chat with the assistant, add products and references, and generate professional marketing visuals in minutes.';
  }, [workspaceMode]);

  const renderStudioCanvas = () => (
    <>
      <div
        className={cn(
          'lg:grid lg:gap-8',
          orch.historyPanelOpen ? 'lg:grid-cols-[1fr_400px_320px]' : 'lg:grid-cols-[1fr_400px]',
        )}
      >
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            {orch.state === 'idle' && (
              <ComposerView
                key="composer"
                orch={orch}
                ideaBankContext={ideaBankContext}
                ideaBankBridgeState={ideaBankBridgeState}
                onIdeaBankContextChange={handleIdeaBankContextChange}
                onSendIdeasToAgent={handleSendIdeasToAgent}
              />
            )}
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

        <div className="hidden lg:block min-w-0">
          <div className="sticky top-24 max-h-[calc(100vh-120px)] rounded-2xl border border-border bg-card/30 overflow-hidden">
            <InspectorPanel orch={orch} />
          </div>
        </div>

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

      <div className="mt-6 hidden lg:block">
        <IdeaBankBar orch={orch} />
      </div>
    </>
  );

  return (
    <StudioProvider>
      <div className="min-h-screen bg-background text-foreground relative">
        <div className="fixed inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-primary/10 via-purple-500/8 to-transparent blur-[120px] rounded-full animate-float" />
          <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-blue-500/10 via-cyan-500/8 to-transparent blur-[120px] rounded-full animate-float-delayed" />
        </div>

        <Header currentPage="studio" />

        <AnimatePresence>
          <ContextBar
            selectedProducts={orch.selectedProducts}
            selectedTemplate={orch.selectedTemplate}
            platform={orch.platform}
            visible={orch.showContextBar}
          />
        </AnimatePresence>

        <main
          className={cn(
            'container mx-auto px-6 pt-24 pb-24 lg:pb-12 relative z-10',
            orch.historyPanelOpen ? 'max-w-[1600px]' : 'max-w-7xl',
          )}
        >
          <motion.div
            ref={orch.heroRef}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 py-8"
          >
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight bg-gradient-to-b from-zinc-900 to-zinc-900/60 dark:from-white dark:to-white/60 bg-clip-text text-transparent">
              {workspaceHeadline}
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{workspaceSubheading}</p>

            <div className="flex justify-center pt-1">
              <div className="inline-flex rounded-xl border border-border bg-card/40 p-1">
                <Button
                  variant={workspaceMode === 'agent' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setWorkspaceMode('agent')}
                >
                  Agent Mode
                </Button>
                <Button
                  variant={workspaceMode === 'studio' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setWorkspaceMode('studio')}
                >
                  Studio Mode
                </Button>
                <Button
                  variant={workspaceMode === 'split' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setWorkspaceMode('split')}
                >
                  Split View
                </Button>
              </div>
            </div>

            <div className="flex justify-center gap-3 pt-2">
              <Button variant="outline" size="sm" onClick={orch.handleHistoryToggle} className="gap-2">
                <History className="w-4 h-4" />
                {orch.historyPanelOpen ? 'Hide History' : 'History'}
              </Button>
            </div>
          </motion.div>

          {workspaceMode === 'agent' && (
            <div className="mx-auto max-w-5xl grid gap-6 xl:grid-cols-[1fr_380px]">
              <div className="min-w-0">
                <AgentModePanel orch={orch} />
              </div>
              <div className="min-w-0 hidden xl:block">
                <div className="xl:sticky xl:top-24">
                  <AgentChatPanel
                    orch={orch}
                    title="Ad Assistant"
                    forceExpanded
                    showCollapseToggle={false}
                    bodyMaxHeightClassName="max-h-[calc(100vh-320px)]"
                    ideaBankContext={ideaBankContext}
                    ideaBankBridgeState={ideaBankBridgeState}
                    externalMessage={agentExternalMessage}
                    onExternalMessageConsumed={handleExternalMessageConsumed}
                  />
                </div>
              </div>
            </div>
          )}

          {workspaceMode === 'studio' && (
            <>
              <AgentChatPanel
                orch={orch}
                title="Studio Assistant"
                ideaBankContext={ideaBankContext}
                ideaBankBridgeState={ideaBankBridgeState}
                externalMessage={agentExternalMessage}
                onExternalMessageConsumed={handleExternalMessageConsumed}
              />
              {renderStudioCanvas()}
            </>
          )}

          {workspaceMode === 'split' && (
            <div className="grid gap-6 xl:grid-cols-[minmax(320px,420px)_1fr]">
              <div className="min-w-0">
                <div className="xl:sticky xl:top-24">
                  <AgentChatPanel
                    orch={orch}
                    title="Ad Assistant"
                    forceExpanded
                    showCollapseToggle={false}
                    bodyMaxHeightClassName="max-h-[calc(100vh-280px)]"
                    ideaBankContext={ideaBankContext}
                    ideaBankBridgeState={ideaBankBridgeState}
                    externalMessage={agentExternalMessage}
                    onExternalMessageConsumed={handleExternalMessageConsumed}
                  />
                </div>
              </div>
              <div className="min-w-0">{renderStudioCanvas()}</div>
            </div>
          )}
        </main>

        {orch.generatedImage && (
          <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-md border-t max-h-[60vh] overflow-y-auto">
            <InspectorPanel orch={orch} />
          </div>
        )}

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

        <Dialog open={orch.showTemplateInspiration} onOpenChange={orch.setShowTemplateInspiration}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" /> Template Inspiration
              </DialogTitle>
              <DialogDescription>Browse high-performing ad references for creative direction</DialogDescription>
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
