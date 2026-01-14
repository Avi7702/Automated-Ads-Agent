import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { AdSceneTemplate } from "@shared/schema";

interface TemplateCardProps {
  template: AdSceneTemplate;
  onSelect?: (template: AdSceneTemplate) => void;
  isSelected?: boolean;
}

export function TemplateCard({ template, onSelect, isSelected }: TemplateCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = () => {
    if (onSelect) {
      onSelect(template);
    }
  };

  // Get category color (light mode readable + dark mode optimized)
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      product_showcase: "bg-blue-500/5 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 dark:border-blue-500/20",
      professional: "bg-purple-500/5 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 dark:border-purple-500/20",
      installation: "bg-green-500/5 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/30 dark:border-green-500/20",
      worksite: "bg-amber-500/5 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 dark:border-amber-500/20",
      educational: "bg-pink-500/5 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/30 dark:border-pink-500/20",
    };
    return colors[category] || "bg-gray-500/5 dark:bg-gray-500/10 text-gray-600 dark:text-gray-400 border-gray-500/30 dark:border-gray-500/20";
  };

  return (
    <button
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative group w-full aspect-[4/5] rounded-2xl overflow-hidden border-2 transition-all duration-300",
        isSelected
          ? "border-primary ring-2 ring-primary/30 scale-[0.98]"
          : "border-border hover:border-primary/50 hover:scale-[1.02]",
        "shadow-lg hover:shadow-2xl"
      )}
      data-testid={`template-card-${template.id}`}
    >
      {/* Preview Image */}
      <div className="absolute inset-0">
        <img
          src={template.previewImageUrl}
          alt={template.title}
          className={cn(
            "w-full h-full object-cover transition-transform duration-500",
            isHovered && "scale-110"
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
      </div>

      {/* Category Badge - Top Left */}
      <div className="absolute top-3 left-3 z-10">
        <Badge
          variant="outline"
          className={cn(
            "backdrop-blur-sm border",
            getCategoryColor(template.category)
          )}
        >
          {template.category}
        </Badge>
      </div>

      {/* Selection Indicator - Top Right */}
      {isSelected && (
        <div className="absolute top-3 right-3 z-10 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      )}

      {/* Content - Bottom (Always visible) */}
      <div className="absolute bottom-0 left-0 right-0 p-4 z-10">
        <h3 className="text-white font-semibold text-lg mb-1 line-clamp-1">
          {template.title}
        </h3>
        {template.description && (
          <p className="text-white/70 text-sm line-clamp-2 mb-3">
            {template.description}
          </p>
        )}
      </div>

      {/* Hover Overlay - Shows tags and metadata */}
      <div
        className={cn(
          "absolute inset-0 bg-black/95 backdrop-blur-sm transition-opacity duration-300 p-6 flex flex-col justify-between z-20",
          isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
      >
        <div>
          <h3 className="text-white font-semibold text-xl mb-2">
            {template.title}
          </h3>
          {template.description && (
            <p className="text-white/80 text-sm mb-4 line-clamp-3">
              {template.description}
            </p>
          )}

          {/* Tags */}
          {template.tags && template.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {template.tags.slice(0, 4).map((tag, idx) => (
                <span
                  key={idx}
                  className="text-xs px-2 py-1 rounded-md bg-muted/50 text-white/70 border border-border"
                >
                  {tag}
                </span>
              ))}
              {template.tags.length > 4 && (
                <span className="text-xs px-2 py-1 rounded-md bg-muted/50 text-white/70 border border-border">
                  +{template.tags.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Bottom metadata */}
        <div className="space-y-2">
          {/* Lighting Style */}
          {template.lightingStyle && (
            <div className="flex items-center gap-2 text-xs text-white/60">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                />
              </svg>
              <span>{template.lightingStyle} lighting</span>
            </div>
          )}

          {/* Environment */}
          {template.environment && (
            <div className="flex items-center gap-2 text-xs text-white/60">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                />
              </svg>
              <span>{template.environment}</span>
            </div>
          )}

          {/* Global indicator */}
          {template.isGlobal && (
            <div className="pt-2 border-t border-border">
              <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                </svg>
                Global Template
              </span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
