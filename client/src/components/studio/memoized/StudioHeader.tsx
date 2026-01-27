import React, { memo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { History } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StudioHeaderProps {
  historyPanelOpen: boolean;
  onHistoryToggle: () => void;
}

/**
 * StudioHeader - Hero section with title and quick actions
 *
 * Memoized to prevent re-renders when:
 * - Other Studio state changes (products, templates, etc.)
 * - Generation state changes
 * - Prompt changes
 *
 * Only re-renders when:
 * - historyPanelOpen changes
 * - onHistoryToggle reference changes (use useCallback in parent)
 */
function StudioHeaderComponent({
  historyPanelOpen,
  onHistoryToggle,
}: StudioHeaderProps) {
  return (
    <motion.div
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
      {/* Quick Actions */}
      <div className="flex justify-center gap-3 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onHistoryToggle}
          className="gap-2"
        >
          <History className="w-4 h-4" />
          {historyPanelOpen ? 'Hide History' : 'History'}
        </Button>
      </div>
    </motion.div>
  );
}

export const StudioHeader = memo(StudioHeaderComponent);

// For debugging re-renders in development
StudioHeader.displayName = 'StudioHeader';
