import { type Server } from 'node:http';
import { randomBytes } from 'node:crypto';

import express, { type Express, type Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import { doubleCsrf } from 'csrf-csrf';
import { registerRoutes } from './routes';
import { logger, apiLogger } from './lib/logger';
import { requestIdMiddleware } from './middleware/requestId';
import { performanceMetricsMiddleware } from './middleware/performanceMetrics';
import { defaultTimeout, haltOnTimeout } from './middleware/timeout';
import { initGracefulShutdown, onShutdown } from './utils/gracefulShutdown';
import { validateEnvOrExit } from './lib/validateEnv';
import { initSentry, sentryRequestHandler, sentryErrorHandler, captureException } from './lib/sentry';
import { trackError } from './services/errorTrackingService';
import { notify } from './services/notificationService';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { startGenerationWorker, closeGenerationWorker } from './workers/generationWorkerInstance';
import { closeQueues } from './lib/queue';
import { apiVersioningMiddleware } from './middleware/apiVersioning';
import { registerAllPrompts } from './lib/prompts';

export function log(message: string, source = 'express') {
  // Use structured logger in production, formatted console in development
  apiLogger.info({ source }, message);
}

export const app = express();

// CORS - allow cross-origin requests from configured origins
const allowedOrigins = process.env['ALLOWED_ORIGINS']
  ? process.env['ALLOWED_ORIGINS'].split(',').map((o) => o.trim())
  : [`http://localhost:${process.env['PORT'] || '5000'}`];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-csrf-token', 'x-e2e-test'],
    exposedHeaders: ['X-Session-Id'],
  }),
);

// Response compression (gzip/brotli) - reduces bundle size by ~65%
app.use(compression());

// Trust proxy for Railway/Heroku/etc - required for secure cookies behind reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:
          process.env['NODE_ENV'] === 'production'
            ? [
                "'self'",
                "'sha256-lDUBeBfpPQ4BeVVZpSDsSj8T+WdMfPRFeirOKsgrNAM='",
                "'sha256-D8ENm9m//g0OfHmuDwTU4MaB7wzJNZ5g9g/pqhRH9uQ='",
              ]
            : ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Vite dev needs these
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        imgSrc: [
          "'self'",
          'data:',
          'blob:',
          'https://res.cloudinary.com',
          'https://*.cloudinary.com',
          'https://images.unsplash.com',
          'https://nextdaysteel.co.uk',
          'https://placehold.co',
        ],
        connectSrc: [
          "'self'",
          'https://generativelanguage.googleapis.com',
          'https://nextdaysteel.co.uk',
          'https://*.nextdaysteel.co.uk',
          'https://res.cloudinary.com',
          'https://*.cloudinary.com',
          'https://fonts.googleapis.com',
          'https://fonts.gstatic.com',
          'https://placehold.co',
          'https://images.unsplash.com',
          'wss:',
          'ws:',
        ],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Allow Cloudinary images
  }),
);

// Request ID for tracing
app.use(requestIdMiddleware);

// Performance metrics tracking (if monitoring enabled)
if (process.env['ENABLE_MONITORING'] !== 'false') {
  app.use(performanceMetricsMiddleware);
}

// Request timeout (30s default)
app.use(defaultTimeout);
app.use(haltOnTimeout);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown;
  }
}
app.use(
  express.json({
    limit: '10mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Cookie parser - required for CSRF and session handling
app.use(cookieParser());

// API Versioning (Task 5.2)
// Rewrites /api/v1/* → /api/* and adds version/deprecation headers
app.use(apiVersioningMiddleware);

// Cache-Control headers for API GET responses
app.use('/api/', (req, res, next) => {
  if (req.method === 'GET') {
    // Default: private, short cache for user-specific data
    res.setHeader('Cache-Control', 'private, no-cache');
  }
  next();
});

// Session middleware - uses Redis if available, falls back to memory store
let sessionStore: session.Store | undefined;

if (process.env['REDIS_URL']) {
  try {
    const RedisStore = require('connect-redis').default;
    const { getRedisClient } = require('./lib/redis');
    sessionStore = new RedisStore({
      client: getRedisClient(),
      prefix: 'sess:',
    });
    logger.info({ store: 'redis' }, 'Using Redis session store');
  } catch (error) {
    if (process.env['NODE_ENV'] === 'production') {
      logger.warn(
        { store: 'memory', error },
        'Redis session store failed in production — falling back to memory store (single-instance only)',
      );
    }
    logger.warn({ store: 'memory', reason: 'redis_unavailable' }, 'Redis not available, using memory session store');
  }
} else {
  if (process.env['NODE_ENV'] === 'production') {
    logger.warn(
      { store: 'memory', reason: 'no_redis_url' },
      'REDIS_URL not set in production — using memory session store (single-instance only)',
    );
  } else {
    logger.warn(
      { store: 'memory', reason: 'no_redis_url' },
      'REDIS_URL not set, using memory session store (dev only)',
    );
  }
}

// Validate session secret in production
// Supports comma-separated secrets for key rotation (first = current, rest = legacy)
const sessionSecret = process.env['SESSION_SECRET'];
if (process.env['NODE_ENV'] === 'production' && !sessionSecret) {
  logger.warn(
    { security: true },
    'SESSION_SECRET not set in production - using random secret, sessions will not persist',
  );
}
// Parse comma-separated secrets for rotation support (express-session supports arrays)
const sessionSecrets = sessionSecret
  ? sessionSecret
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : [randomBytes(32).toString('hex')];

app.use(
  session({
    store: sessionStore, // undefined = default memory store
    secret: sessionSecrets,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env['NODE_ENV'] === 'production',
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (industry standard for SaaS)
      sameSite: 'lax',
    },
  }),
);

// CSRF Protection - protects all state-changing operations (POST/PUT/DELETE)
// Supports comma-separated secrets for key rotation
const csrfSecret = process.env['CSRF_SECRET'];
if (process.env['NODE_ENV'] === 'production' && !csrfSecret) {
  logger.warn(
    { security: true },
    'CSRF_SECRET not set in production — using random secret (sessions will not persist across restarts)',
  );
}
// Parse comma-separated secrets for rotation (first = current)
const csrfSecrets = csrfSecret
  ? csrfSecret
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  : [randomBytes(32).toString('hex')];
const effectiveCsrfSecret = csrfSecrets[0] ?? randomBytes(32).toString('hex');

const { generateCsrfToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => effectiveCsrfSecret,
  getSessionIdentifier: (req) => req.session?.id ?? req.ip ?? 'anonymous',
  cookieName: process.env['NODE_ENV'] === 'production' ? '__Host-csrf' : 'csrf',
  cookieOptions: {
    sameSite: 'strict',
    secure: process.env['NODE_ENV'] === 'production',
    httpOnly: true,
    path: '/',
  },
  size: 64, // Token size in bytes
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// Apply CSRF protection middleware
// Skip CSRF for:
//   - analytics/vitals — sendBeacon() cannot set custom headers
//   - n8n webhooks — use HMAC signature auth instead (webhookAuth.ts)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/api/analytics/vitals' && req.method === 'POST') {
    return next();
  }
  if (req.path.startsWith('/api/n8n/')) {
    return next();
  }
  return doubleCsrfProtection(req, res, next);
});

// CSRF token endpoint - clients must fetch this before making state-changing requests
app.get('/api/csrf-token', (req: Request, res: Response) => {
  req.session.save((err: Error | null) => {
    if (err) {
      res.status(500).json({ error: 'Session save failed' });
      return;
    }
    res.json({ csrfToken: generateCsrfToken(req, res) });
  });
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, unknown> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    if (path.startsWith('/api')) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + '…';
      }

      log(logLine);
    }
  });

  next();
});

// Sentry request handler - must be before routes
app.use(sentryRequestHandler);

export default async function runApp(setup: (app: Express, server: Server) => Promise<void>) {
  // Initialize Sentry error monitoring
  initSentry();

  // Validate environment variables before starting
  await validateEnvOrExit();

  // Register all AI prompts in the prompt registry
  registerAllPrompts();

  // Start the generation worker for async job processing
  startGenerationWorker();

  const server = await registerRoutes(app);

  // Sentry error handler - must be before custom error handler
  app.use(sentryErrorHandler);

  app.use((err: Error & { status?: number; statusCode?: number }, req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log error with structured logger
    logger.error({ err, status, module: 'ErrorHandler' }, message);

    // Track error for dashboard (only if monitoring enabled)
    if (process.env['ENABLE_MONITORING'] !== 'false') {
      const userAgent = req.get('user-agent');
      trackError({
        statusCode: Number(status) || 500,
        message: String(message),
        endpoint: req.path,
        method: req.method,
        ...(typeof userAgent === 'string' ? { userAgent } : {}),
        ...(typeof err?.stack === 'string' ? { stack: err.stack } : {}),
      });
    }

    // Capture in Sentry if it's a server error
    if (status >= 500) {
      captureException(err, { status, message });

      // Direct notification — works even without Sentry DSN
      notify({
        severity: 'error',
        title: `${req.method} ${req.path} → ${status}`,
        message,
        context: {
          endpoint: req.path,
          method: req.method,
          stack: err.stack?.split('\n')[1]?.trim() ?? 'N/A',
        },
      }).catch(() => {}); // Fire and forget
    }

    res.status(status).json({ message });
  });

  // importantly run the final setup after setting up all the other routes so
  // the catch-all route doesn't interfere with the other routes
  await setup(app, server);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env['PORT'] || '5000', 10);
  server.listen(port, '0.0.0.0', () => {
    log(`serving on port ${port}`);
  });

  // Initialize graceful shutdown
  initGracefulShutdown(server);

  // Register comprehensive cleanup on shutdown
  onShutdown(async () => {
    logger.info({ module: 'shutdown' }, 'Starting graceful shutdown');

    // Close generation worker first (stop accepting new jobs)
    try {
      await closeGenerationWorker();
      logger.info({ module: 'shutdown' }, 'Generation worker closed');
    } catch (err) {
      logger.error({ module: 'shutdown', err }, 'Error closing generation worker');
    }

    // Close BullMQ queue connections
    try {
      await closeQueues();
      logger.info({ module: 'shutdown' }, 'Queue connections closed');
    } catch (err) {
      logger.error({ module: 'shutdown', err }, 'Error closing queue connections');
    }

    // Flush analytics events
    try {
      const { flushAnalytics } = await import('./lib/analytics');
      await flushAnalytics();
      logger.info({ module: 'shutdown' }, 'Analytics flushed');
    } catch {
      // Analytics may not be initialized
    }

    // Close Redis (sessions depend on Redis)
    if (process.env['REDIS_URL']) {
      try {
        const { closeRedisClient } = require('./lib/redis');
        await closeRedisClient();
        logger.info({ module: 'shutdown' }, 'Redis connection closed');
      } catch (err) {
        logger.error({ module: 'shutdown', err }, 'Error closing Redis');
      }
    }

    // Clear monitoring data
    if (process.env['ENABLE_MONITORING'] !== 'false') {
      try {
        const { resetPerformanceMetrics } = require('./middleware/performanceMetrics');
        const { clearErrors } = require('./services/errorTrackingService');
        resetPerformanceMetrics();
        clearErrors();
        logger.info({ module: 'shutdown' }, 'Monitoring data cleared');
      } catch (err) {
        logger.error({ module: 'shutdown', err }, 'Error clearing monitoring data');
      }
    }

    // Close database pool with timeout
    try {
      const { pool } = require('./db');
      const poolClosePromise = pool.end();
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Pool close timeout')), 10000),
      );

      await Promise.race([poolClosePromise, timeoutPromise]);
      logger.info({ module: 'shutdown' }, 'Database pool closed');
    } catch (err) {
      logger.error({ module: 'shutdown', err }, 'Error closing database pool - forcing shutdown');
      // Force close by removing listeners to prevent hanging
      const { pool } = require('./db');
      pool.removeAllListeners();
    }

    logger.info({ module: 'shutdown' }, 'Graceful shutdown complete');
  });

  // Track unhandled errors (only if monitoring enabled)
  if (process.env['ENABLE_MONITORING'] !== 'false') {
    process.on('unhandledRejection', (reason: unknown) => {
      logger.error({ err: reason, module: 'UnhandledRejection' }, 'Unhandled promise rejection');
      const reasonObj = reason as Record<string, unknown> | null | undefined;
      const reasonMessage =
        typeof reasonObj?.['message'] === 'string' ? reasonObj['message'] : 'Unhandled promise rejection';
      const reasonStack = typeof reasonObj?.['stack'] === 'string' ? reasonObj['stack'] : undefined;
      trackError({
        statusCode: 500,
        message: reasonMessage,
        endpoint: 'N/A',
        method: 'N/A',
        ...(reasonStack ? { stack: reasonStack } : {}),
      });
      notify({
        severity: 'critical',
        title: 'Unhandled Promise Rejection',
        message: reasonMessage,
        context: { stack: reasonStack?.split('\n')[1]?.trim() ?? 'N/A' },
      }).catch(() => {});
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error({ err: error, module: 'UncaughtException' }, 'Uncaught exception');
      trackError({
        statusCode: 500,
        message: error.message,
        endpoint: 'N/A',
        method: 'N/A',
        ...(typeof error.stack === 'string' ? { stack: error.stack } : {}),
      });
      notify({
        severity: 'critical',
        title: 'Uncaught Exception',
        message: error.message,
        context: { stack: error.stack?.split('\n')[1]?.trim() ?? 'N/A' },
      }).catch(() => {});
    });
  }
}
