---
event: UserPromptSubmit
match_content: "task|implement|build|create|add feature"
---

# Read Task Specification First Hook

When starting implementation work, ensure the task spec is read first.

## Trigger

When user mentions:
- "task 1.1", "task 1.2", etc.
- "implement", "build", "create", "add feature"

## Required Action

Before writing ANY code:
1. Read `docs/IMPLEMENTATION-TASKS.md` to understand full requirements
2. Read `CLAUDE.md` for project rules
3. Check if task is already partially implemented

## Response

If this is a new task request:
"Before implementing, I'll read the task specification and project rules to ensure 100% compliance."

Then actually read those files before proceeding.
