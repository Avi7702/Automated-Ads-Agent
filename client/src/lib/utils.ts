import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Normalize product image URLs to ensure they load correctly.
 * - Shopify URLs with {width}x placeholder are replaced with actual width
 * - Fake placeholder Cloudinary URLs get a fallback
 * - Valid Cloudinary URLs pass through unchanged
 */
export function getProductImageUrl(url: string | null | undefined, width: number = 800): string {
  const fallback = "https://placehold.co/400x400/1a1a2e/ffffff?text=No+Image";

  if (!url) return fallback;

  // Handle Shopify URLs with {width} placeholder (e.g., nextdaysteel.co.uk)
  if (url.includes("{width}")) {
    return url.replace("{width}", String(width));
  }

  // Handle fake placeholder Cloudinary URLs
  if (url.includes("res.cloudinary.com/placeholder")) {
    return fallback;
  }

  return url;
}
