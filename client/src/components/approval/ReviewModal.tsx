import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PriorityBadge } from "./PriorityBadge";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  Pause,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Linkedin,
  Facebook,
  Instagram,
  Twitter,
  ImageIcon,
  Star
} from "lucide-react";

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: {
    id: string;
    status: string;
    priority: 'urgent' | 'high' | 'medium' | 'low';
    aiConfidenceScore?: number;
    aiRecommendation?: 'auto_approve' | 'manual_review' | 'auto_reject';
    aiReasoning?: string;
    safetyChecksPassed?: any;
    complianceFlags?: string[];
    scheduledFor?: string;
    adCopy?: {
      caption: string;
      headline?: string;
      hook?: string;
      cta?: string;
      platform: string;
      framework?: string;
      qualityScore?: any;
    };
    generation?: {
      generatedImagePath: string;
      prompt?: string;
      aspectRatio?: string;
    };
  };
  onApprove: (notes?: string) => void;
  onReject: (notes?: string) => void;
  onRequestRevision: (notes?: string) => void;
  isProcessing?: boolean;
}

const platformIcons = {
  linkedin: Linkedin,
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
};

export function ReviewModal({
  isOpen,
  onClose,
  item,
  onApprove,
  onReject,
  onRequestRevision,
  isProcessing = false
}: ReviewModalProps) {
  const [notes, setNotes] = useState("");

  const handleApprove = () => {
    onApprove(notes);
    setNotes("");
  };

  const handleReject = () => {
    onReject(notes);
    setNotes("");
  };

  const handleRevision = () => {
    onRequestRevision(notes);
    setNotes("");
  };

  const caption = item.adCopy?.caption || 'No caption available';
  const platform = item.adCopy?.platform || 'unknown';
  const PlatformIcon = platformIcons[platform as keyof typeof platformIcons];

  const confidenceScore = item.aiConfidenceScore || 0;
  const qualityScore = item.adCopy?.qualityScore?.overallScore || 0;

  const captionLength = caption.length;
  const maxLength = platform === 'twitter' ? 280 : platform === 'linkedin' ? 3000 : 2200;
  const lengthPercentage = (captionLength / maxLength) * 100;

  const safetyChecks = item.safetyChecksPassed || {};
  const allChecksPassed = Object.values(safetyChecks).every(v => v === true);

  const getConfidenceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-orange-600 dark:text-orange-400';
  };

  const renderStars = (score: number) => {
    const stars = Math.round((score / 100) * 5);
    return (
      <div className="flex gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={cn(
              "w-3 h-3",
              i < stars ? "fill-yellow-500 text-yellow-500" : "text-gray-300 dark:text-gray-600"
            )}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span>Review Content #{item.id.slice(0, 8)}</span>
            <PriorityBadge priority={item.priority} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Quality</div>
              <div className="flex items-center gap-2">
                <span className={cn("text-lg font-bold", getConfidenceColor(qualityScore))}>
                  {qualityScore}/100
                </span>
                {renderStars(qualityScore)}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Confidence</div>
              <div className="flex items-center gap-1">
                <TrendingUp className={cn("w-4 h-4", getConfidenceColor(confidenceScore))} />
                <span className={cn("text-lg font-bold", getConfidenceColor(confidenceScore))}>
                  {confidenceScore}%
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Character Count</div>
              <div className="flex items-center gap-1">
                <span className={cn(
                  "text-lg font-bold",
                  lengthPercentage > 95 ? "text-red-600" : lengthPercentage > 85 ? "text-yellow-600" : "text-green-600"
                )}>
                  {captionLength}/{maxLength}
                </span>
                {lengthPercentage <= 100 && <CheckCircle className="w-4 h-4 text-green-600" />}
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">Framework</div>
              <Badge variant="outline" className="text-sm">
                {item.adCopy?.framework?.toUpperCase() || 'N/A'}
              </Badge>
            </div>
          </div>

          {/* Visual Preview and Copy */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Image Preview */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Visual Preview</h3>
              {item.generation?.generatedImagePath ? (
                <div className="relative">
                  <img
                    src={item.generation.generatedImagePath}
                    alt="Content preview"
                    className="w-full rounded-lg border shadow-sm"
                  />
                  {item.generation.aspectRatio && (
                    <Badge className="absolute top-2 right-2" variant="secondary">
                      {item.generation.aspectRatio}
                    </Badge>
                  )}
                </div>
              ) : (
                <div className="aspect-square rounded-lg bg-muted flex items-center justify-center border">
                  <ImageIcon className="w-16 h-16 text-muted-foreground" />
                </div>
              )}
              {PlatformIcon && (
                <div className="flex items-center gap-2">
                  <PlatformIcon className="w-4 h-4" />
                  <span className="text-sm text-muted-foreground capitalize">{platform}</span>
                </div>
              )}
            </div>

            {/* Copy Text */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Copy Text</h3>
              <div className="p-4 rounded-lg bg-muted/30 border max-h-80 overflow-y-auto">
                <p className="text-sm whitespace-pre-wrap">{caption}</p>
              </div>
            </div>
          </div>

          {/* Validation Checks */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Validation Checks
            </h3>
            <div className="grid md:grid-cols-2 gap-2">
              <div className="flex items-center gap-2 text-sm">
                {lengthPercentage <= 100 ? (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span>Character limit {lengthPercentage <= 100 ? 'OK' : 'exceeded'}</span>
              </div>

              {allChecksPassed ? (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>All safety checks passed</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span>Some safety checks flagged</span>
                </div>
              )}

              {item.complianceFlags && item.complianceFlags.length > 0 ? (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span>{item.complianceFlags.length} compliance flag(s)</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>No compliance issues</span>
                </div>
              )}

              {item.adCopy?.cta ? (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>CTA present and clear</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-sm">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <span>No CTA detected</span>
                </div>
              )}
            </div>
          </div>

          {/* AI Reasoning */}
          {item.aiReasoning && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-amber-500" />
                AI Reasoning
              </h3>
              <div className="p-4 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30">
                <p className="text-sm text-foreground">{item.aiReasoning}</p>
              </div>
            </div>
          )}

          {/* Notes Field */}
          <div className="space-y-2">
            <label htmlFor="review-notes" className="text-sm font-medium">
              Optional: Add approval notes
            </label>
            <Textarea
              id="review-notes"
              placeholder="Add any notes about your decision..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={handleReject}
            variant="outline"
            disabled={isProcessing}
            className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <XCircle className="w-4 h-4 mr-2" />
            Reject
          </Button>

          <Button
            onClick={handleRevision}
            variant="outline"
            disabled={isProcessing}
          >
            <Pause className="w-4 h-4 mr-2" />
            Needs Revision
          </Button>

          <Button
            onClick={handleApprove}
            variant="default"
            disabled={isProcessing}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Approve & Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
