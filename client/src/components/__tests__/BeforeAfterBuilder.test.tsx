// @vitest-environment jsdom
/**
 * BeforeAfterBuilder Component Tests
 *
 * Covers:
 * 1. Initial rendering
 * 2. Before/After panel interactions
 * 3. Image generation
 * 4. Caption generation
 * 5. View mode toggle (edit/preview)
 * 6. Complete & close actions
 * 7. Edge cases
 */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import '@testing-library/jest-dom';
import { BeforeAfterBuilder } from '../BeforeAfterBuilder';

// Mock fetch globally
const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch;
});

// ============================================
// TEST FIXTURES
// ============================================

const defaultProps = {
  templateId: 'tmpl-001',
  topic: 'Warehouse Organization',
  platform: 'instagram',
  productNames: ['ShelfMaster Pro'],
  productImageUrls: ['https://example.com/product.jpg'],
  aspectRatio: '1080x1080',
  onClose: vi.fn(),
  onComplete: vi.fn(),
};

function renderComponent(overrides: Partial<typeof defaultProps> = {}) {
  return render(<BeforeAfterBuilder {...defaultProps} {...overrides} />);
}

// ============================================
// 1. INITIAL RENDERING
// ============================================

describe('BeforeAfterBuilder - Rendering', () => {
  it('renders without crashing', () => {
    renderComponent();
    expect(screen.getByText('Before/After Builder')).toBeInTheDocument();
  });

  it('displays platform in subtitle', () => {
    renderComponent({ platform: 'linkedin' });
    expect(screen.getByText(/Create transformation content for linkedin/)).toBeInTheDocument();
  });

  it('shows Edit Mode badge initially', () => {
    renderComponent();
    expect(screen.getByText('Edit Mode')).toBeInTheDocument();
  });

  it('shows Before and After section headings', () => {
    renderComponent();
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
  });

  it('shows 2026 transformation tips', () => {
    renderComponent();
    expect(screen.getByText('2026 Transformation Content Tips')).toBeInTheDocument();
    expect(
      screen.getByText(/Show real results, not staged perfection/),
    ).toBeInTheDocument();
  });

  it('shows close button', () => {
    renderComponent();
    // The close button is a ghost button with X icon
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(
      (btn) => btn.querySelector('svg.lucide-x') !== null,
    );
    expect(closeButton).toBeTruthy();
  });

  it('shows placeholder text for before image', () => {
    renderComponent();
    expect(
      screen.getByText(/Generate or upload a "before" image/),
    ).toBeInTheDocument();
  });

  it('shows placeholder text for after image', () => {
    renderComponent();
    expect(
      screen.getByText(/Generate or upload an "after" image/),
    ).toBeInTheDocument();
  });
});

// ============================================
// 2. BEFORE/AFTER PANEL INTERACTIONS
// ============================================

describe('BeforeAfterBuilder - Panel Interactions', () => {
  it('allows typing in the before prompt textarea', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Describe the 'before' state/);
    fireEvent.change(textarea, {
      target: { value: 'Messy warehouse' },
    });
    expect(textarea).toHaveValue('Messy warehouse');
  });

  it('allows typing in the after prompt textarea', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Describe the 'after' state/);
    fireEvent.change(textarea, {
      target: { value: 'Clean organized warehouse' },
    });
    expect(textarea).toHaveValue('Clean organized warehouse');
  });

  it('allows editing the before label', () => {
    renderComponent();
    const labels = screen.getAllByPlaceholderText('Label...');
    const beforeLabel = labels[0] as HTMLInputElement;
    fireEvent.change(beforeLabel, { target: { value: 'Old Way' } });
    expect(beforeLabel.value).toBe('Old Way');
  });

  it('allows editing the after label', () => {
    renderComponent();
    const labels = screen.getAllByPlaceholderText('Label...');
    const afterLabel = labels[1] as HTMLInputElement;
    fireEvent.change(afterLabel, { target: { value: 'New Way' } });
    expect(afterLabel.value).toBe('New Way');
  });

  it('disables Generate Before Image when prompt is empty', () => {
    renderComponent();
    const btn = screen.getByRole('button', { name: /Generate Before Image/i });
    expect(btn).toBeDisabled();
  });

  it('disables Generate After Image when prompt is empty', () => {
    renderComponent();
    const btn = screen.getByRole('button', { name: /Generate After Image/i });
    expect(btn).toBeDisabled();
  });

  it('enables Generate Before Image when prompt has text', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Describe the 'before' state/);
    fireEvent.change(textarea, { target: { value: 'Some description' } });

    const btn = screen.getByRole('button', { name: /Generate Before Image/i });
    expect(btn).not.toBeDisabled();
  });
});

// ============================================
// 3. IMAGE GENERATION
// ============================================

describe('BeforeAfterBuilder - Image Generation', () => {
  it('calls /api/transform when generating before image', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          imageUrl: 'https://example.com/before.jpg',
        }),
    });

    renderComponent();
    const textarea = screen.getByPlaceholderText(/Describe the 'before' state/);
    fireEvent.change(textarea, { target: { value: 'Messy warehouse' } });

    const btn = screen.getByRole('button', { name: /Generate Before Image/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/transform',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  it('shows error text when image generation fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    renderComponent();
    const textarea = screen.getByPlaceholderText(/Describe the 'before' state/);
    fireEvent.change(textarea, { target: { value: 'Something' } });

    const btn = screen.getByRole('button', { name: /Generate Before Image/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('Failed to generate image')).toBeInTheDocument();
    });
  });

  it('displays generated before image', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          imageUrl: 'https://example.com/before-result.jpg',
        }),
    });

    renderComponent();
    const textarea = screen.getByPlaceholderText(/Describe the 'before' state/);
    fireEvent.change(textarea, { target: { value: 'Messy warehouse' } });

    const btn = screen.getByRole('button', { name: /Generate Before Image/i });
    fireEvent.click(btn);

    await waitFor(() => {
      const img = screen.getByAltText('Before');
      expect(img).toHaveAttribute('src', 'https://example.com/before-result.jpg');
    });
  });
});

// ============================================
// 4. CAPTION GENERATION
// ============================================

describe('BeforeAfterBuilder - Caption', () => {
  it('shows Caption section heading', () => {
    renderComponent();
    expect(screen.getByText('Caption')).toBeInTheDocument();
  });

  it('has a Generate Caption button', () => {
    renderComponent();
    expect(
      screen.getByRole('button', { name: /Generate Caption/i }),
    ).toBeInTheDocument();
  });

  it('allows manual caption editing', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(
      /Write a caption that tells the transformation story/,
    );
    fireEvent.change(textarea, {
      target: { value: 'Check out this transformation!' },
    });
    expect(textarea).toHaveValue('Check out this transformation!');
  });

  it('calls copywriting API when generating caption', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          variations: [
            {
              copy: 'Amazing transformation!',
              hashtags: ['transformation', 'results'],
            },
          ],
        }),
    });

    renderComponent();
    const btn = screen.getByRole('button', { name: /Generate Caption/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/copywriting/standalone',
        expect.objectContaining({
          method: 'POST',
        }),
      );
    });
  });

  it('displays generated hashtags', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          variations: [
            {
              copy: 'Great transformation!',
              hashtags: ['beforeafter', 'results'],
            },
          ],
        }),
    });

    renderComponent();
    const btn = screen.getByRole('button', { name: /Generate Caption/i });
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText('#beforeafter')).toBeInTheDocument();
      expect(screen.getByText('#results')).toBeInTheDocument();
    });
  });
});

// ============================================
// 5. VIEW MODE TOGGLE
// ============================================

describe('BeforeAfterBuilder - View Mode', () => {
  it('starts in edit mode with Preview button', () => {
    renderComponent();
    expect(
      screen.getByRole('button', { name: /^Preview$/i }),
    ).toBeInTheDocument();
  });

  it('toggles to preview mode', () => {
    renderComponent();
    const previewBtn = screen.getByRole('button', { name: /^Preview$/i });
    fireEvent.click(previewBtn);

    expect(screen.getByText('Preview Mode')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /^Edit$/i }),
    ).toBeInTheDocument();
  });

  it('toggles back to edit mode', () => {
    renderComponent();
    const previewBtn = screen.getByRole('button', { name: /^Preview$/i });
    fireEvent.click(previewBtn);

    const editBtn = screen.getByRole('button', { name: /^Edit$/i });
    fireEvent.click(editBtn);

    expect(screen.getByText('Edit Mode')).toBeInTheDocument();
  });
});

// ============================================
// 6. COMPLETE & CLOSE
// ============================================

describe('BeforeAfterBuilder - Complete & Close', () => {
  it('disables Complete button when no images generated', () => {
    renderComponent();
    const btn = screen.getByRole('button', { name: /Complete/i });
    expect(btn).toBeDisabled();
  });

  it('disables Download Combined when no images generated', () => {
    renderComponent();
    const btn = screen.getByRole('button', { name: /Download Combined/i });
    expect(btn).toBeDisabled();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    renderComponent({ onClose });

    // Find the X icon button in the header
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(
      (btn) => btn.querySelector('svg.lucide-x') !== null,
    );
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('enables Complete button when both images are generated', async () => {
    // Mock two successful image generations
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ imageUrl: 'https://example.com/before.jpg' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({ imageUrl: 'https://example.com/after.jpg' }),
      });

    renderComponent();

    // Generate before image
    const beforeTextarea = screen.getByPlaceholderText(
      /Describe the 'before' state/,
    );
    fireEvent.change(beforeTextarea, { target: { value: 'Old state' } });
    const beforeBtn = screen.getByRole('button', {
      name: /Generate Before Image/i,
    });
    fireEvent.click(beforeBtn);

    await waitFor(() => {
      expect(screen.getByAltText('Before')).toBeInTheDocument();
    });

    // Generate after image
    const afterTextarea = screen.getByPlaceholderText(
      /Describe the 'after' state/,
    );
    fireEvent.change(afterTextarea, { target: { value: 'New state' } });
    const afterBtn = screen.getByRole('button', {
      name: /Generate After Image/i,
    });
    fireEvent.click(afterBtn);

    await waitFor(() => {
      expect(screen.getByAltText('After')).toBeInTheDocument();
    });

    const completeBtn = screen.getByRole('button', { name: /Complete/i });
    expect(completeBtn).not.toBeDisabled();
  });
});

// ============================================
// 7. EDGE CASES
// ============================================

describe('BeforeAfterBuilder - Edge Cases', () => {
  it('renders with no productNames', () => {
    renderComponent({ productNames: [] });
    expect(screen.getByText('Before/After Builder')).toBeInTheDocument();
  });

  it('renders with no productImageUrls', () => {
    renderComponent({ productImageUrls: [] });
    expect(screen.getByText('Before/After Builder')).toBeInTheDocument();
  });

  it('uses default aspect ratio when not provided', () => {
    const { aspectRatio: _, ...propsWithoutAspectRatio } = defaultProps;
    render(<BeforeAfterBuilder {...propsWithoutAspectRatio} />);
    expect(screen.getByText('Before/After Builder')).toBeInTheDocument();
  });

  it('handles empty topic string', () => {
    renderComponent({ topic: '' });
    expect(screen.getByText('Before/After Builder')).toBeInTheDocument();
  });

  it('renders on different platforms', () => {
    for (const platform of ['linkedin', 'facebook', 'tiktok']) {
      const { unmount } = renderComponent({ platform });
      expect(
        screen.getByText(`Create transformation content for ${platform}`),
      ).toBeInTheDocument();
      unmount();
    }
  });
});
