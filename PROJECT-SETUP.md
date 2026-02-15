# Project Setup Guide

How to set up a new project with SDD methodology, MCP integrations, and the Technology Currency Rule.

## Step 1: Install the SDD Toolkit

```bash
bash INSTALL.sh
```

This installs agents, templates, hooks, and skill files. See README.md for details.

## Step 2: Set Up MCP Servers

MCP servers give agents access to official documentation so they verify patterns instead of guessing from training data.

### For Cloudflare Stack Projects

```bash
# Cloudflare Docs — Workers, D1, R2, KV patterns
claude mcp add --scope project cloudflare-docs npx -y mcp-remote https://docs.mcp.cloudflare.com/sse

# Better Auth Docs — auth SDK snippets, Drizzle adapter patterns
claude mcp add --scope project --transport http better-auth-docs https://mcp.inkeep.com/better-auth/mcp
```

### Other Common MCPs

```bash
# Clerk Auth (if using Clerk instead of Better Auth)
claude mcp add --scope project clerk npx -y mcp-remote https://mcp.clerk.com/sse

# Next.js DevTools (live build errors, type errors during dev)
# Requires: pnpm add -D next-devtools-mcp
# Connects automatically when dev server runs

# Stripe (if using Stripe for payments)
claude mcp add --scope project stripe npx -y @stripe/mcp
```

### Verify MCPs

```bash
claude mcp list
```

All servers should show "Connected". If any fail, check the URL and transport type.

## Step 3: Add Technology Currency Rule to CLAUDE.md

Add this section to your project's `CLAUDE.md`. Customize the banned patterns list for your stack.

```markdown
## MCP Servers (Project-Scoped)

This project has MCP servers configured in `.mcp.json`. Use them to verify patterns against official docs.

| MCP Server         | What It Provides                    | When to Use                             |
| ------------------ | ----------------------------------- | --------------------------------------- |
| `cloudflare-docs`  | Workers, D1, R2, KV documentation   | Backend routes, DB, storage, middleware |
| `better-auth-docs` | Auth SDK snippets, adapter patterns | Auth flows, sessions, social providers  |

**How to use**: These load automatically. Query the relevant MCP for current API
signatures and patterns before writing code. Don't guess from training data.

## Technology Currency Rule (MANDATORY)

**Every agent, every teammate, every implementation MUST use current technology.**

Before implementing ANY dependency, API, pattern, or tool:

1. **Web-search first** — Look up the latest version and current best practice.
   Never assume a version is current from training data.
2. **Verify against official docs** — Use MCP connections when available.
   If no MCP, web-search the official documentation.
3. **Flag outdated patterns** — If you find existing code using an old approach,
   flag it. Don't copy old patterns just because they exist in the codebase.

**Banned patterns for this project** (customize per project):

- [old tool] (use [new tool])
- [old pattern] (use [new pattern])

**When in doubt**: web-search -> verify -> implement. Never guess.
```

### Why This Works

- **CLAUDE.md auto-loads** into every agent session — no one can miss it
- **MCP servers** give agents access to official docs, not just training data
- **SPEC-TEMPLATE.md** has a "Technology Verification" table that forces checking versions
- Three reinforcing layers: CLAUDE.md (rule) + MCP (docs access) + SPEC template (checklist)

## Step 4: Set Up Specs Directory

```bash
mkdir -p specs
```

The installer copies `SPEC-TEMPLATE.md` here. Every non-trivial feature gets a spec before implementation.

## Step 5: Verify Setup

Checklist:

- [ ] `~/.claude/agents/` has 3 SDD agents (spec-interviewer, feature-implementer, spec-verifier)
- [ ] `~/.claude/hooks/teammate-idle-check.js` exists
- [ ] `.mcp.json` exists at project root with MCP servers configured
- [ ] `claude mcp list` shows all servers connected
- [ ] `CLAUDE.md` has Technology Currency Rule section
- [ ] `CLAUDE.md` has MCP Servers section
- [ ] `specs/SPEC-TEMPLATE.md` exists with Technology Verification table

## Quick Reference: SDD Pipeline

```
1. Spawn spec-interviewer → explores codebase + interviews user → writes SPEC.md
2. User reviews and approves the spec
3. Spawn feature-implementer → reads SPEC.md → TDD implementation with checkpoints
4. Spawn spec-verifier → fresh context → verifies work against spec point-by-point
```

For small tasks (single-file fixes), skip the pipeline and just implement directly.
For medium tasks, use implementer only.
For large tasks, use the full pipeline.
