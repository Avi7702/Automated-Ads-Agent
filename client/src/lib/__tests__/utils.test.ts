/**
 * Tests for lib/utils.ts
 * - cn() class merging utility
 * - getProductImageUrl() image URL normalization
 */
import { describe, it, expect } from 'vitest';
import { cn, getProductImageUrl } from '@/lib/utils';

describe('cn()', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
    expect(cn('foo', true && 'bar')).toBe('foo bar');
  });

  it('resolves Tailwind conflicts — last wins', () => {
    expect(cn('p-4', 'p-8')).toBe('p-8');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles undefined and null inputs', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar');
  });

  it('handles empty string', () => {
    expect(cn('')).toBe('');
  });

  it('handles arrays of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('handles object syntax', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('handles no arguments', () => {
    expect(cn()).toBe('');
  });
});

describe('getProductImageUrl()', () => {
  const fallback = 'https://placehold.co/400x400/e5e5e5/525252?text=No+Image';

  it('returns fallback for null', () => {
    expect(getProductImageUrl(null)).toBe(fallback);
  });

  it('returns fallback for undefined', () => {
    expect(getProductImageUrl(undefined)).toBe(fallback);
  });

  it('returns fallback for empty string', () => {
    expect(getProductImageUrl('')).toBe(fallback);
  });

  it('replaces {width} placeholder with default 800', () => {
    const url = 'https://cdn.shopify.com/s/files/product_{width}x.jpg';
    expect(getProductImageUrl(url)).toBe('https://cdn.shopify.com/s/files/product_800x.jpg');
  });

  it('replaces {width} placeholder with custom width', () => {
    const url = 'https://cdn.shopify.com/s/files/product_{width}x.jpg';
    expect(getProductImageUrl(url, 400)).toBe('https://cdn.shopify.com/s/files/product_400x.jpg');
  });

  it('replaces URL-encoded {width} placeholder', () => {
    const url = 'https://cdn.shopify.com/s/files/product_%7Bwidth%7Dx.jpg';
    expect(getProductImageUrl(url)).toBe('https://cdn.shopify.com/s/files/product_800x.jpg');
  });

  it('returns fallback for fake placeholder Cloudinary URL', () => {
    const url = 'https://res.cloudinary.com/placeholder/image/upload/sample.jpg';
    expect(getProductImageUrl(url)).toBe(fallback);
  });

  it('adds optimization transforms for real Cloudinary URLs', () => {
    const url = 'https://res.cloudinary.com/demoapp/image/upload/sample.jpg';
    expect(getProductImageUrl(url)).toBe(
      'https://res.cloudinary.com/demoapp/image/upload/f_auto,q_auto,w_800/sample.jpg',
    );
  });

  it('does NOT add transforms if already has f_auto', () => {
    const url = 'https://res.cloudinary.com/demoapp/image/upload/f_auto,q_auto/sample.jpg';
    expect(getProductImageUrl(url)).toBe(url);
  });

  it('adds transforms with custom width for Cloudinary', () => {
    const url = 'https://res.cloudinary.com/demoapp/image/upload/sample.jpg';
    expect(getProductImageUrl(url, 400)).toBe(
      'https://res.cloudinary.com/demoapp/image/upload/f_auto,q_auto,w_400/sample.jpg',
    );
  });

  it('returns non-Cloudinary/Shopify URLs unchanged', () => {
    const url = 'https://example.com/image.jpg';
    expect(getProductImageUrl(url)).toBe(url);
  });

  it('handles a plain HTTP URL', () => {
    const url = 'http://example.com/photo.png';
    expect(getProductImageUrl(url)).toBe(url);
  });
});
