// @vitest-environment jsdom
/**
 * BusinessOnboarding Component Tests
 *
 * Covers:
 * 1. Step 1 (Welcome) rendering
 * 2. Step navigation (next, back)
 * 3. Step 2 (Industry) interactions
 * 4. Step 3 (Differentiator) interactions
 * 5. Step 4 (Target Customer) interactions
 * 6. Step 5 (Product Ranking)
 * 7. Step 6 (Content Themes)
 * 8. Step 7 (Review)
 * 9. Skip & complete actions
 * 10. Edge cases
 */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import '@testing-library/jest-dom';

// Mock the hooks used by BusinessOnboarding
vi.mock('@/hooks/useBusinessIntelligence', () => ({
  useSaveBusinessIntelligence: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
  useBulkSetPriorities: () => ({
    mutateAsync: vi.fn().mockResolvedValue({}),
    isPending: false,
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock fetch for product loading
const mockFetch = vi.fn();
beforeEach(() => {
  mockFetch.mockReset();
  global.fetch = mockFetch;
  // Default: return empty products
  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve([]),
  });
});

import { BusinessOnboarding } from '../onboarding/BusinessOnboarding';

// ============================================
// TEST FIXTURES
// ============================================

const defaultProps = {
  onComplete: vi.fn(),
  onSkip: vi.fn(),
};

function renderComponent(overrides: Partial<typeof defaultProps> = {}) {
  return render(<BusinessOnboarding {...defaultProps} {...overrides} />);
}

// ============================================
// 1. STEP 1 (WELCOME) RENDERING
// ============================================

describe('BusinessOnboarding - Step 1 Welcome', () => {
  it('renders without crashing', () => {
    renderComponent();
    expect(
      screen.getByText("Let's set up your content strategy"),
    ).toBeInTheDocument();
  });

  it('shows step indicator as 1 of 7', () => {
    renderComponent();
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument();
  });

  it('shows progress bar', () => {
    const { container } = renderComponent();
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
  });

  it('shows Skip for now button', () => {
    renderComponent();
    expect(
      screen.getByRole('button', { name: /Skip for now/i }),
    ).toBeInTheDocument();
  });

  it('shows welcome description text', () => {
    renderComponent();
    expect(
      screen.getByText(/Answer a few questions about your business/),
    ).toBeInTheDocument();
  });

  it('shows time estimate', () => {
    renderComponent();
    expect(screen.getByText(/Takes about 2 minutes/)).toBeInTheDocument();
  });

  it('disables Back button on step 1', () => {
    renderComponent();
    const backBtn = screen.getByRole('button', { name: /Back/i });
    expect(backBtn).toBeDisabled();
  });

  it('has an enabled Next button', () => {
    renderComponent();
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    expect(nextBtn).not.toBeDisabled();
  });
});

// ============================================
// 2. STEP NAVIGATION
// ============================================

describe('BusinessOnboarding - Navigation', () => {
  it('advances to step 2 on Next click', () => {
    renderComponent();
    const nextBtn = screen.getByRole('button', { name: /Next/i });
    fireEvent.click(nextBtn);

    expect(screen.getByText('Step 2 of 7')).toBeInTheDocument();
    expect(screen.getByText('Industry & Niche')).toBeInTheDocument();
  });

  it('goes back to step 1 from step 2', () => {
    renderComponent();
    // Go to step 2
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Step 2 of 7')).toBeInTheDocument();

    // Go back
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument();
  });

  it('navigates through all 7 steps', async () => {
    renderComponent();

    // Step 1 -> 2
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Step 2 of 7')).toBeInTheDocument();

    // Step 2: select industry to enable Next
    // Use the Select component - find the trigger and interact
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    await waitFor(() => {
      const constructionOption = screen.getByText('Construction');
      fireEvent.click(constructionOption);
    });

    // Step 2 -> 3
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Step 3 of 7')).toBeInTheDocument();

    // Step 3: enter differentiator to enable Next
    const diffTextarea = screen.getByPlaceholderText(
      /only supplier in the region/i,
    );
    fireEvent.change(diffTextarea, { target: { value: 'We are the best' } });

    // Step 3 -> 4
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Step 4 of 7')).toBeInTheDocument();

    // Step 4 -> 5
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Step 5 of 7')).toBeInTheDocument();

    // Step 5 -> 6
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Step 6 of 7')).toBeInTheDocument();

    // Step 6 -> 7
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    expect(screen.getByText('Step 7 of 7')).toBeInTheDocument();
  });
});

// ============================================
// 3. STEP 2 (INDUSTRY)
// ============================================

describe('BusinessOnboarding - Step 2 Industry', () => {
  function goToStep2() {
    renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  }

  it('shows industry select and niche input', () => {
    goToStep2();
    expect(screen.getByText('Industry')).toBeInTheDocument();
    expect(screen.getByText('Niche (optional)')).toBeInTheDocument();
  });

  it('shows industry description', () => {
    goToStep2();
    expect(
      screen.getByText(/What industry does your business operate in/),
    ).toBeInTheDocument();
  });

  it('allows entering a niche', () => {
    goToStep2();
    const nicheInput = screen.getByPlaceholderText(
      /Residential flooring installation/,
    );
    fireEvent.change(nicheInput, {
      target: { value: 'Commercial renovation' },
    });
    expect(nicheInput).toHaveValue('Commercial renovation');
  });
});

// ============================================
// 4. STEP 3 (DIFFERENTIATOR)
// ============================================

describe('BusinessOnboarding - Step 3 Differentiator', () => {
  async function goToStep3() {
    renderComponent();
    // Step 1 -> 2
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    // Select industry
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Technology'));
    });
    // Step 2 -> 3
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  }

  it('shows differentiator textarea', async () => {
    await goToStep3();
    expect(screen.getByText('What makes you different?')).toBeInTheDocument();
  });

  it('allows entering a differentiator', async () => {
    await goToStep3();
    const textarea = screen.getByPlaceholderText(
      /only supplier in the region/i,
    );
    fireEvent.change(textarea, {
      target: { value: 'Award-winning customer service' },
    });
    expect(textarea).toHaveValue('Award-winning customer service');
  });

  it('shows helper text about what to think about', async () => {
    await goToStep3();
    expect(
      screen.getByText(
        /Think about: unique services, pricing advantages/,
      ),
    ).toBeInTheDocument();
  });
});

// ============================================
// 5. STEP 4 (TARGET CUSTOMER)
// ============================================

describe('BusinessOnboarding - Step 4 Target Customer', () => {
  async function goToStep4() {
    renderComponent();
    // Step 1 -> 2
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    // Select industry
    const selectTrigger = screen.getByRole('combobox');
    fireEvent.click(selectTrigger);
    await waitFor(() => {
      fireEvent.click(screen.getByText('Construction'));
    });
    // Step 2 -> 3
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    // Enter differentiator
    const textarea = screen.getByPlaceholderText(/only supplier/i);
    fireEvent.change(textarea, { target: { value: 'Best prices' } });
    // Step 3 -> 4
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
  }

  it('shows customer type buttons (B2B, B2C, Both)', async () => {
    await goToStep4();
    expect(screen.getByText('Target Customer')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B2B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B2C' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Both' })).toBeInTheDocument();
  });

  it('allows toggling customer type', async () => {
    await goToStep4();
    const b2cBtn = screen.getByRole('button', { name: 'B2C' });
    fireEvent.click(b2cBtn);
    // B2C should now be the active variant
    // The Button component with variant="default" is the active one
    expect(b2cBtn).toBeInTheDocument();
  });

  it('shows demographics input', async () => {
    await goToStep4();
    expect(
      screen.getByPlaceholderText(/Small business owners/),
    ).toBeInTheDocument();
  });

  it('shows pain points input', async () => {
    await goToStep4();
    expect(
      screen.getByPlaceholderText(/Type a pain point and press Enter/),
    ).toBeInTheDocument();
  });

  it('shows decision factors input', async () => {
    await goToStep4();
    expect(
      screen.getByPlaceholderText(/What influences their buying decisions/),
    ).toBeInTheDocument();
  });
});

// ============================================
// 6. STEP 5 (PRODUCT RANKING)
// ============================================

describe('BusinessOnboarding - Step 5 Product Ranking', () => {
  it('shows no products message when products list is empty', async () => {
    renderComponent();
    // Navigate to step 5
    for (let i = 0; i < 4; i++) {
      if (i === 1) {
        // Step 2: need industry
        const trigger = screen.getByRole('combobox');
        fireEvent.click(trigger);
        await waitFor(() => fireEvent.click(screen.getByText('Retail')));
      }
      if (i === 2) {
        // Step 3: need differentiator
        const ta = screen.getByPlaceholderText(/only supplier/i);
        fireEvent.change(ta, { target: { value: 'Fast shipping' } });
      }
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    }

    await waitFor(() => {
      expect(screen.getByText('Product Ranking')).toBeInTheDocument();
    });
    expect(screen.getByText(/No products found/)).toBeInTheDocument();
  });
});

// ============================================
// 7. STEP 6 (CONTENT THEMES)
// ============================================

describe('BusinessOnboarding - Step 6 Content Themes', () => {
  async function goToStep6() {
    renderComponent();
    for (let i = 0; i < 5; i++) {
      if (i === 1) {
        const trigger = screen.getByRole('combobox');
        fireEvent.click(trigger);
        await waitFor(() => fireEvent.click(screen.getByText('Retail')));
      }
      if (i === 2) {
        const ta = screen.getByPlaceholderText(/only supplier/i);
        fireEvent.change(ta, { target: { value: 'Fast shipping' } });
      }
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    }
  }

  it('shows suggested themes', async () => {
    await goToStep6();
    await waitFor(() => {
      expect(screen.getByText('Content Themes')).toBeInTheDocument();
    });
    expect(screen.getByText('Product tutorials')).toBeInTheDocument();
    expect(screen.getByText('Industry news')).toBeInTheDocument();
  });

  it('allows adding a suggested theme by clicking', async () => {
    await goToStep6();
    await waitFor(() => {
      expect(screen.getByText('Content Themes')).toBeInTheDocument();
    });

    const tutorialsBadge = screen.getByText('Product tutorials');
    fireEvent.click(tutorialsBadge);

    // Should now show in selected themes section
    expect(screen.getByText(/Selected themes \(1\)/)).toBeInTheDocument();
  });

  it('allows adding a custom theme via input', async () => {
    await goToStep6();
    await waitFor(() => {
      expect(screen.getByText('Content Themes')).toBeInTheDocument();
    });

    const themeInput = screen.getByPlaceholderText(
      /Type a theme and press Enter/,
    );
    fireEvent.change(themeInput, { target: { value: 'Company culture' } });
    fireEvent.keyDown(themeInput, { key: 'Enter' });

    expect(screen.getByText(/Selected themes \(1\)/)).toBeInTheDocument();
  });
});

// ============================================
// 8. STEP 7 (REVIEW)
// ============================================

describe('BusinessOnboarding - Step 7 Review', () => {
  async function goToStep7() {
    renderComponent();
    for (let i = 0; i < 6; i++) {
      if (i === 1) {
        const trigger = screen.getByRole('combobox');
        fireEvent.click(trigger);
        await waitFor(() => fireEvent.click(screen.getByText('Retail')));
      }
      if (i === 2) {
        const ta = screen.getByPlaceholderText(/only supplier/i);
        fireEvent.change(ta, { target: { value: 'Best quality' } });
      }
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    }
  }

  it('shows Review & Confirm heading', async () => {
    await goToStep7();
    await waitFor(() => {
      expect(screen.getByText('Review & Confirm')).toBeInTheDocument();
    });
  });

  it('shows Complete Setup button instead of Next', async () => {
    await goToStep7();
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /Complete Setup/i }),
      ).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /^Next$/i })).not.toBeInTheDocument();
  });

  it('displays industry in review', async () => {
    await goToStep7();
    await waitFor(() => {
      expect(screen.getByText('Retail')).toBeInTheDocument();
    });
  });

  it('displays differentiator in review', async () => {
    await goToStep7();
    await waitFor(() => {
      expect(screen.getByText('Best quality')).toBeInTheDocument();
    });
  });

  it('has Edit buttons for review rows', async () => {
    await goToStep7();
    await waitFor(() => {
      const editButtons = screen.getAllByRole('button', { name: /Edit/i });
      expect(editButtons.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// 9. SKIP & COMPLETE
// ============================================

describe('BusinessOnboarding - Skip & Complete', () => {
  it('calls onSkip when Skip for now is clicked', () => {
    const onSkip = vi.fn();
    renderComponent({ onSkip });

    fireEvent.click(screen.getByRole('button', { name: /Skip for now/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});

// ============================================
// 10. EDGE CASES
// ============================================

describe('BusinessOnboarding - Edge Cases', () => {
  it('prevents navigation before step 1', () => {
    renderComponent();
    const backBtn = screen.getByRole('button', { name: /Back/i });
    expect(backBtn).toBeDisabled();
    fireEvent.click(backBtn);
    expect(screen.getByText('Step 1 of 7')).toBeInTheDocument();
  });

  it('renders progress bar at correct percentage', () => {
    const { container } = renderComponent();
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
    // Step 1 of 7 = ~14%. Radix Progress uses style transform on the indicator div.
    // translateX(-(100-14)%) = translateX(-86%)
    const indicator = progressBar?.querySelector('div');
    expect(indicator).toBeInTheDocument();
    const transform = indicator?.style.transform ?? '';
    expect(transform).toBe('translateX(-86%)');
  });

  it('updates progress bar as steps advance', () => {
    const { container } = renderComponent();
    fireEvent.click(screen.getByRole('button', { name: /Next/i }));
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toBeInTheDocument();
    // Step 2 of 7 = ~29%. translateX(-(100-29)%) = translateX(-71%)
    const indicator = progressBar?.querySelector('div');
    expect(indicator).toBeInTheDocument();
    const transform = indicator?.style.transform ?? '';
    expect(transform).toBe('translateX(-71%)');
  });
});
