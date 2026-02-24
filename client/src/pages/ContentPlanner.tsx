/**
 * ContentPlanner — Strategic content planning guide
 *
 * Business logic extracted to useContentPlanner hook.
 * MarkAsPostedDialog kept as sub-component (was already extracted).
 */
import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
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
  Trash2,
} from 'lucide-react';
import { useContentPlanner, type ContentCategory, type ContentTemplate } from '@/hooks/useContentPlanner';

// Category icons
const categoryIcons: Record<string, React.ElementType> = {
  product_showcase: Target,
  educational: BookOpen,
  industry_insights: TrendingUp,
  customer_success: Users,
  company_updates: Building2,
  engagement: MessageSquare,
};

// Category colors
const categoryColors: Record<string, string> = {
  product_showcase: 'bg-blue-500',
  educational: 'bg-green-500',
  industry_insights: 'bg-purple-500',
  customer_success: 'bg-orange-500',
  company_updates: 'bg-pink-500',
  engagement: 'bg-cyan-500',
};

interface ContentPlannerProps {
  embedded?: boolean;
}

export default function ContentPlanner({ embedded = false }: ContentPlannerProps) {
  const planner = useContentPlanner();

  if (planner.isLoading) {
    return (
      <div className={embedded ? '' : 'min-h-screen bg-background'}>
        {!embedded && <Header currentPage="content-planner" />}
        <main
          className="container mx-auto px-4 py-6 flex items-center justify-center"
          role="status"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">Loading content planner...</span>
        </main>
      </div>
    );
  }

  return (
    <div className={embedded ? '' : 'min-h-screen bg-background'}>
      {!embedded && <Header currentPage="content-planner" />}

      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Content Planner</h1>
          <p className="text-muted-foreground">Strategic guide for what to post - based on the NDS posting strategy</p>
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
              <CardDescription>Track your posting distribution across categories</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {planner.categories.map((category) => {
                const balance = planner.balanceData?.balance[category.id];
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
                    <Progress value={Math.min(balance?.percentage || 0, 100)} className="h-2" />
                  </div>
                );
              })}
              <div className="pt-2 border-t">
                <div className="flex justify-between text-sm font-medium">
                  <span>Total Posts This Week</span>
                  <span>{planner.balanceData?.totalPosts || 0}</span>
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
              <CardDescription>Based on your current balance, we recommend:</CardDescription>
            </CardHeader>
            <CardContent>
              {planner.suggestionLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : planner.suggestionData ? (
                <div className="space-y-4">
                  <div>
                    <Badge className={`${categoryColors[planner.suggestionData.category.id]} text-white mb-2`}>
                      {planner.suggestionData.category.name}
                    </Badge>
                    {planner.suggestionData.suggestedTemplate && (
                      <h3 className="font-semibold text-lg">{planner.suggestionData.suggestedTemplate.title}</h3>
                    )}
                    <p className="text-sm text-muted-foreground mt-1">{planner.suggestionData.reason}</p>
                  </div>
                  {planner.suggestionData.suggestedTemplate && (
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const fullTemplate = planner.categories
                            .find((c) => c.id === planner.suggestionData?.category.id)
                            ?.templates.find((t) => t.id === planner.suggestionData?.suggestedTemplate?.id);
                          if (fullTemplate) planner.setSelectedTemplate(fullTemplate);
                        }}
                      >
                        <BookOpen className="w-4 h-4 mr-2" />
                        View Guide
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => planner.setMarkAsPostedCategory(planner.suggestionData!.category.id)}
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

        {/* Recent Posts Section */}
        {planner.recentPosts.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="w-5 h-5 text-primary" />
                Recent Posts (Last 7 Days)
              </CardTitle>
              <CardDescription>Posts you've marked as completed. Click delete to undo.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {planner.recentPosts.map((post) => {
                  const category = planner.categories.find((c) => c.id === post.category);
                  const Icon = categoryIcons[post.category] || Target;
                  const postedDate = new Date(post.postedAt);
                  const formattedDate = postedDate.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  });

                  return (
                    <div
                      key={post.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div
                          className={`w-8 h-8 rounded-lg ${categoryColors[post.category] || 'bg-gray-500'} flex items-center justify-center shrink-0`}
                        >
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">
                              {category?.name || post.category.replace('_', ' ')}
                            </span>
                            {post.platform && (
                              <Badge variant="outline" className="text-xs">
                                {post.platform}
                              </Badge>
                            )}
                            <span className="text-xs text-muted-foreground">{formattedDate}</span>
                          </div>
                          {post.subType && post.subType !== 'general' && (
                            <p className="text-xs text-muted-foreground mt-1">{post.subType.replace(/_/g, ' ')}</p>
                          )}
                          {post.notes && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{post.notes}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => planner.deletePostMutation.mutate(post.id)}
                        disabled={planner.deletePostMutation.isPending}
                      >
                        {planner.deletePostMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Categories Accordion */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Content Categories</h2>
          <div className="space-y-3">
            {planner.categories.map((category) => {
              const Icon = categoryIcons[category.id] || Target;
              const isExpanded = planner.expandedCategories.includes(category.id);
              return (
                <Collapsible
                  key={category.id}
                  open={isExpanded}
                  onOpenChange={() => planner.toggleCategory(category.id)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
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
                              <CardDescription className="text-xs mt-1">{category.description}</CardDescription>
                            </div>
                          </div>
                          <Badge variant="secondary">{category.templates.length} templates</Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-4">
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
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {category.templates.map((template) => (
                            <Card
                              key={template.id}
                              className="cursor-pointer hover:border-primary/50 transition-colors"
                              onClick={() => planner.setSelectedTemplate(template)}
                            >
                              <CardContent className="p-4">
                                <h4 className="font-medium text-sm mb-1">{template.title}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">{template.description}</p>
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
                        <div className="flex justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              planner.setMarkAsPostedCategory(category.id);
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
        <TemplateDetailDialog
          template={planner.selectedTemplate}
          categories={planner.categories}
          categoryColors={categoryColors}
          onClose={() => planner.setSelectedTemplate(null)}
          onCopyHook={planner.copyToClipboard}
          onMarkAsPosted={(catId) => {
            planner.setMarkAsPostedCategory(catId);
            planner.setSelectedTemplate(null);
          }}
          onCreateInStudio={planner.handleCreateInStudio}
        />

        {/* Mark as Posted Modal */}
        <MarkAsPostedDialog
          open={!!planner.markAsPostedCategory}
          onOpenChange={() => planner.setMarkAsPostedCategory(null)}
          categoryId={planner.markAsPostedCategory}
          categories={planner.categories}
          onSubmit={(data) => planner.markAsPostedMutation.mutate(data)}
          isSubmitting={planner.markAsPostedMutation.isPending}
        />

        {/* Start Fresh Warning Modal */}
        <AlertDialog open={planner.showStartFreshModal} onOpenChange={planner.setShowStartFreshModal}>
          <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
            <AlertDialogHeader>
              <AlertDialogTitle>Start Fresh with Template</AlertDialogTitle>
              <AlertDialogDescription>
                You're about to create content using:
                <span className="block mt-2 font-medium text-foreground">"{planner.pendingTemplateName}"</span>
                <span className="block mt-3">This will clear your current work and start fresh in the Studio.</span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={planner.handleCancelStartFresh}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={planner.handleConfirmStartFresh}>Start Fresh</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function TemplateDetailDialog({
  template,
  categories,
  categoryColors,
  onClose,
  onCopyHook,
  onMarkAsPosted,
  onCreateInStudio,
}: {
  template: ContentTemplate | null;
  categories: ContentCategory[];
  categoryColors: Record<string, string>;
  onClose: () => void;
  onCopyHook: (text: string) => void;
  onMarkAsPosted: (categoryId: string) => void;
  onCreateInStudio: (templateId: string, templateName: string) => void;
}) {
  return (
    <Dialog open={!!template} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {template && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Badge className={`${categoryColors[template.category]} text-white`}>
                  {categories.find((c) => c.id === template.category)?.name}
                </Badge>
                {template.title}
              </DialogTitle>
              <DialogDescription>{template.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-6 mt-4">
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">Hook Formulas That Work</h4>
                <div className="space-y-2">
                  {template.hookFormulas.map((hook, i) => (
                    <div key={i} className="p-3 bg-muted rounded-lg flex items-start justify-between gap-2">
                      <p className="text-sm italic">{hook}</p>
                      <Button variant="ghost" size="icon" className="shrink-0" onClick={() => onCopyHook(hook)}>
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Post Structure Template</h4>
                <pre className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap font-mono">
                  {template.postStructure}
                </pre>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Best Platforms</h4>
                <div className="space-y-2">
                  {template.bestPlatforms.map((platform, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Badge variant="outline">{platform.platform}</Badge>
                      <span className="text-sm text-muted-foreground">{platform.format}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-3">Example Topics</h4>
                <ul className="space-y-1">
                  {template.exampleTopics.map((topic, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      • {topic}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-3 text-destructive">What to Avoid</h4>
                <ul className="space-y-1">
                  {template.whatToAvoid.map((avoid, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      • {avoid}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-3 pt-4 border-t">
                <Button variant="outline" className="flex-1" onClick={() => onMarkAsPosted(template.category)}>
                  <Check className="w-4 h-4 mr-2" />
                  Mark as Posted
                </Button>
                <Button className="flex-1" onClick={() => onCreateInStudio(template.id, template.title)}>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Create in Studio
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

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
  onSubmit: (data: {
    category: string;
    subType: string;
    platform?: string | undefined;
    notes?: string | undefined;
  }) => void;
  isSubmitting: boolean;
}) {
  const [subType, setSubType] = useState<string>('general');
  const [platform, setPlatform] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  const category = categories.find((c) => c.id === categoryId);

  const handleSubmit = () => {
    if (!categoryId) return;
    onSubmit({ category: categoryId, subType, platform: platform || undefined, notes: notes || undefined });
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
          <div className="space-y-2">
            <label className="text-sm font-medium">Platform (Optional)</label>
            <Select value={platform} onValueChange={setPlatform}>
              <SelectTrigger>
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="not_specified">Not specified</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="twitter">Twitter/X</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="tiktok">TikTok</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notes (Optional)</label>
            <Textarea
              placeholder="Add any notes about this post..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
              Record Post
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
