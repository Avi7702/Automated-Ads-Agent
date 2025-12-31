import express, { type Express } from 'express';
import session from 'express-session';
import { registerRoutes } from '../../routes';
import type { Server } from 'http';

let cachedApp: Express | null = null;
let cachedServer: Server | null = null;

/**
 * Creates a test Express app with all routes registered.
 * Caches the app instance to avoid reinitializing on every test.
 *
 * Note: This creates a lightweight app for integration tests.
 * The database must be available for these tests to pass.
 */
export async function createTestApp(): Promise<Express> {
  if (cachedApp) {
    return cachedApp;
  }

  const app = express();

  // JSON parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Session middleware (memory store for tests)
  app.use(
    session({
      secret: 'test-secret-for-tests-only',
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
      },
    })
  );

  // Register routes
  cachedServer = await registerRoutes(app);
  cachedApp = app;

  return app;
}

/**
 * Gets the cached test app or creates one if needed.
 */
export function getTestApp(): Express {
  if (!cachedApp) {
    throw new Error('Test app not initialized. Call createTestApp() first.');
  }
  return cachedApp;
}

/**
 * Clears the cached app - useful for test isolation if needed.
 */
export function clearTestApp(): void {
  if (cachedServer) {
    cachedServer.close();
  }
  cachedApp = null;
  cachedServer = null;
}
