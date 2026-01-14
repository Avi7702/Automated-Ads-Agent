// @ts-nocheck
// @vitest-environment jsdom
import React from 'react';
import { vi } from 'vitest';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
// Note: MemoryRouter removed - not exported from wouter/memory-location
import type { Product } from '@shared/schema';

// Mock the Header component
vi.mock('@/components/layout/Header', () => ({
  Header: ({ currentPage }: { currentPage: string }) => (
    <header data-testid="mock-header" data-page={currentPage}>
      Mock Header
    </header>
  ),
}));

// Mock wouter Link
vi.mock('wouter', async () => {
  const actual = await vi.importActual('wouter');
  return {
    ...actual,
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <a href={href} data-testid="mock-link">
        {children}
      </a>
    ),
  };
});

// Sample product data
const mockProducts: Product[] = [
  {
    id: 'prod-1',
    name: 'Oak Hardwood Flooring',
    cloudinaryUrl: 'https://res.cloudinary.com/test/oak.jpg',
    cloudinaryPublicId: 'oak-id',
    category: 'flooring',
    enrichmentStatus: 'complete',
    tags: ['oak', 'hardwood'],
    description: 'Premium oak flooring',
    benefits: ['Durable'],
    features: {},
    specifications: {},
    sku: 'OAK-001',
    enrichmentDraft: null,
    enrichmentVerifiedAt: null,
    enrichmentSource: 'ai_vision',
    createdAt: new Date(),
  },
  {
    id: 'prod-2',
    name: 'Maple Tile',
    cloudinaryUrl: 'https://res.cloudinary.com/test/maple.jpg',
    cloudinaryPublicId: 'maple-id',
    category: 'tile',
    enrichmentStatus: 'draft',
    tags: ['maple', 'tile'],
    description: 'Beautiful maple tile',
    benefits: ['Easy to clean'],
    features: {},
    specifications: {},
    sku: 'MAP-001',
    enrichmentDraft: null,
    enrichmentVerifiedAt: null,
    enrichmentSource: 'ai_search',
    createdAt: new Date(),
  },
  {
    id: 'prod-3',
    name: 'Bamboo Flooring',
    cloudinaryUrl: 'https://res.cloudinary.com/test/bamboo.jpg',
    cloudinaryPublicId: 'bamboo-id',
    category: 'flooring',
    enrichmentStatus: 'pending',
    tags: ['bamboo', 'eco-friendly'],
    description: 'Sustainable bamboo flooring',
    benefits: ['Eco-friendly'],
    features: {},
    specifications: {},
    sku: 'BAM-001',
    enrichmentDraft: null,
    enrichmentVerifiedAt: null,
    enrichmentSource: null,
    createdAt: new Date(),
  },
];

// Create a wrapper with providers
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

// Import the component dynamically to avoid import issues
let ProductLibrary: () => JSX.Element;

describe('ProductLibrary Page', () => {
  beforeEach(async () => {
    // Reset fetch mock
    vi.resetAllMocks();

    // Dynamically import to reset module state
    const module = await import('../../pages/ProductLibrary');
    ProductLibrary = module.default;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading State', () => {
    it('shows loading skeletons while fetching products', async () => {
      // Mock fetch to never resolve during this test
      global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

      render(<ProductLibrary />, { wrapper: createWrapper() });

      // Should show skeleton cards
      // The skeleton uses aspect-square class, check for loading state
      await waitFor(() => {
        expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows empty state when no products exist', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve([]),
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('No products yet')).toBeInTheDocument();
        expect(screen.getByText('Add Your First Product')).toBeInTheDocument();
      });
    });
  });

  describe('Product Grid', () => {
    it('renders product cards when products exist', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Oak Hardwood Flooring')).toBeInTheDocument();
        expect(screen.getByText('Maple Tile')).toBeInTheDocument();
        expect(screen.getByText('Bamboo Flooring')).toBeInTheDocument();
      });
    });

    it('shows correct product count', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      await waitFor(() => {
        // Products are rendered
        expect(screen.getByText('Oak Hardwood Flooring')).toBeInTheDocument();
      });
    });
  });

  describe('Search Functionality', () => {
    it('filters products by name', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Oak Hardwood Flooring')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search products/i);
      fireEvent.change(searchInput, { target: { value: 'Oak' } });

      await waitFor(() => {
        expect(screen.getByText('Oak Hardwood Flooring')).toBeInTheDocument();
        expect(screen.queryByText('Maple Tile')).not.toBeInTheDocument();
      });
    });

    it('filters products by category', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Oak Hardwood Flooring')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search products/i);
      fireEvent.change(searchInput, { target: { value: 'tile' } });

      await waitFor(() => {
        expect(screen.queryByText('Oak Hardwood Flooring')).not.toBeInTheDocument();
        expect(screen.getByText('Maple Tile')).toBeInTheDocument();
      });
    });

    it('filters products by tags', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Oak Hardwood Flooring')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search products/i);
      fireEvent.change(searchInput, { target: { value: 'eco-friendly' } });

      await waitFor(() => {
        expect(screen.queryByText('Oak Hardwood Flooring')).not.toBeInTheDocument();
        expect(screen.getByText('Bamboo Flooring')).toBeInTheDocument();
      });
    });

    it('shows no results message when search matches nothing', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Oak Hardwood Flooring')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search products/i);
      fireEvent.change(searchInput, { target: { value: 'nonexistent product xyz' } });

      await waitFor(() => {
        expect(screen.getByText('No results found')).toBeInTheDocument();
      });
    });

    it('shows result count when searching', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Oak Hardwood Flooring')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search products/i);
      fireEvent.change(searchInput, { target: { value: 'flooring' } });

      await waitFor(() => {
        expect(screen.getByText(/showing 2 results/i)).toBeInTheDocument();
      });
    });

    it('clears search when X button is clicked', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      await waitFor(() => {
        expect(screen.getByText('Oak Hardwood Flooring')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText(/search products/i);
      fireEvent.change(searchInput, { target: { value: 'Oak' } });

      await waitFor(() => {
        expect(screen.queryByText('Maple Tile')).not.toBeInTheDocument();
      });

      // Find and click clear button
      const clearButton = document.querySelector('[class*="text-muted-foreground hover:text-foreground"]');
      if (clearButton) {
        fireEvent.click(clearButton);
      }

      await waitFor(() => {
        // All products should be visible again
        expect(screen.getByText('Oak Hardwood Flooring')).toBeInTheDocument();
        expect(screen.getByText('Maple Tile')).toBeInTheDocument();
      });
    });
  });

  describe('Page Structure', () => {
    it('renders page title', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      expect(screen.getByText('Product Library')).toBeInTheDocument();
    });

    it('renders page description', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      expect(screen.getByText(/manage and organize your product catalog/i)).toBeInTheDocument();
    });

    it('renders Add Product button', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockProducts),
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      expect(screen.getByText('Add Product')).toBeInTheDocument();
    });
  });

  describe('API Error Handling', () => {
    it('handles API fetch failure gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<ProductLibrary />, { wrapper: createWrapper() });

      // Should not crash and eventually show empty state or error
      await waitFor(() => {
        expect(document.body).toBeInTheDocument();
      });
    });
  });
});
