/**
 * Shared helpers for route integration tests.
 *
 * Builds a mock RouterContext with injectable overrides and wires
 * up a tiny Express app that can be driven with supertest.
 */

import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import session from 'express-session';
import type { RouterContext, RouterFactory } from '../../types/router';

/* ------------------------------------------------------------------ */
/*  Mock Storage                                                       */
/* ------------------------------------------------------------------ */

/** Returns a Proxy-based mock storage where every method is a vi.fn(). */
export function createMockStorage(): RouterContext['services']['storage'] {
  return new Proxy({} as RouterContext['services']['storage'], {
    get(_target: unknown, prop: string | symbol) {
      if (typeof prop === 'symbol') return undefined;
      // Lazily create vi.fn() stubs so any method name works
      const fns = (_target as Record<string, ReturnType<typeof vi.fn>>);
      if (!fns[prop]) {
        fns[prop] = vi.fn();
      }
      return fns[prop];
    },
  });
}

/* ------------------------------------------------------------------ */
/*  Mock Logger                                                        */
/* ------------------------------------------------------------------ */

export function createMockLogger(): RouterContext['services']['logger'] {
  const noop = vi.fn();
  return {
    info: noop,
    warn: noop,
    error: noop,
    debug: noop,
    trace: noop,
    fatal: noop,
    child: vi.fn().mockReturnThis(),
    level: 'silent',
    silent: noop,
  } as unknown as RouterContext['services']['logger'];
}

/* ------------------------------------------------------------------ */
/*  Mock Queue & Events                                                */
/* ------------------------------------------------------------------ */

export function createMockQueue(): RouterContext['services']['generationQueue'] {
  return {
    add: vi.fn().mockResolvedValue({ id: 'job-1' }),
    getJob: vi.fn(),
    close: vi.fn(),
  } as unknown as RouterContext['services']['generationQueue'];
}

export function createMockQueueEvents(): RouterContext['services']['generationQueueEvents'] {
  return {
    on: vi.fn(),
    off: vi.fn(),
    close: vi.fn(),
  } as unknown as RouterContext['services']['generationQueueEvents'];
}

/* ------------------------------------------------------------------ */
/*  Mock Telemetry                                                     */
/* ------------------------------------------------------------------ */

export function createMockTelemetry(): RouterContext['services']['telemetry'] {
  return {
    trackGeminiUsage: vi.fn(),
    trackAuth: vi.fn(),
    trackError: vi.fn(),
    track: vi.fn(),
  } as unknown as RouterContext['services']['telemetry'];
}

/* ------------------------------------------------------------------ */
/*  Auth Middleware                                                     */
/* ------------------------------------------------------------------ */

/**
 * A requireAuth middleware that checks `req.session.userId`.
 * When the test sets a session cookie, supertest will propagate it and
 * this middleware will let the request through.
 */
export function createRequireAuth(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.session?.userId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    // Populate req.user for handlers that read it
    req.user = { id: req.session.userId, role: req.session.role ?? 'user' } as Express.User;
    next();
  };
}

/* ------------------------------------------------------------------ */
/*  Build a complete mock RouterContext                                 */
/* ------------------------------------------------------------------ */

export interface ContextOverrides {
  storage?: Partial<RouterContext['services']['storage']>;
  domainServices?: Partial<RouterContext['domainServices']>;
  middleware?: Partial<RouterContext['middleware']>;
  schemas?: Partial<RouterContext['schemas']>;
}

export function buildMockContext(overrides: ContextOverrides = {}): RouterContext {
  const requireAuth = createRequireAuth();
  const noopMiddleware = (_req: Request, _res: Response, next: NextFunction): void => { next(); };
  const mockStorage = createMockStorage();

  // Apply storage overrides
  if (overrides.storage) {
    for (const [key, value] of Object.entries(overrides.storage)) {
      (mockStorage as Record<string, unknown>)[key] = value;
    }
  }

  const ctx: RouterContext = {
    services: {
      storage: mockStorage,
      genAIText: {} as RouterContext['services']['genAIText'],
      genAIImage: {} as RouterContext['services']['genAIImage'],
      cloudinary: null,
      logger: createMockLogger(),
      generationQueue: createMockQueue(),
      generationQueueEvents: createMockQueueEvents(),
      telemetry: createMockTelemetry(),
      pool: {} as RouterContext['services']['pool'],
    },
    domainServices: {
      visionAnalysis: {
        analyzeProductImage: vi.fn(),
        getCachedAnalysis: vi.fn(),
        invalidateAnalysisCache: vi.fn(),
      } as unknown as RouterContext['domainServices']['visionAnalysis'],
      ideaBank: {
        generateSuggestions: vi.fn(),
        getMatchedTemplates: vi.fn(),
      } as unknown as RouterContext['domainServices']['ideaBank'],
      productKnowledge: {
        invalidateProductKnowledgeCache: vi.fn(),
        invalidateMultiProductKnowledgeCache: vi.fn(),
      } as unknown as RouterContext['domainServices']['productKnowledge'],
      quotaMonitoring: {
        trackApiCall: vi.fn(),
      } as unknown as RouterContext['domainServices']['quotaMonitoring'],
      installationRAG: {} as RouterContext['domainServices']['installationRAG'],
      relationshipRAG: {} as RouterContext['domainServices']['relationshipRAG'],
      brandImageRAG: {
        recommendImages: vi.fn(),
        matchImagesForProduct: vi.fn(),
        suggestImageCategory: vi.fn(),
      } as unknown as RouterContext['domainServices']['brandImageRAG'],
      templatePatternRAG: {
        matchTemplateForContext: vi.fn(),
        analyzeTemplatePatterns: vi.fn(),
        suggestTemplateCustomizations: vi.fn(),
      } as unknown as RouterContext['domainServices']['templatePatternRAG'],
      patternExtraction: {} as RouterContext['domainServices']['patternExtraction'],
      encryption: {} as RouterContext['domainServices']['encryption'],
      apiKeyValidation: {} as RouterContext['domainServices']['apiKeyValidation'],
      authService: {
        hashPassword: vi.fn().mockResolvedValue('hashed-password'),
        comparePasswordWithRehash: vi.fn().mockResolvedValue({ valid: true }),
        isLockedOut: vi.fn().mockResolvedValue(false),
        getLockoutTimeRemaining: vi.fn().mockResolvedValue(0),
        recordFailedLogin: vi.fn(),
        clearFailedLogins: vi.fn(),
      } as unknown as RouterContext['domainServices']['authService'],
      pricingEstimator: {
        normalizeResolution: vi.fn().mockReturnValue('2K'),
        estimateGenerationCostMicros: vi.fn().mockReturnValue({ estimatedCostMicros: 100 }),
      } as unknown as RouterContext['domainServices']['pricingEstimator'],
      getGoogleCloudService: vi.fn(),
      ...overrides.domainServices,
    },
    middleware: {
      requireAuth,
      optionalAuth: noopMiddleware,
      validate: () => noopMiddleware,
      extendedTimeout: noopMiddleware,
      haltOnTimeout: noopMiddleware,
      validateN8nWebhook: noopMiddleware,
      validateFileType: noopMiddleware,
      uploadPatternLimiter: noopMiddleware,
      checkPatternQuota: noopMiddleware,
      createRateLimiter: vi.fn().mockReturnValue(noopMiddleware),
      ...overrides.middleware,
    },
    uploads: {
      standard: {} as RouterContext['uploads']['standard'],
      single: () => noopMiddleware,
      array: () => noopMiddleware,
    },
    schemas: {
      insertGeneration: {} as RouterContext['schemas']['insertGeneration'],
      insertProduct: {} as RouterContext['schemas']['insertProduct'],
      insertPromptTemplate: {} as RouterContext['schemas']['insertPromptTemplate'],
      insertInstallationScenario: {} as RouterContext['schemas']['insertInstallationScenario'],
      insertProductRelationship: {} as RouterContext['schemas']['insertProductRelationship'],
      saveApiKey: {} as RouterContext['schemas']['saveApiKey'],
      uploadPattern: {} as RouterContext['schemas']['uploadPattern'],
      updatePattern: {} as RouterContext['schemas']['updatePattern'],
      applyPattern: {} as RouterContext['schemas']['applyPattern'],
      ratePattern: {} as RouterContext['schemas']['ratePattern'],
      listPatternsQuery: {} as RouterContext['schemas']['listPatternsQuery'],
      generateCompletePost: {} as RouterContext['schemas']['generateCompletePost'],
      saveN8nConfig: {} as RouterContext['schemas']['saveN8nConfig'],
      n8nCallback: {} as RouterContext['schemas']['n8nCallback'],
      syncAccount: {} as RouterContext['schemas']['syncAccount'],
      ...overrides.schemas,
    },
    utils: {
      saveOriginalFile: vi.fn() as unknown as RouterContext['utils']['saveOriginalFile'],
      saveGeneratedImage: vi.fn() as unknown as RouterContext['utils']['saveGeneratedImage'],
      deleteFile: vi.fn().mockResolvedValue(undefined) as unknown as RouterContext['utils']['deleteFile'],
      toGenerationDTO: vi.fn((g: unknown) => g) as unknown as RouterContext['utils']['toGenerationDTO'],
      toGenerationDTOArray: vi.fn((arr: unknown) => arr) as unknown as RouterContext['utils']['toGenerationDTOArray'],
      isServerShuttingDown: vi.fn().mockReturnValue(false) as unknown as RouterContext['utils']['isServerShuttingDown'],
    },
  };

  return ctx;
}

/* ------------------------------------------------------------------ */
/*  Create test Express app from a router factory                      */
/* ------------------------------------------------------------------ */

export interface TestAppResult {
  app: Express;
  ctx: RouterContext;
}

/**
 * Build a small Express app that mounts the given router factory at `prefix`.
 *
 * A session middleware is included so tests can authenticate by POSTing to a
 * helper `/__test/login` route that sets `req.session.userId`.
 */
export function createTestAppForRouter(
  factory: RouterFactory,
  prefix: string,
  overrides: ContextOverrides = {},
): TestAppResult {
  const ctx = buildMockContext(overrides);
  const testApp = express();

  testApp.use(express.json());
  testApp.use(express.urlencoded({ extended: false }));

  testApp.use(
    session({
      secret: 'test-secret-only',
      resave: false,
      saveUninitialized: false,
      cookie: { secure: false, httpOnly: true },
    }),
  );

  // Helper route to create an authenticated session
  testApp.post('/__test/login', (req: Request, res: Response) => {
    req.session.userId = req.body.userId ?? 'test-user-1';
    req.session.role = req.body.role ?? 'user';
    res.json({ ok: true });
  });

  const router = factory(ctx);
  testApp.use(prefix, router);

  return { app: testApp, ctx };
}

/* ------------------------------------------------------------------ */
/*  Supertest session helper                                           */
/* ------------------------------------------------------------------ */

import request from 'supertest';

/**
 * Logs in via the helper route and returns the session cookie string
 * to pass in subsequent requests via `.set('Cookie', cookie)`.
 */
export async function loginAs(
  testApp: Express,
  userId = 'test-user-1',
  role = 'user',
): Promise<string> {
  const res = await request(testApp)
    .post('/__test/login')
    .send({ userId, role });
  const cookies = res.headers['set-cookie'];
  if (Array.isArray(cookies)) {
    return cookies.join('; ');
  }
  if (typeof cookies === 'string') {
    return cookies;
  }
  throw new Error('Login did not return a session cookie');
}
