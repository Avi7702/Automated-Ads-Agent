import { useState, type ImgHTMLAttributes } from 'react';
import { cn, getProductImageUrl } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  /** Raw image URL (Cloudinary transforms applied automatically) */
  src: string | null | undefined;
  /** Image width for Cloudinary transform and CLS prevention */
  width?: number;
  /** Image height for CLS prevention */
  height?: number;
  /** Fallback text shown in placeholder */
  fallbackText?: string;
}

/**
 * OptimizedImage — Wrapper that applies Cloudinary transforms,
 * lazy loading, async decoding, and skeleton placeholder.
 * Prevents CLS by providing explicit width/height.
 */
export function OptimizedImage({
  src,
  width = 400,
  height,
  fallbackText = 'No Image',
  className,
  alt = '',
  ...props
}: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const optimizedSrc = getProductImageUrl(src, width);
  const aspectHeight = height || width; // Default to square if no height

  if (error || !src) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-muted text-muted-foreground text-xs',
          className
        )}
        style={{ width, height: aspectHeight }}
        role="img"
        aria-label={fallbackText}
      >
        {fallbackText}
      </div>
    );
  }

  return (
    <div className="relative" style={{ width, height: aspectHeight }}>
      {!loaded && (
        <Skeleton
          className={cn('absolute inset-0', className)}
          style={{ width, height: aspectHeight }}
        />
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        width={width}
        height={aspectHeight}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        className={cn(
          'transition-opacity duration-200',
          loaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        {...props}
      />
    </div>
  );
}
