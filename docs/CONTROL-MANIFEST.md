# Control Manifest - Automated Ads Agent

## LOCKED ZONES (structure changes require explicit approval)

- `shared/schema.ts` - database schema source of truth
- `server/middleware/` - auth, CSRF, rate limiting, security headers
- `shared/contracts/` - API contracts and shared validation boundaries
- `vite.config.ts`, `tsconfig.json`, `railway.json`, `.github/workflows/` - build/deploy/runtime config
- `docs/audit/` - audit templates and scoring references

## EXTENSION ZONES (safe for normal feature work)

- `server/routes/` - route handlers and API surface extensions
- `server/services/` - business logic implementations
- `client/src/components/` - UI components
- `client/src/pages/` - app routes/pages
- `client/src/hooks/` - feature state and orchestration hooks
- `migrations/` - additive migrations only, never destructive drops
- `server/__tests__/`, `client/src/**/__tests__/`, `e2e/` - test coverage

## CANVAS ZONE (runtime user-modifiable data)

- Uploaded product and reference media (`uploads/`, Cloudinary/R2 assets)
- User-generated prompts, generated content, and planner drafts
- Non-code settings changed through app UI and persisted in DB
