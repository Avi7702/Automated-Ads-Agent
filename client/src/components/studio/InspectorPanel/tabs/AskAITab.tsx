// @ts-nocheck
/**
 * AskAITab — Chat with AI about the current generation
 *
 * Simple Q&A interface: ask a question, get an AI response.
 * Extracted from ResultViewEnhanced inline ask-ai section.
 */

import { memo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sparkles,
  Loader2,
  Send,
  Bot,
  Lightbulb,
} from "lucide-react";
import type { StudioOrchestrator } from "@/hooks/useStudioOrchestrator";

const QUICK_QUESTIONS = [
  "What makes this image effective?",
  "Suggest improvements",
  "What audience would this appeal to?",
  "Rate this for LinkedIn",
];

interface AskAITabProps {
  orch: StudioOrchestrator;
}

export const AskAITab = memo(function AskAITab({ orch }: AskAITabProps) {
  const hasResult = Boolean(orch.generatedImage);
  const responseRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (orch.askAIResponse && responseRef.current) {
      responseRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [orch.askAIResponse]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col h-full p-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        Ask AI
      </div>

      {!hasResult ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          Generate an image first, then ask AI questions about it.
        </p>
      ) : (
        <div className="flex flex-col gap-3 flex-1">
          {/* Quick question chips */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => {
                  orch.setAskAIQuestion(q);
                  // Auto-send
                  setTimeout(() => orch.handleAskAI(), 50);
                }}
                className="text-xs px-2.5 py-1.5 rounded-full border border-border hover:bg-muted/80 hover:border-primary/30 transition-colors"
              >
                <Lightbulb className="w-3 h-3 inline mr-1 opacity-60" />
                {q}
              </button>
            ))}
          </div>

          {/* Response area */}
          <AnimatePresence>
            {orch.askAIResponse && (
              <motion.div
                ref={responseRef}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="rounded-lg bg-muted/50 p-3 space-y-2"
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Bot className="w-3.5 h-3.5" />
                  AI Response
                </div>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                  {orch.askAIResponse}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input area (pinned to bottom) */}
          <div className="mt-auto pt-2 border-t border-border/50">
            <div className="flex gap-2">
              <Input
                value={orch.askAIQuestion}
                onChange={(e) => orch.setAskAIQuestion(e.target.value)}
                placeholder="Ask about this generation..."
                className="text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    orch.handleAskAI();
                  }
                }}
              />
              <Button
                onClick={orch.handleAskAI}
                disabled={!orch.askAIQuestion.trim() || orch.isAskingAI}
                size="icon"
                className="shrink-0"
              >
                {orch.isAskingAI ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
});
