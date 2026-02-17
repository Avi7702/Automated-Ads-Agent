/**
 * MSW API Route Handlers
 *
 * These handlers mock all API endpoints for frontend testing.
 * Handlers return realistic mock data that matches the actual API responses.
 */
import { http, HttpResponse } from 'msw';

// Mock data
const mockUsers = [
  { id: '1', email: 'test@example.com', username: 'testuser', createdAt: new Date().toISOString() },
  { id: '2', email: 'demo@example.com', username: 'demouser', createdAt: new Date().toISOString() },
];

const mockProducts = [
  {
    id: '1',
    name: 'Test Product 1',
    description: 'A high-quality test product',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Test Product 2',
    description: 'Another great test product',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/sample2.jpg',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Premium Widget',
    description: 'Premium quality widget for all your needs',
    cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/widget.jpg',
    createdAt: new Date().toISOString(),
  },
];

const mockGenerations = [
  {
    id: 'gen-1',
    prompt: 'Create an Instagram ad for Test Product',
    platform: 'instagram',
    resultUrl: 'https://res.cloudinary.com/demo/image/upload/ad1.jpg',
    status: 'completed',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'gen-2',
    prompt: 'Create a Facebook ad',
    platform: 'facebook',
    resultUrl: 'https://res.cloudinary.com/demo/image/upload/ad2.jpg',
    status: 'completed',
    createdAt: new Date().toISOString(),
  },
];

const mockTemplates = [
  {
    id: 'tpl-1',
    name: 'Instagram Story Template',
    platform: 'instagram',
    category: 'story',
    preview: 'https://res.cloudinary.com/demo/image/upload/template1.jpg',
  },
  {
    id: 'tpl-2',
    name: 'Facebook Feed Template',
    platform: 'facebook',
    category: 'feed',
    preview: 'https://res.cloudinary.com/demo/image/upload/template2.jpg',
  },
];

const mockJobs: Record<string, { id: string; status: string; progress?: number; result?: unknown }> = {
  'job-123': { id: 'job-123', status: 'processing', progress: 50 },
  'completed-job': {
    id: 'completed-job',
    status: 'completed',
    result: {
      url: 'https://res.cloudinary.com/demo/image/upload/result.jpg',
      generationId: 'gen-3',
    },
  },
  'new-job': { id: 'new-job', status: 'pending', progress: 0 },
};

const mockCopy = [
  {
    id: 'copy-1',
    productName: 'Test Product',
    platform: 'instagram',
    headline: 'Transform Your Space',
    body: 'Discover the perfect solution for your home.',
    callToAction: 'Shop Now',
    variations: [
      { headline: 'Transform Your Space', body: 'Discover the perfect solution.' },
      { headline: 'Elevate Your Home', body: 'Find your perfect match today.' },
    ],
    createdAt: new Date().toISOString(),
  },
];

export const handlers = [
  // ============ CSRF Token Endpoint ============
  http.get('/api/csrf-token', () => {
    return HttpResponse.json({ csrfToken: 'test-csrf-token' });
  }),

  // ============ Auth Endpoints ============
  http.post('/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string };

    if (body.password === 'wrong') {
      return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = mockUsers.find((u) => u.email === body.email) || {
      id: '1',
      email: body.email,
      username: body.email.split('@')[0],
      createdAt: new Date().toISOString(),
    };

    return HttpResponse.json(user);
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = (await request.json()) as { email: string; password: string; username: string };

    const newUser = {
      id: String(mockUsers.length + 1),
      email: body.email,
      username: body.username,
      createdAt: new Date().toISOString(),
    };

    return HttpResponse.json(newUser, { status: 201 });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  http.get('/api/auth/me', () => {
    return HttpResponse.json(mockUsers[0]);
  }),

  http.get('/api/auth/demo', () => {
    return HttpResponse.json(mockUsers[1]);
  }),

  // ============ Products Endpoints ============
  http.get('/api/products', () => {
    return HttpResponse.json(mockProducts);
  }),

  http.get('/api/products/:id', ({ params }) => {
    const product = mockProducts.find((p) => p.id === params['id']);
    if (!product) {
      return HttpResponse.json({ error: 'Product not found' }, { status: 404 });
    }
    return HttpResponse.json(product);
  }),

  http.post('/api/products', async ({ request }) => {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const description = formData.get('description') as string;

    const newProduct = {
      id: String(mockProducts.length + 1),
      name: name || 'New Product',
      description: description || '',
      cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/new.jpg',
      createdAt: new Date().toISOString(),
    };

    return HttpResponse.json(newProduct, { status: 201 });
  }),

  http.delete('/api/products/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  http.delete('/api/products', () => {
    return HttpResponse.json({ success: true, deleted: 0 });
  }),

  // ============ Generations Endpoints ============
  http.get('/api/generations', () => {
    return HttpResponse.json(mockGenerations);
  }),

  http.get('/api/generations/:id', ({ params }) => {
    const generation = mockGenerations.find((g) => g.id === params['id']);
    if (!generation) {
      return HttpResponse.json({ error: 'Generation not found' }, { status: 404 });
    }
    return HttpResponse.json(generation);
  }),

  http.get('/api/generations/:id/history', () => {
    return HttpResponse.json([
      { id: 'edit-1', action: 'color', timestamp: new Date().toISOString() },
      { id: 'edit-2', action: 'brightness', timestamp: new Date().toISOString() },
    ]);
  }),

  http.post('/api/generations/:id/edit', async () => {
    return HttpResponse.json({
      jobId: `job-${Date.now()}`,
      status: 'processing',
    });
  }),

  http.delete('/api/generations/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/generations/:id/analyze', () => {
    return HttpResponse.json({
      success: true,
      analysis: {
        colors: ['#FF5733', '#33FF57'],
        composition: 'balanced',
        quality: 'high',
      },
    });
  }),

  // ============ Idea Bank Endpoints ============
  http.post('/api/idea-bank/suggest', async () => {
    return HttpResponse.json({
      suggestions: [
        {
          id: 'suggestion-1',
          title: 'Summer Sale Campaign',
          description: 'Bright, energetic campaign for summer products',
          confidence: 0.92,
        },
        {
          id: 'suggestion-2',
          title: 'Minimalist Product Showcase',
          description: 'Clean, modern aesthetic focusing on product details',
          confidence: 0.88,
        },
      ],
      metadata: {
        generatedAt: new Date().toISOString(),
        productsAnalyzed: 2,
      },
    });
  }),

  http.get('/api/idea-bank/templates/:productId', () => {
    return HttpResponse.json([
      { id: 'template-1', name: 'Product Hero', category: 'hero' },
      { id: 'template-2', name: 'Lifestyle Shot', category: 'lifestyle' },
    ]);
  }),

  // ============ Jobs Endpoints ============
  http.get('/api/jobs/:jobId', ({ params }) => {
    const jobId = params['jobId'] as string;
    const job = mockJobs[jobId] || {
      id: jobId,
      status: 'pending',
      progress: 0,
    };
    return HttpResponse.json(job);
  }),

  // ============ Health Endpoints ============
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),

  http.get('/api/health/live', () => {
    return HttpResponse.json({ status: 'ok' });
  }),

  http.get('/api/health/ready', () => {
    return HttpResponse.json({ status: 'ok', database: 'connected', cache: 'connected' });
  }),

  // ============ Transform Endpoint ============
  http.post('/api/transform', async () => {
    return HttpResponse.json({
      jobId: `job-${Date.now()}`,
      status: 'processing',
      message: 'Generation started',
    });
  }),

  // ============ Templates Endpoints ============
  http.get('/api/templates', () => {
    return HttpResponse.json(mockTemplates);
  }),

  http.get('/api/templates/:id', ({ params }) => {
    const template = mockTemplates.find((t) => t.id === params['id']);
    if (!template) {
      return HttpResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return HttpResponse.json(template);
  }),

  http.get('/api/templates/search', ({ request }) => {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const filtered = mockTemplates.filter(
      (t) =>
        t.name.toLowerCase().includes(query.toLowerCase()) || t.category.toLowerCase().includes(query.toLowerCase()),
    );
    return HttpResponse.json(filtered);
  }),

  http.post('/api/templates', async ({ request }) => {
    const body = (await request.json()) as { name: string; platform: string; category: string };
    const newTemplate = {
      id: `tpl-${Date.now()}`,
      name: body.name,
      platform: body.platform,
      category: body.category,
      preview: 'https://res.cloudinary.com/demo/image/upload/new-template.jpg',
    };
    return HttpResponse.json(newTemplate, { status: 201 });
  }),

  http.patch('/api/templates/:id', async ({ params, request }) => {
    const body = (await request.json()) as Partial<{ name: string; platform: string; category: string }>;
    const template = mockTemplates.find((t) => t.id === params['id']);
    if (!template) {
      return HttpResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return HttpResponse.json({ ...template, ...body });
  }),

  http.delete('/api/templates/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  // ============ Copywriting Endpoints ============
  http.post('/api/copy/generate', async () => {
    return HttpResponse.json({
      variations: [
        {
          headline: 'Transform Your Space Today',
          body: 'Discover premium quality products designed for modern living.',
          callToAction: 'Shop Now',
          score: 0.95,
        },
        {
          headline: 'Elevate Your Home',
          body: 'Find the perfect addition to your space.',
          callToAction: 'Learn More',
          score: 0.88,
        },
        {
          headline: 'Quality You Can Trust',
          body: 'Built to last, designed to impress.',
          callToAction: 'Get Started',
          score: 0.85,
        },
      ],
      metadata: {
        platform: 'instagram',
        objective: 'awareness',
        generatedAt: new Date().toISOString(),
      },
    });
  }),

  http.get('/api/copy/generation/:generationId', () => {
    return HttpResponse.json(mockCopy);
  }),

  http.get('/api/copy/:id', ({ params }) => {
    const copy = mockCopy.find((c) => c.id === params['id']);
    if (!copy) {
      return HttpResponse.json({ error: 'Copy not found' }, { status: 404 });
    }
    return HttpResponse.json(copy);
  }),

  http.delete('/api/copy/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/copywriting/standalone', async () => {
    return HttpResponse.json({
      copy: {
        headline: 'Standalone Copy Headline',
        body: 'This is standalone copy generation.',
        callToAction: 'Act Now',
      },
      score: 0.9,
    });
  }),

  // ============ Ad Templates Endpoints ============
  http.get('/api/ad-templates/categories', () => {
    return HttpResponse.json(['hero', 'lifestyle', 'product', 'seasonal', 'promotional']);
  }),

  http.get('/api/ad-templates', () => {
    return HttpResponse.json(mockTemplates);
  }),

  http.get('/api/ad-templates/:id', ({ params }) => {
    const template = mockTemplates.find((t) => t.id === params['id']);
    if (!template) {
      return HttpResponse.json({ error: 'Template not found' }, { status: 404 });
    }
    return HttpResponse.json(template);
  }),

  // ============ Prompt Templates Endpoints ============
  http.get('/api/prompt-templates', () => {
    return HttpResponse.json([
      { id: 'pt-1', name: 'Product Showcase', template: 'Create an ad showcasing {product}' },
      { id: 'pt-2', name: 'Seasonal Sale', template: 'Design a {season} sale banner for {product}' },
    ]);
  }),

  http.post('/api/prompt-templates', async ({ request }) => {
    const body = (await request.json()) as { name: string; template: string };
    return HttpResponse.json(
      {
        id: `pt-${Date.now()}`,
        name: body.name,
        template: body.template,
      },
      { status: 201 },
    );
  }),

  http.delete('/api/prompt-templates/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  // ============ User Settings Endpoints ============
  http.put('/api/user/brand-voice', async ({ request }) => {
    const body = (await request.json()) as { brandVoice: string };
    return HttpResponse.json({
      success: true,
      brandVoice: body.brandVoice,
    });
  }),

  // ============ Brand Profile Endpoints ============
  http.get('/api/brand-profile', () => {
    return HttpResponse.json({
      id: 'brand-1',
      name: 'Test Brand',
      description: 'A test brand for development',
      colors: ['#FF5733', '#33FF57', '#3357FF'],
      fonts: ['Inter', 'Roboto'],
    });
  }),

  http.put('/api/brand-profile', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json({
      id: 'brand-1',
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.delete('/api/brand-profile', () => {
    return HttpResponse.json({ success: true });
  }),

  // ============ Quota Endpoints ============
  http.get('/api/quota/status', () => {
    return HttpResponse.json({
      used: 150,
      limit: 1000,
      remaining: 850,
      resetAt: new Date(Date.now() + 86400000).toISOString(),
    });
  }),

  http.get('/api/quota/history', () => {
    return HttpResponse.json([
      { date: '2025-01-26', used: 50 },
      { date: '2025-01-25', used: 75 },
      { date: '2025-01-24', used: 30 },
    ]);
  }),

  // ============ Pricing Endpoints ============
  http.get('/api/pricing/estimate', ({ request }) => {
    const url = new URL(request.url);
    const count = parseInt(url.searchParams.get('count') || '1');
    return HttpResponse.json({
      count,
      estimatedCost: count * 0.05,
      currency: 'USD',
    });
  }),

  // ============ Settings Endpoints ============
  http.get('/api/settings/api-keys', () => {
    return HttpResponse.json({
      gemini: { configured: true, lastUsed: new Date().toISOString() },
      cloudinary: { configured: true, lastUsed: new Date().toISOString() },
      openai: { configured: false },
    });
  }),

  http.post('/api/settings/api-keys/:service', async ({ params }) => {
    return HttpResponse.json({
      service: params['service'],
      configured: true,
      message: `API key for ${params['service']} saved successfully`,
    });
  }),

  http.delete('/api/settings/api-keys/:service', ({ params }) => {
    return HttpResponse.json({
      service: params['service'],
      configured: false,
      message: `API key for ${params['service']} removed`,
    });
  }),

  http.post('/api/settings/api-keys/:service/validate', async ({ params }) => {
    return HttpResponse.json({
      service: params['service'],
      valid: true,
      message: 'API key is valid',
    });
  }),

  // ============ Image Analysis Endpoint ============
  http.post('/api/analyze-image', async () => {
    return HttpResponse.json({
      success: true,
      analysis: {
        objects: ['product', 'background'],
        colors: ['#FF5733', '#FFFFFF'],
        style: 'modern',
        suggestions: ['Add more contrast', 'Consider cropping'],
      },
    });
  }),

  // ============ Installation Scenarios Endpoints ============
  http.get('/api/installation-scenarios', () => {
    return HttpResponse.json([
      { id: 'is-1', name: 'Living Room Setup', roomType: 'living_room' },
      { id: 'is-2', name: 'Kitchen Installation', roomType: 'kitchen' },
    ]);
  }),

  http.get('/api/installation-scenarios/:id', ({ params }) => {
    return HttpResponse.json({
      id: params['id'],
      name: 'Sample Scenario',
      roomType: 'living_room',
      steps: ['Step 1', 'Step 2', 'Step 3'],
    });
  }),

  // ============ Brand Images Endpoints ============
  http.get('/api/brand-images', () => {
    return HttpResponse.json([
      { id: 'bi-1', url: 'https://example.com/brand1.jpg', category: 'logo' },
      { id: 'bi-2', url: 'https://example.com/brand2.jpg', category: 'banner' },
    ]);
  }),

  // ============ Performing Ad Templates Endpoints ============
  http.get('/api/performing-ad-templates', () => {
    return HttpResponse.json([
      { id: 'pat-1', name: 'High CTR Template', performance: 0.95 },
      { id: 'pat-2', name: 'Best Converter', performance: 0.88 },
    ]);
  }),

  http.get('/api/performing-ad-templates/featured', () => {
    return HttpResponse.json([{ id: 'pat-1', name: 'Featured Template', performance: 0.95 }]);
  }),

  http.get('/api/performing-ad-templates/top', () => {
    return HttpResponse.json([{ id: 'pat-1', name: 'Top Performer', performance: 0.98 }]);
  }),

  // ============ Content Planner Endpoints ============
  http.get('/api/content-planner/templates', () => {
    return HttpResponse.json([
      { id: 'cp-1', name: 'Weekly Post Plan', frequency: 'weekly' },
      { id: 'cp-2', name: 'Daily Stories', frequency: 'daily' },
    ]);
  }),

  http.get('/api/content-planner/posts', () => {
    return HttpResponse.json([
      { id: 'post-1', scheduledFor: new Date().toISOString(), status: 'scheduled' },
      { id: 'post-2', scheduledFor: new Date().toISOString(), status: 'draft' },
    ]);
  }),

  http.post('/api/content-planner/posts', async ({ request }) => {
    const body = (await request.json()) as Record<string, unknown>;
    return HttpResponse.json(
      {
        id: `post-${Date.now()}`,
        ...body,
        status: 'draft',
        createdAt: new Date().toISOString(),
      },
      { status: 201 },
    );
  }),

  http.delete('/api/content-planner/posts/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  // Carousel outline generation endpoint
  http.post('/api/content-planner/carousel-outline', async ({ request }) => {
    const body = (await request.json()) as {
      templateId: string;
      topic: string;
      slideCount?: number;
      platform: string;
      productNames?: string[];
    };

    const slideCount = body.slideCount || 7;

    return HttpResponse.json({
      outline: {
        title: `Carousel: ${body.topic}`,
        description: `A ${slideCount}-slide carousel about ${body.topic}`,
        slideCount,
        slides: [
          {
            slideNumber: 1,
            purpose: 'hook',
            headline: 'Attention-Grabbing Hook',
            body: 'This is the hook slide body text',
            imagePrompt: 'Create an eye-catching visual for the hook',
          },
          {
            slideNumber: 2,
            purpose: 'problem',
            headline: 'The Problem You Face',
            body: 'Describing the pain point',
            imagePrompt: 'Visualize the problem scenario',
          },
          {
            slideNumber: 3,
            purpose: 'point',
            headline: 'Key Point One',
            body: 'Supporting information',
            imagePrompt: 'Illustrate the first key point',
          },
          {
            slideNumber: 4,
            purpose: 'point',
            headline: 'Key Point Two',
            body: 'More supporting information',
            imagePrompt: 'Illustrate the second key point',
          },
          {
            slideNumber: 5,
            purpose: 'solution',
            headline: 'The Solution',
            body: 'How we solve the problem',
            imagePrompt: 'Show the solution in action',
          },
          {
            slideNumber: 6,
            purpose: 'proof',
            headline: 'Social Proof',
            body: 'Testimonials and results',
            imagePrompt: 'Display proof and credibility',
          },
          {
            slideNumber: 7,
            purpose: 'cta',
            headline: 'Take Action Now',
            body: 'Call to action details',
            imagePrompt: 'Create a compelling CTA visual',
          },
        ].slice(0, slideCount),
        captionCopy: `Check out this carousel about ${body.topic}! Perfect for your social media.`,
        hashtags: ['marketing', 'carousel', 'social', body.platform],
      },
    });
  }),

  // ============ Learned Patterns Endpoints ============
  http.get('/api/learned-patterns', () => {
    return HttpResponse.json([
      { id: 'lp-1', name: 'Color Scheme Pattern', category: 'color' },
      { id: 'lp-2', name: 'Layout Pattern', category: 'layout' },
    ]);
  }),

  http.get('/api/learned-patterns/:patternId', ({ params }) => {
    return HttpResponse.json({
      id: params['patternId'],
      name: 'Sample Pattern',
      category: 'general',
      data: { key: 'value' },
    });
  }),

  // ============ Monitoring Endpoints ============
  http.get('/api/monitoring/health', () => {
    return HttpResponse.json({
      status: 'healthy',
      uptime: 86400,
      services: { database: 'up', cache: 'up', ai: 'up' },
    });
  }),

  http.get('/api/monitoring/performance', () => {
    return HttpResponse.json({
      avgResponseTime: 150,
      requestsPerMinute: 45,
      errorRate: 0.02,
    });
  }),

  http.get('/api/monitoring/system', () => {
    return HttpResponse.json({
      cpu: 35,
      memory: 60,
      disk: 45,
    });
  }),

  // ============ Social Accounts Endpoints ============
  http.get('/api/social/accounts', () => {
    return HttpResponse.json([
      { id: 'sa-1', platform: 'instagram', username: '@testbrand', connected: true },
      { id: 'sa-2', platform: 'facebook', username: 'Test Brand Page', connected: true },
    ]);
  }),

  http.delete('/api/social/accounts/:id', () => {
    return HttpResponse.json({ success: true });
  }),

  http.post('/api/social/sync-accounts', async () => {
    return HttpResponse.json({
      success: true,
      synced: 2,
      accounts: [
        { id: 'sa-1', platform: 'instagram', synced: true },
        { id: 'sa-2', platform: 'facebook', synced: true },
      ],
    });
  }),
];
