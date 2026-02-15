# Fix: `/api/style-references` 500 Internal Server Error

## Issue

When users visit the Studio page, the frontend calls `GET /api/style-references` and receives HTTP 500.

## Root Cause

The `style_references` database table likely does not exist in the production database. The table is defined in `shared/schema.ts` (line 1932) and has a migration file (`migrations/0003_fat_sumo.sql`), but this migration has probably not been applied to the production database.

When the Drizzle ORM query executes `SELECT ... FROM style_references`, PostgreSQL throws error code `42P01` ("undefined_table" / `relation "style_references" does not exist`). The router's catch block was catching this error and returning a generic HTTP 500.

## Investigation

1. **Router**: `server/routes/styleReferences.router.ts` - properly registered at `/api/style-references` via `server/routes/index.ts`
2. **Repository**: `server/repositories/styleReferenceRepository.ts` - CRUD operations using Drizzle ORM against `styleReferences` table
3. **Storage layer**: `server/storage.ts` (lines 979-995) - delegates to repository methods
4. **Schema**: `shared/schema.ts` (lines 1932-1987) - `pgTable('style_references', ...)` with all columns defined
5. **Migration**: `migrations/0003_fat_sumo.sql` (line 188) - `CREATE TABLE "style_references"` exists but likely not applied to production
6. **Frontend hook**: `client/src/hooks/useStyleReferences.ts` - calls `GET /api/style-references` with `credentials: 'include'`, throws on non-OK response

## Fix Applied

**File modified**: `server/routes/styleReferences.router.ts`

Added `isTableMissingError()` helper that detects PostgreSQL error code `42P01` or the "relation ... does not exist" error message. Applied graceful fallback handling in all 6 endpoint catch blocks:

- **GET /** (list): Returns `200` with empty array `[]` instead of 500. This is the critical fix since the frontend calls this on every Studio page load.
- **GET /:id** (single): Returns `404` instead of 500.
- **POST /** (upload): Returns `503` with descriptive message instead of 500.
- **PUT /:id** (update): Returns `503` with descriptive message instead of 500.
- **DELETE /:id** (delete): Returns `503` with descriptive message instead of 500.
- **POST /:id/reanalyze**: Returns `503` with descriptive message instead of 500.

All cases log a warning with instructions to run migrations.

## Permanent Fix Required

To fully enable the style references feature, the production database needs the migration applied:

```bash
# Option 1: Push schema directly
npm run db:push

# Option 2: Run the specific migration
# Apply migrations/0003_fat_sumo.sql to the production database
```

## Build Verification

- Frontend build (`npx vite build`): PASSED
- No new dependencies added
- No changes to schema, repository, or storage layer
