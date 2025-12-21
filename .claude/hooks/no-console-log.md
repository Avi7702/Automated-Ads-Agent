---
event: PreToolUse
tools:
  - Write
  - Edit
match_content: "console.log|console.error|console.warn"
---

# No Console.log in Production Code Hook

Block console.log statements in production server code.

## Scope

Applies to files in:
- `server/**/*.ts` (excluding `__tests__`)

Does NOT apply to:
- Test files (`__tests__/`)
- Build scripts
- Development-only code

## Action

If adding console.log to production code:
- **BLOCK** the edit
- Respond: "BLOCKED: console.log is not allowed in production code. Use a proper logger or remove the statement."

## Allowed Alternatives

- Use a proper logging library (e.g., winston, pino)
- For debugging, use breakpoints or test assertions
- For error tracking, use error monitoring (e.g., Sentry)
