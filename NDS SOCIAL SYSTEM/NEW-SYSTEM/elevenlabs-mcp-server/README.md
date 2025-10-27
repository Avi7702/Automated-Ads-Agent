# ElevenLabs MCP Server (Vercel)

This repository hosts a Node.js MCP server that exposes Supabase, Twilio, FireCrawl, and media workflows to ElevenLabs agents via the Model Context Protocol.

## Local Setup
1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env.example` to `.env` and fill in secrets.
3. Run locally using Vercel dev (requires `vercel` CLI):
   ```bash
   vercel dev
   ```

## Deployment
1. Login to Vercel and run `vercel` to deploy.
2. Set environment variables in the Vercel dashboard (`MCP_SHARED_SECRET`, Supabase keys, etc.).
3. The live MCP endpoint will be `https://<project>.vercel.app/mcp`.
4. Register that URL + shared secret inside ElevenLabs under Tools ? MCP ? Add Custom Server.

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

Replace the placeholders in `src/handler.js` and `src/services/` with the real logic from the Cloudflare worker.
