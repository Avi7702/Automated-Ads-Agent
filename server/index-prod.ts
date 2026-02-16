// Load environment variables first (no-op if .env doesn't exist in production)
import 'dotenv/config';

// OpenTelemetry MUST be imported before any other modules
import './instrumentation';

import fs from "node:fs";
import { type Server } from "node:http";
import path from "node:path";

import express, { type Express } from "express";

import runApp from "./app";

export async function serveStatic(app: Express, _server: Server) {
  const distPath = path.resolve(process.cwd(), "dist", "public");

  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  // Serve static assets with aggressive caching (content-hashed filenames are immutable)
  app.use(express.static(distPath, {
    maxAge: '1y',  // Cache for 1 year (safe due to content hash in filenames)
    immutable: true,  // Tell browser file will NEVER change
    setHeaders: (res, path) => {
      if (path.endsWith('.html')) {
        res.setHeader('Cache-Control', 'no-cache');
      }
    }
  }));

  // fall through to index.html if the file doesn't exist (SPA catch-all)
  app.use("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}

import { pushSchema } from "./migrate";

(async () => {
  // Ensure DB schema is up to date before starting
  await pushSchema();
  await runApp(serveStatic);
})();
