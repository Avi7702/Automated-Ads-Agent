import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { TemplateCard } from "./TemplateCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Search, Filter, Sparkles, RefreshCw } from "lucide-react";
import type { AdSceneTemplate } from "@shared/schema";

interface TemplateLibraryProps {
  onSelectTemplate?: (template: AdSceneTemplate) => void;
  selectedTemplateId?: string;
  className?: string;
}

const categories = [
  { value: "all", label: "All Templates" },
  { value: "lifestyle", label: "Lifestyle" },
  { value: "professional", label: "Professional" },
  { value: "outdoor", label: "Outdoor" },
  { value: "luxury", label: "Luxury" },
  { value: "seasonal", label: "Seasonal" },
];

export function TemplateLibrary({
  onSelectTemplate,
  selectedTemplateId,
  className,
}: TemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isGlobalOnly, setIsGlobalOnly] = useState(false);

  // Fetch templates
  const {
    data: templates = [],
    isLoading,
    error,
    refetch,
    isRefetching,
  } = useQuery<AdSceneTemplate[]>({
    queryKey: ["templates", selectedCategory, isGlobalOnly],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (selectedCategory !== "all") {
        params.set("category", selectedCategory);
      }
      if (isGlobalOnly) {
        params.set("isGlobal", "true");
      }

      const url = `/api/ad-templates${params.toString() ? `?${params.toString()}` : ""}`;
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error("Failed to fetch templates");
      }
      // API returns array directly
      return await res.json();
    },
  });

  // Filter templates by search query (client-side)
  const filteredTemplates = templates.filter((template) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    return (
      template.title.toLowerCase().includes(query) ||
      template.description?.toLowerCase().includes(query) ||
      template.tags?.some((tag) => tag.toLowerCase().includes(query)) ||
      template.category.toLowerCase().includes(query)
    );
  });

  const handleSelectTemplate = (template: AdSceneTemplate) => {
    if (onSelectTemplate) {
      onSelectTemplate(template);
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-display font-semibold flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            Template Library
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {filteredTemplates.length} template{filteredTemplates.length !== 1 ? "s" : ""} available
            {selectedCategory !== "all" && ` in ${selectedCategory}`}
          </p>
        </div>

        {/* Refresh button */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
          data-testid="button-refresh-templates"
        >
          <RefreshCw className={cn("w-4 h-4 mr-2", isRefetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search templates by name, description, or tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
            data-testid="input-search-templates"
          />
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Filter className="w-4 h-4" />
            <span className="font-medium">Category:</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {categories.map((category) => (
              <button
                key={category.value}
                onClick={() => setSelectedCategory(category.value)}
                className={cn(
                  "px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                  selectedCategory === category.value
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                    : "bg-card border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/30"
                )}
                data-testid={`button-category-${category.value}`}
              >
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Global Filter Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsGlobalOnly(!isGlobalOnly)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
              isGlobalOnly
                ? "bg-primary/20 text-primary border border-primary/30"
                : "bg-card border border-white/10 text-muted-foreground hover:text-foreground hover:border-white/30"
            )}
            data-testid="button-toggle-global"
          >
            <svg
              className="w-4 h-4"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
            {isGlobalOnly ? "Global Templates Only" : "Show Global Only"}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-t-2 border-primary animate-spin" />
            <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin-slow" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Failed to load templates</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error instanceof Error ? error.message : "Unknown error"}
          </p>
          <Button variant="outline" onClick={() => refetch()}>
            Try Again
          </Button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No templates found</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery
              ? `No templates match "${searchQuery}"`
              : selectedCategory !== "all"
                ? `No templates in the ${selectedCategory} category`
                : "No templates available"}
          </p>
          {(searchQuery || selectedCategory !== "all" || isGlobalOnly) && (
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setIsGlobalOnly(false);
              }}
            >
              Clear Filters
            </Button>
          )}
        </div>
      )}

      {/* Templates Grid */}
      {!isLoading && !error && filteredTemplates.length > 0 && (
        <AnimatePresence mode="sync">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
            data-testid="templates-grid"
          >
            {filteredTemplates.map((template) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <TemplateCard
                  template={template}
                  onSelect={handleSelectTemplate}
                  isSelected={selectedTemplateId === template.id}
                />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
