// @vitest-environment jsdom
// @ts-nocheck
/**
 * PostDetailSheet Component Tests
 *
 * Tests:
 * 1. Renders post caption and status
 * 2. Shows cancel button for scheduled posts
 * 3. Shows retry button for failed posts
 * 4. Cancel button calls API and closes sheet
 * 5. Shows character count
 * 6. Renders timeline with correct steps
 * 7. Shows platform label
 * 8. Shows reschedule button for scheduled posts
 * 9. Shows publishing state with disabled button
 */
import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test-utils';
import '@testing-library/jest-dom';
import { server, http, HttpResponse } from '@/mocks/server';
import { PostDetailSheet } from '../PostDetailSheet';
import type { ScheduledPost } from '@/hooks/useScheduledPosts';

/* ------------------------------------------------------------------ */
/*  Polyfill: window.matchMedia (not available in jsdom)               */
/* ------------------------------------------------------------------ */

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

/* ------------------------------------------------------------------ */
/*  Mock data                                                          */
/* ------------------------------------------------------------------ */

function createMockPost(
  overrides: Partial<ScheduledPost & { platform?: string }> = {},
): ScheduledPost & { platform?: string } {
  const now = new Date();
  return {
    id: 'post-test-1',
    userId: 'user-1',
    connectionId: 'conn-1',
    caption: 'Test post caption for PostDetailSheet #testing',
    hashtags: ['testing', 'vitest'],
    imageUrl: null,
    imagePublicId: null,
    scheduledFor: new Date(Date.now() + 86400000).toISOString(),
    timezone: 'UTC',
    status: 'scheduled',
    publishedAt: null,
    platformPostId: null,
    platformPostUrl: null,
    errorMessage: null,
    retryCount: 0,
    generationId: null,
    templateId: null,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    platform: 'linkedin',
    ...overrides,
  };
}

/* ------------------------------------------------------------------ */
/*  Setup & Teardown                                                   */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  server.use(
    http.get('/api/csrf-token', () => {
      return HttpResponse.json({ csrfToken: 'test-csrf-token' });
    }),
    http.patch('/api/calendar/posts/:id/cancel', () => {
      return HttpResponse.json({ id: 'post-test-1', status: 'cancelled' });
    }),
    http.post('/api/calendar/schedule', () => {
      return HttpResponse.json({ id: 'post-test-1', status: 'scheduled' });
    }),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('PostDetailSheet', () => {
  it('renders post caption and status', () => {
    const post = createMockPost();

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    expect(screen.getByText('Test post caption for PostDetailSheet #testing')).toBeInTheDocument();
    // Platform label should appear
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
  });

  it('shows cancel button for scheduled posts', () => {
    const post = createMockPost({ status: 'scheduled' });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('shows retry button for failed posts', () => {
    const post = createMockPost({
      status: 'failed',
      errorMessage: 'API rate limit exceeded',
    });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('cancel button calls API and closes sheet', async () => {
    const onOpenChange = vi.fn();
    const post = createMockPost({ status: 'scheduled' });

    render(<PostDetailSheet open={true} onOpenChange={onOpenChange} post={post} />);

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows character count', () => {
    const post = createMockPost({
      caption: 'Short caption',
      platform: 'linkedin',
    });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    // Caption length "Short caption" = 13 chars, LinkedIn limit = 3,000
    expect(screen.getByText('13/3,000')).toBeInTheDocument();
  });

  it('renders timeline with correct steps for scheduled post', () => {
    const post = createMockPost({ status: 'scheduled' });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    // Timeline should show Created, Scheduled, Publishing (future)
    expect(screen.getByText('Post Lifecycle')).toBeInTheDocument();
    expect(screen.getByText('Created')).toBeInTheDocument();
    // "Scheduled" appears in both status badge and timeline step
    const scheduledElements = screen.getAllByText('Scheduled');
    expect(scheduledElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Publishing')).toBeInTheDocument();
  });

  it('renders timeline with Published step for published post', () => {
    const post = createMockPost({
      status: 'published',
      publishedAt: new Date().toISOString(),
      platformPostUrl: 'https://linkedin.com/post/123',
    });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    // "Published" appears in both status badge and timeline
    const publishedElements = screen.getAllByText('Published');
    expect(publishedElements.length).toBeGreaterThanOrEqual(2);
  });

  it('renders timeline with Failed step and error message', () => {
    const post = createMockPost({
      status: 'failed',
      errorMessage: 'API rate limit exceeded',
    });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    // "Failed" appears in both status badge and timeline
    const failedElements = screen.getAllByText('Failed');
    expect(failedElements.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('API rate limit exceeded')).toBeInTheDocument();
  });

  it('shows platform label correctly', () => {
    const post = createMockPost({ platform: 'instagram' });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    expect(screen.getByText('Instagram')).toBeInTheDocument();
  });

  it('shows reschedule button for scheduled posts', () => {
    const post = createMockPost({ status: 'scheduled' });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    expect(screen.getByText('Reschedule')).toBeInTheDocument();
  });

  it('shows disabled publishing button when status is publishing', () => {
    const post = createMockPost({ status: 'publishing' });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    const publishingButton = screen.getByText('Publishing...');
    expect(publishingButton.closest('button')).toBeDisabled();
  });

  it('shows hashtag badges', () => {
    const post = createMockPost({ hashtags: ['testing', 'vitest'] });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    expect(screen.getByText('testing')).toBeInTheDocument();
    expect(screen.getByText('vitest')).toBeInTheDocument();
  });

  it('shows retry count in footer when retryCount > 0', () => {
    const post = createMockPost({
      status: 'failed',
      retryCount: 3,
      errorMessage: 'Timeout',
    });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    expect(screen.getByText('3 retries')).toBeInTheDocument();
  });

  it('shows "View on LinkedIn" button for published posts with URL', () => {
    const post = createMockPost({
      status: 'published',
      publishedAt: new Date().toISOString(),
      platformPostUrl: 'https://linkedin.com/post/123',
      platform: 'linkedin',
    });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    // There should be a "View on LinkedIn" action button
    const viewButtons = screen.getAllByText(/View on LinkedIn/i);
    expect(viewButtons.length).toBeGreaterThan(0);
  });

  it('returns null when post is null', () => {
    const { container } = render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={null} />);

    // Sheet should not render any content when post is null
    expect(container.querySelector('[data-state]')).toBeNull();
  });

  it('shows "No caption" when caption is empty', () => {
    const post = createMockPost({ caption: '' });

    render(<PostDetailSheet open={true} onOpenChange={vi.fn()} post={post} />);

    expect(screen.getByText('No caption')).toBeInTheDocument();
  });
});
