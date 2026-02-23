/**
 * Learn from Winners - Pattern Library
 *
 * Business logic extracted to useLearnFromWinners hook.
 * Sub-components PatternVisualization, PatternCard, PatternSkeleton kept in-file.
 */
import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import {
  Sparkles,
  Eye,
  Trash2,
  Search,
  Grid3X3,
  List,
  TrendingUp,
  Zap,
  AlertTriangle,
  Brain,
  Palette,
  Layout,
  Target,
  Image as ImageIcon,
  BarChart3,
  Star,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdaptiveUploadZone } from '../components/AdaptiveUploadZone';

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Header } from '@/components/layout/Header';

// Hook & constants
import { useLearnFromWinners, PATTERN_CATEGORIES, PLATFORMS, ENGAGEMENT_TIERS } from '@/hooks/useLearnFromWinners';
import type { LearnedAdPattern } from '@shared/schema';

// ── Types ────────────────────────────────────────────────

interface LearnFromWinnersProps {
  embedded?: boolean;
  selectedId?: string | null;
}

// ── Animation variants ──────────────────────────────────

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

// ── Main Component ──────────────────────────────────────

export default function LearnFromWinners({ embedded = false, selectedId: _selectedId }: LearnFromWinnersProps) {
  const q = useLearnFromWinners();

  const mainContent = (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-semibold">Learn from Winners</h1>
            <p className="text-sm text-muted-foreground">Extract success patterns from high-performing ads</p>
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="mb-8">
        <AdaptiveUploadZone
          patterns={q.patterns || []}
          onUpload={q.handleUpload}
          isUploading={q.isPolling}
          uploadProgress={q.uploadStatusData?.progress || 0}
          uploadStatus={q.uploadStatusData?.status}
          uploadError={q.uploadStatusData?.error}
        />
      </div>

      {/* Content */}
      {q.isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <PatternSkeleton key={i} />
          ))}
        </div>
      ) : q.error ? (
        <div className="text-center py-12">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Failed to load patterns</h3>
          <p className="text-muted-foreground mb-4">Please try refreshing the page.</p>
          <Button variant="outline" onClick={q.handleRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
        </div>
      ) : q.patterns && q.patterns.length > 0 ? (
        <>
          {/* Filters & Search */}
          <FiltersBar
            searchQuery={q.searchQuery}
            onSearchChange={q.setSearchQuery}
            categoryFilter={q.categoryFilter}
            onCategoryChange={q.setCategoryFilter}
            platformFilter={q.platformFilter}
            onPlatformChange={q.setPlatformFilter}
            viewMode={q.viewMode}
            onViewModeChange={q.setViewMode}
          />

          {/* Results Count */}
          <div className="text-sm text-muted-foreground mb-4">
            {q.filteredPatterns?.length || 0} pattern{(q.filteredPatterns?.length || 0) !== 1 ? 's' : ''} found
          </div>

          {/* Pattern Grid */}
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className={cn(
              q.viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'flex flex-col gap-4',
            )}
          >
            <AnimatePresence mode="popLayout">
              {q.filteredPatterns?.map((pattern) => (
                <PatternCard
                  key={pattern.id}
                  pattern={pattern}
                  onView={() => q.handleViewPattern(pattern)}
                  onDelete={() => q.handleDeletePattern(pattern.id)}
                  onApply={() => q.handleApplyPattern(pattern)}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </>
      ) : null}

      {/* Pattern Detail Dialog */}
      <PatternDetailDialog
        pattern={q.selectedPattern}
        open={q.showDetailDialog}
        onOpenChange={q.setShowDetailDialog}
        onApply={q.handleApplyPattern}
      />
    </>
  );

  if (embedded) {
    return mainContent;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container max-w-7xl mx-auto py-8 px-4 sm:px-6">{mainContent}</main>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────

function FiltersBar({
  searchQuery,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  platformFilter,
  onPlatformChange,
  viewMode,
  onViewModeChange,
}: {
  searchQuery: string;
  onSearchChange: (v: string) => void;
  categoryFilter: string;
  onCategoryChange: (v: string) => void;
  platformFilter: string;
  onPlatformChange: (v: string) => void;
  viewMode: 'grid' | 'list';
  onViewModeChange: (v: 'grid' | 'list') => void;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search patterns..."
          className="pl-9"
        />
      </div>

      <div className="flex items-center gap-2">
        <Select value={categoryFilter} onValueChange={onCategoryChange}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {PATTERN_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>
                {cat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={platformFilter} onValueChange={onPlatformChange}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Platform" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Platforms</SelectItem>
            {PLATFORMS.map((plat) => (
              <SelectItem key={plat.value} value={plat.value}>
                {plat.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center border rounded-lg p-1">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('grid')}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PatternDetailDialog({
  pattern,
  open,
  onOpenChange,
  onApply,
}: {
  pattern: LearnedAdPattern | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApply: (pattern: LearnedAdPattern) => void;
}) {
  if (!pattern) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{pattern.name}</DialogTitle>
              <DialogDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{PATTERN_CATEGORIES.find((c) => c.value === pattern.category)?.label}</Badge>
                <Badge variant="secondary">{pattern.platform}</Badge>
                {pattern.industry && <Badge variant="outline">{pattern.industry}</Badge>}
              </DialogDescription>
            </div>
            {pattern.engagementTier && pattern.engagementTier !== 'unverified' && (
              <Badge className="bg-gradient-to-r from-yellow-500/20 dark:from-yellow-500/30 to-orange-500/20 dark:to-orange-500/30 border-yellow-500/30 dark:border-yellow-500/20">
                <TrendingUp className="w-3 h-3 mr-1" />
                {ENGAGEMENT_TIERS.find((t) => t.value === pattern.engagementTier)?.label}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="py-4">
          <PatternVisualization pattern={pattern} />
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mr-auto">
            <Zap className="w-4 h-4" />
            Used {pattern.usageCount} times
            {pattern.lastUsedAt && <span>Last used {new Date(pattern.lastUsedAt).toLocaleDateString()}</span>}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            onClick={() => {
              onApply(pattern);
              onOpenChange(false);
            }}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Apply Pattern
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Pattern Visualization ───────────────────────────────

interface PatternVisualizationProps {
  pattern: LearnedAdPattern;
  compact?: boolean;
}

function PatternVisualization({ pattern, compact = false }: PatternVisualizationProps) {
  const shouldReduceMotion = useReducedMotion();

  const getPatternStrength = () => {
    let score = 0;
    let total = 0;
    if (pattern.layoutPattern) {
      score += 25;
      total += 25;
    }
    if (pattern.colorPsychology) {
      score += 25;
      total += 25;
    }
    if (pattern.hookPatterns) {
      score += 25;
      total += 25;
    }
    if (pattern.visualElements) {
      score += 25;
      total += 25;
    }
    return total > 0 ? Math.round((score / total) * 100) : 0;
  };

  const patternStrength = getPatternStrength();
  const confidencePercent = Math.round((pattern.confidenceScore || 0.8) * 100);

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <div className="relative w-12 h-12">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="2" />
            <circle cx="50" cy="50" r="30" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
            <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeOpacity="0.1" strokeWidth="1" />
            {pattern.layoutPattern && <circle cx="50" cy="10" r="4" fill="hsl(var(--primary))" />}
            {pattern.colorPsychology && <circle cx="90" cy="50" r="4" fill="hsl(217 91% 60%)" />}
            {pattern.hookPatterns && <circle cx="50" cy="90" r="4" fill="hsl(142 71% 45%)" />}
            {pattern.visualElements && <circle cx="10" cy="50" r="4" fill="hsl(280 65% 60%)" />}
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-muted-foreground">Pattern Completeness</span>
            <span className="text-xs font-medium">{patternStrength}%</span>
          </div>
          <Progress value={patternStrength} className="h-1.5" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <PatternCategoryBox
          icon={<Layout className="w-4 h-4 text-primary" />}
          label="Layout"
          active={!!pattern.layoutPattern}
          activeClass="bg-primary/5 border-primary/30"
          shouldReduceMotion={shouldReduceMotion}
          delay={0}
        >
          {pattern.layoutPattern ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Structure: <span className="text-foreground">{pattern.layoutPattern.structure}</span>
              </p>
              <p>
                Whitespace: <span className="text-foreground">{pattern.layoutPattern.whitespaceUsage}</span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not detected</p>
          )}
        </PatternCategoryBox>

        <PatternCategoryBox
          icon={<Palette className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
          label="Color"
          active={!!pattern.colorPsychology}
          activeClass="bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/30 dark:border-blue-500/20"
          shouldReduceMotion={shouldReduceMotion}
          delay={0.05}
        >
          {pattern.colorPsychology ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Mood: <span className="text-foreground">{pattern.colorPsychology.dominantMood}</span>
              </p>
              <p>
                Scheme: <span className="text-foreground">{pattern.colorPsychology.colorScheme}</span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not detected</p>
          )}
        </PatternCategoryBox>

        <PatternCategoryBox
          icon={<Target className="w-4 h-4 text-green-600 dark:text-green-400" />}
          label="Hook"
          active={!!pattern.hookPatterns}
          activeClass="bg-green-500/5 dark:bg-green-500/10 border-green-500/30 dark:border-green-500/20"
          shouldReduceMotion={shouldReduceMotion}
          delay={0.1}
        >
          {pattern.hookPatterns ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Type: <span className="text-foreground">{pattern.hookPatterns.hookType}</span>
              </p>
              <p>
                CTA: <span className="text-foreground">{pattern.hookPatterns.ctaStyle}</span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not detected</p>
          )}
        </PatternCategoryBox>

        <PatternCategoryBox
          icon={<Eye className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
          label="Visuals"
          active={!!pattern.visualElements}
          activeClass="bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/30 dark:border-purple-500/20"
          shouldReduceMotion={shouldReduceMotion}
          delay={0.15}
        >
          {pattern.visualElements ? (
            <div className="space-y-1 text-xs text-muted-foreground">
              <p>
                Style: <span className="text-foreground">{pattern.visualElements.imageStyle}</span>
              </p>
              <p>
                Product: <span className="text-foreground">{pattern.visualElements.productVisibility}</span>
              </p>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Not detected</p>
          )}
        </PatternCategoryBox>
      </div>

      {/* Confidence Score */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm">AI Confidence</span>
        </div>
        <div className="flex items-center gap-2">
          <Progress value={confidencePercent} className="w-20 h-2" />
          <span className="text-sm font-medium">{confidencePercent}%</span>
        </div>
      </div>
    </div>
  );
}

function PatternCategoryBox({
  icon,
  label,
  active,
  activeClass,
  shouldReduceMotion,
  delay,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  activeClass: string;
  shouldReduceMotion: boolean | null;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={shouldReduceMotion ? {} : { opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay }}
      className={cn(
        'p-3 rounded-xl border transition-colors',
        active ? activeClass : 'bg-muted/30 border-transparent opacity-50',
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      {children}
    </motion.div>
  );
}

// ── Pattern Card ────────────────────────────────────────

interface PatternCardProps {
  pattern: LearnedAdPattern;
  onView: () => void;
  onDelete: () => void;
  onApply: () => void;
}

function PatternCard({ pattern, onView, onDelete, onApply }: PatternCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const categoryInfo = PATTERN_CATEGORIES.find((c) => c.value === pattern.category);
  const engagementInfo = ENGAGEMENT_TIERS.find((t) => t.value === pattern.engagementTier);

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      product_showcase:
        'bg-blue-500/20 dark:bg-blue-500/30 text-blue-900 dark:text-blue-300 border-blue-500/30 dark:border-blue-500/20',
      testimonial:
        'bg-yellow-500/20 dark:bg-yellow-500/30 text-yellow-900 dark:text-yellow-300 border-yellow-500/30 dark:border-yellow-500/20',
      comparison:
        'bg-green-500/20 dark:bg-green-500/30 text-green-900 dark:text-green-300 border-green-500/30 dark:border-green-500/20',
      educational:
        'bg-purple-500/20 dark:bg-purple-500/30 text-purple-900 dark:text-purple-300 border-purple-500/30 dark:border-purple-500/20',
      promotional:
        'bg-orange-500/20 dark:bg-orange-500/30 text-orange-900 dark:text-orange-300 border-orange-500/30 dark:border-orange-500/20',
      brand_awareness:
        'bg-pink-500/20 dark:bg-pink-500/30 text-pink-900 dark:text-pink-300 border-pink-500/30 dark:border-pink-500/20',
    };
    return colors[category] || 'bg-muted';
  };

  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="group"
    >
      <Card
        className={cn(
          'relative overflow-hidden transition-all duration-200',
          'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5',
          isHovered && 'ring-1 ring-primary/20',
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-base font-semibold line-clamp-1">{pattern.name}</CardTitle>
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className={cn('text-xs', getCategoryColor(pattern.category))}>
                  {categoryInfo?.label || pattern.category}
                </Badge>
                <Badge variant="secondary" className="text-xs">
                  {pattern.platform}
                </Badge>
              </div>
            </div>
            {pattern.engagementTier && pattern.engagementTier !== 'unverified' && (
              <Tooltip>
                <TooltipTrigger>
                  <div
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                      'bg-gradient-to-r from-yellow-500/20 dark:from-yellow-500/30 to-orange-500/20 dark:to-orange-500/30 border border-yellow-500/30 dark:border-yellow-500/20',
                    )}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {engagementInfo?.label}
                  </div>
                </TooltipTrigger>
                <TooltipContent>Performance tier based on engagement metrics</TooltipContent>
              </Tooltip>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <PatternVisualization pattern={pattern} compact />

          <div className="flex items-center justify-between mt-4 pt-4 border-t text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {pattern.usageCount} uses
              </span>
              {pattern.lastUsedAt && (
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {new Date(pattern.lastUsedAt).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: isHovered ? 1 : 0,
              y: isHovered ? 0 : 10,
            }}
            transition={{ duration: shouldReduceMotion ? 0 : 0.15 }}
            className="flex items-center gap-2 mt-4"
          >
            <Button size="sm" variant="default" className="flex-1" onClick={onApply}>
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              Apply
            </Button>
            <Button size="sm" variant="outline" onClick={onView}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" variant="outline" onClick={onDelete} className="text-destructive hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </motion.div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ── Loading Skeleton ────────────────────────────────────

function PatternSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Skeleton className="h-5 w-3/4 mb-2" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Skeleton className="w-12 h-12 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-2 w-full mb-2" />
            <Skeleton className="h-1.5 w-3/4" />
          </div>
        </div>
        <Skeleton className="h-8 w-full mt-4" />
      </CardContent>
    </Card>
  );
}
