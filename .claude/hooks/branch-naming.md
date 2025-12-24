---
event: PreToolUse
tools:
  - Bash
match_content: "git checkout -b"
---

# Branch Naming Convention Hook

Enforce consistent branch naming for task work.

## Required Format

For task branches: `claude/task-X.X-description`
- X.X = task number from IMPLEMENTATION-TASKS.md
- description = kebab-case description

Examples:
- `claude/task-1.1-rate-limiting`
- `claude/task-1.2-authentication`
- `claude/task-2.1-input-validation`

## Action

If branch name doesn't match the pattern for task work:
- **WARN** but allow: "WARNING: Branch name should follow `claude/task-X.X-description` format for task work."

For non-task branches (features, fixes):
- Allow any reasonable name
