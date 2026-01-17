import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  ChevronDown,
  ChevronRight,
  Lightbulb,
  Target,
  Check,
  ExternalLink,
  Copy,
  Sparkles,
  BookOpen,
  TrendingUp,
  Users,
  Building2,
  MessageSquare,
} from 'lucide-react';

// Types from backend
interface ContentTemplate {
  id: string;
  category: string;
  categoryPercentage: number;
  subType: string;
  title: string;
  description: string;
  hookFormulas: string[];
  postStructure: string;
  bestPlatforms: { platform: string; format: string }[];
  exampleTopics: string[];
  whatToAvoid: string[];
}

interface ContentCategory {
  id: string;
  name: string;
  percentage: number;
  description: string;
  weeklyTarget: number;
  bestPractices: string[];
  templates: ContentTemplate[];
}

interface BalanceData {
  balance: Record<string, { current: number; target: number; percentage: number }>;
  suggested: { categoryId: string; categoryName: string; reason: string };
  totalPosts: number;
}

interface SuggestionData {
  category: {
    id: string;
    name: string;
    percentage: number;
    weeklyTarget: number;
    currentCount: number;
    bestPractices: string[];
  };
  suggestedTemplate: {
    id: string;
    title: string;
    subType: string;
    description: string;
    hookFormulas: string[];
  } | null;
  reason: string;
}

// Category icons
const categoryIcons: Record<string, React.ElementType> = {
  product_showcase: Target,
  educational: BookOpen,
  industry_insights: TrendingUp,
  customer_success: Users,
  company_updates: Building2,
  engagement: MessageSquare,
};

// Category colors for visual distinction
const categoryColors: Record<string, string> = {
  product_showcase: 'bg-blue-500',
  educational: 'bg-green-500',
  industry_insights: 'bg-purple-500',
  customer_success: 'bg-orange-500',
  company_updates: 'bg-pink-500',
  engagement: 'bg-cyan-500',
};

/**
 * ContentPlanner - Strategic content planning guide
 *
 * Features:
 * - Weekly balance tracker across 6 content categories
 * - Smart suggestion for what to post next
 * - 30 researched templates with hooks, structures, examples
 * - Mark as posted functionality
 */
export default function ContentPlanner() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State for modals
  const [selectedTemplate, setSelectedTemplate] = useState<ContentTemplate | null>(null);
  const [markAsPostedCategory, setMarkAsPostedCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  // Fetch templates
  const { data: templatesData, isLoading: templatesLoading } = useQuery<{
    categories: ContentCategory[];
    templates: ContentTemplate[];
  }>({
    queryKey: ['/api/content-planner/templates'],
    staleTime: 1000 * 60 * 60, // Cache for 1 hour
  });

  // Fetch balance
  const { data: balanceData, isLoading: balanceLoading } = useQuery<BalanceData>({
    queryKey: ['/api/content-planner/balance'],
    staleTime: 1000 * 60, // Refresh every minute
  });

  // Fetch suggestion
  const { data: suggestionData, isLoading: suggestionLoading } = useQuery<SuggestionData>({
    queryKey: ['/api/content-planner/suggestion'],
    staleTime: 1000 * 60,
  });

  // Mark as posted mutation
  const markAsPostedMutation = useMutation({
    mutationFn: async (data: { category: string; subType: string; platform?: string; notes?: string }) => {
      const response = await fetch('/api/content-planner/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to mark as posted');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-planner/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/content-planner/suggestion'] });
      toast({
        title: 'Post recorded',
        description: 'Your weekly balance has been updated.',
      });
      setMarkAsPostedCategory(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to record post. Please try again.',
        variant: 'destructive',
      });
    },
  });

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Hook formula copied to clipboard.',
    });
  };

  if (templatesLoading || balanceLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header currentPage="content-planner" />
        <main className="container mx-auto px-4 py-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  const categories = templatesData?.categories || [];

  return (
    <div className="min-h-screen bg-background">
      <Header currentPage="content-planner" />

      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Content Planner</h1>
          <p className="text-muted-foreground">
            Strategic guide for what to post - based on the NDS posting strategy
          </p>
        </div>

        {/* Top Section: Balance + Suggestion */}
        <div className="grid gap-6 md:grid-cols-2 mb-8">
          {/* Weekly Balance Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                This Week's Balance
              </CardTitle>
              <CardDescription>
                Track your posting distribution across categories
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {categories.map((category) => {
                const balance = balanceData?.balance[category.id];
                const Icon = categoryIcons[category.id] || Target;
                return (
                  <div key={category.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span>{category.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {category.percentage}%
                        </Badge>
                      </div>
                      <span className="text-muted-foreground">
                        {balance?.current || 0}/{balance?.target || category.weeklyTarget}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(balance?.percentage || 0, 100)}
                      className="h-2"
                    />
                  </div>
                );
              })}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Posts This Week</span>
                  <span>{balanceData?.totalPosts || 0}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Next Post Card */}
          <Card className="border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-yellow-500" />
                Suggested Next Post
              </CardTitle>
              <CardDescription>
                Based on your current balance, we recommend:
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suggestionLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : suggestionData ? (
                <div className="space-y-4">
                  <div>
                    <Badge className={`${categoryColors[suggestionData.category.id]} text-white mb-2`}>
                      {suggestionData.category.name}
                    </Badge>
                    {suggestionData.suggestedTemplate && (
                      <h3 className="font-semibold text-lg">
                        {suggestionData.suggestedTemplate.title}
                      </h3>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">
                      {suggestionData.reason}
                    </p>
                  </div>
                  {suggestionData.suggestedTemplate && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const fullTemplate = categories
                            .find((c) => c.id === suggestionData.category.id)
                            ?.templates.find((t) => t.id === suggestionData.suggestedTemplate?.id);
                          if (fullTemplate) setSelectedTemplate(fullTemplate);
                        }}
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        View Guide
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => setMarkAsPostedCategory(suggestionData.category.id)}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Mark as Posted
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground">Unable to load suggestion</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Content Categories Accordion */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Content Categories</h2>
          <div className="space-y-3">
            {categories.map((category) => {
              const Icon = categoryIcons[category.id] || Target;
              const isExpanded = expandedCategories.includes(category.id);

              return (
                <Collapsible
                  key={category.id}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category.id)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5" />
                            ) : (
                              <ChevronRight className="w-5 h-5" />
                            )}
                            <div
                              className={`w-8 h-8 rounded-lg ${categoryColors[category.id]} flex items-center justify-center`}
                            >
                              <Icon className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <CardTitle className="text-base">
                                {category.name}
                                <Badge variant="outline" className="ml-2 text-xs">
                                  {category.percentage}%
                                </Badge>
                              </CardTitle>
                              <CardDescription className="text-xs mt-1">
                                {category.description}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="secondary">
                            {category.templates.length} templates
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-4">
                        {/* Best Practices */}
                        <div className="p-3 bg-muted/50 rounded-lg">
                          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-yellow-500" />
                            Best Practices
                          </h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            {category.bestPractices.map((practice, i) => (
                              <li key={i}>• {practice}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Templates List */}
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {category.templates.map((template) => (
                            <Card
                              key={template.id}
                              className="cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={() => setSelectedTemplate(template)}
                            >
                              <CardContent className="p-4">
                                <h4 className="font-medium text-sm mb-1">
                                  {template.title}
                                </h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {template.description}
                                </p>
                                <div className="flex gap-1 mt-2 flex-wrap">
                                  {template.bestPlatforms.slice(0, 2).map((p, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {p.platform}
                                    </Badge>
                                  ))}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>

                        {/* Mark as Posted Button */}
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setMarkAsPostedCategory(category.id);
                            }}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Mark {category.name} Post as Complete
                          </Button>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        </div>

        {/* Template Detail Modal */}
        <Dialog open={!!selectedTemplate} onOpenChange={() => setSelectedTemplate(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedTemplate && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Badge className={`${categoryColors[selectedTemplate.category]} text-white`}>
                      {categories.find((c) => c.id === selectedTemplate.category)?.name}
                    </Badge>
                    {selectedTemplate.title}
                  </DialogTitle>
                  <DialogDescription>{selectedTemplate.description}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Hook Formulas */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      🎣 Hook Formulas That Work
                    </h4>
                    <div className="space-y-2">
                      {selectedTemplate.hookFormulas.map((hook, i) => (
                        <div
                          key={i}
                          className="p-3 bg-muted rounded-lg flex items-start justify-between gap-2"
                        >
                          <p className="text-sm italic">{hook}</p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            onClick={() => copyToClipboard(hook)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Post Structure */}
                  <div>
                    <h4 className="font-semibold mb-3">📝 Post Structure Template</h4>
                    <pre className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono">
                      {selectedTemplate.postStructure}
                    </pre>
                  </div>

                  {/* Best Platforms */}
                  <div>
                    <h4 className="font-semibold mb-3">📱 Best Platforms</h4>
                    <div className="space-y-2">
                      {selectedTemplate.bestPlatforms.map((platform, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <Badge variant="outline">{platform.platform}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {platform.format}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Example Topics */}
                  <div>
                    <h4 className="font-semibold mb-3">💡 Example Topics for Steel/Construction</h4>
                    <ul className="space-y-1">
                      {selectedTemplate.exampleTopics.map((topic, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {topic}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* What to Avoid */}
                  <div>
                    <h4 className="font-semibold mb-3 text-destructive">⚠️ What to Avoid</h4>
                    <ul className="space-y-1">
                      {selectedTemplate.whatToAvoid.map((avoid, i) => (
                        <li key={i} className="text-sm text-muted-foreground">
                          • {avoid}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4 border-t">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => {
                        setMarkAsPostedCategory(selectedTemplate.category);
                        setSelectedTemplate(null);
                      }}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Mark as Posted
                    </Button>
                    <Button className="flex-1" asChild>
                      <a href="/" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        Create in Studio
                      </a>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Mark as Posted Modal */}
        <MarkAsPostedDialog
          open={!!markAsPostedCategory}
          onOpenChange={() => setMarkAsPostedCategory(null)}
          categoryId={markAsPostedCategory}
          categories={categories}
          onSubmit={(data) => markAsPostedMutation.mutate(data)}
          isSubmitting={markAsPostedMutation.isPending}
        />
      </main>
    </div>
  );
}

// Mark as Posted Dialog Component
function MarkAsPostedDialog({
  open,
  onOpenChange,
  categoryId,
  categories,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string | null;
  categories: ContentCategory[];
  onSubmit: (data: { category: string; subType: string; platform?: string; notes?: string }) => void;
  isSubmitting: boolean;
}) {
  const [subType, setSubType] = useState<string>('general');
  const [platform, setPlatform] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const category = categories.find((c) => c.id === categoryId);

  const handleSubmit = () => {
    if (!categoryId) return;
    onSubmit({
      category: categoryId,
      subType,
      platform: platform || undefined,
      notes: notes || undefined,
    });
    // Reset form
    setSubType('general');
    setPlatform('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark Post as Complete</DialogTitle>
          <DialogDescription>
            Record that you've posted {category?.name.toLowerCase()} content this week.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Sub-type Selection */}
          {category && category.templates.length > 0 && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Post Type</label>
              <Select value={subType} onValueChange={setSubType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  {category.templates.map((t) => (
                    <SelectItem key={t.id} value={t.subType}>
                      {t.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Platform Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Platform (Optional)</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Not specified</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="twitter">Twitter/X</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              placeholder="Add any notes about this post..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Record Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
