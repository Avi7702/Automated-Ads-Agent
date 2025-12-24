---
event: Stop
---

# Post-Implementation Review Hook

After completing implementation work, trigger code review.

## Trigger

When Claude has:
- Created new files in `server/`
- Modified existing code files
- Completed a task from IMPLEMENTATION-TASKS.md

## Required Action

Before marking task complete:
1. Run tests: `npm test`
2. Use the code-reviewer agent to review changes
3. Verify all acceptance criteria from task spec

## Response

After implementation is done:
"Implementation complete. Running code review to ensure quality..."

Then run the code review before committing.
