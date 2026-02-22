# Spec-Driven Development (SDD) Methodology

## A Complete Guide to Building Features Right the First Time with Claude Code

---

## Table of Contents

1. [Overview](#1-overview)
2. [The 3-Agent Architecture](#2-the-3-agent-architecture)
3. [The SPEC.md Template Structure](#3-the-specmd-template-structure)
4. [When to Use Full Pipeline vs Skip](#4-when-to-use-full-pipeline-vs-skip)
5. [Anthropic Official Patterns Used](#5-anthropic-official-patterns-used)
6. [Key Design Decisions](#6-key-design-decisions-validated)
7. [Teammate Prompt Rules](#7-teammate-prompt-rules-critical)
8. [Integration with Existing Agents](#8-integration-with-existing-agents)
9. [Anti-Patterns to Avoid](#9-anti-patterns-to-avoid)
10. [SDLC State Machine](#10-sdlc-state-machine)

---

## 1. Overview

### What Is Spec-Driven Development?

Spec-Driven Development (SDD) is a methodology for building features with AI coding agents where **no code is written until a SPEC.md exists and is approved**. It uses Claude Code's built-in infrastructure -- custom YAML agents, persistent memory, permission modes, and the interview pattern -- to enforce a disciplined pipeline from intent to release.

### The Core Principle

> **No code until a SPEC.md exists and is approved.**

Every feature begins as an intent. That intent is refined through structured interview into a formal specification. Only then does implementation begin, guided entirely by the spec. Verification checks the implementation against the spec point-by-point.

### Why It Works: The "40% Complete" Problem

When developers (human or AI) receive generic prompts like _"build the chat feature"_ or _"add image generation"_, the result is predictably incomplete. On a 50-100 point acceptance criteria scale, generic-prompt implementations typically score **20-40 points** -- the "40% complete" problem.

This happens because:

- **Ambiguity breeds assumptions.** Without a spec, the implementer fills gaps with guesses.
- **Edge cases are invisible.** Generic prompts describe the happy path only.
- **Integration points are missed.** The implementer doesn't know what systems connect.
- **Verification is impossible.** Without defined criteria, "done" is subjective.

SDD solves this by front-loading the thinking into the spec phase. The interview surfaces edge cases, constraints, and integration points _before_ any code is written. The implementer receives a complete, unambiguous document. The verifier checks every criterion mechanically.

The result: features that score **90-100 points** on first implementation.

---

## 2. The 3-Agent Architecture

SDD uses three specialized agents arranged in a pipeline. Each agent has a distinct role, model selection, tool access, and memory configuration -- all chosen deliberately based on Anthropic's official patterns.

```
┌──────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│  SPEC-INTERVIEWER │────▶│  FEATURE-IMPLEMENTER  │────▶│   SPEC-VERIFIER   │
│                  │     │                      │     │                  │
│  Interview +     │     │  TDD Implementation  │     │  3-Layer Review  │
│  Codebase Read   │     │  6 Checkpoints       │     │  No Write Access │
│                  │     │                      │     │                  │
│  memory: project │     │  memory: none        │     │  memory: none    │
│  model: opus     │     │  model: opus         │     │  model: sonnet   │
│  output: SPEC.md │     │  output: code files  │     │  output: report  │
└──────────────────┘     └──────────────────────┘     └──────────────────┘
```

### Agent 1: spec-interviewer

**Role:** Explore the codebase and interview the user to produce a complete SPEC.md.

**Pattern:** Interview Pattern (from Anthropic's official agent patterns)

**Behavior:**

1. **Explores codebase FIRST** -- reads relevant files, identifies patterns, conventions, existing code structure, and integration points. This happens before any questions are asked.
2. **Interviews the user** with `AskUserQuestion` -- asks at least 5 substantive questions informed by what it found in the codebase. Questions are specific, not generic. Example: _"I see you have a `chat-store.ts` using Zustand. Should this new feature integrate with the existing store or use its own state?"_
3. **Produces SPEC.md** -- writes the complete specification using the template structure defined in Section 3.

**Configuration (`.claude/agents/spec-interviewer.yml`):**

```yaml
name: spec-interviewer
description: >
  Explores the codebase and interviews the user to produce a complete SPEC.md
  for a feature. Reads files and patterns first, then asks at least 5
  substantive questions before writing the spec.
model: opus
memory: project
tools:
  - Read
  - Grep
  - Glob
  - Bash
  - AskUserQuestion
  - Write
```

**Why these choices:**

- **model: opus** -- Spec writing requires deep reasoning about constraints, edge cases, and system interactions. Opus produces significantly higher-quality specs than faster models.
- **memory: project** -- The interviewer benefits from remembering patterns across sessions. If it interviewed the user about the auth system last week, it should recall those conventions when speccing a new feature that touches auth.
- **Tools include AskUserQuestion** -- This is the Interview Pattern. The agent asks structured questions, not free-form chat.
- **Tools include Read/Grep/Glob** -- Codebase exploration must happen before the interview so questions are informed and specific.

**Output:** A `SPEC.md` file written to a project-specific location (e.g., `specs/feature-name/SPEC.md`).

---

### Agent 2: feature-implementer

**Role:** Read the SPEC.md and implement the feature using strict TDD with 6 named checkpoints.

**Pattern:** Writer (from Anthropic's Writer/Reviewer Pattern)

**Behavior:**

1. Reads SPEC.md as its **sole input** -- no other context, no memory from previous sessions.
2. Follows strict TDD through 6 named checkpoints (see below).
3. Reports progress at each checkpoint.
4. Escalates when blocked instead of guessing.

**Configuration (`.claude/agents/feature-implementer.yml`):**

```yaml
name: feature-implementer
description: >
  Reads a SPEC.md and implements the feature using strict TDD with 6 named
  checkpoints. Has no memory -- starts fresh every time to avoid carrying
  forward wrong assumptions.
model: opus
permissionMode: bypassPermissions
tools:
  - Read
  - Write
  - Edit
  - Bash
  - Grep
  - Glob
```

**The 6 Named Checkpoints:**

| #   | Checkpoint        | Description                                     | Exit Criteria                                                         |
| --- | ----------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| 1   | **SPEC READ**     | Read and confirm understanding of the spec      | Agent summarizes spec in own words, lists all acceptance criteria     |
| 2   | **PLAN**          | Map acceptance criteria to files and changes    | File list with planned changes per file, dependency order identified  |
| 3   | **TESTS WRITTEN** | Write failing tests first (Red phase of TDD)    | All acceptance criteria have corresponding test cases, all tests fail |
| 4   | **CORE LOGIC**    | Implement to pass tests (Green phase)           | All tests pass, no skipped tests                                      |
| 5   | **INTEGRATION**   | Wire into existing code, update imports, routes | Feature accessible from existing entry points, no broken imports      |
| 6   | **VERIFICATION**  | Run all checks: build, typecheck, lint, tests   | All checks pass, agent reports final status                           |

**Why these choices:**

- **No memory (deliberate)** -- The implementer must work from the spec alone. Memory from previous sessions can introduce bias, wrong assumptions, or stale patterns. Clean context forces the agent to rely solely on what the spec says.
- **permissionMode: bypassPermissions** -- The implementer needs to create files, run tests, and execute builds without permission prompts interrupting the flow.
- **model: opus** -- Complex implementation benefits from deep reasoning, especially when mapping spec criteria to code changes and handling integration points.
- **No AskUserQuestion** -- The implementer should not interview the user. If the spec is ambiguous, the implementer escalates (see escalation triggers below).

**Escalation Triggers (halt and report instead of guessing):**

- Spec is ambiguous on a critical point
- Tests fail 3 consecutive times on the same issue
- Implementation requires new dependencies not mentioned in spec
- Changes needed in files outside the spec's stated scope

---

### Agent 3: spec-verifier

**Role:** Read the SPEC.md and implementation, verify every acceptance criterion point-by-point, and report findings without fixing anything.

**Pattern:** Reviewer (from Anthropic's Writer/Reviewer Pattern)

**Behavior:**

1. Reads SPEC.md and the implemented code with **fresh context** -- no memory, no bias from the implementation session.
2. Runs 3 layers of verification (see below).
3. **NEVER fixes code** -- only reports findings. This is the critical separation of concerns.
4. Produces a verification report with a final recommendation.

**Configuration (`.claude/agents/spec-verifier.yml`):**

```yaml
name: spec-verifier
description: >
  Reads a SPEC.md and the implementation to verify every acceptance criterion.
  Has no Write or Edit tools -- can only observe and report, never fix.
  Produces a 3-layer verification report.
model: sonnet
tools:
  - Read
  - Grep
  - Glob
  - Bash
```

**The 3 Verification Layers:**

**Layer 1: Deterministic Checks**
Objective, automated checks that produce binary pass/fail results.

| Check      | Command             | Pass Criteria          |
| ---------- | ------------------- | ---------------------- |
| Build      | `pnpm build`        | Exit code 0            |
| TypeScript | `pnpm tsc --noEmit` | Exit code 0            |
| Lint       | `pnpm lint`         | Exit code 0            |
| Tests      | `pnpm test`         | All pass, none skipped |

**Layer 2: Agentic Verification**
The verifier reads each acceptance criterion from the spec and checks it against the implementation.

Report format per criterion:

```
AC-1: "User can submit a message and receive a streamed response"
Status: PASS | PARTIAL | FAIL
Evidence: [specific file:line references, test names, or observed behavior]
Notes: [any concerns or observations]
```

Statuses:

- **PASS** -- Criterion fully met with clear evidence
- **PARTIAL** -- Criterion partially met, specific gaps identified
- **FAIL** -- Criterion not met or implementation contradicts spec

**Layer 3: Human Recommendation**
Based on Layer 1 and Layer 2 results, the verifier provides one of three recommendations:

| Recommendation    | Meaning                                 | Action                            |
| ----------------- | --------------------------------------- | --------------------------------- |
| **SHIP**          | All criteria pass, all checks green     | Merge and deploy                  |
| **FIX THEN SHIP** | Minor issues, no architectural problems | Fix listed items, then ship       |
| **MAJOR REWORK**  | Fundamental issues, spec misunderstood  | Return to IMPLEMENT or SPEC phase |

**Why these choices:**

- **No Write/Edit tools** -- Separation of concerns. If the verifier could fix code, it would blur the line between verification and implementation. Bugs found should go back to the implementer (or a new implementation cycle), not be silently patched.
- **No memory** -- Fresh context prevents the verifier from being biased by having seen the implementation process. It reviews with "unbiased eyes."
- **model: sonnet** -- Verification is mostly pattern matching and criterion checking. Sonnet is fast and accurate for this structured task. Opus would be unnecessarily slow.

---

## 3. The SPEC.md Template Structure

Every spec produced by the spec-interviewer must contain these sections. This template is the contract between the interviewer, implementer, and verifier.

```markdown
# SPEC: [Feature Name]

## Status: DRAFT | APPROVED | IMPLEMENTING | VERIFYING | COMPLETE

## Objective

WHY this feature exists. Not what it does -- why it matters.

Example: "Users currently lose their conversation when refreshing the page.
This feature adds persistent chat history so users can return to previous
conversations, increasing engagement and reducing frustration."

## Use Case / Intent

The reasoning and logic behind design decisions. This section exists for
future debuggers and maintainers who will ask "why was it built this way?"

Example: "We chose client-side Zustand + server-side SQLite instead of
purely server-side state because the app needs instant UI updates during
streaming responses. The store hydrates from the server on page load."

## Constraints

Hard limits that the implementation MUST respect. These are non-negotiable
boundaries, distinct from acceptance criteria (which describe behaviors).

Example:

- C1: Response time must be under 200ms for API calls
- C2: No new npm dependencies without explicit approval
- C3: Must work on mobile viewports (320px minimum)
- C4: RTL layout must be preserved
- C5: Must not break existing chat functionality

## Acceptance Criteria

Numbered, checkable, verifiable behaviors. Each criterion must be testable
-- if you cannot write a test for it, it is not a valid criterion.

Example:

- AC-1: User can view a list of previous conversations in the sidebar
- AC-2: Clicking a conversation loads its full message history
- AC-3: New messages are persisted to the database within 1 second
- AC-4: Conversations display in reverse chronological order
- AC-5: User can delete a conversation (soft delete, recoverable for 30 days)
- AC-6: Empty state shows a helpful message when no conversations exist

## Edge Cases

Specific failure scenarios that the implementation must handle gracefully.

Example:

- EC-1: User has 1000+ conversations -- pagination required, not infinite scroll
- EC-2: Database is temporarily unavailable -- show cached data with stale indicator
- EC-3: Two tabs open simultaneously -- last-write-wins, no conflict resolution needed
- EC-4: Conversation title contains only emoji -- must render correctly in sidebar
- EC-5: User deletes the currently active conversation -- redirect to new chat

## Integration Points

Exact files and systems that this feature connects to. Include file:line
references where possible. The implementer should not need to search for these.

Example:

- `src/lib/stores/chat-store.ts:15` -- Add conversation list state
- `src/lib/db/schema.ts:42` -- Conversations table already exists, add `deletedAt` column
- `src/components/layout/Sidebar.tsx:8` -- Render conversation list here
- `src/lib/trpc/routers/chat.ts:23` -- Add `list`, `delete` procedures
- `src/app/(app)/layout.tsx:12` -- Sidebar is mounted here

## Test Scenarios (BDD)

Given/When/Then format for Happy Path, Error Paths, and Edge Cases.

### Happy Path

- **Given** a user with 5 saved conversations
  **When** they open the sidebar
  **Then** all 5 conversations appear in reverse chronological order

### Error Path

- **Given** the database is unavailable
  **When** the user opens the sidebar
  **Then** a "Could not load conversations" message appears with a retry button

### Edge Case

- **Given** a user with 1000+ conversations
  **When** they scroll the sidebar
  **Then** conversations load in pages of 50, with a "Load more" button

## Verification Steps

Commands and manual checks to prove the feature works after implementation.

### Automated

- `pnpm test -- --filter=conversations` -- Unit/integration tests pass
- `pnpm build` -- No build errors
- `pnpm tsc --noEmit` -- No type errors

### Manual

1. Open app in browser, verify sidebar shows conversation list
2. Create 3 new conversations, verify they appear in order
3. Delete one conversation, verify it disappears from list
4. Refresh page, verify conversations persist
5. Open on mobile viewport (375px), verify sidebar is accessible

## Implementation Notes

Guidance from codebase exploration. Patterns, conventions, and gotchas
discovered by the spec-interviewer during its codebase read.

Example:

- The project uses Zustand 5 with the `persist` middleware -- follow the
  existing pattern in `chat-store.ts`
- tRPC routers use the `protectedProcedure` pattern -- all new procedures
  must use this, not `publicProcedure`
- The sidebar already has a placeholder div with `data-testid="conversation-list"`
- Database migrations use Drizzle Kit -- run `pnpm db:push` after schema changes
```

---

## 4. When to Use Full Pipeline vs Skip

Not every task needs the full 3-agent pipeline. Use this decision matrix:

| Task Size  | Time Estimate    | Examples                                            | Approach                                                            |
| ---------- | ---------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| **Small**  | Under 30 min     | Bug fix, typo, config change, add a CSS class       | Direct fix using existing agents (no spec needed)                   |
| **Medium** | 30 min - 2 hours | New API endpoint, UI component, refactor a module   | Quick spec + implementer (skip full interview, write spec yourself) |
| **Large**  | 2+ hours         | New feature, multi-file system, architecture change | Full pipeline: interview --> implement --> verify                   |

### Decision Flowchart

```
Is the task a bug fix or config change?
  YES → Fix directly. No spec needed.
  NO  ↓

Does the task touch 3+ files or have 3+ acceptance criteria?
  NO  → Quick spec: write a brief SPEC.md yourself, spawn implementer.
  YES ↓

Full pipeline: spec-interviewer → feature-implementer → spec-verifier
```

### Quick Spec (Medium Tasks)

For medium tasks, you can skip the interview and write a lightweight spec yourself:

```markdown
# SPEC: [Feature Name]

## Objective

[1-2 sentences]

## Acceptance Criteria

- AC-1: ...
- AC-2: ...
- AC-3: ...

## Integration Points

- file1.ts:line -- change description
- file2.ts:line -- change description

## Verification

- `pnpm test`
- `pnpm build`
```

Then spawn the `feature-implementer` agent with this spec. Skip the `spec-verifier` for medium tasks -- manual review is sufficient.

---

## 5. Anthropic Official Patterns Used

SDD is not an invented methodology. It configures and combines four patterns from Anthropic's official Claude Code agent infrastructure.

### Pattern 1: Interview Pattern

**What it is:** An agent uses `AskUserQuestion` to gather requirements through structured questions before producing an artifact.

**How SDD uses it:** The `spec-interviewer` agent explores the codebase first, then asks the user at least 5 substantive questions. The questions are informed by the codebase read -- they are specific and targeted, not generic.

**Why it matters:** Requirements gathered through interview are 3-5x more complete than requirements given in a prompt. The interview surfaces edge cases, constraints, and assumptions that the user would not think to mention.

### Pattern 2: Writer/Reviewer Pattern

**What it is:** Two separate sessions -- one writes, one reviews. The reviewer has fresh context and no access to modification tools. This prevents the reviewer from being biased by the writing process.

**How SDD uses it:** The `feature-implementer` (writer) implements the feature. The `spec-verifier` (reviewer) checks it with fresh context and no Write/Edit tools. The verifier never fixes bugs -- it only reports.

**Why it matters:** When the same agent writes and reviews, it tends to confirm its own work. A separate reviewer with fresh context catches issues that the writer is blind to.

### Pattern 3: Persistent Memory

**What it is:** Claude Code agents can have `memory: project` in their YAML config. This creates persistent memory scoped to the project that survives across sessions.

**How SDD uses it:** Only the `spec-interviewer` has memory. It remembers project patterns, conventions, and decisions from previous spec sessions. The implementer and verifier deliberately have NO memory (see Section 6 for why).

**Why it matters:** The interviewer improves over time. After speccing 5 features, it knows the project's patterns deeply and asks better questions.

### Pattern 4: Custom YAML Agents

**What it is:** Agents are defined as YAML files in `.claude/agents/` with frontmatter specifying name, description, tools, model, memory, and permissionMode. They are invoked as slash commands (`/spec-interviewer`, `/feature-implementer`, `/spec-verifier`).

**How SDD uses it:** Each of the 3 agents is a YAML file. This makes the pipeline declarative, version-controlled, and reproducible.

**Why it matters:** YAML agent definitions are infrastructure, not prompts. They can be committed to the repo, reviewed in PRs, and iterated on systematically.

### Pattern 5: Named Checkpoints

**What it is:** Agents report progress at predefined stages using structured messages. This gives the orchestrator (and the user) visibility into progress.

**How SDD uses it:** The `feature-implementer` has 6 named checkpoints (SPEC READ, PLAN, TESTS WRITTEN, CORE LOGIC, INTEGRATION, VERIFICATION). It reports at each one.

**Why it matters:** Without checkpoints, long implementation sessions are a black box. Checkpoints provide progress visibility and early failure detection -- if the agent is stuck at PLAN for too long, you know something is wrong.

---

## 6. Key Design Decisions (Validated)

These decisions were validated through iterative use. Each one has a specific reason.

### 1. Memory on EXPLORER, not implementer

**Decision:** `spec-interviewer` has `memory: project`. `feature-implementer` and `spec-verifier` have no memory.

**Reason:** The interviewer benefits from remembering project patterns -- it asks better questions over time. But the implementer must start fresh each time. Memory can carry forward wrong assumptions from a previous session (e.g., "last time the auth pattern was X" when it has since changed). The spec is the single source of truth, and memory can contradict it.

### 2. Constraints separate from Acceptance Criteria

**Decision:** The SPEC.md template has separate sections for Constraints and Acceptance Criteria.

**Reason:** Constraints are hard limits (performance thresholds, no new dependencies, backwards compatibility). Acceptance Criteria are verifiable behaviors (user can do X, system does Y). Mixing them causes confusion -- a constraint like "must respond in <200ms" is not a behavior to implement, it is a boundary to respect. Separating them ensures the implementer treats them differently.

### 3. Spec Interviewer reads codebase AND interviews user

**Decision:** The interviewer explores the codebase before asking questions, and both inputs feed the spec.

**Reason:** Codebase-informed questions are dramatically better. Instead of asking "How should the data be stored?" (generic), the interviewer asks "You have a Zustand store with persist middleware and a SQLite database with Drizzle ORM. Should this feature use client-side state, server-side state, or both?" (informed). The codebase read also populates the Integration Points section automatically.

### 4. Verification = 3 layers

**Decision:** Deterministic (tests/lint/types) then Agentic (spec-verifier) then Human.

**Reason:** Each layer catches different things:

- **Deterministic:** Catches regressions, type errors, lint violations. Binary pass/fail.
- **Agentic:** Catches spec deviations, partial implementations, edge case omissions. Requires reasoning.
- **Human:** Catches UX issues, architectural concerns, business logic errors. Requires domain knowledge.

No single layer is sufficient. A feature can pass all tests but miss an acceptance criterion (agentic catches this). A feature can meet all criteria but feel wrong in practice (human catches this).

### 5. Do not invent methodology -- configure Anthropic's infrastructure

**Decision:** SDD uses YAML agent files, built-in memory, and existing tool permissions. It does not create custom scripts, CLI tools, or external infrastructure.

**Reason:** Claude Code already has the infrastructure for everything SDD needs. Custom YAML agents replace complex prompt engineering. Built-in memory replaces external state management. Permission modes replace manual approval workflows. By configuring what exists instead of building something new, SDD is maintainable, portable, and version-controllable.

### 6. Implementer has NO memory

**Decision:** The `feature-implementer` agent has no persistent memory between sessions.

**Reason:** Fresh context forces the implementer to derive everything from the spec. This ensures the spec is actually complete -- if the implementer cannot build the feature from the spec alone, the spec is insufficient. Memory would mask incomplete specs by letting the agent fill in gaps from previous sessions.

### 7. Verifier has NO Write/Edit tools

**Decision:** The `spec-verifier` agent has Read, Grep, Glob, and Bash -- but NOT Write or Edit.

**Reason:** Separation of concerns. If the verifier could fix bugs, two problems arise: (1) fixes are untracked -- they do not go through TDD or checkpoints; (2) the verifier's report becomes unreliable -- "PASS" might mean "passed after I fixed it." By removing Write/Edit, every finding goes back through the proper channel.

---

## 7. Teammate Prompt Rules (Critical)

When spawning any agent as a teammate (using the Task tool), these rules are non-negotiable.

### Rule 1: ALL context goes IN the spawn prompt

Teammates do not explore external files for context. Every piece of information the agent needs must be in its spawn prompt. If you find yourself thinking "the agent can read the README for context" -- stop. Put that context in the prompt.

**Wrong:**

```
"Implement the chat feature. See specs/ for details."
```

**Right:**

```
"Implement the chat feature per SPEC.md at specs/chat/SPEC.md.
Key integration points:
- src/lib/stores/chat-store.ts -- add message persistence
- src/lib/db/schema.ts -- conversations table exists at line 42
- src/components/chat/ -- 8 existing components, modify ChatInterface.tsx
..."
```

### Rule 2: Every spawn prompt MUST include the Communication Protocol

This block must appear verbatim in every teammate spawn prompt:

```
COMMUNICATION PROTOCOL (MANDATORY):
- SendMessage to team lead when: done, blocked, or need clarification
- NEVER go silent -- send progress updates on long tasks
- Mark tasks complete via TaskUpdate IMMEDIATELY when done
- After completing your task, check TaskList for unassigned work before going idle
- Report format: (1) what you completed (2) what's pending (3) any blockers
```

Without this, teammates complete work but never report back, leaving the team lead waiting indefinitely.

### Rule 3: Every spawn prompt MUST specify OUTPUT file path

```
OUTPUT: Write your complete results to: specs/chat/VERIFICATION-REPORT.md
```

Without this, agents complete their work but results exist only in the return message -- not persisted to disk. The lead cannot find them later, and the next agent in the pipeline has nothing to read.

### Rule 4: Teammates are implementers, NOT orchestrators

Teammates must be told explicitly that they are implementers. Without this, they read CLAUDE.md, see the delegation rules, and try to delegate _their own_ work instead of implementing it. The spawn prompt should include:

```
You are a teammate. Do the work directly -- do NOT delegate or create sub-teams.
```

### Rule 5: Never use additionalDirectories as a workaround

If a teammate needs context from outside the project directory, put that context in the spawn prompt. Do not add directories to expand the agent's file access -- this is a workaround that masks incomplete prompts.

---

## 8. Integration with Existing Agents

The SDD pipeline does not replace your other Claude Code agents. It works alongside them. After the SDD pipeline completes, run your standard quality agents.

### Post-Implementation Agent Flow

```
SDD Pipeline Complete
       │
       ├──▶ code-reviewer agent
       │    Checks: code quality, patterns, consistency, issues
       │
       ├──▶ security-reviewer agent (if applicable)
       │    Checks: auth, input validation, API security, PII handling
       │    Trigger: feature touches auth, user input, APIs, or sensitive data
       │
       └──▶ e2e-runner agent (if applicable)
            Checks: critical user flows work end-to-end
            Trigger: feature affects primary user journeys
```

### Error Recovery Agents

| Situation                        | Agent                  | Action                             |
| -------------------------------- | ---------------------- | ---------------------------------- |
| Build fails after implementation | `build-error-resolver` | Diagnose and fix build errors      |
| Dead code left behind            | `refactor-cleaner`     | Remove unused code, clean imports  |
| Documentation outdated           | `doc-updater`          | Update docs to reflect new feature |

### Sequence for a Large Feature

```
1. spec-interviewer    → SPEC.md
2. feature-implementer → Code changes (TDD, 6 checkpoints)
3. spec-verifier       → Verification report
4. code-reviewer       → Quality report
5. security-reviewer   → Security report (if applicable)
6. e2e-runner          → E2E test results (if applicable)
7. Human review        → Final approval
```

---

## 9. Anti-Patterns to Avoid

### Anti-Pattern 1: Generic Prompts

**Wrong:** "Build the chat feature with history and persistence."

**Why it fails:** The implementer must guess at data models, UI patterns, edge cases, integration points, and constraints. The result scores 20-40 points on a 100-point scale.

**Right:** Write a complete SPEC.md with all sections filled. Or better, run the `spec-interviewer` agent.

### Anti-Pattern 2: Skipping the Interview Phase

**Wrong:** Writing the spec yourself without interviewing the user.

**Why it fails:** You make assumptions about requirements. The user has context in their head that they will not volunteer unless asked. The interview pattern surfaces this hidden context.

**Exception:** Medium tasks (30min - 2h) can use a quick spec without full interview, per Section 4.

### Anti-Pattern 3: Implementer Guessing When Spec Is Ambiguous

**Wrong:** The implementer encounters an ambiguous spec point and makes a guess.

**Why it fails:** The guess may be wrong, and the error propagates through the implementation. By the time it is caught, significant rework is needed.

**Right:** The implementer halts and escalates. Ambiguity in the spec means the spec needs revision, not a creative interpretation.

### Anti-Pattern 4: Verifier Fixing Bugs

**Wrong:** The verifier finds a bug and fixes it directly.

**Why it fails:** Fixes bypass TDD. They are not tested. They may introduce new issues. The verifier's report becomes unreliable because "PASS" might mean "passed after I fixed it."

**Right:** The verifier reports the bug. A new implementation cycle addresses it through proper TDD.

### Anti-Pattern 5: Adding Memory to Implementer

**Wrong:** Setting `memory: project` on the `feature-implementer` agent.

**Why it fails:** Memory introduces carry-over bias. The implementer may rely on remembered patterns that contradict the current spec. It also masks incomplete specs -- if the agent can fill in gaps from memory, you will never know the spec was incomplete.

**Right:** The implementer has no memory. The spec is the single source of truth.

### Anti-Pattern 6: Context via File Access Instead of Prompt

**Wrong:** Spawning a teammate and expecting it to explore the codebase for context.

**Why it fails:** The teammate does not know what to look for. It wastes time exploring irrelevant files. It may miss critical context. The team lead has already read the relevant files during planning -- that context should go into the prompt.

**Right:** All context goes IN the spawn prompt. The teammate reads the spec and implements.

---

## 10. SDLC State Machine

SDD follows a strict state machine. Each state has entry criteria, exit criteria, and a clear transition.

```
┌────────┐    ┌────────┐    ┌────────┐    ┌───────────┐    ┌────────┐    ┌────────┐    ┌─────────┐
│ INTENT │───▶│  SPEC  │───▶│  PLAN  │───▶│ IMPLEMENT │───▶│ VERIFY │───▶│ REVIEW │───▶│ RELEASE │
└────────┘    └────────┘    └────────┘    └───────────┘    └────────┘    └────────┘    └─────────┘
                  │                            ▲                │
                  │                            │                │
                  │              ┌─────────────┘                │
                  │              │ FAIL (minor)                 │
                  │              │                              │
                  └──────────────┘──────────────────────────────┘
                    FAIL (major -- spec was wrong)
```

### State Definitions

| State         | Agent                                | Entry Criteria             | Exit Criteria                                           |
| ------------- | ------------------------------------ | -------------------------- | ------------------------------------------------------- |
| **INTENT**    | Human                                | User has a feature idea    | Intent articulated clearly enough to begin interview    |
| **SPEC**      | spec-interviewer                     | Intent exists              | SPEC.md written with all sections, approved by user     |
| **PLAN**      | feature-implementer (checkpoint 1-2) | Approved SPEC.md           | File list and change plan mapped to acceptance criteria |
| **IMPLEMENT** | feature-implementer (checkpoint 3-5) | Plan complete              | All tests pass, all code written, integration complete  |
| **VERIFY**    | spec-verifier                        | Implementation complete    | 3-layer verification report produced                    |
| **REVIEW**    | Human + code-reviewer                | Verification report exists | Human approves, all quality agents pass                 |
| **RELEASE**   | Human / CI                           | Review approved            | Feature deployed, spec status set to COMPLETE           |

### Transition Rules

1. **No skipping states.** Every feature goes through every state. Small tasks use the abbreviated pipeline (Section 4), but the states still exist conceptually.

2. **Failed verification loops back to IMPLEMENT**, not to SPEC. The spec was correct; the implementation was incomplete. Fix the implementation and re-verify.

3. **Major verification failures loop back to SPEC.** If the verifier reports MAJOR REWORK, it usually means the spec was wrong or incomplete. Go back to the spec-interviewer, revise the spec, and re-implement.

4. **SPEC requires human approval before moving to PLAN.** The user must review and approve the spec. This is the primary quality gate -- catching issues here is 10x cheaper than catching them in VERIFY.

5. **RELEASE requires all previous states to be green.** No partial releases. If verification found PARTIAL criteria, they must be fixed first.

### Status Tracking

The SPEC.md file's Status field tracks the current state:

```
## Status: DRAFT → APPROVED → IMPLEMENTING → VERIFYING → COMPLETE
```

---

## Appendix: Quick Reference Card

### Pipeline at a Glance

```
User Intent
    ↓
/spec-interviewer  →  SPEC.md  →  User Approval
    ↓
/feature-implementer  →  Code (TDD, 6 checkpoints)
    ↓
/spec-verifier  →  Verification Report (3 layers)
    ↓
/code-reviewer + /security-reviewer (if applicable)
    ↓
Human Review  →  Ship or Fix
```

### Agent Quick Reference

| Agent               | Model  | Memory  | Key Tools                    | Output     |
| ------------------- | ------ | ------- | ---------------------------- | ---------- |
| spec-interviewer    | opus   | project | AskUserQuestion, Read, Write | SPEC.md    |
| feature-implementer | opus   | none    | Write, Edit, Bash            | Code files |
| spec-verifier       | sonnet | none    | Read, Bash (NO Write/Edit)   | Report     |

### Checkpoint Quick Reference

| #   | Name          | Phase         | Key Action                    |
| --- | ------------- | ------------- | ----------------------------- |
| 1   | SPEC READ     | Understanding | Summarize spec, list criteria |
| 2   | PLAN          | Planning      | Map criteria to files         |
| 3   | TESTS WRITTEN | Red (TDD)     | Write failing tests           |
| 4   | CORE LOGIC    | Green (TDD)   | Make tests pass               |
| 5   | INTEGRATION   | Wiring        | Connect to existing code      |
| 6   | VERIFICATION  | Checking      | Run build, types, lint, tests |

### Decision Matrix

| Question                       | Answer                     |
| ------------------------------ | -------------------------- |
| Bug fix or config change?      | Fix directly, no spec      |
| Touches <3 files, <3 criteria? | Quick spec + implementer   |
| Touches 3+ files, 3+ criteria? | Full pipeline              |
| Spec is ambiguous?             | Escalate, do not guess     |
| Verifier finds bug?            | Report, do not fix         |
| All criteria PASS?             | Ship                       |
| Some criteria PARTIAL?         | Fix then ship              |
| Major issues found?            | Rework (may need new spec) |
