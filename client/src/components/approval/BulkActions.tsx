import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BulkActionsProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkApprove: () => void;
  onBulkReject: () => void;
  isProcessing?: boolean;
}

export function BulkActions({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkApprove,
  onBulkReject,
  isProcessing = false
}: BulkActionsProps) {
  const allSelected = selectedCount === totalCount && totalCount > 0;

  return (
    <AnimatePresence>
      {selectedCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="sticky top-0 z-10 bg-primary/10 dark:bg-primary/20 border border-primary/30 rounded-lg p-4 mb-4 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between gap-4">
            {/* Selection info */}
            <div className="flex items-center gap-3">
              <button
                onClick={onDeselectAll}
                className="p-1 rounded hover:bg-primary/20 transition-colors"
                aria-label="Deselect all"
              >
                <X className="w-4 h-4 text-foreground" />
              </button>

              <span className="text-sm font-medium text-foreground">
                {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
              </span>

              {!allSelected && (
                <Button
                  onClick={onSelectAll}
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                >
                  Select all {totalCount}
                </Button>
              )}
            </div>

            {/* Bulk actions */}
            <div className="flex items-center gap-2">
              <Button
                onClick={onBulkApprove}
                size="sm"
                variant="default"
                disabled={isProcessing}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Approve Selected ({selectedCount})
              </Button>

              <Button
                onClick={onBulkReject}
                size="sm"
                variant="outline"
                disabled={isProcessing}
                className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <XCircle className="w-3 h-3 mr-1" />
                Reject Selected ({selectedCount})
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
