/**
 * ContentPlannerGuidance Component
 *
 * Displays template guidance when a user comes from Content Planner.
 * Shows hook formulas, post structure, platform recommendations, and what to avoid.
 * Provides "Generate Copy" functionality using copywritingService.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  X,
  ChevronDown,
  ChevronUp,
  Lightbulb,
  Target,
  AlertTriangle,
  Sparkles,
  Copy,
  Check,
  Loader2,
  BookOpen,
  Wand2,
} from "lucide-react";
import type { ContentTemplate } from "@shared/contentTemplates";

interface ContentPlannerGuidanceProps {
  template: ContentTemplate;
  platform: string;
  onDismiss: () => void;
  onSelectHook: (hook: string) => void;
  onGenerateCopy: (copy: string) => void;
  productNames?: string[];
}

// Map template category to copywriting campaign objective
function getCampaignObjective(category: string): string {
  const mapping: Record<string, string> = {
    'product_showcase': 'conversion',
    'educational': 'awareness',
    'industry_insights': 'awareness',
    'customer_success': 'consideration',
    'company_updates': 'engagement',
    'engagement': 'engagement',
  };
  return mapping[category] || 'awareness';
}

// Infer copywriting framework from post structure
function inferFramework(postStructure: string): string {
  const lowerStructure = postStructure.toLowerCase();
  if (lowerStructure.includes('problem') && lowerStructure.includes('agitate')) {
    return 'PAS';
  }
  if (lowerStructure.includes('attention') && lowerStructure.includes('interest') && lowerStructure.includes('desire')) {
    return 'AIDA';
  }
  if (lowerStructure.includes('before') && lowerStructure.includes('after')) {
    return 'BAB';
  }
  if (lowerStructure.includes('feature') && lowerStructure.includes('advantage') && lowerStructure.includes('benefit')) {
    return 'FAB';
  }
  return 'Auto';
}

export function ContentPlannerGuidance({
  template,
  platform,
  onDismiss,
  onSelectHook,
  onGenerateCopy,
  productNames = [],
}: ContentPlannerGuidanceProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedHookIndex, setCopiedHookIndex] = useState<number | null>(null);
  const [showAllHooks, setShowAllHooks] = useState(false);

  // Generate copy mutation
  const generateCopyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/copywriting/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          platform: platform.toLowerCase(),
          tone: 'professional',
          framework: inferFramework(template.postStructure),
          campaignObjective: getCampaignObjective(template.category),
          productBenefits: template.exampleTopics.slice(0, 3).join('. '),
          targetAudience: {
            demographics: 'Construction professionals, contractors, engineers',
            interests: 'Steel construction, building materials, industry best practices',
            painPoints: 'Finding reliable suppliers, meeting specifications, managing timelines',
          },
          context: `Content Type: ${template.title}. Hook style: ${template.hookFormulas[0]}. Post structure: ${template.postStructure}`,
          numVariations: 1,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate copy');
      }

      const data = await response.json();
      return data.variations?.[0]?.copy || data.copy || 'Copy generation failed';
    },
    onSuccess: (copy) => {
      onGenerateCopy(copy);
    },
  });

  const handleCopyHook = (hook: string, index: number) => {
    navigator.clipboard.writeText(hook);
    setCopiedHookIndex(index);
    setTimeout(() => setCopiedHookIndex(null), 2000);
  };

  const handleUseHook = (hook: string) => {
    onSelectHook(hook);
  };

  // Category display names
  const categoryNames: Record<string, string> = {
    'product_showcase': 'Product Showcase',
    'educational': 'Educational',
    'industry_insights': 'Industry Insights',
    'customer_success': 'Customer Success',
    'company_updates': 'Company Updates',
    'engagement': 'Engagement',
  };

  const displayedHooks = showAllHooks ? template.hookFormulas : template.hookFormulas.slice(0, 2);

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                Content Planner Template
              </span>
            </div>
            <CardTitle className="text-lg">
              {categoryNames[template.category] || template.category} → {template.title}
            </CardTitle>
            <CardDescription className="text-sm">
              {template.description}
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onDismiss}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Platform recommendations */}
        <div className="flex flex-wrap gap-2 mt-3">
          {template.bestPlatforms.map((p, i) => (
            <Badge
              key={i}
              variant={p.platform.toLowerCase() === platform.toLowerCase() ? "default" : "outline"}
              className="text-xs"
            >
              {p.platform}: {p.format}
            </Badge>
          ))}
        </div>
      </CardHeader>

      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" size="sm" className="w-full justify-between py-2 px-4 hover:bg-muted/50">
            <span className="text-sm font-medium">
              {isExpanded ? "Hide Details" : "Show Hook Formulas, Structure & Tips"}
            </span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Hook Formulas */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-500" />
                <span className="text-sm font-medium">Hook Formulas</span>
              </div>
              <div className="space-y-2">
                {displayedHooks.map((hook, index) => (
                  <div
                    key={index}
                    className="group flex items-start gap-2 p-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm italic flex-1">"{hook}"</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleCopyHook(hook, index)}
                            >
                              {copiedHookIndex === index ? (
                                <Check className="w-3 h-3 text-green-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Copy to clipboard</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleUseHook(hook)}
                            >
                              <Wand2 className="w-3 h-3 text-primary" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Use this hook</TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                ))}
                {template.hookFormulas.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setShowAllHooks(!showAllHooks)}
                  >
                    {showAllHooks ? "Show less" : `+${template.hookFormulas.length - 2} more hooks`}
                  </Button>
                )}
              </div>
            </div>

            {/* Post Structure */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium">Post Structure</span>
              </div>
              <pre className="text-xs p-3 rounded-md bg-muted/30 whitespace-pre-wrap font-mono leading-relaxed">
                {template.postStructure}
              </pre>
            </div>

            {/* What to Avoid */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">What to Avoid</span>
              </div>
              <ul className="text-xs space-y-1 text-muted-foreground">
                {template.whatToAvoid.map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-orange-500">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Example Topics */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                <span className="text-sm font-medium">Example Topics</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {template.exampleTopics.slice(0, 4).map((topic, index) => (
                  <Badge
                    key={index}
                    variant="outline"
                    className="text-xs cursor-pointer hover:bg-primary/10 transition-colors"
                    onClick={() => onSelectHook(topic)}
                  >
                    {topic}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Generate Copy Button */}
            <div className="pt-2 border-t">
              <Button
                className="w-full"
                onClick={() => generateCopyMutation.mutate()}
                disabled={generateCopyMutation.isPending}
              >
                {generateCopyMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Copy...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate {platform} Copy with Template Context
                  </>
                )}
              </Button>
              {generateCopyMutation.isError && (
                <p className="text-xs text-destructive mt-2 text-center">
                  Failed to generate copy. Please try again.
                </p>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
