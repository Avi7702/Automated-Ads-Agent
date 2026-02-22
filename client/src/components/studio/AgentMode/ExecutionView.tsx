// @ts-nocheck
/**
 * ExecutionView — Step-by-step execution progress display.
 *
 * Shows each step with status indicator:
 *  pending  → grey circle
 *  running  → animated spinner
 *  complete → green checkmark
 *  failed   → red X with retry option
 *
 * Overall progress bar at top.
 */

import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, Loader2, Circle, RefreshCcw, StopCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { ExecutionStep } from '@shared/types/agentPlan';

interface ExecutionViewProps {
  steps: ExecutionStep[];
  isComplete: boolean;
  onRetry?: () => void;
  onCancel?: () => void;
  onDone?: () => void;
}

const STATUS_ICON = {
  pending: Circle,
  running: Loader2,
  complete: CheckCircle2,
  failed: XCircle,
};

const STATUS_COLOR = {
  pending: 'text-muted-foreground',
  running: 'text-blue-500',
  complete: 'text-emerald-500',
  failed: 'text-red-500',
};

export function ExecutionView({ steps, isComplete, onRetry, onCancel, onDone }: ExecutionViewProps) {
  const completedCount = steps.filter((s) => s.status === 'complete').length;
  const failedCount = steps.filter((s) => s.status === 'failed').length;
  const runningCount = steps.filter((s) => s.status === 'running').length;
  const total = steps.length;
  const progressValue = total > 0 ? (completedCount / total) * 100 : 0;
  const isQueued = total > 0 && steps.every((s) => s.status === 'pending') && !isComplete;
  const hasFailed = failedCount > 0;
  const isRunning = runningCount > 0 || (!isComplete && !hasFailed && !isQueued && completedCount < total);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      {/* Header */}
      <div>
        <p className="text-xs text-muted-foreground">
          Step 4 of 4 &mdash; {isComplete ? 'Execution complete' : isQueued ? 'Preparing execution' : 'Executing plan'}
        </p>
        <p className="text-sm font-medium mt-0.5">
          {isQueued
            ? 'Preparing execution...'
            : isComplete
              ? failedCount > 0
                ? `Completed with ${failedCount} error${failedCount > 1 ? 's' : ''}`
                : 'All steps completed successfully'
              : `Running step ${completedCount + 1} of ${total}...`}
        </p>
      </div>

      {/* Queued spinner */}
      {isQueued && (
        <div className="flex items-center gap-3 py-4 justify-center">
          <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
          <span className="text-sm text-muted-foreground">Preparing execution...</span>
        </div>
      )}

      {/* Overall progress */}
      <div className="space-y-1">
        <Progress value={progressValue} className="h-2" />
        <p className="text-[11px] text-muted-foreground text-right tabular-nums">
          {completedCount}/{total} complete
        </p>
      </div>

      {/* Action buttons: Cancel (running) / Retry (failed) */}
      {(isRunning || (hasFailed && !isComplete)) && (
        <div className="flex items-center gap-2">
          {isRunning && onCancel && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-red-300 text-red-600 hover:bg-red-50"
              onClick={onCancel}
            >
              <StopCircle className="h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
          {hasFailed && !isComplete && onRetry && (
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-blue-500 text-white hover:bg-blue-600"
              onClick={onRetry}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Retry Failed Steps
            </Button>
          )}
        </div>
      )}

      {/* Step list */}
      <div className="space-y-1">
        {steps.map((step, idx) => {
          const Icon = STATUS_ICON[step.status];
          const colorClass = STATUS_COLOR[step.status];

          return (
            <motion.div
              key={step.index}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.04, duration: 0.15 }}
              className={cn(
                'flex items-center gap-3 p-2.5 rounded-md text-sm',
                step.status === 'running' && 'bg-blue-50/50 dark:bg-blue-950/20',
                step.status === 'failed' && 'bg-red-50/50 dark:bg-red-950/20',
                step.status === 'complete' && 'opacity-80',
              )}
            >
              <Icon className={cn('h-4.5 w-4.5 shrink-0', colorClass, step.status === 'running' && 'animate-spin')} />
              <span className={cn('flex-1', step.status === 'complete' && 'line-through')}>{step.action}</span>
              {step.status === 'failed' && onRetry && (
                <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onRetry}>
                  <RefreshCcw className="h-3 w-3" />
                  Retry
                </Button>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Done button */}
      {isComplete && onDone && (
        <div className="flex justify-end pt-2">
          <Button onClick={onDone}>{failedCount > 0 ? 'Close' : 'Done'}</Button>
        </div>
      )}
    </motion.div>
  );
}
