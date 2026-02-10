// @ts-nocheck
/**
 * PostStatusBadge -- Color-coded status indicator with micro-icons.
 *
 * Variants:
 *   - default  : standard inline badge used in sheets / cards
 *   - tiny     : compact version for calendar cell mini-cards (no label text)
 *
 * Fully dark-mode aware via Tailwind `dark:` variants.
 */

import { Clock, Check, AlertTriangle, Loader2, X, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type PostStatus = 'draft' | 'scheduled' | 'publishing' | 'published' | 'failed' | 'cancelled';

interface StatusConfig {
  label: string;
  icon: React.ElementType;
  className: string;
  iconClassName?: string;
}

const STATUS_CONFIG: Record<PostStatus, StatusConfig> = {
  draft: {
    label: 'Draft',
    icon: FileText,
    className: 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700',
  },
  scheduled: {
    label: 'Scheduled',
    icon: Clock,
    className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800',
  },
  publishing: {
    label: 'Publishing',
    icon: Loader2,
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-400 dark:border-amber-800',
    iconClassName: 'animate-spin',
  },
  published: {
    label: 'Published',
    icon: Check,
    className:
      'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800',
  },
  failed: {
    label: 'Failed',
    icon: AlertTriangle,
    className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800',
  },
  cancelled: {
    label: 'Cancelled',
    icon: X,
    className: 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-900 dark:text-gray-500 dark:border-gray-700',
  },
};

interface PostStatusBadgeProps {
  status: string;
  size?: 'default' | 'tiny';
  className?: string;
}

export function PostStatusBadge({ status, size = 'default', className }: PostStatusBadgeProps) {
  const config = STATUS_CONFIG[status as PostStatus] ?? STATUS_CONFIG.draft;
  const Icon = config.icon;
  const isTiny = size === 'tiny';

  if (isTiny) {
    return (
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full border transition-colors duration-150',
          'h-4 w-4',
          config.className,
          className,
        )}
        title={config.label}
      >
        <Icon className={cn('h-2.5 w-2.5', config.iconClassName)} />
      </span>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        'text-[10px] leading-none px-1.5 py-0.5 gap-1 font-medium transition-colors duration-150',
        config.className,
        className,
      )}
    >
      <Icon className={cn('h-3 w-3 shrink-0', config.iconClassName)} />
      {config.label}
    </Badge>
  );
}
