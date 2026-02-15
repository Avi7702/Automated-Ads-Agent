# Knowledge Platform — Research Findings

**Researched:** 2026-02-13
**Source:** `c:\Users\avibm\knowledge-platform\`
**Status:** Early-stage spec project (Draft — no source code implemented yet)

---

## Executive Summary

The `knowledge-platform` project is a **spec-only** repository — it contains requirements and design documents but **zero implementation code**. The project uses a `.spec-workflow` system for managing specs, approvals, and snapshot versioning. Its first and only module so far is an **RSS Reader** (Feedly replacement) with AI-powered prioritization.

There is **no functional code, no `package.json`, no source files, no configs** — only planning artifacts.

---

## Repository Structure

```
knowledge-platform/
  .spec-workflow/
    specs/
      rss-reader/
        requirements.md       # Full requirements doc (246 lines)
        design.md              # Full technical design (806 lines)
    approvals/
      rss-reader/
        approval_1768417204725_4v7gp2y5y.json   # Approval record (pending)
        .snapshots/
          requirements.md/
            metadata.json       # Snapshot version tracking
            snapshot-001.json   # Full snapshot of requirements v1
```

Total files: **5** (all documentation/metadata, no source code)

---

## Module: RSS Reader (rss-reader)

### Purpose

An intelligent RSS/Atom feed aggregator with AI-powered features, positioned as a **Feedly replacement**. Described as the "foundation for the unified knowledge platform."

### Status

- **Created:** 2026-01-14
- **Approval Status:** Pending
- **Implementation:** Not started (0% code)

### Key Features (Planned)

| Feature                  | Description                                            | Priority    |
| ------------------------ | ------------------------------------------------------ | ----------- |
| Feed Management          | RSS 1.0/2.0, Atom, YouTube channel RSS                 | Must        |
| OPML Import/Export       | Migrate from other readers                             | Must        |
| Auto-Discovery           | Find feed URL from website URL                         | Should      |
| Content Fetching         | Configurable polling intervals (1min-24hr)             | Must        |
| Full-Text Extraction     | Readability-based article parsing                      | Should      |
| SimHash Deduplication    | 85%+ similarity detection                              | Must        |
| AI Relevance Scoring     | 0-100 score based on user preferences                  | Must        |
| Learning Loop            | Implicit (read time, scroll) + explicit (like/dislike) | Must/Should |
| Semantic Search          | Vector embeddings (Qdrant + all-MiniLM-L6-v2)          | Should      |
| Named Entity Recognition | People, orgs, topics, locations extracted              | Should      |
| Offline Support          | Local caching, configurable quota                      | Should      |
| Keyboard Shortcuts       | j/k navigation, vim-style                              | Should      |
| Light/Dark Theme         | Theme toggle                                           | Must        |

### Planned Tech Stack

| Layer             | Technology                              |
| ----------------- | --------------------------------------- |
| Runtime           | Bun 1.2+                                |
| Backend Framework | Hono                                    |
| Database          | PostgreSQL 17 + Drizzle ORM             |
| Cache/Queues      | Redis 7                                 |
| Vector Store      | Qdrant                                  |
| Frontend          | React 19 + TypeScript 5.7 + Tailwind v4 |
| Desktop           | Tauri 2.0                               |
| State Management  | Zustand                                 |
| Testing           | Vitest + Playwright                     |
| Linting           | Biome                                   |
| Load Testing      | k6                                      |

### Database Schema (Designed)

7 PostgreSQL tables planned:

- `users` — user accounts with JSONB preferences
- `feeds` — feed URLs, types, polling config, error tracking
- `subscriptions` — user-feed many-to-many with folder assignment
- `folders` — hierarchical folder tree (self-referencing parentId)
- `articles` — content with SimHash, canonical dedup, YouTube metadata
- `article_status` — per-user read/bookmark/like state + AI relevance score
- `entities` / `article_entities` — NER extracted entities

2 Qdrant vector collections:

- `article_embeddings` — 384-dim vectors (all-MiniLM-L6-v2) for semantic search
- `user_preferences` — averaged liked-article vectors for relevance scoring

Redis structures:

- Feed content cache (5min TTL)
- User sessions (24hr TTL)
- Rate limiting (1min TTL)
- Job queues (feed poll, content process, embedding generation)

### API Design (Designed)

REST API under `/api/v1` with endpoints for:

- Auth (login, logout, me)
- Feeds CRUD + discover + OPML import/export
- Folders CRUD
- Articles list/get/status/like/dislike/mark-all-read
- Bookmarks add/remove/list
- Search (full-text + semantic)
- User preferences get/update

### Architecture Highlights

- **3-layer architecture:** Client (Tauri desktop + React SPA) > API (Hono REST) > Services (Feed Poller, Content Processor, AI Scorer, Search Indexer) > Data (PostgreSQL + Redis + Qdrant)
- **Monorepo structure planned:** `apps/web`, `apps/desktop`, `apps/api`, `packages/shared`, `packages/ui`
- **Feed Poller:** Cron-based (every minute), processes up to 100 due feeds per cycle, uses `rss-parser` with custom YouTube fields
- **Deduplication:** 64-bit SimHash fingerprints with Hamming distance <= 3 threshold
- **Relevance scoring:** Article embedding compared against user preference vector via cosine similarity

### Performance Targets

| Metric               | Target         |
| -------------------- | -------------- |
| Feed list load       | < 200ms        |
| Article render       | < 100ms        |
| Search response      | < 500ms        |
| Feed poll throughput | 1000 feeds/min |
| Dedup processing     | < 50ms/article |
| Max feeds/user       | 1,000+         |
| Max articles/user    | 100,000+       |
| Concurrent users     | 10,000+        |

### Out of Scope (Separate Modules)

- Browser extension highlighting (planned module: `highlighter`)
- Markdown note-taking (planned module: `knowledge-base`)
- Social sharing
- Team/collaboration
- Mobile native apps

---

## Spec Workflow System

The project uses a custom `.spec-workflow` system with:

- **Specs directory:** Markdown requirements + design docs per module
- **Approvals directory:** JSON records tracking approval status per spec
- **Snapshots:** Versioned content snapshots with metadata tracking

This appears to be a structured spec management tool where each module goes through: Draft > Pending Approval > Approved > Implementation.

Currently, the RSS Reader module is in **Pending** approval status.

---

## Relevance to Automated Ads Agent

### Direct Integration Points: LOW

The knowledge-platform is a **separate product** (personal knowledge management) with no direct code-level integration with the Automated Ads Agent. They share no code, no database, no APIs.

### Indirect Relevance

| Area               | Overlap  | Notes                                                          |
| ------------------ | -------- | -------------------------------------------------------------- |
| Tech stack overlap | Moderate | Both use PostgreSQL + Drizzle ORM, React, TypeScript           |
| AI/ML patterns     | Moderate | Both do AI scoring, embeddings; knowledge-platform uses Qdrant |
| Content processing | Low      | RSS reader processes articles; ads agent processes ad creative |
| Architecture style | Low      | Knowledge-platform uses Bun+Hono; ads agent uses Node+Express  |
| User               | Same     | Both are built by/for the same user (avibm)                    |

### Potential Future Connections

1. **Content research for ads:** RSS feeds could surface trending topics/content that inform ad creative generation
2. **Knowledge base as ad context:** Articles bookmarked/liked could feed into brand knowledge for the ads agent
3. **Shared embedding infrastructure:** Both could share a Qdrant instance for vector search
4. **Shared UI components:** If `packages/ui` is published, could be reused

### Key Takeaway

The knowledge-platform is an **independent, early-stage project** with no implementation. It has thorough spec documentation but zero code. It does NOT currently feed into the pages factory or the Automated Ads Agent in any way. Any integration would need to be designed and built from scratch.

---

## Open Questions in the Spec

1. Should authenticated feeds be supported (e.g., Patreon RSS)?
2. What is the article retention policy?
3. Should AI summaries be automatic or on-demand?
4. Integration with read-later services (Pocket, Instapaper)?
