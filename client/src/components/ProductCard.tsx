import { useState } from "react";
import { Pencil, Sparkles, Trash2, ImageOff } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, getProductImageUrl } from "@/lib/utils";
import type { Product } from "@shared/schema";

export type EnrichmentStatus = "pending" | "draft" | "verified" | "complete";

export interface ProductCardProps {
  product: Product;
  onClick?: (product: Product) => void;
  onDelete?: (product: Product) => void;
  onEnrich?: (product: Product) => void;
  isLoading?: boolean;
  className?: string;
}

// Skeleton loader for ProductCard
export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <Skeleton className="aspect-square w-full" />
      <CardContent className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <div className="flex gap-1">
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-14" />
          <Skeleton className="h-4 w-10" />
        </div>
      </CardContent>
    </Card>
  );
}

// Get enrichment status badge styling
function getEnrichmentStatusConfig(status: EnrichmentStatus | string | null | undefined) {
  const configs: Record<EnrichmentStatus, { label: string; className: string }> = {
    complete: {
      label: "Complete",
      className: "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400",
    },
    verified: {
      label: "Verified",
      className: "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400",
    },
    draft: {
      label: "Draft",
      className: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
    },
    pending: {
      label: "Pending",
      className: "bg-gray-500/10 text-gray-600 border-gray-500/30 dark:text-gray-400",
    },
  };

  const key = (status || "pending") as EnrichmentStatus;
  return configs[key] || configs.pending;
}

// Get category badge styling
function getCategoryColor(category: string | null | undefined) {
  if (!category) return "bg-muted/50 text-muted-foreground border-border";

  const colors: Record<string, string> = {
    flooring: "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400",
    furniture: "bg-blue-500/10 text-blue-600 border-blue-500/30 dark:text-blue-400",
    decor: "bg-purple-500/10 text-purple-600 border-purple-500/30 dark:text-purple-400",
    fixture: "bg-cyan-500/10 text-cyan-600 border-cyan-500/30 dark:text-cyan-400",
    lighting: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30 dark:text-yellow-400",
    appliance: "bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400",
    textile: "bg-pink-500/10 text-pink-600 border-pink-500/30 dark:text-pink-400",
    outdoor: "bg-green-500/10 text-green-600 border-green-500/30 dark:text-green-400",
  };

  return colors[category.toLowerCase()] || "bg-muted/50 text-muted-foreground border-border";
}

export function ProductCard({
  product,
  onClick,
  onDelete,
  onEnrich,
  isLoading = false,
  className,
}: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  if (isLoading) {
    return <ProductCardSkeleton className={className} />;
  }

  const enrichmentConfig = getEnrichmentStatusConfig(product.enrichmentStatus);
  const tags = product.tags || [];
  const maxVisibleTags = 3;
  const visibleTags = tags.slice(0, maxVisibleTags);
  const remainingTagsCount = tags.length - maxVisibleTags;

  const handleCardClick = () => {
    if (onClick) {
      onClick(product);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(product);
    }
  };

  const handleEnrichClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEnrich) {
      onEnrich(product);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(product);
    }
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden cursor-pointer transition-all duration-300",
        "hover:scale-[1.02] hover:shadow-xl",
        "border-2 border-transparent hover:border-primary/30",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
      data-testid={`product-card-${product.id}`}
    >
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden bg-muted">
        {imageError || !product.cloudinaryUrl ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted text-muted-foreground">
            <ImageOff className="w-12 h-12 mb-2 opacity-50" />
            <span className="text-sm">No image</span>
          </div>
        ) : (
          <img
            src={getProductImageUrl(product.cloudinaryUrl)}
            alt={product.name}
            className={cn(
              "w-full h-full object-cover transition-transform duration-500",
              isHovered && "scale-110"
            )}
            onError={() => setImageError(true)}
            loading="lazy"
          />
        )}

        {/* Hover Overlay with Action Buttons */}
        <div
          className={cn(
            "absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center gap-2 transition-opacity duration-300",
            isHovered ? "opacity-100" : "opacity-0 pointer-events-none"
          )}
        >
          {onClick && (
            <Button
              variant="secondary"
              size="icon"
              onClick={handleEditClick}
              className="h-10 w-10 rounded-full bg-background/90 hover:bg-background text-foreground"
              title="Edit product"
              data-testid={`product-card-edit-${product.id}`}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {onEnrich && (
            <Button
              variant="secondary"
              size="icon"
              onClick={handleEnrichClick}
              className="h-10 w-10 rounded-full bg-primary/90 hover:bg-primary text-primary-foreground"
              title="Enrich product"
              data-testid={`product-card-enrich-${product.id}`}
            >
              <Sparkles className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="destructive"
              size="icon"
              onClick={handleDeleteClick}
              className="h-10 w-10 rounded-full"
              title="Delete product"
              data-testid={`product-card-delete-${product.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Enrichment Status Badge - Top Right */}
        <div className="absolute top-3 right-3 z-10">
          <Badge
            variant="outline"
            className={cn(
              "backdrop-blur-sm border text-xs font-medium",
              enrichmentConfig.className
            )}
          >
            {enrichmentConfig.label}
          </Badge>
        </div>
      </div>

      {/* Card Content */}
      <CardContent className="p-4 space-y-3">
        {/* Product Name */}
        <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {product.name}
        </h3>

        {/* Category Badge */}
        {product.category && (
          <Badge
            variant="outline"
            className={cn("text-xs capitalize", getCategoryColor(product.category))}
          >
            {product.category}
          </Badge>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {visibleTags.map((tag, index) => (
              <span
                key={index}
                className="text-xs px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground border border-border"
              >
                {tag}
              </span>
            ))}
            {remainingTagsCount > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground border border-border">
                +{remainingTagsCount} more
              </span>
            )}
          </div>
        )}

        {/* Description Preview */}
        {product.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">
            {product.description}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default ProductCard;
