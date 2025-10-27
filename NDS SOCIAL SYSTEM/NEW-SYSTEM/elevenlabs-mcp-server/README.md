# ElevenLabs MCP Server (Vercel)

This repository hosts a Node.js MCP server that exposes Supabase, Twilio, FireCrawl, and media workflows to ElevenLabs agents via the Model Context Protocol.

## Local Setup
1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in secrets.
3. (Optional) enable structured workflow logging by setting `ENABLE_WORKFLOW_LOG=true` so events are mirrored into Supabase.
4. Run locally using Vercel dev (requires `vercel` CLI):
   ```bash
   vercel dev
   ```

## Deployment
1. Login to Vercel and run `vercel` to deploy.
2. Set environment variables in the Vercel dashboard (`MCP_SHARED_SECRET`, Supabase keys, Cloudinary credentials, optional `VERCEL_BYPASS_TOKEN`, etc.).
3. The live MCP endpoint will be `https://<project>.vercel.app/mcp`.
4. Register that URL + shared secret inside ElevenLabs under Tools → MCP → Add Custom Server.

## Structure
```
api/
  mcp.js      # Vercel entry point
  health.js   # Health endpoint
src/
  handler.js  # Core JSON-RPC logic
  tools.js    # Tool definitions
  services/   # Supabase, Twilio, FireCrawl adapters
```

## Testing & Smoke Checks

```bash
# Unit tests (Vitest)
npm test

# Local smoke against in-memory handler
npm run smoke:local

# HTTP smoke against deployed endpoint
MCP_URL="https://<project>.vercel.app/mcp" \
MCP_SHARED_SECRET="..." \
VERCEL_BYPASS_TOKEN="optional" \
npm run smoke:prod
```

The HTTP smoke script exercises `/health`, `/openapi.json`, `initialize`, and `generate_hero_image`, ensuring Cloudinary uploads succeed end-to-end. The local smoke script reuses the in-process handler for fast feedback.

## Observability

The Cloudinary hero image tool now emits structured workflow logs (via `src/lib/logger.js`) that can be persisted to Supabase when `ENABLE_WORKFLOW_LOG=true`. Logs capture provider attempts, cache hits, upload metrics, and error codes to simplify debugging and support SLAs.
