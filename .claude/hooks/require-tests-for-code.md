---
event: PreToolUse
tools:
  - Bash
match_content: "git commit"
---

# Require Tests Hook

Before committing, verify that tests exist for new code.

## Check Required

If the staged changes include new `.ts` files in `server/` (excluding `__tests__`), verify that corresponding test files exist in `server/__tests__/`.

## Action

If new server code is staged without corresponding tests:
- **BLOCK** the commit
- Respond: "BLOCKED: New code in server/ requires tests in server/__tests__/. Please add tests before committing."

If tests exist or only test files are being committed:
- Allow the commit to proceed
