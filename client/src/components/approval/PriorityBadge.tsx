import { cn } from "@/lib/utils";
import { AlertCircle, Flame, TrendingUp, Minus } from "lucide-react";

interface PriorityBadgeProps {
  priority: 'urgent' | 'high' | 'medium' | 'low';
  className?: string;
}

const priorityConfig = {
  urgent: {
    label: 'Urgent',
    icon: Flame,
    className: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800'
  },
  high: {
    label: 'High',
    icon: AlertCircle,
    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800'
  },
  medium: {
    label: 'Medium',
    icon: TrendingUp,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800'
  },
  low: {
    label: 'Low',
    icon: Minus,
    className: 'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800/20 dark:text-gray-400 dark:border-gray-700'
  }
};

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = priorityConfig[priority];
  const Icon = config.icon;

  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border",
      config.className,
      className
    )}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}
