import { type Server } from "node:http";

import express, { type Express, type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import session from "express-session";
import { registerRoutes } from "./routes";
import { logger, apiLogger } from "./lib/logger";
import { requestIdMiddleware } from "./middleware/requestId";
import { defaultTimeout, haltOnTimeout } from "./middleware/timeout";
import { initGracefulShutdown, onShutdown } from "./utils/gracefulShutdown";
import { validateEnvOrExit } from "./lib/validateEnv";
import { initSentry, sentryRequestHandler, sentryErrorHandler, captureException } from "./lib/sentry";

export function log(message: string, source = "express") {
  // Use structured logger in production, formatted console in development
  apiLogger.info({ source }, message);
}

export const app = express();

// Trust proxy for Railway/Heroku/etc - required for secure cookies behind reverse proxy
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Vite dev needs these
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:", "blob:", "https://res.cloudinary.com", "https://*.cloudinary.com", "https://images.unsplash.com", "https://nextdaysteel.co.uk", "https://placehold.co"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "wss:", "ws:"],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow Cloudinary images
}));

// Request ID for tracing
app.use(requestIdMiddleware);

// Request timeout (30s default)
app.use(defaultTimeout);
app.use(haltOnTimeout);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Session middleware - uses Redis if available, falls back to memory store
let sessionStore: session.Store | undefined;

if (process.env.REDIS_URL) {
  try {
    const RedisStore = require('connect-redis').default;
    const { getRedisClient } = require('./lib/redis');
    sessionStore = new RedisStore({
      client: getRedisClient(),
      prefix: 'sess:',
    });
    logger.info({ store: 'redis' }, 'Using Redis session store');
  } catch (error) {
    logger.warn({ store: 'memory', reason: 'redis_unavailable' }, 'Redis not available, using memory session store');
  }
} else {
  logger.warn({ store: 'memory', reason: 'no_redis_url' }, 'REDIS_URL not set, using memory session store');
}

// Validate session secret in production
const sessionSecret = process.env.SESSION_SECRET;
if (process.env.NODE_ENV === 'production' && !sessionSecret) {
  logger.warn({ security: true }, 'SESSION_SECRET not set in production - using random secret, sessions will not persist');
}
// Generate a random secret if not provided (for development or fallback)
const effectiveSessionSecret = sessionSecret || require('crypto').randomBytes(32).toString('hex');

app.use(session({
  store: sessionStore, // undefined = default memory store
  secret: effectiveSessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: 'lax',
  },
}));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Sentry request handler - must be before routes
app.use(sentryRequestHandler);

export default async function runApp(
  setup: (app: Express, server: Server) => Promise<void>,
) {
  // Initialize Sentry error monitoring
  initSentry();

  // Validate environment variables before starting
  validateEnvOrExit();

  const server = await registerRoutes(app);

  // Sentry error handler - must be before custom error handler
  app.use(sentryErrorHandler);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log error with structured logger
    logger.error({ err, status, module: 'ErrorHandler' }, message);

    // Capture in Sentry if it's a server error
    if (status >= 500) {
      captureException(err, { status, message });
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
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });

  // Initialize graceful shutdown
  initGracefulShutdown(server);

  // Register DB cleanup on shutdown (if using direct connection)
  onShutdown(async () => {
    logger.info('Closing database connections');
    // If using Drizzle/pg pool: await pool.end();
  });
}
