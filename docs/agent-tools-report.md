# WS-C7: Autonomous Agent Tool Registry — Report

## Summary

Extended the existing Studio Agent (Google ADK v0.3.0) with 6 new tools across 2 new tool files. The agent now has **14 total tools** covering products, generation, copywriting, scheduling, knowledge base, and templates.

## Architecture

The agent uses `@google/adk` with `LlmAgent`, `FunctionTool`, and `InMemoryRunner`. Tools are defined using Zod schemas for parameters and return structured results including `uiActions` for frontend reactivity.

```
server/services/agent/
  index.ts                    — Public exports
  agentDefinition.ts          — LlmAgent with system prompt + all tools (UPDATED)
  agentRunner.ts              — SSE streaming via InMemoryRunner (unchanged)
  tools/
    productTools.ts           — list_products, get_product_details, select_products (existing)
    generationTools.ts        — set_prompt, set_output_settings, generate_image (existing)
    copyTools.ts              — generate_ad_copy, get_idea_suggestions (existing)
    schedulingTools.ts        — schedule_post, get_calendar, get_social_connections (NEW)
    knowledgeTools.ts         — search_knowledge_base, get_templates, get_product_knowledge (NEW)
```

## New Tools Created

### `server/services/agent/tools/schedulingTools.ts` (NEW)

| Tool                     | Description                                                  | Backend Service                                       |
| ------------------------ | ------------------------------------------------------------ | ----------------------------------------------------- |
| `schedule_post`          | Schedule a post for publishing on a connected social account | `schedulingRepository.schedulePost()`                 |
| `get_calendar`           | View scheduled/published posts for a date range              | `schedulingRepository.getScheduledPostsByDateRange()` |
| `get_social_connections` | List connected social media accounts                         | `storage.getSocialConnections()`                      |

**Key features:**

- Validates social connection ownership before scheduling
- Validates dates (ISO 8601, must be in the future)
- Default date range: current month
- Emits `post_scheduled` uiAction for frontend reactivity

### `server/services/agent/tools/knowledgeTools.ts` (NEW)

| Tool                    | Description                                        | Backend Service                                  |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------ |
| `search_knowledge_base` | Search uploaded PDFs, brand guides, catalogs       | `fileSearchService.queryFileSearchStore()`       |
| `get_templates`         | List ad scene templates with categories/moods      | `storage.getAdSceneTemplates()`                  |
| `get_product_knowledge` | Deep product info: relationships, scenarios, specs | `productKnowledgeService.buildEnhancedContext()` |

**Key features:**

- KB search gracefully degrades if File Search is unavailable
- Templates filter by category with `isGlobal: true` default
- Product knowledge includes related products, installation scenarios, brand images

## Files Modified

### `server/services/agent/agentDefinition.ts`

1. Added imports for `createSchedulingTools` and `createKnowledgeTools`
2. Extended system prompt with:
   - New capabilities (scheduling, calendar, KB search, templates, product knowledge)
   - Scheduling workflow instructions
   - Rules for KB search and product knowledge usage
3. Wired new tool arrays into the `tools` array

### No changes needed to:

- `server/routes/agent.router.ts` — SSE streaming already handles all tool events
- `server/services/agent/agentRunner.ts` — Runner is tool-agnostic
- `server/services/agent/index.ts` — Exports unchanged

## Complete Tool Inventory (14 tools)

| #   | Tool                     | File               | Description                         |
| --- | ------------------------ | ------------------ | ----------------------------------- |
| 1   | `list_products`          | productTools.ts    | Search/list products                |
| 2   | `get_product_details`    | productTools.ts    | Get product info                    |
| 3   | `select_products`        | productTools.ts    | Select products for generation      |
| 4   | `set_prompt`             | generationTools.ts | Set generation prompt               |
| 5   | `set_output_settings`    | generationTools.ts | Configure platform/ratio/resolution |
| 6   | `generate_image`         | generationTools.ts | Generate ad image                   |
| 7   | `generate_ad_copy`       | copyTools.ts       | Generate headlines, hooks, CTAs     |
| 8   | `get_idea_suggestions`   | copyTools.ts       | AI creative suggestions             |
| 9   | `schedule_post`          | schedulingTools.ts | Schedule post for publishing        |
| 10  | `get_calendar`           | schedulingTools.ts | View content calendar               |
| 11  | `get_social_connections` | schedulingTools.ts | List social accounts                |
| 12  | `search_knowledge_base`  | knowledgeTools.ts  | Search uploaded docs/guides         |
| 13  | `get_templates`          | knowledgeTools.ts  | Browse ad scene templates           |
| 14  | `get_product_knowledge`  | knowledgeTools.ts  | Deep product context                |

## Build Verification

- Vite build: PASS (18.34s)
- TypeScript: No new errors (new tool files use `@ts-nocheck` matching project pattern)
- Router: No changes needed, SSE streaming handles all ADK events generically

## SSE Event Protocol (unchanged)

```typescript
type AgentSSEEvent =
  | { type: 'text_delta'; content: string } // Streaming text
  | { type: 'tool_call'; name: string; args: {} } // Tool invocation
  | { type: 'ui_action'; action: string; payload: {} } // Frontend action
  | { type: 'error'; content: string }
  | { type: 'done' };
```

New uiActions emitted by scheduling tools:

- `post_scheduled` — `{ postId, scheduledFor }`
