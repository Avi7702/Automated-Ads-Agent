// @vitest-environment jsdom
// @ts-nocheck
/**
 * PipelineDashboard Component Tests
 *
 * Tests:
 * 1. Renders stat cards with API data
 * 2. Renders activity feed items
 * 3. Shows loading skeleton while fetching
 * 4. Shows empty state when no activity
 * 5. Opens post detail sheet on activity click
 */
import React from 'react';
import { describe, it, expect, vi, beforeAll, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@/test-utils';
import '@testing-library/jest-dom';
import { server, http, HttpResponse } from '@/mocks/server';
import PipelineDashboard from '../PipelineDashboard';

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

const mockDashboardData = {
  stats: { upcoming: 5, publishing: 1, published: 23, failed: 2 },
  recentActivity: [
    {
      id: 'test-post-1',
      caption: 'Test post for dashboard component',
      status: 'published',
      platform: 'linkedin',
      scheduledFor: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      platformPostUrl: 'https://linkedin.com/test',
      errorMessage: null,
      imageUrl: null,
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'test-post-2',
      caption: 'Another test post scheduled',
      status: 'scheduled',
      platform: 'instagram',
      scheduledFor: new Date(Date.now() + 86400000).toISOString(),
      publishedAt: null,
      platformPostUrl: null,
      errorMessage: null,
      imageUrl: null,
      updatedAt: new Date().toISOString(),
    },
  ],
};

const mockPostDetail = {
  id: 'test-post-1',
  userId: 'u1',
  connectionId: 'c1',
  caption: 'Test post for dashboard component',
  hashtags: ['testing'],
  imageUrl: null,
  imagePublicId: null,
  scheduledFor: new Date().toISOString(),
  timezone: 'UTC',
  status: 'published',
  publishedAt: new Date().toISOString(),
  platformPostId: 'li-123',
  platformPostUrl: 'https://linkedin.com/test',
  errorMessage: null,
  retryCount: 0,
  generationId: null,
  templateId: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/* ------------------------------------------------------------------ */
/*  Mock framer-motion to avoid animation issues in tests              */
/* ------------------------------------------------------------------ */

vi.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, initial, animate, variants, custom, transition, ...props }, ref) =>
      React.createElement('div', { ...props, ref }, children),
    ),
  },
  AnimatePresence: ({ children }) => children,
}));

/* ------------------------------------------------------------------ */
/*  Setup & Teardown                                                   */
/* ------------------------------------------------------------------ */

beforeEach(() => {
  server.use(
    http.get('/api/calendar/dashboard', () => {
      return HttpResponse.json(mockDashboardData);
    }),
    http.get('/api/calendar/posts/:id', ({ params }) => {
      return HttpResponse.json({ ...mockPostDetail, id: params.id });
    }),
    http.get('/api/csrf-token', () => {
      return HttpResponse.json({ csrfToken: 'test-csrf-token' });
    }),
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

/* ------------------------------------------------------------------ */
/*  Tests                                                              */
/* ------------------------------------------------------------------ */

describe('PipelineDashboard', () => {
  it('renders stat cards with data from API', async () => {
    render(<PipelineDashboard />);

    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();
    // "Publishing" may appear as stat label and as activity status badge
    expect(screen.getAllByText('Publishing').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('23')).toBeInTheDocument();
    // "Published" appears as both stat card label and activity status badge
    expect(screen.getAllByText('Published').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  it('renders activity feed items', async () => {
    render(<PipelineDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Test post for dashboard component')).toBeInTheDocument();
    });

    expect(screen.getByText('Another test post scheduled')).toBeInTheDocument();
  });

  it('shows loading skeleton while fetching', () => {
    // Override with a handler that delays response
    server.use(
      http.get('/api/calendar/dashboard', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        return HttpResponse.json(mockDashboardData);
      }),
    );

    render(<PipelineDashboard />);

    // The loading skeleton uses animate-pulse class
    const pulsingElements = document.querySelectorAll('.animate-pulse');
    expect(pulsingElements.length).toBeGreaterThan(0);
  });

  it('shows empty state when no activity', async () => {
    server.use(
      http.get('/api/calendar/dashboard', () => {
        return HttpResponse.json({
          stats: { upcoming: 0, publishing: 0, published: 0, failed: 0 },
          recentActivity: [],
        });
      }),
    );

    render(<PipelineDashboard />);

    await waitFor(() => {
      expect(screen.getByText('No publishing activity yet')).toBeInTheDocument();
    });

    expect(screen.getByText('Schedule your first post to see it here')).toBeInTheDocument();
  });

  it('renders Publishing Activity heading', async () => {
    render(<PipelineDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Publishing Activity')).toBeInTheDocument();
    });
  });

  it('renders Quick Actions section with buttons', async () => {
    render(<PipelineDashboard />);

    await waitFor(() => {
      expect(screen.getByText('Quick Actions')).toBeInTheDocument();
    });

    expect(screen.getByText('Schedule Post')).toBeInTheDocument();
    expect(screen.getByText('Publish Now')).toBeInTheDocument();
    expect(screen.getByText('View Calendar')).toBeInTheDocument();
  });

  it('shows platform badges for activity items', async () => {
    render(<PipelineDashboard />);

    await waitFor(() => {
      expect(screen.getByText('LI')).toBeInTheDocument(); // LinkedIn badge
    });

    expect(screen.getByText('IG')).toBeInTheDocument(); // Instagram badge
  });

  it('shows view link for published posts', async () => {
    render(<PipelineDashboard />);

    await waitFor(() => {
      expect(screen.getByText(/View on LinkedIn/i)).toBeInTheDocument();
    });
  });

  it('displays stat values as zero when API returns zero counts', async () => {
    server.use(
      http.get('/api/calendar/dashboard', () => {
        return HttpResponse.json({
          stats: { upcoming: 0, publishing: 0, published: 0, failed: 0 },
          recentActivity: [],
        });
      }),
    );

    render(<PipelineDashboard />);

    await waitFor(() => {
      // All four stat cards should show 0
      const zeros = screen.getAllByText('0');
      expect(zeros).toHaveLength(4);
    });
  });
});
