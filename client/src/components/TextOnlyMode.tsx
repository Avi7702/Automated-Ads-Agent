// @ts-nocheck
/**
 * TextOnlyMode Component
 *
 * A copy-only content creation mode optimized for text posts.
 * NO image generation - pure text optimization.
 *
 * 2026 Critical Research Findings:
 * - LinkedIn text-only posts get 30% MORE reach than image posts!
 * - FIRST 150 CHARACTERS ARE CRITICAL (before "See more" truncation)
 * - Comments are weighted 8x more than likes in the algorithm
 * - External links are penalized by 60%
 * - Dwell time matters - longer, engaging text wins
 * - Optimal posting: 3-4 times per week
 *
 * This component prioritizes the first 150 characters as the most important
 * part of any post - the hook that determines if users click "See more".
 */

import { useState, useCallback, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import {
  FileText,
  Sparkles,
  X,
  CheckCircle2,
  Copy,
  RefreshCw,
  TrendingUp,
  MessageCircle,
  Eye,
  AlertTriangle,
  Zap,
  Target,
} from "lucide-react";

// Character limits for the "See more" truncation
const CRITICAL_CHAR_LIMIT = 150; // First 150 chars shown before "See more"
const PLATFORM_LIMITS: Record<string, number> = {
  linkedin: 3000,
  twitter: 280,
  facebook: 63206,
  instagram: 2200,
  tiktok: 2200,
};

interface TextOnlyModeProps {
  templateId: string;
  topic: string;
  platform: string;
  onClose: () => void;
  onComplete?: (result: TextOnlyResult) => void;
}

interface TextOnlyResult {
  copy: string;
  platform: string;
  characterCount: number;
  hookQuality: number; // 1-100 score for first 150 chars
}

interface CopyVariation {
  id: number;
  copy: string;
  hookScore: number;
  engagementPrediction: string;
}

// 2026 Best Practices - prominently displayed
const TEXT_ONLY_TIPS = [
  {
    icon: TrendingUp,
    title: "30% More Reach",
    tip: "LinkedIn text-only posts outperform image posts by 30% in 2026",
    highlight: true,
  },
  {
    icon: Eye,
    title: "First 150 Characters = Everything",
    tip: "Users see only 150 chars before 'See more'. Make them irresistible.",
    highlight: true,
  },
  {
    icon: MessageCircle,
    title: "Comments > Likes",
    tip: "Comments are weighted 8x more than likes. End with a question.",
    highlight: false,
  },
  {
    icon: AlertTriangle,
    title: "No External Links",
    tip: "Links are penalized 60%. Put links in comments instead.",
    highlight: false,
  },
];

// Hook formulas optimized for first 150 characters
const HOOK_FORMULAS = [
  "Stop [doing X]. It's costing you [result].",
  "I made $[X] by [doing Y]. Here's the exact playbook:",
  "Everyone says [common advice]. But after [X years], I learned:",
  "The harsh truth about [topic] nobody tells you:",
  "[Specific number] years. [Specific achievement]. Here's what I know now:",
  "This mistake cost me [X]. Don't make the same one.",
];

export function TextOnlyMode({
  templateId: _templateId,
  topic,
  platform,
  onClose,
  onComplete,
}: TextOnlyModeProps) {
  const [copy, setCopy] = useState("");
  const [selectedPlatform, setSelectedPlatform] = useState(platform);
  const [variations, setVariations] = useState<CopyVariation[]>([]);
  const [selectedVariation, setSelectedVariation] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [copyCount, setCopyCount] = useState(3);

  // Calculate character metrics
  const charMetrics = useMemo(() => {
    const total = copy.length;
    const first150 = copy.slice(0, CRITICAL_CHAR_LIMIT);
    const first150Length = first150.length;
    const platformLimit = PLATFORM_LIMITS[selectedPlatform] || 3000;
    const remaining = platformLimit - total;
    const isOverLimit = total > platformLimit;
    const hookProgress = (first150Length / CRITICAL_CHAR_LIMIT) * 100;

    // Analyze hook quality (simple heuristics)
    let hookQuality = 50; // Base score

    // Check for power words in first 150 chars
    const powerWords = ["stop", "secret", "truth", "mistake", "never", "always", "exact", "proven", "free", "new"];
    const lowerFirst150 = first150.toLowerCase();
    powerWords.forEach((word) => {
      if (lowerFirst150.includes(word)) hookQuality += 5;
    });

    // Check for numbers (specificity)
    if (/\d/.test(first150)) hookQuality += 10;

    // Check for question (engagement)
    if (first150.includes("?")) hookQuality += 10;

    // Penalize if first line is too long (should be punchy)
    const firstLine = first150.split("\n")[0];
    if (firstLine.length > 80) hookQuality -= 10;

    // Ensure score is in bounds
    hookQuality = Math.min(100, Math.max(0, hookQuality));

    return {
      total,
      first150Length,
      platformLimit,
      remaining,
      isOverLimit,
      hookProgress,
      hookQuality,
      first150,
      rest: copy.slice(CRITICAL_CHAR_LIMIT),
    };
  }, [copy, selectedPlatform]);

  // Generate copy mutation
  const generateMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/copywriting/standalone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          platform: selectedPlatform,
          tone: "authentic",
          framework: "auto",
          campaignObjective: "engagement",
          productName: topic,
          productDescription: `Create a text-only post about: ${topic}.

CRITICAL REQUIREMENTS FOR 2026:
1. The FIRST 150 CHARACTERS are the most important - this is what shows before "See more"
2. Start with a pattern-interrupting hook that stops the scroll
3. Use specific numbers and concrete details
4. End with a question to drive comments
5. DO NOT include any links (they reduce reach by 60%)
6. Write like a human, not a brand`,
          industry: "general",
          variations: copyCount,
        }),
      });
      if (!response.ok) throw new Error("Failed to generate copy");
      return response.json();
    },
    onSuccess: (data) => {
      if (data.variations && data.variations.length > 0) {
        const newVariations: CopyVariation[] = data.variations.map(
          (v: any, i: number) => {
            const text = v.copy || "";
            const first150 = text.slice(0, 150);

            // Calculate hook score
            let score = 50;
            if (/\d/.test(first150)) score += 15;
            if (first150.includes("?")) score += 10;
            if (first150.length > 100) score += 10;
            const powerWords = ["stop", "secret", "truth", "mistake", "never"];
            powerWords.forEach((w) => {
              if (first150.toLowerCase().includes(w)) score += 5;
            });
            score = Math.min(100, score);

            return {
              id: i,
              copy: text,
              hookScore: score,
              engagementPrediction:
                score >= 80 ? "High" : score >= 60 ? "Medium" : "Low",
            };
          }
        );

        setVariations(newVariations);
        if (newVariations.length > 0) {
          // Auto-select the one with highest hook score
          const best = newVariations.reduce((a, b) =>
            a.hookScore > b.hookScore ? a : b
          );
          setSelectedVariation(best.id);
          setCopy(best.copy);
        }
      }
    },
  });

  // Generate copies
  const generateCopies = useCallback(() => {
    setIsGenerating(true);
    generateMutation.mutate(undefined, {
      onSettled: () => setIsGenerating(false),
    });
  }, [generateMutation]);

  // Select a variation
  const selectVariation = useCallback((variation: CopyVariation) => {
    setSelectedVariation(variation.id);
    setCopy(variation.copy);
  }, []);

  // Copy to clipboard
  const copyToClipboard = useCallback(() => {
    navigator.clipboard.writeText(copy);
  }, [copy]);

  // Complete and return result
  const handleComplete = useCallback(() => {
    const result: TextOnlyResult = {
      copy,
      platform: selectedPlatform,
      characterCount: copy.length,
      hookQuality: charMetrics.hookQuality,
    };
    onComplete?.(result);
    onClose();
  }, [copy, selectedPlatform, charMetrics.hookQuality, onComplete, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="flex flex-row items-center justify-between py-4 px-6 border-b">
          <div className="flex items-center gap-3">
            <FileText className="w-5 h-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Text-Only Mode</CardTitle>
              <p className="text-sm text-muted-foreground">
                Optimized for {selectedPlatform} text posts (30% more reach than images!)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="twitter">Twitter/X</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>

        <div className="flex-1 overflow-hidden flex">
          {/* Left Panel - Editor */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {/* 2026 Tips Banner */}
            <div className="grid grid-cols-2 gap-3">
              {TEXT_ONLY_TIPS.map((tip, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-lg p-3 border",
                    tip.highlight
                      ? "bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800"
                      : "bg-muted/50 border-border"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <tip.icon
                      className={cn(
                        "w-4 h-4 mt-0.5",
                        tip.highlight
                          ? "text-green-600"
                          : "text-muted-foreground"
                      )}
                    />
                    <div>
                      <p
                        className={cn(
                          "text-sm font-medium",
                          tip.highlight
                            ? "text-green-900 dark:text-green-100"
                            : ""
                        )}
                      >
                        {tip.title}
                      </p>
                      <p className="text-xs text-muted-foreground">{tip.tip}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* First 150 Characters Section - THE MOST IMPORTANT PART */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-lg">
                    First 150 Characters
                    <span className="text-destructive ml-1">*</span>
                  </h3>
                  <Badge
                    variant={
                      charMetrics.hookQuality >= 70 ? "default" : "secondary"
                    }
                    className={cn(
                      charMetrics.hookQuality >= 80 && "bg-green-600",
                      charMetrics.hookQuality >= 60 &&
                        charMetrics.hookQuality < 80 &&
                        "bg-amber-600",
                      charMetrics.hookQuality < 60 && "bg-red-600"
                    )}
                  >
                    Hook Score: {charMetrics.hookQuality}/100
                  </Badge>
                </div>
                <span
                  className={cn(
                    "text-sm font-mono",
                    charMetrics.first150Length >= CRITICAL_CHAR_LIMIT
                      ? "text-green-600"
                      : "text-muted-foreground"
                  )}
                >
                  {charMetrics.first150Length}/{CRITICAL_CHAR_LIMIT}
                </span>
              </div>

              <div className="bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700 rounded-lg p-4">
                <p className="text-xs text-amber-700 dark:text-amber-300 mb-2 font-medium">
                  This is what users see before clicking "See more" - make it count!
                </p>
                <div className="bg-white dark:bg-background rounded p-3 border">
                  <p className="text-base leading-relaxed whitespace-pre-wrap">
                    <span className="font-medium">{charMetrics.first150}</span>
                    {charMetrics.rest && (
                      <span className="text-muted-foreground">
                        {" "}
                        <span className="text-blue-600 cursor-pointer">
                          ...see more
                        </span>
                      </span>
                    )}
                  </p>
                </div>
                <Progress
                  value={charMetrics.hookProgress}
                  className="mt-3 h-2"
                />
              </div>
            </div>

            {/* Full Copy Editor */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Full Post</h3>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "text-sm font-mono",
                      charMetrics.isOverLimit
                        ? "text-destructive"
                        : "text-muted-foreground"
                    )}
                  >
                    {charMetrics.total}/{charMetrics.platformLimit}
                    {charMetrics.isOverLimit && " (over limit!)"}
                  </span>
                </div>
              </div>

              <Textarea
                value={copy}
                onChange={(e) => setCopy(e.target.value)}
                placeholder={`Start with a hook that stops the scroll...

Example:
"Stop posting images on LinkedIn. Here's why:

I tested 47 posts over 3 months.
Text-only posts got 30% more reach.
Every. Single. Time.

Here's what I learned..."`}
                rows={12}
                className={cn(
                  "font-mono text-sm",
                  charMetrics.isOverLimit && "border-destructive"
                )}
              />
            </div>

            {/* Hook Formulas */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Proven Hook Formulas (click to use)
              </h4>
              <div className="flex flex-wrap gap-2">
                {HOOK_FORMULAS.map((formula, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setCopy(formula + "\n\n" + copy)}
                  >
                    {formula.slice(0, 40)}...
                  </Button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <div className="flex items-center gap-3">
              <Select
                value={copyCount.toString()}
                onValueChange={(v) => setCopyCount(parseInt(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 variation</SelectItem>
                  <SelectItem value="3">3 variations</SelectItem>
                  <SelectItem value="5">5 variations</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={generateCopies}
                disabled={isGenerating}
                className="flex-1"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Generating Hook-Optimized Copy...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate {copyCount} Variation{copyCount > 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Right Panel - Variations */}
          <div className="w-80 border-l bg-muted/30 overflow-auto">
            <div className="p-4 border-b">
              <h3 className="font-semibold">Generated Variations</h3>
              <p className="text-xs text-muted-foreground">
                Ranked by hook quality score
              </p>
            </div>

            <ScrollArea className="h-full">
              <div className="p-4 space-y-3">
                {variations.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <Zap className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      Generate variations to see them ranked by hook quality
                    </p>
                  </div>
                ) : (
                  variations
                    .sort((a, b) => b.hookScore - a.hookScore)
                    .map((variation) => (
                      <div
                        key={variation.id}
                        onClick={() => selectVariation(variation)}
                        className={cn(
                          "rounded-lg border p-3 cursor-pointer transition-colors",
                          selectedVariation === variation.id
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        )}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge
                            variant={
                              variation.hookScore >= 70 ? "default" : "secondary"
                            }
                            className={cn(
                              "text-xs",
                              variation.hookScore >= 80 && "bg-green-600",
                              variation.hookScore >= 60 &&
                                variation.hookScore < 80 &&
                                "bg-amber-600",
                              variation.hookScore < 60 && "bg-red-600"
                            )}
                          >
                            Hook: {variation.hookScore}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {variation.engagementPrediction} engagement
                          </span>
                        </div>
                        <p className="text-sm line-clamp-4 text-muted-foreground">
                          {variation.copy.slice(0, 150)}...
                        </p>
                      </div>
                    ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" onClick={copyToClipboard}>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Text
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Copy to clipboard</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="outline"
              onClick={() => setShowPreview(!showPreview)}
            >
              <Eye className="w-4 h-4 mr-2" />
              {showPreview ? "Hide" : "Show"} Preview
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleComplete} disabled={!copy.trim()}>
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Use This Copy
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export type { TextOnlyModeProps, TextOnlyResult };
