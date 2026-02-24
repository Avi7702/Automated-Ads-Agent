/**
 * SuggestionCards — Grid of AI-generated content suggestions for Agent Mode.
 *
 * Shows a responsive grid of cards. Each card displays:
 * type badge, title, description, product names, platform, confidence bar.
 *
 * Clicking a card triggers the onSelect callback to advance the flow.
 */

import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Target, Layers, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import type { AgentSuggestion } from '@shared/types/agentPlan';

interface SuggestionCardsProps {
  suggestions: AgentSuggestion[];
  isLoading: boolean;
  onSelect: (suggestion: AgentSuggestion) => void;
  hasProducts: boolean;
}

const TYPE_CONFIG = {
  content_series: {
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    icon: Layers,
    label: 'Series',
  },
  single_post: {
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    icon: Sparkles,
    label: 'Post',
  },
  campaign: {
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
    icon: Target,
    label: 'Campaign',
  },
  gap_fill: {
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    icon: AlertTriangle,
    label: 'Gap Fill',
  },
};

function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? 'bg-emerald-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-muted">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{value}%</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Card key={i} className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-16 rounded-md" />
            <Skeleton className="h-5 w-12 rounded-md" />
          </div>
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <div className="flex gap-1.5">
            <Skeleton className="h-5 w-14 rounded-full" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full" />
        </Card>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Sparkles className="h-10 w-10 text-muted-foreground/50 mb-3" />
      <p className="text-sm font-medium text-muted-foreground">Select products to get personalized suggestions</p>
      <p className="text-xs text-muted-foreground/70 mt-1">
        The agent will analyze your catalog and recommend content ideas
      </p>
    </div>
  );
}

export function SuggestionCards({ suggestions, isLoading, onSelect, hasProducts }: SuggestionCardsProps) {
  if (isLoading) return <LoadingSkeleton />;
  if (!hasProducts || suggestions.length === 0) return <EmptyState />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <AnimatePresence mode="popLayout">
        {suggestions.map((suggestion, index) => {
          const config = TYPE_CONFIG[suggestion.type] ?? TYPE_CONFIG.single_post;
          const Icon = config.icon;

          return (
            <motion.div
              key={suggestion.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
            >
              <Card
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md hover:border-primary/30',
                  'active:scale-[0.98]',
                )}
                onClick={() => onSelect(suggestion)}
              >
                <CardContent className="p-4 space-y-2.5">
                  {/* Header: type badge + platform */}
                  <div className="flex items-center justify-between">
                    <Badge className={cn('gap-1 text-[11px]', config.color)} variant="secondary">
                      <Icon className="h-3 w-3" />
                      {config.label}
                    </Badge>
                    <Badge variant="outline" className="text-[11px]">
                      {suggestion.platform}
                    </Badge>
                  </div>

                  {/* Title */}
                  <h4 className="font-semibold text-sm leading-tight line-clamp-2">{suggestion.title}</h4>

                  {/* Description */}
                  <p className="text-xs text-muted-foreground line-clamp-2">{suggestion.description}</p>

                  {/* Product tags */}
                  {suggestion.products.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {suggestion.products.slice(0, 3).map((p) => (
                        <span
                          key={p.id}
                          className="inline-block text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground"
                        >
                          {p.name}
                        </span>
                      ))}
                      {suggestion.products.length > 3 && (
                        <span className="text-[10px] text-muted-foreground">
                          +{suggestion.products.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  {/* Confidence */}
                  <ConfidenceBar value={suggestion.confidence} />
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
