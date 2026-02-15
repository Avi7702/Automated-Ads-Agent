# Spec-Driven Development Toolkit for Claude Code

A complete development methodology for Claude Code projects: 3 custom agents, a SPEC template, prompt templates, and 73 rules covering prompt engineering and development workflow.

## What's Included

```
prompt-engineer/
├── agents/                          # 3 SDD agent definitions
│   ├── spec-interviewer.md          # Interviews user, explores codebase, writes SPEC.md
│   ├── feature-implementer.md       # TDD implementation from spec (6 checkpoints)
│   └── spec-verifier.md             # Independent verification (no write tools)
├── hooks/
│   └── teammate-idle-check.js       # TeammateIdle safety net
├── templates/                       # 4 XML prompt templates + spec template
│   ├── bug-fix.xml
│   ├── feature.xml
│   ├── code-review.xml
│   ├── test.xml
│   └── SPEC-TEMPLATE.md            # Standardized spec format
├── SDD-METHODOLOGY.md              # Full methodology documentation (767 lines)
├── SKILL.md                        # /prompt-engineer skill definition
├── rules.md                        # 73 rules (prompt engineering + SDD)
├── PROJECT-SETUP.md                # Per-project setup: MCPs, CLAUDE.md, verification
├── INSTALL.sh                      # Auto-installer
└── README.md                       # This file
```

## Quick Start

### 1. Install

```bash
bash INSTALL.sh
```

This copies agents to `~/.claude/agents/`, templates to `~/.claude/skills/prompt-engineer/templates/`, and the idle-check hook to `~/.claude/hooks/`. If run from a project root it also copies SPEC-TEMPLATE.md to `specs/`.

### 2. Set Up Your Project

Follow `PROJECT-SETUP.md` to install MCP servers for your stack and add the Technology Currency Rule to your project's CLAUDE.md.

### 3. Create a Spec

Spawn the spec-interviewer agent. It will:

- Explore your codebase to understand existing patterns
- Interview you about the feature requirements
- Write a complete SPEC.md with acceptance criteria and edge cases

### 4. Implement from Spec

Spawn the feature-implementer agent with the SPEC.md path. It will:

- Read the spec and create a plan
- Write tests FIRST (TDD)
- Implement to pass the tests
- Report at 6 named checkpoints

### 5. Verify

Spawn the spec-verifier agent. It runs in fresh context (never sees implementer's session) and:

- Runs deterministic checks (tests pass, types check, lint clean)
- Performs agentic review (reads code against spec criteria)
- Produces a verification report with pass/fail per criterion

## The Pipeline

```
INTENT          SPEC            PLAN          IMPLEMENT       VERIFY          REVIEW
  |               |               |               |               |               |
  v               v               v               v               v               v
User idea --> Interviewer --> SPEC.md --> Implementer --> Verifier --> Code Reviewer
              explores        approved     TDD: tests      fresh          multi-lens
              codebase        by user      then code       context        review
              interviews                   6 checkpoints   3 layers
```

**State machine:** INTENT -> SPEC -> PLAN -> IMPLEMENT -> VERIFY -> REVIEW -> RELEASE

## When to Use the Full Pipeline

| Task Size    | Example                           | Pipeline                                  |
| ------------ | --------------------------------- | ----------------------------------------- |
| Trivial      | Fix a typo, update a string       | Skip -- just do it                        |
| Small        | Single-file bug fix               | Implementer only (TDD still applies)      |
| Medium       | New component, API endpoint       | Interviewer -> Implementer -> Verifier    |
| Large        | Multi-file feature, new subsystem | Full pipeline with all 3 agents           |
| Architecture | New service, major refactor       | Architect agent first, then full pipeline |

## Rule Categories (73 total)

| #     | Category                | Rules | Focus                                           |
| ----- | ----------------------- | ----- | ----------------------------------------------- |
| 1-4   | Structure & Format      | 4     | XML tags, context placement                     |
| 5-8   | Extended Thinking       | 4     | Thinking blocks, budgets                        |
| 9-12  | Long Context            | 4     | 200K+ window usage                              |
| 13-15 | Tool Use Guidance       | 3     | Read->Think->Edit                               |
| 16-21 | Task-Specific Structure | 6     | Bug/feature/test/review templates               |
| 22-25 | Instructions Clarity    | 4     | Explicit, numbered, examples                    |
| 26-30 | Context Injection       | 5     | Tech stack, git log, file paths                 |
| 31-38 | Anti-Patterns           | 8     | What NOT to do                                  |
| 39-43 | Project Architecture    | 5     | CLAUDE.md, skills, agents                       |
| 44-48 | Team Coordination       | 5     | Scope, task lists, context partitioning         |
| 49-50 | Advanced Patterns       | 2     | Adversarial debugging, multi-lens review        |
| 51-58 | Spec-Driven Development | 8     | Spec-first, TDD, 3-layer verification           |
| 59-64 | Agent Architecture      | 6     | Memory, tools, checkpoints, escalation          |
| 65-69 | Teammate Scoping        | 5     | Context in prompt, no delegation                |
| 70-73 | Workflow Integration    | 4     | Post-implementation reviews, SDLC state machine |

See `rules.md` for the complete list.

## Anthropic Patterns Used

This toolkit implements several patterns from Anthropic's agent design guidance:

- **Interviewer Pattern** -- Spec-interviewer explores codebase + interviews user before any code is written
- **Writer/Reviewer Separation** -- Implementer writes code, verifier reviews in fresh context with no write tools
- **Persistent Memory** -- Spec-interviewer uses `memory: project` to remember patterns across sessions
- **Clean Context** -- Implementer has no memory to prevent carry-over bias
- **Custom Agents** -- Markdown frontmatter in `.claude/agents/` for reusable agent definitions
- **TeammateIdle Safety Net** -- Hook script reminds teammates to report status before going idle

## Portability

To use this toolkit in another project:

1. Copy the `prompt-engineer/` directory to the new project root
2. Run `bash prompt-engineer/INSTALL.sh`
3. The installer handles copying agents, templates, and the idle-check hook

To move to another computer:

```bash
# Package
tar -czf prompt-engineer-portable.tar.gz prompt-engineer/

# On new machine
tar -xzf prompt-engineer-portable.tar.gz
cd your-project && bash prompt-engineer/INSTALL.sh
```

No external dependencies. Works with any Claude Code project.
