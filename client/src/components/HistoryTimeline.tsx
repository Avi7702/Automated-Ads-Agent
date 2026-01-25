import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { History, Star, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { GenerationDTO } from "@shared/types/api";
import { useHaptic } from "@/hooks/useHaptic";

interface HistoryTimelineProps {
  currentGenerationId?: string | null;
  onSelect: (generation: GenerationDTO) => void;
  className?: string;
}

export function HistoryTimeline({
  currentGenerationId,
  onSelect,
  className,
}: HistoryTimelineProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [clickedId, setClickedId] = useState<string | null>(null);
  const { haptic } = useHaptic();

  // Fetch recent generations
  const { data: generations = [], isLoading } = useQuery<GenerationDTO[]>({
    queryKey: ["generations"],
    queryFn: async () => {
      const res = await fetch("/api/generations?limit=20");
      if (!res.ok) return [];
      return res.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Check scroll state
  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  // Scroll handlers
  const scrollLeft = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: -200, behavior: "smooth" });
  };

  const scrollRight = () => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: 200, behavior: "smooth" });
  };

  // Format relative time
  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className={cn("p-4 rounded-xl border border-border bg-card/30", className)}>
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Recent Generations</span>
        </div>
        <div className="flex gap-3 overflow-hidden">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-20 h-20 rounded-lg bg-muted/30 animate-pulse flex-shrink-0"
            />
          ))}
        </div>
      </div>
    );
  }

  if (generations.length === 0) {
    return (
      <div className={cn("p-4 rounded-xl border border-border bg-card/30", className)}>
        <div className="flex items-center gap-2 mb-3">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Recent Generations</span>
        </div>
        <p className="text-sm text-muted-foreground text-center py-4">
          No generations yet. Create your first image to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className={cn("p-4 rounded-xl border border-border bg-card/30", className)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Recent Generations</span>
          <span className="text-xs text-muted-foreground">({generations.length})</span>
        </div>

        {/* Scroll Controls */}
        <div className="flex gap-1">
          <button
            onClick={scrollLeft}
            disabled={!canScrollLeft}
            className={cn(
              "p-1 rounded-md transition-colors",
              canScrollLeft
                ? "hover:bg-muted/50 text-foreground"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={scrollRight}
            disabled={!canScrollRight}
            className={cn(
              "p-1 rounded-md transition-colors",
              canScrollRight
                ? "hover:bg-muted/50 text-foreground"
                : "text-muted-foreground/30 cursor-not-allowed"
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Timeline Scroll Container */}
      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent"
        style={{ scrollbarWidth: "thin" }}
      >
        <AnimatePresence mode="popLayout">
          {generations.map((generation, index) => {
            const isCurrent = generation.id === currentGenerationId;
            const isEdit = !!generation.parentGenerationId;

            return (
              <motion.button
                key={generation.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  haptic('light');
                  setClickedId(generation.id);
                  setTimeout(() => setClickedId(null), 300);
                  onSelect(generation);
                }}
                className={cn(
                  "relative flex-shrink-0 group",
                  "w-20 h-20 rounded-lg overflow-hidden",
                  "border-2 transition-all",
                  isCurrent
                    ? "border-primary ring-2 ring-primary/30"
                    : "border-border hover:border-primary/50",
                  clickedId === generation.id && "ring-4 ring-primary/50"
                )}
              >
                {/* Thumbnail */}
                <img
                  src={generation.imageUrl}
                  alt={generation.prompt?.slice(0, 30) || "Generated"}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Current Indicator */}
                {isCurrent && (
                  <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Star className="w-3 h-3 text-primary-foreground fill-current" />
                  </div>
                )}

                {/* Edit Badge */}
                {isEdit && !isCurrent && (
                  <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] bg-primary/80 text-primary-foreground">
                    Edit
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-background/90 dark:bg-background/95 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-1">
                  <Clock className="w-3 h-3 text-muted-foreground mb-1" />
                  <span className="text-[10px] text-foreground font-medium text-center">
                    {formatTime(generation.createdAt)}
                  </span>
                </div>

                {/* Bottom Gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background/90 dark:from-background/95 to-transparent pointer-events-none" />

                {/* Version Number */}
                <span className="absolute bottom-1 left-1 text-[10px] text-foreground font-medium drop-shadow-sm">
                  v{generations.length - index}
                </span>
              </motion.button>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Hint Text */}
      <p className="text-xs text-muted-foreground mt-2">
        Click any version to load it. Starred = current.
      </p>
    </div>
  );
}
