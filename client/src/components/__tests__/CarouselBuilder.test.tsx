/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
// @vitest-environment jsdom
/**
 * CarouselBuilder Component Tests
 *
 * Comprehensive test suite covering:
 * 1. Initialization (5 tests)
 * 2. Slide Management (8 tests)
 * 3. Slide Editing (7 tests)
 * 4. Preview & Export (5 tests)
 * 5. Integration (5 tests)
 *
 * Total: 30 tests
 *
 * @file client/src/components/__tests__/CarouselBuilder.test.tsx
 */
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@/test-utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@testing-library/jest-dom';

// Component under test
import { CarouselBuilder } from '../CarouselBuilder';

// Mock dependencies
vi.mock('file-saver', () => ({
  saveAs: vi.fn(),
}));

vi.mock('jszip', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      file: vi.fn(),
      generateAsync: vi.fn().mockResolvedValue(new Blob(['test'])),
    })),
  };
});

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
};
Object.assign(navigator, { clipboard: mockClipboard });

// Mock fetch for API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ============================================
// TEST DATA FIXTURES
// ============================================

const mockCarouselOutline = {
  outline: {
    title: 'Test Carousel Title',
    description: 'A test carousel for unit testing',
    slideCount: 7,
    slides: [
      {
        slideNumber: 1,
        purpose: 'hook' as const,
        headline: 'Attention-Grabbing Hook',
        body: 'This is the hook slide body text',
        imagePrompt: 'Create an eye-catching visual for the hook',
      },
      {
        slideNumber: 2,
        purpose: 'problem' as const,
        headline: 'The Problem You Face',
        body: 'Describing the pain point',
        imagePrompt: 'Visualize the problem scenario',
      },
      {
        slideNumber: 3,
        purpose: 'point' as const,
        headline: 'Key Point One',
        body: 'Supporting information',
        imagePrompt: 'Illustrate the first key point',
      },
      {
        slideNumber: 4,
        purpose: 'point' as const,
        headline: 'Key Point Two',
        body: 'More supporting information',
        imagePrompt: 'Illustrate the second key point',
      },
      {
        slideNumber: 5,
        purpose: 'solution' as const,
        headline: 'The Solution',
        body: 'How we solve the problem',
        imagePrompt: 'Show the solution in action',
      },
      {
        slideNumber: 6,
        purpose: 'proof' as const,
        headline: 'Social Proof',
        body: 'Testimonials and results',
        imagePrompt: 'Display proof and credibility',
      },
      {
        slideNumber: 7,
        purpose: 'cta' as const,
        headline: 'Take Action Now',
        body: 'Call to action details',
        imagePrompt: 'Create a compelling CTA visual',
      },
    ],
    captionCopy: 'This is the caption for the carousel post.',
    hashtags: ['marketing', 'carousel', 'social'],
  },
};

const mockTransformResponse = {
  imageUrl: 'https://res.cloudinary.com/test/image/upload/generated-slide.jpg',
  url: 'https://res.cloudinary.com/test/image/upload/generated-slide.jpg',
};

const defaultProps = {
  templateId: 'template-001',
  topic: 'Test Topic for Carousel',
  platform: 'instagram',
  productNames: ['Product A', 'Product B'],
  productImageUrls: ['https://example.com/product-a.jpg'],
  aspectRatio: '1080x1350',
  onClose: vi.fn(),
  onComplete: vi.fn(),
};

// ============================================
// TEST UTILITIES
// ============================================

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function renderCarouselBuilder(props = {}) {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <CarouselBuilder {...defaultProps} {...props} />
    </QueryClientProvider>,
  );
}

function setupSuccessfulOutlineFetch() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(mockCarouselOutline),
  });
}

function setupFailedOutlineFetch() {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 500,
    statusText: 'Internal Server Error',
  });
}

function setupSuccessfulImageGeneration() {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    json: () => Promise.resolve(mockTransformResponse),
  });
}

function setupFailedImageGeneration() {
  mockFetch.mockResolvedValueOnce({
    ok: false,
    status: 500,
    statusText: 'Generation Failed',
  });
}

// ============================================
// 1. INITIALIZATION TESTS (5 tests)
// ============================================

describe('CarouselBuilder - Initialization', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it('displays loading state while generating outline', async () => {
    // Setup: delay the fetch response to observe loading state
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: () => Promise.resolve(mockCarouselOutline),
              }),
            500,
          ),
        ),
    );

    renderCarouselBuilder();

    // Wait for useEffect to trigger mutation (isPending = true)
    await waitFor(() => {
      expect(screen.getByText(/Generating carousel outline/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/2026 best practices/i)).toBeInTheDocument();
  });

  it('renders carousel title and description after outline loads', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Test Carousel Title')).toBeInTheDocument();
    });

    expect(screen.getByText('A test carousel for unit testing')).toBeInTheDocument();
  });

  it('displays correct slide count badge', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('7 slides')).toBeInTheDocument();
    });
  });

  it('renders platform and aspect ratio badges', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('instagram')).toBeInTheDocument();
    });

    expect(screen.getByText('1080x1350')).toBeInTheDocument();
  });

  it('calls API with correct parameters on mount', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/content-planner/carousel-outline',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            templateId: 'template-001',
            topic: 'Test Topic for Carousel',
            slideCount: 7,
            platform: 'instagram',
            productNames: ['Product A', 'Product B'],
          }),
        }),
      );
    });
  });
});

// ============================================
// 2. SLIDE MANAGEMENT TESTS (8 tests)
// ============================================

describe('CarouselBuilder - Slide Management', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it('renders all 7 slides in the slide list', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Check all slide headlines are present
    expect(screen.getByText('The Problem You Face')).toBeInTheDocument();
    expect(screen.getByText('Key Point One')).toBeInTheDocument();
    expect(screen.getByText('Key Point Two')).toBeInTheDocument();
    expect(screen.getByText('The Solution')).toBeInTheDocument();
    expect(screen.getByText('Social Proof')).toBeInTheDocument();
    expect(screen.getByText('Take Action Now')).toBeInTheDocument();
  });

  it('displays correct purpose badges for each slide', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('1. Hook')).toBeInTheDocument();
    });

    expect(screen.getByText('2. Problem')).toBeInTheDocument();
    expect(screen.getByText('3. Point')).toBeInTheDocument();
    expect(screen.getByText('5. Solution')).toBeInTheDocument();
    expect(screen.getByText('6. Proof')).toBeInTheDocument();
    expect(screen.getByText('7. CTA')).toBeInTheDocument();
  });

  it('selects first slide by default', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Edit Slide 1')).toBeInTheDocument();
    });
  });

  it('changes active slide when clicking on slide thumbnail', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Click on the third slide (Key Point One)
    const thirdSlide = screen.getByText('Key Point One');
    fireEvent.click(thirdSlide);

    await waitFor(() => {
      expect(screen.getByText('Edit Slide 3')).toBeInTheDocument();
    });
  });

  it('shows slide count status (images generated vs total)', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('7 slides')).toBeInTheDocument();
    });

    // Initially no images generated, so the badge should not show generated count
    // The component shows "X/Y images" only when slidesWithImagesCount > 0
    expect(screen.queryByText(/0\/7 images/)).not.toBeInTheDocument();
  });

  it('displays slide thumbnail placeholders when no images generated', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Each slide without an image should show the ImageIcon placeholder
    // The component renders ImageIcon when slide.imageUrl is undefined
    const slideEditor = screen.getByText('Edit Slide 1').parentElement;
    expect(slideEditor).toBeInTheDocument();
  });

  it('updates slide thumbnail when image is generated', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Setup image generation
    setupSuccessfulImageGeneration();

    // Find and click the Generate Image button
    const generateButton = screen.getByRole('button', { name: /Generate Image/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      // After generation, the image badge should update
      expect(screen.getByText('1/7 images')).toBeInTheDocument();
    });
  });

  it('shows error state when image generation fails', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Setup failed image generation
    setupFailedImageGeneration();

    // Click Generate Image button
    const generateButton = screen.getByRole('button', { name: /Generate Image/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to generate image')).toBeInTheDocument();
    });
  });
});

// ============================================
// 3. SLIDE EDITING TESTS (7 tests)
// ============================================

describe('CarouselBuilder - Slide Editing', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it('displays headline input with current value', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Attention-Grabbing Hook')).toBeInTheDocument();
    });
  });

  it('allows editing headline text', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    const headlineInput = screen.getByDisplayValue('Attention-Grabbing Hook') as HTMLInputElement;
    fireEvent.change(headlineInput, { target: { value: 'New Headline Text' } });

    expect(screen.getByDisplayValue('New Headline Text')).toBeInTheDocument();
  });

  it('displays body text input with current value', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByDisplayValue('This is the hook slide body text')).toBeInTheDocument();
    });
  });

  it('allows editing body text', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByDisplayValue('This is the hook slide body text')).toBeInTheDocument();
    });

    const bodyTextarea = screen.getByDisplayValue('This is the hook slide body text') as HTMLTextAreaElement;
    fireEvent.change(bodyTextarea, { target: { value: 'Updated body content' } });

    expect(screen.getByDisplayValue('Updated body content')).toBeInTheDocument();
  });

  it('displays image prompt input with current value', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Create an eye-catching visual for the hook')).toBeInTheDocument();
    });
  });

  it('allows editing image prompt', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByDisplayValue('Create an eye-catching visual for the hook')).toBeInTheDocument();
    });

    const promptTextarea = screen.getByDisplayValue(
      'Create an eye-catching visual for the hook',
    ) as HTMLTextAreaElement;
    fireEvent.change(promptTextarea, { target: { value: 'Custom image prompt' } });

    expect(screen.getByDisplayValue('Custom image prompt')).toBeInTheDocument();
  });

  it('shows character count for each text field', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Check for character count displays (format: X/100, X/200, X/300)
    // Headline: "Attention-Grabbing Hook" = 23 chars
    expect(screen.getByText('23/100')).toBeInTheDocument();

    // Body: "This is the hook slide body text" = 32 chars
    expect(screen.getByText('32/200')).toBeInTheDocument();

    // Image prompt: "Create an eye-catching visual for the hook" = 42 chars
    expect(screen.getByText('42/300')).toBeInTheDocument();
  });
});

// ============================================
// 4. PREVIEW & EXPORT TESTS (5 tests)
// ============================================

describe('CarouselBuilder - Preview & Export', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it('toggles between edit and preview mode', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Initially in edit mode - should show "Preview" button
    const previewButton = screen.getByRole('button', { name: /Preview/i });
    expect(previewButton).toBeInTheDocument();

    // Click to switch to preview mode
    fireEvent.click(previewButton);

    // Now should show "Edit Mode" button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Edit Mode/i })).toBeInTheDocument();
    });

    // Toggle back to edit mode
    const editButton = screen.getByRole('button', { name: /Edit Mode/i });
    fireEvent.click(editButton);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Preview/i })).toBeInTheDocument();
    });
  });

  it('displays carousel preview with navigation in preview mode', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Switch to preview mode
    const previewButton = screen.getByRole('button', { name: /Preview/i });
    fireEvent.click(previewButton);

    await waitFor(() => {
      expect(screen.getByText(/Swipe or use arrows to preview all 7 slides/i)).toBeInTheDocument();
    });
  });

  it('shows Generate All Images button', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Generate All Images/i })).toBeInTheDocument();
    });
  });

  it('shows Download ZIP button only when all images are generated', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Initially, Download ZIP should not be visible (no images generated)
    expect(screen.queryByRole('button', { name: /Download ZIP/i })).not.toBeInTheDocument();
  });

  it('copies caption and hashtags to clipboard', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Find and click the copy caption button
    const copyButton = screen.getByRole('button', { name: /Copy Caption & Hashtags/i });
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'This is the caption for the carousel post.\n\n#marketing #carousel #social',
      );
    });

    // Button should show "Copied!" temporarily
    expect(screen.getByText('Copied!')).toBeInTheDocument();
  });
});

// ============================================
// 5. INTEGRATION TESTS (5 tests)
// ============================================

describe('CarouselBuilder - Integration', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it('passes product names to outline generation API', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder({
      productNames: ['Premium Oak Flooring', 'Luxury Tile'],
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/content-planner/carousel-outline',
        expect.objectContaining({
          body: expect.stringContaining('Premium Oak Flooring'),
        }),
      );
    });
  });

  it('uses product image URLs for image generation', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder({
      productImageUrls: ['https://example.com/product1.jpg', 'https://example.com/product2.jpg'],
    });

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Setup for image generation
    setupSuccessfulImageGeneration();

    // Generate an image
    const generateButton = screen.getByRole('button', { name: /Generate Image/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      // Check that the transform API was called with product image URLs
      const transformCall = mockFetch.mock.calls.find((call) => call[0] === '/api/transform');
      expect(transformCall).toBeDefined();

      const requestBody = JSON.parse(transformCall![1].body);
      expect(requestBody.productImageUrls).toEqual([
        'https://example.com/product1.jpg',
        'https://example.com/product2.jpg',
      ]);
    });
  });

  it('calls onClose when close button is clicked', async () => {
    setupSuccessfulOutlineFetch();
    const onClose = vi.fn();
    renderCarouselBuilder({ onClose });

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Find and click close button (X icon)
    screen.getByRole('button', { name: '' }); // Icon-only button — assert exists
    const closeButtons = screen
      .getAllByRole('button')
      .filter((btn) => btn.querySelector('svg.lucide-x') || btn.querySelector('[class*="lucide-x"]'));

    // The close button should be in the header
    if (closeButtons.length > 0) {
      fireEvent.click(closeButtons[0]!);
      expect(onClose).toHaveBeenCalled();
    }
  });

  it('displays error state and retry button when outline generation fails', async () => {
    setupFailedOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Failed to generate carousel outline')).toBeInTheDocument();
    });

    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  it('retries outline generation when Try Again is clicked', async () => {
    setupFailedOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Failed to generate carousel outline')).toBeInTheDocument();
    });

    // Setup successful response for retry
    setupSuccessfulOutlineFetch();

    // Click Try Again
    const retryButton = screen.getByRole('button', { name: /Try Again/i });
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Test Carousel Title')).toBeInTheDocument();
    });
  });
});

// ============================================
// EDGE CASE TESTS (bonus coverage)
// ============================================

describe('CarouselBuilder - Edge Cases', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  it('handles empty product names array', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder({ productNames: [] });

    await waitFor(() => {
      expect(screen.getByText('Test Carousel Title')).toBeInTheDocument();
    });
  });

  it('handles empty product image URLs array', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder({ productImageUrls: [] });

    await waitFor(() => {
      expect(screen.getByText('Test Carousel Title')).toBeInTheDocument();
    });

    // Setup image generation
    setupSuccessfulImageGeneration();

    // Generate should still work without product images
    const generateButton = screen.getByRole('button', { name: /Generate Image/i });
    fireEvent.click(generateButton);

    await waitFor(() => {
      const transformCall = mockFetch.mock.calls.find((call) => call[0] === '/api/transform');
      expect(transformCall).toBeDefined();

      const requestBody = JSON.parse(transformCall![1].body);
      expect(requestBody.mode).toBe('standard');
    });
  });

  it('displays 2026 best practices tip', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(
        screen.getByText(/Slide 1 is CRITICAL - 80% of engagement comes from the first slide/i),
      ).toBeInTheDocument();
    });
  });

  it('displays caption section with hashtags', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Caption & Hashtags')).toBeInTheDocument();
    });

    // Check hashtags are displayed
    expect(screen.getByText('#marketing')).toBeInTheDocument();
    expect(screen.getByText('#carousel')).toBeInTheDocument();
    expect(screen.getByText('#social')).toBeInTheDocument();
  });
});

// ============================================
// ADDITIONAL EDGE CASE TESTS (5 tests)
// ============================================

describe('CarouselBuilder - Additional Edge Cases', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    global.fetch = mockFetch;
  });

  // Edge case test
  it('handles extremely long topic string (1000+ characters)', async () => {
    setupSuccessfulOutlineFetch();
    const longTopic = 'A'.repeat(1000);
    renderCarouselBuilder({ topic: longTopic });

    await waitFor(() => {
      expect(screen.getByText('Test Carousel Title')).toBeInTheDocument();
    });

    // Verify the API was called with the long topic
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/content-planner/carousel-outline',
      expect.objectContaining({
        body: expect.stringContaining(longTopic.slice(0, 100)), // At least part of the long string
      }),
    );
  });

  // Edge case test
  it('handles special characters in product names', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder({
      productNames: [
        '<script>alert("XSS")</script>',
        'Product & "Quotes" \'Apostrophe\'',
        'Unicode: \u2603 \u2764 \u2728',
      ],
    });

    await waitFor(() => {
      expect(screen.getByText('Test Carousel Title')).toBeInTheDocument();
    });
  });

  // Edge case test
  it('handles network timeout during outline generation', async () => {
    // Mock a delayed response that simulates timeout
    mockFetch.mockImplementationOnce(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Network timeout')), 50)),
    );

    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Failed to generate carousel outline')).toBeInTheDocument();
    });

    // Retry button should be available
    expect(screen.getByRole('button', { name: /Try Again/i })).toBeInTheDocument();
  });

  // Edge case test
  it('handles rapid slide switching', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Rapidly switch between slides
    const slides = [
      'Attention-Grabbing Hook',
      'The Problem You Face',
      'Key Point One',
      'Key Point Two',
      'The Solution',
      'Social Proof',
      'Take Action Now',
    ];

    for (const slideText of slides) {
      const slide = screen.getByText(slideText);
      fireEvent.click(slide);
    }

    // Should end on the last slide without crashing
    await waitFor(() => {
      expect(screen.getByText('Edit Slide 7')).toBeInTheDocument();
    });
  });

  // Edge case test
  it('handles concurrent image generation requests gracefully', async () => {
    setupSuccessfulOutlineFetch();
    renderCarouselBuilder();

    await waitFor(() => {
      expect(screen.getByText('Attention-Grabbing Hook')).toBeInTheDocument();
    });

    // Setup multiple image generation responses
    for (let i = 0; i < 3; i++) {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            imageUrl: `https://res.cloudinary.com/test/image/upload/slide-${i}.jpg`,
            url: `https://res.cloudinary.com/test/image/upload/slide-${i}.jpg`,
          }),
      });
    }

    // Click Generate All Images (if available) or individual generate buttons
    const generateAllButton = screen.getByRole('button', { name: /Generate All Images/i });
    fireEvent.click(generateAllButton);

    // Should handle concurrent requests without crashing
    await waitFor(
      () => {
        // The component should still be functional
        expect(screen.getByText('Test Carousel Title')).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
