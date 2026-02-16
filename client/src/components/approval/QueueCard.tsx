import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PriorityBadge } from "./PriorityBadge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Eye,
  Trash2,
  Clock,
  ImageIcon,
  TrendingUp,
  Linkedin,
  Facebook,
  Instagram,
  Twitter
} from "lucide-react";
import { motion } from "framer-motion";

interface QueueCardProps {
  item: {
    id: string;
    status: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    aiConfidenceScore?: number;
    scheduledFor?: string;
    createdAt: string;
    adCopy?: {
      caption: string;
      platform: string;
    };
    generation?: {
      generatedImagePath: string;
    };
  };
  onReview: () => void;
  onQuickApprove: () => void;
  onDelete: () => void;
  isSelected?: boolean;
  onSelect?: (selected: boolean) => void;
  index?: number;
}

const platformIcons = {
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
};

export function QueueCard({
  item,
  onReview,
  onQuickApprove,
  onDelete,
  isSelected = false,
  onSelect,
  index = 0
}: QueueCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const caption = item.adCopy?.caption || 'No caption available';
  const truncatedCaption = caption.length > 80 ? caption.substring(0, 80) + '...' : caption;
  const platform = item.adCopy?.platform || 'unknown';
  const PlatformIcon = platformIcons[platform as keyof typeof platformIcons];

  const confidenceScore = item.aiConfidenceScore || 0;
  const scheduledDate = item.scheduledFor ? new Date(item.scheduledFor) : null;
  const isScheduledSoon = scheduledDate && (scheduledDate.getTime() - Date.now()) < 3 * 60 * 60 * 1000; // 3 hours

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Card className={cn(
        "transition-all hover:shadow-md",
        isSelected && "ring-2 ring-primary"
      )}>
        <CardContent className="p-4">
          <div className="flex gap-3">
            {/* Checkbox */}
            {onSelect && (
              <div className="flex items-start pt-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={(e) => onSelect(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
              </div>
            )}

            {/* Thumbnail */}
            <div className="flex-shrink-0">
              {item.generation?.generatedImagePath ? (
                <img
                  src={item.generation.generatedImagePath}
                  alt="Preview"
                  className="w-20 h-20 rounded-lg object-cover border"
                />
              ) : (
                <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center border">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Header with priority and platform */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <PriorityBadge priority={item.priority} />
                  {PlatformIcon && (
                    <Badge variant="outline" className="gap-1">
                      <PlatformIcon className="w-3 h-3" />
                      {platform}
                    </Badge>
                  )}
                </div>

                {/* Confidence Score */}
                {confidenceScore > 0 && (
                  <div className="flex items-center gap-1 text-xs">
                    <TrendingUp className={cn("w-3 h-3", getConfidenceColor(confidenceScore))} />
                    <span className={cn("font-medium", getConfidenceColor(confidenceScore))}>
                      {confidenceScore}%
                    </span>
                  </div>
                )}
              </div>

              {/* Caption snippet */}
              <p className="text-sm text-foreground line-clamp-2">
                {truncatedCaption}
              </p>

              {/* Scheduled time (if urgent) */}
              {scheduledDate && isScheduledSoon && (
                <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                  <Clock className="w-3 h-3" />
                  <span>
                    Scheduled: {scheduledDate.toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={onQuickApprove}
                  size="sm"
                  variant="default"
                  className="flex-1 bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Quick Approve
                </Button>
                <Button
                  onClick={onReview}
                  size="sm"
                  variant="outline"
                  className="flex-1"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  Review
                </Button>
                {isHovered && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Button
                      onClick={onDelete}
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
