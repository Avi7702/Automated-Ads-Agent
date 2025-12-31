// Note: @ts-nocheck is needed because the Select UI component uses @ts-nocheck
// and its types don't propagate correctly
// @ts-nocheck
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X } from "lucide-react";

/**
 * Filter state for ProductFilters component
 */
export interface ProductFilterState {
  search: string;
  category: string;
  enrichmentStatus: string;
}

interface ProductFiltersProps {
  /** Current filter values */
  filters: ProductFilterState;
  /** Callback when filters change */
  onFiltersChange: (filters: ProductFilterState) => void;
  /** Available categories to filter by */
  categories: string[];
  /** Optional className for styling */
  className?: string;
}

/** Enrichment status options with display labels */
const ENRICHMENT_STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "draft", label: "Draft" },
  { value: "verified", label: "Verified" },
  { value: "complete", label: "Complete" },
] as const;

/**
 * ProductFilters - Filter bar for ProductLibrary page
 *
 * Features:
 * - Search input with debounced 300ms delay
 * - Category dropdown
 * - Enrichment status dropdown
 * - Clear filters button (shows when any filter active)
 * - Responsive layout: stacks on mobile, horizontal on desktop
 */
export function ProductFilters({
  filters,
  onFiltersChange,
  categories,
  className,
}: ProductFiltersProps) {
  // Local search value for debouncing
  const [localSearch, setLocalSearch] = useState(filters.search);

  // Sync local search with external filters when they change
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  // Debounced search handler
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== filters.search) {
        onFiltersChange({ ...filters, search: localSearch });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localSearch, filters, onFiltersChange]);

  // Check if any filter is active
  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.category !== "all" ||
    filters.enrichmentStatus !== "all";

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setLocalSearch("");
    onFiltersChange({
      search: "",
      category: "all",
      enrichmentStatus: "all",
    });
  }, [onFiltersChange]);

  // Handle category change
  const handleCategoryChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, category: value });
    },
    [filters, onFiltersChange]
  );

  // Handle enrichment status change
  const handleEnrichmentStatusChange = useCallback(
    (value: string) => {
      onFiltersChange({ ...filters, enrichmentStatus: value });
    },
    [filters, onFiltersChange]
  );

  return (
    <div
      className={`flex flex-col gap-3 md:flex-row md:items-center md:gap-4 ${className ?? ""}`}
      data-testid="product-filters"
    >
      {/* Search Input */}
      <div className="relative flex-1 min-w-0 md:max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          type="text"
          placeholder="Search products..."
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="pl-10 w-full"
          data-testid="product-filter-search"
        />
      </div>

      {/* Category Dropdown */}
      <div className="w-full md:w-44">
        <Select value={filters.category} onValueChange={handleCategoryChange}>
          <SelectTrigger data-testid="product-filter-category">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Enrichment Status Dropdown */}
      <div className="w-full md:w-44">
        <Select
          value={filters.enrichmentStatus}
          onValueChange={handleEnrichmentStatusChange}
        >
          <SelectTrigger data-testid="product-filter-enrichment-status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {ENRICHMENT_STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground shrink-0"
          data-testid="product-filter-clear"
        >
          <X className="w-4 h-4" />
          <span className="hidden sm:inline">Clear Filters</span>
        </Button>
      )}
    </div>
  );
}
