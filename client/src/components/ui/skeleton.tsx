/**
 * Phase 4A: Premium Skeleton Component
 *
 * OKLCH-based shimmer skeleton with multiple shape variants.
 * Backward compatible — the default `Skeleton` export works exactly
 * as before, while `SkeletonShimmer` adds the premium shimmer effect.
 *
 * Usage:
 *   import { Skeleton, SkeletonShimmer } from '@/components/ui/skeleton';
 *
 *   <Skeleton className="h-4 w-48" />                    // basic pulse
 *   <SkeletonShimmer variant="text" className="w-48" />  // premium shimmer
 *   <SkeletonShimmer variant="circle" size={48} />
 *   <SkeletonShimmer variant="rect" className="h-32" />
 *   <SkeletonShimmer variant="card" />
 */

import { cn } from '@/lib/utils';

/* ────────────────────────────────────────
   Original Skeleton (backward compat)
   ──────────────────────────────────────── */

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('animate-pulse rounded-md bg-primary/10', className)} {...props} />;
}

/* ────────────────────────────────────────
   Premium Shimmer Skeleton
   ──────────────────────────────────────── */

type SkeletonVariant = 'text' | 'circle' | 'rect' | 'card';

interface SkeletonShimmerProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Shape variant */
  variant?: SkeletonVariant;
  /** Width/height for circle variant (px) */
  size?: number;
  /** Number of text lines for text variant */
  lines?: number;
}

/** Map variant to default dimensions and border-radius */
const variantStyles: Record<SkeletonVariant, string> = {
  text: 'h-4 w-full rounded',
  circle: 'rounded-full',
  rect: 'h-24 w-full rounded-lg',
  card: 'h-40 w-full rounded-xl',
};

function SkeletonShimmer({ variant = 'rect', size, lines = 1, className, style, ...props }: SkeletonShimmerProps) {
  const baseClass = variantStyles[variant];

  // Circle variant uses explicit width/height from `size`
  const circleSize = variant === 'circle' && size ? { width: size, height: size } : {};

  // Text variant: render multiple lines
  if (variant === 'text' && lines > 1) {
    return (
      <div className="flex flex-col gap-2" {...props}>
        {Array.from({ length: lines }, (_, i) => (
          <div
            key={i}
            className={cn(
              'skeleton-shimmer',
              baseClass,
              // Last line is shorter for visual variety
              i === lines - 1 && 'w-3/4',
              className,
            )}
            style={style}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn('skeleton-shimmer', baseClass, className)} style={{ ...circleSize, ...style }} {...props} />
  );
}

export { Skeleton, SkeletonShimmer };
export default Skeleton;
