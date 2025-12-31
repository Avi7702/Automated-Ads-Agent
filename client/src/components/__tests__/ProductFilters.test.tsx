// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProductFilters, ProductFilterState } from '../ProductFilters';

describe('ProductFilters', () => {
  const mockCategories = ['flooring', 'furniture', 'decor', 'lighting'];
  const defaultFilters: ProductFilterState = {
    search: '',
    category: 'all',
    enrichmentStatus: 'all',
  };

  let mockOnFiltersChange: (filters: ProductFilterState) => void;

  beforeEach(() => {
    mockOnFiltersChange = vi.fn();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Rendering', () => {
    it('renders search input', () => {
      render(
        <ProductFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      expect(screen.getByTestId('product-filter-search')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Search products...')).toBeInTheDocument();
    });

    it('renders category dropdown', () => {
      render(
        <ProductFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      expect(screen.getByTestId('product-filter-category')).toBeInTheDocument();
    });

    it('renders enrichment status dropdown', () => {
      render(
        <ProductFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      expect(screen.getByTestId('product-filter-enrichment-status')).toBeInTheDocument();
    });

    it('does not show clear button when no filters are active', () => {
      render(
        <ProductFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      expect(screen.queryByTestId('product-filter-clear')).not.toBeInTheDocument();
    });
  });

  describe('Search Input', () => {
    it('displays current search value', () => {
      render(
        <ProductFilters
          filters={{ ...defaultFilters, search: 'oak' }}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      expect(screen.getByTestId('product-filter-search')).toHaveValue('oak');
    });

    it('debounces search input by 300ms', async () => {
      render(
        <ProductFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      const searchInput = screen.getByTestId('product-filter-search');
      fireEvent.change(searchInput, { target: { value: 'test' } });

      // Should not be called immediately
      expect(mockOnFiltersChange).not.toHaveBeenCalled();

      // Advance timers by 300ms using async version for React state updates
      await vi.advanceTimersByTimeAsync(300);

      // Now it should be called
      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        ...defaultFilters,
        search: 'test',
      });
    });

    it('does not call onFiltersChange if search value unchanged', async () => {
      render(
        <ProductFilters
          filters={{ ...defaultFilters, search: 'existing' }}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      const searchInput = screen.getByTestId('product-filter-search');
      // Type the same value
      fireEvent.change(searchInput, { target: { value: 'existing' } });

      vi.advanceTimersByTime(300);

      expect(mockOnFiltersChange).not.toHaveBeenCalled();
    });
  });

  describe('Clear Filters Button', () => {
    it('shows clear button when search has value', () => {
      render(
        <ProductFilters
          filters={{ ...defaultFilters, search: 'test' }}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      expect(screen.getByTestId('product-filter-clear')).toBeInTheDocument();
    });

    it('shows clear button when category is not "all"', () => {
      render(
        <ProductFilters
          filters={{ ...defaultFilters, category: 'flooring' }}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      expect(screen.getByTestId('product-filter-clear')).toBeInTheDocument();
    });

    it('shows clear button when enrichmentStatus is not "all"', () => {
      render(
        <ProductFilters
          filters={{ ...defaultFilters, enrichmentStatus: 'complete' }}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      expect(screen.getByTestId('product-filter-clear')).toBeInTheDocument();
    });

    it('clears all filters when clear button is clicked', () => {
      render(
        <ProductFilters
          filters={{ search: 'test', category: 'flooring', enrichmentStatus: 'complete' }}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      fireEvent.click(screen.getByTestId('product-filter-clear'));

      expect(mockOnFiltersChange).toHaveBeenCalledWith({
        search: '',
        category: 'all',
        enrichmentStatus: 'all',
      });
    });
  });

  describe('Enrichment Status Options', () => {
    it('has all expected status options', () => {
      render(
        <ProductFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      // Click to open dropdown
      fireEvent.click(screen.getByTestId('product-filter-enrichment-status'));

      // Check all options are present (use getAllByText since text appears in trigger + dropdown)
      expect(screen.getAllByText('All Statuses').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Pending').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Draft').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Verified').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Complete').length).toBeGreaterThan(0);
    });
  });

  describe('Category Options', () => {
    it('renders all passed categories', () => {
      render(
        <ProductFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
        />
      );

      // Click to open dropdown
      fireEvent.click(screen.getByTestId('product-filter-category'));

      // Check all categories are present (use getAllByText since text appears in trigger + dropdown)
      expect(screen.getAllByText('All Categories').length).toBeGreaterThan(0);
      mockCategories.forEach((category) => {
        expect(screen.getAllByText(category).length).toBeGreaterThan(0);
      });
    });

    it('handles empty categories array', () => {
      render(
        <ProductFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          categories={[]}
        />
      );

      // Click to open dropdown
      fireEvent.click(screen.getByTestId('product-filter-category'));

      // Should show "All Categories" (use getAllByText since text appears in trigger + dropdown)
      expect(screen.getAllByText('All Categories').length).toBeGreaterThan(0);
    });
  });

  describe('Custom className', () => {
    it('applies custom className', () => {
      render(
        <ProductFilters
          filters={defaultFilters}
          onFiltersChange={mockOnFiltersChange}
          categories={mockCategories}
          className="custom-filter-class"
        />
      );

      expect(screen.getByTestId('product-filters')).toHaveClass('custom-filter-class');
    });
  });
});
