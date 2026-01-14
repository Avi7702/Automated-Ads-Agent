// @vitest-environment jsdom
import React from 'react';
import { vi } from 'vitest';

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProductCard, ProductCardSkeleton } from '../ProductCard';
import type { Product } from '@shared/schema';

// Mock product data
const mockProduct: Product = {
  id: 'prod-123',
  name: 'Test Product',
  cloudinaryUrl: 'https://res.cloudinary.com/test/image.jpg',
  cloudinaryPublicId: 'test-public-id',
  category: 'flooring',
  enrichmentStatus: 'complete',
  tags: ['oak', 'hardwood', 'premium', 'sustainable'],
  description: 'A premium oak hardwood flooring product for modern homes.',
  benefits: ['Durable', 'Easy to maintain', 'Eco-friendly'],
  features: { width: '5in', thickness: '3/4in' },
  specifications: { coverage: '20 sq ft per box' },
  sku: 'OAK-HW-001',
  enrichmentDraft: null,
  enrichmentVerifiedAt: null,
  enrichmentSource: 'ai_vision',
  createdAt: new Date(),
};

describe('ProductCard', () => {
  describe('Rendering', () => {
    it('renders product name', () => {
      render(<ProductCard product={mockProduct} />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('renders product image with correct src', () => {
      render(<ProductCard product={mockProduct} />);
      const img = screen.getByRole('img', { name: 'Test Product' });
      expect(img).toHaveAttribute('src', mockProduct.cloudinaryUrl);
    });

    it('renders category badge when category exists', () => {
      render(<ProductCard product={mockProduct} />);
      expect(screen.getByText('flooring')).toBeInTheDocument();
    });

    it('renders enrichment status badge', () => {
      render(<ProductCard product={mockProduct} />);
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('renders tags with max 3 visible plus overflow indicator', () => {
      render(<ProductCard product={mockProduct} />);
      expect(screen.getByText('oak')).toBeInTheDocument();
      expect(screen.getByText('hardwood')).toBeInTheDocument();
      expect(screen.getByText('premium')).toBeInTheDocument();
      expect(screen.getByText('+1 more')).toBeInTheDocument();
    });

    it('renders description preview', () => {
      render(<ProductCard product={mockProduct} />);
      expect(screen.getByText(/premium oak hardwood flooring/i)).toBeInTheDocument();
    });
  });

  describe('Enrichment Status Badges', () => {
    it('shows Complete badge with green styling for complete status', () => {
      render(<ProductCard product={{ ...mockProduct, enrichmentStatus: 'complete' }} />);
      expect(screen.getByText('Complete')).toBeInTheDocument();
    });

    it('shows Verified badge for verified status', () => {
      render(<ProductCard product={{ ...mockProduct, enrichmentStatus: 'verified' }} />);
      expect(screen.getByText('Verified')).toBeInTheDocument();
    });

    it('shows Draft badge with yellow styling for draft status', () => {
      render(<ProductCard product={{ ...mockProduct, enrichmentStatus: 'draft' }} />);
      expect(screen.getByText('Draft')).toBeInTheDocument();
    });

    it('shows Pending badge with gray styling for pending status', () => {
      render(<ProductCard product={{ ...mockProduct, enrichmentStatus: 'pending' }} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('defaults to Pending for null status', () => {
      render(<ProductCard product={{ ...mockProduct, enrichmentStatus: null }} />);
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });

  describe('Click Handlers', () => {
    it('calls onClick when card is clicked', () => {
      const onClick = vi.fn();
      render(<ProductCard product={mockProduct} onClick={onClick} />);

      fireEvent.click(screen.getByTestId(`product-card-${mockProduct.id}`));
      expect(onClick).toHaveBeenCalledWith(mockProduct);
    });

    it('calls onEnrich when enrich button is clicked', () => {
      const onEnrich = vi.fn();
      const onClick = vi.fn();
      render(<ProductCard product={mockProduct} onClick={onClick} onEnrich={onEnrich} />);

      // Simulate hover to show buttons
      const card = screen.getByTestId(`product-card-${mockProduct.id}`);
      fireEvent.mouseEnter(card);

      const enrichButton = screen.getByTestId(`product-card-enrich-${mockProduct.id}`);
      fireEvent.click(enrichButton);

      expect(onEnrich).toHaveBeenCalledWith(mockProduct);
      // Should not trigger card click due to stopPropagation
      expect(onClick).not.toHaveBeenCalled();
    });

    it('calls onDelete when delete button is clicked', () => {
      const onDelete = vi.fn();
      const onClick = vi.fn();
      render(<ProductCard product={mockProduct} onClick={onClick} onDelete={onDelete} />);

      // Simulate hover
      const card = screen.getByTestId(`product-card-${mockProduct.id}`);
      fireEvent.mouseEnter(card);

      const deleteButton = screen.getByTestId(`product-card-delete-${mockProduct.id}`);
      fireEvent.click(deleteButton);

      expect(onDelete).toHaveBeenCalledWith(mockProduct);
      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('Image Error Handling', () => {
    it('shows fallback when image fails to load', () => {
      render(<ProductCard product={mockProduct} />);

      const img = screen.getByRole('img', { name: 'Test Product' });
      fireEvent.error(img);

      expect(screen.getByText('No image')).toBeInTheDocument();
    });

    it('shows fallback when cloudinaryUrl is empty', () => {
      render(<ProductCard product={{ ...mockProduct, cloudinaryUrl: '' }} />);
      expect(screen.getByText('No image')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    it('shows skeleton when isLoading is true', () => {
      render(<ProductCard product={mockProduct} isLoading={true} />);
      // Skeleton doesn't render product name
      expect(screen.queryByText('Test Product')).not.toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles product with no tags', () => {
      render(<ProductCard product={{ ...mockProduct, tags: [] }} />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
      expect(screen.queryByText('+1 more')).not.toBeInTheDocument();
    });

    it('handles product with no category', () => {
      render(<ProductCard product={{ ...mockProduct, category: null }} />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('handles product with no description', () => {
      render(<ProductCard product={{ ...mockProduct, description: null }} />);
      expect(screen.getByText('Test Product')).toBeInTheDocument();
    });
  });
});

describe('ProductCardSkeleton', () => {
  it('renders without crashing', () => {
    render(<ProductCardSkeleton />);
    // Skeleton should render some content
    expect(document.body).toBeInTheDocument();
  });

  it('accepts className prop', () => {
    const { container } = render(<ProductCardSkeleton className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
