// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Filter,
  Plus,
  Trash2,
  Star,
  TrendingUp,
  Layout,
  ImageOff,
  ExternalLink,
  Palette,
  Type,
  Target,
  BarChart3,
  Clock,
  ChevronDown,
  X,
  Sparkles,
  Instagram,
  Linkedin,
  Facebook,
  Twitter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { PerformingAdTemplate } from "@shared/schema";

// Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Header } from "@/components/layout/Header";
import { AddTemplateModal } from "@/components/AddTemplateModal";

// Platform icons mapping
const platformIcons: Record<string, typeof Instagram> = {
  instagram: Instagram,
  linkedin: Linkedin,
  facebook: Facebook,
  twitter: Twitter,
  tiktok: Sparkles,
};

// Engagement tier colors (light mode readable + dark mode optimized)
const engagementTierColors: Record<string, string> = {
  "top-5": "bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30",
  "top-10": "bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30",
  "top-25": "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  "unranked": "bg-muted text-muted-foreground",
};

// Category colors (light mode readable + dark mode optimized)
const categoryColors: Record<string, string> = {
  product_showcase: "bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-500/30",
  installation: "bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30",
  worksite: "bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30",
  professional: "bg-purple-500/20 text-purple-700 dark:text-purple-400 border-purple-500/30",
  educational: "bg-pink-500/20 text-pink-700 dark:text-pink-400 border-pink-500/30",
};

// Template image with fallback
function TemplateImage({ src, alt }: { src: string | null | undefined; alt: string }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-muted/50 to-muted text-muted-foreground">
        <Layout className="w-12 h-12 mb-2 opacity-50" />
        <span className="text-xs">No preview</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
      onError={() => setHasError(true)}
    />
  );
}

// Template card component
function TemplateCard({
  template,
  onClick,
  onDelete,
}: {
  template: PerformingAdTemplate;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="group relative rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all cursor-pointer"
      onClick={onClick}
    >
      {/* Featured badge */}
      {template.isFeatured && (
        <div className="absolute top-3 left-3 z-10">
          <Badge className="bg-yellow-500/90 text-yellow-950 gap-1">
            <Star className="w-3 h-3 fill-current" />
            Featured
          </Badge>
        </div>
      )}

      {/* Engagement tier badge */}
      {template.engagementTier && template.engagementTier !== "unranked" && (
        <div className="absolute top-3 right-3 z-10">
          <Badge className={cn("gap-1", engagementTierColors[template.engagementTier])}>
            <TrendingUp className="w-3 h-3" />
            {template.engagementTier.replace("-", " ")}
          </Badge>
        </div>
      )}

      {/* Image */}
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <TemplateImage src={template.previewImageUrl} alt={template.name} />
      </div>

      {/* Info */}
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-foreground line-clamp-1">{template.name}</h3>
          {template.estimatedEngagementRate && (
            <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
              <BarChart3 className="w-3 h-3" />
              {template.estimatedEngagementRate}%
            </span>
          )}
        </div>

        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
        )}

        {/* Category and platforms */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className={cn("text-xs", categoryColors[template.category])}>
            {template.category}
          </Badge>
          {template.targetPlatforms?.slice(0, 3).map((platform) => {
            const Icon = platformIcons[platform] || Sparkles;
            return (
              <span key={platform} className="text-muted-foreground" title={platform}>
                <Icon className="w-4 h-4" />
              </span>
            );
          })}
          {template.targetPlatforms && template.targetPlatforms.length > 3 && (
            <span className="text-xs text-muted-foreground">
              +{template.targetPlatforms.length - 3}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          <Button
            variant="default"
            size="sm"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Use Template
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// Template detail modal
function TemplateDetailModal({
  template,
  isOpen,
  onClose,
  onUse,
}: {
  template: PerformingAdTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onUse: () => void;
}) {
  if (!template) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            {template.name}
            {template.isFeatured && (
              <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            )}
          </DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Preview Image */}
          <div className="aspect-[4/3] rounded-xl overflow-hidden bg-muted">
            <TemplateImage src={template.previewImageUrl} alt={template.name} />
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Metrics */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Performance Metrics
              </h4>
              <div className="grid grid-cols-2 gap-2">
                {template.engagementTier && (
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground">Tier</div>
                    <div className="font-medium capitalize">
                      {template.engagementTier.replace("-", " ")}
                    </div>
                  </div>
                )}
                {template.estimatedEngagementRate && (
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground">Engagement</div>
                    <div className="font-medium">{template.estimatedEngagementRate}%</div>
                  </div>
                )}
                {template.runningDays && (
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Running
                    </div>
                    <div className="font-medium">{template.runningDays} days</div>
                  </div>
                )}
                {template.estimatedBudget && (
                  <div className="p-2 bg-muted/50 rounded-lg">
                    <div className="text-xs text-muted-foreground">Budget</div>
                    <div className="font-medium">${template.estimatedBudget.replace("-", " - $")}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Style & Mood */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Style
              </h4>
              <div className="flex flex-wrap gap-2">
                {template.mood && (
                  <Badge variant="outline" className="capitalize">{template.mood}</Badge>
                )}
                {template.style && (
                  <Badge variant="outline" className="capitalize">{template.style}</Badge>
                )}
                {template.backgroundType && (
                  <Badge variant="outline" className="capitalize">{template.backgroundType}</Badge>
                )}
              </div>
            </div>

            {/* Target Platforms */}
            {template.targetPlatforms && template.targetPlatforms.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Target Platforms
                </h4>
                <div className="flex flex-wrap gap-2">
                  {template.targetPlatforms.map((platform) => {
                    const Icon = platformIcons[platform] || Sparkles;
                    return (
                      <Badge key={platform} variant="secondary" className="gap-1 capitalize">
                        <Icon className="w-3 h-3" />
                        {platform}
                      </Badge>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Aspect Ratios */}
            {template.targetAspectRatios && template.targetAspectRatios.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Aspect Ratios</h4>
                <div className="flex flex-wrap gap-2">
                  {template.targetAspectRatios.map((ratio) => (
                    <Badge key={ratio} variant="outline">{ratio}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Best For */}
            {template.bestForObjectives && template.bestForObjectives.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Best For</h4>
                <div className="flex flex-wrap gap-2">
                  {template.bestForObjectives.map((objective) => (
                    <Badge key={objective} variant="secondary" className="capitalize">
                      {objective}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Source */}
            {template.sourceUrl && (
              <div className="pt-2 border-t">
                <a
                  href={template.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  View Original
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6 pt-4 border-t">
          <Button className="flex-1" onClick={onUse}>
            <Sparkles className="w-4 h-4 mr-2" />
            Use This Template
          </Button>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Loading skeleton
function TemplateSkeleton() {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <Skeleton className="aspect-[4/3] w-full" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-6" />
          <Skeleton className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
}

export default function TemplateLibrary() {
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedTemplate, setSelectedTemplate] = useState<PerformingAdTemplate | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Fetch templates
  const { data: templates, isLoading } = useQuery<PerformingAdTemplate[]>({
    queryKey: ["performing-ad-templates"],
    queryFn: async () => {
      const response = await fetch("/api/performing-ad-templates");
      if (!response.ok) throw new Error("Failed to fetch templates");
      return response.json();
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/performing-ad-templates/${id}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete template");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["performing-ad-templates"] });
    },
  });

  // Filter templates
  const filteredTemplates = templates?.filter((template) => {
    const matchesSearch =
      !searchQuery ||
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || template.category === selectedCategory;

    const matchesPlatform =
      selectedPlatform === "all" ||
      template.targetPlatforms?.includes(selectedPlatform);

    return matchesSearch && matchesCategory && matchesPlatform;
  });

  // Get unique categories and platforms
  const categories = ["all", "product_showcase", "installation", "worksite", "professional", "educational"];
  const platforms = ["all", "instagram", "facebook", "linkedin", "twitter", "tiktok"];

  const handleTemplateClick = (template: PerformingAdTemplate) => {
    setSelectedTemplate(template);
    setIsDetailOpen(true);
  };

  const handleDelete = (template: PerformingAdTemplate) => {
    if (confirm(`Delete "${template.name}"? This cannot be undone.`)) {
      deleteMutation.mutate(template.id);
    }
  };

  const handleUseTemplate = () => {
    // Navigate to Studio with template context
    if (selectedTemplate) {
      // Store template in sessionStorage for Studio to pick up
      sessionStorage.setItem("selectedPerformingTemplate", JSON.stringify(selectedTemplate));
      setIsDetailOpen(false);
      setLocation("/?template=" + selectedTemplate.id);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pink-500/5 blur-[120px] rounded-full" />
      </div>

      <Header currentPage="template-library" />

      {/* Content */}
      <main className="container max-w-7xl mx-auto px-4 sm:px-6 pt-24 pb-20 relative z-10">
        {/* Title and Actions */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-display font-bold">Template Library</h1>
            <p className="text-muted-foreground mt-1">
              High-performing ad templates for inspiration
            </p>
          </div>
          <Button className="gap-2" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Template
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="pl-10"
            />
          </div>

          {/* Category Filter */}
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  <span className="capitalize">{category === "all" ? "All Categories" : category}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Platform Filter */}
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((platform) => (
                <SelectItem key={platform} value={platform}>
                  <span className="capitalize">{platform === "all" ? "All Platforms" : platform}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Templates Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <TemplateSkeleton key={i} />
            ))}
          </div>
        ) : !filteredTemplates || filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-secondary flex items-center justify-center">
              <Layout className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
              <h2 className="text-2xl font-display font-medium mb-2">
                {searchQuery || selectedCategory !== "all" || selectedPlatform !== "all"
                  ? "No matching templates"
                  : "No templates yet"}
              </h2>
              <p className="text-muted-foreground">
                {searchQuery || selectedCategory !== "all" || selectedPlatform !== "all"
                  ? "Try adjusting your filters"
                  : "Add high-performing ad templates to build your library"}
              </p>
            </div>
            {!searchQuery && selectedCategory === "all" && selectedPlatform === "all" && (
              <Button className="gap-2" onClick={() => setIsAddModalOpen(true)}>
                <Plus className="w-4 h-4" />
                Add First Template
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            <AnimatePresence mode="popLayout">
              {filteredTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onClick={() => handleTemplateClick(template)}
                  onDelete={() => handleDelete(template)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* Template Detail Modal */}
      <TemplateDetailModal
        template={selectedTemplate}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onUse={handleUseTemplate}
      />

      {/* Add Template Modal */}
      <AddTemplateModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
      />
    </div>
  );
}
