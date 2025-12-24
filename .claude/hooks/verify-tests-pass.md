---
event: PreToolUse
tools:
  - Bash
match_content: "git commit"
---

# Verify Tests Pass Hook

Before committing, ensure all tests pass.

## Check Required

Run `npm test` and verify:
1. All tests pass (exit code 0)
2. No skipped tests without documented reason

## Action

If tests fail:
- **BLOCK** the commit
- Respond: "BLOCKED: Tests are failing. Run `npm test` and fix failures before committing."

If tests pass:
- Allow the commit to proceed
