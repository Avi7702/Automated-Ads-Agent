# Changelog — Prompt Engineer Portable Package

## v2.1 — 2026-02-15 (MCP Integration & Technology Currency Rule)

### Summary

Added MCP server setup guide, Technology Currency Rule template, and Technology Verification section to SPEC-TEMPLATE. Package now includes everything needed to set up a new project with verified, current technology patterns.

### Changes

#### 1. PROJECT-SETUP.md — NEW

Per-project setup guide covering:

- MCP server installation commands (Cloudflare, Better Auth, Clerk, Stripe, Next.js DevTools)
- Technology Currency Rule template for CLAUDE.md (with customizable banned patterns table)
- Verification checklist (7 items)
- Explains the three reinforcing layers: CLAUDE.md (rule) + MCP (docs access) + SPEC template (checklist)

#### 2. SPEC-TEMPLATE.md — UPDATED

Added "Technology Verification" section between Verification Steps and Implementation Notes:

- Version verification table (Technology / Version Used / Verified Latest? / Source)
- 3 checkboxes: web-searched, no banned patterns, checked official docs

#### 3. Technology Currency Rule — IMPROVED

Restructured for clarity:

- Tagline: "Never assume. Always verify. Use the latest."
- Separated into: what to do BEFORE writing code, what to do WHEN you find old code, WHO enforces it
- Banned patterns now in table format (Don't Use / Use Instead / Why)
- Removed time-specific "2026" from the universal template (projects customize with their own stack)

#### 4. README.md — UPDATED

- Added PROJECT-SETUP.md to file tree
- Added "Set Up Your Project" as step 2 in Quick Start

---

## v2.0 — 2026-02-15 (Full Audit & Rebuild)

### Summary

Complete audit, cleanup, and rebuild of the Spec-Driven Development toolkit.
Every file was verified against the installed versions. All stale references removed.
Package is now self-contained and project-agnostic.

---

### What Changed and Why

#### 1. INSTALL.sh — Rewritten (67 → 145 lines)

**Why**: The old installer only copied skill files. It didn't install agents, the idle-check hook, the methodology doc, or the SPEC template to project `specs/`.

**Changes**:

- Added: Package validation (checks all 12 required files exist before installing)
- Added: Copies 3 SDD agent files to `~/.claude/agents/`
- Added: Copies `SDD-METHODOLOGY.md` to skills dir
- Added: Copies `SPEC-TEMPLATE.md` to project `specs/` directory
- Added: Copies `teammate-idle-check.js` hook to `~/.claude/hooks/`
- Added: `safe_copy()` helper that backs up existing files before overwriting
- Added: Summary output showing all installed paths

#### 2. README.md — Rewritten

**Why**: Had 4 references to deleted hooks (`enhance-teammate-prompts.sh`, `PreToolUse` prompt enhancer). These hooks were removed because they were redundant — CLAUDE.md auto-loads into every session, making prompt enhancement unnecessary.

**Changes**:

- Removed all references to `enhance-teammate-prompts.sh` (4 occurrences)
- Removed all references to `PreToolUse` hook
- Updated file tree to show current structure: `agents/`, `hooks/`, `templates/`
- Updated Quick Start to mention agents, templates, and idle-check hook
- Updated "Anthropic Patterns" section: "TeammateIdle Safety Net" replaces hook references

#### 3. SKILL.md — Fixed package manager references

**Why**: Had `npm run test` in 3 places. Project uses `pnpm`, not `npm`.

**Changes**:

- `npm run test` → `pnpm test` (3 occurrences, lines 271-274)

#### 4. Templates — Fixed package manager references

**Why**: Same `npm` → `pnpm` issue in XML templates.

**Changes**:

- `templates/feature.xml`: `npm run test` → `pnpm test` (3 occurrences), `pnpm test:all` → `pnpm test`
- `templates/bug-fix.xml`: `npm run test` → `pnpm test`, `npm run test:all` → `pnpm test`
- `templates/test.xml`: `npm run test` → `pnpm test`, `npm run test:coverage` → `pnpm test --coverage`
- `templates/code-review.xml`: No changes needed (already correct)

#### 5. Hooks — Cleaned up

**Why**: Two orphaned hook files existed (`enhance-teammate-prompts.sh`, `enhance-teammate-prompts.yaml`). They were from a PreToolUse hook that injected project context into teammate prompts. This was removed because CLAUDE.md auto-loads into every session, making the hook redundant.

**What was kept**: `teammate-idle-check.js` — TeammateIdle safety net that reminds teammates to SendMessage status before going idle. This is wired in `~/.claude/settings.json`.

**What was deleted**:

- `~/.claude/hooks/enhance-teammate-prompts.sh` — orphaned, no longer referenced
- `~/.claude/hooks/enhance-teammate-prompts.yaml` — orphaned, no longer referenced

#### 6. Agents — Verified, no changes needed

All 3 agents were verified against installed versions:

- `spec-interviewer.md` — Interviews user, explores codebase, writes SPEC.md
- `feature-implementer.md` — TDD implementation from spec with 6 checkpoints
- `spec-verifier.md` — Independent verification in fresh context (no write tools)

#### 7. SDD-METHODOLOGY.md — Verified, no changes needed

767-line methodology document. Verified correct.

#### 8. rules.md — Verified, no changes needed

73 rules covering prompt engineering and SDD workflow. Verified correct.

---

### Removed Components (and why)

| Component                        | Why Removed                                                                                                                                                                                        |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enhance-teammate-prompts.sh`    | CLAUDE.md auto-loads, making prompt injection hook redundant                                                                                                                                       |
| `enhance-teammate-prompts.yaml`  | Config for deleted hook                                                                                                                                                                            |
| PreToolUse hook in settings.json | Redundant — CLAUDE.md gives teammates all project context                                                                                                                                          |
| TaskCompleted auto-verifier hook | Was in settings.json. Removed because it ran verification on EVERY task (even trivial ones), wasting context and slowing work. spec-verifier agent handles verification intentionally when needed. |

### Architecture Decisions

1. **Process knowledge in agents, project knowledge in CLAUDE.md**: Agent YAML files encode HOW to do work (interview methodology, TDD steps, verification layers). They never encode WHAT project you're working on. Project knowledge auto-loads via CLAUDE.md and MEMORY.md.

2. **Three complementary layers**:
   - Global CLAUDE.md = HOW work is organized (delegation patterns)
   - SDD agents = WHAT methodology (spec → implement → verify)
   - ECC agents = Quality gates AFTER implementation (code-reviewer, security-reviewer, etc.)

3. **Package is project-agnostic**: Can be installed in any Claude Code project. `INSTALL.sh` handles all setup. Project-specific context comes from CLAUDE.md, not from the toolkit.

---

### File Count

| Category   | Count                                                             |
| ---------- | ----------------------------------------------------------------- |
| Agents     | 3                                                                 |
| Hook       | 1                                                                 |
| Templates  | 5                                                                 |
| Root files | 5 (SKILL.md, rules.md, SDD-METHODOLOGY.md, INSTALL.sh, README.md) |
| Meta files | 2 (MANIFEST.md, CHANGELOG.md)                                     |
| **Total**  | **16**                                                            |
