# Industrial SEO Factory - Complete Research Report

**Source:** `c:/Users/avibm/AI SEO & LANDING PAGES/industrial-seo-factory/`
**Researched:** 2026-02-12
**Researcher:** Claude Code research agent

---

## 1. Executive Summary

The "industrial-seo-factory" directory is actually a **clone of the open-source project "Everything Claude Code"** by Affaan Mustafa (`github.com/affaan-m/everything-claude-code`). It is NOT a custom-built SEO landing page factory. It is a **Claude Code plugin/framework** that provides production-ready agents, skills, hooks, commands, rules, and MCP configurations for Claude Code CLI.

However, it has been **lightly customized** with SEO-specific additions:

- 2 additional agents: `seo-strategist.md`, `compliance-officer.md`
- 1 additional rule: `seo-best-practices.md`
- SEO validation scripts: `validate_page.js`, `manual_action_scan.js`
- A review pool template: `review_pool.json`
- A page sync script: `sync_page.js`

The base framework provides 13+ agents, 28+ skills, 24+ commands, 6 rules, comprehensive hooks, and MCP configurations. Version 1.2.0, MIT licensed.

---

## 2. What is This Framework?

### Core Identity

- **Name:** "Everything Claude Code" (plugin name: `everything-claude-code`)
- **Author:** Affaan Mustafa (Anthropic hackathon winner, Sep 2025)
- **Version:** 1.2.0
- **License:** MIT
- **Purpose:** Complete collection of battle-tested Claude Code configs evolved over 10+ months of intensive daily use
- **Installation:** Claude Code plugin (`/plugin install`) or manual copy

### Architecture

It's a Claude Code plugin that packages:

```
.claude-plugin/     # Plugin manifests (plugin.json, marketplace.json)
agents/             # Specialized subagent definitions
skills/             # Workflow definitions and domain knowledge (28 directories)
commands/           # Slash commands for quick execution (24 commands)
rules/              # Always-follow guidelines (4 base + 2 SEO-specific)
hooks/              # hooks.json - trigger-based automations
scripts/            # Cross-platform Node.js utility scripts
contexts/           # Dynamic system prompt injection contexts
examples/           # Example CLAUDE.md configurations
mcp-configs/        # MCP server configurations
schemas/            # JSON schemas for validation
```

### Two Companion Guides

1. **The Shortform Guide** (`the-shortform-guide.md`) - Setup, foundations, philosophy. Covers skills/commands, hooks, subagents, MCPs, plugins, tips/tricks, parallel workflows.
2. **The Longform Guide** (`the-longform-guide.md`) - Token optimization, memory persistence, continuous learning, verification loops, evals, parallelization strategies.

---

## 3. Agents (6 total, 2 SEO-specific)

### Base Agents (from Everything Claude Code)

| Agent             | File                   | Model | Tools                               | Purpose                                                                                                                                |
| ----------------- | ---------------------- | ----- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Content Planner   | `content-planner.md`   | opus  | Read, Grep, Glob                    | Feature planning specialist. Creates implementation plans with phases, risks, dependencies. Waits for user confirmation before coding. |
| Doc Updater       | `doc-updater.md`       | opus  | Read, Write, Edit, Bash, Grep, Glob | Documentation/codemap specialist. Generates `docs/CODEMAPS/*`, uses ts-morph for AST analysis, keeps docs in sync with code.           |
| Refactor Cleaner  | `refactor-cleaner.md`  | opus  | Read, Write, Edit, Bash, Grep, Glob | Dead code cleanup. Uses knip, depcheck, ts-prune. Creates DELETION_LOG.md. Safety-first with risk assessment.                          |
| Security Reviewer | `security-reviewer.md` | opus  | Read, Write, Edit, Bash, Grep, Glob | OWASP Top 10 analysis, secrets detection, dependency audit. Produces structured security review reports with severity ratings.         |

### SEO-Specific Agents (custom additions)

| Agent                  | File                    | Model | Tools                  | Purpose                                                                                                                                                                                                                                   |
| ---------------------- | ----------------------- | ----- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SEO Strategist**     | `seo-strategist.md`     | opus  | Read, Grep, Glob, Bash | High-level SEO architect. Designs AI-optimized landing pages, enforces "7-Block Structure", plans for manual action risk mitigation, creates implementation blueprints.                                                                   |
| **Compliance Officer** | `compliance-officer.md` | opus  | Read, Grep, Glob, Bash | Technical SEO auditor / "Industrial Inspector". Has **VETO power** - rejects pages scoring below 90/100. Runs `validate_page.js` and `manual_action_scan.js`. Verifies Schema.org JSON-LD, CSS overlap checks ("Negative Margin Police"). |

### Agents NOT in this clone (in base repo's plugin.json but missing from agents/ directory)

- `architect.md`, `build-error-resolver.md`, `code-reviewer.md`, `database-reviewer.md`, `e2e-runner.md`, `go-build-resolver.md`, `go-reviewer.md`, `planner.md`, `python-reviewer.md`, `tdd-guide.md`

These are referenced in `plugin.json` but their files are not present in the cloned directory (may not have been copied or were in a different branch).

---

## 4. Commands (24 slash commands)

| Command            | File                 | Description                                                                                                         |
| ------------------ | -------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/plan`            | `plan.md`            | Create implementation plan, wait for user CONFIRM before coding                                                     |
| `/tdd`             | `tdd.md`             | TDD workflow: scaffold interfaces -> write failing tests -> implement -> refactor -> verify 80%+ coverage           |
| `/code-review`     | `code-review.md`     | Security + quality review of uncommitted changes. Blocks on CRITICAL/HIGH issues                                    |
| `/build-fix`       | `build-fix.md`       | Fix build errors                                                                                                    |
| `/e2e`             | `e2e.md`             | E2E test generation                                                                                                 |
| `/verify`          | `verify.md`          | Comprehensive verification: build -> types -> lint -> tests -> console.log audit -> git status                      |
| `/orchestrate`     | `orchestrate.md`     | Sequential agent workflow. Patterns: feature (planner->tdd->reviewer->security), bugfix, refactor, security, custom |
| `/refactor-clean`  | `refactor-clean.md`  | Dead code removal                                                                                                   |
| `/learn`           | `learn.md`           | Extract reusable patterns from current session into skill files                                                     |
| `/checkpoint`      | `checkpoint.md`      | Save verification state                                                                                             |
| `/eval`            | `eval.md`            | Run evaluation harness                                                                                              |
| `/evolve`          | `evolve.md`          | Cluster related instincts into skills/commands/agents                                                               |
| `/skill-create`    | `skill-create.md`    | Generate skills from git history                                                                                    |
| `/instinct-status` | `instinct-status.md` | View learned instincts with confidence scores                                                                       |
| `/instinct-import` | `instinct-import.md` | Import instincts from others                                                                                        |
| `/instinct-export` | `instinct-export.md` | Export instincts for sharing                                                                                        |
| `/update-codemaps` | `update-codemaps.md` | Regenerate codebase architecture maps                                                                               |
| `/update-docs`     | `update-docs.md`     | Update documentation from code                                                                                      |
| `/setup-pm`        | `setup-pm.md`        | Configure package manager                                                                                           |
| `/test-coverage`   | `test-coverage.md`   | Verify test coverage                                                                                                |
| `/go-review`       | `go-review.md`       | Go code review                                                                                                      |
| `/go-test`         | `go-test.md`         | Go TDD workflow                                                                                                     |
| `/go-build`        | `go-build.md`        | Fix Go build errors                                                                                                 |
| `/python-review`   | `python-review.md`   | Python code review                                                                                                  |

### Key Workflow: `/orchestrate`

The orchestrate command chains agents in sequence with handoff documents:

- **feature**: planner -> tdd-guide -> code-reviewer -> security-reviewer
- **bugfix**: explorer -> tdd-guide -> code-reviewer
- **refactor**: architect -> code-reviewer -> tdd-guide
- **security**: security-reviewer -> code-reviewer -> architect
- **custom**: user-defined agent sequence

---

## 5. Skills (28 skill directories)

### Core Skills

| Skill               | Directory              | Description                                                                                  |
| ------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| Backend Patterns    | `backend-patterns/`    | API, database, caching patterns                                                              |
| Coding Standards    | `coding-standards/`    | Language best practices                                                                      |
| Frontend Patterns   | `frontend-patterns/`   | React, Next.js patterns                                                                      |
| TDD Workflow        | `tdd-workflow/`        | RED -> GREEN -> REFACTOR cycle, 80% coverage                                                 |
| Security Review     | `security-review/`     | Security checklist + cloud infrastructure security                                           |
| Eval Harness        | `eval-harness/`        | Eval-driven development (EDD). Capability evals, regression evals, pass@k metrics            |
| Verification Loop   | `verification-loop/`   | Build -> types -> lint -> tests -> security -> diff review                                   |
| Strategic Compact   | `strategic-compact/`   | Manual context compaction at logical task boundaries                                         |
| Iterative Retrieval | `iterative-retrieval/` | 4-phase progressive context retrieval: DISPATCH -> EVALUATE -> REFINE -> LOOP (max 3 cycles) |

### Learning Skills

| Skill                      | Directory                 | Description                                                                                                                                                                                       |
| -------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Continuous Learning v1     | `continuous-learning/`    | Session-end pattern extraction via Stop hook                                                                                                                                                      |
| **Continuous Learning v2** | `continuous-learning-v2/` | Instinct-based learning system with confidence scoring (0.3-0.9). Hooks capture ALL tool use. Observer agent (Haiku) detects patterns. Instincts evolve into skills/commands/agents via `/evolve` |

### Language/Framework Skills

| Skill                      | Directory                     |
| -------------------------- | ----------------------------- |
| Golang Patterns            | `golang-patterns/`            |
| Golang Testing             | `golang-testing/`             |
| Python Patterns            | `python-patterns/`            |
| Python Testing             | `python-testing/`             |
| Django Patterns            | `django-patterns/`            |
| Django Security            | `django-security/`            |
| Django TDD                 | `django-tdd/`                 |
| Django Verification        | `django-verification/`        |
| SpringBoot Patterns        | `springboot-patterns/`        |
| SpringBoot Security        | `springboot-security/`        |
| SpringBoot TDD             | `springboot-tdd/`             |
| SpringBoot Verification    | `springboot-verification/`    |
| Java Coding Standards      | `java-coding-standards/`      |
| JPA Patterns               | `jpa-patterns/`               |
| Postgres Patterns          | `postgres-patterns/`          |
| ClickHouse IO              | `clickhouse-io/`              |
| Project Guidelines Example | `project-guidelines-example/` |

---

## 6. Rules (6 total, 2 SEO-specific)

### Base Rules

| Rule     | File          | Key Points                                                                                                                                                      |
| -------- | ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Security | `security.md` | No hardcoded secrets, validate inputs, parameterized queries, CSRF protection. Security response protocol: STOP -> use security-reviewer -> fix CRITICAL first. |
| Hooks    | `hooks.md`    | Hook types (PreToolUse, PostToolUse, Stop). Auto-accept permissions guidance. TodoWrite best practices.                                                         |
| Patterns | `patterns.md` | API response format, custom hooks pattern, repository pattern, skeleton projects approach.                                                                      |

### SEO-Specific Rules

| Rule                   | File                    | Key Points                                                                                                                                                                                                                                                                                            |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **SEO Best Practices** | `seo-best-practices.md` | **7-Block Rule**: Hero, Stats, Content, Commercial, Expert, FAQ, CTA. H1 integrity (one per page). Schema.org JSON-LD required. No fillers - technical/data-driven content. USP presence mandatory. Keyword density limits. Zero tolerance for hidden text. "Negative Margin Police" for CSS overlap. |

---

## 7. Hooks System

### hooks.json Configuration

The hooks file defines automations across 6 lifecycle events:

| Event            | Hooks   | Purpose                                                                                                                                                                        |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **PreToolUse**   | 5 hooks | Block dev servers outside tmux; tmux reminder for long commands; git push review reminder; block unnecessary .md file creation; strategic compact suggestions                  |
| **PostToolUse**  | 4 hooks | PR URL logging after `gh pr create`; async build analysis; auto-format with Prettier after JS/TS edits; TypeScript check after .ts/.tsx edits; console.log warning after edits |
| **PreCompact**   | 1 hook  | Save state before context compaction (`pre-compact.js`)                                                                                                                        |
| **SessionStart** | 1 hook  | Load previous context and detect package manager (`session-start.js`)                                                                                                          |
| **Stop**         | 1 hook  | Check for console.log in modified files (`check-console-log.js`)                                                                                                               |
| **SessionEnd**   | 2 hooks | Persist session state (`session-end.js`); evaluate session for extractable patterns (`evaluate-session.js`)                                                                    |

### Cross-Platform Scripts (Node.js)

Located in `scripts/`:

- `lib/utils.js` - Cross-platform file/path/system utilities
- `lib/package-manager.js` - Package manager detection (npm/pnpm/yarn/bun)
- `hooks/session-start.js` - Load context on session start
- `hooks/session-end.js` - Save state on session end
- `hooks/pre-compact.js` - Pre-compaction state saving
- `hooks/suggest-compact.js` - Strategic compaction suggestions
- `hooks/evaluate-session.js` - Extract patterns from sessions
- `setup-package-manager.js` - Interactive PM setup

---

## 8. SEO-Specific Components (The "Factory" Part)

### Scripts for Landing Page Validation

#### `scripts/validate_page.js`

A comprehensive HTML page validator that scores pages on a point system across categories:

- **Structure (15pt)**: H1 presence (single), H1 contains "UK", valid HTML5
- **SEO (10pt)**: Meta title, meta description, lang attribute, viewport
- **Content (40pt)**: H2 question format (3+ questions), answer capsules, expert quotes with `<blockquote><cite>`, statistics (10+ data points with units)
- **FAQ (18pt)**: FAQ section presence, FAQPage schema (5+ questions), dateModified, no empty FAQ content
- **Lists (25pt)**: Content lists (2+), comparison tables (4+ rows)
- **Technical (8pt)**: Image alt text, no broken tags, CTA presence, valid links
- **Brand (10pt)**: No warning boxes, BS standard references, professional disclosure, correct phone number
- **Mobile (5pt)**: Responsive design, no horizontal scroll

Scoring: Critical failures auto-fail. Otherwise must score >= 80%.

#### `scripts/manual_action_scan.js`

Google Manual Action risk scanner checking for:

- **Hidden text** (HIGH): display:none, visibility:hidden, tiny font (0-2px), same color as background, off-screen positioning
- **Keyword stuffing** (MEDIUM): "mesh" > 50 times, "steel" > 40 times, "UK" > 25 times
- **Deceptive structured data** (HIGH): fake reviews/ratings, misleading Product/Offer schema, fake person author
- **Spammy links** (MEDIUM/LOW): external dofollow links, affiliate/tracking links
- **Thin content** (MEDIUM): body text < 1500 chars
- **Cloaking** (HIGH): user-agent detection scripts, IP/geo redirect scripts
- **Doorway pages** (MEDIUM): over-optimized URLs
- **Auto-generated content** (HIGH): Lorem ipsum, template variables left in
- **Sneaky redirects** (HIGH): JavaScript redirects, meta refresh redirects

#### `scripts/review_pool.json`

Template review data with placeholders for customer reviews:

```json
[
  { "author": "[CUSTOMER_NAME]", "role": "Verified Buyer", "stars": 5, ... },
  { "author": "[TRADESPERSON_NAME]", "role": "Trade Customer", "stars": 5, ... },
  { "author": "[MANAGER_NAME]", "role": "Site Manager", "stars": 5, ... }
]
```

#### `scripts/sync_page.js`

Generates SQL to sync HTML pages into a database:

- Updates `tasks` table with HTML content, deployed URL, status
- Inserts/replaces into `pages` table
- Outputs `.sql` file for execution

### The "7-Block Structure" (from SEO Best Practices rule)

Every landing page MUST contain:

1. **Hero** - Primary keyword in H1
2. **Stats** - Data-driven statistics
3. **Content** - Technical specifications
4. **Commercial** - USP, bulk pricing, delivery highlights
5. **Expert** - Quotes, BS standards references
6. **FAQ** - FAQPage schema, 5+ questions
7. **CTA** - Call to action

---

## 9. Contexts (Dynamic System Prompt Injection)

Two context modes for injecting via CLI flags:

| Context     | File                   | Behavior                                                                                                                |
| ----------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Development | `contexts/dev.md`      | "Write code first, explain after. Prefer working solutions over perfect. Run tests after changes. Keep commits atomic." |
| Research    | `contexts/research.md` | "Read widely before concluding. Don't write code until understanding is clear. Findings first, recommendations second." |

Usage: `claude --system-prompt "$(cat ~/.claude/contexts/dev.md)"`

---

## 10. MCP Server Configurations

Pre-configured MCP servers in `mcp-configs/mcp-servers.json`:

| Server                      | Type | Purpose                    |
| --------------------------- | ---- | -------------------------- |
| GitHub                      | npx  | PRs, issues, repos         |
| Firecrawl                   | npx  | Web scraping/crawling      |
| Supabase                    | npx  | Database operations        |
| Memory                      | npx  | Persistent memory          |
| Sequential Thinking         | npx  | Chain-of-thought reasoning |
| Vercel                      | HTTP | Deployments and projects   |
| Railway                     | npx  | Deployments                |
| Cloudflare Docs             | HTTP | Documentation search       |
| Cloudflare Workers Builds   | HTTP | Workers builds             |
| Cloudflare Workers Bindings | HTTP | Workers bindings           |
| Cloudflare Observability    | HTTP | Logs/observability         |
| ClickHouse                  | HTTP | Analytics queries          |
| Context7                    | npx  | Live documentation lookup  |
| Magic UI                    | npx  | UI components              |
| Filesystem                  | npx  | Filesystem operations      |

**Critical warning:** Keep under 10 MCPs enabled / under 80 tools active. 200k context can shrink to 70k with too many tools.

---

## 11. CI/CD & Quality

### GitHub Workflows

- **CI** (`ci.yml`): Tests across 3 OS (Ubuntu, Windows, macOS) x 3 Node versions (18, 20, 22) x 4 package managers (npm, pnpm, yarn, bun). Also validates agents, hooks, commands, skills, rules. Security scan via npm audit. Lint via ESLint + markdownlint.
- **Release** (`release.yml`, `reusable-release.yml`)
- **Maintenance** (`maintenance.yml`)

### Commit Lint

Conventional commits enforced: feat, fix, docs, style, refactor, perf, test, chore, ci, build, revert. Header max 100 chars.

### Plugin Schema Notes

Documented gotchas:

- `agents` must use explicit file paths (not directories)
- All component fields must be arrays
- `version` field is required
- Do NOT add `hooks` to plugin.json (auto-loaded by Claude Code v2.1+, causes duplicate detection error)

---

## 12. Continuous Learning v2 - Key Innovation

The most sophisticated component. An instinct-based learning system:

### Architecture

```
Session Activity -> Hooks capture all tool use -> observations.jsonl
  -> Observer agent (Haiku, background) detects patterns
  -> Creates atomic "instincts" with confidence scores (0.3-0.9)
  -> /evolve clusters related instincts into skills/commands/agents
```

### Instinct Model

- **Atomic**: one trigger, one action
- **Confidence-weighted**: 0.3 = tentative, 0.9 = near certain
- **Domain-tagged**: code-style, testing, git, debugging, workflow
- **Evidence-backed**: tracks what observations created it

### Confidence Scoring

| Score | Meaning      | Behavior                      |
| ----- | ------------ | ----------------------------- |
| 0.3   | Tentative    | Suggested but not enforced    |
| 0.5   | Moderate     | Applied when relevant         |
| 0.7   | Strong       | Auto-approved for application |
| 0.9   | Near-certain | Core behavior                 |

### Evolution Rules

- 3+ related instincts about user-invoked actions -> **Command**
- 3+ related instincts about auto-triggered behaviors -> **Skill**
- 3+ related instincts about complex multi-step processes -> **Agent**

---

## 13. How This Relates to Building Landing Pages

The framework provides the **infrastructure** for building SEO landing pages at scale:

### The Factory Workflow

1. **SEO Strategist agent** designs the page architecture (7-Block Structure, keyword strategy)
2. **Content Planner agent** creates implementation plan with phases
3. **A builder** (human or agent) creates the HTML page
4. **Compliance Officer agent** validates the page:
   - Runs `validate_page.js` for structural/SEO scoring
   - Runs `manual_action_scan.js` for Google safety
   - Has VETO power (rejects pages < 90/100)
5. **`sync_page.js`** pushes approved pages to database

### The Rules Enforced

- 7-Block Structure mandatory on every page
- Only ONE H1, must contain primary keyword
- Schema.org JSON-LD required (FAQPage or Product)
- No keyword stuffing (density limits per word)
- No hidden text (zero tolerance)
- No CSS negative margin overlaps
- Must have expert quotes, statistics, comparison tables
- Must pass mobile responsiveness checks

### What's Missing for Full Factory

This clone has the **quality control pipeline** but is missing:

- Template engine / page generator
- Content generation prompts (the actual AI content creation)
- Bulk generation orchestration (generate 100 pages)
- Deployment pipeline (publish to hosting)
- Sitemap generation
- Internal linking strategy
- Analytics integration

It's essentially the **QA/compliance half** of a landing page factory, not the generation half.

---

## 14. Key Takeaways for Adoption

### What to Adopt

1. **Hooks system** - The PreToolUse/PostToolUse automation pattern is production-proven
2. **Agent orchestration** - `/orchestrate` command chains agents with handoff documents
3. **Continuous Learning v2** - Instinct-based pattern extraction is innovative
4. **Verification Loop** - Build -> types -> lint -> tests -> security pipeline
5. **SEO validation scripts** - `validate_page.js` and `manual_action_scan.js` are ready to use
6. **7-Block Structure rule** - Clear, enforceable page structure standard
7. **Strategic Compact** - Manual compaction at logical boundaries beats arbitrary auto-compact

### What to Build On Top

1. Page generation engine (AI-powered content creation for landing pages)
2. Bulk orchestration (generate N pages from keyword list)
3. Template system (HTML templates for the 7-Block Structure)
4. Deployment pipeline (publish to Cloudflare Pages / Vercel / static hosting)
5. Performance monitoring (Core Web Vitals, search rankings)

### Architecture Patterns Worth Copying

- Plugin manifest structure for packaging
- Cross-platform Node.js hooks (not bash)
- Iterative retrieval for subagent context
- Eval-driven development with pass@k metrics
- Session persistence via SessionStart/SessionEnd hooks

---

## 15. File Inventory

### Root Files

- `README.md` - Main documentation
- `README.zh-CN.md` - Chinese translation
- `CONTRIBUTING.md` - Contribution guidelines
- `LICENSE` - MIT license
- `package.json` - devDependencies only (eslint, markdownlint)
- `commitlint.config.js` - Conventional commits config
- `.markdownlint.json` - Markdown linting config
- `the-shortform-guide.md` - Setup guide (~300 lines)
- `the-longform-guide.md` - Advanced techniques guide (~400+ lines)

### Agent Files (6)

- `agents/content-planner.md`
- `agents/doc-updater.md`
- `agents/refactor-cleaner.md`
- `agents/security-reviewer.md`
- `agents/seo-strategist.md` (SEO-specific)
- `agents/compliance-officer.md` (SEO-specific)

### Command Files (24)

- `commands/{build-fix,checkpoint,code-review,e2e,eval,evolve,go-build,go-review,go-test,instinct-export,instinct-import,instinct-status,learn,orchestrate,plan,python-review,refactor-clean,setup-pm,skill-create,tdd,test-coverage,update-codemaps,update-docs,verify}.md`

### Rule Files (4 + 2 SEO)

- `rules/{hooks,patterns,security,seo-best-practices}.md`

### Skill Directories (28)

- `skills/{backend-patterns,clickhouse-io,coding-standards,continuous-learning,continuous-learning-v2,django-patterns,django-security,django-tdd,django-verification,eval-harness,frontend-patterns,golang-patterns,golang-testing,iterative-retrieval,java-coding-standards,jpa-patterns,postgres-patterns,project-guidelines-example,python-patterns,python-testing,security-review,springboot-patterns,springboot-security,springboot-tdd,springboot-verification,strategic-compact,tdd-workflow,verification-loop}/`

### SEO Scripts (4)

- `scripts/validate_page.js` - HTML page validator (80-point scoring system)
- `scripts/manual_action_scan.js` - Google Manual Action risk scanner
- `scripts/review_pool.json` - Review template data
- `scripts/sync_page.js` - SQL generator for page deployment

### Hook Files

- `hooks/hooks.json` - All hook configurations

### Context Files (2)

- `contexts/dev.md` - Development mode context
- `contexts/research.md` - Research mode context

### Examples (2)

- `examples/CLAUDE.md` - Example project-level config
- `examples/user-CLAUDE.md` - Example user-level config

### MCP Configs

- `mcp-configs/mcp-servers.json` - 15 pre-configured MCP servers

### Plugin Manifests

- `.claude-plugin/plugin.json` - Plugin metadata and component paths
- `.claude-plugin/marketplace.json` - Marketplace catalog
- `.claude-plugin/README.md` - Plugin gotchas
- `.claude-plugin/PLUGIN_SCHEMA_NOTES.md` - Undocumented validator constraints

---

_End of research report_
