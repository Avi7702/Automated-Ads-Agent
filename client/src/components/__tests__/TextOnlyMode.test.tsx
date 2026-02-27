// @vitest-environment jsdom
/**
 * TextOnlyMode Component Tests
 *
 * Covers:
 * 1. Initial rendering
 * 2. Text editing & character metrics
 * 3. Hook quality scoring
 * 4. Copy generation
 * 5. Variation selection
 * 6. View toggle & clipboard
 * 7. Complete & close actions
 * 8. Edge cases
 */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import '@testing-library/jest-dom';
import { TextOnlyMode } from '../TextOnlyMode';

// Mock fetch globally
const mockFetch = vi.fn();

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};

beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch;
  Object.assign(navigator, { clipboard: mockClipboard });
  mockClipboard.writeText.mockClear();
});

// ============================================
// TEST FIXTURES
// ============================================

const defaultProps = {
  templateId: 'tmpl-text-001',
  topic: 'LinkedIn Growth Tips',
  platform: 'linkedin',
  onClose: vi.fn(),
  onComplete: vi.fn(),
};

function renderComponent(overrides: Partial<typeof defaultProps> = {}) {
  return render(<TextOnlyMode {...defaultProps} {...overrides} />);
}

// ============================================
// 1. INITIAL RENDERING
// ============================================

describe('TextOnlyMode - Rendering', () => {
  it('renders without crashing', () => {
    renderComponent();
    expect(screen.getByText('Text-Only Mode')).toBeInTheDocument();
  });

  it('shows platform-specific subtitle', () => {
    renderComponent();
    expect(
      screen.getByText(/Optimized for linkedin text posts/),
    ).toBeInTheDocument();
  });

  it('displays 2026 tips banner with all 4 tips', () => {
    renderComponent();
    expect(screen.getByText('30% More Reach')).toBeInTheDocument();
    expect(screen.getByText('First 150 Characters = Everything')).toBeInTheDocument();
    expect(screen.getByText('Comments > Likes')).toBeInTheDocument();
    expect(screen.getByText('No External Links')).toBeInTheDocument();
  });

  it('shows First 150 Characters section', () => {
    renderComponent();
    expect(screen.getByText('First 150 Characters')).toBeInTheDocument();
  });

  it('shows Full Post section', () => {
    renderComponent();
    expect(screen.getByText('Full Post')).toBeInTheDocument();
  });

  it('shows hook formulas section', () => {
    renderComponent();
    expect(
      screen.getByText('Proven Hook Formulas (click to use)'),
    ).toBeInTheDocument();
  });

  it('shows variation panel with empty state', () => {
    renderComponent();
    expect(screen.getByText('Generated Variations')).toBeInTheDocument();
    expect(
      screen.getByText(/Generate variations to see them ranked by hook quality/),
    ).toBeInTheDocument();
  });

  it('shows platform selector', () => {
    renderComponent();
    // The select trigger displays the current value
    // We check the LinkedIn option is selectable
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  });
});

// ============================================
// 2. TEXT EDITING & CHARACTER METRICS
// ============================================

describe('TextOnlyMode - Text Editing', () => {
  it('allows typing in the main textarea', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    fireEvent.change(textarea, { target: { value: 'Hello LinkedIn!' } });
    expect(textarea).toHaveValue('Hello LinkedIn!');
  });

  it('shows character count for platform limit', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    fireEvent.change(textarea, { target: { value: 'Test' } });

    // LinkedIn limit is 3000
    expect(screen.getByText('4/3000')).toBeInTheDocument();
  });

  it('shows first 150 character progress', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    fireEvent.change(textarea, { target: { value: 'A'.repeat(75) } });

    // 75/150 chars used
    expect(screen.getByText('75/150')).toBeInTheDocument();
  });

  it('shows "see more" indicator when text exceeds 150 chars', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    fireEvent.change(textarea, { target: { value: 'A'.repeat(200) } });

    expect(screen.getByText('...see more')).toBeInTheDocument();
  });

  it('shows over limit warning for twitter', () => {
    renderComponent({ platform: 'twitter' });
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    fireEvent.change(textarea, { target: { value: 'A'.repeat(300) } });

    expect(screen.getByText(/over limit!/)).toBeInTheDocument();
  });
});

// ============================================
// 3. HOOK QUALITY SCORING
// ============================================

describe('TextOnlyMode - Hook Quality', () => {
  it('shows hook score badge', () => {
    renderComponent();
    expect(screen.getByText(/Hook Score: \d+\/100/)).toBeInTheDocument();
  });

  it('shows base score of 50 for empty text', () => {
    renderComponent();
    expect(screen.getByText('Hook Score: 50/100')).toBeInTheDocument();
  });

  it('increases score for text containing numbers', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    fireEvent.change(textarea, { target: { value: 'I made 10000 in 30 days' } });

    // Numbers add +10, base is 50 -> 60
    expect(screen.getByText('Hook Score: 60/100')).toBeInTheDocument();
  });

  it('increases score for text containing a question', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    fireEvent.change(textarea, { target: { value: 'Are you making this mistake?' } });

    // Question adds +10, power word "mistake" adds +5, base is 50 -> 65
    expect(screen.getByText('Hook Score: 65/100')).toBeInTheDocument();
  });

  it('increases score for power words', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    fireEvent.change(textarea, {
      target: { value: 'The secret truth about proven free new methods' },
    });

    // 5 power words: secret, truth, proven, free, new = +25, base 50 -> 75
    expect(screen.getByText('Hook Score: 75/100')).toBeInTheDocument();
  });
});

// ============================================
// 4. COPY GENERATION
// ============================================

describe('TextOnlyMode - Copy Generation', () => {
  it('shows generate button with correct variation count', () => {
    renderComponent();
    expect(
      screen.getByRole('button', { name: /Generate 3 Variations/i }),
    ).toBeInTheDocument();
  });

  it('calls copywriting API when generating', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          variations: [
            { copy: 'Stop posting images on LinkedIn.' },
            { copy: 'I tested 50 posts in 3 months.' },
            { copy: 'Everyone says post images. They are wrong.' },
          ],
        }),
    });

    renderComponent();
    const generateBtn = screen.getByRole('button', {
      name: /Generate 3 Variations/i,
    });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/copywriting/standalone',
        expect.objectContaining({
          method: 'POST',
          credentials: 'include',
        }),
      );
    });
  });

  it('populates variations panel after generation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          variations: [
            { copy: 'Stop posting images on LinkedIn. Here is why it works.' },
            { copy: 'I tested 50 posts. Text always won.' },
          ],
        }),
    });

    renderComponent();
    const generateBtn = screen.getByRole('button', {
      name: /Generate 3 Variations/i,
    });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      // Variations should be displayed with hook scores
      expect(screen.queryByText(/Generate variations to see them ranked/)).not.toBeInTheDocument();
    });
  });

  it('auto-selects the best variation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          variations: [
            { copy: 'Simple post about marketing tips for businesses today' },
            { copy: 'Stop making this 1 mistake. The secret truth about marketing in 2026?' },
          ],
        }),
    });

    renderComponent();
    const generateBtn = screen.getByRole('button', {
      name: /Generate 3 Variations/i,
    });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      // The second variation has more power words and a number, so it should be auto-selected
      const textarea = screen.getByPlaceholderText(/Start with a hook/) as HTMLTextAreaElement;
      expect(textarea.value).toContain('Stop making this 1 mistake');
    });
  });
});

// ============================================
// 5. HOOK FORMULAS
// ============================================

describe('TextOnlyMode - Hook Formulas', () => {
  it('renders hook formula buttons', () => {
    renderComponent();
    // Check first formula is displayed (truncated to 40 chars)
    expect(
      screen.getByRole('button', { name: /Stop \[doing X\]/i }),
    ).toBeInTheDocument();
  });

  it('prepends hook formula to existing copy on click', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Start with a hook/) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'My existing text' } });

    const formulaBtn = screen.getByRole('button', { name: /Stop \[doing X\]/i });
    fireEvent.click(formulaBtn);

    expect(textarea.value).toContain("Stop [doing X]. It's costing you [result].");
    expect(textarea.value).toContain('My existing text');
  });
});

// ============================================
// 6. VIEW TOGGLE & CLIPBOARD
// ============================================

describe('TextOnlyMode - Actions', () => {
  it('copies text to clipboard', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    fireEvent.change(textarea, { target: { value: 'My great post' } });

    const copyBtn = screen.getByRole('button', { name: /Copy Text/i });
    fireEvent.click(copyBtn);

    expect(mockClipboard.writeText).toHaveBeenCalledWith('My great post');
  });

  it('toggles preview visibility', () => {
    renderComponent();
    const previewBtn = screen.getByRole('button', { name: /Show Preview/i });
    fireEvent.click(previewBtn);

    expect(
      screen.getByRole('button', { name: /Hide Preview/i }),
    ).toBeInTheDocument();
  });
});

// ============================================
// 7. COMPLETE & CLOSE
// ============================================

describe('TextOnlyMode - Complete & Close', () => {
  it('disables Use This Copy when textarea is empty', () => {
    renderComponent();
    const btn = screen.getByRole('button', { name: /Use This Copy/i });
    expect(btn).toBeDisabled();
  });

  it('enables Use This Copy when text is present', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    fireEvent.change(textarea, { target: { value: 'Some content' } });

    const btn = screen.getByRole('button', { name: /Use This Copy/i });
    expect(btn).not.toBeDisabled();
  });

  it('calls onComplete and onClose when Use This Copy is clicked', () => {
    const onComplete = vi.fn();
    const onClose = vi.fn();
    renderComponent({ onComplete, onClose });

    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    fireEvent.change(textarea, { target: { value: 'My final post text' } });

    const btn = screen.getByRole('button', { name: /Use This Copy/i });
    fireEvent.click(btn);

    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        copy: 'My final post text',
        platform: 'linkedin',
        characterCount: 18,
      }),
    );
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderComponent({ onClose });

    const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when X button is clicked', () => {
    const onClose = vi.fn();
    renderComponent({ onClose });

    // Find the icon-only close button (ghost, size icon, with X svg)
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find(
      (btn) => btn.querySelector('svg.lucide-x') !== null,
    );
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ============================================
// 8. EDGE CASES
// ============================================

describe('TextOnlyMode - Edge Cases', () => {
  it('handles empty topic', () => {
    renderComponent({ topic: '' });
    expect(screen.getByText('Text-Only Mode')).toBeInTheDocument();
  });

  it('handles very long text without crashing', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    const longText = 'A'.repeat(5000);
    fireEvent.change(textarea, { target: { value: longText } });

    // The character count "5000/3000 (over limit!)" may be split across child elements
    // Just verify the component renders without crashing and shows the over-limit indicator
    expect(textarea).toHaveValue(longText);
    expect(screen.getByText(/over limit!/)).toBeInTheDocument();
  });

  it('caps hook quality score at 100', () => {
    renderComponent();
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    // Load up with many power words, numbers, and question to try to exceed 100
    fireEvent.change(textarea, {
      target: {
        value:
          'Stop the secret truth mistake? Never always exact proven free new 123',
      },
    });

    // Score should be capped at 100
    const scoreText = screen.getByText(/Hook Score: \d+\/100/).textContent ?? '';
    const scoreMatch = scoreText.match(/Hook Score: (\d+)/);
    const score = scoreMatch ? parseInt(scoreMatch[1] ?? '0', 10) : 0;
    expect(score).toBeLessThanOrEqual(100);
  });

  it('renders on twitter with 280 char limit', () => {
    renderComponent({ platform: 'twitter' });
    const textarea = screen.getByPlaceholderText(/Start with a hook/);
    fireEvent.change(textarea, { target: { value: 'Short tweet' } });

    expect(screen.getByText('11/280')).toBeInTheDocument();
  });

  it('handles API failure gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    renderComponent();
    const generateBtn = screen.getByRole('button', {
      name: /Generate 3 Variations/i,
    });
    fireEvent.click(generateBtn);

    // Should not crash - button eventually re-enables
    await waitFor(() => {
      expect(generateBtn).not.toBeDisabled();
    });
  });
});
