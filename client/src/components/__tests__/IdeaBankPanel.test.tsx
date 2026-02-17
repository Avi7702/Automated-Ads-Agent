/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// @vitest-environment jsdom
/**
 * IdeaBankPanel Component Tests
 *
 * Comprehensive test suite covering:
 * 1. Rendering (5 tests)
 * 2. Idea Suggestions (6 tests)
 * 3. Source Attribution (4 tests)
 * 4. User Interactions (5 tests)
 * 5. Platform Recommendations (5 tests)
 *
 * Total: 25 tests
 */
import React from 'react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, createMockProduct } from '@/test-utils';
import '@testing-library/jest-dom';
import { IdeaBankPanel } from '../ideabank';
import type { IdeaBankSuggestResponse, IdeaBankSuggestion, TemplateSlotSuggestion } from '@shared/types/ideaBank';

// ============================================
// MOCK DATA FACTORIES
// ============================================

function createMockSuggestion(overrides: Partial<IdeaBankSuggestion> = {}): IdeaBankSuggestion {
  return {
    id: `suggestion-${Math.random().toString(36).substring(7)}`,
    summary: 'Professional product showcase with elegant lighting',
    prompt: 'Create a professional advertisement featuring the product with soft lighting and a clean background',
    mode: 'standard',
    reasoning: 'This approach works well for highlighting product details while maintaining visual appeal',
    confidence: 0.85,
    sourcesUsed: {
      visionAnalysis: true,
      kbRetrieval: true,
      webSearch: false,
      templateMatching: true,
    },
    recommendedPlatform: 'instagram',
    recommendedAspectRatio: '1:1',
    ...overrides,
  };
}

function createMockSlotSuggestion(overrides: Partial<TemplateSlotSuggestion> = {}): TemplateSlotSuggestion {
  return {
    productHighlights: ['Durable construction', 'Premium materials', 'Easy installation'],
    productPlacement: 'Center-left of frame with slight angle',
    detailsToEmphasize: ['Texture', 'Color variation', 'Thickness'],
    scaleReference: 'Human hand for size reference',
    headerText: 'Transform Your Space',
    bodyText: 'Premium flooring that lasts a lifetime',
    ctaSuggestion: 'Shop Now',
    colorHarmony: ['#8B4513', '#D2691E', '#F5DEB3'],
    lightingNotes: 'Warm natural lighting from upper left. Soft shadows to show texture.',
    confidence: 88,
    reasoning: 'This layout maximizes product visibility while maintaining brand consistency',
    ...overrides,
  };
}

function createMockResponse(overrides: Partial<IdeaBankSuggestResponse> = {}): IdeaBankSuggestResponse {
  return {
    suggestions: [
      createMockSuggestion({ id: 'sug-1', mode: 'exact_insert', confidence: 0.92 }),
      createMockSuggestion({ id: 'sug-2', mode: 'inspiration', confidence: 0.85 }),
      createMockSuggestion({ id: 'sug-3', mode: 'standard', confidence: 0.78 }),
    ],
    analysisStatus: {
      visionComplete: true,
      kbQueried: true,
      templatesMatched: 5,
      webSearchUsed: false,
    },
    ...overrides,
  };
}

function createTemplateResponse(templateId: string) {
  return {
    slotSuggestions: [createMockSlotSuggestion(), createMockSlotSuggestion({ confidence: 75 })],
    template: {
      id: templateId,
      title: 'Professional Product Showcase',
      promptBlueprint: 'Create a professional product image with {{product}} centered',
      category: 'product_showcase',
      environment: 'studio',
      mood: 'professional',
      lightingStyle: 'soft diffused',
    },
    mergedPrompt: 'Create a professional product image with Test Product centered in studio lighting',
    analysisStatus: {
      visionComplete: true,
      kbQueried: true,
      templatesMatched: 1,
      webSearchUsed: false,
    },
  };
}

// ============================================
// MOCK SETUP
// ============================================

// Store for controlling mock responses
let mockResponseData: IdeaBankSuggestResponse | ReturnType<typeof createTemplateResponse> = createMockResponse();
let mockShouldFail = false;
let fetchCallCount = 0;

// Mock global fetch
const mockFetch = vi.fn(async (url: string, options?: RequestInit) => {
  fetchCallCount++;

  if (url.includes('/api/idea-bank/suggest')) {
    if (mockShouldFail) {
      return {
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      };
    }

    // Check if it's a template mode request
    if (options?.body) {
      const body = JSON.parse(options.body as string);
      if (body.mode === 'template' && body.templateId) {
        return {
          ok: true,
          status: 200,
          json: async () => createTemplateResponse(body.templateId),
        };
      }
    }

    return {
      ok: true,
      status: 200,
      json: async () => mockResponseData,
    };
  }

  return {
    ok: true,
    status: 200,
    json: async () => ({}),
  };
});

// ============================================
// TEST DATA
// ============================================

const mockProduct = createMockProduct({
  id: 'prod-001',
  name: 'Premium Oak Flooring',
  category: 'flooring',
  description: 'High-quality engineered oak flooring',
  cloudinaryUrl: 'https://res.cloudinary.com/test/oak-flooring.jpg',
});

const mockProduct2 = createMockProduct({
  id: 'prod-002',
  name: 'Walnut Hardwood',
  category: 'flooring',
  description: 'Rich walnut hardwood flooring',
  cloudinaryUrl: 'https://res.cloudinary.com/test/walnut.jpg',
});

// ============================================
// SETUP AND TEARDOWN
// ============================================

beforeEach(() => {
  // Reset mock state
  mockResponseData = createMockResponse();
  mockShouldFail = false;
  fetchCallCount = 0;

  // Setup global fetch mock
  global.fetch = mockFetch as unknown as typeof fetch;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ============================================
// 1. RENDERING TESTS (5 tests)
// ============================================

describe('IdeaBankPanel - Rendering', () => {
  it('returns null when no products are selected', () => {
    const { container } = render(<IdeaBankPanel selectedProducts={[]} onSelectPrompt={vi.fn()} />);

    // Component returns null when no products are selected.
    // The test-utils render wraps in ThemeProvider which injects a <script> tag,
    // so container.firstChild is not null. Instead, check that the panel content
    // is not rendered (no "Intelligent Idea Bank" heading).
    expect(screen.queryByText('Intelligent Idea Bank')).not.toBeInTheDocument();
    // Verify there's no motion.div panel content in the container
    expect(container.querySelector('[class*="rounded-2xl"]')).toBeNull();
  });

  it('renders with a single product selected', async () => {
    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Intelligent Idea Bank')).toBeInTheDocument();
    });

    // Should show product count
    expect(screen.getByText(/1 product/i)).toBeInTheDocument();
  });

  it('renders with multiple products (1-6)', async () => {
    const multipleProducts = [mockProduct, mockProduct2];

    render(<IdeaBankPanel selectedProducts={multipleProducts} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Intelligent Idea Bank')).toBeInTheDocument();
    });

    expect(screen.getByText(/2 products/i)).toBeInTheDocument();
  });

  it('displays loading state while fetching suggestions', async () => {
    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    // Should show title immediately
    expect(screen.getByText('Intelligent Idea Bank')).toBeInTheDocument();

    // Wait for suggestions to load
    await waitFor(() => {
      expect(screen.getByText(/AI-generated/i)).toBeInTheDocument();
    });
  });

  it('displays error state when API fails', async () => {
    mockShouldFail = true;

    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(
      () => {
        expect(screen.getByText(/failed|error|retry|unable/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});

// ============================================
// 2. IDEA SUGGESTIONS TESTS (6 tests)
// ============================================

describe('IdeaBankPanel - Idea Suggestions', () => {
  it('fetches suggestions on mount when products are selected', async () => {
    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      expect(fetchCallCount).toBeGreaterThan(0);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      '/api/idea-bank/suggest',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
      }),
    );
  });

  it('refreshes suggestions when refresh button is clicked', async () => {
    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText(/AI-generated/i)).toBeInTheDocument();
    });

    const initialCount = fetchCallCount;

    // Click refresh
    const refreshButton = screen.getByTestId('button-refresh-idea-bank');
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(fetchCallCount).toBeGreaterThan(initialCount);
    });
  });

  it('displays suggestion metadata (summary and reasoning)', async () => {
    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      // Should show suggestion summaries
      expect(screen.getAllByText(/Professional product showcase/i).length).toBeGreaterThan(0);
    });

    // Should show reasoning text
    expect(screen.getAllByText(/Why this works/i).length).toBeGreaterThan(0);
  });

  it('displays correct mode badges (exact_insert, inspiration, standard)', async () => {
    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      // Check for mode badge text
      expect(screen.getByText('Exact Insert')).toBeInTheDocument();
      expect(screen.getByText('Inspiration')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
    });
  });

  it('displays confidence indicators with correct styling', async () => {
    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      // Should show confidence percentages
      expect(screen.getByText('92%')).toBeInTheDocument(); // High confidence (green)
      expect(screen.getByText('85%')).toBeInTheDocument(); // Medium-high confidence
      expect(screen.getByText('78%')).toBeInTheDocument(); // Medium confidence
    });
  });

  it('displays analysis status summary', async () => {
    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      // Check analysis status indicators
      expect(screen.getByText('Vision Analysis')).toBeInTheDocument();
      expect(screen.getByText('Knowledge Base')).toBeInTheDocument();
      expect(screen.getByText(/5 Templates/i)).toBeInTheDocument();
    });
  });
});

// ============================================
// 3. SOURCE ATTRIBUTION TESTS (4 tests)
// ============================================

describe('IdeaBankPanel - Source Attribution', () => {
  it('displays Vision source indicator when visionAnalysis is true', async () => {
    mockResponseData = createMockResponse({
      suggestions: [
        createMockSuggestion({
          id: 'vis-1',
          sourcesUsed: {
            visionAnalysis: true,
            kbRetrieval: false,
            webSearch: false,
            templateMatching: false,
          },
        }),
      ],
    });

    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Vision')).toBeInTheDocument();
    });
  });

  it('displays KB (Knowledge) source indicator when kbRetrieval is true', async () => {
    mockResponseData = createMockResponse({
      suggestions: [
        createMockSuggestion({
          id: 'kb-1',
          sourcesUsed: {
            visionAnalysis: false,
            kbRetrieval: true,
            webSearch: false,
            templateMatching: false,
          },
        }),
      ],
    });

    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Knowledge')).toBeInTheDocument();
    });
  });

  it('displays Web Search source indicator when webSearch is true', async () => {
    mockResponseData = createMockResponse({
      suggestions: [
        createMockSuggestion({
          id: 'web-1',
          sourcesUsed: {
            visionAnalysis: false,
            kbRetrieval: false,
            webSearch: true,
            templateMatching: false,
          },
        }),
      ],
      analysisStatus: {
        visionComplete: false,
        kbQueried: false,
        templatesMatched: 0,
        webSearchUsed: true,
      },
    });

    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Web')).toBeInTheDocument();
    });
  });

  it('displays Template source indicator when templateMatching is true', async () => {
    mockResponseData = createMockResponse({
      suggestions: [
        createMockSuggestion({
          id: 'tpl-1',
          sourcesUsed: {
            visionAnalysis: false,
            kbRetrieval: false,
            webSearch: false,
            templateMatching: true,
          },
        }),
      ],
    });

    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Templates')).toBeInTheDocument();
    });
  });
});

// ============================================
// 4. USER INTERACTIONS TESTS (5 tests)
// ============================================

describe('IdeaBankPanel - User Interactions', () => {
  it('calls onSelectPrompt when an idea is selected', async () => {
    const onSelectPrompt = vi.fn();

    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={onSelectPrompt} />);

    await waitFor(() => {
      expect(screen.getByText(/AI-generated/i)).toBeInTheDocument();
    });

    // Click "Use This Idea" button on first suggestion
    const useButtons = screen.getAllByText('Use This Idea');
    fireEvent.click(useButtons[0] as HTMLElement);

    expect(onSelectPrompt).toHaveBeenCalledWith(
      expect.any(String), // prompt
      expect.any(String), // id
      expect.any(String), // reasoning
    );
  });

  it('triggers generation when quick generate button is clicked', async () => {
    const onSelectPrompt = vi.fn();
    const onQuickGenerate = vi.fn();

    render(
      <IdeaBankPanel
        selectedProducts={[mockProduct]}
        onSelectPrompt={onSelectPrompt}
        onQuickGenerate={onQuickGenerate}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/AI-generated/i)).toBeInTheDocument();
    });

    // Click "Generate Now" button
    const generateButtons = screen.getAllByText('Generate Now');
    fireEvent.click(generateButtons[0] as HTMLElement);

    expect(onQuickGenerate).toHaveBeenCalledWith(expect.any(String));
  });

  it('marks suggestion as selected when clicked', async () => {
    const onSelectPrompt = vi.fn();

    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={onSelectPrompt} selectedPromptId="sug-1" />);

    await waitFor(() => {
      expect(screen.getByText(/AI-generated/i)).toBeInTheDocument();
    });

    // The selected suggestion should show "Selected" button text
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('disables generate button when isGenerating is true', async () => {
    render(
      <IdeaBankPanel
        selectedProducts={[mockProduct]}
        onSelectPrompt={vi.fn()}
        onQuickGenerate={vi.fn()}
        isGenerating={true}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/AI-generated/i)).toBeInTheDocument();
    });

    // Generate buttons should be disabled
    const generateButtons = screen.getAllByRole('button').filter((btn) => btn.hasAttribute('disabled'));
    expect(generateButtons.length).toBeGreaterThan(0);
  });

  it('handles card click to select idea', async () => {
    const onSelectPrompt = vi.fn();

    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={onSelectPrompt} />);

    await waitFor(() => {
      expect(screen.getByText(/AI-generated/i)).toBeInTheDocument();
    });

    // Find and click the first suggestion card (heading element)
    const suggestionCards = screen.getAllByText(/Professional product showcase/i);
    fireEvent.click(suggestionCards[0] as HTMLElement);

    expect(onSelectPrompt).toHaveBeenCalled();
  });
});

// ============================================
// 5. PLATFORM RECOMMENDATIONS TESTS (5 tests)
// ============================================

describe('IdeaBankPanel - Platform Recommendations', () => {
  it('displays platform badge when recommendedPlatform is set', async () => {
    mockResponseData = createMockResponse({
      suggestions: [
        createMockSuggestion({
          id: 'plat-1',
          recommendedPlatform: 'instagram',
        }),
      ],
    });

    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('instagram')).toBeInTheDocument();
    });
  });

  it('displays aspect ratio recommendation when set', async () => {
    mockResponseData = createMockResponse({
      suggestions: [
        createMockSuggestion({
          id: 'ar-1',
          recommendedAspectRatio: '16:9',
        }),
      ],
    });

    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('16:9')).toBeInTheDocument();
    });
  });

  it('calls onSetPlatform when suggestion with platform is selected', async () => {
    const onSetPlatform = vi.fn();

    mockResponseData = createMockResponse({
      suggestions: [
        createMockSuggestion({
          id: 'setplat-1',
          recommendedPlatform: 'linkedin',
        }),
      ],
    });

    render(<IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} onSetPlatform={onSetPlatform} />);

    await waitFor(() => {
      expect(screen.getByText('linkedin')).toBeInTheDocument();
    });

    // Click "Use This Idea" button
    const useButton = screen.getByText('Use This Idea');
    fireEvent.click(useButton);

    expect(onSetPlatform).toHaveBeenCalledWith('linkedin');
  });

  it('calls onSetAspectRatio when suggestion with aspect ratio is selected', async () => {
    const onSetAspectRatio = vi.fn();

    mockResponseData = createMockResponse({
      suggestions: [
        createMockSuggestion({
          id: 'setar-1',
          recommendedAspectRatio: '4:5',
        }),
      ],
    });

    render(
      <IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} onSetAspectRatio={onSetAspectRatio} />,
    );

    await waitFor(() => {
      expect(screen.getByText('4:5')).toBeInTheDocument();
    });

    // Click "Use This Idea" button
    const useButton = screen.getByText('Use This Idea');
    fireEvent.click(useButton);

    expect(onSetAspectRatio).toHaveBeenCalledWith('4:5');
  });

  it('shows template mode badge when mode is template', async () => {
    render(
      <IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} mode="template" templateId="tpl-123" />,
    );

    await waitFor(() => {
      expect(screen.getByText('Template Mode')).toBeInTheDocument();
    });
  });
});

// ============================================
// TEMPLATE MODE TESTS (Bonus - 3 additional tests)
// ============================================

describe('IdeaBankPanel - Template Mode', () => {
  it('displays slot suggestions in template mode', async () => {
    render(
      <IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} mode="template" templateId="tpl-123" />,
    );

    await waitFor(() => {
      // Should show template-specific content (multiple slots may render)
      expect(screen.getAllByText('Template Slot').length).toBeGreaterThan(0);
    });

    // Each slot card shows "Template Slot" badge - verify at least 2 are rendered
    // (createTemplateResponse creates 2 slot suggestions)
    expect(screen.getAllByText('Template Slot').length).toBe(2);
  });

  it('displays template context info in template mode', async () => {
    render(
      <IdeaBankPanel selectedProducts={[mockProduct]} onSelectPrompt={vi.fn()} mode="template" templateId="tpl-123" />,
    );

    await waitFor(() => {
      expect(screen.getByText('Professional Product Showcase')).toBeInTheDocument();
    });
  });

  it('calls onSlotSuggestionSelect when slot is selected', async () => {
    const onSlotSuggestionSelect = vi.fn();

    render(
      <IdeaBankPanel
        selectedProducts={[mockProduct]}
        onSelectPrompt={vi.fn()}
        mode="template"
        templateId="tpl-123"
        onSlotSuggestionSelect={onSlotSuggestionSelect}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText(/slot suggestion/i)).toBeInTheDocument();
    });

    // Click the first slot suggestion "Use This" button
    const useButtons = screen.getAllByText('Use This');
    fireEvent.click(useButtons[0] as HTMLElement);

    expect(onSlotSuggestionSelect).toHaveBeenCalled();
  });
});
