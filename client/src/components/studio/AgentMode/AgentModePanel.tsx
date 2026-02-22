// @ts-nocheck
/**
 * AgentModePanel — Orchestrates the full Agent Mode flow.
 *
 * Renders the appropriate sub-component based on the current stage:
 *   idle        → empty prompt to select products
 *   suggestions → SuggestionCards grid
 *   questions   → ClarifyingQuestions form
 *   preview     → PlanBriefCard with approval score
 *   executing   → ExecutionView step list
 *   complete    → ExecutionView (done state)
 *
 * Receives `orch` prop (StudioOrchestrator) for product selection context.
 * Does NOT modify Studio.tsx — that integration is handled elsewhere.
 */

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAgentPlan } from '@/hooks/useAgentPlan';
import { SuggestionCards } from './SuggestionCards';
import { ClarifyingQuestions } from './ClarifyingQuestions';
import { PlanBriefCard } from './PlanBriefCard';
import { ExecutionView } from './ExecutionView';

interface AgentModePanelProps {
  /** The studio orchestrator, provides selectedProducts and other state */
  orch: {
    selectedProducts: { id: number; name: string }[];
    products: { id: number; name: string }[];
  };
}

export function AgentModePanel({ orch }: AgentModePanelProps) {
  const agent = useAgentPlan();
  const prevProductIds = useRef<string>('');

  // Auto-fetch suggestions when selected products change
  useEffect(() => {
    const ids = orch.selectedProducts
      .map((p) => p.id)
      .sort()
      .join(',');
    if (ids === prevProductIds.current) return;
    prevProductIds.current = ids;

    if (orch.selectedProducts.length > 0 && agent.stage === 'idle') {
      agent.fetchSuggestions(orch.selectedProducts.map((p) => p.id));
    }
  }, [orch.selectedProducts]);

  // ── Render based on stage ─────────────────────────────
  return (
    <div className="flex flex-col h-full">
      {/* Error banner */}
      {agent.error && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mx-4 mt-2 flex items-center gap-2 rounded-md border border-red-200 bg-red-50/80 dark:border-red-800 dark:bg-red-950/30 p-2.5 text-xs text-red-700 dark:text-red-300"
        >
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{agent.error}</span>
          <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => agent.reset()}>
            Dismiss
          </Button>
        </motion.div>
      )}

      {/* Main content area */}
      <div className="flex-1 overflow-y-auto p-4">
        <AnimatePresence mode="wait">
          {/* Idle — waiting for product selection */}
          {agent.stage === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center h-full min-h-[200px] text-center gap-3"
            >
              <Sparkles className="h-10 w-10 text-muted-foreground/40" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">Agent Mode</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {orch.selectedProducts.length === 0
                    ? 'Select products from the sidebar to get AI-powered content suggestions'
                    : 'Analyzing your products...'}
                </p>
              </div>
              {orch.selectedProducts.length > 0 && (
                <Button size="sm" onClick={() => agent.fetchSuggestions(orch.selectedProducts.map((p) => p.id))}>
                  Get Suggestions
                </Button>
              )}
            </motion.div>
          )}

          {/* Suggestions grid */}
          {agent.stage === 'suggestions' && (
            <motion.div key="suggestions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="mb-3">
                <p className="text-xs text-muted-foreground">Step 1 of 4 &mdash; Pick a suggestion</p>
                <h3 className="text-sm font-semibold mt-0.5">Content suggestions</h3>
              </div>
              <SuggestionCards
                suggestions={agent.suggestions}
                isLoading={agent.isLoading}
                onSelect={agent.selectSuggestion}
                hasProducts={orch.selectedProducts.length > 0}
              />
            </motion.div>
          )}

          {/* Clarifying questions */}
          {agent.stage === 'questions' && (
            <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ClarifyingQuestions
                questions={agent.questions}
                answers={agent.answers}
                onAnswer={agent.answerQuestion}
                onBack={() => {
                  // Go back to suggestions stage
                  agent.reset();
                  agent.fetchSuggestions(orch.selectedProducts.map((p) => p.id));
                }}
                onContinue={agent.submitAnswers}
                isLoading={agent.isLoading}
                suggestionTitle={agent.selectedSuggestion?.title}
              />
            </motion.div>
          )}

          {/* Plan preview */}
          {agent.stage === 'preview' && agent.planBrief && (
            <motion.div key="preview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlanBriefCard
                plan={agent.planBrief}
                onApprove={agent.approvePlan}
                onRevise={agent.revisePlan}
                onCancel={agent.reset}
                isLoading={agent.isLoading}
              />
            </motion.div>
          )}

          {/* Executing / Complete */}
          {(agent.stage === 'executing' || agent.stage === 'complete') && (
            <motion.div key="executing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ExecutionView
                steps={agent.executionSteps}
                isComplete={agent.stage === 'complete'}
                onRetry={agent.approvePlan}
                onDone={agent.reset}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
