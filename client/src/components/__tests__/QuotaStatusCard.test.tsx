// @vitest-environment jsdom
/**
 * QuotaStatusCard Component Tests
 *
 * Covers:
 * 1. Basic rendering
 * 2. Color/status thresholds (default, warning, destructive)
 * 3. Value formatting
 * 4. Reset time display
 * 5. Edge cases (0%, 100%, over 100%)
 */
import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test-utils';
import '@testing-library/jest-dom';
import { QuotaStatusCard } from '../quota/QuotaStatusCard';

// ============================================
// TEST FIXTURES
// ============================================

const defaultProps = {
  title: 'API Calls',
  current: 500,
  limit: 1000,
  percentage: 50,
  resetAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day from now
};

function renderComponent(overrides: Partial<typeof defaultProps> & { formatValue?: (v: number) => string } = {}) {
  return render(<QuotaStatusCard {...defaultProps} {...overrides} />);
}

// ============================================
// 1. BASIC RENDERING
// ============================================

describe('QuotaStatusCard - Rendering', () => {
  it('renders without crashing', () => {
    renderComponent();
    expect(screen.getByText('API Calls')).toBeInTheDocument();
  });

  it('displays the title', () => {
    renderComponent({ title: 'Image Generations' });
    expect(screen.getByText('Image Generations')).toBeInTheDocument();
  });

  it('displays current value formatted', () => {
    renderComponent({ current: 500 });
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('displays limit value formatted', () => {
    renderComponent({ limit: 1000 });
    expect(screen.getByText('/ 1,000')).toBeInTheDocument();
  });

  it('displays reset time message', () => {
    renderComponent();
    // formatDistanceToNow should produce something like "in about 1 day" or "in 1 day"
    const resetText = screen.getByText(/Resets/);
    expect(resetText).toBeInTheDocument();
    // formatDistanceToNow with addSuffix produces "in X days" or "X days ago"
    expect(resetText.textContent).toMatch(/Resets\s+(in\s+)?\d/i);
  });
});

// ============================================
// 2. STATUS COLOR THRESHOLDS
// ============================================

describe('QuotaStatusCard - Status Colors', () => {
  it('uses default color for percentage below 75', () => {
    const { container } = renderComponent({ percentage: 50 });
    // Should NOT have destructive or warning classes
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
    // No red or yellow indicator classes
    expect(container.innerHTML).not.toContain('bg-red-500');
    expect(container.innerHTML).not.toContain('bg-yellow-500');
  });

  it('uses warning color for percentage between 75 and 89', () => {
    const { container } = renderComponent({ percentage: 80 });
    expect(container.innerHTML).toContain('bg-yellow-500');
  });

  it('uses destructive color for percentage 90 and above', () => {
    const { container } = renderComponent({ percentage: 95 });
    expect(container.innerHTML).toContain('bg-red-500');
  });

  it('uses destructive color at exactly 90%', () => {
    const { container } = renderComponent({ percentage: 90 });
    expect(container.innerHTML).toContain('bg-red-500');
  });

  it('uses warning color at exactly 75%', () => {
    const { container } = renderComponent({ percentage: 75 });
    expect(container.innerHTML).toContain('bg-yellow-500');
  });
});

// ============================================
// 3. VALUE FORMATTING
// ============================================

describe('QuotaStatusCard - Value Formatting', () => {
  it('uses default locale formatting', () => {
    renderComponent({ current: 1234, limit: 5678 });
    expect(screen.getByText('1,234')).toBeInTheDocument();
    expect(screen.getByText('/ 5,678')).toBeInTheDocument();
  });

  it('accepts custom formatValue function', () => {
    renderComponent({
      current: 500,
      limit: 1000,
      formatValue: (v: number) => `${v} MB`,
    });
    expect(screen.getByText('500 MB')).toBeInTheDocument();
    expect(screen.getByText('/ 1000 MB')).toBeInTheDocument();
  });

  it('handles zero values', () => {
    renderComponent({ current: 0, limit: 100, percentage: 0 });
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('formats large numbers with commas', () => {
    renderComponent({ current: 999999, limit: 1000000, percentage: 99 });
    expect(screen.getByText('999,999')).toBeInTheDocument();
    expect(screen.getByText('/ 1,000,000')).toBeInTheDocument();
  });
});

// ============================================
// 4. RESET TIME DISPLAY
// ============================================

describe('QuotaStatusCard - Reset Time', () => {
  it('shows future reset time with "in" prefix', () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    renderComponent({ resetAt: futureDate });
    const resetText = screen.getByText(/Resets/);
    expect(resetText.textContent).toMatch(/in/i);
  });

  it('shows past reset time with "ago" suffix', () => {
    const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    renderComponent({ resetAt: pastDate });
    const resetText = screen.getByText(/Resets/);
    expect(resetText.textContent).toMatch(/ago/i);
  });
});

// ============================================
// 5. EDGE CASES
// ============================================

describe('QuotaStatusCard - Edge Cases', () => {
  it('handles percentage of exactly 0', () => {
    renderComponent({ current: 0, limit: 100, percentage: 0 });
    expect(screen.getByText('API Calls')).toBeInTheDocument();
  });

  it('handles percentage of exactly 100', () => {
    renderComponent({ current: 1000, limit: 1000, percentage: 100 });
    expect(screen.getByText('1,000')).toBeInTheDocument();
  });

  it('caps progress bar at 100% even if percentage exceeds it', () => {
    const { container } = renderComponent({
      current: 1500,
      limit: 1000,
      percentage: 150,
    });
    // The Progress component renders with role="progressbar" and uses style transform
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
    // The inner indicator div should have transform capped at 0% (translateX(-0%))
    // since Math.min(150, 100) = 100, translateX(-(100-100)%) = translateX(-0%)
    const indicator = progressBar?.querySelector('div');
    expect(indicator).toBeInTheDocument();
    const transform = indicator?.style.transform ?? '';
    // Should not translate more than 0% (i.e., fully filled)
    expect(transform).toBe('translateX(-0%)');
  });

  it('handles empty title', () => {
    renderComponent({ title: '' });
    // Should still render without crashing - the card still shows the values
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(document.body).toBeInTheDocument();
  });

  it('handles very large current and limit values', () => {
    renderComponent({
      current: 1000000000,
      limit: 2000000000,
      percentage: 50,
    });
    expect(screen.getByText('1,000,000,000')).toBeInTheDocument();
    expect(screen.getByText('/ 2,000,000,000')).toBeInTheDocument();
  });
});
